"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { checkMedicationAgainstAllergies, type AllergyConflict } from "@/lib/drug-allergy-check";

interface Connection {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface PatientAllergy {
  substance: string;
  reaction?: string;
  severity?: string;
}

interface TaskData {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  status: string;
  category: string;
  priority: string;
  isRecurring?: boolean;
  recurrence?: string;
  assignedToId?: string;
}

interface EditTaskModalProps {
  task: TaskData;
  patientId: string;
  connections: Connection[];
  patientAllergies?: PatientAllergy[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

const CATEGORIES = [
  { value: "MEDICATION", label: "Medication" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "EXERCISE", label: "Exercise" },
  { value: "MEAL", label: "Meal" },
  { value: "HYDRATION", label: "Hydration" },
  { value: "PERSONAL_CARE", label: "Personal Care" },
  { value: "SOCIAL", label: "Social" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 border-red-400 text-red-900",
  HIGH:     "bg-orange-100 border-orange-400 text-orange-900",
  CAUTION:  "bg-yellow-100 border-yellow-400 text-yellow-900",
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-200 text-red-800",
  HIGH:     "bg-orange-200 text-orange-800",
  CAUTION:  "bg-yellow-200 text-yellow-800",
};

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function EditTaskModal({
  task,
  patientId,
  connections,
  patientAllergies = [],
  onClose,
  onTaskUpdated,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [dueTime, setDueTime] = useState(task.dueTime || "");
  const [isRecurring, setIsRecurring] = useState(task.isRecurring || false);
  const [recurrence, setRecurrence] = useState(task.recurrence || "daily");
  const [assignedToId, setAssignedToId] = useState(task.assignedToId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyConflict[]>([]);

  void patientId;

  // Run allergy check whenever title or category changes
  useEffect(() => {
    if (category !== "MEDICATION" || !title.trim() || patientAllergies.length === 0) {
      setAllergyWarnings([]);
      return;
    }
    const conflicts = checkMedicationAgainstAllergies(title.trim(), patientAllergies);
    setAllergyWarnings(conflicts);
  }, [title, category, patientAllergies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          priority,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          isRecurring,
          recurrence: isRecurring ? recurrence : null,
          assignedToId: assignedToId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const worstSeverity = allergyWarnings.reduce<string | null>((worst, w) => {
    const order = ["CAUTION", "HIGH", "CRITICAL"];
    if (!worst) return w.severity;
    return order.indexOf(w.severity) > order.indexOf(worst) ? w.severity : worst;
  }, null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Edit Task</h3>
          <button
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Allergy conflict warning ─────────────────────────────── */}
          {allergyWarnings.length > 0 && (
            <div className={`border-2 rounded-xl p-4 ${SEVERITY_STYLES[worstSeverity ?? "CAUTION"]}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold text-base">
                  {worstSeverity === "CRITICAL"
                    ? "CRITICAL: Potential Allergy Conflict"
                    : worstSeverity === "HIGH"
                    ? "WARNING: Possible Allergy Conflict"
                    : "Caution: Possible Allergy Conflict"}
                </span>
              </div>
              <p className="text-sm mb-3">
                This patient has recorded allergies that may conflict with this medication task.
                Verify with the prescribing clinician before saving.
              </p>
              <div className="space-y-1.5">
                {allergyWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className={`font-bold text-xs px-1.5 py-0.5 rounded mr-1.5 ${SEVERITY_BADGE[w.severity]}`}>
                        {w.severity}
                      </span>
                      Allergic to <strong>{w.allergen}</strong> — {w.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-base font-semibold text-gray-800">Recurring task</span>
            </label>
            {isRecurring && (
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>

          {connections.length > 0 && (
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Assign to
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Unassigned</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} ({c.role === "FAMILY_MEMBER" ? "Family" : c.role === "CAREGIVER" ? "Caretaker" : c.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-base text-red-700 font-medium">{error}</p>}

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl transition-colors font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                worstSeverity === "CRITICAL"
                  ? "bg-red-600 hover:bg-red-700"
                  : worstSeverity === "HIGH"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting
                ? "Saving..."
                : allergyWarnings.length > 0
                ? "Save (Allergy Warning)"
                : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
