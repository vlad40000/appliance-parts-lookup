import { invokeLLM } from "./_core/llm";

/**
 * Extract model number from an image using Gemini Vision
 * Accepts base64-encoded image data
 */
export async function extractModelNumberFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<string | null> {
  try {
    // Use Gemini 3.1 Flash Lite for fast, efficient OCR extraction
    const response = await invokeLLM({
      model: "gemini-3.1-flash-lite-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading appliance model numbers from images. Extract the model number from the image. Model numbers are typically alphanumeric codes found on labels, tags, or nameplates. Return ONLY the model number, nothing else. If you cannot find a model number, respond with 'NOT_FOUND'.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Please extract the model number from this appliance label or nameplate image.",
            },
          ],
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const modelNumber = content.trim().toUpperCase();
    if (modelNumber === "NOT_FOUND" || modelNumber.length < 3) return null;

    return modelNumber;
  } catch (error) {
    console.error("[OCR] Error extracting model number:", error);
    return null;
  }
}

/**
 * Validate if a string looks like a valid appliance model number
 */
export function isValidModelNumber(modelNumber: string): boolean {
  const pattern = /^[A-Z0-9\-]{3,20}$/i;
  return pattern.test(modelNumber.trim());
}
