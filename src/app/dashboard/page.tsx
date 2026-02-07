"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Upload, Settings, LogOut, Loader2, Users, History, Pill } from "lucide-react";
import { signOut } from "next-auth/react";
import { DocumentScanner } from "@/components/documents/DocumentScanner";
import { TaskList } from "@/components/tasks/TaskList";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InviteManager } from "@/components/connections/InviteManager";
import { ConnectToPatient } from "@/components/connections/ConnectToPatient";
import { UploadHistory } from "@/components/documents/UploadHistory";
import { MedicationsList } from "@/components/medications/MedicationsList";

interface PatientData {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
}

interface Connection {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface ConnectedPatient {
  patientId: string;
  userId: string;
  name: string | null;
  email: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tasks" | "scan" | "medications" | "connections" | "history">("tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskListKey, setTaskListKey] = useState(0);
  const [medicationsKey, setMedicationsKey] = useState(0);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/patients/connections");
      if (response.ok) {
        const data = await response.json();
        if (data.type === "patient") {
          setConnections(data.connections);
        } else {
          setConnectedPatients(data.connections);
        }
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchPatientData() {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/patients/me`);
          if (response.ok) {
            const data = await response.json();
            setPatient(data);
            if (data?.id) {
              setSelectedPatientId(data.id);
            }
          }
        } catch (error) {
          console.error("Failed to fetch patient data:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    if (session?.user) {
      fetchPatientData();
      fetchConnections();
    }
  }, [session, fetchConnections]);

  // Check for overdue tasks and generate recurring tasks on dashboard load
  useEffect(() => {
    async function onDashboardLoad() {
      if (currentPatientId) {
        try {
          await Promise.all([
            fetch(`/api/cron/check-overdue?patientId=${currentPatientId}`),
            fetch(`/api/cron/generate-recurring?patientId=${currentPatientId}`),
          ]);
        } catch (error) {
          console.error("Failed background checks:", error);
        }
      }
    }

    if (!loading && currentPatientId) {
      onDashboardLoad();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleSelectPatient = async (patientId: string) => {
    setSelectedPatientId(patientId);
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
        setActiveTab("tasks");
      }
    } catch (error) {
      console.error("Failed to fetch patient:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name?.split(" ")[0] || "there";
  const userRole = session.user?.role;
  const isPatient = userRole === "PATIENT";
  const currentPatientId = selectedPatientId || patient?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-7 h-7 text-blue-600" />
              <span className="text-xl font-bold text-gray-800">CareCheck</span>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={session.user.id} />
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {session.user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome, {userName}!
          </h1>
          {isPatient && patient ? (
            <p className="text-gray-700">
              Manage your medications, tasks, and connections below.
            </p>
          ) : !isPatient && connectedPatients.length > 0 ? (
            <p className="text-gray-700">
              You&apos;re caring for {connectedPatients.length} patient{connectedPatients.length > 1 ? "s" : ""}.
            </p>
          ) : !isPatient ? (
            <p className="text-gray-700">
              Connect with a patient to start helping with their care.
            </p>
          ) : null}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {currentPatientId && (
            <>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "tasks"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Today&apos;s Tasks
              </button>
              <button
                onClick={() => setActiveTab("scan")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "scan"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <Upload className="w-4 h-4" />
                Scan Document
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "history"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <History className="w-4 h-4" />
                Upload History
              </button>
              <button
                onClick={() => setActiveTab("medications")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "medications"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <Pill className="w-4 h-4" />
                Medications
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "connections"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <Users className="w-4 h-4" />
            {isPatient ? "My Team" : "My Patients"}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === "tasks" && currentPatientId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Tasks</h2>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
              <TaskList
                key={taskListKey}
                patientId={currentPatientId}
                connections={connections}
              />
            </div>
          )}

          {activeTab === "scan" && currentPatientId && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Scan Discharge Papers
              </h2>
              <p className="text-gray-700 mb-6">
                Upload a photo, PDF, or image of discharge papers or prescriptions. We&apos;ll
                automatically extract medication information. You&apos;ll be able to review
                and edit before saving.
              </p>
              <DocumentScanner
                patientId={currentPatientId}
                onScanComplete={() => {
                  setTaskListKey((k) => k + 1);
                  setMedicationsKey((k) => k + 1);
                }}
              />
            </div>
          )}

          {activeTab === "history" && currentPatientId && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Upload History
              </h2>
              <p className="text-gray-700 mb-6">
                View all uploaded documents, who uploaded them, and their summaries.
              </p>
              <UploadHistory patientId={currentPatientId} />
            </div>
          )}

          {activeTab === "medications" && currentPatientId && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Medications
              </h2>
              <MedicationsList key={medicationsKey} patientId={currentPatientId} />
            </div>
          )}

          {activeTab === "connections" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {isPatient ? "Care Team" : "Patient Connections"}
              </h2>
              {isPatient ? (
                <InviteManager
                  connections={connections}
                  onRefresh={fetchConnections}
                />
              ) : (
                <ConnectToPatient
                  connectedPatients={connectedPatients}
                  onConnect={fetchConnections}
                  onSelectPatient={handleSelectPatient}
                />
              )}
            </div>
          )}

          {!currentPatientId && activeTab !== "connections" && (
            <div className="text-center py-8">
              <p className="text-gray-700 mb-4">
                Connect with a patient first to view their information.
              </p>
              <button
                onClick={() => setActiveTab("connections")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Connections →
              </button>
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {showAddTask && currentPatientId && (
          <AddTaskModal
            patientId={currentPatientId}
            connections={connections}
            onClose={() => setShowAddTask(false)}
            onTaskCreated={() => setTaskListKey((k) => k + 1)}
          />
        )}
      </main>
    </div>
  );
}
