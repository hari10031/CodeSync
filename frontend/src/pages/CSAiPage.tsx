// src/pages/CSAiPage.tsx
import React, { useState, useRef, useEffect } from "react";
import { RiRobot2Line, RiArrowRightLine, RiMic2Line } from "react-icons/ri";
import apiClient from "../lib/apiClient";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type Segment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string };

const LOCAL_STORAGE_KEY = "csai_messages_v1";

/* ---------------------------------------
 * 🔍 Parse message into text + ```code```
 * --------------------------------------*/
function parseMessageSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    // text before code block
    if (matchIndex > lastIndex) {
      const before = text.slice(lastIndex, matchIndex);
      if (before.trim()) {
        segments.push({ type: "text", content: before.trim() });
      }
    }

    const inside = match[1] ?? "";
    let language: string | undefined;
    let code = inside;

    // detect "```lang\ncode...```"
    const firstNewline = inside.indexOf("\n");
    if (firstNewline !== -1) {
      const firstLine = inside.slice(0, firstNewline).trim();
      const rest = inside.slice(firstNewline + 1);
      if (firstLine && !firstLine.includes(" ") && firstLine.length < 20) {
        language = firstLine;
        code = rest;
      }
    }

    segments.push({
      type: "code",
      content: code.trimEnd(),
      language,
    });

    lastIndex = regex.lastIndex;
  }

  // remaining text after last ``` ``` 
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) {
      segments.push({ type: "text", content: tail.trim() });
    }
  }

  // ensure something is returned
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/* ---------------------------------------
 * 🧩 Code block component (GitHub-style)
 * --------------------------------------*/
const CodeBlock: React.FC<{ code: string; language?: string }> = ({
  code,
  language,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-2 mb-2 w-full max-w-[80vw] sm:max-w-[70vw] rounded-xl border border-slate-700 bg-[#050712] overflow-hidden shadow-[0_0_18px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#020409] text-[10px] text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="uppercase tracking-[0.16em]">CODE</span>
          {language && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300">
              {language}
            </span>
          )}
        </span>
        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-[10px] text-slate-200 hover:bg-slate-800 active:scale-95 transition"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto text-xs sm:text-sm text-slate-100 font-mono px-3 py-3 bg-transparent">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/* ---------------------------------------
 * MAIN PAGE
 * --------------------------------------*/
const CSAiPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🎤 Mic
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  /* ------------------------------
   * 🔁 Load chat from localStorage
   * ------------------------------ */
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch {
        console.warn("Failed to load saved messages");
      }
    }
  }, []);

  /* ------------------------------
   * 💾 Save messages to localStorage
   * ------------------------------ */
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  /* ------------------------------
   * 🧹 Clear chat
   * ------------------------------ */
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  /* ------------------------------
   * SEND MESSAGE
   * ------------------------------ */
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    if (!overrideText) setInput("");

    setIsLoading(true);

    try {
      const res = await apiClient.post("/ai/chat", { message: text });
      const reply = res.data.reply || "CS.ai: Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "CS.ai: I hit an error while talking to Gemini. Please try again or check backend logs.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------
   * SPEECH TO TEXT
   * ------------------------------ */
  const startOrStopRecording = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      alert("Your browser doesn't support voice input. Try Chrome.");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = true;

    let finalText = "";

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      if (finalText.trim()) handleSend(finalText);
    };

    recognition.start();
  };

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 p-6 sm:p-10 relative overflow-hidden">
      {/* animations */}
      <style>
        {`
        @keyframes csPopIn {
          0% { opacity: 0; transform: translateY(4px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes csTypingDot {
          0% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-3px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.3; }
        }
      `}
      </style>

      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute right-[-10%] top-[-15%] h-72 w-72 rounded-full bg-sky-500/30 blur-[120px]" />
        <div className="absolute left-[-10%] bottom-[-20%] h-72 w-72 rounded-full bg-fuchsia-500/30 blur-[120px]" />
      </div>

      {/* header */}
      <div className="relative mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/70 px-4 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          CodeSync · CS.ai
        </div>

        <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">
          CS.
          <span className="bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] text-transparent bg-clip-text">
            ai
          </span>
        </h1>

        <p className="mt-2 text-sm text-slate-400 max-w-xl">
          Your personal coding assistant for{" "}
          <span className="text-sky-300">
            DSA, debugging, contests and concepts
          </span>
          — tuned to explain like a senior.
        </p>
      </div>

      {/* CHAT CONTAINER */}
      <div className="relative rounded-3xl border border-slate-800 bg-black/70 backdrop-blur-xl shadow-[0_0_40px_rgba(15,23,42,0.9)] w-full max-w-5xl mx-auto h-[80vh] flex flex-col overflow-hidden">
        {/* top strip */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-gradient-to-r from-black via-[#050815] to-black">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-sky-500/40 blur-md opacity-60" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 border border-slate-700 text-sky-300">
                <RiRobot2Line className="text-xl" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-100">
                CS.ai live console
              </p>
              <p className="text-[10px] text-slate-500">
                Debugging · DSA · Concepts · Interview prep
              </p>
            </div>
          </div>

          {/* subtle clear button inside header */}
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className={`text-[10px] px-3 py-1 rounded-full border transition ${
              messages.length === 0
                ? "border-slate-800 text-slate-600 cursor-not-allowed opacity-60"
                : "border-slate-700 text-slate-300 hover:bg-slate-900/80 hover:border-sky-400"
            }`}
          >
            Clear chat
          </button>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm">
              <p>Start with a bug, DSA topic or interview doubt.</p>
            </div>
          )}

          {messages.map((m, i) => {
            if (m.role === "user") {
              // normal bubble for user
              return (
                <div key={i} className="my-2 flex justify-end">
                  <div
                    className="max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-[0_0_14px_rgba(15,23,42,0.9)] bg-sky-600/30 border border-sky-500/60"
                    style={{ animation: "csPopIn 0.18s ease-out" }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            }

            // assistant: parse into text + code segments
            const segments = parseMessageSegments(m.text);

            return (
              <div key={i} className="my-2 flex justify-start">
                <div className="flex flex-col items-start gap-1">
                  {segments.map((seg, idx) =>
                    seg.type === "text" ? (
                      <div
                        key={idx}
                        className="max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-[0_0_14px_rgba(15,23,42,0.9)] bg-slate-900/90 border border-slate-700/80"
                        style={{ animation: "csPopIn 0.18s ease-out" }}
                      >
                        {seg.content}
                      </div>
                    ) : (
                      <CodeBlock
                        key={idx}
                        code={seg.content}
                        language={seg.language}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}

          {/* typing indicator */}
          {isLoading && (
            <div className="my-2 flex justify-start">
              <div
                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80"
                style={{ animation: "csPopIn 0.18s ease-out" }}
              >
                <span className="flex gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-slate-300"
                    style={{
                      animation: "csTypingDot 1s infinite",
                      animationDelay: "0ms",
                    }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{
                      animation: "csTypingDot 1s infinite",
                      animationDelay: "150ms",
                    }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-slate-500"
                    style={{
                      animation: "csTypingDot 1s infinite",
                      animationDelay: "300ms",
                    }}
                  />
                </span>
                <span className="text-[10px] text-slate-400">
                  CS.ai is thinking…
                </span>
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="border-t border-slate-800 bg-black/70 px-4 py-3 flex gap-3 items-center">
          <button
            onClick={startOrStopRecording}
            className={`flex items-center justify-center h-9 w-9 rounded-xl border transition ${
              isRecording
                ? "border-red-400 bg-red-500/15 text-red-200 shadow-[0_0_14px_rgba(248,113,113,0.6)]"
                : "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
            }`}
          >
            <RiMic2Line className="text-lg" />
          </button>

          <textarea
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-slate-100 outline-none placeholder:text-slate-500 custom-scrollbar"
            placeholder="Describe your bug, doubt or question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] shadow-[0_0_22px_rgba(168,85,247,0.8)] transition ${
              isLoading
                ? "opacity-60 cursor-not-allowed"
                : "hover:brightness-110 active:scale-95"
            }`}
          >
            {isLoading ? "Sending..." : "Send"}
            {!isLoading && <RiArrowRightLine className="text-base" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSAiPage;
