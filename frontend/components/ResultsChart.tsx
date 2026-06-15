/**
 * PlaceMate – Results Bar Chart Component
 *
 * Renders a horizontal bar chart of subject scores using Recharts.
 * Always displays all 5 subjects (DSA, OS, DBMS, CN, Aptitude),
 * even if some were not attempted.
 *
 * Color legend:
 *   - Green gradient  = strong (score ≥ 60% and above average)
 *   - Red gradient    = weak / needs improvement
 *   - Gray            = not attempted (0 questions answered)
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import type { SubjectScore } from "@/types";

const ALL_SUBJECTS = ["DSA", "OS", "DBMS", "CN", "Aptitude"];

interface ResultsChartProps {
  scores: SubjectScore[];
  weakSubjects: string[];
}

export default function ResultsChart({
  scores,
  weakSubjects,
}: ResultsChartProps) {
  // Build data for ALL 5 subjects, filling in 0% for unattempted ones
  const scoreMap = new Map(scores.map((s) => [s.subject, s]));

  const data = ALL_SUBJECTS.map((subject) => {
    const score = scoreMap.get(subject);
    const attempted = score !== undefined && score.total > 0;
    return {
      subject,
      percentage: attempted ? score.percentage : 0,
      isWeak: weakSubjects.includes(subject),
      isAttempted: attempted,
    };
  });

  // Calculate average across attempted subjects only
  const attemptedScores = data.filter((d) => d.isAttempted);
  const average =
    attemptedScores.length > 0
      ? attemptedScores.reduce((sum, d) => sum + d.percentage, 0) /
        attemptedScores.length
      : 0;

  const getFill = (entry: (typeof data)[0]) => {
    if (!entry.isAttempted) return "url(#grayGradient)";
    if (entry.isWeak) return "url(#redGradient)";
    return "url(#greenGradient)";
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 56)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2937"
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          axisLine={{ stroke: "#374151" }}
          tickLine={{ stroke: "#374151" }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="subject"
          tick={{ fill: "#e5e7eb", fontSize: 13, fontWeight: 500 }}
          axisLine={{ stroke: "#374151" }}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "8px 14px",
            color: "#e5e7eb",
            fontSize: "13px",
          }}
          formatter={(value: any, name: any, item: any) => {
            if (!item?.payload?.isAttempted) return ["Not Attempted", "Status"];
            return [`${Number(value || 0).toFixed(1)}%`, "Score"];
          }}
          cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
        />
        {/* Average line — only shown if at least 1 subject attempted */}
        {attemptedScores.length > 0 && (
          <ReferenceLine
            x={average}
            stroke="#6366f1"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Avg ${average.toFixed(0)}%`,
              position: "top",
              fill: "#818cf8",
              fontSize: 11,
            }}
          />
        )}
        <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={28}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getFill(entry)} />
          ))}
        </Bar>
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="grayGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
