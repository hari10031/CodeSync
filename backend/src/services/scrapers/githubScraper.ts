// src/services/scrapers/githubScraper.ts
import axios from "axios";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_WEB_BASE = "https://github.com";

export interface PinnedRepository {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
}

export interface ContributionDay {
  date: string;
  count: number;
  weekday: number; // 0 = Sunday, 6 = Saturday
}

export interface MonthlyContribution {
  month: string; // "2025-01"
  total: number;
}

export interface GitHubStats {
  username: string;

  // ⭐ Total stars received (sum of all public repositories)
  totalStars: number;
  publicRepos: number;
  followers: number;
  following: number;

  topLanguages: Record<string, number>; // language -> repo count

  // 📊 Total contributions in the last 1 year
  contributionsLastYear: number;

  // 🔥 Current contribution streak
  currentStreak: number;

  // 🏆 Longest contribution streak
  longestStreak: number;

  // 📌 Pinned repositories
  pinnedRepositories: PinnedRepository[];

  // 📈 Contribution heatmap (day-wise contribution data)
  contributionHeatmap: ContributionDay[];

  // 🗓️ Monthly contribution totals
  monthlyContributions: MonthlyContribution[];

  profileUrl: string;
}

/**
 * Axios client with optional token for better rate limits.
 * If you set GITHUB_TOKEN in env, it will be used, else unauthenticated.
 */
function createGitHubClient() {
  const headers: Record<string, string> = {
    "User-Agent": "CodeSync-SDR/1.0",
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers,
  });
}

async function fetchUserProfile(username: string) {
  const client = createGitHubClient();
  const res = await client.get(`/users/${encodeURIComponent(username)}`);
  return res.data;
}

async function fetchUserRepos(username: string, perPage = 100) {
  const client = createGitHubClient();
  const res = await client.get(`/users/${encodeURIComponent(username)}/repos`, {
    params: {
      per_page: perPage,
      sort: "updated",
      direction: "desc",
    },
  });
  return res.data as any[];
}

/**
 * Fetch the contribution graph HTML & compute:
 * - contributionsLastYear
 * - currentStreak
 * - longestStreak
 * - contributionHeatmap (day-wise data)
 * - monthlyContributions
 */
async function fetchContributionStreaks(username: string): Promise<{
  contributionsLastYear: number;
  currentStreak: number;
  longestStreak: number;
  contributionHeatmap: ContributionDay[];
  monthlyContributions: MonthlyContribution[];
}> {
  const url = `${GITHUB_WEB_BASE}/users/${encodeURIComponent(username)}/contributions`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${GITHUB_WEB_BASE}/${encodeURIComponent(username)}`,
      },
    });

    const html = res.data as string;

    // <rect ... data-date="2025-01-01" data-count="3" ...>
    const rectRegex =
      /<rect[^>]*data-date="([^"]+)"[^>]*data-count="([^"]+)"[^>]*>/g;

    const days: ContributionDay[] = [];
    let m: RegExpExecArray | null;
    while ((m = rectRegex.exec(html)) !== null) {
      const date = m[1];
      const count = parseInt(m[2], 10) || 0;
      const dateObj = new Date(date);
      days.push({ date, count, weekday: dateObj.getDay() });
    }

    if (!days.length) {
      return {
        contributionsLastYear: 0,
        currentStreak: 0,
        longestStreak: 0,
        contributionHeatmap: [],
        monthlyContributions: [],
      };
    }

    // Sort by date just in case
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let contributionsLastYear = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    let prevDate: Date | null = null;
    let runningStreak = 0;

    // Monthly aggregation
    const monthlyMap: Record<string, number> = {};

    for (const day of days) {
      contributionsLastYear += day.count;

      // Monthly aggregation
      const monthKey = day.date.substring(0, 7); // "2025-01"
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + day.count;

      if (day.count > 0) {
        const currDate = new Date(day.date);
        if (!prevDate) {
          runningStreak = 1;
        } else {
          const diffDays =
            (currDate.getTime() - prevDate.getTime()) /
            (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            runningStreak += 1;
          } else {
            runningStreak = 1;
          }
        }
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        prevDate = new Date(day.date);
      } else {
        // streak break
        runningStreak = 0;
        prevDate = new Date(day.date);
      }
    }

    currentStreak = runningStreak;

    // Convert monthly map to array
    const monthlyContributions: MonthlyContribution[] = Object.entries(monthlyMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      contributionsLastYear,
      currentStreak,
      longestStreak,
      contributionHeatmap: days,
      monthlyContributions,
    };
  } catch (err: any) {
    console.error("[GitHub] Failed to fetch contributions:", err?.message || err);
    return {
      contributionsLastYear: 0,
      currentStreak: 0,
      longestStreak: 0,
      contributionHeatmap: [],
      monthlyContributions: [],
    };
  }
}

/**
 * Fetch pinned repositories using GitHub GraphQL API
 */
async function fetchPinnedRepositories(username: string): Promise<PinnedRepository[]> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    // Without a token, we can't use GraphQL API for pinned repos
    console.warn("[GitHub] GITHUB_TOKEN not set, skipping pinned repositories");
    return [];
  }

  const query = `
    query($username: String!) {
      user(login: $username) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              primaryLanguage {
                name
              }
              stargazerCount
              forkCount
            }
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      "https://api.github.com/graphql",
      { query, variables: { username } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "CodeSync-SDR/1.0",
        },
      }
    );

    const nodes = res.data?.data?.user?.pinnedItems?.nodes ?? [];

    return nodes.map((repo: any) => ({
      name: repo.name,
      description: repo.description,
      url: repo.url,
      language: repo.primaryLanguage?.name ?? null,
      stars: repo.stargazerCount ?? 0,
      forks: repo.forkCount ?? 0,
    }));
  } catch (err: any) {
    console.error("[GitHub] Failed to fetch pinned repositories:", err?.message || err);
    return [];
  }
}

export async function scrapeGitHub(username: string): Promise<GitHubStats> {
  if (!username) {
    throw new Error("scrapeGitHub: username is required");
  }

  username = username.trim();

  const [profile, repos, streaks, pinnedRepos] = await Promise.all([
    fetchUserProfile(username),
    fetchUserRepos(username),
    fetchContributionStreaks(username),
    fetchPinnedRepositories(username),
  ]);

  // total stars & languages from repos
  let totalStars = 0;
  const topLanguages: Record<string, number> = {};

  for (const r of repos || []) {
    const stars = r.stargazers_count ?? 0;
    totalStars += stars;

    if (r.language) {
      topLanguages[r.language] = (topLanguages[r.language] || 0) + 1;
    }
  }

  return {
    username,

    totalStars,
    publicRepos: profile.public_repos ?? 0,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,

    topLanguages,
    contributionsLastYear: streaks.contributionsLastYear,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,

    pinnedRepositories: pinnedRepos,
    contributionHeatmap: streaks.contributionHeatmap,
    monthlyContributions: streaks.monthlyContributions,

    profileUrl: `${GITHUB_WEB_BASE}/${encodeURIComponent(username)}`,
  };
}
