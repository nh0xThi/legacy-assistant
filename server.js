// Example: /api/ask-law-assistant
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/api/ask-law-assistant', async (req, res) => {
  try {
    const { scene, state } = req.body;

    const threadRes = await axios.post('https://api.openai.com/v1/threads', {
      assistant_id: 'legacy assistant',
      messages: [{
        role: 'user',
        content: `State: ${state}\\nScene: ${scene}`
      }]
    }, {
      headers: {
        Authorization: `Bearer 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`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json'
      }
    });

    // Continue polling, run creation, etc...

    res.json(threadRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
