// src/pages/ContestsPage.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  View,
  NavigateAction,
  EventProps,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMinutes,
  isValid,
  differenceInMinutes,
} from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  RiCalendarEventLine,
  RiExternalLinkLine,
  RiFileCopy2Line,
  RiCloseLine,
  RiFilter3Line,
  RiSparkling2Line,
} from "react-icons/ri";

/* ----------------- DATE LOCALIZER ----------------- */

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/* ----------------- TYPES ----------------- */

type CodolioContest = {
  platform: string;
  contestName: string;
  contestStartDate: string;
  contestEndDate: string;
  contestUrl: string;
};

type HackerRankContest = {
  name: string;
  start_time: string | number;
  end_time: string | number;
  microsite_url: string;
};

type Code360Contest = {
  name: string;
  start_time: string;
  end_time: string;
  url: string;
};

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  platform: string;
  url: string;

  meta?: {
    realEnd: Date;
    durationMin: number;
    platformKey: string;
  };
};

/* ----------------- PLATFORM COLORS (MATCH LANDING PAGE) ----------------- */
/**
 * Matches your LandingPage PLATFORMS array:
 * violet-300, sky-300, orange-300, slate-100, emerald-300, amber-300, cyan-300, blue-300, pink-300
 */
const PLATFORM_COLORS: Record<string, string> = {
  leetcode: "#C4B5FD", // violet-300
  codeforces: "#7DD3FC", // sky-300
  codechef: "#FDBA74", // orange-300
  github: "#F1F5F9", // slate-100
  geeksforgeeks: "#6EE7B7", // emerald-300
  gfg: "#6EE7B7", // emerald-300
  hackerrank: "#FCD34D", // amber-300
  atcoder: "#67E8F9", // cyan-300
  hackerearth: "#93C5FD", // blue-300
  code360: "#F9A8D4", // pink-300
  "code 360": "#F9A8D4",
};

/* ----------------- HELPERS ----------------- */

function platformKey(p: string) {
  return (p || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizePlatformLabel(p: string) {
  const k = platformKey(p);

  if (k === "code360" || k === "code360bycodingninjas" || k === "code360cn")
    return "Code360";
  if (k === "codingninjas" || k === "code360codingninjas") return "Code360";

  if (k === "hackerrank") return "HackerRank";
  if (k === "codechef") return "CodeChef";
  if (k === "codeforces") return "Codeforces";
  if (k === "leetcode") return "LeetCode";
  if (k === "atcoder") return "AtCoder";
  if (k === "hackerearth") return "HackerEarth";
  if (k === "github") return "GitHub";
  if (k === "geeksforgeeks" || k === "gfg") return "GeeksforGeeks";

  return p?.trim() || "Unknown";
}

function getColorForPlatform(platformLabel: string) {
  const key = platformKey(platformLabel);
  const found =
    Object.keys(PLATFORM_COLORS).find((k) => platformKey(k) === key) || "";
  return PLATFORM_COLORS[found] ?? "#7DD3FC";
}

function safeDate(d: Date) {
  return d instanceof Date && isValid(d) ? d : null;
}

/** Ensure end > start; if not, apply min duration */
function clampEnd(start: Date, end: Date, minMinutes = 20) {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s) return null;
  if (!e) return { start: s, end: addMinutes(s, minMinutes) };
  if (e.getTime() <= s.getTime()) return { start: s, end: addMinutes(s, minMinutes) };
  return { start: s, end: e };
}

/**
 * Code360 date example: "DD/MM/YYYY, HH:MM:SS AM"
 */
function parseCode360Date(dateStr: string): Date {
  if (!dateStr) return new Date("invalid");
  try {
    const [datePartRaw, timePartRaw] = dateStr.split(",").map((x) => x.trim());
    if (!datePartRaw || !timePartRaw) return new Date("invalid");

    const [day, month, year] = datePartRaw.split("/").map(Number);
    const parts = timePartRaw.split(" ");
    const time = parts[0];
    const ampm = (parts[1] || "").toLowerCase();

    const t = time.split(":").map(Number);
    let hours = t[0] ?? 0;
    const minutes = t[1] ?? 0;
    const seconds = t[2] ?? 0;

    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch {
    return new Date("invalid");
  }
}

function parseStandardDate(dateInput: string | number): Date {
  if (typeof dateInput === "number") return new Date(dateInput * 1000);
  if (typeof dateInput === "string") return new Date(dateInput);
  return new Date("invalid");
}

/** Dedupe by platform + title + start */
function dedupeEvents(events: CalendarEvent[]) {
  const seen = new Set<string>();
  const out: CalendarEvent[] = [];
  for (const e of events) {
    const k = `${platformKey(e.platform)}|${e.title.trim().toLowerCase()}|${e.start.toISOString()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function shortTitle(t: string, max = 30) {
  const s = (t || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * ✅ Proper mapping across views:
 * - MONTH: shorten end for clean cells
 * - WEEK/DAY/AGENDA: keep real timing (true duration)
 */
function toDisplayEventForView(e: CalendarEvent, view: View): CalendarEvent {
  if (view === Views.MONTH) {
    return { ...e, end: addMinutes(e.start, 18) }; // short “chip”
  }
  return e; // real end
}

/* ----------------- CUSTOM CALENDAR THEME ----------------- */

const calendarStyles = `
.codesync-calendar .rbc-month-view,
.codesync-calendar .rbc-time-view,
.codesync-calendar .rbc-agenda-view {
  border-radius: 20px;
  border: 1px solid rgba(51,65,85,0.78);
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 10%, rgba(56,189,248,0.10), transparent 45%),
    radial-gradient(circle at 85% 85%, rgba(168,85,247,0.10), transparent 45%),
    radial-gradient(circle at 60% 35%, rgba(249,168,212,0.08), transparent 55%),
    rgba(2,6,23,0.88);
  box-shadow: 0 0 35px rgba(15,23,42,0.85);
}

/* toolbar */
.codesync-calendar .rbc-toolbar{
  padding: 12px;
  margin-bottom: 0;
  background: linear-gradient(90deg, rgba(0,0,0,0.72), rgba(5,8,21,0.72), rgba(0,0,0,0.72));
  border-bottom: 1px solid rgba(51,65,85,0.75);
}
.codesync-calendar .rbc-toolbar .rbc-toolbar-label{
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(148,163,184,0.95);
}
.codesync-calendar .rbc-toolbar button{
  border-radius: 999px;
  background: rgba(2,6,23,0.85);
  border: 1px solid rgba(51,65,85,0.85);
  color: rgba(226,232,240,0.92);
  font-size: 11px;
  padding: 6px 10px;
  transition: transform 130ms ease-out, box-shadow 130ms ease-out, border-color 130ms ease-out, filter 130ms ease-out;
}
.codesync-calendar .rbc-toolbar button:hover{
  border-color: rgba(125,211,252,0.70);
  box-shadow: 0 0 16px rgba(125,211,252,0.18);
  transform: translateY(-1px);
}
.codesync-calendar .rbc-toolbar button.rbc-active,
.codesync-calendar .rbc-toolbar button:active{
  background: linear-gradient(90deg, #7dd3fc, #c4b5fd, #f9a8d4);
  color: #020617;
  border-color: rgba(226,232,240,0.0);
  box-shadow: 0 0 22px rgba(196,181,253,0.35);
}

/* headers */
.codesync-calendar .rbc-header{
  background: rgba(2,6,23,0.55);
  border-bottom: 1px solid rgba(51,65,85,0.75);
  color: rgba(148,163,184,0.95);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* days */
.codesync-calendar .rbc-day-bg{
  background: rgba(2,6,23,0.86);
  border-right: 1px solid rgba(15,23,42,0.95);
}
.codesync-calendar .rbc-off-range-bg{ background: rgba(15,23,42,0.80); }
.codesync-calendar .rbc-today{
  background: radial-gradient(circle at top, rgba(125,211,252,0.14), rgba(15,23,42,0.86));
  box-shadow: inset 0 0 0 1px rgba(125,211,252,0.28);
}
.codesync-calendar .rbc-date-cell{ color: rgba(226,232,240,0.92); font-size: 12px; }

/* base event reset */
.codesync-calendar .rbc-event {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
}
.codesync-calendar .rbc-event:focus,
.codesync-calendar .rbc-event:active { outline: none !important; }

/* ---- SMALLER EVENT CHIP (reduced size) ---- */
.cs-event-chip{
  position: relative;
  display: block;
  border-radius: 12px;
  padding: 1px 6px;            /* smaller */
  min-height: 14px;            /* smaller */
  cursor: pointer;
  user-select: none;
  transition: transform 140ms ease-out, filter 140ms ease-out, box-shadow 140ms ease-out;
  box-shadow: 0 0 0 1px rgba(148,163,184,0.14), 0 10px 26px rgba(2,6,23,0.45);
}
.cs-event-chip:hover{
  transform: translateY(-1px) scale(1.02);
  filter: brightness(1.04);
  box-shadow: 0 0 0 1px rgba(125,211,252,0.22), 0 0 16px rgba(125,211,252,0.10), 0 18px 45px rgba(2,6,23,0.55);
}
.cs-event-row{ display:flex; align-items:center; gap:6px; min-width:0; }
.cs-event-tag{
  font-size:9px;
  font-weight:900;
  letter-spacing:0.10em;
  padding:1px 6px;
  border-radius:999px;
  border:1px solid rgba(2,6,23,0.18);
  background: rgba(255,255,255,0.60);
  color: rgba(2,6,23,0.95);
}
.cs-event-title{
  min-width:0;
  font-size:10px;              /* smaller */
  font-weight:850;
  line-height:1.05;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  color: rgba(2,6,23,0.96);
}

/* Tooltip */
.cs-event-tip{
  pointer-events: none;
  position: absolute;
  z-index: 50;
  left: 0;
  top: calc(100% + 8px);
  width: max-content;
  max-width: 340px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(51,65,85,0.80);
  background:
    radial-gradient(circle at 12% 10%, rgba(125,211,252,0.10), transparent 55%),
    radial-gradient(circle at 85% 85%, rgba(196,181,253,0.10), transparent 55%),
    rgba(2,6,23,0.96);
  box-shadow: 0 22px 70px rgba(0,0,0,0.65);
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  transition: opacity 140ms ease-out, transform 140ms ease-out;
}
.cs-event-chip:hover .cs-event-tip{ opacity: 1; transform: translateY(0) scale(1); }
.cs-event-tip .kicker{ font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(148,163,184,0.9); }
.cs-event-tip .name{ margin-top: 6px; font-size: 12px; font-weight: 900; color: rgba(226,232,240,0.95); }
.cs-event-tip .meta{ margin-top: 8px; font-size: 11px; color: rgba(203,213,225,0.9); display:flex; gap:8px; flex-wrap:wrap; }
.cs-pill{ display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border-radius:999px; border:1px solid rgba(51,65,85,0.70); background: rgba(15,23,42,0.55); }
.cs-dot{ width:8px; height:8px; border-radius:999px; }

/* Center modal */
.cs-modal-overlay{
  position: fixed; inset: 0; z-index: 80;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(7px);
  opacity: 0; pointer-events: none;
  transition: opacity 160ms ease-out;
}
.cs-modal-overlay.open{ opacity: 1; pointer-events: auto; }

.cs-modal{
  position: fixed;
  left: 50%; top: 50%;
  transform: translate(-50%,-46%) scale(0.98);
  width: min(540px, 92vw);
  z-index: 90;
  border-radius: 22px;
  border: 1px solid rgba(51,65,85,0.82);
  background:
    radial-gradient(circle at 12% 10%, rgba(125,211,252,0.10), transparent 45%),
    radial-gradient(circle at 85% 85%, rgba(196,181,253,0.10), transparent 45%),
    radial-gradient(circle at 60% 35%, rgba(249,168,212,0.08), transparent 55%),
    rgba(2,6,23,0.96);
  box-shadow: 0 35px 110px rgba(0,0,0,0.70);
  opacity: 0; pointer-events: none;
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}
.cs-modal.open{
  opacity: 1; pointer-events: auto;
  transform: translate(-50%,-50%) scale(1);
}
`;

/* ----------------- EVENT CHIP ----------------- */

function EventChip({ event }: EventProps<CalendarEvent>) {
  const base = getColorForPlatform(event.platform);
  const chipBg = `linear-gradient(135deg, ${base} 0%, rgba(255,255,255,0.92) 220%)`;

  const realEnd = event.meta?.realEnd ?? event.end;
  const timeText = `${format(event.start, "MMM d, h:mm a")} → ${format(realEnd, "MMM d, h:mm a")}`;

  const tag = platformKey(event.platform).slice(0, 2).toUpperCase();

  return (
    <div className="cs-event-chip" style={{ background: chipBg }}>
      <div className="cs-event-row">
        <span className="cs-event-tag">{tag}</span>
        <div className="cs-event-title">{shortTitle(event.title)}</div>
      </div>

      <div className="cs-event-tip">
        <div className="kicker">Contest</div>
        <div className="name">{event.title}</div>
        <div className="meta">
          <span className="cs-pill">
            <span className="cs-dot" style={{ background: base }} />
            <span>{event.platform}</span>
          </span>
          <span className="cs-pill">{timeText}</span>
          <span className="cs-pill">Click for details</span>
        </div>
      </div>
    </div>
  );
}

/* ----------------- MAIN COMPONENT ----------------- */

const ContestsPage: React.FC = () => {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);

  /* ----------------- FETCH + MAP (ALL SECTIONS) ----------------- */
  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/contests");
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
        const data = await response.json();

        // Codolio: includes multi-platform contests (LeetCode/CF/CC/AtCoder/HE/GFG etc.)
        const codolio: CalendarEvent[] = (data.data || [])
          .map((c: CodolioContest) => {
            const startRaw = new Date(c.contestStartDate);
            const endRaw = new Date(c.contestEndDate);
            const fixed = clampEnd(startRaw, endRaw, 20);
            if (!fixed) return null;

            const pl = normalizePlatformLabel(c.platform);
            const dur = Math.max(1, differenceInMinutes(fixed.end, fixed.start));

            return {
              title: (c.contestName || "Contest").trim(),
              start: fixed.start,
              end: fixed.end,
              platform: pl,
              url: c.contestUrl,
              meta: { realEnd: fixed.end, durationMin: dur, platformKey: platformKey(pl) },
            } as CalendarEvent;
          })
          .filter(Boolean) as CalendarEvent[];

        // HackerRank endpoint
        const hackerrank: CalendarEvent[] = (data.hackerrank || [])
          .map((c: HackerRankContest) => {
            const startRaw = parseStandardDate(c.start_time);
            const endRaw = parseStandardDate(c.end_time);
            const fixed = clampEnd(startRaw, endRaw, 20);
            if (!fixed) return null;

            const pl = "HackerRank";
            const dur = Math.max(1, differenceInMinutes(fixed.end, fixed.start));

            return {
              title: (c.name || "Contest").trim(),
              start: fixed.start,
              end: fixed.end,
              platform: pl,
              url: c.microsite_url,
              meta: { realEnd: fixed.end, durationMin: dur, platformKey: platformKey(pl) },
            } as CalendarEvent;
          })
          .filter(Boolean) as CalendarEvent[];

        // Code360 endpoint
        const code360: CalendarEvent[] = (data.code360 || [])
          .map((c: Code360Contest) => {
            const startRaw = parseCode360Date(c.start_time);
            const endRaw = parseCode360Date(c.end_time);
            const fixed = clampEnd(startRaw, endRaw, 20);
            if (!fixed) return null;

            const pl = "Code360";
            const dur = Math.max(1, differenceInMinutes(fixed.end, fixed.start));

            return {
              title: (c.name || "Contest").trim(),
              start: fixed.start,
              end: fixed.end,
              platform: pl,
              url: c.url,
              meta: { realEnd: fixed.end, durationMin: dur, platformKey: platformKey(pl) },
            } as CalendarEvent;
          })
          .filter(Boolean) as CalendarEvent[];

        const combined = dedupeEvents([...codolio, ...hackerrank, ...code360]).sort(
          (a, b) => a.start.getTime() - b.start.getTime()
        );

        const platformSet = new Set(combined.map((c) => c.platform));
        setPlatforms(["all", ...Array.from(platformSet).sort()]);

        setAllEvents(combined);
        setFilteredEvents(combined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  /* ----------------- FILTER ----------------- */
  useEffect(() => {
    if (selectedPlatform === "all") setFilteredEvents(allEvents);
    else setFilteredEvents(allEvents.filter((e) => e.platform === selectedPlatform));
  }, [selectedPlatform, allEvents]);

  /* ----------------- VIEW AWARE EVENTS ----------------- */
  const displayEvents = useMemo(() => {
    return filteredEvents.map((e) => toDisplayEventForView(e, view));
  }, [filteredEvents, view]);

  /* ----------------- OPEN MODAL ----------------- */
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setActiveEvent(event);
    setModalOpen(true);
    setCopied(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => setActiveEvent(null), 160);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => closeBtnRef.current?.focus(), 0);
  }, [modalOpen]);

  const handleNavigate = useCallback(
    (newDate: Date, _view?: View, _action?: NavigateAction) => setDate(newDate),
    []
  );

  const handleView = useCallback((newView: View) => setView(newView), []);

  const eventPropGetter = useCallback((_event: CalendarEvent) => {
    return {
      style: { backgroundColor: "transparent", border: "none", padding: 0 },
      className: "!bg-transparent !p-0 !border-none",
    };
  }, []);

  const components = useMemo(() => ({ event: EventChip }), []);

  const openContestLink = () => {
    if (activeEvent?.url) window.open(activeEvent.url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (!activeEvent?.url) return;
    try {
      await navigator.clipboard.writeText(activeEvent.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  /* ----------------- UI STATES ----------------- */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-3xl border border-slate-800 bg-black/70 backdrop-blur-xl px-6 py-4 flex items-center gap-3 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
          <div className="h-3 w-3 rounded-full bg-sky-300 animate-ping" />
          <p className="text-sm text-slate-300">Fetching live contests across platforms…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-3xl border border-rose-700/70 bg-black/70 backdrop-blur-xl px-6 py-4 shadow-[0_0_40px_rgba(127,29,29,0.35)]">
          <p className="text-sm text-rose-300">Error while loading contests: {error}</p>
        </div>
      </div>
    );
  }

  /* ----------------- MODAL DATA (REAL TIMINGS ALWAYS) ----------------- */
  const modalPlatform = activeEvent?.platform || "";
  const modalColor = getColorForPlatform(modalPlatform);
  const modalStart = activeEvent?.start;
  const modalRealEnd = activeEvent?.meta?.realEnd ?? activeEvent?.end;
  const modalDuration =
    activeEvent?.meta?.durationMin ??
    (modalStart && modalRealEnd
      ? Math.max(1, differenceInMinutes(modalRealEnd, modalStart))
      : 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 p-6 sm:p-10 relative overflow-hidden text-[13px] sm:text-[14px]">
      <style dangerouslySetInnerHTML={{ __html: calendarStyles }} />

      {/* glows */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute right-[-10%] top-[-15%] h-80 w-80 rounded-full bg-sky-500/25 blur-[120px]" />
        <div className="absolute left-[-10%] bottom-[-20%] h-80 w-80 rounded-full bg-fuchsia-500/25 blur-[120px]" />
      </div>

      {/* header */}
      <div className="relative mb-8 sm:mb-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/70 px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          CodeSync · Contests
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
          Contest{" "}
          <span className="bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] text-transparent bg-clip-text">
            Calendar
          </span>
        </h1>

        <p className="mt-2 text-[13px] sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Month view stays clean. Week/Day show real timings. Click any contest for details.
        </p>
      </div>

      {/* controls */}
      <div className="relative w-full max-w-6xl mx-auto mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="rounded-2xl border border-slate-800 bg-black/60 backdrop-blur-xl px-4 py-3 shadow-[0_0_30px_rgba(15,23,42,0.85)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 border border-slate-700 text-sky-300">
              <RiCalendarEventLine className="text-xl" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-slate-100">Live contest aggregation</p>
              <p className="text-[10px] text-slate-500">
                {allEvents.length} events • Month / Week / Day / Agenda
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-black/60 backdrop-blur-xl px-4 py-3 shadow-[0_0_30px_rgba(15,23,42,0.85)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            <RiFilter3Line className="text-base" />
            Filter
          </div>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="rounded-full border border-slate-700 bg-[#050509] px-4 py-2 text-xs sm:text-sm text-slate-100 outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-400"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All Platforms" : p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* calendar */}
      <div className="relative w-full max-w-6xl mx-auto rounded-3xl border border-slate-800 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_rgba(15,23,42,0.9)] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800/80 bg-gradient-to-r from-black via-[#050815] to-black">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
            <RiSparkling2Line className="text-base text-sky-300" />
            Calendar
          </div>
        </div>

        <div className="p-3 sm:p-5">
          <div className="codesync-calendar h-[72vh] rounded-2xl border border-slate-800 bg-[#020617]/70 p-2 sm:p-3 overflow-hidden">
            <Calendar
              localizer={localizer}
              events={displayEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              components={components}
              popup
              dayLayoutAlgorithm="no-overlap"
              date={date}
              view={view}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              onNavigate={handleNavigate}
              onView={handleView}
              className="text-[10px] sm:text-xs md:text-sm !bg-transparent !text-slate-100"
              messages={{ showMore: (total) => `+${total} more` }}
            />
          </div>

          {/* legend = exact landing palette */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="text-slate-500">Legend:</span>
            <LegendDot label="LeetCode" color={PLATFORM_COLORS.leetcode} />
            <LegendDot label="Codeforces" color={PLATFORM_COLORS.codeforces} />
            <LegendDot label="CodeChef" color={PLATFORM_COLORS.codechef} />
            <LegendDot label="HackerRank" color={PLATFORM_COLORS.hackerrank} />
            <LegendDot label="AtCoder" color={PLATFORM_COLORS.atcoder} />
            <LegendDot label="HackerEarth" color={PLATFORM_COLORS.hackerearth} />
            <LegendDot label="Code360" color={PLATFORM_COLORS.code360} />
          </div>
        </div>
      </div>

      {/* modal */}
      <div
        className={`cs-modal-overlay ${modalOpen ? "open" : ""}`}
        onClick={closeModal}
      />
      <aside className={`cs-modal ${modalOpen ? "open" : ""}`} aria-hidden={!modalOpen}>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[11px] text-slate-200">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: modalColor, boxShadow: `0 0 18px ${modalColor}55` }}
                  />
                  {modalPlatform || "Contest"}
                </span>
                <span className="text-[11px] text-slate-500">•</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/30 px-3 py-1 text-[11px] text-slate-300">
                  {modalDuration} min
                </span>
              </div>

              <h2 className="mt-3 text-base sm:text-lg font-black tracking-tight text-slate-100 break-words">
                {activeEvent?.title || "—"}
              </h2>

              <p className="mt-1.5 text-xs text-slate-400">
                {modalStart && modalRealEnd
                  ? `${format(modalStart, "EEE, MMM d • h:mm a")} → ${format(
                      modalRealEnd,
                      "EEE, MMM d • h:mm a"
                    )}`
                  : "—"}
              </p>
            </div>

            <button
              ref={closeBtnRef}
              onClick={closeModal}
              className="rounded-xl border border-slate-700 bg-black/40 p-2 text-slate-200 hover:border-sky-300/60 transition"
              title="Close (Esc)"
            >
              <RiCloseLine className="text-lg" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-black/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Quick details
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoCard label="Platform" value={modalPlatform || "—"} />
              <InfoCard label="Duration" value={`${modalDuration} min`} />
              <InfoCard
                label="Starts"
                value={modalStart ? format(modalStart, "MMM d, h:mm a") : "—"}
              />
              <InfoCard
                label="Ends"
                value={modalRealEnd ? format(modalRealEnd, "MMM d, h:mm a") : "—"}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={openContestLink}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-black bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] shadow-[0_0_22px_rgba(168,85,247,0.55)] hover:brightness-110 active:scale-95 transition"
            >
              Open contest <RiExternalLinkLine className="text-base" />
            </button>

            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-black/35 px-4 py-2 text-[13px] font-semibold text-slate-200 hover:border-sky-300/60 active:scale-95 transition"
            >
              {copied ? "Copied" : "Copy link"} <RiFileCopy2Line className="text-base" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ContestsPage;

/* ----------------- SMALL UI ----------------- */

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 14px ${color}22` }}
      />
      <span className="text-[11px] text-slate-300">{label}</span>
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-100">{value}</div>
    </div>
  );
}