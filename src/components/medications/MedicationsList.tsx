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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="text-center py-16">
        <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-800 font-semibold">No medications yet</p>
        <p className="text-base text-gray-600 mt-2">
          Scan a prescription document to extract medications automatically.
        </p>
      </div>
    );
  }

  const activeMeds = medications.filter((m) => m.isActive);
  const inactiveMeds = medications.filter((m) => !m.isActive);

  return (
    <div className="space-y-5">
      {activeMeds.length > 0 && (
        <div className="space-y-4">
          {activeMeds.map((med) => (
            <MedicationCard key={med.id} medication={med} onToggle={toggleActive} />
          ))}
        </div>
      )}

      {inactiveMeds.length > 0 && (
        <div>
          <p className="text-base font-semibold text-gray-700 mb-3 mt-8">
            Inactive ({inactiveMeds.length})
          </p>
          <div className="space-y-4">
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
      className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${
        medication.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            medication.isActive ? "bg-blue-50" : "bg-gray-100"
          }`}
        >
          <Pill className={`w-6 h-6 ${medication.isActive ? "text-blue-500" : "text-gray-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-lg font-bold text-gray-900">{medication.name}</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                medication.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {medication.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="text-base text-gray-800 mb-2">
            <span className="font-semibold">{medication.dosage}</span> &middot;{" "}
            {medication.frequency}
          </p>

          {medication.instructions && (
            <p className="text-base text-gray-700 mb-3">{medication.instructions}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
            {medication.prescriber && (
              <span className="flex items-center gap-1.5">
                <User className="w-5 h-5" />
                Dr. {medication.prescriber}
              </span>
            )}
            {medication.pharmacy && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-5 h-5" />
                {medication.pharmacy}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-5 h-5" />
              Since {format(new Date(medication.startDate), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <button
          onClick={() => onToggle(medication)}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-colors font-medium text-sm ${
            medication.isActive
              ? "text-red-600 hover:text-red-700 hover:bg-red-50"
              : "text-green-600 hover:text-green-700 hover:bg-green-50"
          }`}
        >
          {medication.isActive ? (
            <>
              <XCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Restart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
