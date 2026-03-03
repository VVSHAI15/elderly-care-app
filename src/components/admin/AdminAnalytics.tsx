"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, CheckCircle2, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

interface AnalyticsData {
  totals: {
    patients: number;
    caregivers: number;
    tasksToday: number;
    completedToday: number;
    shiftsThisWeek: number;
    totalHoursThisWeek: number;
  };
  taskCompletionTrend: { date: string; completionRate: number; completed: number; total: number }[];
  visitsPerWeek: { week: string; visits: number }[];
  topPatientsNeedingAttention: { patientId: string; name: string | null; urgentCount: number }[];
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" /></div>;
  }

  if (!data) return null;

  const todayRate =
    data.totals.tasksToday > 0
      ? Math.round((data.totals.completedToday / data.totals.tasksToday) * 100)
      : 0;

  const trendData = data.taskCompletionTrend
    .filter((d) => d.total > 0)
    .map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString([], { month: "short", day: "numeric" }),
    }));

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-gray-900">Company Analytics</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Total Patients", value: data.totals.patients, color: "blue" },
          { icon: Users, label: "Caregivers", value: data.totals.caregivers, color: "blue" },
          { icon: CheckCircle2, label: "Completed Today", value: `${data.totals.completedToday}/${data.totals.tasksToday}`, color: "green" },
          { icon: TrendingUp, label: "Today's Rate", value: `${todayRate}%`, color: "green" },
          { icon: Clock, label: "Visits This Week", value: data.totals.shiftsThisWeek, color: "amber" },
          { icon: Clock, label: "Hours This Week", value: `${data.totals.totalHoursThisWeek}h`, color: "amber" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`rounded-xl p-5 border ${
            color === "blue" ? "bg-[#f0f5fd] border-[#d8e2f1]" :
            color === "green" ? "bg-green-50 border-green-200" :
            "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color === "blue" ? "text-[#2f5f9f]" : color === "green" ? "text-green-600" : "text-amber-600"}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${color === "blue" ? "text-[#2f5f9f]" : color === "green" ? "text-green-600" : "text-amber-600"}`}>{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Task Completion Trend */}
      {trendData.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-1">Task Completion Rate (30 days)</h3>
          <p className="text-sm text-gray-500 mb-5">Daily % of tasks completed across all patients</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Completion Rate"]} />
              <Line type="monotone" dataKey="completionRate" stroke="#2f5f9f" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Visits Per Week */}
      {data.visitsPerWeek.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-1">Caregiver Visits (Last 4 Weeks)</h3>
          <p className="text-sm text-gray-500 mb-5">Total visit count per week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.visitsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf6" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visits" fill="#2f5f9f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Patients Needing Attention */}
      {data.topPatientsNeedingAttention.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-900">Patients Needing Attention</h3>
          </div>
          <div className="space-y-2">
            {data.topPatientsNeedingAttention.map((p) => (
              <div key={p.patientId} className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="font-semibold text-gray-900">{p.name || "Unknown"}</span>
                <span className="text-sm text-red-600 font-medium">{p.urgentCount} overdue/urgent</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
