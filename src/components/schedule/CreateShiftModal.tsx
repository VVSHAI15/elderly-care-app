"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface Caregiver {
  id: string;
  name: string | null;
  email: string;
}

interface Patient {
  patientId: string;
  name: string | null;
}

interface Props {
  caregivers: Caregiver[];
  patients: Patient[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateShiftModal({ caregivers, patients, onClose, onCreated }: Props) {
  const [caregiverId, setCaregiverId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState("08:00");
  const [endHour, setEndHour] = useState("16:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverId || !patientId || !date || !startHour || !endHour) {
      setError("All fields are required.");
      return;
    }

    const startTime = new Date(`${date}T${startHour}:00`);
    const endTime = new Date(`${date}T${endHour}:00`);

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverId,
          patientId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create shift.");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#d8e2f1] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8f0fb]">
          <h3 className="font-semibold text-gray-900">Schedule a Shift</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver</label>
            <select
              value={caregiverId}
              onChange={(e) => setCaregiverId(e.target.value)}
              className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
              required
            >
              <option value="">Select caregiver…</option>
              {caregivers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
              required
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.patientId} value={p.patientId}>
                  {p.name ?? p.patientId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
              <input
                type="time"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
              <input
                type="time"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions…"
              className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#d8e2f1] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#2f5f9f] text-white hover:bg-[#254e87] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Schedule Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
