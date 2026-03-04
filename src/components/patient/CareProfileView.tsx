"use client";

import { useState } from "react";
import { AlertTriangle, Phone, Calendar, Activity, Utensils, FileText, Pencil, ShieldAlert, Heart, Clock, Pill, Sparkles, Loader2, CheckCircle } from "lucide-react";
import type {
  CareProfile,
  DischargeInfo,
  ExerciseGuidelines,
  DietRestrictions,
  WarningSigns,
  CareContact,
  FollowUpAppointment,
  AllergyList,
  ConditionList,
  HealthHistory,
  IllnessHistory,
} from "@/types/care-profile";
import { getAllAllergyConflicts, type AllergyConflict } from "@/lib/drug-allergy-check";
import { findProtocolsForConditions, type ConditionProtocol } from "@/lib/condition-protocols";

interface MedicationSummary {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescriber?: string | null;
}

interface Props extends CareProfile {
  medications?: MedicationSummary[];
  patientId?: string;
  onEdit?: () => void;
  onTasksCreated?: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border border-red-200",
  REQUIRED: "bg-amber-100 text-amber-700 border border-amber-200",
  SCHEDULED: "bg-blue-100 text-blue-700 border border-blue-200",
  RECOMMENDED: "bg-green-100 text-green-700 border border-green-200",
};

const SEVERITY_STYLES: Record<string, string> = {
  Mild: "bg-yellow-100 text-yellow-700",
  Moderate: "bg-orange-100 text-orange-700",
  Severe: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-red-100 text-red-700",
  Managed: "bg-blue-100 text-blue-700",
  Resolved: "bg-green-100 text-green-700",
};

export function CareProfileView({
  dischargeInfo,
  exerciseGuidelines,
  dietRestrictions,
  warningSigns,
  careContacts,
  followUpAppointments,
  allergies,
  conditions,
  healthHistory,
  illnessHistory,
  medications,
  patientId,
  onEdit,
  onTasksCreated,
}: Props) {
  const [applyingProtocol, setApplyingProtocol] = useState<string | null>(null);
  const [appliedProtocols, setAppliedProtocols] = useState<Set<string>>(new Set());
  const di = dischargeInfo as DischargeInfo | null | undefined;
  const eg = exerciseGuidelines as ExerciseGuidelines | null | undefined;
  const dr = dietRestrictions as DietRestrictions | null | undefined;
  const ws = warningSigns as WarningSigns | null | undefined;
  const cc = careContacts as CareContact[] | null | undefined;
  const fa = followUpAppointments as FollowUpAppointment[] | null | undefined;
  const al = allergies as AllergyList | null | undefined;
  const co = conditions as ConditionList | null | undefined;
  const hh = healthHistory as HealthHistory | null | undefined;
  const ih = illnessHistory as IllnessHistory | null | undefined;

  // Compute drug-allergy conflicts from current medications + allergies
  const allergyList = al?.items ?? [];
  const medList = medications ?? [];
  const allergyConflicts: AllergyConflict[] = allergyList.length > 0 && medList.length > 0
    ? getAllAllergyConflicts(medList.map((m) => ({ name: m.name })), allergyList)
    : [];

  // Find matching care protocols for current conditions
  const conditionNames = co?.items?.map((c) => c.name) ?? [];
  const matchingProtocols: ConditionProtocol[] = conditionNames.length > 0
    ? findProtocolsForConditions(conditionNames)
    : [];

  const handleApplyProtocol = async (protocolId: string, protocolName: string) => {
    if (!patientId || applyingProtocol) return;
    setApplyingProtocol(protocolId);
    try {
      const res = await fetch("/api/care-plans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, protocolId }),
      });
      if (res.ok) {
        setAppliedProtocols((prev) => new Set([...prev, protocolId]));
        onTasksCreated?.();
      }
    } catch { /* silent */ } finally {
      setApplyingProtocol(null);
    }
  };

  const hasMeds = medications && medications.length > 0;
  const hasData =
    di || ws || eg ||
    (dr && dr.items && dr.items.length > 0) ||
    (cc && cc.length > 0) ||
    (fa && fa.length > 0) ||
    (al && al.items && al.items.length > 0) ||
    (co && co.items && co.items.length > 0) ||
    (hh && hh.items && hh.items.length > 0) ||
    (ih && ih.items && ih.items.length > 0) ||
    hasMeds;

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="font-bold text-gray-800 mb-1">No care profile yet</p>
        <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
          Add allergies, medical conditions, health history, medications, discharge summary, warning signs, and more.
        </p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-5 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors text-sm"
          >
            Set Up Care Profile
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {onEdit && (
        <div className="flex justify-end">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#2f5f9f] border-2 border-[#d8e2f1] rounded-xl hover:bg-[#f0f5fd] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Care Profile
          </button>
        </div>
      )}

      {/* Drug-Allergy Conflict Alerts */}
      {allergyConflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800">⚠️ Medication-Allergy Conflicts</h3>
              <p className="text-sm text-red-700">The patient has known allergies that may conflict with current medications. Contact the prescribing physician.</p>
            </div>
          </div>
          <div className="space-y-2">
            {allergyConflicts.map((c, i) => (
              <div key={i} className="bg-white border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${c.severity === "CRITICAL" ? "bg-red-600 text-white" : c.severity === "HIGH" ? "bg-orange-500 text-white" : "bg-amber-400 text-white"}`}>
                    {c.severity}
                  </span>
                  <span className="text-sm font-bold text-red-900">{c.medication}</span>
                  <span className="text-xs text-red-600">conflicts with</span>
                  <span className="text-sm font-bold text-red-900">{c.allergen}</span>
                </div>
                <p className="text-xs text-gray-600">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching Care Protocols */}
      {matchingProtocols.length > 0 && patientId && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900">Care Plans Available</h3>
              <p className="text-sm text-blue-700">Based on this patient&apos;s conditions, the following evidence-based care plans can auto-generate tasks:</p>
            </div>
          </div>
          <div className="space-y-2">
            {matchingProtocols.map((protocol) => {
              const isApplied = appliedProtocols.has(protocol.id);
              const isApplying = applyingProtocol === protocol.id;
              return (
                <div key={protocol.id} className="bg-white border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900">{protocol.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{protocol.description.slice(0, 100)}{protocol.description.length > 100 ? "…" : ""}</p>
                    <p className="text-xs text-blue-600 mt-1">{protocol.tasks.length} tasks included</p>
                  </div>
                  <button
                    onClick={() => handleApplyProtocol(protocol.id, protocol.name)}
                    disabled={isApplied || !!applyingProtocol}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isApplied
                        ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    }`}
                  >
                    {isApplied ? (
                      <><CheckCircle className="w-3.5 h-3.5" /> Applied</>
                    ) : isApplying ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
                    ) : (
                      <>Apply Care Plan</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Allergies */}
      {al && al.items && al.items.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-800">Allergies</h3>
          </div>
          <div className="space-y-2">
            {al.items.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-red-900">{a.substance}</p>
                  <p className="text-xs text-red-600">{a.reaction}</p>
                </div>
                {a.severity && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${SEVERITY_STYLES[a.severity] || "bg-gray-100 text-gray-600"}`}>
                    {a.severity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Conditions */}
      {co && co.items && co.items.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Medical Conditions</h3>
          </div>
          <div className="space-y-2">
            {co.items.map((c, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-[#f0f5fd] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  {c.notes && <p className="text-xs text-gray-500 mt-0.5">{c.notes}</p>}
                </div>
                {c.status && (
                  <span className={`flex-shrink-0 ml-3 text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_STYLES[c.status] || "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescription Medications */}
      {hasMeds && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Current Medications</h3>
          </div>
          <div className="space-y-2">
            {medications!.map((med) => (
              <div key={med.id} className="flex items-start justify-between py-2 border-b border-[#f0f5fd] last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.dosage} · {med.frequency}</p>
                  {med.prescriber && <p className="text-xs text-gray-400">{med.prescriber}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discharge Summary */}
      {di && (
        <div className="bg-[#1e3a5f] rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              {di.hospital && (
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-200 mb-1">{di.hospital}</p>
              )}
              <h3 className="text-lg font-bold">{di.diagnosis}</h3>
              {di.mrn && <p className="text-sm text-blue-200 mt-1">MRN: {di.mrn}</p>}
            </div>
            <FileText className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
            {di.admissionDate && (
              <div>
                <p className="text-xs text-blue-300">Admitted</p>
                <p className="text-sm font-semibold">{di.admissionDate}</p>
              </div>
            )}
            {di.dischargeDate && (
              <div>
                <p className="text-xs text-blue-300">Discharged</p>
                <p className="text-sm font-semibold">{di.dischargeDate}</p>
              </div>
            )}
            {di.attendingPhysician && (
              <div>
                <p className="text-xs text-blue-300">Attending Physician</p>
                <p className="text-sm font-semibold">{di.attendingPhysician}</p>
              </div>
            )}
            {di.followUpPhysician && (
              <div>
                <p className="text-xs text-blue-300">Follow-Up Physician</p>
                <p className="text-sm font-semibold">{di.followUpPhysician}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Signs */}
      {ws && (
        <div className="space-y-3">
          {ws.emergency?.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">
                  Call 911 Immediately — Do not drive
                </h3>
              </div>
              <ul className="space-y-2">
                {ws.emergency.map((sign, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ws.callDoctor?.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wide">
                  Call Doctor — Same Day
                </h3>
              </div>
              <ul className="space-y-2">
                {ws.callDoctor.map((sign, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Health History */}
      {hh && hh.items && hh.items.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Health History</h3>
          </div>
          <div className="space-y-3">
            {hh.items.map((h, i) => (
              <div key={i} className="flex gap-3 items-start border-b border-[#f0f5fd] pb-3 last:border-0 last:pb-0">
                {h.date && (
                  <span className="flex-shrink-0 px-2.5 py-1 bg-[#dbe8f8] rounded-lg text-[#2f5f9f] text-xs font-bold whitespace-nowrap">
                    {h.date}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{h.event}</p>
                  {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Illness History */}
      {ih && ih.items && ih.items.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Illness History</h3>
          </div>
          <div className="space-y-3">
            {ih.items.map((h, i) => (
              <div key={i} className="flex gap-3 items-start border-b border-[#f0f5fd] pb-3 last:border-0 last:pb-0">
                {h.date && (
                  <span className="flex-shrink-0 px-2.5 py-1 bg-[#dbe8f8] rounded-lg text-[#2f5f9f] text-xs font-bold whitespace-nowrap">
                    {h.date}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{h.illness}</p>
                  {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise & Activity Guidelines */}
      {eg && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Exercise & Activity Guidelines</h3>
          </div>
          {eg.phases?.length > 0 && (
            <div className="space-y-3 mb-4">
              {eg.phases.map((phase, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 px-2.5 py-1 bg-[#dbe8f8] rounded-lg text-[#2f5f9f] text-xs font-bold whitespace-nowrap">
                    {phase.period}
                  </div>
                  <p className="text-sm text-gray-700 pt-1">{phase.instructions}</p>
                </div>
              ))}
            </div>
          )}
          {eg.restrictions?.length > 0 && (
            <div className="border-t border-[#e8eef8] pt-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Restrictions</p>
              <ul className="space-y-1.5">
                {eg.restrictions.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 font-bold flex-shrink-0 mt-0.5 text-xs leading-5">✕</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Diet & Fluid Restrictions */}
      {dr && dr.items && dr.items.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Diet & Fluid Restrictions</h3>
          </div>
          <div className="space-y-3">
            {dr.items.map((item, i) => (
              <div key={i} className="flex gap-4 border-b border-[#f0f5fd] pb-3 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-36">
                  <span className="text-xs font-bold text-[#2f5f9f]">{item.category}</span>
                </div>
                <p className="text-sm text-gray-700">{item.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-Up Appointments */}
      {fa && fa.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Follow-Up Appointments</h3>
          </div>
          <div className="space-y-3">
            {fa.map((appt, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${PRIORITY_STYLES[appt.priority] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                  {appt.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{appt.type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {appt.timeframe}{appt.physician && ` — ${appt.physician}`}
                  </p>
                  {appt.reason && <p className="text-xs text-gray-600 mt-1">{appt.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Contacts */}
      {cc && cc.length > 0 && (
        <div className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-[#2f5f9f]" />
            <h3 className="font-bold text-gray-900">Important Contacts</h3>
          </div>
          <div className="grid gap-3">
            {cc.map((contact, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#f8fafd] rounded-xl border border-[#e8eef8]">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                  {contact.hours && <p className="text-xs text-gray-500">{contact.hours}</p>}
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2f5f9f] text-white text-sm font-semibold rounded-xl hover:bg-[#224978] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
