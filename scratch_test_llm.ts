import "dotenv/config";
import { invokeLLM } from "./server/_core/llm";

async function run() {
  try {
    const res = await invokeLLM({
      model: "gemini-3.1-flash-lite-preview",
      messages: [{ role: "user", content: "Hello, reply with exactly the word SUCCESS." }]
    });
    console.log("RESULT:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
