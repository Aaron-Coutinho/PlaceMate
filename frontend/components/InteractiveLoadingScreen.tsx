"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ParticleCanvas from "./ParticleCanvas";

const FACT_PRESETS = [
  "Taking a 10-minute break for every 50 minutes of study is scientifically proven to boost long-term recall by 20%!",
  "The first computer bug was a real moth found trapped in a relay by Grace Hopper in 1947.",
  "Studies show that explaining a concept to an imaginary rubber duck helps you debug much faster!",
  "Clean code is not just readable; it's a love letter to your future self.",
  "The average software engineer spends more time reading code than writing it. Make it readable!",
  "Ada Lovelace was the world's first computer programmer, writing an algorithm for Babbage's Analytical Engine in 1843.",
  "90% of a project's complexity resides in the last 10% of the work. Keep pushing!",
  "Learning to index your database properly is the single most cost-effective query optimization you can make.",
  "A Git commit a day keeps the deployment bugs away. Keep your commits small and focused!",
  "TCP handshake: 'Syn', 'Syn-Ack', 'Ack'. It's basically a three-way high five for servers.",
  "Normalizing your database reduces redundancy. Denormalizing it speeds up reads. Balance is key!",
  "The best error message is the one that never shows up. Validate your inputs early!"
];

export default function InteractiveLoadingScreen({
  days,
  topicsCount,
  subjectsCount,
}: {
  days: number;
  topicsCount: number;
  subjectsCount: number;
}) {
  const [fact, setFact] = useState<string>(() => {
    return FACT_PRESETS[Math.floor(Math.random() * FACT_PRESETS.length)];
  });

  // Fetch fact from Groq endpoint
  const fetchFact = async () => {
    try {
      const data = await api.get<{ fact: string }>("/plan/study-fact");
      if (data && data.fact) {
        setFact(data.fact);
      }
    } catch (e) {
      console.error("Failed to fetch study fact:", e);
    }
  };

  useEffect(() => {
    // We already initialized with a preset fact, but we fetch more to cycle
    const interval = setInterval(fetchFact, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden select-none">
      <ParticleCanvas className="absolute inset-0 w-full h-full block cursor-pointer" />

      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none animate-pulse" />

      <div className="relative z-10 text-center max-w-lg mx-6 bg-gray-900/60 backdrop-blur-md border border-gray-800/60 p-8 rounded-3xl shadow-2xl animate-in fade-in duration-500">
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
          covering {topicsCount} topics across {subjectsCount} subjects...
        </p>

        {/* Fact Box */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 mb-6 transition-all duration-500 ease-in-out min-h-[90px] flex items-center justify-center">
          <p className="text-indigo-200 text-sm leading-relaxed italic">
            "{fact}"
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {["Analyzing topics...", "Building schedule...", "Creating notes..."].map(
            (step, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-800/50 text-gray-400 text-xs rounded-full animate-pulse border border-gray-800"
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

