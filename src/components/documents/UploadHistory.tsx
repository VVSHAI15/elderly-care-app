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
  PATIENT: "bg-blue-100 text-blue-800",
  FAMILY_MEMBER: "bg-purple-100 text-purple-800",
  CAREGIVER: "bg-green-100 text-green-800",
  ADMIN: "bg-gray-100 text-gray-800",
};

const docTypeLabels: Record<string, string> = {
  PRESCRIPTION: "Prescription",
  DISCHARGE_SUMMARY: "Discharge Summary",
  LAB_RESULTS: "Lab Results",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

const docTypeBadgeColors: Record<string, string> = {
  PRESCRIPTION: "bg-orange-100 text-orange-800",
  DISCHARGE_SUMMARY: "bg-teal-100 text-teal-800",
  LAB_RESULTS: "bg-indigo-100 text-indigo-800",
  INSURANCE: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-800 font-semibold">No documents uploaded yet</p>
        <p className="text-base text-gray-600 mt-2">
          Scanned documents will appear here after upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-lg font-semibold text-gray-900 truncate">
                  {doc.fileName}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    docTypeBadgeColors[doc.documentType] || docTypeBadgeColors.OTHER
                  }`}
                >
                  {docTypeLabels[doc.documentType] || doc.documentType}
                </span>
              </div>

              {/* Summary */}
              {doc.summary && (
                <p className="text-base text-gray-700 mb-3 leading-relaxed">
                  {doc.summary}
                </p>
              )}

              {/* Medications count */}
              {doc.medications.length > 0 && (
                <p className="text-sm text-gray-800 mb-3 font-medium">
                  {doc.medications.length} medication{doc.medications.length !== 1 ? "s" : ""} extracted:{" "}
                  {doc.medications.map((m) => m.name).join(", ")}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-5 text-sm text-gray-700 flex-wrap">
                {doc.uploadedBy && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {doc.uploadedBy.name || "Unknown"}
                    <span
                      className={`ml-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        roleBadgeColors[doc.uploadedBy.role] || roleBadgeColors.ADMIN
                      }`}
                    >
                      {roleLabels[doc.uploadedBy.role] || doc.uploadedBy.role}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
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
