import axios from "axios";

export interface AtcoderContest {
  contestName: string;
  date: string;
  rank: number | null;
  oldRating: number | null;
  newRating: number | null;
  performance: number | null;
}

export interface AtcoderSubmission {
  id: number;
  problemId: string;
  problemName: string;
  contestId: string;
  result: string;
  language: string;
  timestamp: number;
  executionTime: number | null;
}

export interface AtcoderRatingPoint {
  contestName: string;
  rating: number;
  date: string;
}

export interface AtcoderStats {
  username: string;

  rating: number | null;
  highestRating: number | null;
  rank: number | null;
  ratedMatches: number | null;
  lastContest: string | null;
  title: string | null;

  // 🏁 Contest history table
  contests: AtcoderContest[];

  // 🔢 Total contests participated
  totalContests: number;

  // 🏆 Best contest performance
  bestPerformance: number | null;
  peakRating: number | null;

  // 📈 Rating graph data
  ratingGraph: AtcoderRatingPoint[];

  // 🕒 Recent submissions list
  recentSubmissions: AtcoderSubmission[];

  profileUrl: string;
}

function emptyStats(username: string): AtcoderStats {
  return {
    username,
    rating: null,
    highestRating: null,
    rank: null,
    ratedMatches: null,
    lastContest: null,
    title: null,

    contests: [],
    totalContests: 0,
    bestPerformance: null,
    peakRating: null,
    ratingGraph: [],
    recentSubmissions: [],

    profileUrl: `https://atcoder.jp/users/${username}`,
  };
}

function parseNum(v: string | undefined | null) {
  if (!v) return null;
  const n = parseInt(v.replace(/,/g, ""), 10);
  return isNaN(n) ? null : n;
}

export async function scrapeAtcoder(username: string): Promise<AtcoderStats> {
  const stats = emptyStats(username);
  const url = `https://atcoder.jp/users/${username}`;

  try {
    // -----------------------
    // 1) SCRAPE MAIN PROFILE
    // -----------------------
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = String(res.data);

    // TITLE - handle Grandmaster formats and Dan/Kyu
    const titleMatch =
      html.match(/user-(?:[^"]+)">([\w\s]+?master)<\/span>/i) || // GM, LGM, Master
      html.match(/([0-9]+\s+(Dan|Kyu))/i);

    if (titleMatch) stats.title = titleMatch[1].trim();

    // RATING (inside colored span)
    const ratingMatch = html.match(/Rating[\s\S]*?<span[^>]*>([0-9,]+)/i);
    stats.rating = parseNum(ratingMatch?.[1]);

    // HIGHEST RATING
    const highMatch = html.match(/Highest Rating[\s\S]*?<span[^>]*>([0-9,]+)/i);
    stats.highestRating = parseNum(highMatch?.[1]);

    // RANK
    const rankMatch = html.match(/Rank[\s\S]*?<td[^>]*>([0-9,]+)/i);
    stats.rank = parseNum(rankMatch?.[1]);

    // RATED MATCHES
    const rmMatch = html.match(/Rated Matches[\s\S]*?<td[^>]*>([0-9,]+)/i);
    stats.ratedMatches = parseNum(rmMatch?.[1]);

    // LAST CONTEST
    const lastMatch = html.match(/Last Competed[\s\S]*?<td[^>]*>([0-9/]+)/i);
    stats.lastContest = lastMatch?.[1] ?? null;

    // ------------------------------------
    // 2) SCRAPE CONTEST HISTORY (CSV DATA)
    // ------------------------------------
    const csvUrl = `https://atcoder.jp/users/${username}/history/csv`;

    const historyRes = await axios.get(csvUrl, { responseType: "text" });

    const rows = historyRes.data.trim().split("\n");
    rows.shift(); // remove header

    const contests: AtcoderContest[] = [];
    const ratingGraph: AtcoderRatingPoint[] = [];

    for (const row of rows) {
      const cols = row.split(",");

      const contestName = cols[1]?.trim();
      const date = cols[2]?.trim();
      const rank = parseNum(cols[3]);
      const performance = parseNum(cols[4]);
      const oldRating = parseNum(cols[5]);
      const newRating = parseNum(cols[6]);

      contests.push({
        contestName,
        date,
        rank,
        performance,
        oldRating,
        newRating,
      });

      // Build rating graph data
      if (newRating !== null) {
        ratingGraph.push({
          contestName,
          rating: newRating,
          date,
        });
      }
    }

    stats.contests = contests;
    stats.totalContests = contests.length;
    stats.ratingGraph = ratingGraph;

    // BEST PERFORMANCE
    const performances = contests.map((c) => c.performance || 0).filter(p => p > 0);
    stats.bestPerformance = performances.length > 0 ? Math.max(...performances) : null;

    // PEAK RATING (from history / main)
    const ratings = [
      stats.highestRating || 0,
      ...contests.map((c) => c.newRating || 0),
    ].filter(r => r > 0);

    stats.peakRating = ratings.length > 0 ? Math.max(...ratings) : null;

    // ------------------------------------
    // 3) SCRAPE RECENT SUBMISSIONS
    // ------------------------------------
    try {
      const submissionsUrl = `https://atcoder.jp/users/${username}/submissions`;
      const subRes = await axios.get(submissionsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const subHtml = String(subRes.data);
      const recentSubmissions: AtcoderSubmission[] = [];

      // Parse submission table rows
      // AtCoder submission table format: Time, Task, User, Language, Score, Code Size, Status, Runtime
      const tableMatch = subHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);

      if (tableMatch) {
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        let count = 0;

        while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null && count < 20) {
          const row = rowMatch[1];

          // Extract submission ID from link
          const idMatch = row.match(/\/submissions\/(\d+)/);
          const id = idMatch ? parseInt(idMatch[1], 10) : 0;

          // Extract problem info
          const problemMatch = row.match(/href="\/contests\/([^\/]+)\/tasks\/([^"]+)"[^>]*>([^<]+)</i);
          const contestId = problemMatch?.[1] || "";
          const problemId = problemMatch?.[2] || "";
          const problemName = problemMatch?.[3]?.trim() || "";

          // Extract result/verdict
          const resultMatch = row.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)</i) ||
            row.match(/(AC|WA|TLE|MLE|RE|CE|OLE|IE)/);
          const result = resultMatch?.[1]?.trim() || "Unknown";

          // Extract language
          const langMatch = row.match(/<td[^>]*>([^<]*(?:C\+\+|Python|Java|Ruby|Rust|Go|Kotlin|C#|JavaScript|Haskell|OCaml)[^<]*)</i);
          const language = langMatch?.[1]?.trim() || "Unknown";

          // Extract timestamp - AtCoder format: YYYY-MM-DD HH:MM:SS
          const timeMatch = row.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
          const timestamp = timeMatch ? new Date(timeMatch[1]).getTime() / 1000 : 0;

          // Extract execution time in ms
          const execTimeMatch = row.match(/(\d+)\s*ms/);
          const executionTime = execTimeMatch ? parseInt(execTimeMatch[1], 10) : null;

          if (id > 0 || problemId) {
            recentSubmissions.push({
              id,
              problemId,
              problemName,
              contestId,
              result,
              language,
              timestamp,
              executionTime,
            });
            count++;
          }
        }
      }

      stats.recentSubmissions = recentSubmissions;
    } catch (subErr: any) {
      console.error("[ATCODER] Failed to fetch submissions:", subErr.message);
      // Continue without submissions
    }

    return stats;
  } catch (err: any) {
    console.error("[ATCODER ERROR]", err.message);
    return stats;
  }
}
