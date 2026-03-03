"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Plus, Loader2, TrendingUp } from "lucide-react";

interface Metric {
  id: string;
  type: string;
  value: string;
  unit: string | null;
  recordedAt: string;
  notes: string | null;
}

const METRIC_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg", placeholder: "120/80" },
  { value: "blood_glucose", label: "Blood Glucose", unit: "mg/dL", placeholder: "95" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
  { value: "weight", label: "Weight", unit: "lbs", placeholder: "165" },
  { value: "oxygen_saturation", label: "O₂ Saturation", unit: "%", placeholder: "98" },
  { value: "temperature", label: "Temperature", unit: "°F", placeholder: "98.6" },
];

interface HealthMetricLoggerProps {
  patientId: string;
}

export function HealthMetricLogger({ patientId }: HealthMetricLoggerProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState("blood_pressure");
  const [value, setValue] = useState("");
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/health-metrics?patientId=${patientId}&days=30`);
      if (res.ok) {
        const data = await res.json();
        // Flatten grouped metrics into array
        const all: Metric[] = Object.values(data.grouped || {}).flat() as Metric[];
        all.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        setMetrics(all);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const selectedMetricType = METRIC_TYPES.find((m) => m.value === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, type, value, recordedAt, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setValue("");
        setNotes("");
        setRecordedAt(new Date().toISOString().slice(0, 16));
        setShowForm(false);
        fetchMetrics();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const METRIC_ICONS: Record<string, string> = {
    blood_pressure: "🩺",
    blood_glucose: "🩸",
    heart_rate: "💓",
    weight: "⚖️",
    oxygen_saturation: "🫁",
    temperature: "🌡️",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#dbe8f8] rounded-xl">
            <Activity className="w-6 h-6 text-[#2f5f9f]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Health Vitals</h3>
            <p className="text-sm text-gray-600">Log readings to track trends over time</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Log Reading
        </button>
      </div>

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-gray-900">New Reading</h4>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Metric Type</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setValue(""); }}
                className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
              >
                {METRIC_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Value ({selectedMetricType?.unit})
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={selectedMetricType?.placeholder}
                className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date & Time</label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. taken after breakfast, patient reported dizziness"
              className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Reading
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Recent Metrics */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#2f5f9f] animate-spin" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-10">
          <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No readings logged yet. Start tracking vitals above.</p>
        </div>
      ) : (
        <div>
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Recent Readings (30 days)</h4>
          <div className="space-y-2">
            {metrics.slice(0, 15).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{METRIC_ICONS[m.type] || "📊"}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {METRIC_TYPES.find((mt) => mt.value === m.type)?.label || m.type}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(m.recordedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-[#2f5f9f]">
                    {m.value} <span className="text-xs font-normal text-gray-500">{m.unit}</span>
                  </p>
                  {m.notes && <p className="text-xs text-gray-400 max-w-[120px] truncate">{m.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
