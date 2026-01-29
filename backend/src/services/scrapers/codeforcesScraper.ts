// src/services/scrapers/codeforcesScraper.ts
import axios from "axios";

const CF_API_BASE = "https://codeforces.com/api";

export interface CodeforcesContestHistory {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingChange: number;
  date: string;
}

export interface CodeforcesSubmission {
  id: number;
  problemName: string;
  problemIndex: string;
  contestId: number | null;
  verdict: string;
  language: string;
  timestamp: number;
  rating: number | null;
}

export interface CodeforcesStats {
  username: string;

  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  contribution: number | null;
  friendOfCount: number | null;

  contestsAttended: number;
  problemsSolved: number;

  // 📉 Contest history (rating graph / per-contest rating delta)
  contestHistory: CodeforcesContestHistory[];

  // 🎯 Difficulty-wise problem counts (800–3500)
  difficultyWiseSolved: Record<string, number>;

  // 🧠 Tag-wise solved problem counts
  tagWiseSolved: Record<string, number>;

  // 🧾 Submission verdict statistics (AC / WA / TLE / MLE, etc.)
  verdictStats: Record<string, number>;

  // 🕒 Recent submissions list
  recentSubmissions: CodeforcesSubmission[];

  languages: Record<string, number>;

  profileUrl: string;
}

async function cfGet<T = any>(path: string, params: Record<string, any>): Promise<T> {
  const res = await axios.get(`${CF_API_BASE}/${path}`, { params });

  if (res.data?.status !== "OK") {
    const comment = res.data?.comment || "Unknown Codeforces API error";
    throw new Error(`Codeforces API error [${path}]: ${comment}`);
  }

  return res.data.result as T;
}

export async function scrapeCodeforces(username: string): Promise<CodeforcesStats> {
  if (!username) {
    throw new Error("scrapeCodeforces: username is required");
  }

  username = username.trim();

  // 1) Basic user info
  const [user] = await cfGet<any[]>("user.info", { handles: username });

  // 2) Contest rating history
  const ratingChanges = await cfGet<any[]>("user.rating", { handle: username });

  // 3) Submissions (we take up to 10k recent submissions)
  const submissions = await cfGet<any[]>("user.status", {
    handle: username,
    from: 1,
    count: 10000,
  });

  const contestsAttended = ratingChanges.length;

  // --- Contest history with rating changes ---
  const contestHistory: CodeforcesContestHistory[] = ratingChanges.map((rc: any) => ({
    contestId: rc.contestId,
    contestName: rc.contestName,
    rank: rc.rank,
    oldRating: rc.oldRating,
    newRating: rc.newRating,
    ratingChange: rc.newRating - rc.oldRating,
    date: new Date(rc.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0],
  }));

  // --- Problems solved + language stats + verdict stats + difficulty stats + tag stats ---
  const solvedProblems = new Set<string>();
  const languages: Record<string, number> = {};
  const verdictStats: Record<string, number> = {};
  const difficultyWiseSolved: Record<string, number> = {};
  const tagWiseSolved: Record<string, number> = {};
  const solvedProblemDetails: { key: string; rating: number | null; tags: string[] }[] = [];

  for (const sub of submissions) {
    const verdict = sub.verdict || "UNKNOWN";
    verdictStats[verdict] = (verdictStats[verdict] || 0) + 1;

    const lang = sub.programmingLanguage || "Unknown";
    languages[lang] = (languages[lang] || 0) + 1;

    if (sub.verdict !== "OK") continue;

    const problem = sub.problem || {};
    let key: string;

    if (problem.contestId && problem.index) {
      key = `${problem.contestId}-${problem.index}`;
    } else if (problem.name) {
      key = `name-${problem.name}`;
    } else {
      continue;
    }

    if (!solvedProblems.has(key)) {
      solvedProblems.add(key);
      solvedProblemDetails.push({
        key,
        rating: problem.rating ?? null,
        tags: problem.tags ?? [],
      });
    }
  }

  // Calculate difficulty-wise and tag-wise stats from unique solved problems
  for (const prob of solvedProblemDetails) {
    // Difficulty
    if (prob.rating) {
      const difficultyBucket = String(prob.rating);
      difficultyWiseSolved[difficultyBucket] = (difficultyWiseSolved[difficultyBucket] || 0) + 1;
    } else {
      difficultyWiseSolved["unrated"] = (difficultyWiseSolved["unrated"] || 0) + 1;
    }

    // Tags
    for (const tag of prob.tags) {
      tagWiseSolved[tag] = (tagWiseSolved[tag] || 0) + 1;
    }
  }

  const problemsSolved = solvedProblems.size;

  // --- Recent submissions (last 20) ---
  const recentSubmissions: CodeforcesSubmission[] = submissions
    .slice(0, 20)
    .map((sub: any) => ({
      id: sub.id,
      problemName: sub.problem?.name ?? "Unknown",
      problemIndex: sub.problem?.index ?? "",
      contestId: sub.problem?.contestId ?? null,
      verdict: sub.verdict ?? "UNKNOWN",
      language: sub.programmingLanguage ?? "Unknown",
      timestamp: sub.creationTimeSeconds ?? 0,
      rating: sub.problem?.rating ?? null,
    }));

  return {
    username,

    rating: user.rating ?? null,
    maxRating: user.maxRating ?? null,
    rank: user.rank ?? null,
    maxRank: user.maxRank ?? null,
    contribution: user.contribution ?? null,
    friendOfCount: user.friendOfCount ?? null,

    contestsAttended,
    problemsSolved,

    contestHistory,
    difficultyWiseSolved,
    tagWiseSolved,
    verdictStats,
    recentSubmissions,

    languages,

    profileUrl: `https://codeforces.com/profile/${encodeURIComponent(username)}`,
  };
}
