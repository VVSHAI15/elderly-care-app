"use client";

import { useState } from "react";
import { Heart, Plus, Upload, Settings } from "lucide-react";
import { DocumentScanner } from "@/components/documents/DocumentScanner";
import { TaskList } from "@/components/tasks/TaskList";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// TODO: Replace with actual user/patient data from auth
const DEMO_PATIENT_ID = "demo-patient-123";
const DEMO_USER_ID = "demo-user-123";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"tasks" | "scan" | "medications">("tasks");
  const [showAddTask, setShowAddTask] = useState(false);

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
              <NotificationBell userId={DEMO_USER_ID} />
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">JD</span>
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
            Good morning, John!
          </h1>
          <p className="text-gray-600">
            You have <span className="font-medium text-blue-600">3 tasks</span> to complete today.
          </p>
        </div>

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
              <TaskList patientId={DEMO_PATIENT_ID} />
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
                patientId={DEMO_PATIENT_ID}
                onScanComplete={(result) => {
                  console.log("Scan complete:", result);
                  // Switch to tasks tab after successful scan
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
              {/* TODO: Add MedicationList component */}
            </div>
          )}
        </div>

        {/* Add Task Modal Placeholder */}
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
