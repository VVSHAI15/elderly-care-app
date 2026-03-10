"use client";

import { useState } from "react";
import { CheckCircle, XCircle, UserCheck, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { ShiftRequest } from "./types";

interface Props {
  requests: ShiftRequest[];
  isAdmin: boolean;
  caregivers?: { id: string; name: string | null; email: string }[];
  onUpdated: () => void;
}

const STATUS_PILL: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
  FULFILLED: "bg-green-50 text-green-700 border-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  DAY_OFF: "Day-Off Request",
  COVER_REQUEST: "Cover Request",
  SWAP_REQUEST: "Swap Request",
};

function formatDt(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface RequestRowProps {
  request: ShiftRequest;
  isAdmin: boolean;
  caregivers?: { id: string; name: string | null; email: string }[];
  onUpdated: () => void;
}

function RequestRow({ request, isAdmin, caregivers, onUpdated }: RequestRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [assignCoverId, setAssignCoverId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: string, extra?: object) => {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: adminNote || undefined, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed."); return; }
      onUpdated();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="border border-[#e8f0fb] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f7faff] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_PILL[request.status]}`}>
            {request.status}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {TYPE_LABELS[request.type]}
              {isAdmin && (
                <span className="ml-2 text-gray-500 font-normal">— {request.requester.name ?? request.requester.email}</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {request.type === "DAY_OFF" && request.requestDate
                ? `Date: ${new Date(request.requestDate).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}`
                : request.scheduledShift
                ? `Shift: ${formatDt(request.scheduledShift.startTime)} – ${formatDt(request.scheduledShift.endTime)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-xs">{new Date(request.createdAt).toLocaleDateString()}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#e8f0fb] bg-[#f9fbfe] space-y-3">
          {request.message && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Reason: </span>{request.message}
            </div>
          )}
          {request.scheduledShift && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Patient: </span>
              {request.scheduledShift.patient.user.name}
            </div>
          )}
          {request.offeredShift && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Offered shift: </span>
              {formatDt(request.offeredShift.startTime)} – {formatDt(request.offeredShift.endTime)}
              {" "}({request.offeredShift.patient.user.name})
            </div>
          )}
          {request.adminNote && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Admin note: </span>{request.adminNote}
            </div>
          )}
          {request.coveredBy && (
            <div className="text-sm text-green-700">
              <span className="font-medium">Covered by: </span>
              {request.coveredBy.name ?? request.coveredBy.email}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {/* Admin actions for PENDING requests */}
          {isAdmin && request.status === "PENDING" && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Admin note (optional)…"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full border border-[#d8e2f1] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act("approve")}
                  disabled={!!loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {loading === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => act("reject")}
                  disabled={!!loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors border border-red-200"
                >
                  {loading === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Admin: assign cover for approved COVER_REQUEST */}
          {isAdmin && request.status === "APPROVED" && request.type === "COVER_REQUEST" && caregivers && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Assign a caregiver to cover:</p>
              <select
                value={assignCoverId}
                onChange={(e) => setAssignCoverId(e.target.value)}
                className="w-full border border-[#d8e2f1] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
              >
                <option value="">Select caregiver…</option>
                {caregivers
                  .filter((c) => c.id !== request.requesterId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.email}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => act("assign_cover", { coveredById: assignCoverId })}
                disabled={!!loading || !assignCoverId}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[#2f5f9f] text-white hover:bg-[#254e87] disabled:opacity-60 transition-colors"
              >
                {loading === "assign_cover" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Assign Cover
              </button>
            </div>
          )}

          {/* Caregiver: volunteer to cover an approved COVER_REQUEST */}
          {!isAdmin && request.status === "APPROVED" && request.type === "COVER_REQUEST" && (
            <button
              onClick={() => act("volunteer")}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-[#2f5f9f] text-white hover:bg-[#254e87] disabled:opacity-60 transition-colors"
            >
              {loading === "volunteer" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Volunteer to Cover
            </button>
          )}

          <div className="text-xs text-gray-400 flex items-center gap-1 pt-1">
            <Clock className="w-3 h-3" />
            Submitted {formatDt(request.createdAt)}
          </div>
        </div>
      )}
    </div>
  );
}

export function ShiftRequestsList({ requests, isAdmin, caregivers, onUpdated }: Props) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No shift requests found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <RequestRow
          key={r.id}
          request={r}
          isAdmin={isAdmin}
          caregivers={caregivers}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}
