// src/routes/codepad.routes.ts
import express from "express";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

/* ------------------------------------------------
   GEMINI (Ask CS.ai) SETUP (.env)
   backend/.env:
     GEMINI_API_KEY=your_key_here
   OR (optional multi-key):
     GEMINI_KEYS=key1,key2,key3
--------------------------------------------------- */

// Prefer GEMINI_KEYS (comma-separated) if present, else GEMINI_API_KEY
const RAW_KEYS =
  process.env.GEMINI_KEYS || process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || "";

const GEMINI_KEYS = RAW_KEYS.split(",").map(k => k.trim()).filter(Boolean);

if (!GEMINI_KEYS.length) {
  console.warn("GEMINI_API_KEY / GEMINI_KEYS is missing. Ask CS.ai will fail.");
}

// Create a client per key (lets us rotate keys on quota errors)
const GEMINI_CLIENTS = GEMINI_KEYS.map((key) => new GoogleGenerativeAI(key));

/* ------------------------------------------------
   MODEL FALLBACK ORDER
--------------------------------------------------- */
const MODEL_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-flash-lite-latest",
];

/* ------------------------------------------------
   Gemini helper: detect retryable errors
--------------------------------------------------- */
function isRetryableGeminiError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.response?.status || err?.code;

  return (
    status === 429 || // quota / rate limit
    status === 503 || // service unavailable
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("resource exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("timeout")
  );
}

/* ------------------------------------------------
   Gemini generation: key + model fallback
--------------------------------------------------- */
async function generateWithFallback(prompt: string): Promise<string> {
  if (!GEMINI_CLIENTS.length) throw new Error("Gemini not configured");

  let lastError: any = null;

  // Try each key, and for each key try model fallbacks
  for (let ki = 0; ki < GEMINI_CLIENTS.length; ki++) {
    const client = GEMINI_CLIENTS[ki];

    for (const modelName of MODEL_PRIORITY) {
      try {
        const model = client.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "text/plain",
          },
        });

        const text = result.response.text().trim();
        if (text) {
          console.log(`[Ask CS.ai] Responded using: ${modelName} (key #${ki + 1})`);
          return text;
        }

        lastError = new Error(`Empty response from model: ${modelName}`);
      } catch (err: any) {
        console.error(`[Ask CS.ai] Model failed (${modelName}) key #${ki + 1}`, err);
        lastError = err;

        // If NOT retryable, don't waste other keys/models on same bad input
        if (!isRetryableGeminiError(err)) {
          throw err;
        }
      }
    }
  }

  throw lastError ?? new Error("All Gemini models/keys failed in Ask CS.ai");
}

/* ------------------------------------------------
   /api/execute  (Piston)
--------------------------------------------------- */
router.post("/execute", async (req, res) => {
  const { language, version, code, input } = req.body;

  if (!language || !version || code === undefined) {
    return res.status(400).json({
      error: "Missing language, version, or code.",
    });
  }

  const options = {
    method: "POST",
    url: "https://emkc.org/api/v2/piston/execute",
    headers: { "content-type": "application/json" },
    data: {
      language,
      version,
      files: [{ name: "main", content: code }],
      stdin: input || "",
    },
  };

  try {
    const response = await axios.request(options);
    res.json(response.data);
  } catch (error: any) {
    console.error("Piston error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to execute code.",
      details: error.message,
    });
  }
});

/* ------------------------------------------------
   /api/ai-helper  (Ask CS.ai)
--------------------------------------------------- */
router.post("/ai-helper", async (req, res) => {
  if (!GEMINI_CLIENTS.length) {
    return res.status(500).json({
      error: "Ask CS.ai not configured (missing GEMINI_API_KEY / GEMINI_KEYS).",
    });
  }

  const {
    language,
    version,
    code,
    input,
    programOutput,
    programError,
  } = req.body || {};

  if (!language || !code) {
    return res
      .status(400)
      .json({ error: "Missing required fields: language or code." });
  }

  const prompt = `
You are Ask CS.ai, an assistant inside the CodeSync CodePad.

STYLE RULES (TEXT):
1. Use only plain text.
2. Do not use markdown formatting symbols.
3. Do not use asterisks, hyphens, bullets, hashes, bold, italics or headings.
4. Structure responses using labels followed by a colon.
5. Format like this exactly:

Summary:
Explanation text...

Errors:
Explanation text...

Fixed Code:
\`\`\`${language}
corrected code here
\`\`\`

Complexity:
Time: O(...)
Space: O(...)

Better Approach:
Explanation text...

Next Steps:
1. step
2. step
3. step

CODE RULES:
1. Only use fenced code blocks with backticks.
2. Code must be clean, properly indented and copy-paste ready.
3. Code block must use the correct language tag: ${language}.
4. Never include explanation inside a code block.

INPUT TO ANALYSE:

Language: ${language}
Version: ${version || "unknown"}

User Code:
\`\`\`${language}
${code}
\`\`\`

Input:
${input || "none"}

Output:
${programOutput || "none"}

Error:
${programError || "none"}

Now produce a neat, cleanly structured plain text explanation following the format above.
`.trim();

  try {
    const text = await generateWithFallback(prompt);
    return res.json({ advice: text });
  } catch (err: any) {
    console.error("Ask CS.ai error:", err.message || err);
    res.status(500).json({
      error: "Ask CS.ai failed.",
      details: err.message || String(err),
    });
  }
});

export default router;
