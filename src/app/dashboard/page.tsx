"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Upload, LogOut, Loader2, Users, History, Pill, ArrowLeft, Activity, Clock, FileText, CalendarClock } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { DocumentScanner } from "@/components/documents/DocumentScanner";
import { TaskList } from "@/components/tasks/TaskList";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InviteManager } from "@/components/connections/InviteManager";
import { ConnectToPatient } from "@/components/connections/ConnectToPatient";
import { UploadHistory } from "@/components/documents/UploadHistory";
import { MedicationsList } from "@/components/medications/MedicationsList";
import { CaretakerDashboard } from "@/components/dashboard/CaretakerDashboard";
import { ClockInOut } from "@/components/caregiver/ClockInOut";
import { HealthMetricLogger } from "@/components/caregiver/HealthMetricLogger";
import { CareProfileView } from "@/components/patient/CareProfileView";
import { EditCareProfileModal } from "@/components/patient/EditCareProfileModal";
import type { CareProfile } from "@/types/care-profile";

interface PatientData {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
  user?: { name: string | null; email: string };
  medications?: Array<{ id: string; name: string; dosage: string; frequency: string; prescriber?: string | null }>;
  dischargeInfo?: CareProfile["dischargeInfo"];
  exerciseGuidelines?: CareProfile["exerciseGuidelines"];
  dietRestrictions?: CareProfile["dietRestrictions"];
  warningSigns?: CareProfile["warningSigns"];
  careContacts?: CareProfile["careContacts"];
  followUpAppointments?: CareProfile["followUpAppointments"];
  allergies?: CareProfile["allergies"];
  conditions?: CareProfile["conditions"];
  healthHistory?: CareProfile["healthHistory"];
  illnessHistory?: CareProfile["illnessHistory"];
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
  const [activeTab, setActiveTab] = useState<"tasks" | "scan" | "medications" | "connections" | "history" | "vitals" | "shifts" | "care-profile">("tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskListKey, setTaskListKey] = useState(0);
  const [medicationsKey, setMedicationsKey] = useState(0);
  const [viewingPatientDetail, setViewingPatientDetail] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [showEditCareProfile, setShowEditCareProfile] = useState(false);

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
    } else if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.push("/admin");
    } else if (status === "authenticated" && session?.user?.role === "FAMILY_MEMBER") {
      router.push("/family");
    }
  }, [status, session, router]);

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
    // Switch to detail view immediately; keep any previously loaded patient
    // data visible until new data arrives (prevents blank flicker).
    setSelectedPatientId(patientId);
    setViewingPatientDetail(true);
    setPatient(null);
    setActiveTab("tasks");
    setPatientError(null);
    setPatientLoading(true);
    // Close any open modals so stale data from the previous patient never shows
    setShowAddTask(false);
    setShowEditCareProfile(false);
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
      } else if (response.status === 403) {
        setPatientError("You don't have permission to view this patient.");
      } else {
        setPatientError("Failed to load patient data. Please try again.");
      }
    } catch (error) {
      console.error("Failed to fetch patient:", error);
      setPatientError("Network error. Please check your connection and try again.");
    } finally {
      setPatientLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setViewingPatientDetail(false);
    setSelectedPatientId(null);
    setPatient(null);
    setPatientError(null);
    setPatientLoading(false);
  };

  const refreshPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
      }
    } catch { /* silent */ }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#edf2fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name?.split(" ")[0] || "there";
  const userRole = session.user?.role;
  const isPatient = userRole === "PATIENT";
  const isCaregiver = userRole === "CAREGIVER";
  const isOrgCaregiver = isCaregiver && !!session.user?.organizationId;
  const currentPatientId = selectedPatientId || patient?.id;
  const showCaretakerDashboard = !isPatient && !viewingPatientDetail;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbe8f8_0%,_#eff4fb_45%,_#f7faff_100%)]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-[#d6e2f1] sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-[#2f5f9f]" />
              <span className="text-2xl font-bold text-gray-900">guardian.ai</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell userId={session.user.id} />
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-[#f0f5fd] transition-colors text-gray-700 font-medium border border-[#d8e2f1]"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              <div className="w-12 h-12 bg-[#dbe8f8] rounded-full flex items-center justify-center border border-[#c6d7ec]">
                <span className="text-[#2f5f9f] font-semibold text-lg">
                  {session.user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome Section */}
        <div className="bg-white/95 rounded-2xl p-8 shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] mb-8">
          {/* Back button when viewing a specific patient */}
          {!isPatient && viewingPatientDetail && (
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 text-[#2f5f9f] hover:text-[#224978] font-semibold mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          )}
          <span className="inline-flex rounded-full border border-[#d8e2f1] bg-[#f2f6fd] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2f5f9f] mb-4">
            {showCaretakerDashboard ? "Caretaker Dashboard" : "Care Dashboard"}
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userName}!
          </h1>
          {isPatient && patient ? (
            <p className="text-lg text-gray-700">
              Manage your medications, tasks, and connections below.
            </p>
          ) : showCaretakerDashboard && connectedPatients.length > 0 ? (
            <p className="text-lg text-gray-700">
              You&apos;re caring for {connectedPatients.length} patient{connectedPatients.length > 1 ? "s" : ""}. Here&apos;s an overview of everyone&apos;s care.
            </p>
          ) : showCaretakerDashboard ? (
            <p className="text-lg text-gray-700">
              Connect with a patient to start helping with their care.
            </p>
          ) : !isPatient && viewingPatientDetail && patient ? (
            <p className="text-lg text-gray-700">
              Viewing care details for <span className="font-semibold">{patient.user?.name || "this patient"}</span>.
            </p>
          ) : null}
        </div>

        {/* Caretaker Multi-Patient Dashboard */}
        {showCaretakerDashboard ? (
          <div className="space-y-6">
            <div className="bg-white/95 rounded-2xl shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] p-8">
              <CaretakerDashboard onSelectPatient={handleSelectPatient} />
            </div>

            {/* Connect to patients — only for non-org caregivers */}
            {!isOrgCaregiver && (
              <div className="bg-white/95 rounded-2xl shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Connect to a Patient</h2>
                <ConnectToPatient
                  connectedPatients={connectedPatients}
                  onConnect={fetchConnections}
                  onSelectPatient={handleSelectPatient}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-3 mb-8 flex-wrap">
              {currentPatientId && (
                <>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors ${
                      activeTab === "tasks"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    Today&apos;s Tasks
                  </button>
                  <button
                    onClick={() => setActiveTab("scan")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                      activeTab === "scan"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    Scan Document
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                      activeTab === "history"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    <History className="w-5 h-5" />
                    Upload History
                  </button>
                  <button
                    onClick={() => setActiveTab("medications")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                      activeTab === "medications"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    <Pill className="w-5 h-5" />
                    Medications
                  </button>
                </>
              )}
              {/* Care Profile — visible to everyone with a patient context */}
              {currentPatientId && (
                <button
                  onClick={() => setActiveTab("care-profile")}
                  className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                    activeTab === "care-profile"
                      ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                      : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Care Profile
                </button>
              )}
              {/* Caregiver-only tabs */}
              {isCaregiver && currentPatientId && (
                <>
                  <button
                    onClick={() => setActiveTab("shifts")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                      activeTab === "shifts"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                    Clock In/Out
                  </button>
                  <button
                    onClick={() => setActiveTab("vitals")}
                    className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                      activeTab === "vitals"
                        ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                        : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                    }`}
                  >
                    <Activity className="w-5 h-5" />
                    Vitals
                  </button>
                  <Link
                    href="/dashboard/schedule"
                    className="px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                  >
                    <CalendarClock className="w-5 h-5" />
                    My Schedule
                  </Link>
                </>
              )}
              <button
                onClick={() => setActiveTab("connections")}
                className={`px-5 py-3 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 ${
                  activeTab === "connections"
                    ? "bg-[#2f5f9f] text-white shadow-[0_10px_20px_rgba(47,95,159,0.30)] ring-2 ring-[#9cbbe2]"
                    : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
                }`}
              >
                <Users className="w-5 h-5" />
                {isPatient ? "My Team" : "My Patients"}
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white/95 rounded-2xl shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] p-8">
              {/* Patient detail loading / error state */}
              {patientLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin mr-3" />
                  <span className="text-gray-600 font-medium">Loading patient data…</span>
                </div>
              )}
              {!patientLoading && patientError && (
                <div className="text-center py-12">
                  <p className="text-red-600 font-semibold mb-2">{patientError}</p>
                  <button
                    onClick={() => currentPatientId && handleSelectPatient(currentPatientId)}
                    className="text-[#2f5f9f] hover:underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!patientLoading && !patientError && activeTab === "tasks" && currentPatientId && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-[#2f5f9f] text-white rounded-xl hover:bg-[#224978] transition-colors text-base font-semibold shadow-[0_10px_20px_rgba(47,95,159,0.26)]"
                    >
                      <Plus className="w-5 h-5" />
                      Add Task
                    </button>
                  </div>
                  <TaskList
                    key={`${currentPatientId}-${taskListKey}`}
                    patientId={currentPatientId}
                    connections={connections}
                    patientAllergies={
                      patient?.allergies
                        ? (Array.isArray((patient.allergies as { items?: unknown[] })?.items)
                            ? (patient.allergies as { items: { substance: string; reaction?: string; severity?: string }[] }).items
                            : [])
                        : []
                    }
                  />
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "scan" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Scan Discharge Papers
                  </h2>
                  <p className="text-lg text-gray-700 mb-6">
                    Upload a photo, PDF, or image of discharge papers or prescriptions. We&apos;ll
                    automatically extract medication information. You&apos;ll be able to review
                    and edit before saving.
                  </p>
                  <DocumentScanner
                    key={currentPatientId}
                    patientId={currentPatientId}
                    patientAllergies={
                      patient?.allergies
                        ? (Array.isArray((patient.allergies as { items?: unknown[] })?.items ?? null)
                            ? (patient.allergies as { items: { substance: string; reaction?: string; severity?: string }[] }).items
                            : [])
                        : []
                    }
                    onScanComplete={() => {
                      setTaskListKey((k) => k + 1);
                      setMedicationsKey((k) => k + 1);
                      refreshPatient(currentPatientId);
                    }}
                  />
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "history" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Upload History
                  </h2>
                  <p className="text-lg text-gray-700 mb-6">
                    View all uploaded documents, who uploaded them, and their summaries.
                  </p>
                  <UploadHistory key={currentPatientId} patientId={currentPatientId} />
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "medications" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Medications
                  </h2>
                  <MedicationsList key={`${currentPatientId}-${medicationsKey}`} patientId={currentPatientId} />
                </div>
              )}

              {activeTab === "connections" && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {isPatient ? "Care Team" : "Patient Connections"}
                  </h2>
                  {isPatient ? (
                    <InviteManager
                      connections={connections}
                      onRefresh={fetchConnections}
                    />
                  ) : isOrgCaregiver ? (
                    <div className="text-center py-10">
                      <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-700 font-semibold mb-1">Patients are assigned by your manager</p>
                      <p className="text-gray-500 text-sm">Your administrator assigns patients to you through the care company portal. Contact your manager if you believe a patient is missing.</p>
                    </div>
                  ) : (
                    <ConnectToPatient
                      connectedPatients={connectedPatients}
                      onConnect={fetchConnections}
                      onSelectPatient={handleSelectPatient}
                    />
                  )}
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "shifts" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Clock In / Out</h2>
                  <ClockInOut
                    key={currentPatientId}
                    patientId={currentPatientId}
                    patientName={patient?.user?.name || null}
                  />
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "vitals" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Health Vitals</h2>
                  <HealthMetricLogger key={currentPatientId} patientId={currentPatientId} />
                </div>
              )}

              {!patientLoading && !patientError && activeTab === "care-profile" && currentPatientId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Care Profile</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Allergies, conditions, medications, health history, warning signs, and more.
                  </p>
                  <CareProfileView
                    key={currentPatientId}
                    patientId={currentPatientId}
                    dischargeInfo={patient?.dischargeInfo}
                    exerciseGuidelines={patient?.exerciseGuidelines}
                    dietRestrictions={patient?.dietRestrictions}
                    warningSigns={patient?.warningSigns}
                    careContacts={patient?.careContacts}
                    followUpAppointments={patient?.followUpAppointments}
                    allergies={patient?.allergies}
                    conditions={patient?.conditions}
                    healthHistory={patient?.healthHistory}
                    illnessHistory={patient?.illnessHistory}
                    medications={patient?.medications}
                    onEdit={() => setShowEditCareProfile(true)}
                    onTasksCreated={() => setTaskListKey((k) => k + 1)}
                  />
                  {showEditCareProfile && patient && (
                    <EditCareProfileModal
                      patientId={currentPatientId}
                      initial={{
                        dischargeInfo: patient.dischargeInfo,
                        exerciseGuidelines: patient.exerciseGuidelines,
                        dietRestrictions: patient.dietRestrictions,
                        warningSigns: patient.warningSigns,
                        careContacts: patient.careContacts,
                        followUpAppointments: patient.followUpAppointments,
                        allergies: patient.allergies,
                        conditions: patient.conditions,
                        healthHistory: patient.healthHistory,
                        illnessHistory: patient.illnessHistory,
                      }}
                      onSave={() => refreshPatient(currentPatientId)}
                      onClose={() => setShowEditCareProfile(false)}
                    />
                  )}
                </div>
              )}

              {!currentPatientId && activeTab !== "connections" && (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-700 mb-6">
                    Connect with a patient first to view their information.
                  </p>
                  <button
                    onClick={() => setActiveTab("connections")}
                    className="text-lg text-[#2f5f9f] hover:text-[#224978] font-semibold underline"
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
                patientAllergies={
                  patient?.allergies
                    ? (Array.isArray((patient.allergies as { items?: unknown[] })?.items)
                        ? (patient.allergies as { items: { substance: string; reaction?: string; severity?: string }[] }).items
                        : [])
                    : []
                }
                onClose={() => setShowAddTask(false)}
                onTaskCreated={() => setTaskListKey((k) => k + 1)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
