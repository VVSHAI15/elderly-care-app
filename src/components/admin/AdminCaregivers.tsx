"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Mail, Plus, Loader2, CheckCircle2, Clock, Send } from "lucide-react";

interface Caregiver {
  id: string;
  name: string | null;
  email: string;
  joinedAt: string;
  patientsAssigned: number;
  hoursThisWeek: number;
  shiftsThisWeek: number;
  activeShift: { id: string; patientId: string } | null;
}

interface PendingInvite {
  id: string;
  targetEmail: string | null;
  createdAt: string;
  expiresAt: string;
}

export function AdminCaregivers() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  const fetchCaregivers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/caregivers");
      if (res.ok) {
        const data = await res.json();
        setCaregivers(data.caregivers);
        setPendingInvites(data.pendingInvites);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaregivers(); }, [fetchCaregivers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch("/api/admin/caregivers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite");
      } else {
        setInviteSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteName("");
        fetchCaregivers();
      }
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Caregivers</h2>
          <p className="text-sm text-gray-600">{caregivers.length} active · {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors shadow-[0_6px_14px_rgba(47,95,159,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Invite Caregiver
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#2f5f9f]" />
            Send Email Invitation
          </h3>
          {inviteSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              {inviteSuccess}
            </div>
          )}
          {inviteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {inviteError}
            </div>
          )}
          <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name (optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Maria Garcia"
                className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="maria@example.com"
                required
                className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-6 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setInviteSuccess(""); setInviteError(""); }}
                className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Caregivers Table */}
      {caregivers.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No caregivers yet</h3>
          <p className="text-gray-500 text-sm">Invite your first caregiver using the button above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#d8e2f1]">
          <table className="w-full text-sm">
            <thead className="bg-[#f0f5fd] border-b border-[#d8e2f1]">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Caregiver</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Patients</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Hours This Week</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {caregivers.map((c) => (
                <tr key={c.id} className="hover:bg-[#f7faff] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#dbe8f8] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-[#2f5f9f] font-semibold text-sm">
                          {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name || "—"}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{c.patientsAssigned}</td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-gray-900">{c.hoursThisWeek}h</span>
                    <span className="text-xs text-gray-500 ml-1">({c.shiftsThisWeek} visits)</span>
                  </td>
                  <td className="px-5 py-4">
                    {c.activeShift ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        On Visit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                        <Clock className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">{inv.targetEmail}</span>
                </div>
                <span className="text-xs text-amber-600">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
