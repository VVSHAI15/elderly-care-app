"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Heart, LogOut, Loader2, TrendingUp, Activity, Clock, CheckCircle2, Pill } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TaskCompletionChart } from "@/components/family/TaskCompletionChart";
import { MedicationAdherenceChart } from "@/components/family/MedicationAdherenceChart";
import { HealthMetricsChart } from "@/components/family/HealthMetricsChart";
import { VisitHistory } from "@/components/family/VisitHistory";
import { ActivityFeed } from "@/components/family/ActivityFeed";

interface DashboardData {
  patient: { id: string; name: string | null; email: string };
  visibility: { tasks: boolean; meds: boolean; metrics: boolean; shifts: boolean };
  overview: { tasksCompletedLast7Days: number; visitsLast7Days: number; activeMedications: number };
  taskCompletionTrend: { date: string; completed: number; total: number; completionRate: number }[];
  medicationAdherence: { name: string; taken: number; total: number; rate: number }[];
  healthMetrics: Record<string, { date: string; value: string; unit: string | null; notes: string | null }[]>;
  visits: { date: string; caregiverName: string | null; durationMinutes: number | null; notes: string | null }[];
  activityFeed: { type: string; label: string; date: string; category: string }[];
}

interface ConnectedPatient {
  patientId: string;
  name: string | null;
}

export default function FamilyDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchDashboard = useCallback(async (patientId?: string) => {
    setLoading(true);
    const url = patientId ? `/api/family/dashboard?patientId=${patientId}` : "/api/family/dashboard";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setDashData(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    // Fetch all connected patients for selector
    fetch("/api/patients/connections")
      .then((r) => r.json())
      .then((d) => {
        if (d.type !== "patient" && d.connections?.length) {
          setConnectedPatients(d.connections.map((c: { patientId: string; name: string | null }) => ({ patientId: c.patientId, name: c.name })));
        }
      });

    fetchDashboard();
  }, [session, fetchDashboard]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#edf2fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbe8f8_0%,_#eff4fb_45%,_#f7faff_100%)]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-[#d6e2f1] sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-[#2f5f9f]" />
              <span className="text-2xl font-bold text-gray-900">guardian.ai</span>
              <span className="hidden sm:inline px-2.5 py-1 bg-[#f0f5fd] border border-[#d8e2f1] rounded-full text-xs font-semibold text-[#2f5f9f] uppercase tracking-wide">
                Family View
              </span>
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
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome */}
        <div className="bg-white/95 rounded-2xl p-8 shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] mb-8">
          <span className="inline-flex rounded-full border border-[#d8e2f1] bg-[#f2f6fd] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2f5f9f] mb-4">
            Family Dashboard
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {dashData?.patient.name ? `${dashData.patient.name}'s Care Overview` : "Care Overview"}
          </h1>
          <p className="text-gray-600">Track health trends, caregiver visits, and daily progress.</p>

          {/* Patient selector */}
          {connectedPatients.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {connectedPatients.map((p) => (
                <button
                  key={p.patientId}
                  onClick={() => {
                    setSelectedPatientId(p.patientId);
                    fetchDashboard(p.patientId);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    (selectedPatientId || dashData?.patient.id) === p.patientId
                      ? "bg-[#2f5f9f] text-white"
                      : "bg-[#f0f5fd] text-[#2f5f9f] hover:bg-[#dbe8f8] border border-[#d8e2f1]"
                  }`}
                >
                  {p.name || "Patient"}
                </button>
              ))}
            </div>
          )}
        </div>

        {!dashData ? (
          <div className="bg-white/95 rounded-2xl p-12 shadow border border-[#d8e2f1] text-center">
            <TrendingUp className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-500">Connect to a patient to view their care dashboard.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/95 rounded-2xl p-5 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-600 uppercase">Tasks Done</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{dashData.overview.tasksCompletedLast7Days}</p>
                <p className="text-xs text-gray-500 mt-1">last 7 days</p>
              </div>
              <div className="bg-white/95 rounded-2xl p-5 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#2f5f9f]" />
                  <span className="text-xs font-semibold text-[#2f5f9f] uppercase">Visits</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{dashData.overview.visitsLast7Days}</p>
                <p className="text-xs text-gray-500 mt-1">last 7 days</p>
              </div>
              <div className="bg-white/95 rounded-2xl p-5 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600 uppercase">Active Meds</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{dashData.overview.activeMedications}</p>
                <p className="text-xs text-gray-500 mt-1">medications</p>
              </div>
            </div>

            {/* Task Completion Trend */}
            {dashData.visibility.tasks && dashData.taskCompletionTrend.length > 0 && (
              <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-[#2f5f9f]" />
                  <h2 className="text-lg font-bold text-gray-900">Task Completion</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">Daily completion rate over the last 30 days</p>
                <TaskCompletionChart data={dashData.taskCompletionTrend} />
              </div>
            )}

            {/* Medication Adherence */}
            {dashData.visibility.meds && dashData.medicationAdherence.length > 0 && (
              <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Pill className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900">Medication Adherence</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">% of doses taken vs. scheduled (last 30 days)</p>
                <MedicationAdherenceChart data={dashData.medicationAdherence} />
              </div>
            )}

            {/* Health Metrics */}
            {dashData.visibility.metrics && Object.keys(dashData.healthMetrics).length > 0 && (
              <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-bold text-gray-900">Health Vitals</h2>
                </div>
                <p className="text-sm text-gray-500 mb-5">Logged readings over the last 90 days</p>
                <HealthMetricsChart data={dashData.healthMetrics} />
              </div>
            )}

            {/* Visit History + Activity Feed side by side */}
            <div className="grid md:grid-cols-2 gap-6">
              {dashData.visibility.shifts && dashData.visits.length > 0 && (
                <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-[#2f5f9f]" />
                    <h2 className="text-lg font-bold text-gray-900">Caregiver Visits</h2>
                  </div>
                  <VisitHistory visits={dashData.visits} />
                </div>
              )}

              {dashData.activityFeed.length > 0 && (
                <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-[#2f5f9f]" />
                    <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                  </div>
                  <ActivityFeed items={dashData.activityFeed} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
