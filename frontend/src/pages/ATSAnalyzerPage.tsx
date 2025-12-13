// frontend/src/pages/ATSAnalyzerPage.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import apiClient from "../lib/apiClient";
import * as pdfjsLib from "pdfjs-dist";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiSparkling2Line,
  RiFileUploadLine,
  RiArrowRightLine,
  RiFileCopy2Line,
  RiRefreshLine,
  RiAlertLine,
  RiInformationLine,
  RiCloseLine,
  RiShieldCheckLine,
  RiSearchEyeLine,
  RiMagicLine,
  RiPenNibLine,
  RiRobot2Line,
  RiCheckDoubleLine,
  RiFireLine,
  RiBarChart2Line,
  RiPieChart2Line,
  RiPulseLine,
  RiListCheck2,
  RiLightbulbFlashLine,
  RiScan2Line,
  RiTimerFlashLine,
  RiQuestionAnswerLine,
  RiGitBranchLine,
  RiFileTextLine,
  RiLinksLine,
  RiNumbersLine,
  RiEyeLine,
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiLinkedinBoxLine,
  RiGithubLine,
} from "react-icons/ri";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

/* -----------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------- */
function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}
function cleanText(s: string) {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/#+\s?/g, "")
    .replace(/```/g, "")
    .replace(/[•]\s?/g, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function safeEq(a?: string, b?: string) {
  const x = cleanText(a || "");
  const y = cleanText(b || "");
  if (!x || !y) return false;
  return x.length === y.length && x === y;
}

async function extractPdfText(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .filter(Boolean);
    fullText += strings.join(" ") + "\n";
  }
  return fullText.trim();
}

function keywordFrequency(text: string, keywords: string[]) {
  const t = (text || "").toLowerCase();
  const out = (keywords || []).map((k) => {
    const kk = (k || "").toLowerCase().trim();
    if (!kk) return { k, c: 0 };
    const re = new RegExp(
      `\\b${kk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "g"
    );
    const m = t.match(re);
    return { k, c: m ? m.length : 0 };
  });
  return out.sort((a, b) => b.c - a.c);
}

/* -----------------------------------------------------------
 * Local ATS signals (NEVER empty)
 * ---------------------------------------------------------- */
function inferFormatSignals(
  resumeText: string,
  jdText: string,
  present: string[],
  missing: string[]
) {
  const t = (resumeText || "").replace(/\r/g, "");
  const lower = t.toLowerCase();
  const lines = t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const bulletRe = /^(\u2022|•|-|\*|\d+[\.\)]|[a-zA-Z][\.\)])\s+/;
  const bullets = lines.filter((l) => bulletRe.test(l)).length;

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(t);
  const hasPhone =
    /(\+\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}/.test(t) ||
    /\b\d{10}\b/.test(t.replace(/[^\d]/g, ""));
  const hasLinkedIn = /linkedin\.com\/in\//i.test(t) || /linkedin\.com/i.test(t);
  const hasGithub = /github\.com\//i.test(t);
  const hasPortfolio =
    /(portfolio|vercel\.app|netlify\.app|github\.io|behance\.net|dribbble\.com)/i.test(t);

  const metricsMatches =
    t.match(/\b(\d+%|\d+\s?(x|X)|\d+\s?(k|K|m|M)|₹\s?\d+|\$\s?\d+)\b/g) || [];
  const metrics = metricsMatches.length;

  const actionVerbHits =
    (lower.match(
      /\b(implemented|built|developed|designed|optimized|improved|reduced|increased|automated|led|deployed|integrated|migrated|scaled|delivered|shipped|refactored|architected|analyzed|measured|tested|debugged|resolved|maintained)\b/g
    ) || []).length;

  const sectionsHit = {
    summary: /\b(summary|objective|profile|about)\b/i.test(t),
    skills: /\bskills?\b/i.test(t),
    projects: /\bprojects?\b/i.test(t),
    experience: /\b(experience|internship|employment|work experience)\b/i.test(t),
    education: /\beducation\b/i.test(t),
    achievements: /\b(achievements|accomplishments|awards)\b/i.test(t),
    certifications: /\b(certifications?|certified)\b/i.test(t),
  };

  const sectionsCount = Object.values(sectionsHit).filter(Boolean).length;
  const hasSections = sectionsCount >= 3;

  const longLines = lines.filter((l) => l.length >= 140).length;

  const linksCount =
    (t.match(/https?:\/\/\S+/g) || []).length +
    (hasLinkedIn ? 1 : 0) +
    (hasGithub ? 1 : 0) +
    (hasPortfolio ? 1 : 0);

  const words = t.split(/\s+/).filter(Boolean).length;
  const approxLines = lines.length;

  const presentCount = (present || []).length;
  const missingCount = (missing || []).length;

  const wins: string[] = [];
  const issues: string[] = [];

  if (hasSections) wins.push(`Clear section headings detected (${sectionsCount} sections) — ATS parsing improves.`);
  if (bullets >= 8) wins.push(`Strong bullet structure (${bullets} bullets) — recruiter scan-friendly.`);
  if (metrics >= 3) wins.push(`Quantified impact detected (${metrics} metric signals) — boosts credibility.`);
  if (actionVerbHits >= 6) wins.push(`Good action-verb usage (${actionVerbHits} signals) — stronger framing.`);
  if (hasEmail) wins.push("Contact email detected — ATS-friendly header info.");
  if (hasPhone) wins.push("Phone number detected — contact section complete.");
  if (hasLinkedIn) wins.push("LinkedIn URL detected — increases recruiter trust.");
  if (hasGithub) wins.push("GitHub link detected — strong proof for tech roles.");
  if (hasPortfolio) wins.push("Portfolio/website detected — strengthens profile signal.");
  if (presentCount >= 10) wins.push("Good keyword coverage — many JD-aligned terms already present.");

  if (!hasSections) issues.push("Missing clear headings (Skills/Projects/Experience) — ATS may misread layout.");
  if (bullets < 4) issues.push("Too few bullet points — convert paragraphs into bullet achievements.");
  if (metrics < 2) issues.push("Low measurable impact — add numbers (%, time saved, users, latency, revenue).");
  if (actionVerbHits < 4) issues.push("Weak action-verb density — start bullets with strong verbs (Built, Optimized…).");
  if (longLines >= 6) issues.push("Many long lines — break into bullets for readability.");
  if (!hasLinkedIn) issues.push("Add LinkedIn URL — improves recruiter confidence.");
  if (!hasGithub) issues.push("Add GitHub URL — strong for tech roles.");
  if (missingCount >= 15) issues.push("Many JD keywords missing — add truthful skills/tools into Skills + Projects.");

  if (!wins.length) wins.push("Baseline ATS structure looks acceptable — next: add impact metrics + tighter keywords.");
  if (!issues.length) issues.push("No major blockers detected — next: strengthen impact and role-specific keywords.");

  return {
    wins: wins.slice(0, 12),
    issues: issues.slice(0, 12),
    stats: {
      bulletsCount: bullets,
      metricsCount: metrics,
      actionVerbSignals: actionVerbHits,
      sectionsCount,
      linksCount,
      words,
      lines: approxLines,
      flags: { hasEmail, hasPhone, hasLinkedIn, hasGithub, hasPortfolio, hasSections, sectionsHit },
    },
  };
}

/* -----------------------------------------------------------
 * Types
 * ---------------------------------------------------------- */
type Engine = {
  matchPercent?: number;
  hardScore?: number;
  softScore?: number;
  keywords?: { total?: number; presentTop?: string[]; missingTop?: string[] };
  format?: {
    issues?: string[];
    wins?: string[];
    stats?: { bulletsCount?: number; metricsCount?: number; actionVerbSignals?: number };
  };

  overallScore?: number;
  categoryScores?: Record<string, number>;
  keywordInsights?: { present?: string[]; missing?: string[]; criticalMissing?: string[] };
  formatFindings?: { issues?: string[]; wins?: string[] };

  meta?: {
    resumeLengthRating?: "1-page" | "2-page" | "too-long";
    resumeCharCount?: number;
    jdCharCount?: number;
    keywordDensity?: number;
  };
  contact?: {
    score?: number;
    emailDetected?: boolean;
    phoneDetected?: boolean;
    linkedinDetected?: boolean;
    githubDetected?: boolean;
    missing?: string[];
  };
  sectionConfidence?: {
    summary?: number;
    skills?: number;
    experience?: number;
    projects?: number;
    education?: number;
    achievements?: number;
  };
  criticalMissingWeighted?: Array<{ keyword: string; jdCount: number; score: number }>;
};

type Sections = {
  strengths?: string[];
  weaknesses?: string[];
  plan30?: string[];
  plan60?: string[];
  plan90?: string[];
  tailoredResume?: string;
  changesMade?: string;
  generatedResume?: string;
  about?: string;
  improve?: string;
  percent?: string;
};

type ApiResponse = {
  engine?: Engine | null;
  sections?: Sections | null;
  warning?: string | null;
  gemini?: { lastStatus?: number | null; lastError?: string | null } | null;
  hint?: string;
  error?: string;
  details?: string;
  lastError?: string;
  lastStatus?: number;
};

type ViewKey = "overview" | "insights" | "keywords" | "improve" | "tailor" | "generate";

/* -----------------------------------------------------------
 * Motion wrappers
 * ---------------------------------------------------------- */
const Pop: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children,
  delay = 0,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.22, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const GlobalStyle = () => (
  <style>
    {`
      @keyframes csSweep {
        0% { transform: translateX(-30%); opacity: .0; }
        35% { opacity: .55; }
        100% { transform: translateX(130%); opacity: 0; }
      }
      .cs-sweep:before {
        content:"";
        position:absolute;
        inset:-2px;
        background: linear-gradient(90deg, transparent, rgba(56,189,248,.16), rgba(168,85,247,.10), transparent);
        transform: translateX(-30%);
        animation: csSweep 2.8s ease-in-out infinite;
        pointer-events:none;
      }
      .cs-scroll::-webkit-scrollbar{ width:10px; height:10px;}
      .cs-scroll::-webkit-scrollbar-thumb{ background: rgba(148,163,184,.18); border-radius: 999px;}
      .cs-scroll::-webkit-scrollbar-track{ background: rgba(2,6,23,.2); }

      .cs-spotlight { position: relative; overflow: hidden; }
      .cs-spotlight:before{
        content:"";
        position:absolute;
        inset:-2px;
        background: radial-gradient(
          520px circle at var(--mx, 50%) var(--my, 30%),
          rgba(56,189,248,.14),
          rgba(168,85,247,.09),
          transparent 60%
        );
        opacity: .9;
        pointer-events:none;
        transition: opacity .2s ease;
      }
      .cs-spotlight:after{
        content:"";
        position:absolute;
        inset:0;
        background: linear-gradient(180deg, rgba(255,255,255,.03), transparent 55%);
        pointer-events:none;
      }
    `}
  </style>
);

const SpotlightCard: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };

    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={cx(
        "cs-spotlight rounded-3xl border border-slate-800 bg-gradient-to-b from-black/50 to-black/25 backdrop-blur-xl",
        "shadow-[0_0_40px_rgba(15,23,42,0.55)]",
        className
      )}
    >
      {children}
    </div>
  );
};

const ScoreRing: React.FC<{ value: number; label: string; sub?: string; badge?: string }> = ({
  value,
  label,
  sub,
  badge,
}) => {
  const v = clamp(value);
  const size = 190;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="atsGradMain" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(56,189,248)" />
            <stop offset="50%" stopColor="rgb(168,85,247)" />
            <stop offset="100%" stopColor="rgb(251,113,133)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(148,163,184,0.14)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#atsGradMain)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${dash} ${c - dash}`}
          className="transition-all duration-700 ease-out drop-shadow-[0_0_16px_rgba(168,85,247,0.55)]"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-6xl font-black tracking-tight leading-none">{v}%</div>
        <div className="mt-1 text-[11px] text-slate-400">{label}</div>
        {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
        {badge && (
          <div className="mt-3 max-w-[320px] rounded-2xl border border-slate-800 bg-black/40 px-3 py-2 text-[11px] text-slate-300">
            {badge}
          </div>
        )}
      </div>
    </div>
  );
};

function gradeLabel(n: number) {
  if (n >= 90) return "Elite";
  if (n >= 80) return "Strong";
  if (n >= 68) return "Decent";
  return "Needs Work";
}
function gradeAdvice(n: number) {
  if (n >= 90) return "Shortlist-ready. Do small tailoring + tighten impact proof.";
  if (n >= 80) return "Good. Add missing keywords + quantify bullets for Elite push.";
  if (n >= 68) return "Okay base. Fix ATS blockers + keyword alignment first.";
  return "High rejection risk. Fix structure + keywords + metrics ASAP.";
}

const MetricTile: React.FC<{
  title: string;
  value: number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "good" | "warn" | "bad";
}> = ({ title, value, hint, icon, tone = "good" }) => {
  const v = clamp(value);
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-rose-500/20 bg-rose-500/5";

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border p-4 transition will-change-transform",
        "bg-gradient-to-b from-black/55 to-black/25 backdrop-blur-xl",
        "hover:-translate-y-[2px] hover:shadow-[0_0_32px_rgba(56,189,248,0.12)]",
        toneClass
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500">{title}</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight">{v}%</div>
          {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
        </div>
        <div className="text-xl text-slate-300">{icon}</div>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] transition-all duration-700"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
};

const SparkStat: React.FC<{ label: string; value: string; icon: React.ReactNode; sub?: string }> = ({
  label,
  value,
  icon,
  sub,
}) => (
  <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-black/45 to-black/20 p-3">
    <div className="flex items-center justify-between">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-slate-300">{icon}</div>
    </div>
    <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    {sub && <div className="mt-0.5 text-[10px] text-slate-500">{sub}</div>}
  </div>
);

const Chips: React.FC<{ items: string[]; tone: "good" | "bad"; emptyText: string; max?: number }> = ({
  items,
  tone,
  emptyText,
  max = 44,
}) => {
  const show = (items || []).slice(0, max);
  if (!show.length) return <div className="text-[12px] text-slate-500">{emptyText}</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {show.map((k) => (
        <span
          key={k}
          className={cx(
            "rounded-full border px-2.5 py-1 text-[11px]",
            tone === "bad"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          )}
        >
          {k}
        </span>
      ))}
    </div>
  );
};

const ConfidenceBars: React.FC<{
  title: string;
  rows: Array<{ label: string; value: number; icon?: React.ReactNode }>;
}> = ({ title, rows }) => (
  <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-black/45 to-black/20 p-5">
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold inline-flex items-center gap-2">
        <RiBarChart2Line className="text-slate-300" />
        {title}
      </div>
      <div className="text-[11px] text-slate-500">0–100</div>
    </div>

    <div className="mt-4 space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-44 min-w-[11rem] text-xs text-slate-300 flex items-center gap-2">
            {r.icon}
            <span className="truncate">{r.label}</span>
          </div>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] transition-all duration-700"
              style={{ width: `${clamp(r.value)}%` }}
            />
          </div>
          <div className="w-10 text-right text-[11px] text-slate-400">{clamp(r.value)}%</div>
        </div>
      ))}
    </div>
  </div>
);

const ListCard: React.FC<{
  title: string;
  subtitle?: string;
  items: string[];
  tone?: "good" | "bad" | "neutral";
  icon?: React.ReactNode;
  max?: number;
}> = ({ title, subtitle, items, tone = "neutral", icon, max = 10 }) => {
  const border =
    tone === "good" ? "border-emerald-500/20" : tone === "bad" ? "border-rose-500/20" : "border-slate-800";
  const chip =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-100 border-emerald-500/25"
      : tone === "bad"
      ? "bg-rose-500/10 text-rose-100 border-rose-500/25"
      : "bg-white/5 text-slate-200 border-slate-800";

  const show = (items || []).filter(Boolean).slice(0, max);

  return (
    <div className={cx("rounded-3xl border p-5 bg-gradient-to-b from-black/45 to-black/20", border)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold inline-flex items-center gap-2">
            <span className="text-slate-300">{icon}</span>
            {title}
          </div>
          {subtitle && <div className="mt-1 text-[11px] text-slate-500">{subtitle}</div>}
        </div>
        <div className="text-[11px] text-slate-500">{show.length} shown</div>
      </div>

      <div className="mt-4 space-y-2">
        {show.map((x, i) => (
          <div key={i} className={cx("rounded-2xl border px-4 py-3 text-xs", chip)}>
            {cleanText(x)}
          </div>
        ))}
        {!show.length && <div className="text-sm text-slate-500">No items yet.</div>}
      </div>
    </div>
  );
};

/* -----------------------------------------------------------
 * Main
 * ---------------------------------------------------------- */
export default function ATSAnalyzerPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [view, setView] = useState<ViewKey>("overview");

  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");

  const [engine, setEngine] = useState<Engine | null>(null);
  const [sections, setSections] = useState<Sections | null>(null);

  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const hasReport = Boolean(engine || sections);

  useEffect(() => {
    if (!hasReport && view !== "overview") setView("overview");
  }, [hasReport, view]);

  const canAnalyze = useMemo(
    () => Boolean(jobDescription.trim() && resumeText.trim() && !extracting && !loading),
    [jobDescription, resumeText, extracting, loading]
  );

  const pickFile = async (file: File | null) => {
    setError("");
    setWarning("");
    setEngine(null);
    setSections(null);

    setResumeFile(file);
    setResumeText("");

    if (!file) return;

    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (!text) {
        setError("No text extracted. If it’s a scanned PDF, convert it to text-based PDF.");
        setResumeText("");
      } else {
        setResumeText(text);
      }
    } catch (e) {
      console.error(e);
      setError("PDF extraction failed. Try a text-based PDF resume.");
      setResumeText("");
    } finally {
      setExtracting(false);
    }
  };

  const analyze = async () => {
    setError("");
    setWarning("");
    setEngine(null);
    setSections(null);

    setLoading(true);
    const phases = [
      "Reading resume…",
      "Understanding JD…",
      "Scoring match…",
      "Extracting gaps…",
      "Building recruiter review…",
      "Generating resumes…",
    ];
    let idx = 0;
    setPhase(phases[idx]);
    const timer = window.setInterval(() => {
      idx = Math.min(idx + 1, phases.length - 1);
      setPhase(phases[idx]);
    }, 850);

    try {
      const payload = {
        jobDescription,
        resumeText,
        resumeFileName: resumeFile?.name || "",
      };

      const { data } = await apiClient.post<ApiResponse>("/career/ats-analyzer", payload);

      setEngine(data?.engine || null);

      if (data?.sections) {
        const s = data.sections;
        setSections({
          ...s,
          strengths: (s.strengths || []).map(cleanText),
          weaknesses: (s.weaknesses || []).map(cleanText),
          plan30: (s.plan30 || []).map(cleanText),
          plan60: (s.plan60 || []).map(cleanText),
          plan90: (s.plan90 || []).map(cleanText),
          tailoredResume: cleanText(s.tailoredResume || ""),
          generatedResume: cleanText(s.generatedResume || ""),
          changesMade: cleanText(s.changesMade || ""),
          about: cleanText(s.about || ""),
          improve: cleanText(s.improve || ""),
          percent: cleanText(s.percent || ""),
        });
      } else {
        setSections(null);
      }

      if (data?.warning) setWarning(String(data.warning));

      if (!data?.sections && data?.gemini?.lastError) {
        setWarning(
          `AI partial mode: ${data.gemini.lastError}${data.gemini.lastStatus ? ` (HTTP ${data.gemini.lastStatus})` : ""}`
        );
      }

      setView("overview");
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      const d = err?.response?.data;

      const msg =
        d?.error || d?.hint || d?.details || d?.lastError || d?.gemini?.lastError || err?.message || "ATS failed";

      setError(`${status ? `HTTP ${status}: ` : ""}${msg}`);
    } finally {
      window.clearInterval(timer);
      setPhase("");
      setLoading(false);
    }
  };

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt || "");
    } catch {}
  };

  const overall =
    typeof engine?.overallScore === "number" ? clamp(engine.overallScore) : clamp(engine?.matchPercent ?? 0);

  const missingKeywords = engine?.keywordInsights?.missing || engine?.keywords?.missingTop || [];
  const presentKeywords = engine?.keywordInsights?.present || engine?.keywords?.presentTop || [];

  const inferred = useMemo(
    () => inferFormatSignals(resumeText, jobDescription, presentKeywords, missingKeywords),
    [resumeText, jobDescription, presentKeywords, missingKeywords]
  );

  const backendIssues = engine?.formatFindings?.issues || engine?.format?.issues || [];
  const backendWins = engine?.formatFindings?.wins || engine?.format?.wins || [];

  const formatIssues = (backendIssues?.length ? backendIssues : inferred.issues) || [];
  const formatWins = (backendWins?.length ? backendWins : inferred.wins) || [];

  const bestStats = useMemo(() => {
    const b = engine?.format?.stats?.bulletsCount;
    const m = engine?.format?.stats?.metricsCount;
    const v = engine?.format?.stats?.actionVerbSignals;

    const backendMissing = typeof b !== "number" || typeof m !== "number" || typeof v !== "number";
    const backendAllZero = (b ?? 0) === 0 && (m ?? 0) === 0 && (v ?? 0) === 0;

    const useBackend = !backendMissing && !backendAllZero;

    return {
      bulletsCount: useBackend ? (b as number) : inferred.stats.bulletsCount,
      metricsCount: useBackend ? (m as number) : inferred.stats.metricsCount,
      actionVerbSignals: useBackend ? (v as number) : inferred.stats.actionVerbSignals,

      sectionsCount: inferred.stats.sectionsCount,
      linksCount: inferred.stats.linksCount,
      words: inferred.stats.words,
      lines: inferred.stats.lines,
      flags: inferred.stats.flags,
    };
  }, [
    engine?.format?.stats?.bulletsCount,
    engine?.format?.stats?.metricsCount,
    engine?.format?.stats?.actionVerbSignals,
    inferred,
  ]);

  const quickStats = useMemo(() => {
    return {
      bullets: String(bestStats.bulletsCount ?? 0),
      metrics: String(bestStats.metricsCount ?? 0),
      verbs: String(bestStats.actionVerbSignals ?? 0),
      missing: String(missingKeywords?.length || 0),
      present: String(presentKeywords?.length || 0),
      sections: String(bestStats.sectionsCount ?? 0),
      links: String(bestStats.linksCount ?? 0),
      words: String(bestStats.words ?? 0),
      lines: String(bestStats.lines ?? 0),
    };
  }, [bestStats, missingKeywords?.length, presentKeywords?.length]);

  const contact = engine?.contact;
  const resumeLen = engine?.meta?.resumeLengthRating;
  const keywordDensity = engine?.meta?.keywordDensity;
  const sectionConf = engine?.sectionConfidence;
  const weightedMissing = engine?.criticalMissingWeighted || [];

  const categoryScores = useMemo(() => {
    if (engine?.categoryScores && Object.keys(engine.categoryScores).length) {
      const cs = engine.categoryScores;
      return [
        { k: "ATS Compatibility", v: cs.atsCompatibility ?? 0, icon: <RiShieldCheckLine /> },
        { k: "Keyword Match", v: cs.keywordMatch ?? 0, icon: <RiSearchEyeLine /> },
        { k: "Experience Fit", v: cs.experienceAlignment ?? 0, icon: <RiRobot2Line /> },
        { k: "Impact & Metrics", v: cs.impactMetrics ?? 0, icon: <RiFireLine /> },
        { k: "Readability", v: cs.readability ?? 0, icon: <RiCheckDoubleLine /> },
        { k: "Structure", v: cs.structure ?? 0, icon: <RiGitBranchLine /> },
      ];
    }

    const keyword = clamp(engine?.matchPercent ?? overall ?? 0);
    const bullets = bestStats.bulletsCount ?? 0;
    const metrics = bestStats.metricsCount ?? 0;
    const verbs = bestStats.actionVerbSignals ?? 0;

    const bulletsScore = clamp((Math.min(bullets, 18) / 18) * 100);
    const metricsScore = clamp((Math.min(metrics, 35) / 35) * 100);
    const verbsScore = clamp((Math.min(verbs, 25) / 25) * 100);

    const impact = clamp(Math.round(metricsScore * 0.65 + verbsScore * 0.35));
    const atsCompat = clamp(
      62 + Math.min(18, (formatWins?.length || 0) * 3) - Math.min(22, (formatIssues?.length || 0) * 4)
    );
    const readability = clamp(Math.round(40 + bulletsScore * 0.35 + verbsScore * 0.35));
    const structure = clamp(Math.round(atsCompat * 0.55 + bulletsScore * 0.45));
    const experience = typeof engine?.hardScore === "number" ? clamp(engine.hardScore) : clamp(55 + keyword * 0.35);

    return [
      { k: "ATS Compatibility", v: atsCompat, icon: <RiShieldCheckLine /> },
      { k: "Keyword Match", v: keyword, icon: <RiSearchEyeLine /> },
      { k: "Experience Fit", v: experience, icon: <RiRobot2Line /> },
      { k: "Impact & Metrics", v: impact, icon: <RiFireLine /> },
      { k: "Readability", v: readability, icon: <RiCheckDoubleLine /> },
      { k: "Structure", v: structure, icon: <RiGitBranchLine /> },
    ];
  }, [engine, overall, bestStats, formatIssues?.length, formatWins?.length]);

  const sectionRows = useMemo(() => {
    const s = sectionConf;
    if (!s) return [];
    return [
      { label: "Summary", value: s.summary ?? 0, icon: <RiFileTextLine className="text-slate-400" /> },
      { label: "Skills", value: s.skills ?? 0, icon: <RiListCheck2 className="text-slate-400" /> },
      { label: "Experience", value: s.experience ?? 0, icon: <RiRobot2Line className="text-slate-400" /> },
      { label: "Projects", value: s.projects ?? 0, icon: <RiGitBranchLine className="text-slate-400" /> },
      { label: "Education", value: s.education ?? 0, icon: <RiFileTextLine className="text-slate-400" /> },
      { label: "Achievements", value: s.achievements ?? 0, icon: <RiFireLine className="text-slate-400" /> },
    ];
  }, [sectionConf]);

  const quickWins = useMemo(() => {
    const wins: string[] = [];
    formatIssues.slice(0, 3).forEach((x) => wins.push(`Fix: ${cleanText(x)}`));

    const mk = (missingKeywords || []).slice(0, 6);
    if (mk.length) wins.push(`Add keywords (truthful): ${mk.join(", ")} — put in Skills + 1–2 Project bullets.`);

    if ((bestStats.metricsCount ?? 0) < 2) {
      wins.push(`Add 2–4 metrics: “Reduced latency by 28%”, “Saved 6 hrs/week”, “Used by 1,200 users”.`);
    }
    if ((bestStats.bulletsCount ?? 0) < 6) {
      wins.push("Convert paragraphs to bullets: 2–4 bullets per project/role, each starting with a strong verb.");
    }
    const miss = contact?.missing || [];
    if (miss.length) wins.push(`Complete contact header: add ${miss.join(", ")} in plain text (ATS safe).`);

    return wins.slice(0, 8);
  }, [formatIssues, missingKeywords, bestStats, contact]);

  const freqPresent = useMemo(() => {
    if (!resumeText || !presentKeywords?.length) return [];
    return keywordFrequency(resumeText, presentKeywords)
      .slice(0, 12)
      .filter((x) => x.c > 0)
      .map((x) => `${x.k} — ${x.c}×`);
  }, [resumeText, presentKeywords]);

  const weightedLines = useMemo(() => {
    const rows = (weightedMissing || []).slice(0, 14);
    if (!rows.length) return [];
    return rows.map((x) => `Add/strengthen: ${x.keyword} (appears ${x.jdCount}× in JD)`);
  }, [weightedMissing]);

  const tailoredSameAsGenerated = useMemo(
    () => safeEq(sections?.tailoredResume, sections?.generatedResume),
    [sections?.tailoredResume, sections?.generatedResume]
  );

  const tabs: Array<{ k: ViewKey; label: string; icon: React.ReactNode; needsReport?: boolean }> = useMemo(
    () => [
      { k: "overview", label: "Dashboard", icon: <RiBarChart2Line /> },
      { k: "insights", label: "Recruiter Review", icon: <RiQuestionAnswerLine />, needsReport: true },
      { k: "keywords", label: "Keywords", icon: <RiScan2Line />, needsReport: true },
      { k: "improve", label: "Roadmap", icon: <RiTimerFlashLine />, needsReport: true },
      { k: "tailor", label: "Tailored", icon: <RiPenNibLine />, needsReport: true },
      { k: "generate", label: "Generated", icon: <RiPieChart2Line />, needsReport: true },
    ],
    []
  );

  const resumeLenTone =
    resumeLen === "1-page"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : resumeLen === "2-page"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : resumeLen
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-slate-700 bg-white/5 text-slate-300";

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 p-5 sm:p-8 relative overflow-hidden">
      <GlobalStyle />

      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute right-[-10%] top-[-15%] h-72 w-72 rounded-full bg-sky-500/30 blur-[120px]" />
        <div className="absolute left-[-10%] bottom-[-20%] h-72 w-72 rounded-full bg-fuchsia-500/30 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative mb-6 max-w-7xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/70 px-4 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          CodeSync · ATS Analyzer
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              ATS{" "}
              <span className="bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] text-transparent bg-clip-text">
                Resume Analyzer
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Fixed responsive grids (no md fixed-column gaps) · dense dashboard · spotlight cards.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <RiShieldCheckLine />
            Privacy-first · On-demand processing
          </div>
        </div>
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-7xl mx-auto rounded-3xl border border-slate-800 bg-black/70 backdrop-blur-xl shadow-[0_0_40px_rgba(15,23,42,0.9)]">
        {/* Top strip */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3 bg-gradient-to-r from-black via-[#050815] to-black rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-sky-500/40 blur-md opacity-60" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 border border-slate-700 text-sky-300">
                <RiSparkling2Line className="text-xl" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">ATS Analyzer Console</p>
              <p className="text-[10px] text-slate-500">Responsive layout fixed</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400">
            {extracting ? "Extracting PDF…" : loading ? `Analyzing… ${phase}` : "Ready"}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr]">
          {/* LEFT */}
          <div className="border-r border-slate-800/70 p-5">
            {/* JD */}
            <SpotlightCard className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Job Description</p>
                <span className="text-[10px] text-slate-500">
                  {jobDescription.trim() ? `${jobDescription.length.toLocaleString()} chars` : "required"}
                </span>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={11}
                className="mt-3 w-full resize-y rounded-2xl border border-slate-700 bg-[#050712] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 cs-scroll"
                placeholder="Paste JD here..."
              />
            </SpotlightCard>

            {/* Resume */}
            <SpotlightCard className="mt-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">Resume PDF</p>
                <span className="text-[10px] text-slate-500">{resumeFile ? "selected" : "required"}</span>
              </div>

              <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-[#050712] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 font-medium truncate">
                      {resumeFile ? resumeFile.name : "No PDF selected"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {extracting
                        ? "Extracting text…"
                        : resumeText
                        ? `Extracted ~${resumeText.length.toLocaleString()} chars (hidden)`
                        : "Tip: Text-based PDFs work best"}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 transition"
                    >
                      <RiFileUploadLine className="text-base" />
                      Choose
                    </button>
                    <button
                      onClick={() => pickFile(null)}
                      className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition"
                    >
                      Clear
                    </button>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className={cx(
                    "relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition cs-sweep",
                    "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold tracking-tight">{loading ? "Analyzing…" : "Analyze Resume"}</div>
                    <div className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                      {loading ? (
                        <>
                          <RiRefreshLine className="animate-spin" />
                          {phase || "Working…"}
                        </>
                      ) : (
                        <>
                          <RiArrowRightLine />
                          Run
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    Score → tiles → contact/sections → blockers/wins → keywords → roadmap → outputs
                  </div>
                </button>

                {(warning || error) && (
                  <div className="mt-3 space-y-2">
                    {warning && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 whitespace-pre-wrap">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 font-semibold">
                            <RiInformationLine />
                            Notice
                          </div>
                          <button onClick={() => setWarning("")} className="text-amber-200/80 hover:text-amber-200">
                            <RiCloseLine />
                          </button>
                        </div>
                        <div className="mt-1">{warning}</div>
                      </div>
                    )}

                    {error && (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 whitespace-pre-wrap">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 font-semibold">
                            <RiAlertLine />
                            Error
                          </div>
                          <button onClick={() => setError("")} className="text-rose-200/80 hover:text-rose-200">
                            <RiCloseLine />
                          </button>
                        </div>
                        <div className="mt-1">{error}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SparkStat label="Bullets" value={String(bestStats.bulletsCount ?? 0)} icon={<RiListCheck2 />} sub="Detected from resume" />
                <SparkStat label="Metrics" value={String(bestStats.metricsCount ?? 0)} icon={<RiNumbersLine />} sub="%, $, x, ₹" />
                <SparkStat label="Action verbs" value={String(bestStats.actionVerbSignals ?? 0)} icon={<RiPulseLine />} sub="Verb signals" />
                <SparkStat label="Missing keywords" value={String(missingKeywords.length)} icon={<RiScan2Line />} sub="From JD match" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={cx("rounded-full border px-3 py-1", resumeLenTone)}>
                  Resume length: {resumeLen || "—"}
                </span>
                <span className="rounded-full border border-slate-700 bg-white/5 px-3 py-1 text-slate-300">
                  Keyword density: {typeof keywordDensity === "number" ? keywordDensity : "—"}
                </span>
                <span className="rounded-full border border-slate-700 bg-white/5 px-3 py-1 text-slate-300">
                  Contact score: {typeof contact?.score === "number" ? `${contact.score}%` : "—"}
                </span>
              </div>
            </SpotlightCard>
          </div>

          {/* RIGHT */}
          <div className="p-5">
            {/* Sticky tabs */}
            <div className="sticky top-4 z-10">
              <div className="rounded-2xl border border-slate-800 bg-black/70 backdrop-blur-xl p-2 flex flex-wrap gap-2">
                {tabs.map((t) => {
                  const disabled = Boolean(t.needsReport) && !hasReport;
                  return (
                    <button
                      key={t.k}
                      type="button"
                      disabled={disabled}
                      onClick={() => setView(t.k)}
                      className={cx(
                        "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition",
                        disabled && "opacity-50 cursor-not-allowed",
                        view === t.k
                          ? "border-sky-500/60 bg-sky-500/10 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.20)]"
                          : "border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-900/60"
                      )}
                    >
                      <span className="text-base">{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!engine && !sections && (
              <Pop className="mt-4">
                <SpotlightCard className="p-6 text-sm text-slate-400">
                  Upload resume + paste JD → click Analyze. Your dashboard will appear here.
                </SpotlightCard>
              </Pop>
            )}

            <AnimatePresence mode="wait">
              {/* DASHBOARD */}
              {view === "overview" && engine && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4"
                >
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 items-start">
                    {/* ✅ FIXED: NO md fixed 220px. Side-by-side only on lg+. Also minmax elastic. */}
                    <SpotlightCard className="p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_1fr] gap-5 items-start">
                        <div className="flex justify-center lg:justify-start lg:sticky lg:top-6">
                          <div className="w-full max-w-[280px]">
                            <ScoreRing value={overall} label="ATS Match" sub={gradeLabel(overall)} badge={gradeAdvice(overall)} />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs text-slate-400">Your current signal</div>
                          <div className="mt-1 text-2xl font-black">
                            <span className="bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] text-transparent bg-clip-text">
                              {gradeLabel(overall)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Fix low tiles first: clean headings + metrics + missing keywords inside real bullets.
                          </div>

                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <SparkStat label="Present" value={String(presentKeywords.length)} icon={<RiSearchEyeLine />} />
                            <SparkStat label="Missing" value={String(missingKeywords.length)} icon={<RiScan2Line />} />
                            <SparkStat label="Bullets" value={String(bestStats.bulletsCount ?? 0)} icon={<RiListCheck2 />} />
                            <SparkStat label="Metrics" value={String(bestStats.metricsCount ?? 0)} icon={<RiFireLine />} />
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {categoryScores.map((m) => {
                              const tone = m.v >= 80 ? "good" : m.v >= 65 ? "warn" : "bad";
                              return (
                                <MetricTile
                                  key={m.k}
                                  title={m.k}
                                  value={m.v}
                                  icon={m.icon}
                                  tone={tone as any}
                                  hint={m.v >= 80 ? "Strong" : m.v >= 65 ? "Improve" : "Fix first"}
                                />
                              );
                            })}
                          </div>

                          <div className="mt-4 rounded-3xl border border-slate-800 bg-black/25 p-4">
                            <div className="text-xs font-semibold text-slate-200 inline-flex items-center gap-2">
                              <RiMagicLine className="text-slate-300" />
                              Quick Wins (do these first)
                            </div>
                            <ul className="mt-3 text-xs text-slate-300 space-y-1">
                              {quickWins.map((x, i) => (
                                <li key={i}>• {x}</li>
                              ))}
                              {!quickWins.length && <li className="text-slate-500">No quick wins generated yet.</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>

                    {/* Contact + section */}
                    <div className="grid grid-cols-1 gap-4">
                      <SpotlightCard className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold inline-flex items-center gap-2">
                            <RiUserLine className="text-slate-300" />
                            Contact Completeness
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {typeof contact?.score === "number" ? `${contact.score}%` : "—"}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <SparkStat label="Email" value={contact?.emailDetected ? "Detected" : "Missing"} icon={<RiMailLine />} />
                          <SparkStat label="Phone" value={contact?.phoneDetected ? "Detected" : "Missing"} icon={<RiPhoneLine />} />
                          <SparkStat label="LinkedIn" value={contact?.linkedinDetected ? "Detected" : "Missing"} icon={<RiLinkedinBoxLine />} />
                          <SparkStat label="GitHub" value={contact?.githubDetected ? "Detected" : "Missing"} icon={<RiGithubLine />} />
                        </div>

                        {contact?.missing?.length ? (
                          <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-xs text-rose-100">
                            Missing: {contact.missing.join(", ")}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                            Clean contact block. Keep it one-line, plain text (ATS friendly).
                          </div>
                        )}
                      </SpotlightCard>

                      <SpotlightCard className="p-0">
                        <ConfidenceBars
                          title="Per-section ATS Confidence"
                          rows={
                            sectionRows.length
                              ? sectionRows
                              : [
                                  { label: "Summary", value: inferred.stats.flags.sectionsHit.summary ? 80 : 30, icon: <RiFileTextLine className="text-slate-400" /> },
                                  { label: "Skills", value: inferred.stats.flags.sectionsHit.skills ? 90 : 30, icon: <RiListCheck2 className="text-slate-400" /> },
                                  { label: "Experience", value: inferred.stats.flags.sectionsHit.experience ? 92 : 30, icon: <RiRobot2Line className="text-slate-400" /> },
                                  { label: "Projects", value: inferred.stats.flags.sectionsHit.projects ? 88 : 30, icon: <RiGitBranchLine className="text-slate-400" /> },
                                  { label: "Education", value: inferred.stats.flags.sectionsHit.education ? 85 : 30, icon: <RiFileTextLine className="text-slate-400" /> },
                                  { label: "Achievements", value: inferred.stats.flags.sectionsHit.achievements ? 78 : 30, icon: <RiFireLine className="text-slate-400" /> },
                                ]
                          }
                        />
                      </SpotlightCard>
                    </div>

                    <ListCard
                      title="ATS Blockers (Fix Priority)"
                      subtitle="Never empty. Fix these for the fastest score jump."
                      items={formatIssues}
                      tone="bad"
                      icon={<RiAlertLine className="text-rose-200" />}
                      max={10}
                    />

                    <ListCard
                      title="Strength Signals (Keep + Amplify)"
                      subtitle="Never empty. Add metrics + keywords to strengthen these."
                      items={formatWins}
                      tone="good"
                      icon={<RiCheckDoubleLine className="text-emerald-200" />}
                      max={10}
                    />

                    <ListCard
                      title="Keyword hits in your Resume"
                      subtitle="Terms you already mention often (keep them visible)."
                      items={freqPresent.length ? freqPresent : ["Not enough data yet. Run analysis + ensure resume text extracted."]}
                      tone="neutral"
                      icon={<RiSearchEyeLine className="text-slate-300" />}
                      max={12}
                    />

                    <ListCard
                      title="Critical Missing (JD-weighted)"
                      subtitle="These appear repeatedly in JD. Add only if truthful."
                      items={weightedLines.length ? weightedLines : ["No weighted missing list from backend yet."]}
                      tone="neutral"
                      icon={<RiScan2Line className="text-slate-300" />}
                      max={14}
                    />
                  </div>
                </motion.div>
              )}

              {/* KEYWORDS */}
              {view === "keywords" && engine && (
                <motion.div
                  key="keywords"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 space-y-4"
                >
                  <SpotlightCard className="p-5">
                    <div className="text-sm font-semibold inline-flex items-center gap-2">
                      <RiScan2Line className="text-rose-200" />
                      Missing Keywords (High ROI)
                    </div>
                    <div className="mt-2">
                      <Chips items={missingKeywords} tone="bad" emptyText="No major missing keywords detected." />
                    </div>
                  </SpotlightCard>

                  <SpotlightCard className="p-5">
                    <div className="text-sm font-semibold inline-flex items-center gap-2">
                      <RiSearchEyeLine className="text-emerald-200" />
                      Present Keywords (Strong Match)
                    </div>
                    <div className="mt-2">
                      <Chips items={presentKeywords} tone="good" emptyText="No strong keyword matches detected yet." />
                    </div>
                  </SpotlightCard>
                </motion.div>
              )}

              {/* ROADMAP */}
              {view === "improve" && (
                <motion.div
                  key="improve"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4"
                >
                  <SpotlightCard className="p-5">
                    <div className="text-sm font-semibold inline-flex items-center gap-2">
                      <RiMagicLine className="text-sky-200" />
                      Roadmap (30 / 60 / 90 Days)
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { title: "30 days", items: sections?.plan30 || [] },
                        { title: "60 days", items: sections?.plan60 || [] },
                        { title: "90 days", items: sections?.plan90 || [] },
                      ].map((b) => (
                        <div key={b.title} className="rounded-2xl border border-slate-800 bg-black/30 p-4">
                          <div className="text-xs font-semibold text-slate-200">{b.title}</div>
                          <ul className="mt-3 text-xs text-slate-300 space-y-1">
                            {b.items.slice(0, 14).map((x, i) => (
                              <li key={i}>• {cleanText(x)}</li>
                            ))}
                            {!b.items.length && <li className="text-slate-500">Not generated yet.</li>}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-black/25 p-4">
                      <div className="text-xs font-semibold text-slate-200">This week (fast uplift)</div>
                      <ul className="mt-3 text-xs text-slate-300 space-y-1">
                        {quickWins.map((x, i) => (
                          <li key={i}>• {x}</li>
                        ))}
                        {!quickWins.length && <li className="text-slate-500">Run analysis first.</li>}
                      </ul>
                    </div>
                  </SpotlightCard>
                </motion.div>
              )}

              {/* TAILOR */}
              {view === "tailor" && (
                <motion.div
                  key="tailor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4"
                >
                  <SpotlightCard className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold inline-flex items-center gap-2">
                          <RiPenNibLine className="text-sky-200" />
                          Tailored Resume
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">ATS-optimized rewrite using your resume facts.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(sections?.tailoredResume || "")}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 transition text-xs"
                      >
                        <RiFileCopy2Line className="text-base" />
                        Copy
                      </button>
                    </div>

                    {tailoredSameAsGenerated && (
                      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                        Tailored and Generated look identical (partial mode/template).
                      </div>
                    )}

                    {sections?.tailoredResume ? (
                      <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-100 rounded-2xl border border-slate-800 bg-black/30 p-4 cs-scroll max-h-[560px] overflow-auto">
                        {cleanText(sections.tailoredResume)}
                      </pre>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">Run analysis to generate tailored resume.</div>
                    )}
                  </SpotlightCard>
                </motion.div>
              )}

              {/* GENERATED */}
              {view === "generate" && (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4"
                >
                  <SpotlightCard className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold inline-flex items-center gap-2">
                          <RiSparkling2Line className="text-fuchsia-200" />
                          Generated Resume
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">JD-based template (placeholders, no fake companies).</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(sections?.generatedResume || "")}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 transition text-xs"
                      >
                        <RiFileCopy2Line className="text-base" />
                        Copy
                      </button>
                    </div>

                    {sections?.generatedResume ? (
                      <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-100 rounded-2xl border border-slate-800 bg-black/30 p-4 cs-scroll max-h-[560px] overflow-auto">
                        {cleanText(sections.generatedResume)}
                      </pre>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">Run analysis to generate a JD-based resume.</div>
                    )}
                  </SpotlightCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center text-[11px] text-slate-500">
              ✅ Responsive fixed: no `md:grid-cols-[220px_1fr]` gap anymore. Uses `lg:minmax()` + stacks on md.
            </div>
          </div>
        </div>

        <div className="h-2 rounded-b-3xl bg-transparent" />
      </div>
    </div>
  );
}
