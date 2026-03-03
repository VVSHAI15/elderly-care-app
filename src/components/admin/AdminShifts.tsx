"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2 } from "lucide-react";

interface Shift {
  id: string;
  caregiver: { id: string; name: string | null; email: string };
  patientId: string;
  patientName: string | null;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  durationMinutes: number | null;
}

export function AdminShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/shifts?days=${days}`);
    if (res.ok) {
      const data = await res.json();
      setShifts(data.shifts);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const totalHours = shifts
    .filter((s) => s.durationMinutes !== null)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;

  const activeShifts = shifts.filter((s) => !s.clockOut);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Shift Log</h2>
          <p className="text-sm text-gray-600">
            {shifts.length} visits · {Math.round(totalHours * 10) / 10} total hours
            {activeShifts.length > 0 && ` · ${activeShifts.length} active now`}
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 border-2 border-[#d8e2f1] rounded-xl bg-white text-sm focus:ring-2 focus:ring-[#2f5f9f] outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Active Shifts */}
      {activeShifts.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active Visits ({activeShifts.length})
          </h3>
          <div className="space-y-2">
            {activeShifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.caregiver.name || s.caregiver.email}</p>
                  <p className="text-xs text-gray-500">Visiting {s.patientName || "unknown"}</p>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  Since {new Date(s.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" />
        </div>
      ) : shifts.filter((s) => s.clockOut).length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No completed shifts</h3>
          <p className="text-gray-500 text-sm">Shifts will appear here as caregivers clock in and out.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#d8e2f1]">
          <table className="w-full text-sm">
            <thead className="bg-[#f0f5fd] border-b border-[#d8e2f1]">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Caregiver</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Patient</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Time</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Duration</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {shifts
                .filter((s) => s.clockOut)
                .map((s) => (
                  <tr key={s.id} className="hover:bg-[#f7faff] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{s.caregiver.name || "—"}</p>
                      <p className="text-xs text-gray-400">{s.caregiver.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{s.patientName || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {new Date(s.clockIn).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {new Date(s.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {s.clockOut && ` – ${new Date(s.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.durationMinutes !== null ? (
                        <span className="font-semibold text-[#2f5f9f]">
                          {s.durationMinutes >= 60
                            ? `${Math.floor(s.durationMinutes / 60)}h ${s.durationMinutes % 60}m`
                            : `${s.durationMinutes}m`}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{s.notes || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
