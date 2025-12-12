// src/components/Navbar.tsx
/* FINAL NAVBAR — ROLE AWARE (STUDENT / INSTRUCTOR, COMPACT, ANIMATED, SAFE) */

import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  RiNotification3Line,
  RiUserLine,
  RiSettings3Line,
  RiLogoutBoxRLine,
} from "react-icons/ri";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import csLogo from "../assets/logo/logo.png";

type Role = "student" | "instructor" | null;

type NavbarProps = {
  authVersion: number; // from App
};

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  read?: boolean;
  route?: string; // where to navigate when clicked
};

const Navbar: React.FC<NavbarProps> = ({ authVersion }) => {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [displayName, setDisplayName] = useState<string>("Instructor");
  const [displayEmail, setDisplayEmail] = useState<string>("instructor@college.edu");
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // 🔔 Demo notifications (you can wire real ones later)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "Check out today’s contests ⚔️",
      description: "Jump into live contests and push your rank.",
      time: "Just now",
      read: false,
      route: "/contests",
    },
    {
      id: "2",
      title: "Leaderboard updated 📈",
      description: "You’ve moved up on the CodeSync board.",
      time: "10 min ago",
      read: false,
      route: "/leaderboard",
    },
    {
      id: "3",
      title: "New resources unlocked 📚",
      description: "Fresh sheets, notes & DSA playlists added.",
      time: "1 hr ago",
      read: false,
      route: "/resources",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  /* --------------------------------------------------
     🧠 AUTH SYNC (Runs whenever authVersion changes)
     - Reads token + role + name + email from sessionStorage
  -------------------------------------------------- */
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const storedRole = sessionStorage.getItem("role") as Role | null;
    const storedName = sessionStorage.getItem("userName") || "";
    const storedEmail = sessionStorage.getItem("userEmail") || "";

    if (token && storedRole) {
      setRole(storedRole);
      setIsLoggedIn(true);

      if (storedName) setDisplayName(storedName);
      if (storedEmail) setDisplayEmail(storedEmail);
    } else {
      setRole(null);
      setIsLoggedIn(false);
      setDisplayName("Instructor");
      setDisplayEmail("instructor@college.edu");
      setAvatarPhoto(null);
    }

    setAuthReady(true);
  }, [authVersion]);

  /* --------------------------------------------------
     👤 STUDENT AVATAR + NAME FROM FIREBASE
     - Only attach listener when role === "student"
  -------------------------------------------------- */
  useEffect(() => {
    if (role !== "student") return;

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        if (u.displayName) setDisplayName(u.displayName);
        if (u.email) setDisplayEmail(u.email);
        setAvatarPhoto(u.photoURL || null);
      } else {
        setAvatarPhoto(null);
      }
    });

    return () => unsub();
  }, [role]);

  /* --------------------------------------------------
     🔐 CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  -------------------------------------------------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const linkGlow =
    "after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-0 " +
    "after:bg-gradient-to-r after:from-sky-400 after:via-fuchsia-400 after:to-rose-400 " +
    "after:transition-all after:duration-300 hover:after:w-full";

  function linkClass(isActive: boolean) {
    return `
      relative pb-0.5 text-[0.7rem] sm:text-xs 
      transition-all duration-200 ease-out
      ${
        isActive
          ? "text-slate-50 after:w-full scale-[1.03]"
          : "text-slate-300 hover:text-slate-100 hover:-translate-y-[1px]"
      }
      ${linkGlow}
    `;
  }

  /* --------------------------------------------------
     🚪 LOGOUT HANDLER
  -------------------------------------------------- */
  const handleLogout = async () => {
    try {
      if (role === "student") {
        await signOut(auth).catch(() => {});
      }
    } finally {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("userName");

      setRole(null);
      setIsLoggedIn(false);
      setProfileDropdownOpen(false);

      navigate("/", { replace: true });
      window.location.reload();
    }
  };

  const avatarLetter = (displayName && displayName.trim().charAt(0).toUpperCase()) || "U";

  // Student nav links (CS.ai beside Resources)
  const studentLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/leaderboard", label: "Leaderboard" },
    { to: "/contests", label: "Contests" },
    { to: "/codepad", label: "CodePad" },
    { to: "/career", label: "Career Suite" }, // ✅ FIXED (was /career/resume)
    { to: "/resources", label: "Resources" },
    { to: "/ai-assistance", label: "CS.ai" },
  ];

  // Instructor nav links
  const instructorLinks = [{ to: "/instructor/dashboard", label: "Dashboard" }];

  const showLoggedInUI = authReady && isLoggedIn && role !== null;

  // 🔗 Where should the brand/logo link go?
  const brandTarget =
    showLoggedInUI && role
      ? role === "student"
        ? "/dashboard"
        : "/instructor/dashboard"
      : "/";

  /* --------------------------------------------------
     🔔 NOTIFICATION CLICK HANDLER
  -------------------------------------------------- */
  const handleNotificationClick = (id: string, route?: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNotificationsOpen(false);
    if (route) navigate(route);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050509]/95 backdrop-blur-xl border-b border-slate-900">
      <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-1 transition-all duration-200">
        {/* BRAND */}
        <Link
          to={brandTarget}
          className="flex items-center gap-2 sm:gap-3 group transition-transform duration-200"
        >
          <img
            src={csLogo}
            className="h-12 w-12 sm:h-12 sm:w-12 drop-shadow-[0_0_18px_rgba(56,189,248,0.7)] group-hover:drop-shadow-[0_0_22px_rgba(56,189,248,0.9)] transition-all duration-200"
            alt="CS logo"
          />
          <span className="text-lg sm:text-xl font-semibold tracking-wide text-slate-50 leading-none">
            Code
            <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 text-transparent bg-clip-text">
              Sync
            </span>
          </span>
        </Link>

        {/* NAV LINKS (CENTER) */}
        {showLoggedInUI && role === "student" && (
          <ul className="hidden lg:flex items-center gap-5 text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.16em]">
            {studentLinks.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={({ isActive }) => linkClass(isActive)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        {showLoggedInUI && role === "instructor" && (
          <ul className="hidden lg:flex items-center gap-5 text-[0.7rem] sm:text-xs font-medium uppercase tracking-[0.16em]">
            {instructorLinks.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={({ isActive }) => linkClass(isActive)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* LOGGED OUT VIEW */}
          {!showLoggedInUI ? (
            <>
              <Link
                to="/auth?mode=instructor"
                className="px-3 sm:px-3.5 py-1 rounded-full border border-slate-800 bg-slate-950/80 
                           text-[0.7rem] sm:text-xs text-slate-100 hover:border-fuchsia-400 hover:bg-slate-900 
                           transition-all duration-200 hover:-translate-y-[1px]"
              >
                Teacher Login
              </Link>

              <Link
                to="/auth?mode=student"
                className="px-4 sm:px-5 py-1.5 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 
                           text-[0.7rem] sm:text-xs font-semibold text-black shadow-[0_0_16px_rgba(168,85,247,0.6)] 
                           hover:brightness-110 transition-all duration-200 active:scale-95 hover:-translate-y-[1px]"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              {/* ROLE PILL */}
              {role && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full border border-slate-800 bg-slate-950/80 text-[0.65rem] uppercase tracking-[0.14em] text-slate-300 transition-all duration-200">
                  {role === "student" ? "Student" : "Instructor"}
                </span>
              )}

              {/* NOTIFICATIONS */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative h-9 w-9 flex items-center justify-center rounded-full border border-slate-800 
                             bg-slate-950 text-slate-100 hover:border-sky-400 hover:bg-slate-900 
                             transition-all duration-200 hover:-translate-y-[1px] shadow-[0_0_0_1px_rgba(15,23,42,0.9)]"
                  aria-label="Notifications"
                >
                  <RiNotification3Line className="text-base" />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-[#050509]/95 p-3 shadow-2xl shadow-black/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-100">Notifications</p>
                      <span className="text-[0.65rem] text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} new` : "No new alerts"}
                      </span>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="mb-2 h-9 w-9 rounded-full bg-slate-900/80 flex items-center justify-center border border-slate-700">
                          <RiNotification3Line className="text-slate-400" />
                        </div>
                        <p className="text-xs font-medium text-slate-200">No notifications yet</p>
                        <p className="mt-1 text-[0.65rem] text-slate-500 max-w-[13rem]">
                          You&apos;ll see contest alerts, leaderboard updates and profile tips here.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(n.id, n.route)}
                              className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-colors ${
                                n.read
                                  ? "border-slate-800 bg-slate-950/60 text-slate-300"
                                  : "border-sky-600/50 bg-sky-500/10 text-slate-100"
                              } hover:border-sky-400 hover:bg-slate-900`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium">{n.title}</p>
                                  {n.description && (
                                    <p className="mt-0.5 text-[0.7rem] text-slate-400">
                                      {n.description}
                                    </p>
                                  )}
                                </div>
                                {n.time && (
                                  <span className="text-[0.6rem] text-slate-500 whitespace-nowrap">
                                    {n.time}
                                  </span>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* PROFILE */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileDropdownOpen((p) => !p)}
                  className="relative h-9 w-9 rounded-full p-[1px] bg-gradient-to-br from-sky-500/80 via-fuchsia-500/60 to-emerald-400/80 
                             hover:from-sky-400 hover:via-fuchsia-400 hover:to-emerald-300 transition-all duration-200
                             shadow-[0_0_16px_rgba(56,189,248,0.6)] hover:-translate-y-[1px]"
                  aria-label="Profile"
                >
                  <div className="h-full w-full rounded-full bg-slate-950/95 border border-slate-700/70 flex items-center justify-center overflow-hidden">
                    {avatarPhoto ? (
                      <img
                        src={avatarPhoto}
                        className="h-full w-full object-cover rounded-full"
                        alt="Avatar"
                      />
                    ) : (
                      <span className="text-sm font-semibold bg-gradient-to-br from-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {avatarLetter}
                      </span>
                    )}
                  </div>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-[#050509]/95 p-3 shadow-xl shadow-black/70">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 overflow-hidden">
                        {avatarPhoto ? (
                          <img
                            src={avatarPhoto}
                            className="h-full w-full object-cover rounded-full"
                            alt="Avatar"
                          />
                        ) : (
                          <span className="text-xs font-semibold bg-gradient-to-br from-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                            {avatarLetter}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
                        <p className="text-[0.68rem] text-slate-500 truncate">{displayEmail}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5 text-xs sm:text-sm">
                      <Link
                        to={role === "student" ? "/profile" : "/instructor/dashboard"}
                        className="flex items-center gap-2 text-slate-200 hover:text-sky-400 transition-colors duration-150"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <RiUserLine /> Profile
                      </Link>

                      <Link
                        to={role === "student" ? "/settings" : "/instructor/dashboard"}
                        className="flex items-center gap-2 text-slate-200 hover:text-sky-400 transition-colors duration-150"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <RiSettings3Line /> Settings
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors duration-150"
                      >
                        <RiLogoutBoxRLine /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
