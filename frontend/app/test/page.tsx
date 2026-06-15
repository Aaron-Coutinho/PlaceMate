/**
 * PlaceMate – Assessment Test Page
 *
 * Multi-step MCQ test flow: fetches mixed-subject questions from the backend,
 * presents one question at a time with a progress bar, and submits answers
 * for scoring. Redirects to results on completion.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import type { Question } from "@/types";

export default function TestPage() {
  return (
    <ProtectedRoute>
      <TestFlow />
    </ProtectedRoute>
  );
}

function TestFlow() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Fetch questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const data = await api.get<Question[]>("/test/questions");
        setQuestions(data);
      } catch (err) {
        setError("Failed to load test questions. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || submitting) return;
    const timer = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [loading, submitting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleSelectOption = (option: string) => {
    if (!currentQuestion) return;
    // Save immediately into answers — no need to wait for "Next"
    const optionIndex = currentQuestion.options.indexOf(option);
    const optionLetter = String.fromCharCode(65 + optionIndex);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionLetter }));
  };

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;

    if (isLastQuestion) {
      handleSubmit(answers);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentQuestion, answers, isLastQuestion]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSubmit = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    try {
      const result = await api.post("/test/submit", { answers: finalAnswers });
      // Store result in sessionStorage for the results page
      sessionStorage.setItem("testResult", JSON.stringify(result));
      sessionStorage.setItem("timeElapsed", timeElapsed.toString());
      router.push("/test/results");
    } catch (err) {
      setError("Failed to submit test. Please try again.");
      setSubmitting(false);
      console.error(err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading assessment questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900/70 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Submitting state
  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Analyzing your answers...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // Get the currently selected answer for this question from answers record
  const currentAnswer = answers[currentQuestion.id];
  const currentAnswerOptionIndex = currentAnswer
    ? currentAnswer.charCodeAt(0) - 65
    : -1;
  const displaySelected =
    currentAnswerOptionIndex >= 0
      ? currentQuestion.options[currentAnswerOptionIndex]
      : null;

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Assessment Test</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-mono bg-gray-800/50 px-3 py-1.5 rounded-lg">
              ⏱ {formatTime(timeElapsed)}
            </span>
            <span className="text-xs text-gray-400">
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Subject badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            {currentQuestion.subject} • {currentQuestion.topic}
          </span>
          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            currentQuestion.difficulty === "easy"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
              : currentQuestion.difficulty === "medium"
              ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
              : "bg-red-500/15 text-red-300 border border-red-500/20"
          }`}>
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Question */}
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = displaySelected === option;

            return (
              <button
                key={index}
                id={`option-${letter}`}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  isSelected
                    ? "bg-indigo-500/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                    : "bg-gray-900/40 border-gray-800/50 hover:border-gray-700 hover:bg-gray-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-800 text-gray-400 group-hover:bg-gray-700"
                    }`}
                  >
                    {letter}
                  </span>
                  <span
                    className={`text-sm ${
                      isSelected ? "text-white font-medium" : "text-gray-300"
                    }`}
                  >
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <button
            id="next-question-btn"
            onClick={handleNext}
            className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
              isLastQuestion
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20"
            }`}
          >
            {isLastQuestion ? "Submit Test ✓" : "Next →"}
          </button>
        </div>

        {/* Question indicators */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(i);
              }}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                i === currentIndex
                  ? "bg-indigo-500 text-white scale-110"
                  : answers[q.id]
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-gray-800 text-gray-500 hover:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
