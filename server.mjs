import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai"; // Make sure your SDK is up-to-date!

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID; // your custom Assistant ID
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.error("⚠️ OPENAI_API_KEY or ASSISTANT_ID not set in environment.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function waitForRunCompletion(threadId, runId) {
  let run;
  while (true) {
    run = await openai.assistants.threads.runs.get({
      thread_id: threadId,
      run_id: runId,
    }); // v2 method
    if (run.status === "completed") {
      return run;
    }
    if (["failed", "cancelled", "expired"].includes(run.status)) {
      throw new Error(`Run failed with status: ${run.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

app.post("/ask-to-assistant", async (req, res) => {
  const { scene } = req.body;

  if (!scene) {
    return res.status(400).json({ error: "Missing 'scene' in request body." });
  }

  try {
    // 1. Create a thread (v2)
    const thread = await openai.assistants.threads.create({
      assistant_id: ASSISTANT_ID,
    });

    // 2. Add user message to thread (v2)
    await openai.assistants.threads.messages.create({
      thread_id: thread.id,
      role: "user",
      content: `Scene: ${scene}`,
    });

    // 3. Run the Assistant (v2)
    const run = await openai.assistants.threads.runs.create({
      thread_id: thread.id,
      assistant_id: ASSISTANT_ID,
    });

    // 4. Wait for completion (v2)
    await waitForRunCompletion(thread.id, run.id);

    // 5. Get the assistant's reply (v2)
    const messages = await openai.assistants.threads.messages.list({
      thread_id: thread.id,
    });

    // 6. Extract assistant reply (v2 assumes message.content is present)
    const assistantReply = messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) =>
        Array.isArray(msg.content)
          ? msg.content.map((part) => part?.text?.value ?? "").join("\n")
          : msg.content?.text?.value ?? ""
      )
      .join("\n");

    res.json({ reply: assistantReply });
  } catch (error) {
    console.error("❌ Assistant error:", error);
    res.status(500).json({
      error: error?.error?.message || error?.message || "Something went wrong.",
    });
  }
});

app.get("/", (req, res) => {
  res.send("🟢 Assistant server is running.");
});

app.listen(PORT, () =>
  console.log(`🟢 Server running on http://localhost:${PORT}`)
);
