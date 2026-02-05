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
    <div className="space-y-6">
      {/* Generate Invite Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Invite Family Members</h3>
        <p className="text-sm text-blue-700 mb-4">
          Generate a code to share with family members or caregivers so they can connect with you.
        </p>

        {inviteCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-blue-300 rounded-lg px-4 py-3 font-mono text-xl text-center tracking-wider">
              {inviteCode}
            </div>
            <button
              onClick={copyCode}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={generateInvite}
              disabled={loading}
              className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              title="Generate new code"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        ) : (
          <button
            onClick={generateInvite}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {loading ? "Generating..." : "Generate Invite Code"}
          </button>
        )}

        {inviteCode && (
          <p className="text-xs text-blue-600 mt-2">
            This code expires in 7 days. Share it with someone you trust.
          </p>
        )}
      </div>

      {/* Connected People */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Connected People ({connections.length})
          </h3>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        {connections.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No one has connected yet. Share your invite code to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{person.name || "Unknown"}</p>
                  <p className="text-sm text-gray-500">{person.email}</p>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
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
