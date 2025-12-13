// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config(); // ✅ load .env FIRST

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

// ROUTES
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import instructorRoutes from "./routes/instructor.routes";
import careerRoutes from "./routes/career.routes";
import aiRoutes from "./routes/ai.routes";
import codepadRoutes from "./routes/codepad.routes";
import contestsRouter from "./routes/contests.routes";

// FIREBASE
import { firestore, FieldValue } from "./config/firebase";

const app = express();

/* --------------------------------------------------
 * MIDDLEWARE
 * -------------------------------------------------- */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ATS payloads can get big (resume text + JD)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* --------------------------------------------------
 * ROUTES
 * -------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/instructor", instructorRoutes);

// ✅ CAREER SUITE ROUTES
app.use("/api/career", careerRoutes);

// CodePad
app.use("/api", codepadRoutes);

// Contests
app.use("/api", contestsRouter);

// CS.ai
app.use("/api/ai", aiRoutes);

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hint: {
      ats: "POST /api/career/ats-analyzer",
      pingCareer: "GET /api/career/ping (if enabled in career.routes.ts)",
    },
  });
});

/* --------------------------------------------------
 * Ensure default instructor user always exists
 * -------------------------------------------------- */
async function ensureDefaultInstructor() {
  const usersCol = firestore.collection("users");
  const instructorsCol = firestore.collection("instructors");

  const email = "instructor@gmail.com";
  const password = "instructor@1234";
  const name = "Default Instructor";

  try {
    const snap = await usersCol.where("email", "==", email).limit(1).get();

    let userRef;
    let userId: string;

    if (snap.empty) {
      userRef = usersCol.doc();
      userId = userRef.id;

      await userRef.set({
        email,
        name,
        role: "instructor",
        firebaseUid: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("⚙️ Created new default instructor user document.");
    } else {
      const doc = snap.docs[0];
      userRef = doc.ref;
      userId = doc.id;

      await userRef.set(
        {
          email,
          name: doc.data().name || name,
          role: "instructor",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("⚙️ Ensured existing user is marked as instructor.");
    }

    const instructorRef = instructorsCol.doc(userId);
    const instructorSnap = await instructorRef.get();

    const passwordHash = await bcrypt.hash(password, 10);

    if (!instructorSnap.exists) {
      await instructorRef.set({
        userId,
        passwordHash,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log("⚙️ Created instructor document with default password.");
    } else {
      await instructorRef.set(
        {
          passwordHash,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log("⚙️ Updated instructor passwordHash for default instructor.");
    }

    console.log("✅ Default instructor ensured:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (err) {
    console.error("❌ Error while ensuring default instructor:", err);
  }
}

/* --------------------------------------------------
 * START SERVER
 * -------------------------------------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  ensureDefaultInstructor();
});
