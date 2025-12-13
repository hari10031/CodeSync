// frontend/src/pages/ResumeBuilderPage.tsx
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiSparkling2Line,
  RiDownload2Line,
  RiMagicLine,
  RiLayout4Line,
  RiShieldCheckLine,
  RiRobot2Line,
  RiAddLine,
  RiDeleteBin6Line,
  RiBriefcase4Line,
  RiCodeBoxLine,
  RiGraduationCapLine,
  RiTrophyLine,
  RiLinksLine,
  RiPaintBrushLine,
  RiRefreshLine,
} from "react-icons/ri";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";

/* ---------------------------------------------
 * Types
 * --------------------------------------------*/
type TemplateId = "neo-minimal" | "tech-card" | "split-accent" | "timeline-pro";

type SkillBadge = {
  label: string;
  level: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  meta?: string;
};

type Experience = {
  company: string;
  role: string;
  location?: string;
  start: string;
  end: string;
  bullets: string[];
};

type Education = {
  school: string;
  degree: string;
  field?: string;
  location?: string;
  start: string;
  end: string;
  score?: string;
};

type Project = {
  name: string;
  link?: string;
  description: string;
  bullets: string[];
  tech?: string;
};

type Certificate = {
  name: string;
  issuer?: string;
  year?: string;
  link?: string;
};

type Link = {
  label: string;
  url: string;
};

type ResumeForm = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: Link[];

  summary: string;

  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    concepts: string[];
  };

  experience: Experience[];
  projects: Project[];
  education: Education[];
  achievements: string[];
  certifications: Certificate[];
  extracurricular: string[];
};

type AiBuildResponse = {
  ok: boolean;
  resume?: ResumeForm;
  message?: string;
};

type RewriteResponse = {
  ok: boolean;
  bullets?: string[];
  message?: string;
};

type BadgesResponse = {
  ok: boolean;
  badges?: SkillBadge[];
  suggestedConcepts?: string[];
  suggestedTools?: string[];
  message?: string;
};

/* ---------------------------------------------
 * A4 constants (px canvas)
 * --------------------------------------------*/
const A4_W = 794; // ~8.27in @96dpi
const A4_H = 1123; // ~11.69in @96dpi

/* ---------------------------------------------
 * Defaults + Sample
 * --------------------------------------------*/
const emptyForm: ResumeForm = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: [
    { label: "LinkedIn", url: "" },
    { label: "GitHub", url: "" },
    { label: "Portfolio", url: "" },
  ],
  summary: "",
  skills: { languages: [], frameworks: [], tools: [], concepts: [] },
  experience: [],
  projects: [],
  education: [],
  achievements: [],
  certifications: [],
  extracurricular: [],
};

const sampleResume: ResumeForm = {
  fullName: "Dhruv Reddy S",
  title: "Full Stack Developer | Competitive Programmer",
  email: "dhruvreddy.s@gmail.com",
  phone: "+91 98765 43210",
  location: "Hyderabad, India",
  links: [
    { label: "LinkedIn", url: "https://linkedin.com/in/dhruvreddys" },
    { label: "GitHub", url: "https://github.com/DhruvReddyS" },
    { label: "Portfolio", url: "https://dhruvreddy.dev" },
    { label: "LeetCode", url: "https://leetcode.com/u/dhruvreddys" },
  ],
  summary:
    "Full Stack Developer building scalable products with React, Node.js, and Firebase. Strong DSA + system thinking, focused on measurable impact (performance, reliability, and clean UX). Built CodeSync — a unified CP + career suite with leaderboards and AI tools.",
  skills: {
    languages: ["C++", "Java", "JavaScript", "TypeScript", "Python"],
    frameworks: ["React", "Node.js", "Express", "Flask"],
    tools: ["Firebase", "MongoDB", "Git", "Docker", "Postman"],
    concepts: ["DSA", "OOP", "DBMS", "OS", "System Design", "REST APIs"],
  },
  experience: [
    {
      company: "CodeSync (Personal Product)",
      role: "Full Stack Developer",
      location: "Hyderabad (Remote)",
      start: "May 2025",
      end: "Present",
      bullets: [
        "Built a multi-platform CP aggregator for LeetCode/CodeChef/Codeforces/GitHub with unified scoring (0–100).",
        "Implemented Firebase Auth + Firestore models for student profiles, badges, and leaderboard filters.",
        "Optimized API response time using caching + batched reads, improving dashboard load by ~40%.",
      ],
    },
    {
      company: "College TechFest Team",
      role: "Tech Organizer / Developer",
      location: "MVSR Engineering College",
      start: "Jan 2025",
      end: "Nov 2025",
      bullets: [
        "Designed event website flows (Hackathon + Mock Interviews) with modern UI and responsive layouts.",
        "Coordinated mentors/interviewers outreach and ensured smooth participant onboarding process.",
      ],
    },
  ],
  projects: [
    {
      name: "CodeSync — CP + Career Suite",
      link: "https://github.com/DhruvReddyS/codesync",
      tech: "React, Node, Firebase, Tailwind",
      description:
        "A unified platform that tracks coding profiles, computes a fair score, shows leaderboards, and offers AI tools.",
      bullets: [
        "Built ATS Analyzer + Resume Builder + Job Suggestions with clean UI and animated dashboards.",
        "Created a scoring engine using log-scale normalization for fairness across platforms.",
      ],
    },
    {
      name: "SnapFix — Civic Issue Reporting",
      link: "https://github.com/DhruvReddyS/snapfix",
      tech: "React Native, Node, Python",
      description:
        "Geo-tagged civic issue reporting with clustering + severity scoring for faster resolution workflows.",
      bullets: [
        "Added geohash-based clustering to group duplicate issues and prioritize based on severity.",
        "Integrated automated status updates and role-based dashboards for citizens and admins.",
      ],
    },
  ],
  education: [
    {
      school: "MVSR Engineering College",
      degree: "B.Tech",
      field: "CSIT",
      location: "Hyderabad",
      start: "2023",
      end: "2027",
      score: "CGPA: 8.7",
    },
    {
      school: "IIT Madras",
      degree: "BS (Online)",
      field: "Data Science",
      location: "Remote",
      start: "2024",
      end: "Present",
      score: "In Progress",
    },
  ],
  achievements: [
    "Solved 700+ DSA problems across platforms; consistent contest participation.",
    "Finalist/participant in multiple hackathons; built production-grade prototypes.",
    "Led TechFest initiatives and contributed to organizing large student events.",
  ],
  certifications: [
    {
      name: "AWS Cloud Practitioner (Foundational)",
      issuer: "AWS",
      year: "2025",
      link: "https://www.credly.com/",
    },
    {
      name: "Google UX Design Basics",
      issuer: "Coursera",
      year: "2024",
      link: "https://coursera.org/",
    },
  ],
  extracurricular: [
    "TechFest Core Team — Hackathon + Interview event planning & execution.",
    "Mentored juniors for DSA roadmap + project guidance.",
  ],
};

const ACCENTS = [
  "#7C3AED",
  "#3B82F6",
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#E11D48",
  "#A855F7",
];

function safeFileName(name: string) {
  const base = (name || "Resume").trim() || "Resume";
  return base.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_");
}
function uniq(list: string[]) {
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
}
function chipsToText(chips: string[]) {
  return chips.join(", ");
}
function textToChips(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function anySkills(r: ResumeForm) {
  return (
    r.skills.languages.length ||
    r.skills.frameworks.length ||
    r.skills.tools.length ||
    r.skills.concepts.length
  );
}

/* ---------------------------------------------
 * ATS Bridge: resume JSON -> readable plain text
 * --------------------------------------------*/
function resumeToPlainText(r: ResumeForm, badges?: SkillBadge[]) {
  const lines: string[] = [];
  const add = (s?: string) => {
    const v = (s ?? "").toString().trim();
    if (v) lines.push(v);
  };

  add(r.fullName);
  add(r.title);
  add([r.email, r.phone, r.location].filter(Boolean).join(" | "));
  (r.links || [])
    .filter((l) => l?.url?.trim())
    .forEach((l) => add(`${l.label}: ${l.url}`));

  if (badges && badges.length) {
    add("");
    add("CODE SYNC BADGES");
    badges
      .slice(0, 12)
      .forEach((b) =>
        add(`- ${b.label} (${b.level})${b.meta ? ` · ${b.meta}` : ""}`)
      );
  }

  add("");
  if (r.summary.trim()) {
    add("SUMMARY");
    add(r.summary);
    add("");
  }

  add("SKILLS");
  const s = r.skills || ({} as any);
  if (s.languages?.length) add(`Languages: ${s.languages.join(", ")}`);
  if (s.frameworks?.length) add(`Frameworks: ${s.frameworks.join(", ")}`);
  if (s.tools?.length) add(`Tools: ${s.tools.join(", ")}`);
  if (s.concepts?.length) add(`Concepts: ${s.concepts.join(", ")}`);
  add("");

  if (r.experience.length) {
    add("EXPERIENCE");
    r.experience.forEach((e) => {
      add(`${e.role || ""} — ${e.company || ""}`.trim());
      add(
        [e.location, `${e.start || ""} - ${e.end || ""}`.trim()]
          .filter(Boolean)
          .join(" | ")
      );
      (e.bullets || []).filter(Boolean).forEach((b) => add(`- ${b}`));
      add("");
    });
  }

  if (r.projects.length) {
    add("PROJECTS");
    r.projects.forEach((p) => {
      add(p.name);
      add([p.tech, p.link].filter(Boolean).join(" | "));
      if (p.description) add(p.description);
      (p.bullets || []).filter(Boolean).forEach((b) => add(`- ${b}`));
      add("");
    });
  }

  if (r.education.length) {
    add("EDUCATION");
    r.education.forEach((ed) => {
      add(`${ed.degree || ""}${ed.field ? `, ${ed.field}` : ""}`.trim());
      add([ed.school, ed.location, ed.score].filter(Boolean).join(" | "));
      add(`${ed.start || ""} - ${ed.end || ""}`.trim());
      add("");
    });
  }

  if (r.achievements.length) {
    add("ACHIEVEMENTS");
    r.achievements.filter(Boolean).forEach((a) => add(`- ${a}`));
    add("");
  }

  if (r.certifications.length) {
    add("CERTIFICATIONS");
    r.certifications.forEach((c) => {
      add(
        `${c.name || ""}${c.issuer ? ` — ${c.issuer}` : ""}${
          c.year ? ` (${c.year})` : ""
        }`.trim()
      );
      if (c.link) add(c.link);
    });
    add("");
  }

  if (r.extracurricular.length) {
    add("LEADERSHIP / EXTRA");
    r.extracurricular.filter(Boolean).forEach((x) => add(`- ${x}`));
    add("");
  }

  return lines.join("\n").trim();
}

/* ---------------------------------------------
 * Small UI
 * --------------------------------------------*/
function PanelTitle({
  icon,
  title,
  hint,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="text-white/75">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          {hint ? <div className="text-xs text-white/45">{hint}</div> : null}
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-white/70">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-white/70">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
      />
    </label>
  );
}

function ChipEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (chips: string[]) => void;
  placeholder?: string;
}) {
  const text = useMemo(() => chipsToText(value), [value]);
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-white/70">{label}</div>
      <input
        value={text}
        onChange={(e) => onChange(textToChips(e.target.value))}
        placeholder={placeholder || "Comma separated"}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {value.slice(0, 12).map((c, idx) => (
          <span
            key={`${c}-${idx}`}
            className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85"
          >
            {c}
          </span>
        ))}
        {value.length > 12 ? (
          <span className="text-[11px] text-white/45">
            +{value.length - 12} more
          </span>
        ) : null}
      </div>
    </label>
  );
}

function GlowButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:opacity-95"
      : variant === "danger"
      ? "border border-rose-400/25 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15"
      : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.06]";
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------
 * Templates (FIXED: tighter fonts + line height + spacing)
 * Uses CSS vars injected on A4 stage:
 *  --accent, --fs-base, --fs-sm, --lh, --pad
 * --------------------------------------------*/
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: "var(--accent)" as any }}
    >
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  // keep bullets tight + limit count to reduce overflow
  const list = (items || []).filter(Boolean).slice(0, 4);
  if (!list.length) return null;
  return (
    <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
      {list.map((b, i) => (
        <li key={i} className="my-[1px]">
          {b}
        </li>
      ))}
    </ul>
  );
}

/* --------- TEMPLATE 1: NeoMinimal (tight) --------- */
function NeoMinimal({ r, badges }: { r: ResumeForm; badges: SkillBadge[] }) {
  return (
    <div className="p-[var(--pad)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[26px] font-extrabold tracking-tight text-black">
            {r.fullName || "Your Name"}
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-black/70">
            {r.title || "Your Role / Title"}
          </div>
          <div className="mt-2 text-[10.5px] text-black/60">
            {[r.email, r.phone, r.location].filter(Boolean).join(" • ")}
          </div>
          <div className="mt-0.5 text-[10.5px] text-black/60 break-words">
            {(r.links || [])
              .filter((l) => l.url.trim())
              .slice(0, 3)
              .map((l) => `${l.label}: ${l.url}`)
              .join(" • ")}
          </div>
        </div>

        {badges.length ? (
          <div className="min-w-[190px] rounded-2xl border border-black/10 bg-black/[0.02] p-2.5">
            <SectionLabel>Badges</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 7).map((b, i) => (
                <span
                  key={i}
                  className="rounded-full border border-black/10 bg-white px-2 py-1 text-[9.5px] text-black/75"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-7 space-y-4">
          {r.summary.trim() ? (
            <div>
              <SectionLabel>Summary</SectionLabel>
              <div className="mt-1.5">
                <P>{r.summary}</P>
              </div>
            </div>
          ) : null}

          {r.experience.length ? (
            <div>
              <SectionLabel>Experience</SectionLabel>
              <div className="mt-2 space-y-3.5">
                {r.experience.map((e, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[12px] font-bold text-black">
                        {e.role || "Role"}{" "}
                        <span className="font-semibold text-black/55">
                          — {e.company || "Company"}
                        </span>
                      </div>
                      <div className="text-[10px] text-black/55">
                        {e.start || "Start"} – {e.end || "End"}
                      </div>
                    </div>
                    {e.location ? (
                      <div className="text-[10px] text-black/55">
                        {e.location}
                      </div>
                    ) : null}
                    <BulletList items={e.bullets} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r.projects.length ? (
            <div>
              <SectionLabel>Projects</SectionLabel>
              <div className="mt-2 space-y-3.5">
                {r.projects.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[12px] font-bold text-black">
                        {p.name || "Project"}
                      </div>
                      <div className="text-[10px] text-black/55">
                        {p.tech || ""}
                      </div>
                    </div>
                    {p.description ? <P>{p.description}</P> : null}
                    <BulletList items={p.bullets} />
                    {p.link ? (
                      <div className="mt-1 text-[10px] text-black/55 break-words">
                        {p.link}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="col-span-5 space-y-4">
          {anySkills(r) ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3">
              <SectionLabel>Skills</SectionLabel>
              <div className="mt-2 space-y-1.5 text-[var(--fs-base)] leading-[var(--lh)] text-black/80">
                {r.skills.languages.length ? (
                  <div>Languages: {r.skills.languages.join(", ")}</div>
                ) : null}
                {r.skills.frameworks.length ? (
                  <div>Frameworks: {r.skills.frameworks.join(", ")}</div>
                ) : null}
                {r.skills.tools.length ? (
                  <div>Tools: {r.skills.tools.join(", ")}</div>
                ) : null}
                {r.skills.concepts.length ? (
                  <div>Concepts: {r.skills.concepts.join(", ")}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {r.education.length ? (
            <div>
              <SectionLabel>Education</SectionLabel>
              <div className="mt-2 space-y-2.5">
                {r.education.map((ed, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-black/10 bg-white p-2.5"
                  >
                    <div className="text-[12px] font-bold text-black">
                      {ed.degree || "Degree"}
                      {ed.field ? `, ${ed.field}` : ""}
                    </div>
                    <div className="text-[11px] text-black/70">
                      {ed.school || "School"}
                    </div>
                    <div className="mt-0.5 text-[10px] text-black/55">
                      {ed.start || "Start"} – {ed.end || "End"}
                      {ed.score ? ` • ${ed.score}` : ""}
                      {ed.location ? ` • ${ed.location}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r.achievements.length ? (
            <div>
              <SectionLabel>Achievements</SectionLabel>
              <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
                {r.achievements
                  .filter(Boolean)
                  .slice(0, 6)
                  .map((a, i) => (
                    <li key={i} className="my-[1px]">
                      {a}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {r.certifications.length ? (
            <div>
              <SectionLabel>Certifications</SectionLabel>
              <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
                {r.certifications.slice(0, 5).map((c, i) => (
                  <li key={i} className="my-[1px]">
                    {c.name}
                    {c.issuer ? ` — ${c.issuer}` : ""}
                    {c.year ? ` (${c.year})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* --------- TEMPLATE 2: TechCard (tight) --------- */
function TechCard({ r, badges }: { r: ResumeForm; badges: SkillBadge[] }) {
  return (
    <div className="p-[var(--pad)]">
      <div className="rounded-3xl border border-black/10 bg-white p-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[24px] font-extrabold tracking-tight text-black">
              {r.fullName || "Your Name"}
            </div>
            <div className="mt-0.5 text-[12px] font-semibold text-black/65">
              {r.title || "Your Role / Title"}
            </div>
            <div className="mt-2 text-[10.5px] text-black/60">
              {[r.email, r.phone, r.location].filter(Boolean).join(" • ")}
            </div>
          </div>

          <div className="text-right text-[10px] text-black/60 break-words max-w-[330px]">
            {(r.links || [])
              .filter((l) => l.url.trim())
              .slice(0, 3)
              .map((l, i) => (
                <div key={i}>
                  <span className="font-semibold">{l.label}:</span> {l.url}
                </div>
              ))}
          </div>
        </div>

        {badges.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.slice(0, 9).map((b, i) => (
              <span
                key={i}
                className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1 text-[9.8px] text-black/70"
              >
                {b.label}
                <span className="text-black/40"> · {b.level}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-7 space-y-4">
          {r.summary.trim() ? (
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
              <SectionLabel>Summary</SectionLabel>
              <div className="mt-1.5">
                <P>{r.summary}</P>
              </div>
            </div>
          ) : null}

          {r.experience.length ? (
            <div className="space-y-3">
              <SectionLabel>Experience</SectionLabel>
              {r.experience.map((e, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-black/10 bg-white p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[12px] font-bold text-black">
                      {e.role || "Role"}{" "}
                      <span className="text-black/55">
                        · {e.company || "Company"}
                      </span>
                    </div>
                    <div className="text-[10px] text-black/55">
                      {e.start || "Start"} – {e.end || "End"}
                    </div>
                  </div>
                  {e.location ? (
                    <div className="text-[10px] text-black/55">
                      {e.location}
                    </div>
                  ) : null}
                  <BulletList items={e.bullets} />
                </div>
              ))}
            </div>
          ) : null}

          {r.projects.length ? (
            <div className="space-y-3">
              <SectionLabel>Projects</SectionLabel>
              {r.projects.map((p, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-black/10 bg-white p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[12px] font-bold text-black">
                      {p.name || "Project"}
                    </div>
                    <div className="text-[10px] text-black/55">{p.tech || ""}</div>
                  </div>
                  {p.description ? <P>{p.description}</P> : null}
                  <BulletList items={p.bullets} />
                  {p.link ? (
                    <div className="mt-1 text-[10px] text-black/55 break-words">
                      {p.link}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-5 space-y-3.5">
          {anySkills(r) ? (
            <div className="rounded-3xl border border-black/10 bg-white p-4">
              <SectionLabel>Skills</SectionLabel>
              <div className="mt-2 space-y-1.5 text-[var(--fs-base)] leading-[var(--lh)] text-black/80">
                {r.skills.languages.length ? (
                  <div>Languages: {r.skills.languages.join(", ")}</div>
                ) : null}
                {r.skills.frameworks.length ? (
                  <div>Frameworks: {r.skills.frameworks.join(", ")}</div>
                ) : null}
                {r.skills.tools.length ? (
                  <div>Tools: {r.skills.tools.join(", ")}</div>
                ) : null}
                {r.skills.concepts.length ? (
                  <div>Concepts: {r.skills.concepts.join(", ")}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {r.education.length ? (
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
              <SectionLabel>Education</SectionLabel>
              <div className="mt-2 space-y-2.5">
                {r.education.map((ed, i) => (
                  <div key={i}>
                    <div className="text-[12px] font-bold text-black">
                      {ed.degree || "Degree"}
                      {ed.field ? `, ${ed.field}` : ""}
                    </div>
                    <div className="text-[11px] text-black/70">
                      {ed.school || "School"}
                    </div>
                    <div className="mt-0.5 text-[10px] text-black/55">
                      {ed.start || "Start"} – {ed.end || "End"}
                      {ed.score ? ` • ${ed.score}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r.achievements.length ? (
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
              <SectionLabel>Achievements</SectionLabel>
              <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
                {r.achievements
                  .filter(Boolean)
                  .slice(0, 6)
                  .map((a, i) => (
                    <li key={i} className="my-[1px]">
                      {a}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {r.certifications.length ? (
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
              <SectionLabel>Certifications</SectionLabel>
              <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
                {r.certifications.slice(0, 5).map((c, i) => (
                  <li key={i} className="my-[1px]">
                    {c.name}
                    {c.issuer ? ` — ${c.issuer}` : ""}
                    {c.year ? ` (${c.year})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {r.extracurricular.length ? (
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-4">
              <SectionLabel>Leadership / Extra</SectionLabel>
              <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
                {r.extracurricular
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((x, i) => (
                    <li key={i} className="my-[1px]">
                      {x}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* --------- TEMPLATE 3: SplitAccent (tight) --------- */
function SplitAccent({ r, badges }: { r: ResumeForm; badges: SkillBadge[] }) {
  return (
    <div className="grid min-h-full grid-cols-12">
      <div
        className="col-span-4 p-6 text-white"
        style={{
          background:
            "linear-gradient(180deg, var(--accent), rgba(0,0,0,0.78))",
        }}
      >
        <div className="text-[20px] font-extrabold leading-tight">
          {r.fullName || "Your Name"}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold text-white/90">
          {r.title || "Your Role / Title"}
        </div>

        <div className="mt-4 space-y-1.5 text-[10px] text-white/90">
          {r.email ? <div className="break-words">{r.email}</div> : null}
          {r.phone ? <div className="break-words">{r.phone}</div> : null}
          {r.location ? <div className="break-words">{r.location}</div> : null}
        </div>

        {(r.links || []).filter((l) => l.url.trim()).length ? (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              Links
            </div>
            <div className="mt-2 space-y-1.5 text-[10px] text-white/90 break-words">
              {(r.links || [])
                .filter((l) => l.url.trim())
                .slice(0, 4)
                .map((l, i) => (
                  <div key={i}>
                    <div className="text-white/70">{l.label}</div>
                    <div>{l.url}</div>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {anySkills(r) ? (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              Skills
            </div>
            <div className="mt-2 space-y-1.5 text-[10.5px] text-white/90 leading-[1.25]">
              {r.skills.languages.length ? (
                <div>
                  <span className="text-white/70">Languages:</span>{" "}
                  {r.skills.languages.join(", ")}
                </div>
              ) : null}
              {r.skills.frameworks.length ? (
                <div>
                  <span className="text-white/70">Frameworks:</span>{" "}
                  {r.skills.frameworks.join(", ")}
                </div>
              ) : null}
              {r.skills.tools.length ? (
                <div>
                  <span className="text-white/70">Tools:</span>{" "}
                  {r.skills.tools.join(", ")}
                </div>
              ) : null}
              {r.skills.concepts.length ? (
                <div>
                  <span className="text-white/70">Concepts:</span>{" "}
                  {r.skills.concepts.join(", ")}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {badges.length ? (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              Badges
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 8).map((b, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/10 px-2 py-1 text-[9.5px]"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="col-span-8 p-6">
        {r.summary.trim() ? (
          <div>
            <SectionLabel>Summary</SectionLabel>
            <div className="mt-1.5">
              <P>{r.summary}</P>
            </div>
          </div>
        ) : null}

        {r.experience.length ? (
          <div className="mt-5">
            <SectionLabel>Experience</SectionLabel>
            <div className="mt-2 space-y-3.5">
              {r.experience.map((e, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[12px] font-bold text-black">
                      {e.role || "Role"}{" "}
                      <span className="text-black/55">— {e.company || "Company"}</span>
                    </div>
                    <div className="text-[10px] text-black/55">
                      {e.start || "Start"} – {e.end || "End"}
                    </div>
                  </div>
                  {e.location ? (
                    <div className="text-[10px] text-black/55">
                      {e.location}
                    </div>
                  ) : null}
                  <BulletList items={e.bullets} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {r.projects.length ? (
          <div className="mt-5">
            <SectionLabel>Projects</SectionLabel>
            <div className="mt-2 space-y-3.5">
              {r.projects.map((p, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[12px] font-bold text-black">
                      {p.name || "Project"}
                    </div>
                    <div className="text-[10px] text-black/55">{p.tech || ""}</div>
                  </div>
                  {p.description ? <P>{p.description}</P> : null}
                  <BulletList items={p.bullets} />
                  {p.link ? (
                    <div className="mt-1 text-[10px] text-black/55 break-words">
                      {p.link}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {r.education.length ? (
          <div className="mt-5">
            <SectionLabel>Education</SectionLabel>
            <div className="mt-2 space-y-2.5">
              {r.education.map((ed, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] p-3"
                >
                  <div className="text-[12px] font-bold text-black">
                    {ed.degree || "Degree"}
                    {ed.field ? `, ${ed.field}` : ""}
                  </div>
                  <div className="text-[11px] text-black/70">
                    {ed.school || "School"}
                  </div>
                  <div className="mt-0.5 text-[10px] text-black/55">
                    {ed.start || "Start"} – {ed.end || "End"}
                    {ed.score ? ` • ${ed.score}` : ""}
                    {ed.location ? ` • ${ed.location}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {r.achievements.length ? (
          <div className="mt-5">
            <SectionLabel>Achievements</SectionLabel>
            <ul className="mt-1 list-disc pl-4 text-[var(--fs-base)] leading-[var(--lh)] text-black/85">
              {r.achievements
                .filter(Boolean)
                .slice(0, 6)
                .map((a, i) => (
                  <li key={i} className="my-[1px]">
                    {a}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* --------- TEMPLATE 4: TimelinePro (tight) --------- */
function TimelinePro({ r, badges }: { r: ResumeForm; badges: SkillBadge[] }) {
  // reuse TechCard for stability + fitting
  return <TechCard r={r} badges={badges} />;
}

/* ---------------------------------------------
 * Template selector chip
 * --------------------------------------------*/
function TemplateChip({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-left transition",
        active
          ? "border-white/25 bg-white/[0.08]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-white/55">{desc}</div>
    </button>
  );
}

/* ---------------------------------------------
 * Editors
 * --------------------------------------------*/
function ExperienceEditor({
  form,
  setForm,
  onRewrite,
  rewritingIndex,
}: {
  form: ResumeForm;
  setForm: React.Dispatch<React.SetStateAction<ResumeForm>>;
  onRewrite: (idx: number) => void;
  rewritingIndex: number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <PanelTitle
        icon={<RiBriefcase4Line />}
        title="Experience"
        hint="Internships / roles"
      />
      <div className="mt-3 space-y-3">
        {form.experience.map((e, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-white/80">
                Role #{idx + 1}
              </div>
              <div className="flex gap-2">
                <GlowButton
                  variant="ghost"
                  className="text-xs px-3 py-2"
                  disabled={rewritingIndex === idx}
                  onClick={() => onRewrite(idx)}
                >
                  <RiRobot2Line />
                  {rewritingIndex === idx ? "Rewriting..." : "Rewrite bullets"}
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  className="text-xs px-3 py-2"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      experience: p.experience.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <RiDeleteBin6Line /> Remove
                </GlowButton>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextInput
                label="Company"
                value={e.company}
                onChange={(v) =>
                  setForm((p) => {
                    const exp = [...p.experience];
                    exp[idx] = { ...exp[idx], company: v };
                    return { ...p, experience: exp };
                  })
                }
                placeholder="Google / Startup / Club"
              />
              <TextInput
                label="Role"
                value={e.role}
                onChange={(v) =>
                  setForm((p) => {
                    const exp = [...p.experience];
                    exp[idx] = { ...exp[idx], role: v };
                    return { ...p, experience: exp };
                  })
                }
                placeholder="SDE Intern"
              />
              <TextInput
                label="Start"
                value={e.start}
                onChange={(v) =>
                  setForm((p) => {
                    const exp = [...p.experience];
                    exp[idx] = { ...exp[idx], start: v };
                    return { ...p, experience: exp };
                  })
                }
                placeholder="May 2025"
              />
              <TextInput
                label="End"
                value={e.end}
                onChange={(v) =>
                  setForm((p) => {
                    const exp = [...p.experience];
                    exp[idx] = { ...exp[idx], end: v };
                    return { ...p, experience: exp };
                  })
                }
                placeholder="Aug 2025 / Present"
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Location (optional)"
                  value={e.location || ""}
                  onChange={(v) =>
                    setForm((p) => {
                      const exp = [...p.experience];
                      exp[idx] = { ...exp[idx], location: v };
                      return { ...p, experience: exp };
                    })
                  }
                  placeholder="Hyderabad / Remote"
                />
              </div>
            </div>

            <div className="mt-3">
              <TextArea
                label="Bullets (one per line)"
                value={(e.bullets || []).join("\n")}
                onChange={(v) =>
                  setForm((p) => {
                    const exp = [...p.experience];
                    exp[idx] = {
                      ...exp[idx],
                      bullets: v
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    };
                    return { ...p, experience: exp };
                  })
                }
                placeholder={`Built X feature...\nImproved Y by Z%...\nUsed React/Node/Firebase...`}
                rows={4}
              />
            </div>
          </div>
        ))}

        <GlowButton
          variant="ghost"
          className="w-full py-3"
          onClick={() =>
            setForm((p) => ({
              ...p,
              experience: [
                ...p.experience,
                { company: "", role: "", location: "", start: "", end: "", bullets: [] },
              ],
            }))
          }
        >
          <RiAddLine /> Add Experience
        </GlowButton>
      </div>
    </div>
  );
}

function ProjectsEditor({
  form,
  setForm,
  onRewrite,
  rewritingIndex,
}: {
  form: ResumeForm;
  setForm: React.Dispatch<React.SetStateAction<ResumeForm>>;
  onRewrite: (idx: number) => void;
  rewritingIndex: number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <PanelTitle icon={<RiCodeBoxLine />} title="Projects" hint="Best 2–4 only" />
      <div className="mt-3 space-y-3">
        {form.projects.map((p, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-white/80">
                Project #{idx + 1}
              </div>
              <div className="flex gap-2">
                <GlowButton
                  variant="ghost"
                  className="text-xs px-3 py-2"
                  disabled={rewritingIndex === idx}
                  onClick={() => onRewrite(idx)}
                >
                  <RiRobot2Line />
                  {rewritingIndex === idx ? "Rewriting..." : "Rewrite bullets"}
                </GlowButton>
                <GlowButton
                  variant="ghost"
                  className="text-xs px-3 py-2"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      projects: prev.projects.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <RiDeleteBin6Line /> Remove
                </GlowButton>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextInput
                label="Name"
                value={p.name}
                onChange={(v) =>
                  setForm((prev) => {
                    const projects = [...prev.projects];
                    projects[idx] = { ...projects[idx], name: v };
                    return { ...prev, projects };
                  })
                }
                placeholder="CodeSync"
              />
              <TextInput
                label="Tech (optional)"
                value={p.tech || ""}
                onChange={(v) =>
                  setForm((prev) => {
                    const projects = [...prev.projects];
                    projects[idx] = { ...projects[idx], tech: v };
                    return { ...prev, projects };
                  })
                }
                placeholder="React, Node, Firebase"
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Link (optional)"
                  value={p.link || ""}
                  onChange={(v) =>
                    setForm((prev) => {
                      const projects = [...prev.projects];
                      projects[idx] = { ...projects[idx], link: v };
                      return { ...prev, projects };
                    })
                  }
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="md:col-span-2">
                <TextArea
                  label="Short Description"
                  value={p.description}
                  onChange={(v) =>
                    setForm((prev) => {
                      const projects = [...prev.projects];
                      projects[idx] = { ...projects[idx], description: v };
                      return { ...prev, projects };
                    })
                  }
                  placeholder="Unified CP + Career platform with scoring, leaderboards and AI tools."
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <TextArea
                  label="Bullets (one per line)"
                  value={(p.bullets || []).join("\n")}
                  onChange={(v) =>
                    setForm((prev) => {
                      const projects = [...prev.projects];
                      projects[idx] = {
                        ...projects[idx],
                        bullets: v
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      };
                      return { ...prev, projects };
                    })
                  }
                  placeholder={`Built X...\nIntegrated Y...\nReduced Z...`}
                  rows={4}
                />
              </div>
            </div>
          </div>
        ))}

        <GlowButton
          variant="ghost"
          className="w-full py-3"
          onClick={() =>
            setForm((p) => ({
              ...p,
              projects: [
                ...p.projects,
                { name: "", link: "", description: "", bullets: [], tech: "" },
              ],
            }))
          }
        >
          <RiAddLine /> Add Project
        </GlowButton>
      </div>
    </div>
  );
}

function EducationEditor({
  form,
  setForm,
}: {
  form: ResumeForm;
  setForm: React.Dispatch<React.SetStateAction<ResumeForm>>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <PanelTitle
        icon={<RiGraduationCapLine />}
        title="Education"
        hint="College + any relevant schooling"
      />
      <div className="mt-3 space-y-3">
        {form.education.map((ed, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/80">
                Education #{idx + 1}
              </div>
              <GlowButton
                variant="ghost"
                className="text-xs px-3 py-2"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    education: p.education.filter((_, i) => i !== idx),
                  }))
                }
              >
                <RiDeleteBin6Line /> Remove
              </GlowButton>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextInput
                label="School / College"
                value={ed.school}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], school: v };
                    return { ...p, education };
                  })
                }
                placeholder="MVSR Engineering College"
              />
              <TextInput
                label="Degree"
                value={ed.degree}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], degree: v };
                    return { ...p, education };
                  })
                }
                placeholder="B.Tech"
              />
              <TextInput
                label="Field (optional)"
                value={ed.field || ""}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], field: v };
                    return { ...p, education };
                  })
                }
                placeholder="CSE / CSIT"
              />
              <TextInput
                label="Score (optional)"
                value={ed.score || ""}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], score: v };
                    return { ...p, education };
                  })
                }
                placeholder="CGPA: 8.7"
              />
              <TextInput
                label="Start"
                value={ed.start}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], start: v };
                    return { ...p, education };
                  })
                }
                placeholder="2023"
              />
              <TextInput
                label="End"
                value={ed.end}
                onChange={(v) =>
                  setForm((p) => {
                    const education = [...p.education];
                    education[idx] = { ...education[idx], end: v };
                    return { ...p, education };
                  })
                }
                placeholder="2027"
              />
              <div className="md:col-span-2">
                <TextInput
                  label="Location (optional)"
                  value={ed.location || ""}
                  onChange={(v) =>
                    setForm((p) => {
                      const education = [...p.education];
                      education[idx] = { ...education[idx], location: v };
                      return { ...p, education };
                    })
                  }
                  placeholder="Hyderabad"
                />
              </div>
            </div>
          </div>
        ))}

        <GlowButton
          variant="ghost"
          className="w-full py-3"
          onClick={() =>
            setForm((p) => ({
              ...p,
              education: [
                ...p.education,
                { school: "", degree: "", field: "", location: "", start: "", end: "", score: "" },
              ],
            }))
          }
        >
          <RiAddLine /> Add Education
        </GlowButton>
      </div>
    </div>
  );
}

function CertificationsEditor({
  form,
  setForm,
}: {
  form: ResumeForm;
  setForm: React.Dispatch<React.SetStateAction<ResumeForm>>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <PanelTitle title="Certifications" hint="Optional but strong" />
      <div className="mt-3 space-y-3">
        {form.certifications.map((c, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/80">
                Certification #{idx + 1}
              </div>
              <GlowButton
                variant="ghost"
                className="text-xs px-3 py-2"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    certifications: p.certifications.filter((_, i) => i !== idx),
                  }))
                }
              >
                <RiDeleteBin6Line /> Remove
              </GlowButton>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextInput
                label="Name"
                value={c.name}
                onChange={(v) =>
                  setForm((p) => {
                    const certifications = [...p.certifications];
                    certifications[idx] = { ...certifications[idx], name: v };
                    return { ...p, certifications };
                  })
                }
                placeholder="AWS Cloud Practitioner"
              />
              <TextInput
                label="Issuer (optional)"
                value={c.issuer || ""}
                onChange={(v) =>
                  setForm((p) => {
                    const certifications = [...p.certifications];
                    certifications[idx] = { ...certifications[idx], issuer: v };
                    return { ...p, certifications };
                  })
                }
                placeholder="AWS / Coursera / Google"
              />
              <TextInput
                label="Year (optional)"
                value={c.year || ""}
                onChange={(v) =>
                  setForm((p) => {
                    const certifications = [...p.certifications];
                    certifications[idx] = { ...certifications[idx], year: v };
                    return { ...p, certifications };
                  })
                }
                placeholder="2025"
              />
              <TextInput
                label="Link (optional)"
                value={c.link || ""}
                onChange={(v) =>
                  setForm((p) => {
                    const certifications = [...p.certifications];
                    certifications[idx] = { ...certifications[idx], link: v };
                    return { ...p, certifications };
                  })
                }
                placeholder="https://..."
              />
            </div>
          </div>
        ))}

        <GlowButton
          variant="ghost"
          className="w-full py-3"
          onClick={() =>
            setForm((p) => ({
              ...p,
              certifications: [...p.certifications, { name: "", issuer: "", year: "", link: "" }],
            }))
          }
        >
          <RiAddLine /> Add Certification
        </GlowButton>
      </div>
    </div>
  );
}

function SimpleListEditor({
  title,
  icon,
  hint,
  items,
  onChange,
  addLabel,
}: {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <PanelTitle icon={icon} title={title} hint={hint} />
      <div className="mt-3 space-y-2">
        {items.map((v, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                onChange(next);
              }}
              placeholder="Type here…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <GlowButton
              variant="ghost"
              className="px-3"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <RiDeleteBin6Line />
            </GlowButton>
          </div>
        ))}

        <GlowButton
          variant="ghost"
          className="w-full py-3"
          onClick={() => onChange([...items, ""])}
        >
          <RiAddLine /> {addLabel}
        </GlowButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------
 * Main Page (FIXED: true A4 stage + auto fit scale)
 * --------------------------------------------*/
export default function ResumeBuilderPage() {
  const navigate = useNavigate();

  // outer A4 canvas
  const previewOuterRef = useRef<HTMLDivElement | null>(null);
  // inner content (measured)
  const previewInnerRef = useRef<HTMLDivElement | null>(null);

  const [template, setTemplate] = useState<TemplateId>("tech-card");
  const [accent, setAccent] = useState<string>("#7C3AED");
  const [form, setForm] = useState<ResumeForm>(emptyForm);

  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>([]);

  // Job tailoring inputs
  const [targetRole, setTargetRole] = useState("");
  const [jobDesc, setJobDesc] = useState("");

  // Global status
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Per-item rewrite loading
  const [rewriteExpIdx, setRewriteExpIdx] = useState<number | null>(null);
  const [rewriteProjIdx, setRewriteProjIdx] = useState<number | null>(null);

  // ⭐ auto-fit
  const [fitToPage, setFitToPage] = useState(true);
  const [fitScale, setFitScale] = useState(1);

  // (Optional) restore last state (safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs_resume_builder_form");
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("cs_resume_builder_form", JSON.stringify(form));
    } catch {}
  }, [form]);

  const TemplateView = useMemo(() => {
    const props = { r: form, badges: skillBadges };
    if (template === "neo-minimal") return <NeoMinimal {...props} />;
    if (template === "tech-card") return <TechCard {...props} />;
    if (template === "split-accent") return <SplitAccent {...props} />;
    return <TimelinePro {...props} />;
  }, [template, form, skillBadges]);

  function setToastMsg(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function update<K extends keyof ResumeForm>(key: K, value: ResumeForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function updateSkills<K extends keyof ResumeForm["skills"]>(
    key: K,
    value: ResumeForm["skills"][K]
  ) {
    setForm((p) => ({ ...p, skills: { ...p.skills, [key]: value } }));
  }

  /* --------------------------
   * AUTO FIT (prevents cutting in preview + export)
   * -------------------------- */
  const recalcFit = () => {
    if (!fitToPage) {
      setFitScale(1);
      return;
    }
    const inner = previewInnerRef.current;
    if (!inner) return;

    const contentH = inner.scrollHeight || A4_H;
    const contentW = inner.scrollWidth || A4_W;

    const scaleH = A4_H / contentH;
    const scaleW = A4_W / contentW;

    // Never scale up. Clamp to avoid unreadable
    const s = Math.min(1, scaleH, scaleW);
    const clamped = Math.max(0.72, Math.min(1, s));
    setFitScale(clamped);
  };

  useLayoutEffect(() => {
    recalcFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, form, skillBadges, fitToPage, accent]);

  useEffect(() => {
    if (!fitToPage) return;
    const onResize = () => recalcFit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToPage]);

  /* --------------------------
   * API Actions
   * -------------------------- */
  async function importBadgesFromCodeSync() {
    setErr(null);
    setBusy(true);
    try {
      const { data } = await apiClient.get<BadgesResponse>(
        "/career/resume-builder/skill-badges"
      );

      if (!data?.ok) throw new Error(data?.message || "Badge import failed");
      const badges = data.badges || [];
      setSkillBadges(badges);

      // merge suggested tools/concepts into skills chips
      setForm((p) => ({
        ...p,
        skills: {
          ...p.skills,
          tools: uniq([
            ...(p.skills.tools || []),
            ...((data.suggestedTools || []) as string[]),
          ]),
          concepts: uniq([
            ...(p.skills.concepts || []),
            ...((data.suggestedConcepts || []) as string[]),
          ]),
        },
      }));

      setToastMsg(`Imported ${badges.length} badges`);
    } catch (e: any) {
      setErr(e?.message || "Failed to import badges");
    } finally {
      setBusy(false);
    }
  }

  async function buildWithAI() {
    setErr(null);
    setBusy(true);
    try {
      const payload = { template, resume: form };
      const { data } = await apiClient.post<AiBuildResponse>(
        "/career/resume-builder/ai-build",
        payload
      );
      if (!data?.ok || !data?.resume)
        throw new Error(data?.message || "AI build failed");
      setForm(data.resume);
      setToastMsg("AI built your resume");
    } catch (e: any) {
      setErr(e?.message || "AI build failed");
    } finally {
      setBusy(false);
    }
  }

  async function tailorToJob() {
    setErr(null);
    setBusy(true);
    try {
      if (!jobDesc.trim()) throw new Error("Paste a Job Description first.");
      const payload = {
        template,
        resume: form,
        targetRole: targetRole.trim(),
        jobDescription: jobDesc.trim(),
      };
      const { data } = await apiClient.post<AiBuildResponse>(
        "/career/resume-builder/tailor",
        payload
      );
      if (!data?.ok || !data?.resume)
        throw new Error(data?.message || "Tailoring failed");
      setForm(data.resume);
      setToastMsg("Tailored to job");
    } catch (e: any) {
      setErr(e?.message || "Tailoring failed");
    } finally {
      setBusy(false);
    }
  }

  async function rewriteExperienceBullets(idx: number) {
    setErr(null);
    setRewriteExpIdx(idx);
    try {
      const item = form.experience[idx];
      const { data } = await apiClient.post<RewriteResponse>(
        "/career/resume-builder/rewrite-bullets",
        {
          section: "experience",
          item,
          targetRole: targetRole.trim(),
          jobDescription: jobDesc.trim(),
        }
      );
      if (!data?.ok || !data?.bullets)
        throw new Error(data?.message || "Rewrite failed");
      setForm((p) => {
        const exp = [...p.experience];
        exp[idx] = { ...exp[idx], bullets: data.bullets || exp[idx].bullets };
        return { ...p, experience: exp };
      });
      setToastMsg("Bullets rewritten");
    } catch (e: any) {
      setErr(e?.message || "Rewrite failed");
    } finally {
      setRewriteExpIdx(null);
    }
  }

  async function rewriteProjectBullets(idx: number) {
    setErr(null);
    setRewriteProjIdx(idx);
    try {
      const item = form.projects[idx];
      const { data } = await apiClient.post<RewriteResponse>(
        "/career/resume-builder/rewrite-bullets",
        {
          section: "projects",
          item,
          targetRole: targetRole.trim(),
          jobDescription: jobDesc.trim(),
        }
      );
      if (!data?.ok || !data?.bullets)
        throw new Error(data?.message || "Rewrite failed");
      setForm((p) => {
        const projects = [...p.projects];
        projects[idx] = {
          ...projects[idx],
          bullets: data.bullets || projects[idx].bullets,
        };
        return { ...p, projects };
      });
      setToastMsg("Bullets rewritten");
    } catch (e: any) {
      setErr(e?.message || "Rewrite failed");
    } finally {
      setRewriteProjIdx(null);
    }
  }

  function goToATS() {
    setErr(null);
    const txt = resumeToPlainText(form, skillBadges);
    localStorage.setItem("cs_resume_text_for_ats", txt);
    localStorage.setItem(
      "cs_resume_builder_state",
      JSON.stringify({ template, accent })
    );
    navigate("/career/ats-analyzer", { state: { resumeText: txt } });
  }

  async function downloadPDF() {
  setErr(null);

  let stage: HTMLDivElement | null = null;

  try {
    const inner = previewInnerRef.current;
    if (!inner) return;

    // Create a hidden A4 stage INSIDE viewport (not off-screen)
    stage = document.createElement("div");
    stage.style.position = "fixed";
    stage.style.left = "0px";
    stage.style.top = "0px";
    stage.style.width = `${A4_W}px`;
    stage.style.height = `${A4_H}px`;
    stage.style.background = "#ffffff";
    stage.style.overflow = "hidden";
    stage.style.zIndex = "999999";
    stage.style.opacity = "0"; // invisible but still renderable
    stage.style.pointerEvents = "none";
    stage.style.boxSizing = "border-box";

    const clone = inner.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_W}px`;
    clone.style.transform = "none";
    clone.style.transformOrigin = "top left";
    clone.style.boxSizing = "border-box";

    stage.appendChild(clone);
    document.body.appendChild(stage);

    // Wait a frame + fonts (important to avoid blank/unstyled capture)
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // @ts-ignore
    if (document.fonts?.ready) {
      // @ts-ignore
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 30));

    // Fit content into single A4
    const contentW = clone.scrollWidth || A4_W;
    const contentH = clone.scrollHeight || A4_H;
    const exportScale = Math.min(1, A4_W / contentW, A4_H / contentH);
    clone.style.transform = `scale(${exportScale})`;

    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const canvas = await html2canvas(stage, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: A4_W,
      height: A4_H,
      windowWidth: A4_W,
      windowHeight: A4_H,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save(`${safeFileName(form.fullName)}_${template}.pdf`);

    setToastMsg("PDF downloaded");
  } catch (e: any) {
    setErr(e?.message || "PDF download failed");
  } finally {
    if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
  }
}

  /* ---------------------------------------------
   * Render
   * --------------------------------------------*/
  return (
    <div className="min-h-screen bg-[#070A10] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
              <RiMagicLine />
              Career Suite · Resume Builder
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              Premium Resume Builder (A4 Fit)
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Auto-fit to A4 · Tighter typography · No cutting · Export PDF clean.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GlowButton
              onClick={() => setForm(sampleResume)}
              variant="ghost"
              title="Load sample data"
            >
              <RiAddLine /> Load Sample
            </GlowButton>

            <GlowButton
              onClick={() => {
                setForm(emptyForm);
                setSkillBadges([]);
              }}
              variant="ghost"
              title="Clear form"
            >
              <RiDeleteBin6Line /> Clear
            </GlowButton>

            <GlowButton onClick={buildWithAI} disabled={busy} variant="primary">
              <RiSparkling2Line />
              {busy ? "Working..." : "Build with AI"}
            </GlowButton>

            <GlowButton
              onClick={goToATS}
              variant="ghost"
              title="Pass resume text into ATS Analyzer"
            >
              <RiShieldCheckLine /> Analyze ATS
            </GlowButton>

            <GlowButton onClick={downloadPDF} variant="ghost">
              <RiDownload2Line /> Download PDF
            </GlowButton>
          </div>
        </div>

        {/* Toast / error */}
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {toast ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
              >
                {toast}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {err ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
              >
                {err}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-5 space-y-4">
            {/* Template + Accent + Fit */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <PanelTitle
                icon={<RiLayout4Line />}
                title="Templates"
                hint="Compact layouts (fit-friendly)"
                right={
                  <button
                    onClick={() => setFitToPage((v) => !v)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      fitToPage
                        ? "border-white/25 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.04]",
                    ].join(" ")}
                    title="Toggle auto-fit"
                  >
                    {fitToPage ? "Fit: ON" : "Fit: OFF"}
                  </button>
                }
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <TemplateChip
                  active={template === "tech-card"}
                  title="Tech Card"
                  desc="Best fit overall"
                  onClick={() => setTemplate("tech-card")}
                />
                <TemplateChip
                  active={template === "neo-minimal"}
                  title="Neo Minimal"
                  desc="Clean, compact"
                  onClick={() => setTemplate("neo-minimal")}
                />
                <TemplateChip
                  active={template === "split-accent"}
                  title="Split Accent"
                  desc="Designer sidebar"
                  onClick={() => setTemplate("split-accent")}
                />
                <TemplateChip
                  active={template === "timeline-pro"}
                  title="Timeline Pro"
                  desc="Compact pro style"
                  onClick={() => setTemplate("timeline-pro")}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <PanelTitle
                  icon={<RiPaintBrushLine />}
                  title="Accent Color"
                  hint="Applies to headers & highlights"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      className="h-9 w-9 rounded-full border border-white/15"
                      style={{
                        backgroundColor: c,
                        outline:
                          accent === c
                            ? "2px solid rgba(255,255,255,.75)"
                            : "none",
                        outlineOffset: 2,
                      }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-xl border border-white/15 bg-transparent"
                    title="Custom"
                  />
                </div>
                <div className="mt-3 text-xs text-white/55">
                  Current fit scale:{" "}
                  <span className="text-white/85">
                    {Math.round(fitScale * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Job tailoring */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <PanelTitle
                icon={<RiRobot2Line />}
                title="Job-Specific Tailoring"
                hint="Paste JD → optimize summary/skills/bullets"
                right={
                  <GlowButton
                    onClick={tailorToJob}
                    disabled={busy}
                    variant="primary"
                  >
                    🎯 Tailor
                  </GlowButton>
                }
              />
              <div className="mt-3 grid grid-cols-1 gap-3">
                <TextInput
                  label="Target Role (optional)"
                  value={targetRole}
                  onChange={setTargetRole}
                  placeholder="Frontend Developer / SDE / ML Engineer…"
                />
                <TextArea
                  label="Job Description"
                  value={jobDesc}
                  onChange={setJobDesc}
                  placeholder="Paste the JD here (skills, responsibilities, requirements...)"
                  rows={6}
                />
              </div>
            </div>

            {/* CodeSync badges */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <PanelTitle
                icon={<RiRefreshLine />}
                title="CodeSync Skill Badges"
                hint="Auto-import from your CP stats"
                right={
                  <GlowButton
                    onClick={importBadgesFromCodeSync}
                    disabled={busy}
                    variant="ghost"
                  >
                    <RiRefreshLine /> Import
                  </GlowButton>
                }
              />
              {skillBadges.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skillBadges.map((b, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] text-white/85"
                    >
                      {b.label}{" "}
                      <span className="text-white/50">· {b.level}</span>
                      {b.meta ? (
                        <span className="text-white/35"> · {b.meta}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-white/50">
                  No badges yet. Click <b>Import</b>.
                </div>
              )}
            </div>

            {/* Form blocks */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
              {/* Header/Contact */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <PanelTitle
                  icon={<RiLinksLine />}
                  title="Header / Contact"
                  hint="Name, title, links"
                />
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <TextInput
                    label="Full Name"
                    value={form.fullName}
                    onChange={(v) => update("fullName", v)}
                    placeholder="Dhruv Reddy S"
                  />
                  <TextInput
                    label="Title"
                    value={form.title}
                    onChange={(v) => update("title", v)}
                    placeholder="Full Stack Developer"
                  />
                  <TextInput
                    label="Email"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                    placeholder="you@email.com"
                    type="email"
                  />
                  <TextInput
                    label="Mobile"
                    value={form.phone}
                    onChange={(v) => update("phone", v)}
                    placeholder="+91 9XXXXXXXXX"
                  />
                  <div className="md:col-span-2">
                    <TextInput
                      label="Location"
                      value={form.location}
                      onChange={(v) => update("location", v)}
                      placeholder="Hyderabad, India"
                    />
                  </div>
                </div>

                {/* Links */}
                <div className="mt-3">
                  <div className="mb-2 text-xs font-medium text-white/70">
                    Links
                  </div>
                  <div className="space-y-2">
                    {form.links.map((l, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                        <input
                          value={l.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            setForm((p) => {
                              const links = [...p.links];
                              links[idx] = { ...links[idx], label };
                              return { ...p, links };
                            });
                          }}
                          placeholder="Label"
                          className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                        />
                        <input
                          value={l.url}
                          onChange={(e) => {
                            const url = e.target.value;
                            setForm((p) => {
                              const links = [...p.links];
                              links[idx] = { ...links[idx], url };
                              return { ...p, links };
                            });
                          }}
                          placeholder="https://..."
                          className="md:col-span-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <GlowButton
                      variant="ghost"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          links: [...p.links, { label: "LeetCode", url: "" }],
                        }))
                      }
                      className="text-xs px-3 py-2"
                    >
                      <RiAddLine /> Add Link
                    </GlowButton>

                    {form.links.length > 1 ? (
                      <GlowButton
                        variant="ghost"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            links: p.links.slice(0, -1),
                          }))
                        }
                        className="text-xs px-3 py-2"
                      >
                        <RiDeleteBin6Line /> Remove Last
                      </GlowButton>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <PanelTitle title="Summary" hint="2–4 lines, role-focused" />
                <div className="mt-3">
                  <TextArea
                    label="Professional Summary"
                    value={form.summary}
                    onChange={(v) => update("summary", v)}
                    placeholder="Role-focused summary (keep it short for fit)..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Skills */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <PanelTitle title="Skills" hint="Comma separated chips" />
                <div className="mt-3 grid grid-cols-1 gap-4">
                  <ChipEditor
                    label="Languages"
                    value={form.skills.languages}
                    onChange={(v) => updateSkills("languages", uniq(v))}
                    placeholder="C, C++, Java, JavaScript, TypeScript"
                  />
                  <ChipEditor
                    label="Frameworks"
                    value={form.skills.frameworks}
                    onChange={(v) => updateSkills("frameworks", uniq(v))}
                    placeholder="React, Node, Express, Flask"
                  />
                  <ChipEditor
                    label="Tools"
                    value={form.skills.tools}
                    onChange={(v) => updateSkills("tools", uniq(v))}
                    placeholder="Git, Docker, Firebase, MongoDB"
                  />
                  <ChipEditor
                    label="Concepts"
                    value={form.skills.concepts}
                    onChange={(v) => updateSkills("concepts", uniq(v))}
                    placeholder="DSA, OOP, System Design, DBMS"
                  />
                </div>
              </div>

              {/* Experience */}
              <ExperienceEditor
                form={form}
                setForm={setForm}
                onRewrite={rewriteExperienceBullets}
                rewritingIndex={rewriteExpIdx}
              />

              {/* Projects */}
              <ProjectsEditor
                form={form}
                setForm={setForm}
                onRewrite={rewriteProjectBullets}
                rewritingIndex={rewriteProjIdx}
              />

              {/* Education */}
              <EducationEditor form={form} setForm={setForm} />

              {/* Achievements */}
              <SimpleListEditor
                title="Achievements"
                icon={<RiTrophyLine />}
                hint="Hackathons, ranks, awards, scholarships..."
                items={form.achievements}
                onChange={(items) => update("achievements", items)}
                addLabel="Add achievement"
              />

              {/* Certifications */}
              <CertificationsEditor form={form} setForm={setForm} />

              {/* Leadership / Extra */}
              <SimpleListEditor
                title="Leadership / Extra"
                icon={<RiBriefcase4Line />}
                hint="Clubs, mentoring, volunteering, leadership..."
                items={form.extracurricular}
                onChange={(items) => update("extracurricular", items)}
                addLabel="Add item"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <PanelTitle
                title="Live Preview (A4)"
                hint="Auto-fit prevents cutting"
                right={
                  <div className="text-xs text-white/50">
                    Scale:{" "}
                    <span className="text-white/85">
                      {Math.round(fitScale * 100)}%
                    </span>
                  </div>
                }
              />

              <div className="mt-4">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white">
                  {/* Busy overlay */}
                  <AnimatePresence>
                    {busy ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 grid place-items-center bg-black/55"
                      >
                        <div className="w-[92%] max-w-md rounded-3xl border border-white/10 bg-[#0B1020] p-4">
                          <div className="flex items-center gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.05,
                                ease: "linear",
                              }}
                              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/[0.04]"
                            >
                              <RiSparkling2Line />
                            </motion.div>
                            <div>
                              <div className="text-sm font-semibold">
                                Working on it…
                              </div>
                              <div className="text-xs text-white/60">
                                AI formatting + bullet polish + structure.
                              </div>
                            </div>
                          </div>
                          <motion.div
                            initial={{ width: "12%" }}
                            animate={{ width: ["12%", "92%"] }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                            className="mt-4 h-2 rounded-full bg-white/20"
                          />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* True A4 stage */}
                  <div
                    ref={previewOuterRef}
                    className="mx-auto bg-white text-black"
                    style={{
                      width: `${A4_W}px`,
                      height: `${A4_H}px`,
                      overflow: "hidden",
                      boxSizing: "border-box",
                      position: "relative",
                      // tight typography vars
                      ["--accent" as any]: accent,
                      ["--fs-base" as any]: "11px",
                      ["--fs-sm" as any]: "10px",
                      ["--lh" as any]: "1.25",
                      ["--pad" as any]: "22px",
                    } as React.CSSProperties}
                  >
                    <div
                      ref={previewInnerRef}
                      style={{
                        width: `${A4_W}px`,
                        transformOrigin: "top left",
                        transform: `scale(${fitScale})`,
                      }}
                    >
                      {TemplateView}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/50">
                  Pro tip: Import badges → Tailor with JD → Rewrite bullets →
                  Download PDF → Analyze ATS.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-white/45">
          CodeSync · Career Suite — Resume Builder
        </div>
      </div>
    </div>
  );
}
