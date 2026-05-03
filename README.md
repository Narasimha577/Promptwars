# VotePath - Election Process Education Assistant

VotePath is an interactive assistant built for the PromptWars challenge: **Create an assistant that helps users understand the election process, timelines, and steps in an interactive and easy-to-follow way.**

The app explains voter registration, election timelines, polling day steps, counting, and result declaration in simple, neutral language. It uses a guided topic panel plus a chat assistant powered by Gemini when `GEMINI_API_KEY` is configured.

## Features

- Interactive election education chat assistant
- Guided buttons for first-time voters, timelines, polling day, and vote counting
- Neutral civic education prompt with anti-bias rules
- Built-in fallback answers if the Gemini API key is not set
- Cloud Run ready Node.js server
- No frontend build step required

## Tech Stack

- Node.js
- HTML, CSS, JavaScript
- Gemini API
- Google Cloud Run
- Docker

## Prompting Logic

The core assistant instruction is stored in `server.js` as `SYSTEM_INSTRUCTION`. It tells the assistant to:

- Stay politically neutral
- Explain only election process and civic steps
- Avoid supporting any party or candidate
- Use simple step-by-step explanations
- Redirect users to official election commission websites for real-time legal dates, documents, and polling details
- Refuse illegal election activity requests

## Run Locally

```bash
npm start
```

Open:

```text
http://localhost:8080
```

Optional environment variable:

```bash
GEMINI_API_KEY=your_key_here
```

Without a key, the app still works with built-in educational fallback answers.

## Deploy To Google Cloud Run

Replace `PROJECT_ID` with your Google Cloud project ID.

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/votepath-election-assistant
```

```bash
gcloud run deploy votepath-election-assistant \
  --image gcr.io/PROJECT_ID/votepath-election-assistant \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

After deployment, copy the public Cloud Run URL and use it in the PromptWars submission form.

## Submission Checklist

- Live Cloud Run URL is public
- GitHub repository is public
- `server.js` contains prompting and Gemini integration logic
- `README.md` explains setup, features, and deployment
- LinkedIn documentation post tags Google for Developers and Hack2skill
- The final submitted entry is the latest and best version

## LinkedIn Post Template

```text
Excited to share my submission for PromptWars by Hack2skill.

I built VotePath, an interactive AI assistant that helps users understand the election process, timelines, voter registration steps, polling day procedure, vote counting, and result declaration in a simple and easy-to-follow way.

The assistant focuses on neutral civic education and avoids political bias. It provides step-by-step guidance, FAQs, and timeline-based explanations for first-time voters and citizens who want to understand how elections work.

Live Demo: [Cloud Run URL]
GitHub Repo: [GitHub URL]

Tagging Google for Developers and Hack2skill as part of the challenge submission.

#PromptWars #BuildWithAI #GoogleForDevelopers #Hack2skill #GeminiAPI #CloudRun
```
