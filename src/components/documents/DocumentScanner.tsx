"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { processDocumentClient } from "@/lib/ocr-client";

interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

interface ScanResult {
  document: {
    id: string;
    fileName: string;
  };
  medications: ExtractedMedication[];
  ocrConfidence: number;
  rawText?: string;
}

interface DocumentScannerProps {
  patientId: string;
  onScanComplete?: (result: ScanResult) => void;
}

export function DocumentScanner({ patientId, onScanComplete }: DocumentScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ status: string; percent: number } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setError(null);
      setResult(null);
      setProgress({ status: "Starting OCR...", percent: 0 });

      try {
        // Step 1: Run OCR on the client side
        const ocrResult = await processDocumentClient(file, (status, prog) => {
          setProgress({ status, percent: Math.round(prog * 100) });
        });

        setProgress({ status: "Saving to database...", percent: 100 });

        // Step 2: Send results to API to save
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            fileName: file.name,
            fileType: file.type,
            documentType: "DISCHARGE_SUMMARY",
            rawText: ocrResult.rawText,
            confidence: ocrResult.confidence,
            medications: ocrResult.medications,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save document");
        }

        const data = await response.json();
        setResult({
          document: data.document,
          medications: ocrResult.medications,
          ocrConfidence: ocrResult.confidence,
          rawText: ocrResult.rawText,
        });
        onScanComplete?.({
          document: data.document,
          medications: ocrResult.medications,
          ocrConfidence: ocrResult.confidence,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [patientId, onScanComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp"],
      "application/pdf": [".pdf"],
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
              {progress && (
                <>
                  <p className="text-sm text-blue-600">{progress.status}</p>
                  <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{progress.percent}%</p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-2">First scan downloads OCR data (~15MB)</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-600">
                {isDragActive
                  ? "Drop the document here"
                  : "Drag & drop discharge papers or prescription"}
              </p>
              <p className="text-sm text-gray-400">Supports images (PNG, JPG)</p>
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
              <p className="font-medium text-green-800">Document Processed Successfully</p>
              <p className="text-sm text-green-600">
                Confidence: {Math.round(result.ocrConfidence)}%
              </p>
            </div>
          </div>

          {result.medications.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-gray-700 mb-2">
                Extracted Medications ({result.medications.length}):
              </p>
              <div className="space-y-2">
                {result.medications.map((med, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-md p-3 border border-green-100 flex items-start gap-3"
                  >
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-gray-800">{med.name}</p>
                      <p className="text-sm text-gray-600">
                        {med.dosage} • {med.frequency}
                      </p>
                      {med.instructions && (
                        <p className="text-sm text-gray-500 mt-1">{med.instructions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.medications.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              No medications were automatically detected. You may need to add them manually.
            </p>
          )}

          {result.rawText && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                Show extracted text (for debugging)
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
