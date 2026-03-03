"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Loader2, ChevronRight, AlertTriangle, Eye, EyeOff, UserPlus, UserMinus, Mail, CheckCircle } from "lucide-react";

interface PatientSummary {
  patientId: string;
  userId: string;
  name: string | null;
  email: string;
  dateOfBirth: string | null;
  assignedCaregivers: { id: string; name: string | null }[];
  familyMembers: { id: string; name: string | null }[];
  pendingFamilyInvites?: { id: string; targetEmail: string | null; expiresAt: string }[];
  todayTasks: { total: number; completed: number; pending: number; overdue: number };
  activeMedications: number;
  visibility: { tasks: boolean; meds: boolean; metrics: boolean; shifts: boolean };
}

interface Caregiver {
  id: string;
  name: string | null;
  email: string;
}

export function AdminPatients() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");
  const [connectFeedback, setConnectFeedback] = useState<{ action: "connected" | "invited"; email: string } | null>(null);

  // New patient form state
  const [form, setForm] = useState({
    name: "", email: "", dateOfBirth: "", medicalNotes: "", emergencyContact: "", temporaryPassword: "",
  });

  const fetchAll = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/admin/patients"),
      fetch("/api/admin/caregivers"),
    ]);
    if (pRes.ok) { const d = await pRes.json(); setPatients(d.patients); }
    if (cRes.ok) { const d = await cRes.json(); setCaregivers(d.caregivers); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSelectPatient = async (p: PatientSummary) => {
    setSelectedPatient(p);
    setConnectFeedback(null);
    // Fetch patient detail to get pending invites
    const res = await fetch(`/api/admin/patients/${p.patientId}`);
    if (res.ok) {
      const detail = await res.json();
      setSelectedPatient((prev) => prev ? { ...prev, pendingFamilyInvites: detail.pendingFamilyInvites } : prev);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    const res = await fetch("/api/admin/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || "Failed to create patient");
    } else {
      setShowAdd(false);
      setForm({ name: "", email: "", dateOfBirth: "", medicalNotes: "", emergencyContact: "", temporaryPassword: "" });
      fetchAll();
    }
    setAddLoading(false);
  };

  const handleAssign = async (patientId: string, caregiverId: string, unassign = false) => {
    setActionLoading(true);
    await fetch(`/api/admin/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unassign ? { unassignCaregiverId: caregiverId } : { assignCaregiverId: caregiverId }),
    });
    await fetchAll();
    if (selectedPatient) {
      const updated = patients.find((p) => p.patientId === patientId);
      if (updated) setSelectedPatient(updated);
    }
    setActionLoading(false);
  };

  const handleConnectFamily = async (patientId: string) => {
    if (!connectEmail.trim()) return;
    setActionLoading(true);
    setConnectFeedback(null);
    const email = connectEmail;
    const res = await fetch(`/api/admin/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectFamilyEmail: email }),
    });
    if (res.ok) {
      const data = await res.json();
      setConnectFeedback({ action: data.action, email });
      setConnectEmail("");
      await fetchAll();
      // Refresh pending invites for selected patient
      const detailRes = await fetch(`/api/admin/patients/${patientId}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setSelectedPatient((prev) =>
          prev ? { ...prev, pendingFamilyInvites: detail.pendingFamilyInvites, familyMembers: detail.familyMembers } : prev
        );
      }
    }
    setActionLoading(false);
  };

  const handleVisibility = async (patientId: string, field: string, value: boolean) => {
    await fetch(`/api/admin/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await fetchAll();
    if (selectedPatient?.patientId === patientId) {
      setSelectedPatient((prev) => prev ? { ...prev, visibility: { ...prev.visibility, [field.replace("familyCanView", "").toLowerCase()]: value } } : prev);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" /></div>;
  }

  if (selectedPatient) {
    const unassignedCaregivers = caregivers.filter(
      (c) => !selectedPatient.assignedCaregivers.find((a) => a.id === c.id)
    );
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedPatient(null); setConnectFeedback(null); }} className="flex items-center gap-2 text-[#2f5f9f] font-semibold text-sm hover:text-[#224978]">
          &larr; Back to Patients
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#dbe8f8] rounded-full flex items-center justify-center">
            <span className="text-[#2f5f9f] font-bold text-xl">
              {selectedPatient.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{selectedPatient.name}</h2>
            <p className="text-gray-500 text-sm">{selectedPatient.email}</p>
          </div>
        </div>

        {/* Assigned Caregivers */}
        <div className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">Assigned Caregivers</h3>
          <div className="space-y-2 mb-4">
            {selectedPatient.assignedCaregivers.length === 0 ? (
              <p className="text-sm text-gray-500">No caregivers assigned yet.</p>
            ) : (
              selectedPatient.assignedCaregivers.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#d8e2f1]">
                  <span className="font-medium text-gray-900 text-sm">{c.name || c.id}</span>
                  <button
                    onClick={() => handleAssign(selectedPatient.patientId, c.id, true)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          {unassignedCaregivers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Add Caregiver:</p>
              <div className="flex flex-wrap gap-2">
                {unassignedCaregivers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleAssign(selectedPatient.patientId, c.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2f5f9f] text-white text-xs font-semibold rounded-lg hover:bg-[#224978] transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-3 h-3" />
                    {c.name || c.email}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Family Members */}
        <div className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Family Members</h3>
          <p className="text-xs text-gray-500 mb-4">Connected family members can view care progress, health metrics, and visit history.</p>

          {/* Connected family members */}
          <div className="space-y-2 mb-4">
            {selectedPatient.familyMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No family members connected yet.</p>
            ) : (
              selectedPatient.familyMembers.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-[#d8e2f1]">
                  <div className="w-7 h-7 bg-[#dbe8f8] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#2f5f9f] font-semibold text-xs">
                      {f.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{f.name || "Unknown"}</span>
                </div>
              ))
            )}
          </div>

          {/* Pending invites */}
          {(selectedPatient.pendingFamilyInvites ?? []).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Pending Invites</p>
              <div className="space-y-2">
                {(selectedPatient.pendingFamilyInvites ?? []).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Mail className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-800 flex-1">{inv.targetEmail}</span>
                    <span className="text-xs text-amber-500">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback message */}
          {connectFeedback && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                {connectFeedback.action === "connected"
                  ? `${connectFeedback.email} has been connected.`
                  : `Invite sent to ${connectFeedback.email}. They'll receive an email to create their account.`}
              </p>
            </div>
          )}

          {/* Add family member input */}
          <p className="text-xs font-semibold text-gray-600 mb-2">Add Family Member by Email</p>
          <p className="text-xs text-gray-500 mb-2">If they already have an account they&apos;ll be connected directly. Otherwise, an invite email will be sent.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={connectEmail}
              onChange={(e) => { setConnectEmail(e.target.value); setConnectFeedback(null); }}
              placeholder="family@example.com"
              className="flex-1 px-3 py-2 border-2 border-[#cdd9e9] rounded-xl bg-white text-sm focus:ring-2 focus:ring-[#2f5f9f] outline-none"
            />
            <button
              onClick={() => handleConnectFamily(selectedPatient.patientId)}
              disabled={actionLoading || !connectEmail}
              className="px-4 py-2 bg-[#2f5f9f] text-white text-sm font-semibold rounded-xl hover:bg-[#224978] disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </div>

        {/* Family Visibility */}
        <div className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Family Visibility Settings</h3>
          <p className="text-sm text-gray-500 mb-4">Control what family members can see in their dashboard.</p>
          {[
            { field: "familyCanViewTasks", label: "Task Completion & Activity", key: "tasks" },
            { field: "familyCanViewMeds", label: "Medications & Adherence", key: "meds" },
            { field: "familyCanViewMetrics", label: "Health Vitals & Metrics", key: "metrics" },
            { field: "familyCanViewShifts", label: "Caregiver Visit History", key: "shifts" },
          ].map(({ field, label, key }) => {
            const value = selectedPatient.visibility[key as keyof typeof selectedPatient.visibility];
            return (
              <div key={field} className="flex items-center justify-between py-3 border-b border-[#d8e2f1] last:border-0">
                <span className="text-sm font-medium text-gray-800">{label}</span>
                <button
                  onClick={() => handleVisibility(selectedPatient.patientId, field, !value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    value ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {value ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {value ? "Visible" : "Hidden"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Patients</h2>
          <p className="text-sm text-gray-600">{patients.length} client{patients.length !== 1 ? "s" : ""} under care</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors shadow-[0_6px_14px_rgba(47,95,159,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#f0f5fd] border-2 border-[#d8e2f1] rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">New Patient Profile</h3>
          {addError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{addError}</div>}
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            {[
              { key: "name", label: "Full Name", placeholder: "Robert Johnson", required: true },
              { key: "email", label: "Email", placeholder: "robert@example.com", type: "email", required: true },
              { key: "dateOfBirth", label: "Date of Birth", type: "date" },
              { key: "temporaryPassword", label: "Temporary Password", type: "password", placeholder: "Auto-generated if blank" },
              { key: "emergencyContact", label: "Emergency Contact", placeholder: "Jane Johnson – 555-0100" },
            ].map(({ key, label, placeholder, type = "text", required }) => (
              <div key={key} className={key === "emergencyContact" ? "col-span-2" : ""}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={required}
                  className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Medical Notes</label>
              <textarea
                value={form.medicalNotes}
                onChange={(e) => setForm((f) => ({ ...f, medicalNotes: e.target.value }))}
                rows={2}
                placeholder="Relevant conditions, allergies, preferences..."
                className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm resize-none"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={addLoading}
                className="px-6 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Patient
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {patients.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-900 mb-2">No patients yet</h3>
          <p className="text-gray-500 text-sm">Add your first patient profile using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {patients.map((p) => {
            const rate = p.todayTasks.total > 0 ? Math.round((p.todayTasks.completed / p.todayTasks.total) * 100) : 0;
            return (
              <button
                key={p.patientId}
                onClick={() => handleSelectPatient(p)}
                className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5 hover:border-[#2f5f9f] hover:shadow-[0_8px_24px_rgba(47,95,159,0.12)] transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#dbe8f8] rounded-full flex items-center justify-center">
                      <span className="text-[#2f5f9f] font-semibold">
                        {p.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{p.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{p.assignedCaregivers.length} caregiver{p.assignedCaregivers.length !== 1 ? "s" : ""} assigned</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2f5f9f] mt-1" />
                </div>
                {p.todayTasks.total > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Today&apos;s tasks</span>
                      <span className="font-bold text-[#2f5f9f]">{rate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${rate === 100 ? "bg-green-500" : p.todayTasks.overdue > 0 ? "bg-red-400" : "bg-[#2f5f9f]"}`} style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )}
                {p.todayTasks.overdue > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {p.todayTasks.overdue} overdue
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
