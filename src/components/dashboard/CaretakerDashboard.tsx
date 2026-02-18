"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pill,
  FileText,
  ChevronRight,
  Activity,
  AlertCircle,
} from "lucide-react";

interface PatientSummary {
  patientId: string;
  userId: string;
  name: string | null;
  email: string;
  todayTasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    urgent: number;
  };
  activeMedications: number;
  upcomingRefills: number;
  totalTasks: number;
  totalDocuments: number;
  careTeamSize: number;
}

interface CaretakerDashboardProps {
  onSelectPatient: (patientId: string) => void;
}

export function CaretakerDashboard({ onSelectPatient }: CaretakerDashboardProps) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch("/api/patients/dashboard");
        if (response.ok) {
          const data = await response.json();
          setPatients(data.patients);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No patients yet</h3>
        <p className="text-lg text-gray-600">
          Connect with a patient using their invite code to start managing their care.
        </p>
      </div>
    );
  }

  // Aggregate stats
  const totalPending = patients.reduce((s, p) => s + p.todayTasks.pending, 0);
  const totalOverdue = patients.reduce((s, p) => s + p.todayTasks.overdue, 0);
  const totalCompleted = patients.reduce((s, p) => s + p.todayTasks.completed, 0);
  const totalTodayTasks = patients.reduce((s, p) => s + p.todayTasks.total, 0);
  const totalRefills = patients.reduce((s, p) => s + p.upcomingRefills, 0);

  // Patients needing attention (overdue or urgent tasks)
  const needsAttention = patients.filter(
    (p) => p.todayTasks.overdue > 0 || p.todayTasks.urgent > 0
  );

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#f0f5fd] rounded-xl p-5 border border-[#d8e2f1]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#2f5f9f]" />
            <span className="text-sm font-semibold text-[#2f5f9f] uppercase tracking-wide">Patients</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Pending</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPending}</p>
          <p className="text-sm text-gray-600">of {totalTodayTasks} today</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">Done</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCompleted}</p>
          <p className="text-sm text-gray-600">of {totalTodayTasks} today</p>
        </div>
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wide">Overdue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalOverdue}</p>
          {totalRefills > 0 && (
            <p className="text-sm text-red-600 font-medium">{totalRefills} refill{totalRefills > 1 ? "s" : ""} due</p>
          )}
        </div>
      </div>

      {/* Needs Attention Banner */}
      {needsAttention.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-base font-bold text-red-900">Needs Attention</h3>
          </div>
          <div className="space-y-2">
            {needsAttention.map((p) => (
              <button
                key={p.patientId}
                onClick={() => onSelectPatient(p.patientId)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-red-50 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold text-gray-900">{p.name || "Unknown"}</span>
                  <span className="text-sm text-red-600 ml-3">
                    {p.todayTasks.overdue > 0 && `${p.todayTasks.overdue} overdue`}
                    {p.todayTasks.overdue > 0 && p.todayTasks.urgent > 0 && " · "}
                    {p.todayTasks.urgent > 0 && `${p.todayTasks.urgent} urgent`}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Patient Cards */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your Patients</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {patients.map((patient) => {
            const completionRate =
              patient.todayTasks.total > 0
                ? Math.round((patient.todayTasks.completed / patient.todayTasks.total) * 100)
                : 0;

            return (
              <button
                key={patient.patientId}
                onClick={() => onSelectPatient(patient.patientId)}
                className="bg-white border-2 border-[#d8e2f1] rounded-2xl p-6 hover:border-[#2f5f9f] hover:shadow-[0_8px_24px_rgba(47,95,159,0.15)] transition-all text-left group"
              >
                {/* Patient Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#dbe8f8] rounded-full flex items-center justify-center border border-[#c6d7ec]">
                      <span className="text-[#2f5f9f] font-semibold text-lg">
                        {patient.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2) || "?"}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {patient.name || "Unknown Patient"}
                      </h4>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2f5f9f] transition-colors mt-1" />
                </div>

                {/* Today's Progress Bar */}
                {patient.todayTasks.total > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-600">Today&apos;s Progress</span>
                      <span className="text-sm font-bold text-[#2f5f9f]">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          completionRate === 100
                            ? "bg-green-500"
                            : patient.todayTasks.overdue > 0
                            ? "bg-red-400"
                            : "bg-[#2f5f9f]"
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{patient.todayTasks.pending}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{patient.activeMedications}</p>
                      <p className="text-xs text-gray-500">Meds</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{patient.totalDocuments}</p>
                      <p className="text-xs text-gray-500">Docs</p>
                    </div>
                  </div>
                </div>

                {/* Overdue Warning */}
                {patient.todayTasks.overdue > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4" />
                    {patient.todayTasks.overdue} overdue task{patient.todayTasks.overdue > 1 ? "s" : ""}
                  </div>
                )}

                {/* Refill Warning */}
                {patient.upcomingRefills > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 rounded-lg px-3 py-2">
                    <Pill className="w-4 h-4" />
                    {patient.upcomingRefills} medication refill{patient.upcomingRefills > 1 ? "s" : ""} due soon
                  </div>
                )}

                {/* Care Team */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  {patient.careTeamSize} care team member{patient.careTeamSize !== 1 ? "s" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
