// backend/src/routes/ai.routes.ts
import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

/* -------------------------------------------
   🔐 API KEY (keep this secret, private repo!)
-------------------------------------------- */
const GEMINI_API_KEY =
  "AIzaSyDgcxjKQ80eAfgYd88wUCbpTvp6d4eUMes"; // ⬅️ your key

if (!GEMINI_API_KEY) {
  console.warn("[CS.ai] Missing GEMINI_API_KEY – CS.ai routes will fail.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Preferred model order for reliability (free tier):
 * 1. gemini-2.5-flash
 * 2. gemini-2.0-flash-lite
 * 3. gemini-2.0-flash-exp
 * 4. gemini-flash-lite-latest
 */
const MODEL_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  
];

async function generateWithFallback(prompt: string): Promise<string> {
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
          // plain text output; we will still allow ``` blocks for code
          responseMimeType: "text/plain",
        },
      });

      const text = result.response.text().trim();
      if (text) {
        console.log(`[CS.ai] Responded with model: ${modelName}`);
        return text;
      }
    } catch (err) {
      console.error(`[CS.ai] Model ${modelName} failed:`, err);
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

/**
 * POST /api/ai/chat
 * body: { message: string, audioMeta?: { name: string; sizeKB: number } }
 */
router.post("/chat", async (req, res) => {
  try {
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
- For lists in text, use numbered lines like:
  1. ...
  2. ...
  3. ...
- Keep indentation and spacing neat so the response looks clean and directly readable.

FOCUS:
- Give explanations, patterns and hints — NOT direct contest solutions.
- If the user gives code, help debug, explain the root cause, and suggest test cases.
- If the user asks DSA or CS theory, explain like a good senior student.

CODE FORMAT (VERY IMPORTANT):
- When the user asks for code, ALWAYS respond using fenced code blocks:
  \`\`\`language
  // code here
  \`\`\`
- Use the correct language tag: \`\`\`ts, \`\`\`tsx, \`\`\`js, \`\`\`py, \`\`\`java, etc.
- Do NOT wrap code in extra quotes or JSON.
- Keep code indentation clean and consistent so it is directly copy-pasteable.
- Explanations must stay OUTSIDE the code block, in plain text without markdown bullets or headings.

User message:
${message}

Audio metadata (if any):
${audioMeta ? JSON.stringify(audioMeta) : "none"}
    `.trim();

    const responseText = await generateWithFallback(prompt);
    return res.json({ reply: responseText });
  } catch (err) {
    console.error("[CS.ai] Gemini error (all models):", err);
    return res
      .status(500)
      .json({ error: "Something went wrong talking to CS.ai." });
  }
});

export default router;
