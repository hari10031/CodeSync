// frontend/src/pages/instructor/InstructorDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../../lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiPulseLine,
  RiTrophyLine,
  RiAlarmWarningLine,
  RiSearch2Line,
  RiRefreshLine,
  RiArrowRightUpLine,
  RiDownload2Line,
  RiCloseLine,
  RiBarChart2Line,
  RiFireLine,
  RiMailLine,
  RiPhoneLine,
} from "react-icons/ri";

type Student = {
  id: string;
  name: string;

  // your DB reality
  branch?: string;
  section?: string;
  year?: string;

  // optional if you ever add later
  dept?: string;

  // performance
  codesyncScore?: number; // 0-100
  activeThisWeek?: boolean;
  lastActiveAt?: string | null;
  prevScore?: number;

  platforms?: {
    leetcode?: number;
    codeforces?: number;
    codechef?: number;
    github?: number;
    hackerrank?: number;
    atcoder?: number;
  };

  email?: string | null;
  phone?: string | null;
};

type DashboardResponse = {
  students: Student[];
  lastSyncAt?: string | null;
};

const BG = "bg-[#050509]";
const CARD =
  "rounded-2xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-xl shadow-[0_0_0_1px_rgba(15,23,42,0.7)]";

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}
function pct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}
function fmt(n: number) {
  return Number.isFinite(n) ? String(Math.round(n)) : "0";
}
function median(arr: number[]) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(
    a.length - 1,
    Math.max(0, Math.floor((p / 100) * a.length) - 1)
  );
  return a[idx];
}

function safeStr(x?: any) {
  return (x ?? "").toString();
}

/** ✅ FIXED: no Array.from(reduce(...)) TS overload issues */
function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  const colSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
  const cols = [...colSet];

  const esc = (v: any) => {
    const str = (v ?? "").toString();
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const csv =
    cols.join(",") +
    "\n" +
    rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function GlowTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
          {title}
        </h1>
        <span className="hidden sm:inline-flex items-center rounded-full border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-slate-300">
          Instructor
        </span>
      </div>
      {subtitle ? (
        <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "sky" | "fuchsia" | "emerald" | "rose" | "amber";
}) {
  const toneCls: Record<string, string> = {
    sky: "from-sky-500/30 via-sky-500/10 to-transparent",
    fuchsia: "from-fuchsia-500/30 via-fuchsia-500/10 to-transparent",
    emerald: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    rose: "from-rose-500/30 via-rose-500/10 to-transparent",
    amber: "from-amber-500/30 via-amber-500/10 to-transparent",
  };

  return (
    <div className={`${CARD} p-4 relative overflow-hidden`}>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${toneCls[tone]} opacity-80`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {value}
          </div>
          {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  right,
}: {
  label: string;
  value: number; // 0-100
  right?: React.ReactNode;
}) {
  const v = clamp(value);
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-slate-300 truncate">{label}</div>
      <div className="h-2 flex-1 rounded-full bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
          style={{ width: `${v}%` }}
        />
      </div>
      <div className="w-16 text-right text-xs text-slate-400">
        {right ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-[0.7rem] transition",
        active
          ? "border-sky-500/40 bg-sky-500/10 text-slate-100 shadow-[0_0_18px_rgba(56,189,248,0.15)]"
          : "border-slate-800 bg-slate-950/50 text-slate-300 hover:bg-slate-900/60",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

function PlatformMini({ platforms }: { platforms?: Student["platforms"] }) {
  const items = [
    ["LC", platforms?.leetcode ?? 0],
    ["CF", platforms?.codeforces ?? 0],
    ["CC", platforms?.codechef ?? 0],
    ["GH", platforms?.github ?? 0],
  ] as const;

  const max = Math.max(1, ...items.map((x) => x[1]));
  return (
    <div className="flex items-center gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1">
          <span className="text-[0.65rem] text-slate-500">{k}</span>
          <span className="inline-block h-1.5 w-10 rounded-full bg-slate-800 overflow-hidden">
            <span
              className="block h-full bg-slate-200/70"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

type SortKey = "name" | "branch" | "section" | "year" | "score" | "active";
type SortDir = "asc" | "desc";

export default function InstructorDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // filters (REAL)
  const [branch, setBranch] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [q, setQ] = useState<string>("");

  // table
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // drawer
  const [selected, setSelected] = useState<Student | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/instructor/dashboard", {
        params: {
          branch: branch === "all" ? undefined : branch,
          section: section === "all" ? undefined : section,
          year: year === "all" ? undefined : year,
          q: q.trim() ? q.trim() : undefined,
        },
      });

      const data: DashboardResponse = res.data;
      setStudents(data.students ?? []);
      setLastSyncAt(data.lastSyncAt ?? null);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await apiClient.post("/instructor/refresh-cohort", {
        branch: branch === "all" ? undefined : branch,
        section: section === "all" ? undefined : section,
        year: year === "all" ? undefined : year,
      });
      await fetchDashboard();
    } catch {
      // ok if not implemented
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // if you want "search as you type" hitting backend, uncomment:
  // useEffect(() => {
  //   const t = setTimeout(() => fetchDashboard(), 300);
  //   return () => clearTimeout(t);
  // }, [branch, section, year, q]);

  const options = useMemo(() => {
    const branches = new Set<string>();
    const sections = new Set<string>();
    const years = new Set<string>();

    students.forEach((s) => {
      if (s.branch) branches.add(String(s.branch));
      if (s.section) sections.add(String(s.section));
      if (s.year) years.add(String(s.year));
    });

    const sortStr = (a: string, b: string) => a.localeCompare(b);
    return {
      branches: ["all", ...Array.from(branches).sort(sortStr)],
      sections: ["all", ...Array.from(sections).sort(sortStr)],
      years: ["all", ...Array.from(years).sort((a, b) => parseInt(a) - parseInt(b))],
    };
  }, [students]);

  // Frontend filtering still kept (for safety + instant UX)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((x) => {
      if (branch !== "all" && safeStr(x.branch) !== branch) return false;
      if (section !== "all" && safeStr(x.section) !== section) return false;
      if (year !== "all" && safeStr(x.year) !== year) return false;

      if (s) {
        const hay = `${x.name ?? ""} ${x.id ?? ""} ${x.branch ?? ""} ${x.section ?? ""} ${x.year ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [students, branch, section, year, q]);

  const scores = useMemo(
    () => filtered.map((s) => clamp(s.codesyncScore ?? 0)),
    [filtered]
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((s) => s.activeThisWeek).length;
    const inactive = total - active;

    const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const med = median(scores);
    const p90 = percentile(scores, 90);

    const atRisk = filtered.filter((s) => (s.codesyncScore ?? 0) < 35).length;

    const deltaAvg =
      filtered.some((s) => typeof s.prevScore === "number")
        ? filtered.reduce((a, s) => a + ((s.codesyncScore ?? 0) - (s.prevScore ?? (s.codesyncScore ?? 0))), 0) /
          Math.max(1, total)
        : null;

    return { total, active, inactive, avg, med, p90, atRisk, deltaAvg };
  }, [filtered, scores]);

  const groupCounts = (key: keyof Student) => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const v = (s[key] as string) || "Unknown";
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byBranch = useMemo(() => groupCounts("branch"), [filtered]);
  const bySection = useMemo(() => groupCounts("section"), [filtered]);
  const byYear = useMemo(() => groupCounts("year"), [filtered]);

  const buckets = useMemo(() => {
    const b = [
      { label: "0-20", min: 0, max: 20, count: 0 },
      { label: "21-40", min: 21, max: 40, count: 0 },
      { label: "41-60", min: 41, max: 60, count: 0 },
      { label: "61-80", min: 61, max: 80, count: 0 },
      { label: "81-100", min: 81, max: 100, count: 0 },
    ];
    filtered.forEach((s) => {
      const sc = Math.round(clamp(s.codesyncScore ?? 0));
      const bucket = b.find((x) => sc >= x.min && sc <= x.max);
      if (bucket) bucket.count += 1;
    });
    return b;
  }, [filtered]);

  const top5 = useMemo(
    () => [...filtered].sort((a, b) => (b.codesyncScore ?? 0) - (a.codesyncScore ?? 0)).slice(0, 5),
    [filtered]
  );

  const risk5 = useMemo(
    () => [...filtered].sort((a, b) => (a.codesyncScore ?? 0) - (b.codesyncScore ?? 0)).slice(0, 5),
    [filtered]
  );

  const platformMix = useMemo(() => {
    const platforms = ["leetcode", "codeforces", "codechef", "github", "hackerrank", "atcoder"] as const;
    const total = filtered.length || 1;

    const sums: Record<(typeof platforms)[number], number> = {
      leetcode: 0,
      codeforces: 0,
      codechef: 0,
      github: 0,
      hackerrank: 0,
      atcoder: 0,
    };

    filtered.forEach((s) => {
      platforms.forEach((p) => {
        sums[p] += s.platforms?.[p] ?? 0;
      });
    });

    const maxSum = Math.max(1, ...platforms.map((p) => sums[p]));
    return platforms
      .map((p) => ({
        platform: p,
        value: (sums[p] / maxSum) * 100,
        avg: sums[p] / total,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const keyFn = (s: Student) => {
      switch (sortKey) {
        case "name":
          return safeStr(s.name).toLowerCase();
        case "branch":
          return safeStr(s.branch).toLowerCase();
        case "section":
          return safeStr(s.section).toLowerCase();
        case "year":
          return parseInt(safeStr(s.year) || "0");
        case "active":
          return s.activeThisWeek ? 1 : 0;
        case "score":
        default:
          return clamp(s.codesyncScore ?? 0);
      }
    };

    return [...filtered].sort((a, b) => {
      const A: any = keyFn(a);
      const B: any = keyFn(b);
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    const rows = sortedRows.map((s) => {
      const score = clamp(s.codesyncScore ?? 0);
      const prev = typeof s.prevScore === "number" ? clamp(s.prevScore) : null;
      return {
        id: s.id,
        name: s.name,
        branch: s.branch ?? "",
        section: s.section ?? "",
        year: s.year ?? "",
        codesyncScore: score,
        activeThisWeek: s.activeThisWeek ? "yes" : "no",
        lastActiveAt: s.lastActiveAt ?? "",
        prevScore: prev ?? "",
        delta: prev === null ? "" : score - prev,
      };
    });

    downloadCSV(
      `codesync_instructor_students_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  return (
    <div className={`min-h-screen ${BG} text-slate-100`}>
      {/* subtle background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      {/* ✅ WIDER + less margins */}
      <div className="relative mx-auto max-w-[1600px] px-2 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <GlowTitle
              title="Instructor Dashboard"
              subtitle="Cohort health, branch-wise performance and student drill-down — in one view."
            />
            <div className="mt-2 text-xs text-slate-500">
              Last sync:{" "}
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString()
                : loading
                ? "Loading…"
                : "—"}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <RiSearch2Line className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: name / id / branch / section…"
                className="w-[22rem] sm:w-96 rounded-full border border-slate-800 bg-slate-950/60 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)]"
              />
            </div>

            <button
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
              type="button"
            >
              <RiDownload2Line /> Export CSV
            </button>

            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-70"
              type="button"
            >
              <RiRefreshLine />
              {refreshing ? "Refreshing…" : "Refresh cohort"}
            </button>
          </div>
        </div>

        {/* Filters (REAL) */}
        <div className={`${CARD} p-4 mb-5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                Filters
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Branch / Section / Year — same as your onboarding DB fields.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Chip
                active={branch === "all" && section === "all" && year === "all"}
                onClick={() => {
                  setBranch("all");
                  setSection("all");
                  setYear("all");
                }}
              >
                Reset
              </Chip>
              <Chip onClick={() => fetchDashboard()}>Apply</Chip>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-2 text-xs text-slate-400">Branch</div>
              <div className="flex flex-wrap gap-2">
                {options.branches.slice(0, 14).map((b) => (
                  <Chip key={b} active={branch === b} onClick={() => setBranch(b)}>
                    {b === "all" ? "All" : b}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-slate-400">Section</div>
              <div className="flex flex-wrap gap-2">
                {options.sections.slice(0, 14).map((s) => (
                  <Chip key={s} active={section === s} onClick={() => setSection(s)}>
                    {s === "all" ? "All" : `Sec ${s}`}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-slate-400">Year</div>
              <div className="flex flex-wrap gap-2">
                {options.years.map((y) => (
                  <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                    {y === "all" ? "All" : `Year ${y}`}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Showing <span className="text-slate-200">{filtered.length}</span> students (after filters).
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            label="Students"
            value={String(kpis.total)}
            hint="Filtered cohort count"
            icon={<RiTeamLine className="text-lg" />}
            tone="sky"
          />
          <StatCard
            label="Active (week)"
            value={String(kpis.active)}
            hint={`${Math.round(pct(kpis.active, kpis.total))}% active`}
            icon={<RiPulseLine className="text-lg" />}
            tone="emerald"
          />
          <StatCard
            label="Inactive"
            value={String(kpis.inactive)}
            hint="Needs follow-up"
            icon={<RiAlarmWarningLine className="text-lg" />}
            tone="rose"
          />
          <StatCard
            label="Average"
            value={`${fmt(kpis.avg)} / 100`}
            hint={
              kpis.deltaAvg === null
                ? "Mean score"
                : `Avg change: ${kpis.deltaAvg >= 0 ? "+" : ""}${kpis.deltaAvg.toFixed(1)}`
            }
            icon={<RiBarChart2Line className="text-lg" />}
            tone="fuchsia"
          />
          <StatCard
            label="Median"
            value={`${fmt(kpis.med)} / 100`}
            hint="Robust benchmark"
            icon={<RiBarChart2Line className="text-lg" />}
            tone="amber"
          />
          <StatCard
            label="P90"
            value={`${fmt(kpis.p90)} / 100`}
            hint="Top 10% benchmark"
            icon={<RiTrophyLine className="text-lg" />}
            tone="sky"
          />
        </div>

        {/* Breakdown */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`${CARD} p-4`}>
            <div className="text-sm font-semibold text-slate-100">By Branch</div>
            <div className="mt-4 space-y-3">
              {byBranch.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!byBranch.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="text-sm font-semibold text-slate-100">By Section</div>
            <div className="mt-4 space-y-3">
              {bySection.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label === "Unknown" ? "Unknown" : `Sec ${x.label}`}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!bySection.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="text-sm font-semibold text-slate-100">By Year</div>
            <div className="mt-4 space-y-3">
              {byYear.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label === "Unknown" ? "Unknown" : `Year ${x.label}`}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!byYear.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Distribution + Platform Mix */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Score distribution
                </div>
                <div className="text-xs text-slate-500">
                  Cohort spread across score bands
                </div>
              </div>
              <RiBarChart2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {buckets.map((b) => (
                <BarRow
                  key={b.label}
                  label={b.label}
                  value={pct(b.count, kpis.total)}
                  right={<span>{b.count}</span>}
                />
              ))}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Platform signal mix
                </div>
                <div className="text-xs text-slate-500">
                  Average relative contribution
                </div>
              </div>
              <RiFireLine className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {platformMix.slice(0, 6).map((p) => (
                <BarRow
                  key={p.platform}
                  label={p.platform}
                  value={p.value}
                  right={<span className="tabular-nums">{Math.round(p.avg)}</span>}
                />
              ))}
              {!platformMix.length && !loading ? (
                <div className="text-sm text-slate-500">No platform data.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Top + At-risk */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Top performers
                </div>
                <div className="text-xs text-slate-500">
                  Best scores in current filter
                </div>
              </div>
              <RiTrophyLine className="text-slate-300" />
            </div>

            <div className="mt-4 space-y-2">
              {top5.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 hover:bg-slate-900/50 transition"
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.branch ?? "—"} • Sec {s.section ?? "—"} • Year {s.year ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums text-slate-100">
                      {Math.round(s.codesyncScore ?? 0)}
                    </div>
                    <RiArrowRightUpLine className="text-slate-400" />
                  </div>
                </button>
              ))}
              {!top5.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  At-risk list
                </div>
                <div className="text-xs text-slate-500">
                  Low score / inactive students
                </div>
              </div>
              <RiAlarmWarningLine className="text-rose-300" />
            </div>

            <div className="mt-4 space-y-2">
              {risk5.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 hover:bg-slate-900/50 transition"
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.activeThisWeek ? "Active" : "Inactive"} • {s.branch ?? "—"} • Year {s.year ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums text-slate-100">
                      {Math.round(s.codesyncScore ?? 0)}
                    </div>
                    <RiArrowRightUpLine className="text-slate-400" />
                  </div>
                </button>
              ))}
              {!risk5.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className={`mt-5 ${CARD} overflow-hidden`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-800">
            <div>
              <div className="text-sm font-semibold text-slate-100">Students</div>
              <div className="text-xs text-slate-500">
                Click a student to open quick view. Sort columns to spot patterns fast.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                onClick={() => {
                  setSortKey("score");
                  setSortDir("desc");
                }}
                type="button"
              >
                Sort: Top score
              </button>
              <button
                className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                onClick={() => {
                  setSortKey("active");
                  setSortDir("desc");
                }}
                type="button"
              >
                Sort: Active
              </button>
              <button
                className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                onClick={() => fetchDashboard()}
                type="button"
              >
                Refresh view
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-950/60">
                <tr className="text-left text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("name")}
                  >
                    Student
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("branch")}
                  >
                    Branch
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("section")}
                  >
                    Section
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("year")}
                  >
                    Year
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("score")}
                  >
                    Score
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleSort("active")}
                  >
                    Status
                  </th>
                  <th className="px-4 py-3">Platforms</th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((s) => {
                  const score = clamp(s.codesyncScore ?? 0);
                  const delta =
                    typeof s.prevScore === "number"
                      ? score - clamp(s.prevScore)
                      : null;

                  return (
                    <tr
                      key={s.id}
                      className="border-t border-slate-800/70 hover:bg-slate-900/40 transition cursor-pointer"
                      onClick={() => setSelected(s)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          {s.id} • {s.branch ?? "—"} • Sec {s.section ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-200">
                        {s.branch ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {s.section ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {s.year ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-slate-800/70 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <div className="text-sm font-semibold tabular-nums text-slate-100">
                            {Math.round(score)}
                          </div>
                          {delta !== null ? (
                            <span
                              className={[
                                "text-xs tabular-nums",
                                delta >= 0 ? "text-emerald-300" : "text-rose-300",
                              ].join(" ")}
                            >
                              {delta >= 0 ? "+" : ""}
                              {delta}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-[0.7rem]",
                            s.activeThisWeek
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                              : "border-slate-700 bg-slate-950/60 text-slate-300",
                          ].join(" ")}
                        >
                          {s.activeThisWeek ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <PlatformMini platforms={s.platforms} />
                      </td>
                    </tr>
                  );
                })}

                {!loading && sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No students found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`mt-5 ${CARD} p-4`}>
          <div className="text-xs text-slate-400">
            Real data tips: ensure each student doc has{" "}
            <span className="text-slate-200">fullName, branch, section, yearOfStudy</span>{" "}
            and <span className="text-slate-200">cpScores.displayScore</span> so score + leaderboard + dashboard stay consistent.
          </div>
        </div>
      </div>

      {/* Drawer (Student Quick View) */}
      <AnimatePresence>
        {selected ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setSelected(null)}
            />

            <motion.aside
              initial={{ x: 520, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 520, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-[520px] border-l border-slate-800 bg-[#050509] p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-50">
                    {selected.name}
                  </div>
                  <div className="text-sm text-slate-400">
                    {selected.id} • {selected.branch ?? "—"} • Sec {selected.section ?? "—"} • Year{" "}
                    {selected.year ?? "—"}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/60 flex items-center justify-center hover:bg-slate-900/60 transition"
                  type="button"
                >
                  <RiCloseLine className="text-slate-200" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`${CARD} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    CodeSyncScore
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-50">
                    {Math.round(clamp(selected.codesyncScore ?? 0))}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800/70 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                      style={{ width: `${clamp(selected.codesyncScore ?? 0)}%` }}
                    />
                  </div>

                  {typeof selected.prevScore === "number" ? (
                    <div className="mt-2 text-xs text-slate-400">
                      Previous: {Math.round(selected.prevScore)} • Delta:{" "}
                      <span
                        className={
                          (selected.codesyncScore ?? 0) - selected.prevScore >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }
                      >
                        {(selected.codesyncScore ?? 0) - selected.prevScore >= 0 ? "+" : ""}
                        {Math.round((selected.codesyncScore ?? 0) - selected.prevScore)}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">No previous snapshot.</div>
                  )}
                </div>

                <div className={`${CARD} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Activity
                  </div>
                  <div className="mt-2">
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-xs",
                        selected.activeThisWeek
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-700 bg-slate-950/60 text-slate-300",
                      ].join(" ")}
                    >
                      {selected.activeThisWeek ? "Active this week" : "Inactive this week"}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Last active:{" "}
                    {selected.lastActiveAt ? new Date(selected.lastActiveAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              {(selected.email || selected.phone) ? (
                <div className={`mt-3 ${CARD} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Contact
                  </div>
                  <div className="mt-2 space-y-2 text-sm text-slate-200">
                    {selected.email ? (
                      <div className="flex items-center gap-2">
                        <RiMailLine className="text-slate-400" /> {selected.email}
                      </div>
                    ) : null}
                    {selected.phone ? (
                      <div className="flex items-center gap-2">
                        <RiPhoneLine className="text-slate-400" /> {selected.phone}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-100">Platform signals</div>
                <div className="mt-3 space-y-3">
                  {(
                    [
                      ["LeetCode", selected.platforms?.leetcode ?? 0],
                      ["Codeforces", selected.platforms?.codeforces ?? 0],
                      ["CodeChef", selected.platforms?.codechef ?? 0],
                      ["GitHub", selected.platforms?.github ?? 0],
                      ["HackerRank", selected.platforms?.hackerrank ?? 0],
                      ["AtCoder", selected.platforms?.atcoder ?? 0],
                    ] as const
                  ).map(([label, v]) => (
                    <BarRow
                      key={label}
                      label={label}
                      value={clamp(v)}
                      right={<span className="tabular-nums">{Math.round(v)}</span>}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
                  type="button"
                  onClick={() => (window.location.href = `/student/${selected.id}`)}
                >
                  Open profile <RiArrowRightUpLine />
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition"
                  type="button"
                  onClick={() => alert("Next: add messaging / notes for instructor.")}
                >
                  Quick Action
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
