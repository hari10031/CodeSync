// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// PUBLIC PAGES
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";

// STUDENT PAGES
import DashboardPage from "./pages/DashboardPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CodePadPage from "./pages/CodePadPage";
import ContestsPage from "./pages/ContestsPage";
import ResourcesPage from "./pages/ResourcesPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

// CAREER SUITE
import CareerSuitePage from "./pages/CareerSuitePage";
import ResumeBuilderPage from "./pages/ResumeBuilderPage";
import ATSAnalyzerPage from "./pages/ATSAnalyzerPage";
import JobSuggestionsPage from "./pages/JobSuggestionsPage";

// CS.ai PAGE
import CSAiPage from "./pages/CSAiPage";

// INSTRUCTOR PAGES
import InstructorDashboard from "./pages/instructor/InstructorDashboard";

export default function App() {
  // 🔁 Bump this whenever login/logout happens so Navbar + routes re-read sessionStorage
  const [authVersion, setAuthVersion] = React.useState(0);

  const handleAuthChange = () => {
    setAuthVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar authVersion={authVersion} />

      <main className="w-full">
        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* AuthPage handles both student + instructor modes */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <AuthPage onLogin={handleAuthChange} />
              </PublicRoute>
            }
          />

          {/* Student onboarding after Google sign-in */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                requireOnboarding={false}
                authVersion={authVersion}
              >

                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- STUDENT ROUTES (Protected) ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/codepad"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <CodePadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contests"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <ContestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resources"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <ResourcesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/ai-assistance"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <CSAiPage />
              </ProtectedRoute>
            }
          />


          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- CAREER SUITE (Protected · student) ---------- */}
          <Route
            path="/career"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <CareerSuitePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/career/resume-builder"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <ResumeBuilderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/career/ats-analyzer"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <ATSAnalyzerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/career/job-suggestions"
            element={
              <ProtectedRoute
                allowedRoles={["student"]}
                authVersion={authVersion}
              >
                <JobSuggestionsPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- INSTRUCTOR ROUTES ---------- */}
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["instructor"]}
                authVersion={authVersion}
              >
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
