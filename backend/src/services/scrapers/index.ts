// src/services/scrapers/index.ts

import { PlatformStats, PlatformId, Badge, BadgeLevel } from "../../lib/scoringEngine";

import { scrapeLeetCode, LeetCodeStats } from "./leetcodeScraper";
import { scrapeCodeChef, CodeChefStats } from "./codechefScraper";
import { scrapeCodeforces, CodeforcesStats } from "./codeforcesScraper";
import { scrapeAtcoder, AtcoderStats } from "./atcoderScraper";
import {
  scrapeHackerRank,
  HackerRankScrapeResult,
  HackerRankBadge,
} from "./hackerrankScraper";
import { scrapeGitHub, GitHubStats } from "./githubScraper";

export interface CpHandles {
  leetcode?: string;
  codechef?: string;
  codeforces?: string;
  atcoder?: string;
  hackerrank?: string;
  github?: string;
}

/* ------------------------------------------------------------------
 * Mapping helpers (output keys aligned to scoringEngine.ts readers)
 * ------------------------------------------------------------------ */

function mapLeetCode(stats: LeetCodeStats): PlatformStats {
  const badgeCount = typeof (stats as any).badges === "number" ? (stats as any).badges : 0;

  const badges: Badge[] =
    badgeCount > 0
      ? Array.from({ length: badgeCount }).map((_, i) => ({
        name: `LC badge #${i + 1}`,
        level: "unknown" as BadgeLevel,
      }))
      : [];

  const totalSolved = (stats.totalSolved ?? 0) as number;

  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // scoringEngine reads:
    totalSolved, // ✅ preferred key
    problemsSolvedTotal: totalSolved, // ✅ also supported

    // breakdown / UI
    problemsSolvedByDifficulty: {
      easy: stats.solvedEasy ?? 0,
      medium: stats.solvedMedium ?? 0,
      hard: stats.solvedHard ?? 0,
    },

    // 🔥 Daily problem-solving streak
    streak: stats.streak ?? 0,

    // 📊 Acceptance rate
    acceptanceRate: stats.acceptanceRate ?? 0,

    // 🧩 Topic-wise problem counts
    topicWiseProblemCounts: stats.topicWiseProblemCounts ?? [],

    // scoringEngine reads these
    contestRating: stats.contestRating ?? undefined,
    rating: stats.contestRating ?? undefined, // harmless alias
    attendedContests: stats.attendedContests ?? 0,
    topPercentage: stats.topPercentage ?? undefined,

    // 🏁 Contest history
    contestHistory: stats.contestHistory ?? [],

    // 📜 Recent submissions
    recentSubmissions: stats.recentSubmissions ?? [],

    // Languages
    languages: stats.languages ?? {},

    badges,
  };
}

function mapCodeforces(stats: CodeforcesStats): PlatformStats {
  const solved = (stats.problemsSolved ?? 0) as number;

  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // scoringEngine reads:
    rating: stats.rating ?? undefined,
    contestsAttended: stats.contestsAttended ?? 0,
    contestsParticipated: stats.contestsAttended ?? 0, // alias

    // scoringEngine reads either problemsSolvedTotal or problemsSolved
    problemsSolvedTotal: solved,
    problemsSolved: solved,

    // extra
    maxRating: stats.maxRating ?? undefined,
    rank: stats.rank ?? undefined,
    maxRank: stats.maxRank ?? undefined,
    contribution: stats.contribution ?? undefined,

    // 📉 Contest history (rating graph / per-contest rating delta)
    contestHistory: stats.contestHistory ?? [],

    // 🎯 Difficulty-wise problem counts (800–3500)
    difficultyWiseSolved: stats.difficultyWiseSolved ?? {},

    // 🧠 Tag-wise solved problem counts
    tagWiseSolved: stats.tagWiseSolved ?? {},

    // 🧾 Submission verdict statistics
    verdictStats: stats.verdictStats ?? {},

    // 🕒 Recent submissions list
    recentSubmissions: stats.recentSubmissions ?? [],

    // Languages
    languages: stats.languages ?? {},
  };
}

function mapCodeChef(stats: CodeChefStats): PlatformStats {
  // scoringEngine can handle number OR { total }
  const fullyTotal = stats.fullySolved?.total ?? 0;
  const partialTotal = stats.partiallySolved?.total ?? 0;

  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // scoringEngine reads:
    currentRating: stats.currentRating ?? undefined,
    rating: stats.currentRating ?? undefined, // alias

    fullySolved: fullyTotal,
    partiallySolved: partialTotal,

    // ⭐ Star rating
    stars: stats.stars ?? undefined,

    // 📊 Solved problems by difficulty
    fullySolvedByDifficulty: stats.fullySolved ?? {},

    // extra
    maxRating: stats.highestRating ?? undefined,

    // 🏁 Contest participation history
    contestHistory: stats.contestHistory ?? [],

    // 📉 Rating graph data
    ratingGraph: stats.ratingGraph ?? [],

    // 🕒 Recent submissions list
    recentSubmissions: stats.recentSubmissions ?? [],

    // 💻 Language usage statistics
    languageStats: stats.languageStats ?? {},

    // if you later scrape it, scoringEngine uses contestsEst anyway
    contestsParticipated: stats.contestHistory?.length ?? 0,
  };
}

function mapAtcoder(stats: AtcoderStats): PlatformStats {
  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // scoringEngine reads:
    rating: stats.rating ?? undefined,
    ratedMatches: stats.ratedMatches ?? 0,
    totalContests: stats.totalContests ?? stats.ratedMatches ?? 0,

    // extra
    maxRating: stats.highestRating ?? undefined,
    title: stats.title ?? undefined,
    rank: stats.rank ?? undefined,
    lastContest: stats.lastContest ?? undefined,

    // 🏁 Contest history table
    contests: stats.contests ?? [],

    // 🏆 Best contest performance
    bestPerformance: stats.bestPerformance ?? undefined,
    peakRating: stats.peakRating ?? undefined,

    // 📈 Rating graph data
    ratingGraph: stats.ratingGraph ?? [],

    // 🕒 Recent submissions list
    recentSubmissions: stats.recentSubmissions ?? [],
  };
}

function mapHackerRankBadgeLevel(level: number | string | null | undefined): BadgeLevel {
  if (typeof level === "string") {
    const lower = level.toLowerCase();
    if (lower.includes("gold")) return "gold";
    if (lower.includes("silver")) return "silver";
    if (lower.includes("bronze")) return "bronze";
    if (lower.includes("legend")) return "legendary"; // requires BadgeLevel union to include "legendary"
    if (lower.includes("platinum")) return "platinum";
    if (lower.includes("diamond")) return "diamond";
    return "unknown";
  }

  if (typeof level === "number") {
    if (level >= 3) return "gold";
    if (level === 2) return "silver";
    if (level === 1) return "bronze";
    return "unknown";
  }

  return "unknown";
}

function mapHackerRank(stats: HackerRankScrapeResult): PlatformStats {
  const badges: Badge[] =
    stats.badges?.map((b: HackerRankBadge) => ({
      name: b.name,
      level: mapHackerRankBadgeLevel(b.level),
    })) ?? [];

  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // 👤 Full name
    displayName: stats.fullName ?? undefined,

    // 🌍 Country
    country: stats.country ?? undefined,

    // scoringEngine reads:
    // 📊 Total problems solved
    problemsSolved: stats.problemsSolved ?? 0,
    problemsSolvedTotal: stats.problemsSolved ?? 0,
    contestsParticipated: stats.contestsParticipated ?? 0,

    badges,
    badgesCount: Array.isArray(badges) ? badges.length : 0,

    // 📚 Domain-wise solved problem counts
    domainWiseSolved: stats.domainWiseSolved ?? [],
    domainScores: stats.domains ?? {},

    // 🏁 Contest participation details
    contestHistory: stats.contestHistory ?? [],

    // extra / UI
    certificates: (stats as any).certificates ?? [],
    certificatesCount: Array.isArray((stats as any).certificates)
      ? (stats as any).certificates.length
      : (stats as any).certificatesCount ?? 0,
  };
}

function mapGitHub(stats: GitHubStats): PlatformStats {
  const totalStars = stats.totalStars ?? 0;

  return {
    username: stats.username,
    profileUrl: stats.profileUrl,

    // scoringEngine reads:
    // 📊 Total contributions in the last 1 year
    contributionsLastYear: stats.contributionsLastYear ?? 0,
    publicRepos: stats.publicRepos ?? 0,
    followers: stats.followers ?? 0,
    following: stats.following ?? 0,

    // ⭐ Total stars received (sum of all public repositories)
    totalStars,
    starsReceived: totalStars,

    // Top languages
    topLanguages: stats.topLanguages ?? {},

    // 🔥 Current contribution streak
    currentStreak: stats.currentStreak ?? 0,

    // 🏆 Longest contribution streak
    longestStreak: stats.longestStreak ?? 0,

    // 📌 Pinned repositories
    pinnedRepositories: stats.pinnedRepositories ?? [],

    // 📈 Contribution heatmap (day-wise contribution data)
    contributionHeatmap: stats.contributionHeatmap ?? [],

    // 🗓️ Monthly contribution totals
    monthlyContributions: stats.monthlyContributions ?? [],
  };
}

/* ------------------------------------------------------------------
 * Public scraping helpers
 * ------------------------------------------------------------------ */

export async function scrapePlatformForUser(
  platform: PlatformId,
  handle: string
): Promise<PlatformStats | null> {
  if (!handle) return null;

  try {
    switch (platform) {
      case "leetcode": {
        const raw = await scrapeLeetCode(handle);
        return raw ? mapLeetCode(raw) : null;
      }
      case "codeforces": {
        const raw = await scrapeCodeforces(handle);
        return raw ? mapCodeforces(raw) : null;
      }
      case "codechef": {
        const raw = await scrapeCodeChef(handle);
        return raw ? mapCodeChef(raw) : null;
      }
      case "atcoder": {
        const raw = await scrapeAtcoder(handle);
        return raw ? mapAtcoder(raw) : null;
      }
      case "hackerrank": {
        const raw = await scrapeHackerRank(handle);
        return raw ? mapHackerRank(raw) : null;
      }
      case "github": {
        const raw = await scrapeGitHub(handle);
        return raw ? mapGitHub(raw) : null;
      }
      default:
        return null;
    }
  } catch (err) {
    console.error(
      `[SCRAPER] Failed platform=${platform}, handle=${handle}:`,
      (err as any)?.message || err
    );
    return null;
  }
}

export async function scrapeAllPlatformsForUser(handles: CpHandles): Promise<PlatformStats[]> {
  const jobs: Promise<PlatformStats | null>[] = [];

  if (handles.leetcode) jobs.push(scrapePlatformForUser("leetcode", handles.leetcode));
  if (handles.codechef) jobs.push(scrapePlatformForUser("codechef", handles.codechef));
  if (handles.codeforces) jobs.push(scrapePlatformForUser("codeforces", handles.codeforces));
  if (handles.atcoder) jobs.push(scrapePlatformForUser("atcoder", handles.atcoder));
  if (handles.hackerrank) jobs.push(scrapePlatformForUser("hackerrank", handles.hackerrank));
  if (handles.github) jobs.push(scrapePlatformForUser("github", handles.github));

  if (jobs.length === 0) {
    console.log("ℹ️ No CP handles provided, nothing to scrape.");
    return [];
  }

  const scraped = await Promise.all(jobs);
  return scraped.filter((s): s is PlatformStats => !!s);
}
