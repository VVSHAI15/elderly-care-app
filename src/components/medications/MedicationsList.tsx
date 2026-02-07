"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Pill,
  Loader2,
  Inbox,
  Building2,
  User,
  Calendar,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  startDate: string;
  endDate: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  refillDate: string | null;
  isActive: boolean;
  document: {
    id: string;
    fileName: string;
    documentType: string;
    uploadedAt: string;
  } | null;
}

interface MedicationsListProps {
  patientId: string;
}

export function MedicationsList({ patientId }: MedicationsListProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMedications() {
      try {
        const response = await fetch(`/api/medications?patientId=${patientId}`);
        if (response.ok) {
          const data = await response.json();
          setMedications(data);
        }
      } catch (error) {
        console.error("Failed to fetch medications:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMedications();
  }, [patientId]);

  const toggleActive = async (med: Medication) => {
    try {
      const response = await fetch("/api/medications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: med.id, isActive: !med.isActive }),
      });

      if (response.ok) {
        setMedications((prev) =>
          prev.map((m) =>
            m.id === med.id ? { ...m, isActive: !m.isActive } : m
          )
        );
      }
    } catch (error) {
      console.error("Failed to update medication:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">No medications yet</p>
        <p className="text-sm text-gray-600 mt-1">
          Scan a prescription document to extract medications automatically.
        </p>
      </div>
    );
  }

  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);

  return (
    <div className="space-y-4">
      {activeMeds.length > 0 && (
        <div className="space-y-3">
          {activeMeds.map((med) => (
            <MedicationCard key={med.id} medication={med} onToggle={toggleActive} />
          ))}
        </div>
      )}

      {inactiveMeds.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2 mt-6">
            Inactive ({inactiveMeds.length})
          </p>
          <div className="space-y-3">
            {inactiveMeds.map((med) => (
              <MedicationCard key={med.id} medication={med} onToggle={toggleActive} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MedicationCard({
  medication,
  onToggle,
}: {
  medication: Medication;
  onToggle: (med: Medication) => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all hover:shadow-md ${
        medication.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            medication.isActive ? "bg-blue-50" : "bg-gray-100"
          }`}
        >
          <Pill className={`w-5 h-5 ${medication.isActive ? "text-blue-500" : "text-gray-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-800">{medication.name}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                medication.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {medication.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">
            <span className="font-medium">{medication.dosage}</span> &middot;{" "}
            {medication.frequency}
          </p>

          {medication.instructions && (
            <p className="text-sm text-gray-600 mb-2">{medication.instructions}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            {medication.prescriber && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Dr. {medication.prescriber}
              </span>
            )}
            {medication.pharmacy && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {medication.pharmacy}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Since {format(new Date(medication.startDate), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <button
          onClick={() => onToggle(medication)}
          className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
            medication.isActive
              ? "text-red-400 hover:text-red-600 hover:bg-red-50"
              : "text-green-500 hover:text-green-700 hover:bg-green-50"
          }`}
          title={medication.isActive ? "Mark as inactive" : "Reactivate"}
        >
          {medication.isActive ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
