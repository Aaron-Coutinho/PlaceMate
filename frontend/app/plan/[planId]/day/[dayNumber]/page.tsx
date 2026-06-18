/**
 * PlaceMate – Day Content Player
 *
 * The heart of the learning experience. Shows three tabs:
 * 1. Notes (AI-generated study material)
 * 2. Videos (YouTube embeds — Phase 3)
 * 3. MCQs (Practice questions — Phase 3)
 *
 * Day completion triggers progressive unlock of the next day.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { Markdown } from "@/components/Markdown";

type Tab = "notes" | "videos" | "mcqs";

interface DayData {
  day_number: number;
  subject: string;
  topics: string[];
  learning_objectives?: string[];
  notes: string;
  videos: Array<{
    title: string;
    video_id: string;
    thumbnail: string;
    channel: string;
  }>;
  mcqs: Array<{
    question: string;
    options: string[];
    correct: string;
    explanation: string;
  }>;
  is_unlocked: boolean;
  is_completed: boolean;
}

export default function DayPlayerPage() {
  return (
    <ProtectedRoute>
      <DayPlayerContent />
    </ProtectedRoute>
  );
}

function DayPlayerContent() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const dayNumber = parseInt(params.dayNumber as string);

  const [day, setDay] = useState<DayData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDay() {
      try {
        const data = await api.get<DayData>(
          `/plan/${planId}/day/${dayNumber}`
        );
        setDay(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load day content"
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDay();
  }, [planId, dayNumber]);

  const handleCompleteDay = async () => {
    setCompleting(true);
    try {
      await api.post(`/content/plan/${planId}/day/${dayNumber}/complete`);
      router.push(`/plan/${planId}`);
    } catch (err) {
      setError("Failed to complete day. Please try again.");
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-200 font-medium">Loading Day {dayNumber}...</p>
          <p className="text-gray-500 text-xs max-w-xs">
            Crafting detailed AI study notes for you. This might take a few seconds on your first visit.
          </p>
        </div>
      </div>
    );
  }

  if (error || !day) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900/70 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/plan/${planId}`)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Back to Plan
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: "notes", label: "Notes", icon: "📝" },
    {
      id: "videos",
      label: "Videos",
      icon: "🎬",
      count: day.videos.length,
    },
    { id: "mcqs", label: "MCQs", icon: "✅", count: day.mcqs.length },
  ];

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push(`/plan/${planId}`)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Plan Overview
          </button>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/15 text-indigo-300 text-xs rounded-full border border-indigo-500/20">
              {day.subject}
            </span>
            {day.is_completed && (
              <span className="px-3 py-1 bg-emerald-500/15 text-emerald-300 text-xs rounded-full border border-emerald-500/20">
                ✓ Completed
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Day header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            Day {day.day_number}: {day.subject}
          </h1>
          <p className="text-gray-400 text-sm">
            {day.topics.join(" • ")}
          </p>
          {day.learning_objectives && day.learning_objectives.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {day.learning_objectives.map((obj, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-gray-800/50 text-gray-400 text-xs rounded-lg border border-gray-800"
                >
                  🎯 {obj}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-gray-900/60 p-1 rounded-xl border border-gray-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-md">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-8 min-h-[300px]">
          {activeTab === "notes" && (
            <div className="prose prose-invert prose-sm max-w-none">
              {day.notes ? (
                <Markdown content={day.notes} />
              ) : (
                <div className="text-gray-400">Notes will be available soon.</div>
              )}
            </div>
          )}

          {activeTab === "videos" && (
            <div>
              {day.videos.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">🎬</span>
                  <p className="text-gray-400 mb-1">
                    Videos coming soon
                  </p>
                  <p className="text-gray-600 text-xs">
                    YouTube videos will be curated in Phase 3
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {day.videos.map((video, i) => (
                    <div
                      key={i}
                      className="bg-gray-800/30 rounded-xl overflow-hidden"
                    >
                      <iframe
                        width="100%"
                        height="315"
                        src={`https://www.youtube.com/embed/${video.video_id}`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-t-xl"
                      />
                      <div className="p-3">
                        <p className="text-white text-sm font-medium">
                          {video.title}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {video.channel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "mcqs" && (
            <div>
              {day.mcqs.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">✅</span>
                  <p className="text-gray-400 mb-1">
                    MCQs coming soon
                  </p>
                  <p className="text-gray-600 text-xs">
                    Practice questions will be generated in Phase 3
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {day.mcqs.map((mcq, i) => (
                    <div key={i} className="border-b border-gray-800/50 pb-4 last:border-0">
                      <p className="text-white font-medium mb-3">
                        {i + 1}. {mcq.question}
                      </p>
                      <div className="space-y-2">
                        {mcq.options.map((opt, j) => (
                          <div
                            key={j}
                            className="px-4 py-2 bg-gray-800/30 rounded-lg text-sm text-gray-300"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Complete day button */}
        {!day.is_completed && (
          <button
            id="complete-day-btn"
            onClick={handleCompleteDay}
            disabled={completing}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-lg font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Completing...
              </span>
            ) : (
              "✓ Mark Day as Complete"
            )}
          </button>
        )}
      </div>
    </main>
  );
}
