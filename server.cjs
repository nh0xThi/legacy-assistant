require('dotenv').config();
const express = require('express');
// const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY) {
  console.error("⚠️ OPENAI_API_KEY not set.");
  process.exit(1);
}

app.post('/ask-to-assistant', async (req, res) => {
  const { state, scene } = req.body;

  try {
    const threadRes = await fetch('https://api.openai.com/v2/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: 'asst_your_real_id_here',
        messages: [{
          role: 'user',
          content: `State: ${state}\nScene: ${scene}`
        }]
      })
    });

    if (!threadRes.ok) {
      const body = await threadRes.text();
      return res.status(500).json({ error: `Thread creation failed: ${body}` });
    }

    const thread = await threadRes.json();
    const thread_id = thread.id;

    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    const run = await runRes.json();
    const run_id = run.id;

    let status = run.status;
    let result;
    let retries = 10;

    while (status !== 'completed' && status !== 'failed' && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const poll = await fetch(`https://api.openai.com/v2/threads/${thread_id}/runs/${run_id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      result = await poll.json();
      status = result.status;
      retries--;
    }

    if (status !== 'completed') {
      return res.status(500).json({ error: 'Assistant run failed or timed out.' });
    }

    const messagesRes = await fetch(`https://api.openai.com/v2/threads/${thread_id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messages = await messagesRes.json();
    const replyMsg = messages.data.find(m => m.role === 'assistant');
    const reply = replyMsg?.content?.[0]?.text?.value || 'No reply received.';

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
