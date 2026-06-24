/**
 * PlaceMate – Plan Configuration Page
 *
 * Captures study plan parameters (days, hours per day) and
 * triggers AI plan generation via the backend.
 *
 * Derives the active weak subjects from the selected topics —
 * if the user deselected all topics for a subject, that subject
 * is excluded from both the Plan Summary and the generation request.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { TOPIC_MAP } from "@/config/topicMap";
import type { PlanResponse } from "@/types";
import InteractiveLoadingScreen from "@/components/InteractiveLoadingScreen";

export default function PlanConfigPage() {
  return (
    <ProtectedRoute>
      <PlanConfigContent />
    </ProtectedRoute>
  );
}

function PlanConfigContent() {
  const router = useRouter();
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [months, setMonths] = useState(0);
  const [daysVal, setDaysVal] = useState(14);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = months * 30 + daysVal;

  useEffect(() => {
    const storedSubjects = sessionStorage.getItem("weakSubjects");
    const storedTopics = sessionStorage.getItem("selectedTopics");

    if (!storedSubjects || !storedTopics) {
      router.push("/test");
      return;
    }

    setWeakSubjects(JSON.parse(storedSubjects));
    setSelectedTopics(JSON.parse(storedTopics));
  }, [router]);

  // Derive which weak subjects actually have at least one selected topic.
  // If CN is fully deselected in topic selection, it shouldn't be sent for plan generation.
  const activeWeakSubjects = weakSubjects.filter((subject) => {
    const subjectTopics = TOPIC_MAP[subject] || [];
    return subjectTopics.some((topic) => selectedTopics.includes(topic));
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await api.post<PlanResponse>("/plan/generate", {
        weak_subjects: activeWeakSubjects,
        topics: selectedTopics,
        days,
        hours_per_day: hoursPerDay,
      });

      // Clear session data
      sessionStorage.removeItem("testResult");
      sessionStorage.removeItem("weakSubjects");
      sessionStorage.removeItem("selectedTopics");
      sessionStorage.removeItem("timeElapsed");

      // Store plan ID and navigate to plan view
      sessionStorage.setItem("currentPlanId", result.plan_id);
      router.push(`/plan/${result.plan_id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate plan. Please try again."
      );
      setGenerating(false);
    }
  };



  if (generating) {
    return (
      <InteractiveLoadingScreen
        days={days}
        topicsCount={selectedTopics.length}
        subjectsCount={activeWeakSubjects.length}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-cyan-600/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back to Topics
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            Configure Your Plan
          </h1>
          <p className="text-gray-400">
            Set your study timeline and daily commitment.
          </p>
        </div>

        {/* Plan summary — uses activeWeakSubjects (only subjects with selected topics) */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Plan Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Weak Subjects</p>
              <div className="flex flex-wrap gap-1.5">
                {activeWeakSubjects.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-red-500/15 text-red-300 text-xs rounded-md border border-red-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Topics Selected</p>
              <p className="text-white font-semibold">
                {selectedTopics.length} topics
              </p>
            </div>
          </div>
        </div>

        {/* Study Duration – Two sliders */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-6">
          <label className="block text-white font-semibold mb-4">
            Study Duration
          </label>

          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Months Slider */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Months <span className="text-xs text-gray-500">(30 days/mo)</span></span>
                <span className="text-indigo-400 font-semibold text-sm bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/30">
                  {months} mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 mo</span>
                <span>12 mo</span>
              </div>
            </div>

            {/* Plus sign */}
            <div className="text-2xl font-bold text-indigo-400 px-2 select-none md:mt-2">
              +
            </div>

            {/* Days Slider */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Days</span>
                <span className="text-indigo-400 font-semibold text-sm bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/30">
                  {daysVal} days
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={daysVal}
                onChange={(e) => setDaysVal(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 days</span>
                <span>30 days</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800/50 flex justify-between items-center">
            <span className="text-sm text-gray-400">Total Preparation Time:</span>
            <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {days} day{days !== 1 ? "s" : ""}
            </span>
          </div>

          {days === 0 && (
            <p className="text-xs text-red-400 font-semibold mt-3 animate-pulse">
              ⚠️ Please select a duration of at least 1 day.
            </p>
          )}
        </div>

        {/* Hours per day */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-8">
          <label className="block text-white font-semibold mb-4">
            Hours Per Day
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
              <button
                key={h}
                onClick={() => setHoursPerDay(h)}
                className={`py-3 rounded-xl text-sm font-medium transition-all border ${
                  hoursPerDay === h
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-gray-800/30 border-gray-800/50 text-gray-400 hover:border-gray-700"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Total study time:{" "}
            <span className="text-white font-medium">
              {days * hoursPerDay} hours
            </span>{" "}
            across {days} days
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Generate button */}
        <button
          id="generate-plan-btn"
          onClick={handleGenerate}
          disabled={days === 0}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🚀 Generate My Study Plan
        </button>
      </div>
    </main>
  );
}
