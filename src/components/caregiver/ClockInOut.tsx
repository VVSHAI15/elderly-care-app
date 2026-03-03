"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, LogIn, LogOut, Loader2, Timer } from "lucide-react";

interface Shift {
  id: string;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  patient: { id: string; user: { name: string | null } };
}

interface ClockInOutProps {
  patientId: string;
  patientName: string | null;
}

function formatDuration(startTime: string): string {
  const ms = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function ClockInOut({ patientId, patientName }: ClockInOutProps) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [showClockOut, setShowClockOut] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const [error, setError] = useState("");

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch(`/api/shifts?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
        setRecentShifts(data.recentShifts);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Update elapsed time every minute
  useEffect(() => {
    if (!activeShift) return;
    const update = () => setElapsed(formatDuration(activeShift.clockIn));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleClockIn = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to clock in");
      } else {
        setActiveShift(data);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: activeShift.id, notes: clockOutNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to clock out");
      } else {
        setActiveShift(null);
        setClockOutNotes("");
        setShowClockOut(false);
        fetchShifts();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clock In/Out Card */}
      <div className={`rounded-2xl p-6 border-2 ${activeShift ? "bg-green-50 border-green-200" : "bg-[#f0f5fd] border-[#d8e2f1]"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${activeShift ? "bg-green-100" : "bg-[#dbe8f8]"}`}>
            <Clock className={`w-6 h-6 ${activeShift ? "text-green-600" : "text-[#2f5f9f]"}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {activeShift ? "Currently Clocked In" : "Not Clocked In"}
            </h3>
            <p className="text-sm text-gray-600">
              {activeShift
                ? `Visiting ${patientName || "patient"} · ${elapsed}`
                : `Ready to start a visit with ${patientName || "this patient"}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {activeShift ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2 mb-4">
              <Timer className="w-4 h-4" />
              <span>
                Clocked in at {new Date(activeShift.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" · "}Duration: {elapsed}
              </span>
            </div>

            {showClockOut ? (
              <div className="space-y-3">
                <textarea
                  value={clockOutNotes}
                  onChange={(e) => setClockOutNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm resize-none"
                  placeholder="Shift notes (optional): how was the visit, any concerns..."
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleClockOut}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Confirm Clock Out
                  </button>
                  <button
                    onClick={() => setShowClockOut(false)}
                    className="px-5 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowClockOut(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-green-300 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Clock Out
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={actionLoading}
            className="flex items-center gap-2 px-6 py-3 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 shadow-[0_8px_16px_rgba(47,95,159,0.25)]"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Clock In
          </button>
        )}
      </div>

      {/* Recent Shifts */}
      {recentShifts.length > 0 && (
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-3">Recent Visits</h4>
          <div className="space-y-2">
            {recentShifts.slice(0, 5).map((shift) => {
              const duration = shift.clockOut
                ? Math.round((new Date(shift.clockOut).getTime() - new Date(shift.clockIn).getTime()) / 60000)
                : null;
              return (
                <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(shift.clockIn).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(shift.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {shift.clockOut && ` – ${new Date(shift.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {duration !== null && (
                      <span className="text-sm font-semibold text-[#2f5f9f]">
                        {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                      </span>
                    )}
                    {shift.notes && <p className="text-xs text-gray-500 mt-1 max-w-[150px] truncate">{shift.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
