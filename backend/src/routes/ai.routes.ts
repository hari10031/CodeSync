// backend/src/routes/ai.routes.ts
import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

/* -------------------------------------------
   🔐 GEMINI API KEYS (.env based)
   backend/.env:
     GEMINI_API_KEY=your_key_here
   OR (recommended for quota safety):
     GEMINI_KEYS=key1,key2,key3
-------------------------------------------- */

// Prefer multi-key setup if present
const RAW_KEYS =
  process.env.GEMINI_KEYS ||
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_KEY ||
  "";

const GEMINI_KEYS = RAW_KEYS.split(",").map(k => k.trim()).filter(Boolean);

if (!GEMINI_KEYS.length) {
  console.warn("[CS.ai] Missing GEMINI_API_KEY / GEMINI_KEYS – CS.ai routes will fail.");
}

// Create one client per key (for rotation on quota issues)
const GEMINI_CLIENTS = GEMINI_KEYS.map(
  (key) => new GoogleGenerativeAI(key)
);

/* -------------------------------------------
   MODEL PRIORITY (FREE / FAST / STABLE)
-------------------------------------------- */
const MODEL_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
];

/* -------------------------------------------
   Retryable error detection
-------------------------------------------- */
function isRetryableGeminiError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.response?.status || err?.code;

  return (
    status === 429 ||
    status === 503 ||
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("resource exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("timeout")
  );
}

/* -------------------------------------------
   Gemini generation with key + model fallback
-------------------------------------------- */
async function generateWithFallback(prompt: string): Promise<string> {
  if (!GEMINI_CLIENTS.length) {
    throw new Error("Gemini not configured");
  }

  let lastError: any = null;

  // Try each key, then each model
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
          console.log(`[CS.ai] Responded using ${modelName} (key #${ki + 1})`);
          return text;
        }

        lastError = new Error(`Empty response from ${modelName}`);
      } catch (err: any) {
        console.error(
          `[CS.ai] Model failed (${modelName}) key #${ki + 1}`,
          err
        );
        lastError = err;

        // Stop immediately on non-retryable errors
        if (!isRetryableGeminiError(err)) {
          throw err;
        }
      }
    }
  }

  throw lastError ?? new Error("All Gemini models/keys failed");
}

/* -------------------------------------------
   POST /api/ai/chat
-------------------------------------------- */
router.post("/chat", async (req, res) => {
  try {
    if (!GEMINI_CLIENTS.length) {
      return res.status(500).json({
        error: "CS.ai not configured (missing Gemini API key).",
      });
    }

    const { message, audioMeta } = req.body as {
      message?: string;
      audioMeta?: { name?: string; sizeKB?: number };
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const prompt = `
You are CS.ai, an AI assistant inside CodeSync (a competitive programming and career dashboard).

STYLE (TEXT PART):
- Answer in simple, very clean English.
- Use plain text only.
- Do NOT use markdown symbols in the explanation: no *, -, •, #, ##, **, __ or similar.
- Structure your answer using short labels like:
  Summary:
  Idea:
  Steps:
  Example:
  Edge cases:
- For lists, use numbered lines:
  1. ...
  2. ...
  3. ...

FOCUS:
- Explain patterns and thinking, not full contest solutions.
- Debug code by explaining root cause and fix.
- Teach DSA and CS concepts like a good senior student.

CODE FORMAT (IMPORTANT):
- When code is requested, ALWAYS use fenced code blocks:
  \`\`\`language
  // code here
  \`\`\`
- Use correct language tags (ts, tsx, js, py, java, etc).
- Do NOT put explanations inside code blocks.
- Code must be clean and copy-paste ready.

User message:
${message}

Audio metadata (if any):
${audioMeta ? JSON.stringify(audioMeta) : "none"}
    `.trim();

    const reply = await generateWithFallback(prompt);
    return res.json({ reply });
  } catch (err) {
    console.error("[CS.ai] Gemini error:", err);
    return res
      .status(500)
      .json({ error: "Something went wrong talking to CS.ai." });
  }
});

export default router;
