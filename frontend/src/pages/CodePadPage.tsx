// src/pages/CodePadPage.tsx
import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  RiCodeLine,
  RiPlayLine,
  RiTerminalBoxLine,
  RiFileList3Line,
  RiRobot2Line,
  RiCloseLine,
} from "react-icons/ri";

/* ----------------- TYPES & DATA ----------------- */

type Language = {
  name: string;
  value: string; // Monaco language id
  version: string;
  defaultCode: string;
  pistonLang?: string; // For Piston API (like "c++")
};

type PistonRunResult = {
  stdout?: string;
  stderr?: string;
};

type PistonResponse = {
  compile?: PistonRunResult;
  run?: PistonRunResult;
};

type AiHistoryEntry = {
  id: number;
  title: string;
  content: string;
  error?: string;
};

type Segment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string };

const LANGUAGES: Language[] = [
  {
    name: "Python",
    value: "python",
    version: "3.10.0",
    defaultCode: `print("Hello, World!")`,
  },
  {
    name: "JavaScript (Node)",
    value: "javascript",
    version: "18.15.0",
    defaultCode: `console.log("Hello, World!");`,
  },
  {
    name: "C++",
    value: "cpp",
    pistonLang: "c++",
    version: "10.2.0",
    defaultCode: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!";\n    return 0;\n}`,
  },
  {
    name: "Java",
    value: "java",
    version: "15.0.2",
    defaultCode: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
  },
  {
    name: "C# (Mono)",
    value: "csharp",
    version: "6.12.0",
    defaultCode: `using System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}`,
  },
  {
    name: "Go",
    value: "go",
    version: "1.16.2",
    defaultCode: `package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!");\n}`,
  },
  {
    name: "Rust",
    value: "rust",
    version: "1.68.2",
    defaultCode: `fn main() {\n    println!("Hello, World!");\n}`,
  },
  {
    name: "PHP",
    value: "php",
    version: "8.2.3",
    defaultCode: `<?php\n\necho "Hello, World!";\n`,
  },
  {
    name: "Ruby",
    value: "ruby",
    version: "3.0.1",
    defaultCode: `puts "Hello, World!"`,
  },
  {
    name: "Swift",
    value: "swift",
    version: "5.3.3",
    defaultCode: `print("Hello,World!")`,
  },
  {
    name: "C",
    value: "c",
    version: "10.2.0",
    defaultCode: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!");\n    return 0;\n}`,
  },
];

/* ----------------- HELPERS: PARSE AI TEXT ----------------- */

function parseAdviceSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    // text before this code block
    if (matchIndex > lastIndex) {
      const before = text.slice(lastIndex, matchIndex);
      if (before.trim()) {
        segments.push({ type: "text", content: before.trim() });
      }
    }

    const inside = match[1] ?? "";
    let language: string | undefined;
    let code = inside;

    // detect "```lang\ncode..."
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

  // text after last block
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) {
      segments.push({ type: "text", content: tail.trim() });
    }
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/* ----------------- UI: CODE BLOCK COMPONENT ----------------- */

const CodeBlock: React.FC<{
  code: string;
  language?: string;
  onApply?: () => void;
}> = ({ code, language, onApply }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      // ignore
    }
  };

  const lines = code.split("\n");
  const langClass = language ? `language-${language}` : "language-text";

  return (
    <div className="mt-2 mb-3 w-full rounded-xl border border-slate-700 bg-[#050712] overflow-hidden shadow-[0_0_18px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#020409] text-[10px] text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="uppercase tracking-[0.16em]">AI SUGGESTED CODE</span>
          {language && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300">
              {language}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {onApply && (
            <button
              onClick={onApply}
              className="px-2 py-1 rounded-md border border-emerald-500/70 bg-emerald-500/10 text-[10px] text-emerald-200 hover:bg-emerald-500/20 active:scale-95 transition"
            >
              Apply AI fix
            </button>
          )}
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900 text-[10px] text-slate-200 hover:bg-slate-800 active:scale-95 transition"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto text-xs sm:text-[13px] font-mono bg-transparent">
        <pre className="flex px-3 py-3">
          {/* line numbers */}
          <div className="pr-3 mr-3 border-r border-slate-800 text-[10px] text-slate-500 select-none">
            {lines.map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>
          {/* code (syntax-highlight-ready via language- class) */}
          <code className={langClass}>
            {lines.map((line, idx) => (
              <div key={idx}>{line || " "}</div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

/* ----------------- MAIN PAGE ----------------- */

const CodePadPage: React.FC = () => {
  const [language, setLanguage] = useState<Language>(LANGUAGES[0]);
  const [code, setCode] = useState<string>(LANGUAGES[0].defaultCode);
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // CodeSense AI state
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Floating panel controls
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [aiPanelVisible, setAiPanelVisible] = useState<boolean>(false);
  const [aiPanelSide, setAiPanelSide] = useState<"right" | "left">("right");
  const [aiPanelHeight, setAiPanelHeight] = useState<number>(320);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // History of CodeSense AI responses
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number | null>(
    null
  );

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = LANGUAGES.find((l) => l.value === e.target.value);
    if (lang) {
      setLanguage(lang);
      setCode(lang.defaultCode);
      setOutput("");
      setError("");
      setAiAdvice("");
      setAiError("");
    }
  };

  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput("");
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language.pistonLang || language.value,
          version: language.version,
          code,
          input,
        }),
      });

      if (!response.ok) {
        let errMessage = "Failed to execute code";
        try {
          const errData = await response.json();
          if (errData?.error) errMessage = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const result: PistonResponse = await response.json();
      let finalOut = "";

      if (result.compile?.stderr) {
        finalOut += `[Compile Error]:\n${result.compile.stderr}`;
        setError(finalOut);
      } else if (result.run?.stderr) {
        finalOut += `[Runtime Error]:\n${result.run.stderr}`;
        setError(finalOut);
      } else if (result.run?.stdout !== undefined) {
        finalOut = result.run.stdout;
        setOutput(finalOut);
      } else {
        setOutput("Execution finished with no output.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // CodeSense AI
  const handleAskAI = async () => {
    setShowAiPanel(true);
    setTimeout(() => setAiPanelVisible(true), 10);

    setIsAiLoading(true);
    setAiError("");
    setAiAdvice("");

    try {
      const response = await fetch("http://localhost:5000/api/ai-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language.pistonLang || language.value,
          version: language.version,
          code,
          input,
          programOutput: output,
          programError: error,
        }),
      });

      if (!response.ok) {
        let errMessage = "CodeSense AI unavailable";
        try {
          const errData = await response.json();
          if (errData?.error) errMessage = errData.error;
          if (errData?.details) errMessage += ` (${errData.details})`;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const data = await response.json();

      const adviceText =
        data.advice ||
        data.message ||
        data.explanation ||
        JSON.stringify(data, null, 2);

      setAiAdvice(adviceText);

      setAiHistory((prev) => {
        const entry: AiHistoryEntry = {
          id: Date.now(),
          title: `Run ${prev.length + 1}`,
          content: adviceText,
        };
        const next = [...prev, entry];
        setActiveHistoryIndex(next.length - 1);
        return next;
      });
    } catch (err) {
      if (err instanceof Error) {
        setAiError(err.message);
      } else {
        setAiError("Something went wrong while asking CodeSense AI.");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResetCode = () => {
    setCode(language.defaultCode);
    setOutput("");
    setError("");
    setAiAdvice("");
    setAiError("");
  };

  const handleClearIO = () => {
    setInput("");
    setOutput("");
    setError("");
    setAiAdvice("");
    setAiError("");
  };

  const handleCloseAiPanel = () => {
    setAiPanelVisible(false);
    setTimeout(() => {
      setShowAiPanel(false);
    }, 220);
  };

  const handleToggleSide = () =>
    setAiPanelSide((prev) => (prev === "right" ? "left" : "right"));

  const handleResizeMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const bottomOffset = 16;
      const newHeight = Math.min(
        480,
        Math.max(220, window.innerHeight - e.clientY - bottomOffset)
      );
      setAiPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  let activeEntry: AiHistoryEntry | null = null;
  if (
    activeHistoryIndex !== null &&
    activeHistoryIndex >= 0 &&
    activeHistoryIndex < aiHistory.length
  ) {
    activeEntry = aiHistory[activeHistoryIndex];
  }

  return (
    <div className="min-h-screen w-full bg-[#050509] text-slate-100 font-display overflow-x-hidden">
      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[-2rem] h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-10 sm:px-10 lg:px-16 xl:px-24">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-4 py-1 text-[11px] text-slate-300 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CodeSync · CodePad & Live Execution
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Write,{" "}
                <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                  run &amp; experiment
                </span>{" "}
                with code in one calm workspace.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Multi-language CodePad connected to your CodeSync experience —
                built for contests, labs, hackathons and everyday practice on a
                black + subtle neon canvas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 border border-slate-800 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="whitespace-nowrap">
                  Current language:{" "}
                  <span className="font-medium text-slate-100">
                    {language.name}
                  </span>{" "}
                  · v{language.version}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 border border-slate-800 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="whitespace-nowrap">
                  Powered by Piston API + CodeSense AI
                </span>
              </span>
            </div>
          </div>

          {/* Tips card */}
          <div className="mt-4 md:mt-0 md:w-72">
            <div className="rounded-2xl border border-slate-800 bg-black/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 whitespace-nowrap">
                Quick tips
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>Use the input panel for stdin-based problems.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>Switch language from the top-right of the editor.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    Use CodeSense AI to debug logic, errors and optimise
                    solutions.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Main layout */}
        <main className="grid h-[720px] grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Editor panel */}
          <section className="relative col-span-1 flex flex-col rounded-3xl border border-slate-800 bg-black/90 shadow-[0_0_35px_rgba(15,23,42,0.9)] backdrop-blur-xl lg:col-span-2">
            <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-fuchsia-500 to-emerald-400 opacity-70" />

            {/* Toolbar — flex-wrap so it can break cleanly */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              {/* Left: icon + title */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-sky-300 text-lg">
                  <RiCodeLine />
                </div>
                <div className="max-w-[180px]">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Editor
                  </p>
                  <p className="text-sm font-medium text-slate-100 truncate">
                    CodePad workspace
                  </p>
                </div>
              </div>

              {/* Right: language + buttons (wraps neatly on 2 rows if needed) */}
              <div className="flex flex-wrap items-center justify-end gap-2 flex-1">
                {/* Language + version */}
                <div className="hidden sm:flex items-center gap-2">
                  <select
                    value={language.value}
                    onChange={handleLanguageChange}
                    className="w-32 rounded-md border border-slate-700 bg-[#050710] px-3 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <span className="rounded-md bg-slate-900/80 px-2 py-1 text-[0.7rem] text-slate-400 whitespace-nowrap">
                    v{language.version}
                  </span>
                </div>

                {/* CodeSense + Reset + Run */}
                <button
                  onClick={handleAskAI}
                  disabled={isAiLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/70 bg-transparent px-3.5 py-1.5 text-[11px] font-medium text-sky-100 hover:bg-sky-500/10 hover:border-sky-400 transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isAiLoading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RiRobot2Line className="text-sm" />
                      Ask CodeSense
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetCode}
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#050710] px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900 transition whitespace-nowrap"
                >
                  Reset code
                </button>

                <button
                  onClick={handleRunCode}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 via-cyan-400 to-fuchsia-500 px-5 py-1.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] hover:brightness-110 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RiPlayLine className="text-sm" />
                      Run code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile language selector */}
            <div className="flex sm:hidden items-center justify-between border-b border-slate-800 px-4 py-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 whitespace-nowrap">
                  Language:
                </span>
                <select
                  value={language.value}
                  onChange={handleLanguageChange}
                  className="rounded-md border border-slate-700 bg-[#050710] px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 whitespace-nowrap"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-slate-500 whitespace-nowrap">
                v{language.version}
              </span>
            </div>

            {/* Editor */}
            <div className="relative flex-1 overflow-hidden pt-1">
              <Editor
                height="100%"
                language={language.value}
                value={code}
                beforeMount={(monaco: any) => {
                  monaco.editor.defineTheme("codesync-dark", {
                    base: "vs-dark",
                    inherit: true,
                    rules: [],
                    colors: {
                      "editor.background": "#050509",
                      "editorGutter.background": "#050509",
                      "editorLineNumber.foreground": "#64748b",
                      "editorLineNumber.activeForeground": "#e5e7eb",
                      "editorCursor.foreground": "#e5e7eb",
                      "editor.selectionBackground": "#0ea5e91f",
                      "editor.inactiveSelectionBackground": "#0ea5e90f",
                      "editor.lineHighlightBackground": "#020617",
                      "editor.lineHighlightBorder": "#0f172a",
                      "scrollbarSlider.background": "#1f2933aa",
                      "scrollbarSlider.hoverBackground": "#4b5563aa",
                    },
                  });
                }}
                theme="codesync-dark"
                onChange={(value: string | undefined) => setCode(value || "")}
                options={{
                  fontSize: 15,
                  minimap: { enabled: false },
                  fontLigatures: true,
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 10 },
                }}
              />
            </div>

            {/* Bottom hint */}
            <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between gap-2">
              <span className="whitespace-nowrap">
                Tip: Use the input panel on the right for stdin.
              </span>
              <button
                onClick={handleClearIO}
                className="text-[11px] text-sky-400 hover:text-sky-300 whitespace-nowrap"
              >
                Clear input &amp; output
              </button>
            </div>
          </section>

          {/* IO side panel */}
          <section className="flex flex-col gap-5">
            {/* Input */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-black/90 shadow-[0_0_28px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-transparent opacity-70" />

              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-sky-300 text-base">
                    <RiTerminalBoxLine />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
                      Input
                    </p>
                    <p className="text-xs font-medium text-slate-100 whitespace-nowrap">
                      Program stdin
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  Optional · multiline
                </span>
              </div>

              <textarea
                className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Example: testcases, numbers, strings...&#10;They will be passed to your program via standard input."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            {/* Output */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-black/90 shadow-[0_0_28px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-transparent opacity-70" />

              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-emerald-300 text-base">
                    <RiFileList3Line />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
                      Output
                    </p>
                    <p className="text-xs font-medium text-slate-100 whitespace-nowrap">
                      Result &amp; logs
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  Errors highlighted in red
                </span>
              </div>

              <pre
                className={`flex-1 overflow-auto px-4 py-3 text-xs whitespace-pre-wrap ${
                  error ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {isLoading
                  ? "Executing..."
                  : error || output || "Run your code to see output here..."}
              </pre>
            </div>
          </section>
        </main>

        {/* Overlay + Floating CodeSense panel */}
        {showAiPanel && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
              onClick={handleCloseAiPanel}
            />

            <div
              className={`fixed bottom-4 ${
                aiPanelSide === "right" ? "right-4" : "left-4"
              } z-40 w-full max-w-md px-4 sm:px-0 transition-all duration-300 ease-out transform ${
                aiPanelVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
            >
              <div
                className="rounded-2xl border border-slate-800 bg-black/95 shadow-[0_0_30px_rgba(15,23,42,0.95)] backdrop-blur-xl overflow-hidden flex flex-col"
                style={{ height: aiPanelHeight }}
              >
                <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-fuchsia-500 to-emerald-400 opacity-80" />

                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-sky-300 text-base">
                      <RiRobot2Line />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
                        CodeSense AI
                      </p>
                      <p className="text-xs font-medium text-slate-100 whitespace-nowrap">
                        Code analysis · errors · complexity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleToggleSide}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 text-[10px]"
                    >
                      ⇆
                    </button>

                    <button
                      onClick={handleCloseAiPanel}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 text-xs"
                    >
                      <RiCloseLine />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto px-4 py-3 text-[11px] sm:text-xs leading-relaxed">
                  {aiHistory.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {aiHistory.map((entry, index) => (
                        <button
                          key={entry.id}
                          onClick={() => setActiveHistoryIndex(index)}
                          className={`px-2 py-1 rounded-full text-[10px] border whitespace-nowrap ${
                            activeHistoryIndex === index
                              ? "border-sky-400 bg-sky-500/10 text-sky-100"
                              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-100"
                          }`}
                        >
                          {entry.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {isAiLoading && (
                    <p className="text-slate-300 flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                      Analyzing your code, input, output and errors...
                    </p>
                  )}

                  {!isAiLoading && aiError && (
                    <p className="text-red-400 whitespace-pre-wrap">
                      {aiError}
                    </p>
                  )}

                  {!isAiLoading && !aiError && activeEntry && (
                    <div className="space-y-2">
                      {parseAdviceSegments(activeEntry.content).map(
                        (seg, idx) =>
                          seg.type === "text" ? (
                            <p
                              key={idx}
                              className="whitespace-pre-wrap text-slate-100"
                            >
                              {seg.content}
                            </p>
                          ) : (
                            <CodeBlock
                              key={idx}
                              code={seg.content}
                              language={seg.language}
                              onApply={() => setCode(seg.content)}
                            />
                          )
                      )}
                    </div>
                  )}

                  {!isAiLoading && !aiError && !activeEntry && (
                    <p className="text-slate-400">
                      CodeSense AI will analyse your current code, input,
                      output and errors, then suggest fixes, a better approach
                      and time/space complexity.
                    </p>
                  )}
                </div>

                <div
                  onMouseDown={handleResizeMouseDown}
                  className="h-3 border-t border-slate-800 flex items-center justify-center cursor-row-resize text-[10px] text-slate-500 hover:bg-slate-900/60"
                >
                  ───
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CodePadPage;
