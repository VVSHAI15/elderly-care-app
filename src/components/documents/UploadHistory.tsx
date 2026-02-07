"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  Clock,
  User,
  Loader2,
  Inbox,
} from "lucide-react";

interface UploadedDocument {
  id: string;
  fileName: string;
  documentType: string;
  summary: string | null;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  medications: {
    id: string;
    name: string;
    dosage: string;
  }[];
}

interface UploadHistoryProps {
  patientId: string;
}

const roleLabels: Record<string, string> = {
  PATIENT: "Patient",
  FAMILY_MEMBER: "Family",
  CAREGIVER: "Caretaker",
  ADMIN: "Admin",
};

const roleBadgeColors: Record<string, string> = {
  PATIENT: "bg-blue-100 text-blue-700",
  FAMILY_MEMBER: "bg-purple-100 text-purple-700",
  CAREGIVER: "bg-green-100 text-green-700",
  ADMIN: "bg-gray-100 text-gray-700",
};

const docTypeLabels: Record<string, string> = {
  PRESCRIPTION: "Prescription",
  DISCHARGE_SUMMARY: "Discharge Summary",
  LAB_RESULTS: "Lab Results",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

const docTypeBadgeColors: Record<string, string> = {
  PRESCRIPTION: "bg-orange-100 text-orange-700",
  DISCHARGE_SUMMARY: "bg-teal-100 text-teal-700",
  LAB_RESULTS: "bg-indigo-100 text-indigo-700",
  INSURANCE: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export function UploadHistory({ patientId }: UploadHistoryProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch(`/api/documents?patientId=${patientId}`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">No documents uploaded yet</p>
        <p className="text-sm text-gray-600 mt-1">
          Scanned documents will appear here after upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-gray-800 truncate">
                  {doc.fileName}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    docTypeBadgeColors[doc.documentType] || docTypeBadgeColors.OTHER
                  }`}
                >
                  {docTypeLabels[doc.documentType] || doc.documentType}
                </span>
              </div>

              {/* Summary */}
              {doc.summary && (
                <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                  {doc.summary}
                </p>
              )}

              {/* Medications count */}
              {doc.medications.length > 0 && (
                <p className="text-xs text-gray-700 mb-2">
                  {doc.medications.length} medication{doc.medications.length !== 1 ? "s" : ""} extracted:{" "}
                  {doc.medications.map((m) => m.name).join(", ")}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                {doc.uploadedBy && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {doc.uploadedBy.name || "Unknown"}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        roleBadgeColors[doc.uploadedBy.role] || roleBadgeColors.ADMIN
                      }`}
                    >
                      {roleLabels[doc.uploadedBy.role] || doc.uploadedBy.role}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(doc.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
