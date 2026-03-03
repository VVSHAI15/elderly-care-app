"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  data: { name: string; taken: number; total: number; rate: number }[];
}

export function MedicationAdherenceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf6" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} width={130} tickLine={false} />
        <Tooltip formatter={(v) => [`${v}%`, "Adherence Rate"]} />
        <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.rate >= 80 ? "#22c55e" : entry.rate >= 50 ? "#f59e0b" : "#ef4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
