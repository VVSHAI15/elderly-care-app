"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ScheduledShift } from "./types";

interface Props {
  myShifts: ScheduledShift[];
  onClose: () => void;
  onCreated: () => void;
}

type RequestType = "DAY_OFF" | "COVER_REQUEST" | "SWAP_REQUEST";

const TYPE_LABELS: Record<RequestType, string> = {
  DAY_OFF: "Request Day Off",
  COVER_REQUEST: "Ask for Coverage",
  SWAP_REQUEST: "Swap a Shift",
};

const TYPE_DESCRIPTIONS: Record<RequestType, string> = {
  DAY_OFF: "Request a specific date off. An admin will need to approve this.",
  COVER_REQUEST: "Ask another caregiver to cover one of your scheduled shifts.",
  SWAP_REQUEST: "Offer to swap one of your shifts with one of your own other shifts. Admin approval required.",
};

function formatShiftLabel(shift: ScheduledShift) {
  const d = new Date(shift.startTime);
  const start = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const from = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const to = new Date(shift.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${start}  ${from}–${to}  (${shift.patient.user.name})`;
}

export function ShiftRequestModal({ myShifts, onClose, onCreated }: Props) {
  const [type, setType] = useState<RequestType>("DAY_OFF");
  const [requestDate, setRequestDate] = useState("");
  const [scheduledShiftId, setScheduledShiftId] = useState("");
  const [offeredShiftId, setOfferedShiftId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const futureShifts = myShifts.filter(
    (s) => s.status === "SCHEDULED" && new Date(s.startTime) > new Date()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const body: Record<string, string> = { type, message };
    if (type === "DAY_OFF") {
      if (!requestDate) { setError("Please select a date."); return; }
      body.requestDate = new Date(requestDate).toISOString();
    }
    if (type === "COVER_REQUEST" || type === "SWAP_REQUEST") {
      if (!scheduledShiftId) { setError("Please select the shift to be covered."); return; }
      body.scheduledShiftId = scheduledShiftId;
    }
    if (type === "SWAP_REQUEST") {
      if (!offeredShiftId) { setError("Please select the shift you are offering."); return; }
      if (offeredShiftId === scheduledShiftId) { setError("You cannot swap a shift with itself."); return; }
      body.offeredShiftId = offeredShiftId;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedule/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed."); return; }
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
          <h3 className="font-semibold text-gray-900">Schedule Request</h3>
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

          {/* Request type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABELS) as RequestType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setError(null); }}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors text-center ${
                    type === t
                      ? "bg-[#2f5f9f] text-white border-[#2f5f9f]"
                      : "border-[#d8e2f1] text-gray-700 hover:bg-[#f0f5fd]"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">{TYPE_DESCRIPTIONS[type]}</p>
          </div>

          {/* DAY_OFF: date picker */}
          {type === "DAY_OFF" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date requested off</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
                required
              />
            </div>
          )}

          {/* COVER_REQUEST / SWAP_REQUEST: shift selector */}
          {(type === "COVER_REQUEST" || type === "SWAP_REQUEST") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === "COVER_REQUEST" ? "Shift to be covered" : "Shift you need covered"}
              </label>
              {futureShifts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No upcoming scheduled shifts found.</p>
              ) : (
                <select
                  value={scheduledShiftId}
                  onChange={(e) => setScheduledShiftId(e.target.value)}
                  className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
                  required
                >
                  <option value="">Select shift…</option>
                  {futureShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatShiftLabel(s)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* SWAP_REQUEST: offered shift selector */}
          {type === "SWAP_REQUEST" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift you offer in return
              </label>
              {futureShifts.length < 2 ? (
                <p className="text-sm text-gray-500 italic">
                  You need at least two upcoming shifts to request a swap.
                </p>
              ) : (
                <select
                  value={offeredShiftId}
                  onChange={(e) => setOfferedShiftId(e.target.value)}
                  className="w-full border border-[#d8e2f1] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
                  required
                >
                  <option value="">Select shift to offer…</option>
                  {futureShifts
                    .filter((s) => s.id !== scheduledShiftId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatShiftLabel(s)}
                      </option>
                    ))}
                </select>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message / reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="E.g. doctor appointment, family emergency…"
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
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
