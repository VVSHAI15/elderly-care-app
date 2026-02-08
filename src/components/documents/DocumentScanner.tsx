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
} from "lucide-react";

interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  quantity?: string;
  refills?: string;
}

interface ScanResult {
  fileName: string;
  fileType: string;
  medications: ExtractedMedication[];
  pharmacy?: string;
  prescriber?: string;
  summary?: string;
  rawText?: string;
}

interface ConfirmedResult {
  document: {
    id: string;
    fileName: string;
  };
  medications: ExtractedMedication[];
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

  // Editable state for the review phase
  const [editMedications, setEditMedications] = useState<ExtractedMedication[]>([]);
  const [editPharmacy, setEditPharmacy] = useState("");
  const [editPrescriber, setEditPrescriber] = useState("");
  const [documentType, setDocumentType] = useState("PRESCRIPTION");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setError(null);
      setScanResult(null);
      setConfirmed(false);
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
        setEditMedications(data.medications.map((m) => ({ ...m })));
        setEditPharmacy(data.pharmacy || "");
        setEditPrescriber(data.prescriber || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsProcessing(false);
        setUploadStage(0);
      }
    },
    [patientId]
  );

  const handleConfirm = async () => {
    if (!scanResult) return;

    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch("/api/confirm-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          fileName: scanResult.fileName,
          fileType: scanResult.fileType,
          medications: editMedications,
          pharmacy: editPharmacy,
          prescriber: editPrescriber,
          summary: scanResult.summary,
          rawText: scanResult.rawText,
          uploadedById: session?.user?.id || null,
          documentType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save document");
      }

      const data = await response.json();
      setConfirmed(true);
      onScanComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm document");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRescan = () => {
    setScanResult(null);
    setEditMedications([]);
    setEditPharmacy("");
    setEditPrescriber("");
    setError(null);
    setConfirmed(false);
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

      {/* Confirmed success */}
      {confirmed && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <p className="font-bold text-green-800 text-xl">Document Saved Successfully</p>
          <p className="text-base text-green-700">
            Medications and tasks have been created. Check your Tasks tab.
          </p>
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
