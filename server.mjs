// server.mjs
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const {
  OPENAI_API_KEY,
  ASSISTANT_ID_Alabama,
  ASSISTANT_ID_Alaska,
  ASSISTANT_ID_Arizona,
  ASSISTANT_ID_Arkansas,
  ASSISTANT_ID_California,
  ASSISTANT_ID_Colorado,
  ASSISTANT_ID_Connecticut,
  ASSISTANT_ID_Delaware,
  ASSISTANT_ID_Florida,
  ASSISTANT_ID_Georgia,
  ASSISTANT_ID_Hawaii,
  ASSISTANT_ID_Idaho,
  ASSISTANT_ID_Illinois,
  ASSISTANT_ID_Indiana,
  ASSISTANT_ID_Iowa,
  ASSISTANT_ID_Kansas,
  ASSISTANT_ID_Kentucky,
  ASSISTANT_ID_Louisiana,
  ASSISTANT_ID_Maine,
  ASSISTANT_ID_Maryland,
  ASSISTANT_ID_Massachusetts,
  ASSISTANT_ID_Michigan,
  ASSISTANT_ID_Minnesota,
  ASSISTANT_ID_Mississippi,
  ASSISTANT_ID_Missouri,
  ASSISTANT_ID_Montana,
  ASSISTANT_ID_Nebraska,
  ASSISTANT_ID_Nevada,
  ASSISTANT_ID_New_Hampshire,
  ASSISTANT_ID_New_Jersey,
  ASSISTANT_ID_New_Mexico,
  ASSISTANT_ID_New_York,
  ASSISTANT_ID_North_Carolina,
  ASSISTANT_ID_North_Dakota,
  ASSISTANT_ID_Ohio,
  ASSISTANT_ID_Oklahoma,
  ASSISTANT_ID_Oregon,
  ASSISTANT_ID_Pennsylvania,
  ASSISTANT_ID_Rhode_Island,
  ASSISTANT_ID_South_Carolina,
  ASSISTANT_ID_South_Dakota,
  ASSISTANT_ID_Tennessee,
  ASSISTANT_ID_Texas,
  ASSISTANT_ID_Utah,
  ASSISTANT_ID_Vermont,
  ASSISTANT_ID_Virginia,
  ASSISTANT_ID_Washington,
  ASSISTANT_ID_West_Virginia,
  ASSISTANT_ID_Wisconsin,
  ASSISTANT_ID_Wyoming,
  ASSISTANT_ID_Washington_DC,
  DEFAULT_ASSISTANT_ID,
} = process.env;

const stateToAssistantMap = {
  Alabama: ASSISTANT_ID_Alabama,
  Alaska: ASSISTANT_ID_Alaska,
  Arizona: ASSISTANT_ID_Arizona,
  Arkansas: ASSISTANT_ID_Arkansas,
  California: ASSISTANT_ID_California,
  Colorado: ASSISTANT_ID_Colorado,
  Connecticut: ASSISTANT_ID_Connecticut,
  Delaware: ASSISTANT_ID_Delaware,
  Florida: ASSISTANT_ID_Florida,
  Georgia: ASSISTANT_ID_Georgia,
  Hawaii: ASSISTANT_ID_Hawaii,
  Idaho: ASSISTANT_ID_Idaho,
  Illinois: ASSISTANT_ID_Illinois,
  Indiana: ASSISTANT_ID_Indiana,
  Iowa: ASSISTANT_ID_Iowa,
  Kansas: ASSISTANT_ID_Kansas,
  Kentucky: ASSISTANT_ID_Kentucky,
  Louisiana: ASSISTANT_ID_Louisiana,
  Maine: ASSISTANT_ID_Maine,
  Maryland: ASSISTANT_ID_Maryland,
  Massachusetts: ASSISTANT_ID_Massachusetts,
  Michigan: ASSISTANT_ID_Michigan,
  Minnesota: ASSISTANT_ID_Minnesota,
  Mississippi: ASSISTANT_ID_Mississippi,
  Missouri: ASSISTANT_ID_Missouri,
  Montana: ASSISTANT_ID_Montana,
  Nebraska: ASSISTANT_ID_Nebraska,
  Nevada: ASSISTANT_ID_Nevada,
  "New Hampshire": ASSISTANT_ID_New_Hampshire,
  "New Jersey": ASSISTANT_ID_New_Jersey,
  "New Mexico": ASSISTANT_ID_New_Mexico,
  "New York": ASSISTANT_ID_New_York,
  "North Carolina": ASSISTANT_ID_North_Carolina,
  "North Dakota": ASSISTANT_ID_North_Dakota,
  Ohio: ASSISTANT_ID_Ohio,
  Oklahoma: ASSISTANT_ID_Oklahoma,
  Oregon: ASSISTANT_ID_Oregon,
  Pennsylvania: ASSISTANT_ID_Pennsylvania,
  "Rhode Island": ASSISTANT_ID_Rhode_Island,
  "South Carolina": ASSISTANT_ID_South_Carolina,
  "South Dakota": ASSISTANT_ID_South_Dakota,
  Tennessee: ASSISTANT_ID_Tennessee,
  Texas: ASSISTANT_ID_Texas,
  Utah: ASSISTANT_ID_Utah,
  Vermont: ASSISTANT_ID_Vermont,
  Virginia: ASSISTANT_ID_Virginia,
  Washington: ASSISTANT_ID_Washington,
  "West Virginia": ASSISTANT_ID_West_Virginia,
  Wisconsin: ASSISTANT_ID_Wisconsin,
  Wyoming: ASSISTANT_ID_Wyoming,
  "Washington DC": ASSISTANT_ID_Washington_DC,
};
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY || !DEFAULT_ASSISTANT_ID) {
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
    let ASSISTANT_ID = stateToAssistantMap[state] || DEFAULT_ASSISTANT_ID;
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
  console.log(`🟢 Server running on port ${PORT}`);
});
