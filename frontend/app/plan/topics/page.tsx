/**
 * PlaceMate – Topic Selection Page
 *
 * After weak subjects are identified, the user selects which specific
 * topics to study. Only topics for weak subjects are shown.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TOPIC_MAP } from "@/config/topicMap";

export default function TopicSelectionPage() {
  return (
    <ProtectedRoute>
      <TopicSelectionContent />
    </ProtectedRoute>
  );
}

function TopicSelectionContent() {
  const router = useRouter();
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("weakSubjects");
    if (!stored) {
      router.push("/test");
      return;
    }
    const subjects = JSON.parse(stored) as string[];
    setWeakSubjects(subjects);

    // Pre-select all topics for weak subjects
    const initial: Record<string, boolean> = {};
    subjects.forEach((subject) => {
      const topics = TOPIC_MAP[subject] || [];
      topics.forEach((topic) => {
        initial[`${subject}::${topic}`] = true;
      });
    });
    setSelectedTopics(initial);
  }, [router]);

  const toggleTopic = (subject: string, topic: string) => {
    const key = `${subject}::${topic}`;
    setSelectedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllForSubject = (subject: string) => {
    const topics = TOPIC_MAP[subject] || [];
    const allSelected = topics.every(
      (t) => selectedTopics[`${subject}::${t}`]
    );

    const updates: Record<string, boolean> = {};
    topics.forEach((t) => {
      updates[`${subject}::${t}`] = !allSelected;
    });
    setSelectedTopics((prev) => ({ ...prev, ...updates }));
  };

  const getSelectedTopicsList = () => {
    return Object.entries(selectedTopics)
      .filter(([, selected]) => selected)
      .map(([key]) => key.split("::")[1]);
  };

  const selectedCount = getSelectedTopicsList().length;
  const canProceed = selectedCount > 0;

  const handleContinue = () => {
    const topics = getSelectedTopicsList();
    sessionStorage.setItem("selectedTopics", JSON.stringify(topics));
    router.push("/plan/configure");
  };

  if (weakSubjects.length === 0) return null;

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back to Results
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            Select Topics to Study
          </h1>
          <p className="text-gray-400">
            Choose the specific topics you want to focus on. All topics from
            your weak subjects are pre-selected.
          </p>
        </div>

        {/* Subject groups */}
        <div className="space-y-6 mb-8">
          {weakSubjects.map((subject) => {
            const topics = TOPIC_MAP[subject] || [];
            const selectedForSubject = topics.filter(
              (t) => selectedTopics[`${subject}::${t}`]
            ).length;
            const allSelected = selectedForSubject === topics.length;

            return (
              <div
                key={subject}
                className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden"
              >
                {/* Subject header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
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
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {subject}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {selectedForSubject}/{topics.length} topics selected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAllForSubject(subject)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Topics grid */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topics.map((topic) => {
                    const key = `${subject}::${topic}`;
                    const isSelected = selectedTopics[key] || false;

                    return (
                      <button
                        key={key}
                        id={`topic-${subject}-${topic.replace(/\s+/g, "-")}`}
                        onClick={() => toggleTopic(subject, topic)}
                        className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 border ${
                          isSelected
                            ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                            : "bg-gray-800/30 border-gray-800/50 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-indigo-500"
                                : "bg-gray-700 border border-gray-600"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m4.5 12.75 6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="truncate">{topic}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl px-6 py-4">
          <p className="text-sm text-gray-400">
            <span className="text-white font-semibold">{selectedCount}</span>{" "}
            topic{selectedCount !== 1 ? "s" : ""} selected
          </p>
          <button
            id="continue-to-config-btn"
            onClick={handleContinue}
            disabled={!canProceed}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            Continue →
          </button>
        </div>
      </div>
    </main>
  );
}
