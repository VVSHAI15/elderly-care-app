"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Building2,
  User,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  BookOpen,
} from "lucide-react";

interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  quantity?: string;
  refills?: string;
}

interface ExistingMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

interface MedConflict {
  extractedIndex: number;
  existing: ExistingMedication;
  choice: "add" | "skip" | "double";
}

/** Doubles the first numeric value found in a dosage string. e.g. "200 mg" → "400 mg" */
function doubleDosage(dosage: string): string {
  return dosage.replace(/\b(\d+(?:\.\d+)?)\b/, (_, num) => {
    const doubled = parseFloat(num) * 2;
    return doubled % 1 === 0 ? String(doubled) : doubled.toFixed(1);
  });
}

/**
 * Normalise a medication name for fuzzy matching:
 * - lowercase
 * - strip embedded dosage amounts (200mg, 10 mcg, etc.)
 * - strip punctuation
 * - collapse whitespace
 * This lets "Carvedilol 12.5mg" match "carvedilol" and
 * "Furosemide (Lasix)" match "furosemide".
 */
function normalizeMedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|iu|units?)\b/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true when two medication names refer to the same drug.
 * Handles: exact match, one name contained in the other after normalisation.
 */
function medicationNamesMatch(a: string, b: string): boolean {
  const na = normalizeMedName(a);
  const nb = normalizeMedName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

interface CareProfileExtract {
  dischargeInfo?: { hospital?: string; diagnosis?: string; mrn?: string; admissionDate?: string; dischargeDate?: string; attendingPhysician?: string; followUpPhysician?: string };
  warningSigns?: { emergency?: string[]; callDoctor?: string[] };
  exerciseGuidelines?: { phases?: { period: string; instructions: string }[]; restrictions?: string[] };
  dietRestrictions?: { items?: { category: string; instruction: string }[] };
  followUpAppointments?: { priority: string; type: string; timeframe: string; physician: string; reason: string }[];
  careContacts?: { name: string; phone: string; hours: string }[];
  allergies?: { items?: { substance: string; reaction: string; severity?: string }[] } | { substance: string; reaction: string; severity?: string }[];
  conditions?: { items?: { name: string; status?: string; notes?: string }[] } | { name: string; status?: string; notes?: string }[];
  healthHistory?: { items?: { event: string; date?: string; notes?: string }[] } | { event: string; date?: string; notes?: string }[];
  illnessHistory?: { items?: { illness: string; date?: string; notes?: string }[] } | { illness: string; date?: string; notes?: string }[];
}

interface ScanResult {
  fileName: string;
  fileType: string;
  medications: ExtractedMedication[];
  pharmacy?: string;
  prescriber?: string;
  summary?: string;
  rawText?: string;
  medicalTerms?: { term: string; explanation: string }[];
  careProfile?: CareProfileExtract | null;
}

interface ConfirmedResult {
  document: {
    id: string;
    fileName: string;
  };
  medications: ExtractedMedication[];
  careProfileSaved?: boolean;
  careProfileFields?: number;
  careProfileError?: string;
}

interface DocumentScannerProps {
  patientId: string;
  onScanComplete?: (result: ConfirmedResult) => void;
}

type UploadStage = 0 | 1 | 2 | 3;

const UPLOAD_STAGES = [
  { label: "Uploading", description: "Sending document to server" },
  { label: "AI Analyzing", description: "GPT-4 Vision is reading the document" },
  { label: "Preparing Summary", description: "Formatting results for review" },
];

function ProgressBar({ stage }: { stage: UploadStage }) {
  if (stage === 0) return null;

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(stage / 3) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {UPLOAD_STAGES.map((s, index) => {
          const stepNum = index + 1;
          const isCompleted = stage > stepNum;
          const isActive = stage === stepNum;

          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-sm text-center ${
                  isActive ? "text-blue-700 font-semibold" : "text-gray-700"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DocumentScanner({ patientId, onScanComplete }: DocumentScannerProps) {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedInfo, setConfirmedInfo] = useState<{ careProfileSaved: boolean; careProfileFields: number; careProfileError?: string } | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState<string | null>(null);

  // Editable state for the review phase
  const [editMedications, setEditMedications] = useState<ExtractedMedication[]>([]);
  const [editPharmacy, setEditPharmacy] = useState("");
  const [editPrescriber, setEditPrescriber] = useState("");
  const [documentType, setDocumentType] = useState("PRESCRIPTION");
  const [medConflicts, setMedConflicts] = useState<MedConflict[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setError(null);
      setScanResult(null);
      setConfirmed(false);
      setMedConflicts([]);
      setUploadStage(1);

      try {
        setUploadStage(1); // Uploading

        const formData = new FormData();
        formData.append("file", file);
        formData.append("patientId", patientId);

        setUploadStage(2); // AI Analyzing

        const response = await fetch("/api/scan-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process document");
        }

        setUploadStage(3); // Preparing Summary

        const data: ScanResult = await response.json();
        setScanResult(data);

        // Pre-fill editable state
        const extractedMeds = data.medications.map((m) => ({ ...m }));
        setEditMedications(extractedMeds);
        setEditPharmacy(data.pharmacy || "");
        setEditPrescriber(data.prescriber || "");

        // Check for duplicate medications against active meds already on file
        if (extractedMeds.length > 0) {
          try {
            const medsRes = await fetch(`/api/medications?patientId=${patientId}`);
            if (medsRes.ok) {
              const existing: (ExistingMedication & { isActive?: boolean })[] = await medsRes.json();
              // Only compare against active medications
              const activeMeds = existing.filter((e) => e.isActive !== false);
              const conflicts: MedConflict[] = [];
              extractedMeds.forEach((med, idx) => {
                const match = activeMeds.find((e) => medicationNamesMatch(e.name, med.name));
                if (match) {
                  conflicts.push({ extractedIndex: idx, existing: match, choice: "add" });
                }
              });
              setMedConflicts(conflicts);
            }
          } catch { /* ignore — medication conflict check is non-fatal */ }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsProcessing(false);
        setUploadStage(0);
      }
    },
    [patientId]
  );

  const setConflictChoice = (extractedIndex: number, choice: MedConflict["choice"]) => {
    const prevChoice = medConflicts.find((c) => c.extractedIndex === extractedIndex)?.choice;
    setMedConflicts((prev) =>
      prev.map((c) => (c.extractedIndex === extractedIndex ? { ...c, choice } : c))
    );
    if (choice === "double" && prevChoice !== "double") {
      // Apply doubled dosage
      setEditMedications((prev) =>
        prev.map((med, i) =>
          i === extractedIndex ? { ...med, dosage: doubleDosage(med.dosage) } : med
        )
      );
    } else if (choice !== "double" && prevChoice === "double" && scanResult) {
      // Restore original dosage from scan result
      const original = scanResult.medications[extractedIndex];
      if (original) {
        setEditMedications((prev) =>
          prev.map((med, i) =>
            i === extractedIndex ? { ...med, dosage: original.dosage } : med
          )
        );
      }
    }
  };

  const doConfirm = async (force = false) => {
    if (!scanResult) return;

    setIsConfirming(true);
    setError(null);
    setIsDuplicate(false);

    // Apply conflict choices — remove medications the user chose to skip
    const skipIndices = new Set(
      medConflicts.filter((c) => c.choice === "skip").map((c) => c.extractedIndex)
    );
    const medsToSave = editMedications.filter((_, i) => !skipIndices.has(i));

    try {
      const response = await fetch("/api/confirm-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          fileName: scanResult.fileName,
          fileType: scanResult.fileType,
          medications: medsToSave,
          pharmacy: editPharmacy,
          prescriber: editPrescriber,
          summary: scanResult.summary,
          rawText: scanResult.rawText,
          uploadedById: session?.user?.id || null,
          documentType,
          medicalTerms: scanResult.medicalTerms || [],
          careProfile: scanResult.careProfile || null,
          force,   // server skips duplicate check when true
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.duplicate) {
        setIsDuplicate(true);
        setDuplicateDate(data.existingDocumentDate ? new Date(data.existingDocumentDate).toLocaleDateString() : null);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to save document");
      }

      setConfirmedInfo({
        careProfileSaved: !!data.careProfileSaved,
        careProfileFields: data.careProfileFields ?? 0,
        careProfileError: data.careProfileError,
      });
      setConfirmed(true);
      onScanComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm document");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirm = () => doConfirm(false);

  const handleRescan = () => {
    setScanResult(null);
    setEditMedications([]);
    setEditPharmacy("");
    setEditPrescriber("");
    setError(null);
    setConfirmed(false);
    setConfirmedInfo(null);
    setIsDuplicate(false);
    setDuplicateDate(null);
    setMedConflicts([]);
  };

  const updateMedication = (index: number, field: keyof ExtractedMedication, value: string) => {
    setEditMedications((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    );
  };

  const removeMedication = (index: number) => {
    setEditMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="space-y-5">
      {/* Dropzone — only show when no scan result yet */}
      {!scanResult && !confirmed && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {isProcessing ? (
              <>
                <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
                <p className="text-lg text-gray-800 font-semibold">Processing document...</p>
                <p className="text-base text-blue-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  AI is analyzing your document
                </p>
              </>
            ) : (
              <>
                <Upload className="w-14 h-14 text-gray-400" />
                <p className="text-lg text-gray-800 font-medium">
                  {isDragActive
                    ? "Drop the document here"
                    : "Drag & drop prescription, discharge papers, or PDFs"}
                </p>
                <p className="text-base text-gray-600">
                  Or tap here to choose a file
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Powered by GPT-4 Vision
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress bar during upload */}
      {isProcessing && <ProgressBar stage={uploadStage} />}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-base">Processing Error</p>
            <p className="text-base text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {isDuplicate && scanResult && !confirmed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-base">Document Already Uploaded</p>
              <p className="text-base text-amber-700">
                &quot;{scanResult.fileName}&quot; was already saved{duplicateDate ? ` on ${duplicateDate}` : ""}. Saving again will create a duplicate.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => doConfirm(true)}
              disabled={isConfirming}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold text-sm disabled:opacity-50"
            >
              Save Anyway
            </button>
            <button
              onClick={handleRescan}
              disabled={isConfirming}
              className="flex-1 px-4 py-2.5 bg-white border-2 border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors font-semibold text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmed success */}
      {confirmed && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <p className="font-bold text-green-800 text-xl">Document Saved Successfully</p>
          {confirmedInfo?.careProfileSaved ? (
            <p className="text-base text-green-700">
              Saved {confirmedInfo.careProfileFields} care profile section{confirmedInfo.careProfileFields !== 1 ? "s" : ""} — check the Care Profile tab to review.
            </p>
          ) : confirmedInfo?.careProfileError ? (
            <p className="text-base text-amber-700">
              Document saved, but care profile could not be updated: {confirmedInfo.careProfileError}
            </p>
          ) : (
            <p className="text-base text-green-700">
              Medications and tasks saved. No care profile data was detected in this document.
            </p>
          )}
          <button
            onClick={handleRescan}
            className="mt-2 px-5 py-3 bg-white border-2 border-green-300 text-green-700 rounded-xl hover:bg-green-50 transition-colors text-base font-semibold flex items-center gap-2 mx-auto"
          >
            <Upload className="w-5 h-5" />
            Scan Another Document
          </button>
        </div>
      )}

      {/* Discharge Summary & Review Phase */}
      {scanResult && !confirmed && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-6">
          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h3 className="font-bold text-gray-900 text-xl">Discharge Summary</h3>
            </div>
            {scanResult.summary && (
              <p className="text-gray-800 bg-white rounded-xl p-4 border border-blue-100 text-base leading-relaxed">
                {scanResult.summary}
              </p>
            )}
            <p className="text-sm text-blue-700 mt-3 font-medium">
              Please review the information below. You can edit any field before confirming.
            </p>
          </div>

          {/* Medical Terms Explained */}
          {scanResult.medicalTerms && scanResult.medicalTerms.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-gray-900 text-base">
                  Medical Terms Explained ({scanResult.medicalTerms.length})
                </h4>
              </div>
              <div className="bg-teal-50 rounded-xl border-2 border-teal-200 divide-y divide-teal-100">
                {scanResult.medicalTerms.map((item, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <span className="font-bold text-teal-900 text-base">
                      {item.term}
                    </span>
                    <span className="text-gray-800 text-base">
                      {" "}&mdash; {item.explanation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Care Profile Preview */}
          {scanResult.careProfile && Object.keys(scanResult.careProfile).length > 0 && (() => {
            const cp = scanResult.careProfile!;
            const getItems = (val: unknown): unknown[] | null => {
              if (!val) return null;
              if (Array.isArray(val)) return val.length > 0 ? val : null;
              const v = val as { items?: unknown[] };
              return Array.isArray(v.items) && v.items.length > 0 ? v.items : null;
            };
            const allergyItems = getItems(cp.allergies);
            const conditionItems = getItems(cp.conditions);
            const healthItems = getItems(cp.healthHistory);
            const illnessItems = getItems(cp.illnessHistory);
            const warnCount = (cp.warningSigns?.emergency?.length || 0) + (cp.warningSigns?.callDoctor?.length || 0);
            const hasBadges = cp.dischargeInfo?.diagnosis || warnCount > 0 ||
              cp.exerciseGuidelines?.phases?.length || cp.dietRestrictions?.items?.length ||
              cp.followUpAppointments?.length || cp.careContacts?.length ||
              allergyItems || conditionItems || healthItems || illnessItems;
            if (!hasBadges) return null;
            return (
              <div className="bg-[#f0f7ff] border-2 border-[#2f5f9f]/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2f5f9f]" />
                  <p className="font-bold text-[#1e3a5f] text-base">Care Profile Data Detected</p>
                </div>
                <p className="text-sm text-gray-600">The following will be saved to the patient&apos;s care profile when you confirm:</p>
                <div className="flex flex-wrap gap-2">
                  {cp.dischargeInfo?.diagnosis && (
                    <span className="px-2.5 py-1 bg-[#1e3a5f] text-white text-xs font-semibold rounded-lg">
                      Diagnosis: {cp.dischargeInfo.diagnosis}
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg">
                      {warnCount} Warning Sign{warnCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {allergyItems && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg">
                      {allergyItems.length} Allerg{allergyItems.length !== 1 ? "ies" : "y"}
                    </span>
                  )}
                  {conditionItems && (
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold rounded-lg">
                      {conditionItems.length} Condition{conditionItems.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {healthItems && (
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold rounded-lg">
                      {healthItems.length} Health History Item{healthItems.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {illnessItems && (
                    <span className="px-2.5 py-1 bg-pink-100 text-pink-700 border border-pink-200 text-xs font-semibold rounded-lg">
                      {illnessItems.length} Illness History Item{illnessItems.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cp.exerciseGuidelines?.phases?.length && (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 text-xs font-semibold rounded-lg">
                      {cp.exerciseGuidelines.phases.length} Exercise Phase{cp.exerciseGuidelines.phases.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cp.dietRestrictions?.items?.length && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-lg">
                      {cp.dietRestrictions.items.length} Diet Restriction{cp.dietRestrictions.items.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cp.followUpAppointments?.length && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg">
                      {cp.followUpAppointments.length} Follow-up Appointment{cp.followUpAppointments.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cp.careContacts?.length && (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg">
                      {cp.careContacts.length} Care Contact{cp.careContacts.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Editable Pharmacy and Prescriber */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-base font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                <Building2 className="w-5 h-5" /> Pharmacy
              </label>
              <input
                type="text"
                value={editPharmacy}
                onChange={(e) => setEditPharmacy(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Pharmacy name"
              />
            </div>
            <div>
              <label className="text-base font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                <User className="w-5 h-5" /> Prescriber
              </label>
              <input
                type="text"
                value={editPrescriber}
                onChange={(e) => setEditPrescriber(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Doctor name"
              />
            </div>
          </div>

          {/* Medication Conflict Resolution */}
          {medConflicts.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-base">
                    {medConflicts.length} medication{medConflicts.length > 1 ? "s" : ""} already on file
                  </p>
                  <p className="text-sm text-amber-700">Choose how to handle each one:</p>
                </div>
              </div>
              <div className="space-y-3">
                {medConflicts.map((conflict) => {
                  const extracted = editMedications[conflict.extractedIndex];
                  if (!extracted) return null;
                  const doubledDosage = doubleDosage(extracted.dosage);
                  const canDouble = doubledDosage !== extracted.dosage;
                  return (
                    <div key={conflict.extractedIndex} className="bg-white rounded-xl border border-amber-200 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Existing</p>
                          <p className="font-semibold text-gray-800">{conflict.existing.name}</p>
                          <p className="text-gray-600">{conflict.existing.dosage} · {conflict.existing.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">From Document</p>
                          <p className="font-semibold text-gray-800">{extracted.name}</p>
                          <p className="text-gray-600">{extracted.dosage} · {extracted.frequency}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setConflictChoice(conflict.extractedIndex, "skip")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                            conflict.choice === "skip"
                              ? "bg-gray-800 text-white border-gray-800"
                              : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          Skip (keep existing)
                        </button>
                        <button
                          onClick={() => setConflictChoice(conflict.extractedIndex, "add")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                            conflict.choice === "add"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-700 border-blue-300 hover:border-blue-400"
                          }`}
                        >
                          Add as new
                        </button>
                        {canDouble && (
                          <button
                            onClick={() => setConflictChoice(conflict.extractedIndex, "double")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                              conflict.choice === "double"
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white text-green-700 border-green-300 hover:border-green-400"
                            }`}
                          >
                            Double to {doubledDosage}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editable Medications */}
          {editMedications.length > 0 && (
            <div>
              <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-base">
                <Pencil className="w-5 h-5 text-blue-500" />
                Extracted Medications ({editMedications.length}):
              </p>
              <div className="space-y-4">
                {editMedications.map((med, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-5 border-2 border-blue-100 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-gray-800 font-semibold">
                          Medication {index + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => removeMedication(index)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-5 h-5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1 block">Name</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1 block">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1 block">Frequency</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-800 mb-1 block">Instructions</label>
                        <input
                          type="text"
                          value={med.instructions || ""}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editMedications.length === 0 && (
            <p className="text-base text-amber-700 font-medium">
              No medications were detected. The image may be unclear or not contain prescription information.
            </p>
          )}

          {/* Raw text toggle */}
          {scanResult.rawText && (
            <details>
              <summary className="text-base text-gray-800 cursor-pointer hover:text-gray-900 font-medium">
                Show what AI read from the document
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-xl text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {scanResult.rawText}
              </pre>
            </details>
          )}

          {/* Document type selection */}
          <div>
            <label className="text-base font-semibold text-gray-800 mb-2 block">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="PRESCRIPTION">Prescription</option>
              <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
              <option value="LAB_RESULTS">Lab Results</option>
              <option value="INSURANCE">Insurance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isConfirming ? "Saving..." : "Confirm & Save"}
            </button>
            <button
              onClick={handleRescan}
              disabled={isConfirming}
              className="flex items-center gap-2 px-5 py-3.5 bg-white border-2 border-gray-300 text-gray-800 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-base disabled:opacity-50"
            >
              <RotateCcw className="w-5 h-5" />
              Re-scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
