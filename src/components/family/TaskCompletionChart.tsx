"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; completed: number; total: number; completionRate: number }[];
}

export function TaskCompletionChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString([], { month: "short", day: "numeric" }),
      rate: d.completionRate,
      completed: d.completed,
      total: d.total,
    }));

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No task data available for this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf6" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} interval={4} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value, name) => {
            if (name === "rate") return [`${value}%`, "Completion Rate"];
            return [value, name];
          }}
        />
        <Line type="monotone" dataKey="rate" stroke="#2f5f9f" strokeWidth={2.5} dot={false} name="rate" />
      </LineChart>
    </ResponsiveContainer>
  );
}
