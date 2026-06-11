/**
 * PlaceMate – Plan Overview Page
 *
 * Shows the generated study plan with all days listed as cards.
 * Locked days show a padlock, completed days show a checkmark,
 * and the current active day has a pulsing indicator.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";

interface DaySummary {
  day_number: number;
  subject: string;
  topics: string[];
  learning_objectives: string[];
  is_unlocked: boolean;
  is_completed: boolean;
}

interface PlanData {
  plan_id: string;
  days: DaySummary[];
  weak_subjects: string[];
  selected_topics: string[];
  hours_per_day: number;
  status: string;
  created_at: string;
}

export default function PlanOverviewPage() {
  return (
    <ProtectedRoute>
      <PlanOverviewContent />
    </ProtectedRoute>
  );
}

function PlanOverviewContent() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const data = await api.get<PlanData>(`/plan/${planId}`);
        setPlan(data);
      } catch (err) {
        setError("Failed to load plan. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [planId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900/70 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error || "Plan not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const completedDays = plan.days.filter((d) => d.is_completed).length;
  const totalDays = plan.days.length;
  const progressPercent = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  // Find the first unlocked-but-not-completed day (current active day)
  const activeDayNumber =
    plan.days.find((d) => d.is_unlocked && !d.is_completed)?.day_number ?? -1;

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </button>
          <span className="text-sm text-gray-500">
            {completedDays}/{totalDays} days complete
          </span>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Study Plan
          </h1>
          <p className="text-gray-400">
            {totalDays}-day plan • {plan.hours_per_day}h/day •{" "}
            {plan.weak_subjects.join(", ")}
          </p>

          {/* Overall progress bar */}
          <div className="mt-4 bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progressPercent.toFixed(0)}% complete
          </p>
        </div>

        {/* Day cards */}
        <div className="space-y-3">
          {plan.days.map((day) => {
            const isActive = day.day_number === activeDayNumber;
            const isLocked = !day.is_unlocked;
            const isCompleted = day.is_completed;

            return (
              <button
                key={day.day_number}
                id={`day-card-${day.day_number}`}
                onClick={() => {
                  if (!isLocked) {
                    router.push(`/plan/${planId}/day/${day.day_number}`);
                  }
                }}
                disabled={isLocked}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                    : isActive
                    ? "bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                    : isLocked
                    ? "bg-gray-900/30 border-gray-800/30 opacity-50 cursor-not-allowed"
                    : "bg-gray-900/50 border-gray-800/50 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500/20"
                        : isActive
                        ? "bg-indigo-500/20"
                        : "bg-gray-800/50"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : isLocked ? (
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    ) : isActive ? (
                      <div className="relative">
                        <div className="w-3 h-3 bg-indigo-400 rounded-full" />
                        <div className="absolute inset-0 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 font-semibold">
                        {day.day_number}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          isLocked ? "text-gray-600" : "text-white"
                        }`}
                      >
                        Day {day.day_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          isLocked
                            ? "bg-gray-800 text-gray-600"
                            : "bg-indigo-500/15 text-indigo-300"
                        }`}
                      >
                        {day.subject}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        isLocked ? "text-gray-700" : "text-gray-400"
                      }`}
                    >
                      {day.topics.join(" • ")}
                    </p>
                  </div>

                  {/* Arrow or lock hint */}
                  {!isLocked && (
                    <svg
                      className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
