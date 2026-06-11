/**
 * PlaceMate – Dashboard Page
 *
 * Post-login landing page with assessment entry, active plan access,
 * and progress overview.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import type { UserProfile } from "@/types";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.get<UserProfile>("/auth/profile");
        setProfile(data);
      } catch {
        // Profile might not exist yet on first login
      }
    }
    fetchProfile();
  }, []);

  const hasPlan = !!profile?.current_plan_id;

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      {/* Navigation bar */}
      <nav className="relative z-10 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              PlaceMate
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full ring-2 ring-gray-700"
              />
            )}
            <span className="text-sm text-gray-300 hidden sm:block">
              {user?.displayName || user?.email}
            </span>
            <button
              id="sign-out-btn"
              onClick={logOut}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Welcome section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back
            {user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
            <span className="ml-2">👋</span>
          </h1>
          <p className="text-gray-400">
            {hasPlan
              ? "Continue your study plan or take a new assessment."
              : "Ready to ace your placements? Start with an assessment test."}
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Take Assessment */}
          <div
            onClick={() => router.push("/test")}
            className="group bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {hasPlan ? "Retake Assessment" : "Take Assessment Test"}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Identify your weak subjects with a mixed-topic MCQ test across
              DSA, OS, DBMS, CN, and Aptitude.
            </p>
            <div className="mt-4 flex items-center gap-1 text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
              Start Test
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>

          {/* Study Plan */}
          <div
            onClick={() => {
              if (hasPlan) {
                router.push(`/plan/${profile!.current_plan_id}`);
              }
            }}
            className={`group rounded-2xl p-6 transition-all duration-300 border ${
              hasPlan
                ? "bg-gray-900/60 backdrop-blur-sm border-gray-800/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 cursor-pointer"
                : "bg-gray-900/40 border-gray-800/30 opacity-50 cursor-not-allowed"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                hasPlan
                  ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
                  : "bg-gray-800/50"
              }`}
            >
              {hasPlan ? (
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              )}
            </div>
            <h3
              className={`text-lg font-semibold mb-1 ${
                hasPlan ? "text-white" : "text-gray-500"
              }`}
            >
              Study Plan
            </h3>
            <p
              className={`text-sm leading-relaxed ${
                hasPlan ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {hasPlan
                ? "Continue your personalized study plan with daily content."
                : "Complete your assessment test first to generate a personalized study plan."}
            </p>
            {hasPlan && (
              <div className="mt-4 flex items-center gap-1 text-emerald-400 text-sm font-medium group-hover:gap-2 transition-all">
                Continue Plan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            )}
          </div>

          {/* Progress (locked for now) */}
          <div className="bg-gray-900/40 border border-gray-800/30 rounded-2xl p-6 opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-500 mb-1">
              Progress
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Track your study streaks, MCQ scores, and overall completion
              percentage. Coming in Phase 4.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
