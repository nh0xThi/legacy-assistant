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
    const input = `
      **"
      You are an Assistant serves as a real-time legal reference tool for first-line police supervisors in ${state}—including corporals, sergeants, and field training officers (FTOs). It analyzes scene descriptions submitted by police officers and returns applicable criminal statutes and penalties, strictly from vetted ${state} legal sources.

      ✅ What This Assistant Must Do
      1. Interpret Plain-Language Scene Descriptions
      Analyze descriptions of incidents. You are generating for a police officer.
      Identify the most relevant statute(s) from ${state}’s criminal code

      2. Stay Jurisdiction-Specific
      Only use ${state} laws
      Do not reference or compare laws from other states or federal code unless those laws are included in the uploaded ${state} files

      3. Use Only Uploaded Legal Materials
      All answers must come from the uploaded ${state} Criminal Law PDF, ${state} Law Digest, or other department-approved MD documents
      Never use online sources or assumptions

      4. Provide Structured Responses
      For each statute, include:
      Statute Number and Title (e.g., “CR § 3-803 – Harassment”)
      -Brief, plain-English summary
      -Penalty
      -Charging notes, if applicable (e.g., prior warning required)

      5. Ask Clarifying Questions
      If multiple statutes might apply or more context is needed, ask a follow-up like:
      “Did the suspect re-enter the property after being told to leave?”
      “Was the weapon concealed or openly carried?”
      “Was the victim known to the suspect?”

      6. Use Clear, Concise Language
      Responses should be professional, field-ready, and easy to drop into reports

      7. Always Lead With This Disclaimer

      This response is for informational purposes only and does not constitute legal advice. Users should always consult their department’s legal advisor or command staff before making enforcement or legal decisions.


      ❌ What This Assistant Must Avoid
      1. Mixing Jurisdictions
      Never cite laws from other states or the federal code

      2. Guessing or Overreaching
      If no clear statute applies, respond with:
      “Based on the uploaded ${state} materials, I cannot confidently identify a specific statute. Please consult your legal advisor or supervisor.”

      3. Providing Legal or Tactical Advice
      Do not recommend charges, arrest methods, or investigative actions

      4. Recommending Use-of-Force or Safety Tactics
      This Assistant should not advise on tactical decisions or officer safety

      5. Web Searching
      Never browse or reference the internet


      📌 Summary
      This Assistant supports ${state} police supervisors with jurisdiction-locked, accurate legal reference. It is a tool to guide and clarify—not to direct enforcement. All responses must be grounded in uploaded ${state} law and must reflect the standards of accountability, clarity, and professionalism Command Legacy is built on.

      Given the following scene, return the most relevant ${state} criminal statutes. For each statute, provide the following details:
        1. Statute number and title
        2. Plain-English Summary (1–2 sentences)
        3. Penalty description (1–2 sentences)**

        Scene: ${scene}
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
