// src/routes/contests.routes.ts

import express, { Request, Response } from "express";
import axios, { AxiosRequestConfig } from "axios";

const router = express.Router();

/* ----------------- CONSTANTS ----------------- */

const CODOLIO_URL =
  "https://node.codolio.com/api/contest-calendar/v1/all/get-upcoming-contests";

const HACKERRANK_API_URL =
  "https://www.hackerrank.com/community/engage/events";

const CODE360_API_URL =
  "https://www.naukri.com/code360/api/v4/public_section/contest_list?page_size=10&page=1&participate=true&request_differentiator=1762515871887&app_context=publicsection&naukri_request=true";

const code360Config: AxiosRequestConfig = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  },
};

/* ----------------- SIMPLE IN-MEMORY CACHE ----------------- */

const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

let contestsCache: any | null = null;
let contestsCacheTimestamp = 0;

/* ----------------- TYPES (MINIMAL, PRACTICAL) ----------------- */

type HackerRankRawEvent = {
  id: string | number;
  type?: string;
  attributes?: {
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type HackerRankFormattedEvent = {
  id: string | number;
  type?: string;
  [key: string]: unknown;
};

type Code360RawEvent = {
  name: string;
  event_start_time: number;
  event_end_time: number;
  slug: string;
  registration_status: string;
  [key: string]: unknown;
};

type Code360Contest = {
  name: string;
  start_time: string;
  end_time: string;
  url: string;
  platform: string;
};

/* ----------------- HELPERS ----------------- */

function toReadableTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

/* ----------------- HACKERRANK FETCHER ----------------- */

async function fetchHackerrankEvents(): Promise<HackerRankFormattedEvent[]> {
  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  try {
    console.log(`Fetching JSON from HackerRank API: ${HACKERRANK_API_URL}`);

    const { data: jsonData } = await axios.get(HACKERRANK_API_URL, {
      headers: browserHeaders,
    });

    const ongoingEvents: HackerRankRawEvent[] =
      jsonData?.data?.events?.ongoing_events || [];
    const pastEvents: HackerRankRawEvent[] =
      jsonData?.data?.events?.past_events || [];

    const allEvents: HackerRankRawEvent[] = [...ongoingEvents, ...pastEvents];

    if (allEvents.length === 0) return [];

    const publishedEvents = allEvents.filter((event) => {
      const status = event.attributes?.status;
      return typeof status === "string" && status.toLowerCase() === "published";
    });

    const formattedEvents: HackerRankFormattedEvent[] = publishedEvents.map(
      (event) => ({
        id: event.id,
        type: event.type,
        ...(event.attributes || {}),
      })
    );

    console.log(
      `HackerRank API: Found ${formattedEvents.length} published events.`
    );
    return formattedEvents;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching HackerRank";
    console.error("\n--- Error fetching HackerRank data: ---");
    console.error(message);
    // graceful fallback
    return [];
  }
}

/* ----------------- CODE360 FETCHER ----------------- */

async function fetchCode360Contests(): Promise<Code360Contest[]> {
  try {
    console.log(`Fetching data from Code 360...`);

    const response = await axios.get(CODE360_API_URL, code360Config);
    const data = response.data;

    if (data && data.data && Array.isArray(data.data.events)) {
      const allEvents: Code360RawEvent[] = data.data.events;

      const openContests = allEvents.filter(
        (event) => event.registration_status === "REGISTRATIONS_OPEN"
      );

      if (openContests.length > 0) {
        const formattedContests: Code360Contest[] = openContests.map(
          (contest) => ({
            name: contest.name,
            start_time: toReadableTime(contest.event_start_time),
            end_time: toReadableTime(contest.event_end_time),
            url: `https://www.naukri.com/code360/contests/${contest.slug}`,
            platform: "Code 360",
          })
        );

        console.log(
          `Code 360 API: Found ${formattedContests.length} open contests.`
        );
        return formattedContests;
      }

      return [];
    }

    return [];
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching Code 360";
    console.error("Error fetching Code 360 data:", message);
    return [];
  }
}

/* ----------------- ROUTE: GET /api/contests ----------------- */
/**
 * @route GET /contests
 * @desc Gets contest data from all sources (Codolio, HackerRank, Code360)
 *       Uses 5-hour in-memory cache to avoid hitting external APIs on every visit.
 * (Full path will be /api/contests when mounted as /api)
 */
router.get(
  "/contests",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const now = Date.now();

      // If cache is fresh, return it directly
      if (
        contestsCache &&
        now - contestsCacheTimestamp < CACHE_TTL_MS
      ) {
        console.log(
          "[/contests] Serving contests from cache (fresh within 5 hours)."
        );
        res.json(contestsCache);
        return;
      }

      console.log(
        "[/contests] Cache empty or expired. Fetching from Codolio, HackerRank, and Code 360..."
      );

      const codolioPromise = axios.get(CODOLIO_URL);
      const hackerrankPromise = fetchHackerrankEvents();
      const code360Promise = fetchCode360Contests();

      const [codolioResponse, hackerrankEvents, code360Contests] =
        await Promise.all([codolioPromise, hackerrankPromise, code360Promise]);

      if (codolioResponse.status < 200 || codolioResponse.status >= 300) {
        throw new Error(
          `Codolio HTTP error! Status: ${codolioResponse.status}`
        );
      }

      const codolioData = codolioResponse.data;

      const combinedData = {
        ...codolioData,
        hackerrank: hackerrankEvents,
        code360: code360Contests,
      };

      // Save to cache
      contestsCache = combinedData;
      contestsCacheTimestamp = now;

      console.log("[/contests] Cache updated.");
      res.json(combinedData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error in /contests";
      console.error("Error in combined API endpoint:", message);

      // If we have old cache, serve stale data instead of full failure
      if (contestsCache) {
        console.warn(
          "[/contests] Returning stale cached data due to fetch error."
        );
        res.json(contestsCache);
        return;
      }

      res.status(500).json({ error: "Failed to fetch all data" });
    }
  }
);

export default router;
