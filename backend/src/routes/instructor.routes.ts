// src/routes/instructor.routes.ts
import express, { Response } from "express";
import { firestore, FieldValue } from "../config/firebase";

import authMiddleware, { AuthedRequest } from "../middleware/auth.middleware";
import { requireInstructor } from "../middleware/role.middleware";

import { PlatformId } from "../lib/scoringEngine";
import { refreshStudentCPData } from "../services/userCpRefreshService";

const router = express.Router();

type AuthedReq = AuthedRequest & {
  body: any;
  query: any;
  params: any;
};

const STUDENTS_COLLECTION = "students";
const studentsCol = firestore.collection(STUDENTS_COLLECTION);

function safeStr(x: any) {
  return (x ?? "").toString().trim();
}

function toISO(d: any): string | null {
  // Firestore Timestamp support
  if (!d) return null;
  if (typeof d === "string") return d;
  if (d?.toDate) return d.toDate().toISOString();
  return null;
}

function isWithinDays(isoOrTs: any, days: number) {
  const iso = toISO(isoOrTs);
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const diff = Date.now() - t;
  return diff <= days * 24 * 60 * 60 * 1000;
}

/**
 * Try to extract "platform signals" from cpScores if present.
 * If you later store cpScores.breakdown.platformPoints or similar,
 * this will automatically start showing real values.
 */
function extractPlatformSignals(cpScores: any): Record<string, number> {
  const out: Record<string, number> = {
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    github: 0,
    hackerrank: 0,
    atcoder: 0,
  };

  if (!cpScores) return out;

  // Common patterns you might have in cpScores:
  // cpScores.breakdown.platforms.leetcode
  // cpScores.breakdown.platformPoints.leetcode
  const b = cpScores.breakdown || cpScores.scoreBreakdown || null;
  const candidates = [
    b?.platforms,
    b?.platformPoints,
    b?.platform,
    cpScores.platforms,
  ].filter(Boolean);

  for (const c of candidates) {
    for (const k of Object.keys(out)) {
      const v = c?.[k];
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
  }

  return out;
}

/* ==================================================
 * ✅ GET /api/instructor/dashboard
 * Query: ?branch=&section=&year=&q=&limit=
 * - Reads REAL Firestore students
 * - Maps to InstructorDashboard.tsx Student shape
 * ================================================== */
router.get(
  "/dashboard",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const branch = safeStr(req.query?.branch);
      const section = safeStr(req.query?.section);
      const year = safeStr(req.query?.year);
      const q = safeStr(req.query?.q).toLowerCase();
      const limit = Math.min(2000, Math.max(1, Number(req.query?.limit || 800)));

      // Firestore query (only AND filters supported)
      let query: FirebaseFirestore.Query = studentsCol;

      // Optional: only onboarded students
      query = query.where("onboardingCompleted", "==", true);

      if (branch && branch !== "all") query = query.where("branch", "==", branch);
      if (section && section !== "all") query = query.where("section", "==", section);

      // Your DB stores yearOfStudy + year (dup). Prefer yearOfStudy.
      if (year && year !== "all") query = query.where("yearOfStudy", "==", year);

      const snap = await query.limit(limit).get();

      let maxSync: number | null = null;

      const students = snap.docs
        .map((doc) => {
          const d = doc.data() || {};
          const cpScores = d.cpScores || null;

          const name = d.fullName || d.fullname || d.name || null;

          const codesyncScore =
            typeof cpScores?.displayScore === "number" ? cpScores.displayScore : 0;

          // "activity" signal:
          // prefer lastActiveAt if you store it, else cpScores.updatedAt, else student updatedAt
          const lastActiveAt =
            d.lastActiveAt ||
            cpScores?.updatedAt ||
            d.updatedAt ||
            null;

          const activeThisWeek = isWithinDays(lastActiveAt, 7);

          const updatedAtIso = toISO(d.updatedAt);
          if (updatedAtIso) {
            const t = new Date(updatedAtIso).getTime();
            if (Number.isFinite(t)) maxSync = maxSync === null ? t : Math.max(maxSync, t);
          }

          // platform signals (optional)
          const platforms = extractPlatformSignals(cpScores);

          // local search filter (Firestore can't do contains)
          if (q) {
            const hay = `${name ?? ""} ${doc.id} ${d.branch ?? ""} ${d.section ?? ""} ${d.yearOfStudy ?? ""} ${d.rollNumber ?? ""}`.toLowerCase();
            if (!hay.includes(q)) return null;
          }

          return {
            id: doc.id,
            name: name ?? doc.id,

            // You said you mainly have: branch, section, year
            branch: d.branch || null,
            section: d.section || null,
            year: d.yearOfStudy || d.year || null,

            // keep these if you want to show later in drawer/table
            email: d.collegeEmail || d.personalEmail || null,
            phone: d.phone || null,

            codesyncScore,
            prevScore:
              typeof cpScores?.prevDisplayScore === "number"
                ? cpScores.prevDisplayScore
                : typeof d.prevScore === "number"
                ? d.prevScore
                : undefined,

            activeThisWeek,
            lastActiveAt: toISO(lastActiveAt),

            platforms: {
              leetcode: platforms.leetcode,
              codeforces: platforms.codeforces,
              codechef: platforms.codechef,
              github: platforms.github,
              hackerrank: platforms.hackerrank,
              atcoder: platforms.atcoder,
            },
          };
        })
        .filter(Boolean);

      return res.json({
        students,
        lastSyncAt: maxSync ? new Date(maxSync).toISOString() : null,
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR GET /dashboard] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load instructor dashboard" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/refresh-cohort
 * Body (optional): { branch, section, year, limit }
 * - Refresh CP data for that cohort using your existing service
 * ================================================== */
router.post(
  "/refresh-cohort",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const branch = safeStr(req.body?.branch);
      const section = safeStr(req.body?.section);
      const year = safeStr(req.body?.year);
      const limit = Math.min(500, Math.max(1, Number(req.body?.limit || 120)));

      let query: FirebaseFirestore.Query = studentsCol.where(
        "onboardingCompleted",
        "==",
        true
      );

      if (branch && branch !== "all") query = query.where("branch", "==", branch);
      if (section && section !== "all") query = query.where("section", "==", section);
      if (year && year !== "all") query = query.where("yearOfStudy", "==", year);

      const snap = await query.limit(limit).get();
      const ids = snap.docs.map((d) => d.id);

      // simple concurrency (avoid hammering scrapers)
      const CONCURRENCY = 5;
      let ok = 0;
      const errors: Array<{ studentId: string; error: string }> = [];

      for (let i = 0; i < ids.length; i += CONCURRENCY) {
        const batch = ids.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async (studentId) => {
            try {
              await refreshStudentCPData(studentId);
              ok += 1;
            } catch (e: any) {
              errors.push({ studentId, error: e?.message || "refresh failed" });
            }
          })
        );
      }

      return res.json({
        message: "Refresh triggered",
        requested: ids.length,
        refreshed: ok,
        errors,
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR POST /refresh-cohort] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to refresh cohort" });
    }
  }
);

export default router;
