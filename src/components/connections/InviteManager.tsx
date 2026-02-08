"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Users } from "lucide-react";

interface Connection {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface InviteManagerProps {
  connections: Connection[];
  onRefresh: () => void;
}

export function InviteManager({ connections, onRefresh }: InviteManagerProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/patients/invite", { method: "POST" });
      const data = await response.json();
      if (data.code) {
        setInviteCode(data.code);
      }
    } catch (error) {
      console.error("Failed to generate invite:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Generate Invite Section */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">Invite Family Members</h3>
        <p className="text-base text-blue-800 mb-5">
          Generate a code to share with family members or caregivers so they can connect with you.
        </p>

        {inviteCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white border-2 border-blue-300 rounded-xl px-4 py-4 font-mono text-2xl text-center tracking-wider">
              {inviteCode}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={generateInvite}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              <span>New</span>
            </button>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            {loading ? "Generating..." : "Generate Invite Code"}
          </button>
        )}

        {inviteCode && (
          <p className="text-sm text-blue-700 mt-3 font-medium">
            This code expires in 7 days. Share it with someone you trust.
          </p>
        )}
      </div>

      {/* Connected People */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connected People ({connections.length})
          </h3>
          <button
            onClick={onRefresh}
            className="text-base text-blue-700 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        </div>

        {connections.length === 0 ? (
          <p className="text-base text-gray-600">
            No one has connected yet. Share your invite code to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {connections.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="text-base font-semibold text-gray-900">{person.name || "Unknown"}</p>
                  <p className="text-base text-gray-600">{person.email}</p>
                </div>
                <span className="text-sm bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-semibold">
                  {person.role.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
