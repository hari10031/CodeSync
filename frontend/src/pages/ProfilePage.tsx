// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiExternalLinkLine,
  RiSave3Line,
  RiRefreshLine,
  RiInformationLine,
  RiSparkling2Line,
  RiShieldCheckLine,
  RiGraduationCapLine,
  RiUser3Line,
  RiLinksLine,
  RiHashtag,
  RiPhoneLine,
  RiMailLine,
  RiArrowLeftLine,
} from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";

type CpHandles = {
  leetcode?: string | null;
  codeforces?: string | null;
  codechef?: string | null;
  github?: string | null;
  hackerrank?: string | null;
  atcoder?: string | null;
};

type ProfileMeta = {
  about?: string;
  skills?: string[] | string;
  interests?: string[] | string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  otherSocials?: string;
  projects?: string;
  internships?: string;
  certificates?: string;
};

type StudentProfileResponse = {
  id: string;
  fullname: string | null;
  collegeEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  branch: string | null;
  section: string | null;
  year: string | null;
  rollNumber: string | null;
  graduationYear: string | null;
  cpHandles: CpHandles;
  profile: ProfileMeta;
  onboardingCompleted: boolean; // kept for compatibility, not shown in UI
};

/* ------------------------------ Helpers ------------------------------ */

const chipify = (value?: string[] | string) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const toCSV = (arr: string[]) => arr.join(", ");
const cleanHandle = (v: string) => v.replace(/^@+/, "").trim();

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

const shallowEqualJSON = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

/* ------------------------------ Landing-matched styles ------------------------------ */

const PageBG = "bg-[#050509] text-slate-100";
const Card =
  "rounded-3xl border border-slate-800 bg-black/90 shadow-[0_0_30px_rgba(15,23,42,0.8)]";
const Inner = "rounded-2xl border border-slate-800 bg-[#050710]";
const Inner2 = "rounded-2xl border border-slate-800 bg-[#050812]";

const Chip =
  "inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-3 py-1 text-[11px] text-slate-300";

const InputBase =
  "w-full rounded-2xl border border-slate-800 bg-[#050710] px-3 py-2.5 text-[0.82rem] text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 transition";

const TextareaBase =
  "w-full min-h-[98px] rounded-2xl border border-slate-800 bg-[#050710] px-3 py-2.5 text-[0.82rem] text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 transition resize-y";

const GradientRule = () => (
  <div className="h-[1px] w-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 rounded-full opacity-80" />
);

const FieldLabel: React.FC<{ label: string; hint?: string; icon?: React.ReactNode }> = ({
  label,
  hint,
  icon,
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      {icon ? (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-sky-300">
          {icon}
        </span>
      ) : null}
      <p className="text-slate-400 text-[11px] uppercase tracking-[0.18em]">{label}</p>
    </div>
    {hint ? (
      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500">
        <RiInformationLine className="text-[0.8rem]" />
        {hint}
      </span>
    ) : null}
  </div>
);

const SectionHeader = ({
  title,
  subtitle,
  icon,
  onEdit,
  editing,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onEdit: () => void;
  editing: boolean;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-sky-300 text-xl">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>

    <button
      onClick={onEdit}
      className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/70 transition"
    >
      <RiEditLine />
      {editing ? "Done" : "Edit"}
    </button>
  </div>
);

/* ------------------------------ Collapsible Card ------------------------------ */

function CollapsibleCard({
  title,
  subtitle,
  icon,
  open,
  setOpen,
  rightAction,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
  rightAction: React.ReactNode; // your Edit button
  children: React.ReactNode;
}) {
  return (
    <div className={`${Card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-6 hover:bg-slate-900/30 transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-sky-300 text-xl">
                {icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-slate-100">{title}</h2>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div onClick={(e) => e.stopPropagation()}>{rightAction}</div>

            <motion.div
              className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              aria-label={open ? "Collapse" : "Expand"}
              title={open ? "Collapse" : "Expand"}
            >
              ▼
            </motion.div>
          </div>
        </div>

        <div className="mt-5">
          <GradientRule />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Component ------------------------------ */

const ProfilePage: React.FC = () => {
  const [data, setData] = useState<StudentProfileResponse | null>(null);
  const [initial, setInitial] = useState<StudentProfileResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [savePulse, setSavePulse] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const [edit, setEdit] = useState({
    basic: false,
    academic: false,
    cp: false,
    portfolio: false,
  });

  // ✅ collapsed by default on first open
  const [openCards, setOpenCards] = useState({
    cp: false,
    portfolio: false,
  });

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await apiClient.get("/student/profile");
        const payload = res.data as StudentProfileResponse;

        const normalized: StudentProfileResponse = {
          ...payload,
          profile: {
            ...payload.profile,
            skills: chipify(payload.profile?.skills),
            interests: chipify(payload.profile?.interests),
          },
          cpHandles: payload.cpHandles || {},
        };

        setData(normalized);
        setInitial(normalized);
      } catch (err: any) {
        console.error("[ProfilePage] error:", err);
        const msg = err?.response?.data?.message || err?.message || "Failed to load profile.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = useMemo(() => {
    if (!data || !initial) return false;
    return !shallowEqualJSON(data, initial);
  }, [data, initial]);

  const skills = useMemo(() => chipify(data?.profile?.skills), [data?.profile?.skills]);
  const interests = useMemo(() => chipify(data?.profile?.interests), [data?.profile?.interests]);

  const anyEditOn = edit.basic || edit.academic || edit.cp || edit.portfolio;

  // ✅ auto-open cp/portfolio if user clicks edit
  const toggleSection = (k: keyof typeof edit) =>
    setEdit((p) => {
      const next = { ...p, [k]: !p[k] };
      if (k === "cp") setOpenCards((c) => ({ ...c, cp: true }));
      if (k === "portfolio") setOpenCards((c) => ({ ...c, portfolio: true }));
      return next;
    });

  const closeAllEdits = () => setEdit({ basic: false, academic: false, cp: false, portfolio: false });

  const resetToInitial = () => {
    if (!initial) return;
    setData(initial);
    setSaveMsg(null);
    closeAllEdits();
  };

  const updateTop = (key: keyof StudentProfileResponse, value: any) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaveMsg(null);
  };

  const updateProfile = (key: keyof ProfileMeta, value: any) => {
    setData((prev) =>
      prev ? { ...prev, profile: { ...(prev.profile || {}), [key]: value } } : prev
    );
    setSaveMsg(null);
  };

  const updateHandle = (key: keyof CpHandles, value: string) => {
    const cleaned = value ? cleanHandle(value) : "";
    setData((prev) =>
      prev ? { ...prev, cpHandles: { ...(prev.cpHandles || {}), [key]: cleaned || null } } : prev
    );
    setSaveMsg(null);
  };

  const validate = (payload: StudentProfileResponse) => {
    const errs: string[] = [];
    if (payload.phone && payload.phone.replace(/\D/g, "").length < 8) {
      errs.push("Phone number looks too short.");
    }
    const urls = [payload.profile?.linkedin, payload.profile?.github, payload.profile?.portfolio].filter(
      Boolean
    ) as string[];
    for (const u of urls) {
      const nu = normalizeUrl(u);
      try {
        new URL(nu);
      } catch {
        errs.push(`Invalid URL: ${u}`);
      }
    }
    return errs;
  };

  const triggerSavedAnimation = () => {
    setSavePulse(true);
    setConfetti(true);
    window.setTimeout(() => setSavePulse(false), 520);
    window.setTimeout(() => setConfetti(false), 900);
  };

  const handleSave = async () => {
    if (!data) return;
    setError(null);
    setSaveMsg(null);

    const prepared: StudentProfileResponse = {
      ...data,
      profile: {
        ...(data.profile || {}),
        skills: chipify(data.profile?.skills),
        interests: chipify(data.profile?.interests),
        linkedin: normalizeUrl(data.profile?.linkedin || "") || "",
        github: normalizeUrl(data.profile?.github || "") || "",
        portfolio: normalizeUrl(data.profile?.portfolio || "") || "",
      },
      cpHandles: {
        ...(data.cpHandles || {}),
        leetcode: data.cpHandles?.leetcode ? cleanHandle(data.cpHandles.leetcode) : null,
        codechef: data.cpHandles?.codechef ? cleanHandle(data.cpHandles.codechef) : null,
        codeforces: data.cpHandles?.codeforces ? cleanHandle(data.cpHandles.codeforces) : null,
        hackerrank: data.cpHandles?.hackerrank ? cleanHandle(data.cpHandles.hackerrank) : null,
        github: data.cpHandles?.github ? cleanHandle(data.cpHandles.github) : null,
        atcoder: data.cpHandles?.atcoder ? cleanHandle(data.cpHandles.atcoder) : null,
      },
    };

    const errs = validate(prepared);
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.put("/student/profile", prepared);
      const updated = res.data as StudentProfileResponse;

      const normalizedUpdated: StudentProfileResponse = {
        ...updated,
        profile: {
          ...updated.profile,
          skills: chipify(updated.profile?.skills),
          interests: chipify(updated.profile?.interests),
        },
        cpHandles: updated.cpHandles || {},
      };

      setData(normalizedUpdated);
      setInitial(normalizedUpdated);
      setSaveMsg("Saved successfully.");
      closeAllEdits();
      triggerSavedAnimation();
    } catch (err: any) {
      console.error("[ProfilePage] save error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to save profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${PageBG} flex items-center justify-center`}>
        <div className={`${Card} px-6 py-5`}>
          <div className={Chip}>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Loading your profile…
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen ${PageBG} flex items-center justify-center px-4`}>
        <div className={`${Card} max-w-md w-full px-6 py-5 text-center`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-200">
            <RiCloseLine />
            Couldn&apos;t load profile
          </div>
          <p className="mt-3 text-xs text-slate-400">{error}</p>
          <div className="mt-5">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition"
            >
              <RiArrowLeftLine />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { fullname } = data;

  return (
    <div className={`min-h-screen w-full ${PageBG} font-display overflow-x-hidden`}>
      {/* HEADER */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pt-10 pb-6">
        <div className={`${Card} p-6 sm:p-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className={Chip}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  CodeSync · Profile
                </div>
                {dirty ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    Unsaved changes
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                    <RiShieldCheckLine />
                    Synced
                  </div>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {fullname ? (
                  <>
                    Hey,{" "}
                    <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                      {fullname}
                    </span>
                  </>
                ) : (
                  "Your CodeSync profile"
                )}
              </h1>

            <p className="text-sm text-slate-300 max-w-2xl">
  Keep your profile sharp — update academics, link platforms, and curate a portfolio that powers your dashboard and Career Suite.
</p>


              {saveMsg ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                  <RiCheckLine />
                  {saveMsg}
                </div>
              ) : null}

              {error ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-200">
                  <RiCloseLine />
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              <Link to="/dashboard" className="text-xs text-slate-400 hover:text-slate-200 transition">
                ← Back to dashboard
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetToInitial}
                  disabled={!dirty || saving}
                  className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <RiRefreshLine />
                    Reset
                  </span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:bg-sky-400 active:scale-95 transition disabled:opacity-60"
                >
                  <RiSave3Line />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <GradientRule />
          </div>
        </div>
      </section>

      {/* Saved animation overlay */}
      <AnimatePresence>
        {confetti && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute left-1/2 top-20 -translate-x-1/2">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                initial={{ scale: 0.9, y: -8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -8 }}
              >
                <RiCheckLine />
                Saved
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BODY */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Basic */}
            <div className={`${Card} p-6`}>
              <SectionHeader
                title="Basic details"
                subtitle="Identity + contact info used in exports."
                icon={<RiUser3Line />}
                editing={edit.basic}
                onEdit={() => toggleSection("basic")}
              />
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel label="Full name" icon={<RiUser3Line />} />
                    {edit.basic ? (
                      <input
                        className={InputBase}
                        value={data.fullname || ""}
                        onChange={(e) => updateTop("fullname", e.target.value)}
                        placeholder="Your full name"
                      />
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-200`}>{data.fullname || "—"}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel label="College email" icon={<RiMailLine />} />
                    {edit.basic ? (
                      <input
                        className={InputBase}
                        value={data.collegeEmail || ""}
                        onChange={(e) => updateTop("collegeEmail", e.target.value)}
                        placeholder="College email"
                      />
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-200 truncate`}>
                        {data.collegeEmail || "—"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel label="Personal email" icon={<RiMailLine />} />
                    {edit.basic ? (
                      <input
                        className={InputBase}
                        value={data.personalEmail || ""}
                        onChange={(e) => updateTop("personalEmail", e.target.value)}
                        placeholder="Personal email"
                      />
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-200 truncate`}>
                        {data.personalEmail || "—"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel label="Phone" icon={<RiPhoneLine />} />
                    {edit.basic ? (
                      <input
                        className={InputBase}
                        value={data.phone || ""}
                        onChange={(e) => updateTop("phone", e.target.value)}
                        placeholder="Phone number"
                      />
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-200`}>{data.phone || "—"}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic */}
            <div className={`${Card} p-6`}>
              <SectionHeader
                title="Academic grouping"
                subtitle="Used for branch/year filters & leaderboards."
                icon={<RiGraduationCapLine />}
                editing={edit.academic}
                onEdit={() => toggleSection("academic")}
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { k: "branch", label: "Branch", ph: "CSE / CSIT / ECE…", ic: <RiGraduationCapLine /> },
                  { k: "section", label: "Section", ph: "A / B / C…", ic: <RiHashtag /> },
                  { k: "year", label: "Year of study", ph: "1 / 2 / 3 / 4", ic: <RiHashtag /> },
                  { k: "rollNumber", label: "Roll number", ph: "Roll no.", ic: <RiHashtag /> },
                  { k: "graduationYear", label: "Graduation year", ph: "2026", ic: <RiHashtag /> },
                ].map((f) => {
                  const key = f.k as keyof StudentProfileResponse;
                  const value = (data[key] as any) || "";
                  return (
                    <div key={f.k} className="space-y-2">
                      <FieldLabel label={f.label} icon={f.ic} />
                      {edit.academic ? (
                        <input
                          className={InputBase}
                          value={value}
                          onChange={(e) => updateTop(key, e.target.value)}
                          placeholder={f.ph}
                        />
                      ) : (
                        <div className={`${Inner} p-3 text-sm text-slate-200`}>{value || "—"}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Collapsible CP */}
            <CollapsibleCard
              title="Coding profiles"
              subtitle="Handles used for unified score + analytics."
              icon={<RiShieldCheckLine />}
              open={openCards.cp}
              setOpen={(v) => setOpenCards((c) => ({ ...c, cp: v }))}
              rightAction={
                <button
                  onClick={() => toggleSection("cp")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/70 transition"
                >
                  <RiEditLine />
                  {edit.cp ? "Done" : "Edit"}
                </button>
              }
            >
              <div className="space-y-3">
                {[
                  {
                    key: "leetcode" as const,
                    label: "LeetCode",
                    icon: <SiLeetcode className="text-violet-300 text-sm" />,
                    url: (u: string) => `https://leetcode.com/${u}`,
                  },
                  {
                    key: "codechef" as const,
                    label: "CodeChef",
                    icon: <SiCodechef className="text-orange-300 text-sm" />,
                    url: (u: string) => `https://www.codechef.com/users/${u}`,
                  },
                  {
                    key: "codeforces" as const,
                    label: "Codeforces",
                    icon: <SiCodeforces className="text-sky-300 text-sm" />,
                    url: (u: string) => `https://codeforces.com/profile/${u}`,
                  },
                  {
                    key: "hackerrank" as const,
                    label: "HackerRank",
                    icon: <SiHackerrank className="text-amber-300 text-sm" />,
                    url: (u: string) => `https://www.hackerrank.com/profile/${u}`,
                  },
                  {
                    key: "github" as const,
                    label: "GitHub",
                    icon: <SiGithub className="text-slate-100 text-sm" />,
                    url: (u: string) => `https://github.com/${u}`,
                  },
                  {
                    key: "atcoder" as const,
                    label: "AtCoder",
                    icon: <span className="text-cyan-300 text-[0.7rem] font-semibold">AC</span>,
                    url: (u: string) => `https://atcoder.jp/users/${u}`,
                  },
                ].map((p) => {
                  const username = data.cpHandles?.[p.key] || "";
                  const linked = Boolean(username);

                  return (
                    <div key={p.key} className={`${Inner2} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                            {p.icon}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{p.label}</p>
                            {!edit.cp ? (
                              <p className="text-[11px] text-slate-400 truncate">
                                {linked ? `@${username}` : "Not linked"}
                              </p>
                            ) : (
                              <input
                                className={InputBase}
                                value={username}
                                onChange={(e) => updateHandle(p.key, e.target.value)}
                                placeholder={`Enter ${p.label} username`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {linked ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              Linked
                            </span>
                          ) : null}

                          {linked && !edit.cp ? (
                            <a
                              href={p.url(username)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/70 transition inline-flex items-center gap-2"
                            >
                              Open <RiExternalLinkLine />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>

            {/* Collapsible Portfolio */}
            <CollapsibleCard
              title="Portfolio snapshot"
              subtitle="Used by Resume Builder + ATS Analyzer."
              icon={<RiSparkling2Line />}
              open={openCards.portfolio}
              setOpen={(v) => setOpenCards((c) => ({ ...c, portfolio: v }))}
              rightAction={
                <button
                  onClick={() => toggleSection("portfolio")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-100 hover:bg-slate-900/70 transition"
                >
                  <RiEditLine />
                  {edit.portfolio ? "Done" : "Edit"}
                </button>
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel label="About" hint="Short intro shown in career suite" icon={<RiInformationLine />} />
                  {edit.portfolio ? (
                    <textarea
                      className={TextareaBase}
                      value={data.profile?.about || ""}
                      onChange={(e) => updateProfile("about", e.target.value)}
                      placeholder="Write a short summary about yourself…"
                    />
                  ) : (
                    <div className={`${Inner} p-4 text-sm text-slate-200 whitespace-pre-line`}>
                      {data.profile?.about || "—"}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel label="Skills" hint="Comma separated" icon={<RiSparkling2Line />} />
                    {edit.portfolio ? (
                      <input
                        className={InputBase}
                        value={
                          Array.isArray(data.profile?.skills)
                            ? toCSV(data.profile?.skills as string[])
                            : (data.profile?.skills as string) || ""
                        }
                        onChange={(e) => updateProfile("skills", chipify(e.target.value))}
                        placeholder="React, Node, DSA, MongoDB…"
                      />
                    ) : skills.length ? (
                      <div className={`${Inner} p-3`}>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-slate-700 bg-black/70 px-3 py-1 text-[11px] text-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-400`}>—</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <FieldLabel label="Interests" hint="Comma separated" icon={<RiSparkling2Line />} />
                    {edit.portfolio ? (
                      <input
                        className={InputBase}
                        value={
                          Array.isArray(data.profile?.interests)
                            ? toCSV(data.profile?.interests as string[])
                            : (data.profile?.interests as string) || ""
                        }
                        onChange={(e) => updateProfile("interests", chipify(e.target.value))}
                        placeholder="Web dev, ML, CP, UI design…"
                      />
                    ) : interests.length ? (
                      <div className={`${Inner} p-3`}>
                        <div className="flex flex-wrap gap-2">
                          {interests.map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-slate-700 bg-black/70 px-3 py-1 text-[11px] text-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`${Inner} p-3 text-sm text-slate-400`}>—</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { k: "linkedin", label: "LinkedIn URL", ph: "linkedin.com/in/…", isUrl: true },
                    { k: "github", label: "GitHub URL", ph: "github.com/…", isUrl: true },
                    { k: "portfolio", label: "Portfolio URL", ph: "your-site.com", isUrl: true },
                    { k: "otherSocials", label: "Other socials", ph: "Twitter, Instagram…", isUrl: false },
                  ].map((f) => {
                    const key = f.k as keyof ProfileMeta;
                    const value = (data.profile?.[key] as string) || "";
                    return (
                      <div key={f.k} className="space-y-2">
                        <FieldLabel label={f.label} icon={<RiLinksLine />} />
                        {edit.portfolio ? (
                          <input
                            className={InputBase}
                            value={value}
                            onChange={(e) => updateProfile(key, e.target.value)}
                            placeholder={f.ph}
                          />
                        ) : value ? (
                          <div className={`${Inner} p-3`}>
                            {f.isUrl ? (
                              <a
                                href={normalizeUrl(value)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200 transition"
                              >
                                <span className="truncate">
                                  {key === "linkedin"
                                    ? "LinkedIn profile"
                                    : key === "github"
                                    ? "GitHub profile"
                                    : "Portfolio / personal site"}
                                </span>
                                <RiExternalLinkLine className="shrink-0" />
                              </a>
                            ) : (
                              <p className="text-sm text-slate-200">{value}</p>
                            )}
                          </div>
                        ) : (
                          <div className={`${Inner} p-3 text-sm text-slate-400`}>—</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3">
                  <GradientRule />
                </div>

                {[
                  { k: "projects", label: "Projects", ph: "List your best projects (2–5)…" },
                  { k: "internships", label: "Internships", ph: "Company, role, dates, impact…" },
                  { k: "certificates", label: "Certificates", ph: "Certificate name + issuer…" },
                ].map((f) => {
                  const key = f.k as keyof ProfileMeta;
                  const value = (data.profile?.[key] as string) || "";
                  return (
                    <div key={f.k} className="space-y-2">
                      <FieldLabel label={f.label} icon={<RiInformationLine />} />
                      {edit.portfolio ? (
                        <textarea
                          className={TextareaBase}
                          value={value}
                          onChange={(e) => updateProfile(key, e.target.value)}
                          placeholder={f.ph}
                        />
                      ) : value ? (
                        <div className={`${Inner} p-4 text-sm text-slate-200 whitespace-pre-line`}>{value}</div>
                      ) : (
                        <div className={`${Inner} p-4 text-sm text-slate-400`}>—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>

            {/* Bottom actions */}
            {anyEditOn && (
              <div className={`${Card} p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className={Chip}>
                      <RiSparkling2Line className="text-sky-300" />
                      Tip: edit section-wise
                    </div>
                    <p className="text-xs text-slate-400">
                      Use <span className="text-slate-200 font-semibold">Save</span> to persist changes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={closeAllEdits}
                      className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition"
                    >
                      <span className="inline-flex items-center gap-2">
                        <RiCloseLine />
                        Close
                      </span>
                    </button>

                    <motion.button
                      onClick={handleSave}
                      disabled={!dirty || saving}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:bg-sky-400 active:scale-95 transition disabled:opacity-60"
                      whileTap={{ scale: 0.98 }}
                      animate={savePulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                      <RiSave3Line />
                      {saving ? "Saving…" : "Save"}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky save bar */}
      {dirty && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(1040px,92vw)]"
          animate={savePulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className={`${Card} px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-300/90" />
              <div>
                <p className="text-sm font-semibold text-slate-100">You have unsaved changes</p>
                <p className="text-xs text-slate-400">Save to update dashboards, leaderboards and career suite.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={resetToInitial}
                disabled={saving}
                className="rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <RiRefreshLine />
                  Reset
                </span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:bg-sky-400 active:scale-95 transition disabled:opacity-60"
              >
                <RiSave3Line />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xs sm:text-sm text-slate-500">
        CodeSync · Black + subtle neon · 2025
      </footer>
    </div>
  );
};

export default ProfilePage;
