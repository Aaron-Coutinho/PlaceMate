/**
 * PlaceMate – Test Results Page
 *
 * Displays subject-wise scores with a bar chart (Recharts),
 * highlights weak subjects, and provides a CTA to generate a study plan.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { TestResult } from "@/types";
import dynamic from "next/dynamic";

// Lazy-load Recharts to avoid SSR issues
const ResultsChart = dynamic(() => import("@/components/ResultsChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function ResultsPage() {
  return (
    <ProtectedRoute>
      <ResultsContent />
    </ProtectedRoute>
  );
}

function ResultsContent() {
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("testResult");
    const storedTime = sessionStorage.getItem("timeElapsed");
    if (!stored) {
      router.push("/test");
      return;
    }
    setResult(JSON.parse(stored));
    setTimeElapsed(storedTime ? parseInt(storedTime) : 0);
  }, [router]);

  if (!result) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const hasWeakSubjects = result.weak_subjects.length > 0;

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Assessment Complete!
          </h1>
          <p className="text-gray-400">
            Here&apos;s your detailed subject-wise performance breakdown.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {result.overall_percentage.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Overall Score</p>
          </div>
          <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {result.subject_scores.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Subjects Tested</p>
          </div>
          <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {formatTime(timeElapsed)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Time Taken</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Subject Performance
          </h2>
          <ResultsChart
            scores={result.subject_scores}
            weakSubjects={result.weak_subjects}
          />
        </div>

        {/* Score cards */}
        <div className="space-y-3 mb-8">
          {result.subject_scores.map((score) => {
            const isWeak = result.weak_subjects.includes(score.subject);
            return (
              <div
                key={score.subject}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isWeak
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-emerald-500/5 border-emerald-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isWeak ? "bg-red-400" : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-white font-medium">{score.subject}</span>
                  {isWeak && (
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                      Needs Improvement
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {score.correct}/{score.total}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      isWeak ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {score.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weak subjects summary */}
        {hasWeakSubjects && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-white font-semibold mb-1">
                  Weak Areas Detected
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  Based on your performance, the following subjects need focused
                  preparation:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.weak_subjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-3 py-1 bg-amber-500/15 text-amber-300 rounded-full text-sm font-medium border border-amber-500/20"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            id="generate-plan-btn"
            onClick={() => {
              sessionStorage.setItem(
                "weakSubjects",
                JSON.stringify(result.weak_subjects)
              );
              router.push("/plan/topics");
            }}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 text-center"
          >
            Generate Study Plan →
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3.5 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-xl transition-all text-center"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
