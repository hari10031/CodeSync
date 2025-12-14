import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../lib/apiClient";
import {
  RiSearch2Line,
  RiRefreshLine,
  RiTrophyLine,
  RiArrowRightUpLine,
  RiShieldCheckLine,
  RiInformationLine,
} from "react-icons/ri";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";

type PlatformKey =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "hackerrank"
  | "github"
  | "atcoder";

type Student = {
  id: string;
  fullName?: string;
  username?: string;
  email?: string;
  branch?: string;
  year?: string | number;
  section?: string;
  codesyncScore?: number; // 0-100
  totalProblemsSolved?: number;
  cpHandles?: Partial<Record<PlatformKey, string>>;
  updatedAt?: any;
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function scoreBadge(score: number) {
  if (score >= 85) return { label: "Elite", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10", text: "text-emerald-200" };
  if (score >= 70) return { label: "Strong", ring: "ring-sky-400/30", bg: "bg-sky-400/10", text: "text-sky-200" };
  if (score >= 50) return { label: "Growing", ring: "ring-amber-400/30", bg: "bg-amber-400/10", text: "text-amber-200" };
  return { label: "Starter", ring: "ring-slate-400/20", bg: "bg-slate-400/10", text: "text-slate-200" };
}

function PlatformIcons({ handles }: { handles?: Student["cpHandles"] }) {
  const has = (k: PlatformKey) => !!handles?.[k];

  return (
    <div className="flex items-center gap-2 text-slate-300">
      <div className={`p-2 rounded-xl border ${has("leetcode") ? "border-slate-700/60 bg-slate-900/40" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiLeetcode />
      </div>
      <div className={`p-2 rounded-xl border ${has("codeforces") ? "border-slate-700/60 bg-slate-900/40" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiCodeforces />
      </div>
      <div className={`p-2 rounded-xl border ${has("codechef") ? "border-slate-700/60 bg-slate-900/40" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiCodechef />
      </div>
      <div className={`p-2 rounded-xl border ${has("hackerrank") ? "border-slate-700/60 bg-slate-900/40" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiHackerrank />
      </div>
      <div className={`p-2 rounded-xl border ${has("github") ? "border-slate-700/60 bg-slate-900/40" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiGithub />
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "name" | "solved">("score");

  const fetchStudents = async () => {
    setLoading(true);
    setErr(null);
    try {
      // ✅ Replace this endpoint with YOUR existing one if different
      // Common choices:
      // - /api/students
      // - /student/list
      // - /students/leaderboard
      const res = await apiClient.get("/students"); // <-- change if needed
      const data: Student[] = (res.data?.students || res.data || []).map((s: any) => ({
        id: s.id || s._id || s.uid,
        fullName: s.fullName || s.fullname || s.name,
        username: s.username,
        email: s.email,
        branch: s.branch,
        year: s.year,
        section: s.section,
        codesyncScore: isFinite(Number(s.codesyncScore)) ? Number(s.codesyncScore) : Number(s.score ?? 0),
        totalProblemsSolved: Number(s.totalProblemsSolved ?? s.totalSolved ?? 0),
        cpHandles: s.cpHandles || s.cphandles || s.handles,
        updatedAt: s.updatedAt,
      }));

      setRows(data.filter((x) => !!x.id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = rows.slice();

    if (query) {
      list = list.filter((s) => {
        const name = (s.fullName || s.username || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const branch = (s.branch || "").toLowerCase();
        const year = String(s.year ?? "").toLowerCase();
        const section = (s.section || "").toLowerCase();
        return (
          name.includes(query) ||
          email.includes(query) ||
          branch.includes(query) ||
          year.includes(query) ||
          section.includes(query)
        );
      });
    }

    list.sort((a, b) => {
      if (sort === "name") return (a.fullName || a.username || "").localeCompare(b.fullName || b.username || "");
      if (sort === "solved") return (b.totalProblemsSolved || 0) - (a.totalProblemsSolved || 0);
      return (b.codesyncScore || 0) - (a.codesyncScore || 0);
    });

    return list;
  }, [rows, q, sort]);

  return (
    <div className="w-full px-4 py-8 md:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
              <RiShieldCheckLine className="text-slate-300" />
              Students Directory
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
              Students
              <span className="ml-2 text-slate-300/80 font-normal text-base">
                ({filtered.length})
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-300/80">
              Leaderboard-style view • click any student to open their public profile
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStudents}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/70 active:scale-[0.98] transition"
              title="Refresh"
            >
              <RiRefreshLine />
              Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
              <RiSearch2Line className="text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, branch, year, section..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
              <div className="text-sm text-slate-300">Sort</div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="bg-slate-950/40 border border-slate-800/60 rounded-xl px-3 py-2 text-sm outline-none"
              >
                <option value="score">CodeSync Score</option>
                <option value="solved">Problems Solved</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="mt-6 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 shadow-[0_0_0_1px_rgba(148,163,184,0.08)] overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-800/60 text-xs text-slate-400">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Student</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Solved</div>
            <div className="col-span-2">Platforms</div>
          </div>

          <AnimatePresence>
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-10 text-slate-300"
              >
                Loading students…
              </motion.div>
            ) : err ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-6 py-8"
              >
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
                  <RiInformationLine className="mt-0.5" />
                  <div>
                    <div className="font-medium">Couldn’t load students</div>
                    <div className="text-sm opacity-90 mt-1">{err}</div>
                  </div>
                </div>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-10 text-slate-300"
              >
                No students found.
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filtered.map((s, idx) => {
                  const rank = idx + 1;
                  const score = clamp(Number(s.codesyncScore || 0));
                  const badge = scoreBadge(score);
                  const name = s.fullName || s.username || "Unknown Student";

                  return (
                    <motion.button
                      key={s.id}
                      onClick={() => nav(`/profile/${s.id}`)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full text-left"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-900/40 transition">
                        {/* Rank */}
                        <div className="md:col-span-1 flex items-center gap-2">
                          <div className="text-sm text-slate-300 font-medium w-10">
                            {rank <= 3 ? (
                              <span className="inline-flex items-center gap-1">
                                <RiTrophyLine className="text-slate-200" />
                                {rank}
                              </span>
                            ) : (
                              <span className="text-slate-400">{rank}</span>
                            )}
                          </div>
                        </div>

                        {/* Student */}
                        <div className="md:col-span-5 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl border border-slate-800/70 bg-slate-900/60 grid place-items-center text-sm text-slate-200">
                            {initials(name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-slate-100 truncate">{name}</div>
                              <RiArrowRightUpLine className="text-slate-400" />
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 truncate">
                              {(s.branch || "—")} • {String(s.year ?? "—")} • {s.section || "—"}
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="md:col-span-2 flex items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs ring-1 ${badge.ring} ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </div>
                            <div className="text-sm text-slate-200 font-semibold tabular-nums">
                              {score.toFixed(0)}
                            </div>
                          </div>
                        </div>

                        {/* Solved */}
                        <div className="md:col-span-2 flex items-center">
                          <div className="text-sm text-slate-200 tabular-nums">
                            {Number(s.totalProblemsSolved || 0).toLocaleString()}
                          </div>
                        </div>

                        {/* Platforms */}
                        <div className="md:col-span-2 flex items-center justify-start md:justify-end">
                          <PlatformIcons handles={s.cpHandles} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
