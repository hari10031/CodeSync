// src/pages/ContestsPage.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  View,
  NavigateAction,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

/* ----------------- DATE LOCALIZER ----------------- */

const locales = {
  "en-US": enUS,
};

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
};

/* ----------------- HELPERS ----------------- */

function parseCode360Date(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  try {
    const [datePart, timePart] = dateStr.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [time, ampm] = timePart.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);
    if (ampm && ampm.toLowerCase() === "pm" && hours !== 12) hours += 12;
    if (ampm && ampm.toLowerCase() === "am" && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (e) {
    console.warn(`Could not parse Code360 date: ${dateStr}`);
    return new Date(0);
  }
}

function parseStandardDate(dateInput: string | number): Date {
  if (typeof dateInput === "number") return new Date(dateInput * 1000);
  if (typeof dateInput === "string") return new Date(dateInput);
  return new Date(0);
}

// Platform → color mapping (dark neon-ish)
const PLATFORM_COLORS: Record<string, string> = {
  leetcode: "#fbbf24", // amber-400
  codeforces: "#fb7185", // soft red
  codechef: "#f97316", // orange-500
  hackerrank: "#22c55e", // emerald-500
  atcoder: "#38bdf8", // sky-400
  hackerearth: "#6366f1", // indigo-500
  code360: "#e879f9", // fuchsia-400
  "code 360": "#e879f9",
};

/* ----------------- CUSTOM CALENDAR THEME ----------------- */
/* Scoped to .codesync-calendar so it doesn't affect other pages */

const calendarStyles = `
.codesync-calendar .rbc-month-view,
.codesync-calendar .rbc-time-view,
.codesync-calendar .rbc-agenda-view {
  border-radius: 18px;
  border: 1px solid rgba(30, 64, 175, 0.7);
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%),
    radial-gradient(circle at bottom right, rgba(236,72,153,0.12), transparent 55%),
    radial-gradient(circle at center, rgba(15,23,42,0.98), rgba(2,6,23,1));
}

/* Toolbar (Today / Back / Next / view buttons) */
.codesync-calendar .rbc-toolbar {
  padding: 8px 12px 10px;
  margin-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: rgba(15,23,42,0.92);
  border-bottom: 1px solid rgba(30,64,175,0.6);
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}

.codesync-calendar .rbc-toolbar button {
  border-radius: 999px;
  background-color: rgba(15,23,42,0.9);
  border: 1px solid rgba(51,65,85,0.9);
  color: #cbd5f5;
  font-size: 11px;
  padding: 3px 10px;
  transition: all 130ms ease-out;
}

.codesync-calendar .rbc-toolbar button:hover {
  border-color: rgba(56,189,248,0.8);
  color: #e5e7eb;
  box-shadow: 0 0 10px rgba(56,189,248,0.35);
}

.codesync-calendar .rbc-toolbar button.rbc-active,
.codesync-calendar .rbc-toolbar button:active {
  background: linear-gradient(135deg, #e5e7eb, #f9fafb);
  color: #020617;
  border-color: rgba(226,232,240,1);
  box-shadow: 0 0 14px rgba(148,163,184,0.7);
}

/* Month headers (Sun, Mon, ...) */
.codesync-calendar .rbc-header {
  background: transparent;
  border-bottom: 1px solid rgba(51,65,85,0.9);
  color: #9ca3af;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Day backgrounds */
.codesync-calendar .rbc-day-bg {
  background-color: rgba(3,7,18,0.96);
  border-right: 1px solid rgba(15,23,42,1);
}

.codesync-calendar .rbc-off-range-bg {
  background-color: rgba(15,23,42,0.96);
}

/* Today highlight */
.codesync-calendar .rbc-today {
  background: radial-gradient(circle at top, rgba(56,189,248,0.18), rgba(15,23,42,0.9));
  box-shadow: inset 0 0 0 1px rgba(56,189,248,0.35);
}

/* Date numbers */
.codesync-calendar .rbc-date-cell {
  color: #e5e7eb;
  font-size: 0.75rem;
}

/* Events */
.codesync-calendar .rbc-event {
  border-radius: 12px;
  border: none;
  color: #020617;
  font-weight: 500;
  font-size: 11px;
  box-shadow: 0 0 10px rgba(56,189,248,0.4);
}

.codesync-calendar .rbc-event:hover {
  filter: brightness(1.05);
  box-shadow: 0 0 14px rgba(56,189,248,0.65);
}

/* Popup for "+x more" */
.codesync-calendar .rbc-overlay {
  background: rgba(15,23,42,0.98);
  border-radius: 12px;
  border: 1px solid rgba(30,64,175,0.7);
  box-shadow: 0 18px 45px rgba(15,23,42,0.95);
  color: #e5e7eb;
}
.codesync-calendar .rbc-overlay-header {
  border-bottom: 1px solid rgba(51,65,85,0.9);
  padding: 8px 12px;
  font-size: 0.75rem;
}

/* Agenda view rows */
.codesync-calendar .rbc-agenda-table {
  border-color: rgba(30,64,175,0.6);
}
.codesync-calendar .rbc-agenda-date-cell,
.codesync-calendar .rbc-agenda-time-cell {
  color: #e5e7eb;
}
.codesync-calendar .rbc-agenda-event-cell {
  color: #e5e7eb;
}
`;

/* ----------------- MAIN COMPONENT ----------------- */

const ContestsPage: React.FC = () => {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  /* ----------------- FETCH CONTESTS ----------------- */

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/contests");
        if (!response.ok)
          throw new Error(`Failed to fetch: ${response.statusText}`);
        const data = await response.json();

        const codolio: CalendarEvent[] = (data.data || []).map(
          (c: CodolioContest) => ({
            title: c.contestName,
            start: new Date(c.contestStartDate),
            end: new Date(c.contestEndDate),
            platform: c.platform,
            url: c.contestUrl,
          })
        );

        const hackerrank: CalendarEvent[] = (data.hackerrank || []).map(
          (c: HackerRankContest) => ({
            title: c.name,
            start: parseStandardDate(c.start_time),
            end: parseStandardDate(c.end_time),
            platform: "HackerRank",
            url: c.microsite_url,
          })
        );

        const code360: CalendarEvent[] = (data.code360 || []).map(
          (c: Code360Contest) => ({
            title: c.name,
            start: parseCode360Date(c.start_time),
            end: parseCode360Date(c.end_time),
            platform: "Code360",
            url: c.url,
          })
        );

        const combined: CalendarEvent[] = [...codolio, ...hackerrank, ...code360];

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

  /* ----------------- FILTERING ----------------- */

  useEffect(() => {
    if (selectedPlatform === "all") {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(
        allEvents.filter((event) => event.platform === selectedPlatform)
      );
    }
  }, [selectedPlatform, allEvents]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlatform(e.target.value);
  };

  /* ----------------- CALENDAR HANDLERS ----------------- */

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.url) {
      window.open(event.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleNavigate = useCallback(
    (newDate: Date, _view?: View, _action?: NavigateAction) => {
      setDate(newDate);
    },
    []
  );

  const handleView = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const key = event.platform.toLowerCase().replace(/\s+/g, "");
    const colorKey =
      Object.keys(PLATFORM_COLORS).find(
        (k) => k.replace(/\s+/g, "") === key
      ) || "default";

    const bgColor =
      PLATFORM_COLORS[colorKey] ??
      "#38bdf8"; // fallback sky-400 if platform not mapped

    return {
      style: {
        backgroundColor: bgColor,
        borderRadius: "0.75rem",
        border: "none",
        color: "#020617", // near-black for contrast
        fontSize: "0.75rem",
        padding: "2px 6px",
        opacity: 0.98,
      },
      className:
        "!border-none !shadow-[0_0_10px_rgba(56,189,248,0.45)] hover:!opacity-100 transition-all duration-150",
    };
  }, []);

  /* ----------------- UI STATES ----------------- */

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#050509] text-slate-100 flex items-center justify-center">
        <div className="rounded-3xl border border-slate-800 bg-black/90 px-6 py-4 flex items-center gap-3 shadow-[0_0_25px_rgba(15,23,42,0.8)]">
          <div className="h-3 w-3 rounded-full bg-sky-400 animate-ping" />
          <p className="text-sm text-slate-300">
            Fetching live contests across platforms…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#050509] text-slate-100 flex items-center justify-center">
        <div className="rounded-3xl border border-rose-700/70 bg-black/90 px-6 py-4 shadow-[0_0_25px_rgba(127,29,29,0.8)]">
          <p className="text-sm text-rose-300">
            Error while loading contests: {error}
          </p>
        </div>
      </div>
    );
  }

  /* ----------------- RENDER ----------------- */

  return (
    <div className="min-h-screen w-full bg-[#050509] text-slate-100 font-display">
      {/* Inject our scoped calendar CSS */}
      <style dangerouslySetInnerHTML={{ __html: calendarStyles }} />

      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-3 py-1 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              CodeSync · Contests Calendar
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Every contest,{" "}
              <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                one calm view.
              </span>
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-300">
              Upcoming and ongoing contests stitched from LeetCode, Codeforces,
              CodeChef, HackerRank, Code360 and more — so you can plan your
              month without juggling tabs.
            </p>
          </div>

          {/* Filter */}
          <div className="flex flex-col items-start md:items-end gap-1">
            <label
              htmlFor="platformFilter"
              className="text-[11px] uppercase tracking-[0.2em] text-slate-500"
            >
              Filter by platform
            </label>
            <select
              id="platformFilter"
              value={selectedPlatform}
              onChange={handleFilterChange}
              className="mt-1 rounded-full border border-slate-700 bg-[#050509] px-4 py-2 text-xs sm:text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
            >
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform === "all" ? "All Platforms" : platform}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="mt-8 rounded-3xl border border-slate-800 bg-black/90 p-3 sm:p-5 shadow-[0_0_30px_rgba(15,23,42,0.9)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="inline-flex items-center gap-2 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live sync every 12 hours
            </div>
            <div className="flex gap-1.5">
              <span className="h-1 w-4 rounded-full bg-sky-400/80" />
              <span className="h-1 w-4 rounded-full bg-fuchsia-400/80" />
              <span className="h-1 w-4 rounded-full bg-emerald-400/80" />
            </div>
          </div>

          <div className="codesync-calendar h-[70vh] rounded-2xl border border-slate-800 bg-[#020617]/90 p-2 sm:p-3 overflow-hidden">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              popup
              date={date}
              view={view}
              onNavigate={handleNavigate}
              onView={handleView}
              className="text-[10px] sm:text-xs md:text-sm !bg-transparent !text-slate-100"
            />
          </div>
        </div>

        {/* Small legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-400">
          <span className="text-slate-500">Legend:</span>
          <LegendDot label="LeetCode" colorClass="bg-amber-400" />
          <LegendDot label="Codeforces" colorClass="bg-rose-400" />
          <LegendDot label="CodeChef" colorClass="bg-orange-500" />
          <LegendDot label="HackerRank" colorClass="bg-emerald-500" />
          <LegendDot label="AtCoder" colorClass="bg-sky-400" />
          <LegendDot label="Code360" colorClass="bg-fuchsia-400" />
        </div>
      </section>
    </div>
  );
};

export default ContestsPage;

/* ----------------- SMALL LEGEND COMPONENT ----------------- */

function LegendDot({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#050509] px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </span>
  );
}
