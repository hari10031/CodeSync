// src/routes/codepad.routes.ts
import express from "express";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

/* ------------------------------------------------
   GEMINI (Ask CS.ai) SETUP
--------------------------------------------------- */
const geminiApiKey = "AIzaSyDgcxjKQ80eAfgYd88wUCbpTvp6d4eUMes";

if (!geminiApiKey) {
  console.warn("GEMINI_API_KEY is missing. Ask CS.ai will fail.");
}

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

/* ------------------------------------------------
   MODEL FALLBACK ORDER
--------------------------------------------------- */
const MODEL_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-flash-lite-latest",
  
];

async function generateWithFallback(prompt: string): Promise<string> {
  if (!genAI) throw new Error("Gemini not configured");

  let lastError: any = null;

  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "text/plain", // clean plain text
        },
      });

      const text = result.response.text().trim();
      if (text) {
        console.log(`[Ask CS.ai] Responded using: ${modelName}`);
        return text;
      }
    } catch (err) {
      console.error(`[Ask CS.ai] Model failed (${modelName})`, err);
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Gemini models failed in Ask CS.ai");
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
  if (!genAI) {
    return res.status(500).json({
      error: "Ask CS.ai not configured (missing API key).",
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

  /* ------------------------------------------
     CLEAN TEXT — NO SYMBOLS LIKE * - # ##
  -------------------------------------------*/
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
