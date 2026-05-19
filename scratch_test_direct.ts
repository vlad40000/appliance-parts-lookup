import dotenv from "dotenv";
dotenv.config();

async function run() {
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const url = "https://forge.manus.ai/v1/chat/completions";

  // Test 1: gemini-3.1-flash-lite-preview with thinking
  try {
    const res1 = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite-preview",
        messages: [{ role: "user", content: "Say success" }],
        thinking: { budget_tokens: 128 }
      })
    });
    console.log("TEST 1 (with thinking) status:", res1.status);
    console.log("TEST 1 body:", await res1.json());
  } catch (e) {
    console.error("TEST 1 error:", e);
  }

  // Test 2: gemini-3.1-flash-lite-preview without thinking
  try {
    const res2 = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite-preview",
        messages: [{ role: "user", content: "Say success" }]
      })
    });
    console.log("TEST 2 (no thinking) status:", res2.status);
    console.log("TEST 2 body:", await res2.json());
  } catch (e) {
    console.error("TEST 2 error:", e);
  }
}

run();
