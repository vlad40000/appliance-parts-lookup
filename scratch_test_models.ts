import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    const response = await fetch("https://forge.manus.ai/v1/models", {
      headers: {
        authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      console.log("MODELS:", JSON.stringify(data, null, 2));
    } else {
      console.error("FAILED:", response.status, await response.text());
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
