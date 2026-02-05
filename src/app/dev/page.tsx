"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import {
  RefreshCw,
  Users,
  Heart,
  ClipboardList,
  Pill,
  FileText,
  Ticket,
  Trash2,
  Plus,
  LogIn,
  Database,
  AlertTriangle,
} from "lucide-react";

interface DevData {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    patient: { id: string } | null;
    familyOf: Array<{ id: string; user: { name: string } }>;
  }>;
  patients: Array<{
    id: string;
    user: { name: string | null; email: string };
    familyMembers: Array<{ id: string; name: string | null; email: string }>;
    _count: { tasks: number; medications: number; documents: number };
  }>;
  inviteCodes: Array<{
    id: string;
    code: string;
    usedAt: string | null;
    expiresAt: string;
    patient: { user: { name: string | null } };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    patient: { user: { name: string | null } };
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    patient: { user: { name: string | null } };
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string;
    patient: { user: { name: string | null } };
  }>;
  stats: {
    totalUsers: number;
    totalPatients: number;
    totalTasks: number;
    totalMedications: number;
    totalDocuments: number;
    activeInvites: number;
  };
}

export default function DevPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DevData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "patients" | "tasks" | "meds" | "docs" | "invites">("users");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dev/data");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAction = async (action: string) => {
    setActionLoading(action);
    try {
      const response = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      alert(JSON.stringify(result, null, 2));
      fetchData();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const loginAs = async (email: string) => {
    await signIn("credentials", {
      email,
      password: "password123",
      callbackUrl: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-yellow-500" />
              <span className="text-xl font-bold">Dev Dashboard</span>
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-medium">
                DEV ONLY
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back to App
              </Link>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Current Session */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Current Session</h3>
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-white">{session.user?.email}</span>
              <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">
                {session.user?.role}
              </span>
            </div>
          ) : (
            <span className="text-gray-500">Not logged in</span>
          )}
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Users className="w-4 h-4" /> Users
              </div>
              <div className="text-2xl font-bold">{data.stats.totalUsers}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Heart className="w-4 h-4" /> Patients
              </div>
              <div className="text-2xl font-bold">{data.stats.totalPatients}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <ClipboardList className="w-4 h-4" /> Tasks
              </div>
              <div className="text-2xl font-bold">{data.stats.totalTasks}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Pill className="w-4 h-4" /> Meds
              </div>
              <div className="text-2xl font-bold">{data.stats.totalMedications}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <FileText className="w-4 h-4" /> Docs
              </div>
              <div className="text-2xl font-bold">{data.stats.totalDocuments}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Ticket className="w-4 h-4" /> Invites
              </div>
              <div className="text-2xl font-bold">{data.stats.activeInvites}</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runAction("createTestUsers")}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {actionLoading === "createTestUsers" ? "Creating..." : "Create Test Users"}
            </button>
            <button
              onClick={() => runAction("createTestTasks")}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <ClipboardList className="w-4 h-4" />
              {actionLoading === "createTestTasks" ? "Creating..." : "Create Test Tasks"}
            </button>
            <button
              onClick={() => runAction("createTestMedications")}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Pill className="w-4 h-4" />
              {actionLoading === "createTestMedications" ? "Creating..." : "Create Test Meds"}
            </button>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
                  runAction("clearAll");
                }
              }}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {actionLoading === "clearAll" ? "Clearing..." : "Clear All Data"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Test user password: <code className="bg-gray-700 px-1 rounded">password123</code>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { id: "users", label: "Users", icon: Users },
            { id: "patients", label: "Patients", icon: Heart },
            { id: "tasks", label: "Tasks", icon: ClipboardList },
            { id: "meds", label: "Medications", icon: Pill },
            { id: "docs", label: "Documents", icon: FileText },
            { id: "invites", label: "Invites", icon: Ticket },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data Tables */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              {activeTab === "users" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Patient?</th>
                      <th className="text-left p-3 font-medium">Connected To</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-750">
                        <td className="p-3 font-mono text-xs">{user.email}</td>
                        <td className="p-3">{user.name || "-"}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            user.role === "PATIENT" ? "bg-blue-500" :
                            user.role === "CAREGIVER" ? "bg-purple-500" :
                            user.role === "ADMIN" ? "bg-red-500" : "bg-gray-500"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">{user.patient ? "Yes" : "No"}</td>
                        <td className="p-3 text-xs">
                          {user.familyOf.map((p) => p.user.name).join(", ") || "-"}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => loginAs(user.email)}
                            className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                          >
                            <LogIn className="w-3 h-3" /> Login
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "patients" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Family Members</th>
                      <th className="text-left p-3 font-medium">Tasks</th>
                      <th className="text-left p-3 font-medium">Meds</th>
                      <th className="text-left p-3 font-medium">Docs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-750">
                        <td className="p-3">{patient.user.name || "-"}</td>
                        <td className="p-3 font-mono text-xs">{patient.user.email}</td>
                        <td className="p-3 text-xs">
                          {patient.familyMembers.length > 0
                            ? patient.familyMembers.map((f) => f.name || f.email).join(", ")
                            : "-"}
                        </td>
                        <td className="p-3">{patient._count.tasks}</td>
                        <td className="p-3">{patient._count.medications}</td>
                        <td className="p-3">{patient._count.documents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "tasks" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Patient</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-750">
                        <td className="p-3">{task.title}</td>
                        <td className="p-3">{task.patient.user.name || "-"}</td>
                        <td className="p-3 text-xs">{task.category}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            task.status === "COMPLETED" ? "bg-green-500" :
                            task.status === "PENDING" ? "bg-yellow-500 text-black" :
                            "bg-gray-500"
                          }`}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "meds" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Dosage</th>
                      <th className="text-left p-3 font-medium">Frequency</th>
                      <th className="text-left p-3 font-medium">Patient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.medications.map((med) => (
                      <tr key={med.id} className="hover:bg-gray-750">
                        <td className="p-3 font-medium">{med.name}</td>
                        <td className="p-3">{med.dosage}</td>
                        <td className="p-3">{med.frequency}</td>
                        <td className="p-3">{med.patient.user.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "docs" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">File Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Patient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-750">
                        <td className="p-3">{doc.fileName}</td>
                        <td className="p-3 text-xs">{doc.documentType}</td>
                        <td className="p-3">{doc.patient.user.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "invites" && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Patient</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {data?.inviteCodes.map((invite) => (
                      <tr key={invite.id} className="hover:bg-gray-750">
                        <td className="p-3 font-mono">{invite.code}</td>
                        <td className="p-3">{invite.patient.user.name || "-"}</td>
                        <td className="p-3">
                          {invite.usedAt ? (
                            <span className="text-xs bg-gray-500 px-2 py-0.5 rounded">Used</span>
                          ) : new Date(invite.expiresAt) < new Date() ? (
                            <span className="text-xs bg-red-500 px-2 py-0.5 rounded">Expired</span>
                          ) : (
                            <span className="text-xs bg-green-500 px-2 py-0.5 rounded">Active</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Empty state */}
              {data && (
                (activeTab === "users" && data.users.length === 0) ||
                (activeTab === "patients" && data.patients.length === 0) ||
                (activeTab === "tasks" && data.tasks.length === 0) ||
                (activeTab === "meds" && data.medications.length === 0) ||
                (activeTab === "docs" && data.documents.length === 0) ||
                (activeTab === "invites" && data.inviteCodes.length === 0)
              ) && (
                <div className="p-8 text-center text-gray-500">
                  No data yet. Use Quick Actions to create test data.
                </div>
              )}
            </>
          )}
        </div>

        {/* Warning */}
        <div className="mt-6 flex items-start gap-2 text-yellow-500 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <p>
            This page is only available in development mode. It will return 403 in production.
          </p>
        </div>
      </main>
    </div>
  );
}
