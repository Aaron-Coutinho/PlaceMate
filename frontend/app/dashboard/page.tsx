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
import ProgressWidget from "@/components/ProgressWidget";
import type { UserProfile, PlanMetadata, TestResult } from "@/types";

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
  const [plans, setPlans] = useState<PlanMetadata[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingTests, setLoadingTests] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directSubjects, setDirectSubjects] = useState<string[]>(["DSA", "OS", "DBMS", "CN", "Aptitude"]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "plan" | "test"; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await api.get<UserProfile>("/auth/profile");
      setProfile(data);
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const data = await api.get<PlanMetadata[]>("/plan");
      setPlans(data);
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchTests = async () => {
    try {
      setLoadingTests(true);
      const data = await api.get<TestResult[]>("/test/history");
      setTests(data);
    } catch (err) {
      console.error("Failed to load tests", err);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPlans();
    fetchTests();
  }, []);

  const handleActivatePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigating to the plan view when clicking the button
    try {
      setActivatingId(planId);
      setError(null);
      await api.post(`/plan/${planId}/activate`);
      if (profile) {
        setProfile({ ...profile, current_plan_id: planId });
      }
      await fetchPlans();
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate study plan.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (deleteTarget.type === "plan") {
        await api.delete(`/plan/${deleteTarget.id}`);
        if (profile?.current_plan_id === deleteTarget.id) {
          setProfile(prev => prev ? { ...prev, current_plan_id: null } : null);
        }
        await fetchPlans();
        await fetchProfile();
      } else {
        await api.delete(`/test/${deleteTarget.id}`);
        await fetchTests();
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete ${deleteTarget.type}.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllTests = async () => {
    setIsClearingHistory(true);
    setError(null);
    try {
      await api.delete("/test/history");
      setTests([]);
      setShowClearHistoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear test history.");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleDirectCreate = () => {
    if (directSubjects.length === 0) return;
    sessionStorage.setItem("weakSubjects", JSON.stringify(directSubjects));
    sessionStorage.removeItem("selectedTopics");
    sessionStorage.removeItem("testResult");
    sessionStorage.removeItem("timeElapsed");
    router.push("/plan/topics");
  };

  const hasPlan = !!profile?.current_plan_id;
  const activePlan = plans.find(p => p.plan_id === profile?.current_plan_id);

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
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Welcome section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back
              {user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
              <span className="ml-2">👋</span>
            </h1>
            <p className="text-gray-400">
              Manage your progress across multiple study plans and view past test configurations.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-8 flex justify-between items-center text-sm text-red-400 animate-in fade-in duration-200">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold px-2">✕</button>
          </div>
        )}

        {/* Active Plan Hero Banner */}
        {activePlan && (
          <>
            <ProgressWidget />
            <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-gray-900/60 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6 md:p-8 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl shadow-indigo-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider mb-3 inline-block">
                ⚡ Active Preparation
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1.5">
                Current Plan: {activePlan.days} Days ({activePlan.hours_per_day}h/day)
              </h2>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activePlan.weak_subjects.map((sub) => (
                  <span key={sub} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-md">
                    {sub}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                Created on {new Date(activePlan.created_at).toLocaleDateString()} · Covers {activePlan.selected_topics.length} topics.
              </p>
            </div>
            <button
              onClick={() => router.push(`/plan/${activePlan.plan_id}`)}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              Continue Study Plan
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
          </>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
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
              Take Assessment Test
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Identify your weak subjects across DSA, OS, DBMS, CN & Aptitude.
              20 questions · AI-analyzed topics
            </p>
            <div className="mt-4 flex items-center gap-1 text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
              Start Test →
            </div>
          </div>

          {/* Create Custom Plan directly */}
          <div
            onClick={() => setShowDirectModal(true)}
            className="group bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-1 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Create Study Plan Directly
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Skip the assessment test and directly choose the subjects and topics you want to prepare.
            </p>
            <div className="mt-4 flex items-center gap-1 text-purple-400 text-sm font-medium group-hover:gap-2 transition-all">
              Configure Custom Plan →
            </div>
          </div>
        </div>

        {/* Dashboard Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Study plans list (Takes 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📂 Your Study Plans
              <span className="text-xs font-normal text-gray-500">({plans.length})</span>
            </h2>

            {loadingPlans ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-gray-900/40 border border-gray-800/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="bg-gray-900/20 border border-gray-800/50 border-dashed rounded-2xl p-8 text-center text-gray-500">
                No study plans generated yet. Click above to start!
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((p) => {
                  const isActive = profile?.current_plan_id === p.plan_id;
                  return (
                    <div
                      key={p.plan_id}
                      onClick={() => router.push(`/plan/${p.plan_id}`)}
                      className={`group p-5 rounded-2xl border transition-all duration-300 relative flex justify-between items-center cursor-pointer ${
                        isActive
                          ? "bg-indigo-500/5 border-indigo-500/35 hover:border-indigo-500/55"
                          : "bg-gray-900/50 border-gray-800/60 hover:border-gray-700/80"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-white font-semibold text-base">
                            {p.days} Days Plan
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {p.hours_per_day}h/day
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.weak_subjects.map((sub) => (
                            <span
                              key={sub}
                              className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-xs rounded border border-gray-700/30"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          Created {new Date(p.created_at).toLocaleDateString()} · Covers {p.selected_topics.length} topics
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={(e) => handleActivatePlan(p.plan_id, e)}
                            disabled={activatingId !== null}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white border border-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            {activatingId === p.plan_id ? "Activating..." : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: "plan", id: p.plan_id });
                          }}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                          aria-label="Delete study plan"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Test History sidebar (Takes 1 column) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                📈 Test History
                <span className="text-xs font-normal text-gray-500">({tests.length})</span>
              </h2>
              {tests.length > 0 && (
                <button
                  onClick={() => setShowClearHistoryModal(true)}
                  className="text-xs text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 px-3 py-1.5 rounded-lg transition-all duration-200 font-medium cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {loadingTests ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-gray-900/40 border border-gray-800/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tests.length === 0 ? (
              <div className="bg-gray-900/20 border border-gray-800/50 border-dashed rounded-2xl p-6 text-center text-gray-500 text-sm">
                No history. Take a test to analyze weak subjects!
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((t) => (
                  <div
                    key={t.test_id}
                    onClick={() => {
                      sessionStorage.setItem("testResult", JSON.stringify(t));
                      sessionStorage.setItem("timeElapsed", "0");
                      router.push("/test/results");
                    }}
                    className="p-4 bg-gray-900/50 border border-gray-800/60 rounded-2xl transition-all duration-300 flex justify-between items-center group hover:border-indigo-500/30 hover:bg-gray-900/80 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {t.overall_percentage.toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        Weak: {t.weak_subjects.join(", ") || "None"}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: "test", id: t.test_id });
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      aria-label="Delete test result"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Create Custom Plan Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl shadow-indigo-500/5 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white mb-2">
              Create Custom Study Plan
            </h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Select the subjects you want to include in your personalized study plan. You will be able to customize specific topics for each subject in the next step.
            </p>

            {/* Grid of subjects */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {["DSA", "OS", "DBMS", "CN", "Aptitude"].map((subject) => {
                const isSelected = directSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() => {
                      setDirectSubjects(prev =>
                        isSelected
                          ? prev.filter(s => s !== subject)
                          : [...prev, subject]
                      );
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-lg shadow-indigo-500/5 scale-[1.02]"
                        : "bg-gray-800/30 border-gray-800/50 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                    }`}
                  >
                    <span className="text-2xl mb-2">
                      {subject === "DSA"
                        ? "🧮"
                        : subject === "OS"
                        ? "🖥️"
                        : subject === "DBMS"
                        ? "🗃️"
                        : subject === "CN"
                        ? "🌐"
                        : "📊"}
                    </span>
                    <span className="font-semibold text-sm">{subject}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDirectModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDirectCreate}
                disabled={directSubjects.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm hover:-translate-y-0.5 cursor-pointer"
              >
                Next: Choose Topics →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-red-500/5 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Delete {deleteTarget.type === "plan" ? "Study Plan" : "Test Result"}?
            </h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to delete this {deleteTarget.type === "plan" ? "study plan and all associated progress" : "test result"}? This action will permanently delete the record and cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20 text-sm hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Test History Confirmation Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-red-500/5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Clear All Test History?</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              This will permanently delete all <span className="text-white font-semibold">{tests.length}</span> test result{tests.length !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearHistoryModal(false)}
                disabled={isClearingHistory}
                className="px-5 py-2.5 rounded-xl border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllTests}
                disabled={isClearingHistory}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20 text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isClearingHistory ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Yes, Clear All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

