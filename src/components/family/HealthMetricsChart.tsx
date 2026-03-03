"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const METRIC_LABELS: Record<string, string> = {
  blood_pressure: "Blood Pressure (mmHg)",
  blood_glucose: "Blood Glucose (mg/dL)",
  heart_rate: "Heart Rate (bpm)",
  weight: "Weight (lbs)",
  oxygen_saturation: "O₂ Saturation (%)",
  temperature: "Temperature (°F)",
};

const METRIC_ICONS: Record<string, string> = {
  blood_pressure: "🩺",
  blood_glucose: "🩸",
  heart_rate: "💓",
  weight: "⚖️",
  oxygen_saturation: "🫁",
  temperature: "🌡️",
};

interface Props {
  data: Record<string, { date: string; value: string; unit: string | null; notes: string | null }[]>;
}

export function HealthMetricsChart({ data }: Props) {
  const types = Object.keys(data);
  const [activeType, setActiveType] = useState(types[0]);

  const entries = (data[activeType] || []).map((e) => ({
    date: new Date(e.date).toLocaleDateString([], { month: "short", day: "numeric" }),
    // For blood pressure "120/80" use systolic (first number) for the chart
    value: parseFloat(e.value.split("/")[0]),
    raw: e.value,
    notes: e.notes,
  }));

  return (
    <div>
      {/* Type selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              activeType === t
                ? "bg-[#2f5f9f] text-white"
                : "bg-[#f0f5fd] text-gray-700 hover:bg-[#dbe8f8] border border-[#d8e2f1]"
            }`}
          >
            <span>{METRIC_ICONS[t] || "📊"}</span>
            {METRIC_LABELS[t] || t}
            <span className="text-xs opacity-70">({data[t].length})</span>
          </button>
        ))}
      </div>

      {entries.length < 2 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">
            {entries.length === 0
              ? "No readings logged yet."
              : "Need at least 2 readings to show a trend."}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={entries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm">
                    <p className="font-semibold text-gray-900">{d.date}</p>
                    <p className="text-[#2f5f9f] font-bold">{d.raw}</p>
                    {d.notes && <p className="text-gray-500 mt-1 text-xs">{d.notes}</p>}
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#2f5f9f" strokeWidth={2.5} dot={{ r: 4, fill: "#2f5f9f" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
