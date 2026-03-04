"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import type { CareProfile } from "@/types/care-profile";

interface Props {
  patientId: string;
  initial?: CareProfile;
  onSave: (updated: CareProfile) => void;
  onClose: () => void;
}

const SECTIONS = [
  "Allergies", "Conditions", "Medications", "Health History", "Illness History",
  "Discharge Info", "Warning Signs", "Exercise", "Diet", "Appointments", "Contacts",
] as const;
type Section = (typeof SECTIONS)[number];

type StringList = string[];
interface Phase { period: string; instructions: string }
interface DietItem { category: string; instruction: string }
interface Appointment { priority: string; type: string; timeframe: string; physician: string; reason: string }
interface Contact { name: string; phone: string; hours: string }
interface AllergyRow { substance: string; reaction: string; severity: string }
interface ConditionRow { name: string; status: string; notes: string }
interface HealthEventRow { event: string; date: string; notes: string }
interface IllnessRow { illness: string; date: string; notes: string }

interface FormState {
  // Allergies
  allergyRows: AllergyRow[];
  // Conditions
  conditionRows: ConditionRow[];
  // Medications (informational note — separate from medication tracker)
  medicationsNote: string;
  // Health History
  healthRows: HealthEventRow[];
  // Illness History
  illnessRows: IllnessRow[];
  // Discharge Info
  hospital: string;
  diagnosis: string;
  mrn: string;
  admissionDate: string;
  dischargeDate: string;
  attendingPhysician: string;
  followUpPhysician: string;
  // Warning Signs
  emergency: StringList;
  callDoctor: StringList;
  // Exercise
  phases: Phase[];
  restrictions: StringList;
  // Diet
  dietItems: DietItem[];
  // Appointments
  appointments: Appointment[];
  // Contacts
  contacts: Contact[];
}

function initForm(initial?: CareProfile): FormState {
  const cp = initial as (CareProfile & Record<string, unknown>) | undefined;
  const allergies = cp?.allergies as { items?: AllergyRow[] } | null | undefined;
  const conditions = cp?.conditions as { items?: ConditionRow[] } | null | undefined;
  const healthHistory = cp?.healthHistory as { items?: HealthEventRow[] } | null | undefined;
  const illnessHistory = cp?.illnessHistory as { items?: IllnessRow[] } | null | undefined;
  return {
    allergyRows: allergies?.items?.length
      ? allergies.items.map((a) => ({ substance: a.substance ?? "", reaction: a.reaction ?? "", severity: a.severity ?? "" }))
      : [{ substance: "", reaction: "", severity: "" }],
    conditionRows: conditions?.items?.length
      ? conditions.items.map((c) => ({ name: c.name ?? "", status: c.status ?? "", notes: c.notes ?? "" }))
      : [{ name: "", status: "", notes: "" }],
    medicationsNote: "",
    healthRows: healthHistory?.items?.length
      ? healthHistory.items.map((h) => ({ event: h.event ?? "", date: h.date ?? "", notes: h.notes ?? "" }))
      : [{ event: "", date: "", notes: "" }],
    illnessRows: illnessHistory?.items?.length
      ? illnessHistory.items.map((i) => ({ illness: i.illness ?? "", date: i.date ?? "", notes: i.notes ?? "" }))
      : [{ illness: "", date: "", notes: "" }],
    hospital: initial?.dischargeInfo?.hospital ?? "",
    diagnosis: initial?.dischargeInfo?.diagnosis ?? "",
    mrn: initial?.dischargeInfo?.mrn ?? "",
    admissionDate: initial?.dischargeInfo?.admissionDate ?? "",
    dischargeDate: initial?.dischargeInfo?.dischargeDate ?? "",
    attendingPhysician: initial?.dischargeInfo?.attendingPhysician ?? "",
    followUpPhysician: initial?.dischargeInfo?.followUpPhysician ?? "",
    emergency: initial?.warningSigns?.emergency?.length ? [...initial.warningSigns.emergency] : [""],
    callDoctor: initial?.warningSigns?.callDoctor?.length ? [...initial.warningSigns.callDoctor] : [""],
    phases: initial?.exerciseGuidelines?.phases?.length
      ? initial.exerciseGuidelines.phases.map((p) => ({ ...p }))
      : [{ period: "", instructions: "" }],
    restrictions: initial?.exerciseGuidelines?.restrictions?.length
      ? [...initial.exerciseGuidelines.restrictions]
      : [""],
    dietItems: initial?.dietRestrictions?.items?.length
      ? initial.dietRestrictions.items.map((i) => ({ ...i }))
      : [{ category: "", instruction: "" }],
    appointments: initial?.followUpAppointments?.length
      ? initial.followUpAppointments.map((a) => ({ ...a }))
      : [{ priority: "", type: "", timeframe: "", physician: "", reason: "" }],
    contacts: initial?.careContacts?.length
      ? initial.careContacts.map((c) => ({ ...c }))
      : [{ name: "", phone: "", hours: "" }],
  };
}

function buildPayload(f: FormState): CareProfile {
  const nonEmpty = (arr: StringList) => arr.filter((s) => s.trim());
  const validAllergies = f.allergyRows.filter((a) => a.substance.trim());
  const validConditions = f.conditionRows.filter((c) => c.name.trim());
  const validHealth = f.healthRows.filter((h) => h.event.trim());
  const validIllness = f.illnessRows.filter((i) => i.illness.trim());
  return {
    allergies: validAllergies.length ? { items: validAllergies } : null,
    conditions: validConditions.length ? { items: validConditions } : null,
    healthHistory: validHealth.length ? { items: validHealth } : null,
    illnessHistory: validIllness.length ? { items: validIllness } : null,
    dischargeInfo:
      f.diagnosis || f.hospital || f.mrn
        ? {
            hospital: f.hospital,
            diagnosis: f.diagnosis,
            mrn: f.mrn,
            admissionDate: f.admissionDate,
            dischargeDate: f.dischargeDate,
            attendingPhysician: f.attendingPhysician,
            followUpPhysician: f.followUpPhysician,
          }
        : null,
    warningSigns:
      nonEmpty(f.emergency).length || nonEmpty(f.callDoctor).length
        ? { emergency: nonEmpty(f.emergency), callDoctor: nonEmpty(f.callDoctor) }
        : null,
    exerciseGuidelines:
      f.phases.some((p) => p.period || p.instructions) || nonEmpty(f.restrictions).length
        ? {
            phases: f.phases.filter((p) => p.period || p.instructions),
            restrictions: nonEmpty(f.restrictions),
          }
        : null,
    dietRestrictions:
      f.dietItems.some((i) => i.category || i.instruction)
        ? { items: f.dietItems.filter((i) => i.category || i.instruction) }
        : null,
    followUpAppointments: f.appointments.filter((a) => a.type || a.priority),
    careContacts: f.contacts.filter((c) => c.name || c.phone),
  };
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

export function EditCareProfileModal({ patientId, initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(initial));
  const [activeSection, setActiveSection] = useState<Section>("Allergies");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormState, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const updateStringList = (key: "emergency" | "callDoctor" | "restrictions", idx: number, val: string) => {
    setForm((f) => {
      const arr = [...(f[key] as StringList)];
      arr[idx] = val;
      return { ...f, [key]: arr };
    });
  };
  const addString = (key: "emergency" | "callDoctor" | "restrictions") =>
    setForm((f) => ({ ...f, [key]: [...(f[key] as StringList), ""] }));
  const removeString = (key: "emergency" | "callDoctor" | "restrictions", idx: number) =>
    setForm((f) => ({ ...f, [key]: (f[key] as StringList).filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const payload = buildPayload(form);
    // Use /api/patients/[id] PATCH — works for both caregivers and admins
    const res = await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careProfile: payload }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save. Please try again.");
      return;
    }
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e8eef8]">
          <h2 className="text-lg font-bold text-gray-900">Edit Care Profile</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-5 pt-4 pb-0 flex-wrap">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors mb-1 ${
                activeSection === s
                  ? "bg-[#2f5f9f] text-white"
                  : "text-gray-600 hover:bg-[#f0f5fd]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Allergies */}
          {activeSection === "Allergies" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Known Allergies</p>
                <button
                  onClick={() => set("allergyRows", [...form.allergyRows, { substance: "", reaction: "", severity: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.allergyRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <label className={labelCls}>Substance / Allergen</label>
                        <input type="text" className={inputCls} value={row.substance} placeholder="Penicillin"
                          onChange={(e) => set("allergyRows", form.allergyRows.map((r, idx) => idx === i ? { ...r, substance: e.target.value } : r))} />
                      </div>
                      <div>
                        <label className={labelCls}>Reaction</label>
                        <input type="text" className={inputCls} value={row.reaction} placeholder="Hives, swelling"
                          onChange={(e) => set("allergyRows", form.allergyRows.map((r, idx) => idx === i ? { ...r, reaction: e.target.value } : r))} />
                      </div>
                      <div>
                        <label className={labelCls}>Severity</label>
                        <select className={inputCls} value={row.severity}
                          onChange={(e) => set("allergyRows", form.allergyRows.map((r, idx) => idx === i ? { ...r, severity: e.target.value } : r))}>
                          <option value="">Select...</option>
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                        </select>
                      </div>
                    </div>
                    {form.allergyRows.length > 1 && (
                      <button onClick={() => set("allergyRows", form.allergyRows.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {activeSection === "Conditions" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Medical Conditions</p>
                <button
                  onClick={() => set("conditionRows", [...form.conditionRows, { name: "", status: "", notes: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.conditionRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="col-span-2">
                        <label className={labelCls}>Condition Name</label>
                        <input type="text" className={inputCls} value={row.name} placeholder="Congestive Heart Failure"
                          onChange={(e) => set("conditionRows", form.conditionRows.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} />
                      </div>
                      <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={row.status}
                          onChange={(e) => set("conditionRows", form.conditionRows.map((r, idx) => idx === i ? { ...r, status: e.target.value } : r))}>
                          <option value="">Select...</option>
                          <option value="Active">Active</option>
                          <option value="Managed">Managed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className={labelCls}>Notes (optional)</label>
                        <input type="text" className={inputCls} value={row.notes} placeholder="Additional notes..."
                          onChange={(e) => set("conditionRows", form.conditionRows.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} />
                      </div>
                    </div>
                    {form.conditionRows.length > 1 && (
                      <button onClick={() => set("conditionRows", form.conditionRows.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications (info only) */}
          {activeSection === "Medications" && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">Prescription Medications</p>
                <p className="text-xs text-blue-600">
                  Medications are tracked in the Medications tab. Use this section to add notes about medication history, discontinued meds, or important context not captured by the medication tracker.
                </p>
              </div>
              <div>
                <label className={labelCls}>Medication Notes (e.g. past reactions, discontinued meds)</label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={6}
                  value={form.medicationsNote}
                  placeholder="e.g. Previously took Warfarin — discontinued 2023 due to bleeding risk. Allergic to sulfa drugs..."
                  onChange={(e) => set("medicationsNote", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Health History */}
          {activeSection === "Health History" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Health History (surgeries, procedures, hospitalizations)</p>
                <button
                  onClick={() => set("healthRows", [...form.healthRows, { event: "", date: "", notes: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.healthRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="col-span-2">
                        <label className={labelCls}>Event / Procedure</label>
                        <input type="text" className={inputCls} value={row.event} placeholder="Coronary bypass surgery"
                          onChange={(e) => set("healthRows", form.healthRows.map((r, idx) => idx === i ? { ...r, event: e.target.value } : r))} />
                      </div>
                      <div>
                        <label className={labelCls}>Date (approx)</label>
                        <input type="text" className={inputCls} value={row.date} placeholder="March 2024"
                          onChange={(e) => set("healthRows", form.healthRows.map((r, idx) => idx === i ? { ...r, date: e.target.value } : r))} />
                      </div>
                      <div className="col-span-3">
                        <label className={labelCls}>Notes (optional)</label>
                        <input type="text" className={inputCls} value={row.notes} placeholder="Performed at Riverside General..."
                          onChange={(e) => set("healthRows", form.healthRows.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} />
                      </div>
                    </div>
                    {form.healthRows.length > 1 && (
                      <button onClick={() => set("healthRows", form.healthRows.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Illness History */}
          {activeSection === "Illness History" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Illness History</p>
                <button
                  onClick={() => set("illnessRows", [...form.illnessRows, { illness: "", date: "", notes: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.illnessRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="col-span-2">
                        <label className={labelCls}>Illness / Diagnosis</label>
                        <input type="text" className={inputCls} value={row.illness} placeholder="Pneumonia"
                          onChange={(e) => set("illnessRows", form.illnessRows.map((r, idx) => idx === i ? { ...r, illness: e.target.value } : r))} />
                      </div>
                      <div>
                        <label className={labelCls}>Date (approx)</label>
                        <input type="text" className={inputCls} value={row.date} placeholder="Winter 2022"
                          onChange={(e) => set("illnessRows", form.illnessRows.map((r, idx) => idx === i ? { ...r, date: e.target.value } : r))} />
                      </div>
                      <div className="col-span-3">
                        <label className={labelCls}>Notes (optional)</label>
                        <input type="text" className={inputCls} value={row.notes} placeholder="Hospitalized for 3 days..."
                          onChange={(e) => set("illnessRows", form.illnessRows.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} />
                      </div>
                    </div>
                    {form.illnessRows.length > 1 && (
                      <button onClick={() => set("illnessRows", form.illnessRows.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discharge Info */}
          {activeSection === "Discharge Info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["hospital", "Hospital Name"],
                    ["diagnosis", "Primary Diagnosis"],
                    ["mrn", "MRN"],
                    ["attendingPhysician", "Attending Physician"],
                    ["dischargeDate", "Discharge Date"],
                    ["admissionDate", "Admission Date"],
                    ["followUpPhysician", "Follow-Up Physician"],
                  ] as [keyof FormState, string][]
                ).map(([key, label]) => (
                  <div key={key} className={key === "diagnosis" || key === "followUpPhysician" ? "col-span-2" : ""}>
                    <label className={labelCls}>{label}</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={form[key] as string}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Signs */}
          {activeSection === "Warning Signs" && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-red-700">Call 911 Signs</p>
                  <button onClick={() => addString("emergency")} className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.emergency.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className={inputCls} value={s} placeholder="e.g. Sudden chest pain or pressure"
                        onChange={(e) => updateStringList("emergency", i, e.target.value)} />
                      {form.emergency.length > 1 && (
                        <button onClick={() => removeString("emergency", i)} className="p-2 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-amber-700">Call Doctor — Same Day</p>
                  <button onClick={() => addString("callDoctor")} className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.callDoctor.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className={inputCls} value={s} placeholder="e.g. Weight gain of more than 2 lbs overnight"
                        onChange={(e) => updateStringList("callDoctor", i, e.target.value)} />
                      {form.callDoctor.length > 1 && (
                        <button onClick={() => removeString("callDoctor", i)} className="p-2 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exercise */}
          {activeSection === "Exercise" && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800">Recovery Phases</p>
                  <button onClick={() => set("phases", [...form.phases, { period: "", instructions: "" }])}
                    className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                    <Plus className="w-3 h-3" /> Add Phase
                  </button>
                </div>
                <div className="space-y-3">
                  {form.phases.map((phase, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                      <div className="w-28 flex-shrink-0">
                        <label className={labelCls}>Period</label>
                        <input type="text" className={inputCls} value={phase.period} placeholder="Week 1–2"
                          onChange={(e) => set("phases", form.phases.map((p, idx) => idx === i ? { ...p, period: e.target.value } : p))} />
                      </div>
                      <div className="flex-1">
                        <label className={labelCls}>Instructions</label>
                        <textarea className={inputCls + " resize-none"} rows={2} value={phase.instructions} placeholder="Short, slow walks..."
                          onChange={(e) => set("phases", form.phases.map((p, idx) => idx === i ? { ...p, instructions: e.target.value } : p))} />
                      </div>
                      {form.phases.length > 1 && (
                        <button onClick={() => set("phases", form.phases.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800">Restrictions</p>
                  <button onClick={() => addString("restrictions")} className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.restrictions.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" className={inputCls} value={r} placeholder="No heavy lifting (over 10 lbs) for at least 4 weeks"
                        onChange={(e) => updateStringList("restrictions", i, e.target.value)} />
                      {form.restrictions.length > 1 && (
                        <button onClick={() => removeString("restrictions", i)} className="p-2 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Diet */}
          {activeSection === "Diet" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Diet & Fluid Restrictions</p>
                <button onClick={() => set("dietItems", [...form.dietItems, { category: "", instruction: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {form.dietItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                    <div className="w-36 flex-shrink-0">
                      <label className={labelCls}>Category</label>
                      <input type="text" className={inputCls} value={item.category} placeholder="Sodium (Salt)"
                        onChange={(e) => set("dietItems", form.dietItems.map((d, idx) => idx === i ? { ...d, category: e.target.value } : d))} />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>Instruction</label>
                      <textarea className={inputCls + " resize-none"} rows={2} value={item.instruction} placeholder="Limit to 2,000 mg per day..."
                        onChange={(e) => set("dietItems", form.dietItems.map((d, idx) => idx === i ? { ...d, instruction: e.target.value } : d))} />
                    </div>
                    {form.dietItems.length > 1 && (
                      <button onClick={() => set("dietItems", form.dietItems.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments */}
          {activeSection === "Appointments" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Follow-Up Appointments</p>
                <button onClick={() => set("appointments", [...form.appointments, { priority: "", type: "", timeframe: "", physician: "", reason: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.appointments.map((appt, i) => (
                  <div key={i} className="p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8] space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Priority</label>
                        <select className={inputCls} value={appt.priority}
                          onChange={(e) => set("appointments", form.appointments.map((a, idx) => idx === i ? { ...a, priority: e.target.value } : a))}>
                          <option value="">Select...</option>
                          <option value="URGENT">URGENT</option>
                          <option value="REQUIRED">REQUIRED</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="RECOMMENDED">RECOMMENDED</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Type</label>
                        <input type="text" className={inputCls} value={appt.type} placeholder="Post-discharge check-up"
                          onChange={(e) => set("appointments", form.appointments.map((a, idx) => idx === i ? { ...a, type: e.target.value } : a))} />
                      </div>
                      <div>
                        <label className={labelCls}>Timeframe</label>
                        <input type="text" className={inputCls} value={appt.timeframe} placeholder="Within 7 days"
                          onChange={(e) => set("appointments", form.appointments.map((a, idx) => idx === i ? { ...a, timeframe: e.target.value } : a))} />
                      </div>
                      <div>
                        <label className={labelCls}>Physician / Location</label>
                        <input type="text" className={inputCls} value={appt.physician} placeholder="Dr. Marcus Reid"
                          onChange={(e) => set("appointments", form.appointments.map((a, idx) => idx === i ? { ...a, physician: e.target.value } : a))} />
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <label className={labelCls}>Reason</label>
                        <input type="text" className={inputCls} value={appt.reason} placeholder="Assess fluid status and symptoms"
                          onChange={(e) => set("appointments", form.appointments.map((a, idx) => idx === i ? { ...a, reason: e.target.value } : a))} />
                      </div>
                      {form.appointments.length > 1 && (
                        <button onClick={() => set("appointments", form.appointments.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {activeSection === "Contacts" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">Important Contacts</p>
                <button onClick={() => set("contacts", [...form.contacts, { name: "", phone: "", hours: "" }])}
                  className="flex items-center gap-1 text-xs text-[#2f5f9f] font-semibold hover:underline">
                  <Plus className="w-3 h-3" /> Add Contact
                </button>
              </div>
              <div className="space-y-3">
                {form.contacts.map((contact, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <label className={labelCls}>Name</label>
                        <input type="text" className={inputCls} value={contact.name} placeholder="Dr. Marcus Reid"
                          onChange={(e) => set("contacts", form.contacts.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))} />
                      </div>
                      <div>
                        <label className={labelCls}>Phone</label>
                        <input type="text" className={inputCls} value={contact.phone} placeholder="(804) 555-0250"
                          onChange={(e) => set("contacts", form.contacts.map((c, idx) => idx === i ? { ...c, phone: e.target.value } : c))} />
                      </div>
                      <div>
                        <label className={labelCls}>Hours / Notes</label>
                        <input type="text" className={inputCls} value={contact.hours} placeholder="Mon–Fri 8 AM–5 PM"
                          onChange={(e) => set("contacts", form.contacts.map((c, idx) => idx === i ? { ...c, hours: e.target.value } : c))} />
                      </div>
                    </div>
                    {form.contacts.length > 1 && (
                      <button onClick={() => set("contacts", form.contacts.filter((_, idx) => idx !== i))} className="p-1 mt-5 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#e8eef8] flex items-center justify-between">
          {error ? <p className="text-sm text-red-600">{error}</p> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] disabled:opacity-50 text-sm">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Care Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
