// src/pages/ResourcesPage.tsx
import React, { useState } from "react";
import {
  RiBookOpenLine,
  RiCodeBoxLine,
  RiStarSmileLine,
  RiExternalLinkLine,
} from "react-icons/ri";

type Level = "Beginner" | "Intermediate" | "Advanced";

type Track =
  | "DSA"
  | "Web Dev"
  | "CP"
  | "CS Core"
  | "System Design"
  | "Misc";

type Resource = {
  id: number;
  title: string;
  platform: string;
  author: string;
  level: Level;
  track: Track;
  duration: string;
  format: "Video" | "Playlist" | "Course" | "Interactive";
  url: string;
  highlight: string;
  badge?: string;
};

const RESOURCES: Resource[] = [
  {
    id: 1,
    title: "Data Structures & Algorithms in Python",
    platform: "freeCodeCamp",
    author: "freeCodeCamp.org",
    level: "Beginner",
    track: "DSA",
    duration: "8–10 hours",
    format: "Playlist",
    url: "https://www.youtube.com/watch?v=pkYVOmU3MgA",
    highlight:
      "Gentle DSA introduction with visuals and dry-run style explanations.",
    badge: "Great first DSA course",
  },
  {
    id: 2,
    title: "Striver’s A2Z DSA Sheet (Playlist)",
    platform: "takeUforward",
    author: "Raj Vikramaditya (Striver)",
    level: "Intermediate",
    track: "DSA",
    duration: "Long term roadmap",
    format: "Playlist",
    url: "https://takeuforward.org/strivers-a2z-dsa-course/ ",
    highlight:
      "Most popular DSA roadmap for interviews & online contests, topic-wise progression.",
    badge: "Interview focused",
  },
  {
    id: 3,
    title: "CS50: Introduction to Computer Science",
    platform: "Harvard / edX",
    author: "David J. Malan",
    level: "Beginner",
    track: "CS Core",
    duration: "8–12 weeks",
    format: "Course",
    url: "https://cs50.harvard.edu/x/",
    highlight:
      "Iconic course that builds strong CS fundamentals: C, memory, algorithms, web, more.",
    badge: "Legendary course",
  },
  {
    id: 4,
    title: "Full Modern Web Dev (HTML, CSS, JS, React)",
    platform: "freeCodeCamp",
    author: "freeCodeCamp.org",
    level: "Beginner",
    track: "Web Dev",
    duration: "Certified path",
    format: "Interactive",
    url: "https://www.freecodecamp.org/learn/",
    highlight:
      "Hands-on certification paths with projects: responsive web, JS, front-end frameworks.",
    badge: "Project based",
  },
  {
    id: 5,
    title: "Java + DSA + Interview Preparation",
    platform: "Kunal Kushwaha",
    author: "Kunal Kushwaha",
    level: "Intermediate",
    track: "DSA",
    duration: "Long term roadmap",
    format: "Playlist",
    url: "https://www.youtube.com/playlist?list=PL9gnSGHSqcnoqBXdMwUTRod4Gi3eac2Ak",
    highlight:
      "Java-focused DSA playlist with clear explanations, great for product-based prep.",
    badge: "Java friendly",
  },
  {
    id: 6,
    title: "Competitive Programming Course",
    platform: "CodeChef",
    author: "CodeChef / multiple mentors",
    level: "Intermediate",
    track: "CP",
    duration: "Self-paced",
    format: "Course",
    url: "https://www.codechef.com/certification/data-structures-and-algorithms/prepare",
    highlight:
      "Designed to practice problem-solving patterns for CodeChef/Codeforces style contests.",
    badge: "Contest oriented",
  },
  {
    id: 7,
    title: "System Design Primer",
    platform: "GitHub",
    author: "Donne Martin",
    level: "Advanced",
    track: "System Design",
    duration: "Reference",
    format: "Course",
    url: "https://github.com/donnemartin/system-design-primer",
    highlight:
      "Go-to GitHub repo for system design concepts, diagrams and interview-style problems.",
    badge: "Must-read repo",
  },
  {
    id: 8,
    title: "Operating Systems Concepts (Playlist)",
    platform: "Gate Smashers",
    author: "Gate Smashers",
    level: "Intermediate",
    track: "CS Core",
    duration: "Semester coverage",
    format: "Playlist",
    url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
    highlight:
      "Exam + interview friendly OS explanations: CPU scheduling, memory, deadlocks and more.",
    badge: "Exam + interview",
  },
  {
    id: 9,
    title: "JavaScript Algorithms and Data Structures",
    platform: "freeCodeCamp",
    author: "freeCodeCamp.org",
    level: "Beginner",
    track: "DSA",
    duration: "Certification",
    format: "Interactive",
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
    highlight:
      "Perfect if you want DSA but love JavaScript. Includes coding challenges and projects.",
  },
  {
    id: 10,
    title: "Frontend Developer Roadmap",
    platform: "roadmap.sh",
    author: "roadmap.sh",
    level: "Beginner",
    track: "Web Dev",
    duration: "Visual roadmap",
    format: "Course",
    url: "https://roadmap.sh/frontend",
    highlight:
      "Visual roadmap for what to learn in frontend: HTML, CSS, JS, frameworks, tools.",
  },
];

const LEVEL_FILTERS: (Level | "All")[] = ["All", "Beginner", "Intermediate", "Advanced"];

const TRACK_FILTERS: (Track | "All")[] = [
  "All",
  "DSA",
  "Web Dev",
  "CP",
  "CS Core",
  "System Design",
  "Misc",
];

const ResourcesPage: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<Level | "All">("All");
  const [trackFilter, setTrackFilter] = useState<Track | "All">("All");
  const [search, setSearch] = useState("");

  const filteredResources = RESOURCES.filter((res) => {
    const matchesLevel = levelFilter === "All" || res.level === levelFilter;
    const matchesTrack = trackFilter === "All" || res.track === trackFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      res.title.toLowerCase().includes(q) ||
      res.platform.toLowerCase().includes(q) ||
      res.author.toLowerCase().includes(q);
    return matchesLevel && matchesTrack && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#050509] text-slate-100 relative overflow-hidden">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-sky-500/40 blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[-2rem] h-72 w-72 rounded-full bg-fuchsia-500/35 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-8 lg:px-16">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-4 py-1 text-[11px] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CodeSync · Resources Hub
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                Curated{" "}
                <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#fb7185)] bg-clip-text">
                  free courses
                </span>{" "}
                to level up your coding.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Hand-picked playlists, interactive courses and roadmaps for{" "}
                <span className="text-sky-300">
                  DSA, competitive programming, web dev and core CS
                </span>
                . All free, all worth your time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 border border-slate-800">
                <RiBookOpenLine className="text-sky-400" />
                <span>{RESOURCES.length}+ handpicked resources</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 border border-slate-800">
                <RiStarSmileLine className="text-amber-300" />
                <span>Beginner → Advanced friendly</span>
              </span>
            </div>
          </div>

          {/* Small side note card */}
          <div className="mt-4 md:mt-0 md:w-72">
            <div className="rounded-2xl border border-slate-800 bg-black/90 p-4 shadow-[0_0_25px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                How to use
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li>Pick one DSA + one Web/CS course at a time.</li>
                <li>Pair them with CodeSync contests & CodePad.</li>
                <li>Track your progress weekly, not daily moods.</li>
              </ul>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="mb-6 space-y-4 rounded-3xl border border-slate-800 bg-black/80 px-4 py-4 sm:px-5 sm:py-5 backdrop-blur-xl shadow-[0_0_26px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-sky-300">
                <RiCodeBoxLine className="text-lg" />
              </div>
              <div>
                <p className="font-medium text-slate-100">Filter resources</p>
                <p className="text-[11px] text-slate-500">
                  Mix level + track. Search by course, platform or author.
                </p>
              </div>
            </div>

            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search by title, platform, author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#050710] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-slate-500">Level</p>
              <div className="flex flex-wrap gap-1.5">
                {LEVEL_FILTERS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() =>
                      setLevelFilter(lvl as Level | "All")
                    }
                    className={`px-3 py-1 rounded-full text-[11px] border transition ${
                      levelFilter === lvl
                        ? "border-sky-400 bg-sky-500/15 text-sky-100"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-100"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] text-slate-500">Track</p>
              <div className="flex flex-wrap gap-1.5">
                {TRACK_FILTERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrackFilter(t as Track | "All")}
                    className={`px-3 py-1 rounded-full text-[11px] border transition ${
                      trackFilter === t
                        ? "border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-100"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Resources grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing{" "}
              <span className="text-sky-300 font-medium">
                {filteredResources.length}
              </span>{" "}
              of {RESOURCES.length} resources
            </span>
          </div>

          {filteredResources.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-black/80 px-4 py-8 text-center text-sm text-slate-400">
              No resources match your filters. Try changing level, track or
              search text.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map((res) => (
                <article
                  key={res.id}
                  className="group relative flex flex-col rounded-2xl border border-slate-800 bg-black/85 p-4 shadow-[0_0_20px_rgba(15,23,42,0.8)] hover:border-sky-500/70 hover:shadow-[0_0_28px_rgba(56,189,248,0.7)] transition"
                >
                  {/* top: title + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#050710] border border-slate-700 text-sky-300 text-sm">
                        {res.track === "DSA" && "DS"}
                        {res.track === "Web Dev" && "WD"}
                        {res.track === "CP" && "CP"}
                        {res.track === "CS Core" && "CS"}
                        {res.track === "System Design" && "SD"}
                        {res.track === "Misc" && "RX"}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-100 leading-snug">
                          {res.title}
                        </h2>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {res.platform} · {res.author}
                        </p>
                      </div>
                    </div>

                    {res.badge && (
                      <span className="ml-2 rounded-full bg-sky-500/10 border border-sky-500/60 px-2 py-0.5 text-[10px] text-sky-100 whitespace-nowrap">
                        {res.badge}
                      </span>
                    )}
                  </div>

                  {/* meta chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                    <span className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-0.5">
                      Level: {res.level}
                    </span>
                    <span className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-0.5">
                      Track: {res.track}
                    </span>
                    <span className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-0.5">
                      Format: {res.format}
                    </span>
                    <span className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-0.5">
                      Duration: {res.duration}
                    </span>
                  </div>

                  {/* highlight */}
                  <p className="mt-3 text-[11px] text-slate-300 leading-relaxed">
                    {res.highlight}
                  </p>

                  {/* footer */}
                  <div className="mt-4 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Tip: Pair this with CodePad and contests.
                    </span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-100 group-hover:bg-sky-500/20 transition"
                    >
                      Open course
                      <RiExternalLinkLine className="text-xs" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ResourcesPage;
