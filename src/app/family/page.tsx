"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Heart, LogOut, Loader2, TrendingUp, Activity, Clock, CheckCircle2, Pill, CalendarPlus, X, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TaskCompletionChart } from "@/components/family/TaskCompletionChart";
import { MedicationAdherenceChart } from "@/components/family/MedicationAdherenceChart";
import { HealthMetricsChart } from "@/components/family/HealthMetricsChart";
import { VisitHistory } from "@/components/family/VisitHistory";
import { ActivityFeed } from "@/components/family/ActivityFeed";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Bot } from "lucide-react";

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

interface CareRequest {
  id: string;
  requestedDate: string;
  startTime: string;
  endTime: string;
  urgency: string;
  notes: string | null;
  status: "PENDING" | "SCHEDULED" | "DECLINED";
  adminNote: string | null;
  patient: { user: { name: string | null } };
}

export default function FamilyDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"assistant" | "overview">("assistant");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [reqDate, setReqDate] = useState("");
  const [reqStart, setReqStart] = useState("09:00");
  const [reqEnd, setReqEnd] = useState("17:00");
  const [reqUrgency, setReqUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [reqNotes, setReqNotes] = useState("");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState("");

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

    fetch("/api/family/care-requests")
      .then((r) => r.json())
      .then((d) => { if (d.requests) setCareRequests(d.requests); });
  }, [session, fetchDashboard]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashData?.patient.id) return;
    setReqLoading(true);
    setReqError("");
    try {
      const res = await fetch("/api/family/care-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: dashData.patient.id,
          requestedDate: reqDate,
          startTime: reqStart,
          endTime: reqEnd,
          urgency: reqUrgency,
          notes: reqNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReqError(data.error || "Failed to submit request");
      } else {
        setReqSuccess(true);
        setCareRequests((prev) => [data.careRequest, ...prev]);
        setTimeout(() => {
          setShowRequestModal(false);
          setReqSuccess(false);
          setReqDate("");
          setReqNotes("");
          setReqUrgency("NORMAL");
        }, 1500);
      }
    } catch {
      setReqError("Something went wrong. Please try again.");
    } finally {
      setReqLoading(false);
    }
  };

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
              {dashData && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors shadow-[0_6px_14px_rgba(47,95,159,0.25)] text-sm"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Request Caregiver</span>
                </button>
              )}
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

        {/* Tab bar */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("assistant")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === "assistant"
                ? "bg-[#2f5f9f] text-white shadow-[0_8px_16px_rgba(47,95,159,0.28)] ring-2 ring-[#9cbbe2]"
                : "bg-[#eef4ff] text-[#2f5f9f] hover:bg-[#dbe8f8] border-2 border-[#b8d0ef]"
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === "overview"
                ? "bg-[#2f5f9f] text-white shadow-[0_8px_16px_rgba(47,95,159,0.28)] ring-2 ring-[#9cbbe2]"
                : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
            }`}
          >
            <Activity className="w-4 h-4" />
            Care Overview
          </button>
        </div>

        {activeTab === "assistant" && (
          <ChatPanel role="FAMILY_MEMBER" />
        )}

        {activeTab === "overview" && !dashData ? (
          <div className="bg-white/95 rounded-2xl p-12 shadow border border-[#d8e2f1] text-center">
            <TrendingUp className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">No data yet</h3>
            <p className="text-gray-500">Connect to a patient to view their care dashboard.</p>
          </div>
        ) : activeTab === "overview" && dashData ? (
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
        ) : null}
        {/* My Care Requests */}
        {activeTab === "overview" && careRequests.length > 0 && (
          <div className="bg-white/95 rounded-2xl p-6 border border-[#d8e2f1] shadow-sm mt-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarPlus className="w-5 h-5 text-[#2f5f9f]" />
              <h2 className="text-lg font-bold text-gray-900">My Care Requests</h2>
            </div>
            <div className="space-y-3">
              {careRequests.map((r) => (
                <div key={r.id} className="flex items-start justify-between p-4 rounded-xl border border-[#d8e2f1] bg-[#f8faff]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {new Date(r.requestedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <span className="text-sm text-gray-500">{r.startTime} – {r.endTime}</span>
                      {r.urgency === "URGENT" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>
                    {r.notes && <p className="text-sm text-gray-600">{r.notes}</p>}
                    {r.adminNote && <p className="text-sm text-[#2f5f9f] font-medium">Admin: {r.adminNote}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-4 ${
                    r.status === "PENDING" ? "bg-amber-100 text-amber-700"
                    : r.status === "SCHEDULED" ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                  }`}>
                    {r.status === "PENDING" ? "Pending" : r.status === "SCHEDULED" ? "Scheduled" : "Declined"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Request Caregiver Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#d8e2f1] w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request a Caregiver</h2>
                <p className="text-sm text-gray-500 mt-0.5">The care team will be notified immediately.</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {reqSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-gray-900">Request Submitted!</p>
                <p className="text-sm text-gray-500 mt-1">The care team has been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-5">
                {reqError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{reqError}</div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date Needed</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={reqStart}
                      onChange={(e) => setReqStart(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={reqEnd}
                      onChange={(e) => setReqEnd(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Urgency</label>
                  <div className="flex gap-3">
                    {(["NORMAL", "URGENT"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setReqUrgency(u)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                          reqUrgency === u
                            ? u === "URGENT"
                              ? "bg-red-50 border-red-400 text-red-700"
                              : "bg-[#f0f5fd] border-[#2f5f9f] text-[#2f5f9f]"
                            : "border-[#cdd9e9] text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {u === "URGENT" ? "🚨 Urgent" : "Normal"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Notes <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="e.g. Need help with bathing and medication, doctor appointment at 2pm..."
                    rows={3}
                    className="w-full px-3 py-2.5 border-2 border-[#cdd9e9] rounded-xl bg-white focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reqLoading || !reqDate}
                  className="w-full py-3.5 bg-[#2f5f9f] text-white font-semibold rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
