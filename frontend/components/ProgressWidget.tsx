"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UserProgress } from "@/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ProgressWidget() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await api.get<UserProgress>("/progress");
        setProgress(data);
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-900/40 border border-gray-800/50 rounded-2xl animate-pulse" />
    );
  }

  if (!progress || !progress.current_plan_id) return null;

  // Prepare chart data from mcq_scores object {"day_1": "4/5", "day_2": "5/5"}
  const chartData = Object.keys(progress.mcq_scores)
    .sort((a, b) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
    .map((key) => {
      const scoreStr = progress.mcq_scores[key];
      const [correct, total] = scoreStr.split("/").map(Number);
      const percentage = total > 0 ? (correct / total) * 100 : 0;
      return {
        name: `Day ${key.split("_")[1]}`,
        score: parseFloat(percentage.toFixed(1))
      };
    });

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 shadow-xl mb-10">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        📊 Your Progress
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * progress.completion_percentage) / 100}
                className="text-indigo-500 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-white">
              <span className="text-xl font-bold">{progress.completion_percentage.toFixed(0)}%</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-400 font-medium">
            {progress.days_completed} / {progress.total_days} Days Completed
          </p>
        </div>

        {/* Streak Counter */}
        <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-500/10 to-red-500/5 rounded-xl border border-orange-500/20">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            <span className="text-3xl">🔥</span>
          </div>
          <span className="text-2xl font-bold text-white">{progress.days_completed}</span>
          <p className="text-sm text-orange-400 font-medium mt-1">Day Streak</p>
        </div>

        {/* MCQ Accuracy Chart */}
        <div className="flex flex-col justify-center p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <p className="text-sm text-gray-400 font-medium mb-3 text-center">MCQ Accuracy Trend</p>
          {chartData.length > 0 ? (
            <div className="w-full h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#818cf8" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#1e1e2f' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500 text-center">
              Complete a day&apos;s MCQs to see your accuracy trend.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
