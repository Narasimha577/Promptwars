const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const SYSTEM_INSTRUCTION = `
You are VotePath, a friendly and neutral election process education assistant.

Your purpose is to help users understand election processes, timelines, voter registration,
polling day steps, vote counting, result declaration, and common civic questions in an
interactive and easy-to-follow way.

Rules:
- Stay politically neutral. Never support, oppose, compare, or promote any party or candidate.
- Do not tell users whom to vote for or predict political outcomes.
- Explain process, timelines, rights, responsibilities, and official steps.
- Use simple language, short sections, and numbered steps when useful.
- Ask one clarifying question if the user's country, state, or topic is unclear.
- If asked for legal deadlines, documents, polling station details, voter list status, or
  real-time election dates, advise the user to verify with the official election commission
  or official government election portal.
- If a user asks for persuasion, misinformation, vote buying, impersonation, evasion,
  ballot tampering, or any illegal election activity, refuse briefly and redirect to lawful
  civic education.

Preferred answer style:
- Start with a direct answer.
- Then give a step-by-step checklist or timeline.
- End with a helpful next action.
`;

const FALLBACK_RESPONSES = {
  registration: {
    title: "Voter Registration: Simple Steps",
    body: [
      "1. Check that you meet the age and citizenship rules for your country.",
      "2. Visit the official election commission or voter services website.",
      "3. Fill the voter registration form with your name, address, date of birth, and ID details.",
      "4. Upload or submit required documents if asked.",
      "5. Track your application until your name appears in the voter list.",
      "6. Before election day, confirm your polling station and accepted ID documents."
    ].join("\n")
  },
  timeline: {
    title: "Election Timeline",
    body: [
      "1. Election announcement: the official authority declares the schedule.",
      "2. Nomination period: candidates file nominations.",
      "3. Scrutiny and withdrawal: nominations are checked and final candidate lists are published.",
      "4. Campaign period: candidates and parties communicate with voters under election rules.",
      "5. Polling day: eligible voters cast their votes at assigned polling stations.",
      "6. Counting day: votes are counted under official supervision.",
      "7. Results: winners are declared by the official election authority."
    ].join("\n")
  },
  voting: {
    title: "Voting Day Guide",
    body: [
      "1. Check your name in the voter list before leaving home.",
      "2. Carry an accepted identity document.",
      "3. Go to your assigned polling station.",
      "4. Follow the queue and verification process.",
      "5. Cast your vote privately.",
      "6. Confirm any required receipt or verification step if your system provides one.",
      "7. Leave peacefully and wait for official results."
    ].join("\n")
  },
  results: {
    title: "Counting And Results",
    body: [
      "1. Polling closes and voting materials are sealed or secured.",
      "2. Election officials transport and store them using official procedures.",
      "3. Counting begins at designated counting centers.",
      "4. Observers, candidates, or agents may be allowed under local rules.",
      "5. Totals are checked and reported by constituency or region.",
      "6. The official election authority declares final results."
    ].join("\n")
  }
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallbackData);
      });
      return;
    }

    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getFallbackAnswer(message) {
  const text = message.toLowerCase();
  if (
    text.includes("register") ||
    text.includes("registration") ||
    text.includes("voter id") ||
    text.includes("voter list")
  ) {
    return FALLBACK_RESPONSES.registration;
  }
  if (text.includes("timeline") || text.includes("schedule") || text.includes("date")) {
    return FALLBACK_RESPONSES.timeline;
  }
  if (text.includes("vote") || text.includes("polling") || text.includes("booth")) {
    return FALLBACK_RESPONSES.voting;
  }
  if (text.includes("count") || text.includes("result") || text.includes("winner")) {
    return FALLBACK_RESPONSES.results;
  }
  return {
    title: "Election Process Overview",
    body: [
      "Elections usually move through these stages:",
      "1. Election schedule is announced.",
      "2. Candidates submit nominations.",
      "3. Campaigning happens under election rules.",
      "4. Voters check registration and polling station details.",
      "5. Voting happens on polling day.",
      "6. Votes are counted and official results are declared.",
      "",
      "Choose a topic like registration, timeline, voting day, or results for a focused guide."
    ].join("\n")
  };
}

async function askGemini(message, history) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const contents = [
    ...(Array.isArray(history) ? history.slice(-8) : []),
    {
      role: "user",
      parts: [{ text: message }]
    }
  ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 900
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map(part => part.text).join("\n").trim();
}

async function handleAssistant(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const message = String(payload.message || "").trim();
    const history = payload.history || [];

    if (!message) {
      sendJson(res, 400, { error: "Message is required." });
      return;
    }

    if (!GEMINI_API_KEY) {
      const fallback = getFallbackAnswer(message);
      sendJson(res, 200, {
        answer: `${fallback.title}\n\n${fallback.body}\n\nNote: Add GEMINI_API_KEY on Cloud Run to enable live AI chat.`,
        source: "fallback"
      });
      return;
    }

    const answer = await askGemini(message, history);
    sendJson(res, 200, {
      answer: answer || "I could not generate an answer. Please try asking in another way.",
      source: "gemini"
    });
  } catch (error) {
    const fallback = getFallbackAnswer("overview");
    sendJson(res, 200, {
      answer: `${fallback.title}\n\n${fallback.body}\n\nI had trouble reaching the AI service, so I gave a built-in guide.`,
      source: "fallback",
      warning: error.message
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/assistant") {
    handleAssistant(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`VotePath is running on http://localhost:${PORT}`);
});
