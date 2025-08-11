# Police Assistant Backend

This is the backend server for the Police First-Line Supervisors OpenAI Assistant. It acts as a proxy API that communicates with the OpenAI Responses API to process scene descriptions and return relevant Maryland criminal statutes.

---

## Features

- Accepts POST requests with a scene description and state
- Calls the OpenAI Responses API using your custom assistant or model
- Returns the assistant’s response with relevant statutes and explanations
- Handles async request/response and error handling
- Configurable via environment variables
- Ready for deployment on popular Node.js hosting platforms

---

## Getting Started

### Prerequisites

- Node.js v18 or newer
- npm or yarn
- OpenAI API key with access to the Responses API
- Assistant ID or model name for your custom assistant

---

### Installation

1. Clone this repository

   ```bash
   git clone https://github.com/yourusername/police-assistant-backend.git
   cd police-assistant-backend
   ```

2. Install dependencies

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add your configuration:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   ASSISTANT_ID=your_assistant_id
   MODEL=gpt-4o
   PORT=3000
   ```

---

### Running Locally

```bash
node server.mjs
```

The server will start on the port defined in `.env` (default 3000).

---

## API Endpoint

### `POST /ask-to-assistant`

Send a JSON payload with the following fields:

| Field  | Type   | Description                                |
|--------|--------|--------------------------------------------|
| state  | string | The U.S. state (e.g., `"Maryland"`)         |
| scene  | string | Scene description text                     |

#### Example Request

```json
{
  "state": "Maryland",
  "scene": "A man has a gun and is threatening a woman"
}
```

#### Example Response

```json
{
  "reply": "1. MD Crim Law § 3-202: Assault in the first degree...\n2. ..."
}
```

---

## Deployment

You can deploy this backend to any Node.js hosting provider such as Render.com, Fly.io, or Railway.app. Make sure to set the required environment variables and open the appropriate port.

---

## Environment Variables

| Variable        | Description                                   |
|-----------------|-----------------------------------------------|
| OPENAI_API_KEY  | Your OpenAI API key                            |
| ASSISTANT_ID    | Your OpenAI Assistant ID (if used)             |
| MODEL           | OpenAI model name (e.g., `gpt-4o`)             |
| PORT            | Port number to run the server (default: 3000) |

---

## Troubleshooting

- Ensure your API key and Assistant ID are correct.
- Check your OpenAI quota and permissions.
- Look at server logs for detailed error messages.
- Verify the request payload format matches the API spec.
