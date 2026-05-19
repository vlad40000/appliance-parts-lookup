import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
  type Content,
  type Part,
} from "@google/generative-ai";
import { ENV } from "./env";

// ─── Types (OpenAI-compatible interface preserved for callers) ────────────────

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  model?: string;
  messages: Message[];
  tools?: Tool[];
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClient(): GoogleGenerativeAI {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(ENV.geminiApiKey);
}

/**
 * Convert an OpenAI-style image_url (data URI or https URL) to a Gemini inlinePart.
 */
function imageUrlToPart(imageUrl: string): Part {
  if (imageUrl.startsWith("data:")) {
    const [header, data] = imageUrl.split(",");
    const mimeType = header.replace("data:", "").replace(";base64", "");
    return { inlineData: { mimeType, data } };
  }
  // For remote URLs, use fileData (Gemini Files API) or fetch and inline
  return { fileData: { mimeType: "image/jpeg", fileUri: imageUrl } };
}

/**
 * Convert our Message[] to Gemini Contents[].
 * System messages are extracted separately (Gemini takes systemInstruction).
 */
function toGeminiContents(messages: Message[]): {
  systemInstruction?: string;
  contents: Content[];
} {
  let systemInstruction: string | undefined;
  const contents: Content[] = [];

  for (const msg of messages) {
    const contentArr = Array.isArray(msg.content) ? msg.content : [msg.content];

    if (msg.role === "system") {
      systemInstruction = contentArr
        .map((c) => (typeof c === "string" ? c : (c as TextContent).text ?? ""))
        .join("\n");
      continue;
    }

    const parts: Part[] = contentArr.map((c) => {
      if (typeof c === "string") return { text: c };
      if (c.type === "text") return { text: c.text };
      if (c.type === "image_url") return imageUrlToPart(c.image_url.url);
      // file_url not directly supported — return text placeholder
      return { text: `[file: ${(c as FileContent).file_url.url}]` };
    });

    const geminiRole = msg.role === "assistant" ? "model" : "user";
    contents.push({ role: geminiRole, parts });
  }

  return { systemInstruction, contents };
}

/**
 * Resolve JSON output instruction from responseFormat / outputSchema.
 */
function resolveJsonInstruction(params: InvokeParams): string | undefined {
  const fmt = params.responseFormat ?? params.response_format;
  const schema = params.outputSchema ?? params.output_schema;

  if (fmt?.type === "json_object") {
    return "Respond with valid JSON only.";
  }
  if (fmt?.type === "json_schema" && fmt.json_schema?.schema) {
    return `Respond with valid JSON matching this schema:\n${JSON.stringify(fmt.json_schema.schema, null, 2)}`;
  }
  if (schema?.schema) {
    return `Respond with valid JSON matching this schema:\n${JSON.stringify(schema.schema, null, 2)}`;
  }
  return undefined;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();
  const modelName = params.model ?? "gemini-2.5-flash";

  const { systemInstruction, contents } = toGeminiContents(params.messages);
  const jsonInstruction = resolveJsonInstruction(params);

  const genModel = client.getGenerativeModel({
    model: modelName,
    ...(systemInstruction || jsonInstruction
      ? {
          systemInstruction:
            [systemInstruction, jsonInstruction].filter(Boolean).join("\n\n"),
        }
      : {}),
  });

  const request: GenerateContentRequest = {
    contents,
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? params.max_tokens ?? 32768,
      ...(jsonInstruction ? { responseMimeType: "application/json" } : {}),
    },
  };

  const result = await genModel.generateContent(request);
  const response = result.response;
  const text = response.text();
  const usageMeta = response.usageMetadata;

  // Return OpenAI-compatible shape so all callers (ocr.ts etc.) stay unchanged
  return {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: response.candidates?.[0]?.finishReason ?? null,
      },
    ],
    usage: usageMeta
      ? {
          prompt_tokens: usageMeta.promptTokenCount ?? 0,
          completion_tokens: usageMeta.candidatesTokenCount ?? 0,
          total_tokens: usageMeta.totalTokenCount ?? 0,
        }
      : undefined,
  };
}
