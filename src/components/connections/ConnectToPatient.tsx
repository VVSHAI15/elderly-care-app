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
    <div className="space-y-8">
      {/* Enter Code Section */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Connect to a Patient
        </h3>
        <p className="text-base text-green-800 mb-5">
          Enter the invite code from the patient you want to help care for.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-700 text-base bg-red-50 p-4 rounded-xl font-medium">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-700 text-base bg-green-100 p-4 rounded-xl font-medium">
              <CheckCircle className="w-5 h-5" />
              {success}
            </div>
          )}

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="w-full px-4 py-4 border-2 border-green-300 rounded-xl font-mono text-2xl text-center tracking-wider uppercase focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Your Patients ({connectedPatients.length})
          </h3>
          <div className="space-y-3">
            {connectedPatients.map((patient) => (
              <button
                key={patient.patientId}
                onClick={() => onSelectPatient(patient.patientId)}
                className="w-full flex items-center justify-between p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {patient.name || "Unknown Patient"}
                  </p>
                  <p className="text-base text-gray-600">{patient.email}</p>
                </div>
                <span className="text-blue-700 text-base font-semibold">View →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
