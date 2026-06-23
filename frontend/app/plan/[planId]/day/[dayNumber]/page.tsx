/**
 * PlaceMate – Day Content Player (Phase 3)
 *
 * Three tabs — Notes, Videos, MCQs — all loaded on first visit
 * via the backend's lazy-generate pattern:
 *   1. Notes  — AI-generated markdown study notes
 *   2. Videos — YouTube embeds fetched via YouTube Data API v3
 *   3. MCQs   — Interactive 5-question quiz with immediate feedback
 *
 * Day completion requires visiting all three tabs.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api, ApiError } from "@/lib/api";
import { Markdown } from "@/components/Markdown";

type Tab = "notes" | "videos" | "mcqs";

interface Video {
  title: string;
  video_id: string;
  thumbnail: string;
  channel: string;
}

interface MCQ {
  question: string;
  options: string[];   // e.g. ["A. O(n)", "B. O(log n)", ...]
  correct: string;     // "A" | "B" | "C" | "D"
  explanation: string;
}

interface DayData {
  day_number: number;
  subject: string;
  topics: string[];
  learning_objectives?: string[];
  notes: string;
  videos: Video[];
  mcqs: MCQ[];
  is_unlocked: boolean;
  is_completed: boolean;
}

// ─── Rate-Limit Screen ───────────────────────────────────────────────────────

function RateLimitScreen({
  retryAfter,
  onRetry,
}: {
  retryAfter: number;
  onRetry: () => void;
}) {
  const [countdown, setCountdown] = useState(retryAfter);

  useEffect(() => {
    if (countdown <= 0) {
      onRetry();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onRetry]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900/80 border border-amber-500/30 rounded-2xl p-8 max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
          ⏳
        </div>
        <h2 className="text-lg font-bold text-amber-300 mb-1">AI is busy right now</h2>
        <p className="text-gray-400 text-sm mb-4">
          The AI hit its free-tier rate limit. Automatically retrying in:
        </p>
        <div className="text-5xl font-mono font-bold text-white mb-6">
          {countdown}s
        </div>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-xl transition-all"
        >
          Retry Now
        </button>
      </div>
    </div>
  );
}

type Difficulty = "easy" | "medium" | "hard";

function MCQQuiz({
  mcqs: initialMcqs,
  planId,
  dayNumber,
}: {
  mcqs: MCQ[];
  planId: string;
  dayNumber: number;
}) {
  const [mcqs, setMcqs] = useState<MCQ[]>(initialMcqs);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const current = mcqs[currentIdx];
  const totalQuestions = mcqs.length;

  const handleOption = (letter: string) => {
    if (revealed) return;
    setSelected(letter);
  };

  const handleSubmit = () => {
    if (!selected) return;
    setRevealed(true);
    const isCorrect = selected === current.correct;
    setScores((prev) => [...prev, isCorrect]);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= totalQuestions) {
      setDone(true);
    } else {
      setCurrentIdx((prev) => prev + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const handleGenerateNew = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.post<{ mcqs: MCQ[]; difficulty: string }>(
        `/plan/${planId}/day/${dayNumber}/mcqs`,
        { difficulty }
      );
      setMcqs(res.mcqs);
      setCurrentIdx(0);
      setSelected(null);
      setRevealed(false);
      setScores([]);
      setDone(false);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate MCQs.");
    } finally {
      setGenerating(false);
    }
  };

  const correctCount = scores.filter(Boolean).length;
  const getLetter = (option: string) => option.split(".")[0].trim();

  const difficultyConfig: Record<Difficulty, { label: string; color: string; active: string }> = {
    easy:   { label: "Easy",   color: "border-emerald-700 text-emerald-400", active: "bg-emerald-500/20 border-emerald-500 text-emerald-300" },
    medium: { label: "Medium", color: "border-amber-700 text-amber-400",    active: "bg-amber-500/20 border-amber-500 text-amber-300" },
    hard:   { label: "Hard",   color: "border-red-700 text-red-400",         active: "bg-red-500/20 border-red-500 text-red-300" },
  };

  if (done) {
    const pct = Math.round((correctCount / totalQuestions) * 100);
    return (
      <div className="text-center py-8">
        <div
          className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl font-bold border-4 ${
            pct >= 60
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-red-500/15 border-red-500/40 text-red-300"
          }`}
        >
          {pct}%
        </div>
        <h3 className="text-xl font-bold text-white mb-1">
          {pct >= 60 ? "🎉 Well done!" : "📚 Keep studying!"}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          You scored {correctCount} / {totalQuestions} on today's practice questions.
        </p>

        {/* Difficulty selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Want more practice? Select difficulty:</p>
          <div className="flex justify-center gap-2">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  difficulty === d ? difficultyConfig[d].active : difficultyConfig[d].color + " bg-transparent hover:bg-gray-800"
                }`}
              >
                {difficultyConfig[d].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setCurrentIdx(0);
              setSelected(null);
              setRevealed(false);
              setScores([]);
              setDone(false);
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            Retry Same Quiz
          </button>
          <button
            onClick={handleGenerateNew}
            disabled={generating}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
          >
            {generating ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</>
            ) : (
              <>✨ Generate New MCQs</>
            )}
          </button>
        </div>
        {genError && <p className="text-red-400 text-xs mt-3">{genError}</p>}
      </div>
    );
  }

  return (
    <div>
      {/* Progress + difficulty */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">
          Question {currentIdx + 1} of {totalQuestions}
        </span>
        <div className="flex gap-1">
          {mcqs.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < scores.length
                  ? scores[i]
                    ? "bg-emerald-500"
                    : "bg-red-500"
                  : i === currentIdx
                  ? "bg-indigo-500"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <p className="text-white font-medium text-base mb-5 leading-relaxed">
        {currentIdx + 1}. {current.question}
      </p>

      {/* Options */}
      <div className="space-y-2.5 mb-5">
        {current.options.map((option) => {
          const letter = getLetter(option);
          const isSelected = selected === letter;
          const isCorrect = letter === current.correct;
          const isWrong = revealed && isSelected && !isCorrect;
          const showCorrect = revealed && isCorrect;

          return (
            <button
              key={letter}
              onClick={() => handleOption(letter)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                showCorrect
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : isWrong
                  ? "bg-red-500/15 border-red-500/50 text-red-300"
                  : isSelected
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                  : "bg-gray-800/30 border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-800/50"
              } ${revealed ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="font-semibold mr-2">{letter}.</span>
              {option.substring(option.indexOf(".") + 2)}
              {showCorrect && <span className="float-right">✓</span>}
              {isWrong && <span className="float-right">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 mb-5 text-sm">
          <p className="text-gray-300 leading-relaxed">
            <span className="font-semibold text-indigo-300">💡 Explanation: </span>
            {current.explanation}
          </p>
        </div>
      )}

      {/* Action button */}
      {!revealed ? (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
        >
          Submit Answer
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
        >
          {currentIdx + 1 >= totalQuestions ? "See Results →" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(["notes"]));
  const fetchedRef = useRef(false); // prevent double-fetch in React StrictMode

  const fetchDay = useCallback(async () => {
    // Reset UI state for fresh fetch (NOT fetchedRef — that belongs to the effect guard)
    setLoading(true);
    setError(null);
    setRateLimitRetryAfter(null);

    try {
      const data = await api.get<DayData>(`/plan/${planId}/day/${dayNumber}`);
      setDay(data);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 503 &&
        typeof err.detail === "object" &&
        err.detail !== null &&
        (err.detail as Record<string, unknown>).reason === "rate_limit"
      ) {
        const retryAfter = (err.detail as Record<string, number>).retry_after ?? 60;
        setRateLimitRetryAfter(retryAfter);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load day content");
      }
    } finally {
      setLoading(false);
    }
  }, [planId, dayNumber]);

  useEffect(() => {
    // React StrictMode mounts→unmounts→remounts in dev.
    // fetchedRef gates the FIRST auto-load only; manual retries bypass it.
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchDay();
  }, [fetchDay]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const handleCompleteDay = async () => {
    setCompleting(true);
    try {
      await api.post(`/content/plan/${planId}/day/${dayNumber}/complete`);
      router.push(`/plan/${planId}`);
    } catch {
      setError("Failed to complete day. Please try again.");
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="w-14 h-14 relative">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-200 font-medium mt-2">Loading Day {dayNumber}...</p>
          <p className="text-gray-500 text-xs max-w-xs">
            Generating AI study notes, videos &amp; practice questions.
            This may take up to 30s on your first visit.
          </p>
        </div>
      </div>
    );
  }

  if (rateLimitRetryAfter !== null) {
    return <RateLimitScreen retryAfter={rateLimitRetryAfter} onRetry={fetchDay} />;
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
    { id: "videos", label: "Videos", icon: "🎬", count: day.videos.length },
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
          <p className="text-gray-400 text-sm">{day.topics.join(" • ")}</p>
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
              onClick={() => handleTabChange(tab.id)}
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

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <div>
              {day.notes ? (
                <Markdown content={day.notes} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Notes are being generated…
                </div>
              )}
            </div>
          )}

          {/* VIDEOS TAB */}
          {activeTab === "videos" && (
            <div>
              {day.videos.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">🎬</span>
                  <p className="text-gray-400 mb-1 font-medium">No videos available</p>
                  <p className="text-gray-600 text-xs">
                    Videos could not be fetched for this day. Try searching YouTube for: <br />
                    <span className="text-indigo-400 font-mono text-xs mt-1 block">
                      {day.topics.join(", ")} {day.subject} placement interview
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {day.videos.map((video, i) => (
                    <div key={i} className="bg-gray-800/30 rounded-xl overflow-hidden border border-gray-800/50">
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${video.video_id}`}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{video.channel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MCQ TAB */}
          {activeTab === "mcqs" && (
            <div>
              {day.mcqs.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-4 block">✅</span>
                  <p className="text-gray-400 mb-1 font-medium">No MCQs available</p>
                  <p className="text-gray-600 text-xs">
                    Practice questions could not be generated. Review your notes and try again later.
                  </p>
                </div>
              ) : (
                <MCQQuiz mcqs={day.mcqs} planId={planId} dayNumber={dayNumber} />
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
