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
  const [durationValue, setDurationValue] = useState(14);
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years">("days");
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDaysValue = (val: number, unit: "days" | "months" | "years") => {
    if (unit === "days") return val;
    if (unit === "months") return val * 30;
    return 365;
  };

  const days = getDaysValue(durationValue, durationUnit);

  const handleUnitChange = (unit: "days" | "months" | "years") => {
    setDurationUnit(unit);
    if (unit === "days") {
      setDurationValue(14);
    } else if (unit === "months") {
      setDurationValue(3);
    } else {
      setDurationValue(1);
    }
  };

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
      <main className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[80px] pointer-events-none animate-pulse" />

        <div className="relative z-10 text-center max-w-md mx-4">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-purple-500/20 rounded-full" />
            <div className="absolute inset-2 border-4 border-purple-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Generating Your Study Plan
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Our AI is crafting a personalized {days}-day plan
            <br />
            covering {selectedTopics.length} topics across{" "}
            {activeWeakSubjects.length} subjects...
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Analyzing topics...", "Building schedule...", "Creating notes..."].map(
              (step, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-800/50 text-gray-500 text-xs rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.5}s` }}
                >
                  {step}
                </span>
              )
            )}
          </div>
        </div>
      </main>
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

        {/* Days selector — up to 365 days */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-6">
          <label className="block text-white font-semibold mb-4">
            Study Duration
          </label>

          {/* Unit selector buttons */}
          <div className="flex gap-3 mb-4">
            {(["days", "months", "years"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => handleUnitChange(unit)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  durationUnit === unit
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-gray-800/30 border-gray-800/50 text-gray-400 hover:border-gray-700"
                }`}
              >
                {unit === "days" ? "Days" : unit === "months" ? "Months" : "Year"}
              </button>
            ))}
          </div>

          {/* Value selector dropdown */}
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">Select Duration</label>
            <select
              value={durationValue}
              onChange={(e) => setDurationValue(parseInt(e.target.value))}
              className="w-full bg-gray-900/50 border border-gray-800/80 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              {durationUnit === "days" &&
                Array.from({ length: 30 }, (_, i) => i + 1).map((val) => (
                  <option key={val} value={val} className="bg-gray-950">
                    {val} day{val > 1 ? "s" : ""}
                  </option>
                ))}
              {durationUnit === "months" &&
                Array.from({ length: 12 }, (_, i) => i + 1).map((val) => (
                  <option key={val} value={val} className="bg-gray-950">
                    {val} month{val > 1 ? "s" : ""}
                  </option>
                ))}
              {durationUnit === "years" && (
                <option value={1} className="bg-gray-950">1 year</option>
              )}
            </select>
          </div>

          <p className="text-xs text-indigo-400 font-semibold mt-3">
            Timeline: {days} days of preparation
          </p>
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
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0"
        >
          🚀 Generate My Study Plan
        </button>
      </div>
    </main>
  );
}
