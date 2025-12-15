// src/pages/StudentPublicProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../lib/apiClient";
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiCheckLine,
  RiTimeLine,
  RiInformationLine,
  RiMailLine,
  RiPhoneLine,
  RiBuilding2Line,
  RiHashtag,
  RiGraduationCapLine,
  RiLinksLine,
  RiSparkling2Line,
  RiBookmarkLine,
} from "react-icons/ri";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";

/* ---------------- TYPES ---------------- */

type PlatformKey =
  | "leetcode"
  | "codechef"
  | "hackerrank"
  | "codeforces"
  | "github"
  | "atcoder"
  | "geeksforgeeks";

type CpScores = {
  codeSyncScore?: number | null;
  displayScore?: number | null;
  platformSkills?: Partial<Record<PlatformKey, number>>;
};

type ApiPublicProfileResponse = {
  student: {
    id: string;
    fullName: string | null;
    branch: string | null;
    section: string | null;
    year: string | number | null;
    rollNumber: string | null;
    graduationYear: string | null;
    profile: any;
    cpHandles: Partial<Record<PlatformKey, string | null>>;
    collegeEmail?: string | null;
    personalEmail?: string | null;
    phone?: string | null;
  };
  cpScores: CpScores | null;
  platformStats: Record<string, any | null>;
};

type ApiProfile = {
  id: string;
  fullname: string | null;

  branch: string | null;
  section: string | null;
  year: string | number | null;
  rollNumber: string | null;
  graduationYear: string | null;

  collegeEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;

  cpHandles: Partial<Record<PlatformKey, string | null>>;
  cpScores: CpScores | null;
  platformStats: Record<string, any | null>;
  profile: any;
};

const PLATFORM_META: Record<
  PlatformKey,
  {
    label: string;
    badge: string;
    color: string;
    icon: React.ReactNode;
    baseUrl?: (h: string) => string;
  }
> = {
  leetcode: {
    label: "LeetCode",
    badge: "L",
    color: "#f59e0b",
    icon: <SiLeetcode />,
    baseUrl: (h) => `https://leetcode.com/u/${h}/`,
  },
  codechef: {
    label: "CodeChef",
    badge: "C",
    color: "#7c5f4a",
    icon: <SiCodechef />,
    baseUrl: (h) => `https://www.codechef.com/users/${h}`,
  },
  hackerrank: {
    label: "HackerRank",
    badge: "H",
    color: "#22c55e",
    icon: <SiHackerrank />,
    baseUrl: (h) => `https://www.hackerrank.com/profile/${h}`,
  },
  codeforces: {
    label: "CodeForces",
    badge: "CF",
    color: "#38bdf8",
    icon: <SiCodeforces />,
    baseUrl: (h) => `https://codeforces.com/profile/${h}`,
  },
  github: {
    label: "GitHub",
    badge: "G",
    color: "#94a3b8",
    icon: <SiGithub />,
    baseUrl: (h) => `https://github.com/${h}`,
  },
  geeksforgeeks: {
    label: "Geeks For Geeks",
    badge: "G",
    color: "#16a34a",
    icon: <RiLinksLine />,
    baseUrl: (h) => `https://auth.geeksforgeeks.org/user/${h}/`,
  },
  atcoder: {
    label: "AtCoder",
    badge: "A",
    color: "#6366f1",
    icon: <RiLinksLine />,
    baseUrl: (h) => `https://atcoder.jp/users/${h}`,
  },
};

const PLATFORM_ORDER: PlatformKey[] = [
  "leetcode",
  "codechef",
  "hackerrank",
  "codeforces",
  "github",
  "geeksforgeeks",
  "atcoder",
];

/* ---------------- UTILS ---------------- */

function safeNum(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function formatValue(v: any): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString("en-IN");
  return String(v);
}

function hashToHue(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ---------------- NORMALIZE PORTFOLIO ---------------- */

type PortfolioItem = {
  title?: string;
  name?: string;
  company?: string;
  role?: string;
  description?: string;
  summary?: string;
  stack?: string;
  tech?: string;
  duration?: string;
  time?: string;
  year?: string;
  date?: string;
  issuer?: string;
  provider?: string;
  link?: string;
  url?: string;
  [k: string]: any;
};

function normalizePortfolioItems(v: any, mode: "project" | "internship" | "cert") {
  if (!v) return [] as PortfolioItem[];

  // already array
  if (Array.isArray(v)) return v as PortfolioItem[];

  // object-map from firestore
  if (typeof v === "object") {
    const vals = Object.values(v);
    return (Array.isArray(vals) ? vals : []) as PortfolioItem[];
  }

  // textarea string to list
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    const lines = s
      .split(/\r?\n|;|,/)
      .map((x) => x.trim())
      .filter(Boolean);

    return lines.map((line) => {
      if (mode === "internship") return { company: line, role: "—", description: "—" };
      if (mode === "cert") return { title: line, issuer: "—", description: "—" };
      return { title: line, description: "—", stack: null };
    });
  }

  return [];
}

/* ---------------- DONUT ---------------- */

type DonutSeg = { key: PlatformKey; label: string; value: number; color: string };

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function DonutChart({
  totalLabel,
  totalValue,
  segments,
}: {
  totalLabel: string;
  totalValue: number;
  segments: DonutSeg[];
}) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 118;
  const stroke = 26;

  const [hover, setHover] = useState<{
    seg: DonutSeg;
    x: number;
    y: number;
    pct: number;
  } | null>(null);

  const cleanSegs = segments.map((s) => ({ ...s, value: safeNum(s.value) }));
  const total = Math.max(1, cleanSegs.reduce((a, s) => a + s.value, 0));

  const tooltip = hover
    ? {
        ...hover,
        x: clamp(hover.x, 12, window.innerWidth - 12),
        y: clamp(hover.y, 12, window.innerHeight - 12),
      }
    : null;

  let a = 0;

  return (
    <>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            key="donut-tip"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              left: tooltip.x + 14,
              top: tooltip.y + 14,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            <div className="rounded-2xl border border-white/10 bg-[#050712]/95 backdrop-blur-xl px-4 py-3 shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-sm" style={{ background: tooltip.seg.color }} />
                <p className="text-sm font-semibold text-slate-100">{tooltip.seg.label}</p>
              </div>

              <div className="mt-2 flex items-end gap-2">
                <p className="text-2xl font-bold text-sky-300 tabular-nums">
                  {formatValue(Math.round(tooltip.seg.value))}
                </p>
                <p className="text-xs text-slate-400">({tooltip.pct.toFixed(1)}%)</p>
              </div>

              <p className="mt-1 text-[0.72rem] text-slate-400">Hovered slice value</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-[28px] border border-white/10 bg-[#070816]/55 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="block">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={stroke}
            />

            {cleanSegs
              .filter((s) => s.value > 0)
              .map((s) => {
                const start = a;
                const sweep = (s.value / total) * 360;
                const end = start + sweep;
                a = end;

                const pct = (s.value / total) * 100;

                return (
                  <path
                    key={s.key}
                    d={arcPath(cx, cy, r, start, end)}
                    fill="transparent"
                    stroke={s.color}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    style={{
                      cursor: "pointer",
                      filter: hover?.seg.key === s.key ? "brightness(1.12)" : "none",
                      transition: "filter 120ms ease",
                    }}
                    onMouseEnter={(e) =>
                      setHover({ seg: s, x: e.clientX, y: e.clientY, pct })
                    }
                    onMouseMove={(e) => {
                      setHover((prev) =>
                        prev && prev.seg.key === s.key
                          ? { ...prev, x: e.clientX, y: e.clientY }
                          : prev
                      );
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}

            <circle
              cx={cx}
              cy={cy}
              r={r - stroke / 2 - 26}
              fill="rgba(2,2,10,0.86)"
              stroke="rgba(148,163,184,0.12)"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-4xl font-bold text-sky-300 tabular-nums">
              {formatValue(Math.round(totalValue))}
            </p>
            <p className="mt-1 text-sm text-slate-400">{totalLabel}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-200">
          {cleanSegs.map((s) => (
            <div key={s.key} className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-slate-200">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- PAGE ---------------- */

export default function StudentPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);

  const [metric, setMetric] = useState<"overall" | "solved" | "contests" | "rating">("overall");
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await apiClient.get<ApiPublicProfileResponse>(`/student/profile/${id}`);
        const payload = res.data;

        const normalized: ApiProfile = {
          id: payload.student?.id || id,
          fullname: payload.student?.fullName ?? null,

          branch: payload.student?.branch ?? null,
          section: payload.student?.section ?? null,
          year: payload.student?.year ?? null,
          rollNumber: payload.student?.rollNumber ?? null,
          graduationYear: payload.student?.graduationYear ?? null,

          collegeEmail: payload.student?.collegeEmail ?? null,
          personalEmail: payload.student?.personalEmail ?? null,
          phone: payload.student?.phone ?? null,

          cpHandles: payload.student?.cpHandles ?? {},
          cpScores: payload.cpScores ?? null,
          platformStats: payload.platformStats ?? {},
          profile: payload.student?.profile ?? {},
        };

        setData(normalized);
      } catch (e: any) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const copyText = async (text: string, okMsg = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ msg: okMsg, ok: true });
    } catch {
      setToast({ msg: "Copy failed", ok: false });
    }
  };

  // ✅ IMPORTANT: hooks below must run on every render (no early return before them)
  const profile = data?.profile || {};

  const projects = useMemo(
    () => normalizePortfolioItems(profile?.projects, "project"),
    [data?.id, profile?.projects]
  );
  const internships = useMemo(
    () => normalizePortfolioItems(profile?.internships, "internship"),
    [data?.id, profile?.internships]
  );
  const certifications = useMemo(
    () => normalizePortfolioItems(profile?.certifications ?? profile?.certificates, "cert"),
    [data?.id, profile?.certifications, profile?.certificates]
  );

  useEffect(() => {
    if (!data) return;
    if (projects.length || internships.length || certifications.length) {
      setPortfolioOpen(true);
    }
  }, [data, projects.length, internships.length, certifications.length]);

  // ✅ early returns AFTER all hooks
  if (loading) return <LoadingShell onBack={() => navigate(-1)} />;
  if (!data || err) return <ErrorShell message={err || "Unknown error"} onBack={() => navigate(-1)} />;

  /* ---------------- DERIVED ---------------- */

  const fullname = data.fullname || "Student";
  const hue = hashToHue(data.id || fullname);

  const rawScore = safeNum(data?.cpScores?.displayScore ?? data?.cpScores?.codeSyncScore ?? 0);
  const scoreText = formatValue(Math.round(rawScore));

  const aboutText =
    (typeof profile?.about === "string" ? profile.about.trim() : "") || "No bio added yet.";

  const skills: string[] = Array.isArray(profile?.skills)
    ? profile.skills
    : typeof profile?.skills === "string"
    ? profile.skills.split(/\r?\n|,/).map((x: string) => x.trim()).filter(Boolean)
    : [];

  const interests: string[] = Array.isArray(profile?.interests)
    ? profile.interests
    : typeof profile?.interests === "string"
    ? profile.interests.split(/\r?\n|,/).map((x: string) => x.trim()).filter(Boolean)
    : [];

  const statFor = (p: PlatformKey) => (data.platformStats || {})[p] || null;
  const solvedByPlatform = (p: PlatformKey) => {
    const s = statFor(p);
    return s?.totalSolved ?? s?.problemsSolved ?? s?.problemsSolvedTotal ?? s?.solved ?? null;
  };
  const ratingByPlatform = (p: PlatformKey) => {
    const s = statFor(p);
    return s?.rating ?? s?.contestRating ?? s?.currentRating ?? s?.maxRating ?? null;
  };
  const contestsByPlatform = (p: PlatformKey) => {
    const s = statFor(p);
    return s?.contestsParticipated ?? s?.contests ?? s?.contestCount ?? null;
  };

  const openHandle = (platform: PlatformKey) => {
    const h = ((data?.cpHandles?.[platform] || "") as string).trim();
    const toUrl = PLATFORM_META[platform].baseUrl;
    if (!h || !toUrl) return;
    window.open(toUrl(h), "_blank", "noopener,noreferrer");
  };

  const linkedPlatforms = PLATFORM_ORDER.filter(
    (p) => ((data.cpHandles?.[p] || "") as string).trim().length > 0
  );
  const platformSkills = data?.cpScores?.platformSkills || {};

  const segmentsOverall: DonutSeg[] = PLATFORM_ORDER.map((p) => ({
    key: p,
    label: PLATFORM_META[p].label,
    value: safeNum((platformSkills as any)?.[p] ?? 0),
    color: PLATFORM_META[p].color,
  }));
  const segmentsSolved: DonutSeg[] = PLATFORM_ORDER.map((p) => ({
    key: p,
    label: PLATFORM_META[p].label,
    value: safeNum(solvedByPlatform(p)),
    color: PLATFORM_META[p].color,
  }));
  const segmentsContests: DonutSeg[] = PLATFORM_ORDER.map((p) => ({
    key: p,
    label: PLATFORM_META[p].label,
    value: safeNum(contestsByPlatform(p)),
    color: PLATFORM_META[p].color,
  }));
  const segmentsRating: DonutSeg[] = PLATFORM_ORDER.map((p) => ({
    key: p,
    label: PLATFORM_META[p].label,
    value: safeNum(ratingByPlatform(p)),
    color: PLATFORM_META[p].color,
  }));

  let metricConfig: { totalLabel: string; totalValue: number; segments: DonutSeg[] };
  if (metric === "solved") {
    const total = segmentsSolved.reduce((a, s) => a + safeNum(s.value), 0);
    metricConfig = { totalLabel: "Problems Solved", totalValue: total, segments: segmentsSolved };
  } else if (metric === "contests") {
    const total = segmentsContests.reduce((a, s) => a + safeNum(s.value), 0);
    metricConfig = { totalLabel: "Contests", totalValue: total, segments: segmentsContests };
  } else if (metric === "rating") {
    const total = segmentsRating.reduce((a, s) => a + safeNum(s.value), 0);
    metricConfig = { totalLabel: "Total Rating", totalValue: total, segments: segmentsRating };
  } else {
    const total = segmentsOverall.reduce((a, s) => a + safeNum(s.value), 0);
    metricConfig = { totalLabel: "Total Score", totalValue: total, segments: segmentsOverall };
  }

  const displayEmail = data.collegeEmail || data.personalEmail || "";

  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      <BgPro hue={hue} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            className="fixed z-[90] bottom-6 left-1/2 -translate-x-1/2"
          >
            <div
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs shadow-[0_30px_90px_rgba(0,0,0,0.75)]
              ${toast.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}
            >
              {toast.ok ? <RiCheckLine className="text-emerald-300" /> : <RiTimeLine className="text-rose-300" />}
              <span className="text-slate-200">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative mx-auto max-w-5xl px-5 sm:px-7 lg:px-10 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712]/90 px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
          >
            <RiArrowLeftLine /> Back
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.7rem] text-slate-200 backdrop-blur-xl">
            <RiInformationLine className="text-sky-300" />
            Public Profile
          </div>
        </div>

        {/* CARD 1 */}
        <section className="mt-5">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.70rem] uppercase tracking-[0.30em] text-slate-500">Student</p>
                <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight truncate">{fullname}</h1>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[0.70rem] uppercase tracking-[0.30em] text-slate-500">Overall Score</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-sky-300 tabular-nums">{scoreText}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* CARD 2 + CARD 3 */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr,1.08fr] gap-6">
          {/* CARD 2 */}
          <Card>
            <CardTitle
              title="Profile"
              subtitle="About • details • coding links • skills • interests"
              icon={<RiSparkling2Line className="text-sky-300" />}
            />

            <div className="mt-4">
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">About</p>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{aboutText}</p>
            </div>

            <div className="mt-5 border-t border-white/10" />

            <div className="mt-5">
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">Details</p>
              <div className="mt-3 space-y-2 text-sm">
                <InfoLine icon={<RiBuilding2Line className="text-slate-500" />} k="Department" v={data.branch || "—"} />
                <InfoLine icon={<RiHashtag className="text-slate-500" />} k="Section" v={data.section || "—"} />
                <InfoLine icon={<RiGraduationCapLine className="text-slate-500" />} k="Year" v={String(data.year ?? "—")} />
                <InfoLine icon={<RiHashtag className="text-slate-500" />} k="Roll No" v={data.rollNumber || "—"} />

                <InfoLine
                  icon={<RiMailLine className="text-slate-500" />}
                  k="Email"
                  v={displayEmail || "—"}
                  action={
                    displayEmail ? (
                      <MiniIconBtn title="Copy email" onClick={() => copyText(displayEmail, "Email copied")}>
                        <RiFileCopyLine className="text-slate-300" />
                      </MiniIconBtn>
                    ) : null
                  }
                />

                <InfoLine
                  icon={<RiPhoneLine className="text-slate-500" />}
                  k="Contact"
                  v={data.phone || "—"}
                  action={
                    data.phone ? (
                      <MiniIconBtn title="Copy contact" onClick={() => copyText(String(data.phone), "Contact copied")}>
                        <RiFileCopyLine className="text-slate-300" />
                      </MiniIconBtn>
                    ) : null
                  }
                />
              </div>
            </div>

            <div className="mt-5 border-t border-white/10" />

            <div className="mt-5">
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">Coding Profiles</p>
              <div className="mt-3 space-y-3">
                {linkedPlatforms.length ? (
                  linkedPlatforms.map((p) => {
                    const handle = ((data.cpHandles?.[p] || "") as string).trim();
                    return (
                      <ProfileLinkRow
                        key={p}
                        platform={p}
                        handle={handle}
                        onOpen={() => openHandle(p)}
                        onCopy={() => copyText(handle, `${PLATFORM_META[p].label} handle copied`)}
                      />
                    );
                  })
                ) : (
                  <EmptyNote text="No coding profiles linked yet." />
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-white/10" />

            <div className="mt-5">
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.length ? skills.slice(0, 18).map((s, i) => <Chip key={`${s}-${i}`} text={s} />) : <EmptyNote text="No skills added." />}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-500">Interests</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.length ? interests.slice(0, 18).map((s, i) => <Chip key={`${s}-${i}`} text={s} />) : <EmptyNote text="No interests added." />}
              </div>
            </div>
          </Card>

          {/* CARD 3 */}
          <Card>
            <CardTitle
              title="Coding Profiles"
              subtitle="Overall • solved • contests • rating"
              icon={<RiLinksLine className="text-sky-300" />}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
              <MetricTab active={metric === "overall"} onClick={() => setMetric("overall")} label="Overall Score" />
              <MetricTab active={metric === "solved"} onClick={() => setMetric("solved")} label="Problems Solved" />
              <MetricTab active={metric === "contests"} onClick={() => setMetric("contests")} label="Contests" />
              <MetricTab active={metric === "rating"} onClick={() => setMetric("rating")} label="Rating" />
            </div>

            <div className="mt-5 flex items-center justify-center">
              <DonutChart totalLabel={metricConfig.totalLabel} totalValue={metricConfig.totalValue} segments={metricConfig.segments} />
            </div>
          </Card>
        </section>

        {/* CARD 4 */}
        <section className="mt-6">
          <Card>
            <button
              onClick={() => setPortfolioOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3"
              type="button"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-50">Portfolio</p>
                <p className="mt-1 text-[0.75rem] text-slate-500">Internships • Projects • Certifications</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
                {portfolioOpen ? "Hide" : "Show"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {portfolioOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 border-t border-white/10" />
                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <PortCol title="Internships" icon={<RiBuilding2Line className="text-emerald-300" />}>
                      {internships.length ? (
                        internships.slice(0, 6).map((x: any, idx: number) => (
                          <MiniItem
                            key={idx}
                            title={x?.company || x?.title || "Internship"}
                            sub={x?.role || x?.description || "—"}
                            meta={x?.duration || x?.time || x?.year || null}
                          />
                        ))
                      ) : (
                        <EmptyNote text="No internships added." />
                      )}
                    </PortCol>

                    <PortCol title="Projects" icon={<RiSparkling2Line className="text-sky-300" />}>
                      {projects.length ? (
                        projects.slice(0, 6).map((p: any, idx: number) => (
                          <MiniItem
                            key={idx}
                            title={p?.title || p?.name || "Project"}
                            sub={p?.description || p?.summary || "—"}
                            meta={p?.stack || p?.tech || p?.role || null}
                            link={p?.link || p?.url || null}
                            onCopy={(url) => copyText(url, "Link copied")}
                            onOpen={(url) => window.open(url, "_blank", "noopener,noreferrer")}
                          />
                        ))
                      ) : (
                        <EmptyNote text="No projects added." />
                      )}
                    </PortCol>

                    <PortCol title="Certifications" icon={<RiBookmarkLine className="text-indigo-300" />}>
                      {certifications.length ? (
                        certifications.slice(0, 8).map((c: any, idx: number) => (
                          <MiniItem
                            key={idx}
                            title={c?.name || c?.title || "Certification"}
                            sub={c?.issuer || c?.provider || c?.description || "—"}
                            meta={c?.year || c?.date || null}
                            link={c?.link || c?.url || null}
                            onCopy={(url) => copyText(url, "Link copied")}
                            onOpen={(url) => window.open(url, "_blank", "noopener,noreferrer")}
                          />
                        ))
                      ) : (
                        <EmptyNote text="No certifications added." />
                      )}
                    </PortCol>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ---------------- SMALL UI HELPERS ---------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-[#050712]/78 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.74)] p-5 sm:p-6">
      {children}
    </div>
  );
}

function CardTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-50">{title}</p>
        {subtitle ? <p className="mt-1 text-[0.75rem] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/50 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}

function MetricTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2 text-sm transition ${
        active ? "text-sky-300" : "text-slate-400 hover:text-slate-200"
      }`}
      type="button"
    >
      <span className="relative z-[1]">{label}</span>
      {active && <span className="absolute left-0 right-0 -bottom-[13px] h-[2px] bg-sky-500/80" />}
    </button>
  );
}

function InfoLine({
  icon,
  k,
  v,
  action,
}: {
  icon: React.ReactNode;
  k: string;
  v: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <span className="text-slate-500 shrink-0">{k}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-right text-slate-200 truncate max-w-[240px]">{v}</span>
        {action}
      </div>
    </div>
  );
}

function MiniIconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      title={title}
      className="h-8 w-8 rounded-xl border border-slate-800 bg-[#050712] flex items-center justify-center hover:border-sky-400/60 transition"
    >
      {children}
    </button>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
      {text}
    </span>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

function ProfileLinkRow({
  platform,
  handle,
  onOpen,
  onCopy,
}: {
  platform: PlatformKey;
  handle: string;
  onOpen: () => void;
  onCopy: () => void;
}) {
  const meta = PLATFORM_META[platform];
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm border border-white/10 shrink-0"
          style={{ background: `${meta.color}22` }}
        >
          <span style={{ color: meta.color }}>{meta.badge}</span>
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-200 truncate flex items-center gap-2">
            <span className="text-slate-400">{meta.icon}</span>
            {meta.label}
          </p>
          <button
            onClick={onOpen}
            className="text-left text-sky-300 hover:text-sky-200 transition truncate"
            type="button"
          >
            {handle}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onCopy}
          type="button"
          className="h-9 w-9 rounded-xl border border-slate-800 bg-[#050712] flex items-center justify-center hover:border-sky-400/60 transition"
          title="Copy handle"
        >
          <RiFileCopyLine className="text-slate-300" />
        </button>
        <button
          onClick={onOpen}
          type="button"
          className="h-9 w-9 rounded-xl border border-slate-800 bg-[#050712] flex items-center justify-center hover:border-sky-400/60 transition"
          title="Open"
        >
          <RiExternalLinkLine className="text-slate-300" />
        </button>
      </div>
    </div>
  );
}

function PortCol({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#070816]/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <div className="h-9 w-9 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function MiniItem({
  title,
  sub,
  meta,
  link,
  onCopy,
  onOpen,
}: {
  title: string;
  sub: string;
  meta?: string | null;
  link?: string | null;
  onCopy?: (url: string) => void;
  onOpen?: (url: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#050712] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{title}</p>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{sub}</p>
          {meta ? <p className="mt-2 text-xs text-slate-400 truncate">{meta}</p> : null}
        </div>

        {link ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onCopy?.(link)}
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center hover:border-sky-400/60 transition"
              title="Copy link"
            >
              <RiFileCopyLine className="text-slate-300" />
            </button>
            <button
              onClick={() => onOpen?.(link)}
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center hover:border-sky-400/60 transition"
              title="Open"
            >
              <RiExternalLinkLine className="text-slate-300" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- LOADING / ERROR / BG ---------------- */

function LoadingShell({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      <BgPro hue={210} />
      <main className="relative mx-auto max-w-5xl px-5 sm:px-7 lg:px-10 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712]/90 px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
          >
            <RiArrowLeftLine /> Back
          </button>
          <div className="h-8 w-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        </div>
        <div className="mt-6 space-y-6">
          <div className="h-24 rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[560px] rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse" />
            <div className="h-[560px] rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse" />
          </div>
          <div className="h-28 rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

function ErrorShell({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 flex items-center justify-center px-4 relative overflow-hidden">
      <BgPro hue={345} />
      <div className="relative max-w-md w-full rounded-[28px] border border-slate-800 bg-[#050712]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.8)]">
        <p className="text-sm font-semibold text-rose-300">Couldn’t open profile</p>
        <p className="mt-2 text-xs text-slate-400">{message}</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-200 hover:border-sky-400"
        >
          <RiArrowLeftLine /> Go back
        </button>
      </div>
    </div>
  );
}

function BgPro({ hue }: { hue: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute -top-40 left-[-60px] h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${hue}, 90%, 60%, 0.24), transparent 60%)`,
        }}
      />
      <div
        className="absolute top-[35%] right-[-140px] h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${(hue + 120) % 360}, 90%, 60%, 0.16), transparent 60%)`,
        }}
      />
      <div
        className="absolute bottom-[-140px] left-[20%] h-80 w-80 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${(hue + 240) % 360}, 90%, 60%, 0.14), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:90px_90px]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,#94a3b8_1px,transparent_0)] bg-[size:18px_18px]" />
    </div>
  );
}
