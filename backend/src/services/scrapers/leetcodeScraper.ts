// src/services/scrapers/leetcodeScraper.ts
import axios from "axios";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

export interface LeetCodeContestHistory {
  contestName: string;
  contestDate: string;
  rank: number;
  rating: number;
  ratingChange: number;
  problemsSolved: number;
  totalProblems: number;
}

export interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

export interface TopicProblemCount {
  tagName: string;
  tagSlug: string;
  problemsSolved: number;
}

export interface LeetCodeStats {
  username: string;

  // Problem solving
  totalSolved: number;
  solvedEasy: number;
  solvedMedium: number;
  solvedHard: number;

  // 🔥 Daily problem-solving streak
  streak: number;

  // 📊 Acceptance rate
  acceptanceRate: number;

  // 🧩 Topic-wise problem counts
  topicWiseProblemCounts: TopicProblemCount[];

  // Contest performance
  contestRating: number | null;
  globalRanking: number | null;
  attendedContests: number | null;
  topPercentage: number | null;

  // 🏁 Contest history (rank and rating change per contest)
  contestHistory: LeetCodeContestHistory[];

  // 📜 Recent submissions list
  recentSubmissions: LeetCodeSubmission[];

  // Problems solved per language
  languages: Record<string, number>;

  // Number of profile badges
  badges: number;

  // Profile URL
  profileUrl: string;
}

async function lcQuery(operationName: string, variables: any, query: string) {
  const res = await axios.post(
    LEETCODE_GRAPHQL,
    { operationName, variables, query },
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: `https://leetcode.com/u/${variables.username}/`,
      },
    }
  );

  if (res.data?.errors?.length) {
    throw new Error(res.data.errors.map((e: any) => e.message).join("; "));
  }

  return res.data.data;
}

export async function scrapeLeetCode(username: string): Promise<LeetCodeStats> {
  if (!username) throw new Error("scrapeLeetCode: username is required");
  username = username.trim();

  const PROFILE_Q = `
    query profile($username: String!) {
      matchedUser(username: $username) {
        badges { id }
        userCalendar {
          streak
          activeYears
        }
      }
    }
  `;

  const STATS_Q = `
    query stats($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const LANG_Q = `
    query langs($username: String!) {
      matchedUser(username: $username) {
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
    }
  `;

  const CONTEST_Q = `
    query contest($username: String!) {
      userContestRanking(username: $username) {
        rating
        globalRanking
        attendedContestsCount
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        contest {
          title
          startTime
        }
        ranking
        rating
        problemsSolved
        totalProblems
      }
    }
  `;

  const TOPIC_Q = `
    query topicStats($username: String!) {
      matchedUser(username: $username) {
        tagProblemCounts {
          advanced {
            tagName
            tagSlug
            problemsSolved
          }
          intermediate {
            tagName
            tagSlug
            problemsSolved
          }
          fundamental {
            tagName
            tagSlug
            problemsSolved
          }
        }
      }
    }
  `;

  const SUBMISSIONS_Q = `
    query recentSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
      }
    }
  `;

  const ACCEPTANCE_Q = `
    query acceptance($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }
  `;

  const [profile, stats, langs, contest, topics, submissions, acceptance] = await Promise.all([
    lcQuery("profile", { username }, PROFILE_Q),
    lcQuery("stats", { username }, STATS_Q),
    lcQuery("langs", { username }, LANG_Q),
    lcQuery("contest", { username }, CONTEST_Q).catch(() => null),
    lcQuery("topicStats", { username }, TOPIC_Q).catch(() => null),
    lcQuery("recentSubmissions", { username, limit: 20 }, SUBMISSIONS_Q).catch(() => null),
    lcQuery("acceptance", { username }, ACCEPTANCE_Q).catch(() => null),
  ]);

  // --- solved problems by difficulty ---
  const arr =
    stats?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];

  const easy = arr.find((d: any) => d.difficulty === "Easy")?.count ?? 0;
  const medium = arr.find((d: any) => d.difficulty === "Medium")?.count ?? 0;
  const hard = arr.find((d: any) => d.difficulty === "Hard")?.count ?? 0;

  const totalSolved = easy + medium + hard;

  // --- streak ---
  const streak = profile?.matchedUser?.userCalendar?.streak ?? 0;

  // --- languages ---
  const languages: Record<string, number> = {};
  for (const l of langs?.matchedUser?.languageProblemCount ?? []) {
    languages[l.languageName] = l.problemsSolved;
  }

  // --- badges ---
  const badgesCount = profile?.matchedUser?.badges?.length ?? 0;

  // --- contest info ---
  const c = contest?.userContestRanking;
  const contestRating = c?.rating ?? null;
  const globalRanking = c?.globalRanking ?? null;
  const attendedContests = c?.attendedContestsCount ?? null;
  const topPercentage = c?.topPercentage ?? null;

  // --- contest history ---
  const contestHistory: LeetCodeContestHistory[] = [];
  const rawHistory = contest?.userContestRankingHistory ?? [];
  let prevRating = 0;

  for (const h of rawHistory) {
    if (!h.attended) continue;

    const currentRating = Math.round(h.rating ?? 0);
    const ratingChange = prevRating > 0 ? currentRating - prevRating : 0;
    prevRating = currentRating;

    contestHistory.push({
      contestName: h.contest?.title ?? "Unknown",
      contestDate: h.contest?.startTime
        ? new Date(h.contest.startTime * 1000).toISOString().split('T')[0]
        : "",
      rank: h.ranking ?? 0,
      rating: currentRating,
      ratingChange,
      problemsSolved: h.problemsSolved ?? 0,
      totalProblems: h.totalProblems ?? 0,
    });
  }

  // --- topic-wise problem counts ---
  const topicWiseProblemCounts: TopicProblemCount[] = [];
  const tagCounts = topics?.matchedUser?.tagProblemCounts;

  if (tagCounts) {
    for (const category of ['advanced', 'intermediate', 'fundamental']) {
      const tagList = tagCounts[category] ?? [];
      for (const tag of tagList) {
        topicWiseProblemCounts.push({
          tagName: tag.tagName,
          tagSlug: tag.tagSlug,
          problemsSolved: tag.problemsSolved ?? 0,
        });
      }
    }
  }

  // --- recent submissions ---
  const recentSubmissions: LeetCodeSubmission[] = (submissions?.recentAcSubmissionList ?? [])
    .map((s: any) => ({
      title: s.title,
      titleSlug: s.titleSlug,
      timestamp: parseInt(s.timestamp, 10) || 0,
      statusDisplay: s.statusDisplay,
      lang: s.lang,
    }));

  // --- acceptance rate ---
  let acceptanceRate = 0;
  const acStats = acceptance?.matchedUser?.submitStats;
  if (acStats) {
    const totalAc = acStats.acSubmissionNum?.find((d: any) => d.difficulty === "All")?.submissions ?? 0;
    const totalSub = acStats.totalSubmissionNum?.find((d: any) => d.difficulty === "All")?.submissions ?? 0;
    if (totalSub > 0) {
      acceptanceRate = Math.round((totalAc / totalSub) * 10000) / 100; // 2 decimal places
    }
  }

  return {
    username,
    totalSolved,
    solvedEasy: easy,
    solvedMedium: medium,
    solvedHard: hard,
    streak,
    acceptanceRate,
    topicWiseProblemCounts,
    contestRating,
    globalRanking,
    attendedContests,
    topPercentage,
    contestHistory,
    recentSubmissions,
    languages,
    badges: badgesCount,
    profileUrl: `https://leetcode.com/u/${username}/`,
  };
}
