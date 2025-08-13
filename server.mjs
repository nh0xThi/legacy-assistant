import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o"; // fallback to gpt-4o if not set
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY) {
  console.error("⚠️ OPENAI_API_KEY not set.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

app.post("/ask-to-assistant", async (req, res) => {
  const { state, scene } = req.body;

  if (!state || !scene) {
    return res
      .status(400)
      .json({ error: "Missing 'state' or 'scene' in request body." });
  }

  try {
    // const input = `State: ${state}\n Scene: ${scene}`;

    // const response = await client.responses.create({
    //   model: MODEL,
    //   input,
    // });

    // const reply = response.output_text ?? "No reply received.";

    const input = `
      **"Given the following scene, return the top 3 most relevant ${state} criminal statutes. For each statute, provide the following details:
        1. Statute number and title
        2. Plain-English Summary (1–2 sentences)
        3. Penalty description (1–2 sentences)**

        Scene: ${scene}

        Format the output like this:**

        1 [Statute Number] - [Title]
        • Plain-English Summary: [Text]
        • Penalty: [Text]

        Repeat for top 3 statutes."_
    `;
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? "No reply received.";

    res.json({ reply });
  } catch (err) {
    console.error("❌ Assistant error:", err);
    res.status(500).json({
      error: err?.error?.message || err?.message || "Something went wrong.",
    });
  }
});

app.get("/", (req, res) => {
  res.send("🟢 Assistant server is running.");
});

app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
