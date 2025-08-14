// server.mjs
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const { OPENAI_API_KEY, ASSISTANT_ID } = process.env;
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.error("⚠️  OPENAI_API_KEY or ASSISTANT_ID not set.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---- helpers ---------------------------------------------------------

function normalizeThreadId(input) {
  if (input == null) return undefined;
  const s = String(input).trim();
  if (!s || s.toLowerCase() === "undefined" || s.toLowerCase() === "null")
    return undefined;
  return s;
}

function extractTextFromMessage(msg) {
  if (!msg?.content) return "";
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => {
        if (part?.type === "text") return part.text?.value || "";
        if (part?.type === "image_file") return "[image]";
        if (part?.type === "file_path")
          return `[file: ${part?.file_path?.filename || "download"}]`;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return msg.content?.text?.value || "";
}

// ---- routes ----------------------------------------------------------

app.get("/", (_req, res) => res.send("🟢 Assistant server is running."));

app.post("/create-thread", async (_req, res) => {
  try {
    const thread = await openai.beta.threads.create();
    return res.json({ threadId: thread.id });
  } catch (e) {
    console.error("❌ /create-thread:", e);
    return res
      .status(502)
      .json({ error: e?.message || "Failed to create thread" });
  }
});

/**
 * POST /ask-to-assistant
 * Body: { scene: string, state?: string, threadId?: string }
 * Returns: { threadId: string, reply: string }
 */
app.post("/ask-to-assistant", async (req, res) => {
  try {
    const { scene, state } = req.body || {};
    let { threadId } = req.body || {};

    if (!scene || typeof scene !== "string") {
      return res
        .status(400)
        .json({ error: "Missing 'scene' (string) in request body." });
    }

    threadId = normalizeThreadId(threadId);

    // 1) Create or reuse a thread
    const thread = threadId
      ? { id: threadId }
      : await openai.beta.threads.create();

    // Guard if client passed nonsense
    if (threadId && !String(threadId).startsWith("thread_")) {
      return res
        .status(400)
        .json({ error: `Bad threadId provided: ${threadId}` });
    }

    // 2) Add user message
    const userContent = `State: ${state ?? ""}\nScene: ${scene}`.trim();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userContent,
    });

    // 3) Run assistant **and poll automatically**
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    if (run.status !== "completed") {
      // Surface a helpful error if something odd happened
      return res.status(502).json({
        error:
          run.last_error?.message || `Run ended with status: ${run.status}`,
        status: run.status,
        threadId: thread.id,
        runId: run.id,
      });
    }

    // 4) Fetch messages (most recent first) and extract the latest assistant text
    const list = await openai.beta.threads.messages.list(thread.id, {
      limit: 10,
    });
    const latestAssistant = list.data.find((m) => m.role === "assistant");
    const reply = extractTextFromMessage(latestAssistant);

    return res.json({ threadId: thread.id, reply });
  } catch (e) {
    console.error("❌ /ask-to-assistant error:", e);
    return res.status(502).json({ error: e?.message || "Run failed" });
  }
});

app.get("/messages", async (req, res) => {
  try {
    const { threadId } = req.query;
    if (
      !threadId ||
      typeof threadId !== "string" ||
      !threadId.startsWith("thread_")
    ) {
      return res
        .status(400)
        .json({ error: "Valid threadId (thread_...) is required" });
    }
    const list = await openai.beta.threads.messages.list(threadId, {
      limit: 50,
    });
    return res.json({ threadId, messages: list.data });
  } catch (e) {
    console.error("❌ /messages error:", e);
    return res
      .status(502)
      .json({ error: e?.message || "Failed to list messages" });
  }
});

// ---- start ------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🟢 Server running on http://localhost:${PORT}`);
});
