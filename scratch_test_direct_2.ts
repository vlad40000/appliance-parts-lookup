import dotenv from "dotenv";
dotenv.config();

async function run() {
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const url = "https://forge.manus.ai/v1/chat/completions";

  const models = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ];

  for (const model of models) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say success" }],
        })
      });
      const body = await res.json();
      console.log(`MODEL ${model} -> status: ${res.status}, returned model: ${body.model}`);
    } catch (e) {
      console.error(`MODEL ${model} failed:`, e);
    }
  }
}

run();
