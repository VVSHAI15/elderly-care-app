"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Upload, Settings, LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { DocumentScanner } from "@/components/documents/DocumentScanner";
import { TaskList } from "@/components/tasks/TaskList";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface PatientData {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tasks" | "scan" | "medications">("tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
  }, [session]);

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
          {userRole === "PATIENT" && patient ? (
            <p className="text-gray-600">
              Manage your medications and daily tasks below.
            </p>
          ) : userRole === "PATIENT" && !patient ? (
            <p className="text-gray-600">
              Setting up your patient profile...
            </p>
          ) : (
            <p className="text-gray-600">
              You&apos;re logged in as a {userRole?.toLowerCase().replace("_", " ")}.
              {!patient && " Connect with a patient to get started."}
            </p>
          )}
        </div>

        {/* Show content based on role and patient status */}
        {patient ? (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "tasks"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Today&apos;s Tasks
              </button>
              <button
                onClick={() => setActiveTab("scan")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "scan"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <Upload className="w-4 h-4" />
                Scan Document
              </button>
              <button
                onClick={() => setActiveTab("medications")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "medications"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Medications
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {activeTab === "tasks" && (
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
                  <TaskList patientId={patient.id} />
                </div>
              )}

              {activeTab === "scan" && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Scan Discharge Papers
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Upload a photo or PDF of discharge papers or prescriptions. We&apos;ll
                    automatically extract medication information and create tasks.
                  </p>
                  <DocumentScanner
                    patientId={patient.id}
                    onScanComplete={(result) => {
                      console.log("Scan complete:", result);
                      if (result.medications.length > 0) {
                        setActiveTab("tasks");
                      }
                    }}
                  />
                </div>
              )}

              {activeTab === "medications" && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Active Medications
                  </h2>
                  <p className="text-gray-500">
                    Medications extracted from your documents will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : userRole !== "PATIENT" ? (
          /* Non-patient users without a connected patient */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              No patients connected
            </h2>
            <p className="text-gray-600 mb-4">
              As a {userRole?.toLowerCase().replace("_", " ")}, you can connect with patients to help manage their care.
            </p>
            <p className="text-sm text-gray-500">
              Patient connection feature coming soon.
            </p>
          </div>
        ) : null}

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
              <p className="text-gray-500 mb-4">Task form coming soon...</p>
              <button
                onClick={() => setShowAddTask(false)}
                className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
