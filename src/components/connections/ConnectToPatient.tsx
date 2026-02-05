"use client";

import { useState } from "react";
import { UserPlus, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ConnectedPatient {
  patientId: string;
  userId: string;
  name: string | null;
  email: string;
}

interface ConnectToPatientProps {
  connectedPatients: ConnectedPatient[];
  onConnect: () => void;
  onSelectPatient: (patientId: string) => void;
}

export function ConnectToPatient({
  connectedPatients,
  onConnect,
  onSelectPatient,
}: ConnectToPatientProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/patients/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setSuccess(`Connected to ${data.patientName || "patient"}!`);
      setCode("");
      onConnect();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enter Code Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Connect to a Patient
        </h3>
        <p className="text-sm text-green-700 mb-4">
          Enter the invite code from the patient you want to help care for.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-100 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="w-full px-4 py-3 border border-green-300 rounded-lg font-mono text-xl text-center tracking-wider uppercase focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </button>
        </form>
      </div>

      {/* Connected Patients */}
      {connectedPatients.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">
            Your Patients ({connectedPatients.length})
          </h3>
          <div className="space-y-2">
            {connectedPatients.map((patient) => (
              <button
                key={patient.patientId}
                onClick={() => onSelectPatient(patient.patientId)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {patient.name || "Unknown Patient"}
                  </p>
                  <p className="text-sm text-gray-500">{patient.email}</p>
                </div>
                <span className="text-blue-600 text-sm">View →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
