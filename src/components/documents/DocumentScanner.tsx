"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Sparkles, Building2, User } from "lucide-react";

interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  quantity?: string;
  refills?: string;
}

interface ScanResult {
  document: {
    id: string;
    fileName: string;
  };
  medications: ExtractedMedication[];
  pharmacy?: string;
  prescriber?: string;
  rawText?: string;
}

interface DocumentScannerProps {
  patientId: string;
  onScanComplete?: (result: ScanResult) => void;
}

export function DocumentScanner({ patientId, onScanComplete }: DocumentScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setError(null);
      setResult(null);
      setStatus("Uploading image...");

      try {
        setStatus("AI analyzing prescription...");

        // Send image directly to GPT-4 Vision API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("patientId", patientId);

        const response = await fetch("/api/scan-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process document");
        }

        const data = await response.json();
        setResult(data);
        onScanComplete?.(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsProcessing(false);
        setStatus("");
      }
    },
    [patientId, onScanComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-600 font-medium">Processing document...</p>
              <p className="text-sm text-blue-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {status}
              </p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-600">
                {isDragActive
                  ? "Drop the document here"
                  : "Drag & drop prescription or discharge papers"}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                Powered by GPT-4 Vision
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Processing Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Document Analyzed Successfully</p>
            </div>
          </div>

          {/* Pharmacy and Prescriber info */}
          {(result.pharmacy || result.prescriber) && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {result.pharmacy && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {result.pharmacy}
                </span>
              )}
              {result.prescriber && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Dr. {result.prescriber}
                </span>
              )}
            </div>
          )}

          {result.medications && result.medications.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Extracted Medications ({result.medications.length}):
              </p>
              <div className="space-y-2">
                {result.medications.map((med, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-md p-3 border border-green-100 flex items-start gap-3"
                  >
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{med.name}</p>
                      <p className="text-sm text-gray-600">
                        {med.dosage} • {med.frequency}
                      </p>
                      {med.instructions && (
                        <p className="text-sm text-gray-500 mt-1">{med.instructions}</p>
                      )}
                      {(med.quantity || med.refills) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {med.quantity && `Qty: ${med.quantity}`}
                          {med.quantity && med.refills && " • "}
                          {med.refills && `Refills: ${med.refills}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-3">
                Tasks have been created for each medication.
              </p>
            </div>
          )}

          {(!result.medications || result.medications.length === 0) && (
            <p className="text-sm text-amber-600 mt-2">
              No medications were detected. The image may be unclear or not contain prescription information.
            </p>
          )}

          {result.rawText && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Show what AI read from the document
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {result.rawText}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
