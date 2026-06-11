/**
 * PlaceMate – Results Bar Chart Component
 *
 * Renders a horizontal bar chart of subject scores using Recharts.
 * Weak subjects are colored red; strong subjects are emerald.
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
} from "recharts";
import type { SubjectScore } from "@/types";

interface ResultsChartProps {
  scores: SubjectScore[];
  weakSubjects: string[];
}

export default function ResultsChart({
  scores,
  weakSubjects,
}: ResultsChartProps) {
  const data = scores.map((s) => ({
    subject: s.subject,
    percentage: s.percentage,
    isWeak: weakSubjects.includes(s.subject),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          axisLine={{ stroke: "#374151" }}
          tickLine={{ stroke: "#374151" }}
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
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Score"]}
          cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
        />
        <Bar
          dataKey="percentage"
          radius={[0, 6, 6, 0]}
          barSize={28}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.isWeak
                  ? "url(#redGradient)"
                  : "url(#greenGradient)"
              }
            />
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
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
