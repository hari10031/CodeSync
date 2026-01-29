import { firestore, FieldValue } from "../config/firebase";

/* ------------------------------------------------------------------
 * PLATFORM + BADGES
 * ------------------------------------------------------------------ */

export type PlatformId =
  | "leetcode"
  | "codechef"
  | "hackerrank"
  | "codeforces"
  | "github"
  | "atcoder";

export type BadgeLevel =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "legendary"
  | "unknown";

export type Badge = {
  name: string;
  level: BadgeLevel;
};

/* ------------------------------------------------------------------
 * RAW PLATFORM STATS (from scrapers)
 * ------------------------------------------------------------------ */

export type PlatformStats = {
  username?: string;
  profileUrl?: string;
  displayName?: string;

  // Problems
  totalSolved?: number;
  problemsSolved?: number;
  problemsSolvedTotal?: number;

  problemsSolvedByDifficulty?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

  // Ratings & contests
  rating?: number;
  contestRating?: number;
  currentRating?: number;
  maxRating?: number;

  contestsParticipated?: number;
  attendedContests?: number;
  contestsAttended?: number;
  totalContests?: number;
  ratedMatches?: number;

  // CodeChef
  fullySolved?: number | { total?: number };
  partiallySolved?: number | { total?: number };
  stars?: number;
  fullySolvedByDifficulty?: {
    total?: number;
    school?: number;
    easy?: number;
    medium?: number;
    hard?: number;
    challenge?: number;
    peer?: number;
  };
  ratingGraph?: any[];
  languageStats?: Record<string, number>;

  // HackerRank
  badges?: Badge[];
  badgesCount?: number;
  certificates?: any[];
  certificatesCount?: number;
  domainScores?: Record<string, number>;
  domainWiseSolved?: any[];
  country?: string;

  // GitHub
  contributionsLastYear?: number;
  publicRepos?: number;
  followers?: number;
  following?: number;
  totalStars?: number;
  starsReceived?: number;
  topLanguages?: Record<string, number>;
  currentStreak?: number;
  longestStreak?: number;
  pinnedRepositories?: any[];
  contributionHeatmap?: any[];
  monthlyContributions?: any[];

  // LeetCode
  streak?: number;
  acceptanceRate?: number;
  topicWiseProblemCounts?: any[];
  topPercentage?: number;
  languages?: Record<string, number>;

  // Codeforces
  rank?: string | number;
  maxRank?: string;
  contribution?: number;
  difficultyWiseSolved?: Record<string, number>;
  tagWiseSolved?: Record<string, number>;
  verdictStats?: Record<string, number>;

  // AtCoder
  title?: string;
  lastContest?: string;
  contests?: any[];
  bestPerformance?: number;
  peakRating?: number;

  // Common
  contestHistory?: any[];
  recentSubmissions?: any[];

  [key: string]: any;
};

export type RawPlatformStatsMap = Record<PlatformId, PlatformStats | null>;

/* ------------------------------------------------------------------
 * SCORE OUTPUT
 * ------------------------------------------------------------------ */

export type CpScores = {
  codeSyncScore: number;
  displayScore: number;

  platformSkills: Partial<Record<PlatformId, number>>;
  totalProblemsSolved: number;

  breakdown: {
    [P in PlatformId]?: {
      problemsSolved: number;
      rating: number;
      contests: number;
    };
  };

  lastComputedAt: FirebaseFirestore.FieldValue | Date | string;
};

/* ------------------------------------------------------------------
 * FIRESTORE
 * ------------------------------------------------------------------ */

const STUDENTS_COLLECTION = "students";
const studentsCol = firestore.collection(STUDENTS_COLLECTION);

/* ------------------------------------------------------------------
 * UTILS
 * ------------------------------------------------------------------ */

function n(val: any): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const parsed = Number(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/* ------------------------------------------------------------------
 * INTERNAL SCORER RETURN TYPE
 * ------------------------------------------------------------------ */

type ScorerOut = {
  score: number;
  solved: number;
  rating: number;
  contests: number;
};

/* ------------------------------------------------------------------
 * SCORING FUNCTIONS
 * ------------------------------------------------------------------ */

function scoreLeetCode(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const solved = n(stats.totalSolved) || n(stats.problemsSolvedTotal) || 0;
  const rating = n(stats.contestRating ?? stats.rating);
  const contests = n(stats.attendedContests) || n(stats.contestsParticipated);

  return {
    score: solved * 10 + rating * 1.0 + contests * 25,
    solved,
    rating,
    contests,
  };
}

function scoreCodeforces(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const solved = n(stats.problemsSolvedTotal) || n(stats.problemsSolved);
  const rating = n(stats.rating);
  const contests = n(stats.contestsAttended) || n(stats.contestsParticipated);

  return {
    score: solved * 12 + rating * 1.2 + contests * 40,
    solved,
    rating,
    contests,
  };
}

function scoreCodeChef(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const fully =
    typeof stats.fullySolved === "number"
      ? n(stats.fullySolved)
      : n(stats.fullySolved?.total);

  const partial =
    typeof stats.partiallySolved === "number"
      ? n(stats.partiallySolved)
      : n(stats.partiallySolved?.total);

  const solved = fully + partial;
  const rating = n(stats.currentRating ?? stats.rating);

  const contestsEst = clamp(Math.round(rating / 40), 0, 200);

  return {
    score: fully * 12 + partial * 4 + rating * 1.0 + contestsEst * 30,
    solved,
    rating,
    contests: contestsEst,
  };
}

function scoreHackerRank(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const solved = n(stats.problemsSolved) || n(stats.problemsSolvedTotal);
  const contests = n(stats.contestsParticipated);

  const badges =
    n(stats.badgesCount) || (Array.isArray(stats.badges) ? stats.badges.length : 0);

  const certs =
    n(stats.certificatesCount) ||
    (Array.isArray(stats.certificates) ? stats.certificates.length : 0);

  return {
    score: solved * 8 + contests * 20 + badges * 40 + certs * 60,
    solved,
    rating: 0,
    contests,
  };
}

function scoreGitHub(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const stars = n(stats.totalStars ?? stats.starsReceived);

  return {
    score:
      n(stats.contributionsLastYear) * 2 +
      stars * 30 +
      n(stats.publicRepos) * 10 +
      n(stats.followers) * 20,
    solved: 0,
    rating: 0,
    contests: 0,
  };
}

function scoreAtCoder(stats: PlatformStats | null): ScorerOut {
  if (!stats) return { score: 0, solved: 0, rating: 0, contests: 0 };

  const solved = n(stats.problemsSolvedTotal);
  const rating = n(stats.rating);
  const contests = n(stats.totalContests) || n(stats.ratedMatches);

  return {
    score: solved * 8 + rating * 1.2 + contests * 35,
    solved,
    rating,
    contests,
  };
}

/* ------------------------------------------------------------------
 * MAIN COMPUTE
 * ------------------------------------------------------------------ */

export function computeCpScoresFromStats(platformStats: RawPlatformStatsMap): CpScores {
  const breakdown: CpScores["breakdown"] = {};
  const platformSkills: Partial<Record<PlatformId, number>> = {};

  const lc = scoreLeetCode(platformStats.leetcode);
  const cf = scoreCodeforces(platformStats.codeforces);
  const cc = scoreCodeChef(platformStats.codechef);
  const hr = scoreHackerRank(platformStats.hackerrank);
  const gh = scoreGitHub(platformStats.github);
  const ac = scoreAtCoder(platformStats.atcoder);

  platformSkills.leetcode = lc.score;
  platformSkills.codeforces = cf.score;
  platformSkills.codechef = cc.score;
  platformSkills.hackerrank = hr.score;
  platformSkills.github = gh.score;
  platformSkills.atcoder = ac.score;

  // ✅ FIX: breakdown requires { problemsSolved, rating, contests }
  breakdown.leetcode = { problemsSolved: lc.solved, rating: lc.rating, contests: lc.contests };
  breakdown.codeforces = { problemsSolved: cf.solved, rating: cf.rating, contests: cf.contests };
  breakdown.codechef = { problemsSolved: cc.solved, rating: cc.rating, contests: cc.contests };
  breakdown.hackerrank = { problemsSolved: hr.solved, rating: hr.rating, contests: hr.contests };
  breakdown.github = { problemsSolved: gh.solved, rating: gh.rating, contests: gh.contests };
  breakdown.atcoder = { problemsSolved: ac.solved, rating: ac.rating, contests: ac.contests };

  const codeSyncScore = lc.score + cf.score + cc.score + hr.score + gh.score + ac.score;

  const totalProblemsSolved = lc.solved + cf.solved + cc.solved + hr.solved + ac.solved;

  return {
    codeSyncScore,
    displayScore: Math.round(codeSyncScore),
    platformSkills,
    totalProblemsSolved,
    breakdown,
    lastComputedAt: FieldValue.serverTimestamp(),
  };
}

/* ------------------------------------------------------------------
 * SAVE TO FIRESTORE
 * ------------------------------------------------------------------ */

export async function recomputeAndSaveCpScoresForStudent(
  studentId: string,
  platformStats: RawPlatformStatsMap
): Promise<CpScores> {
  const cpScores = computeCpScoresFromStats(platformStats);

  await studentsCol.doc(studentId).set(
    {
      cpScores,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return cpScores;
}
