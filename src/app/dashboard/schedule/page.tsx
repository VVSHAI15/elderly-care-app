"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Heart, ArrowLeft, Plus, Loader2, CalendarClock, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ScheduleCalendar, ShiftDetailPanel } from "@/components/schedule/ScheduleCalendar";
import { ShiftRequestModal } from "@/components/schedule/ShiftRequestModal";
import { ShiftRequestsList } from "@/components/schedule/ShiftRequestsList";
import type { ScheduledShift, ShiftRequest } from "@/components/schedule/types";

type Tab = "calendar" | "requests";

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role === "ADMIN") router.push("/admin");
    else if (status === "authenticated" && session?.user?.role === "FAMILY_MEMBER") router.push("/family");
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, requestsRes] = await Promise.all([
        fetch("/api/schedule"),
        fetch("/api/schedule/requests"),
      ]);
      if (shiftsRes.ok) setShifts(await shiftsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#edf2fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const myShifts = shifts.filter((s) => s.caregiverId === session.user.id);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbe8f8_0%,_#eff4fb_45%,_#f7faff_100%)]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-[#d6e2f1] sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-7 h-7 text-[#2f5f9f]" />
              <span className="text-xl font-bold text-gray-900">guardian.ai</span>
              <span className="px-2.5 py-1 bg-[#f0f5fd] border border-[#d8e2f1] rounded-full text-xs font-semibold text-[#2f5f9f] uppercase tracking-wide">
                My Schedule
              </span>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-[#f0f5fd] transition-colors text-gray-700 text-sm font-medium border border-[#d8e2f1]"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Tab bar + action button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex bg-white rounded-xl border border-[#d8e2f1] p-1 gap-1">
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "calendar"
                  ? "bg-[#2f5f9f] text-white"
                  : "text-gray-600 hover:bg-[#f0f5fd]"
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "requests"
                  ? "bg-[#2f5f9f] text-white"
                  : "text-gray-600 hover:bg-[#f0f5fd]"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              My Requests
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-xs rounded-full font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2f5f9f] text-white rounded-xl text-sm font-medium hover:bg-[#254e87] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Request Change
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Upcoming shifts", value: myShifts.filter((s) => s.status === "SCHEDULED" && new Date(s.startTime) > new Date()).length },
            { label: "This week", value: myShifts.filter((s) => {
              const d = new Date(s.startTime);
              const now = new Date();
              const weekEnd = new Date(now);
              weekEnd.setDate(now.getDate() + 7);
              return d >= now && d <= weekEnd;
            }).length },
            { label: "Pending requests", value: requests.filter((r) => r.status === "PENDING").length },
            { label: "Approved requests", value: requests.filter((r) => r.status === "APPROVED").length },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white/90 rounded-xl border border-[#d8e2f1] px-4 py-3 shadow-sm"
            >
              <div className="text-2xl font-bold text-[#2f5f9f]">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        {activeTab === "calendar" ? (
          <ScheduleCalendar
            onShiftClick={(shift) => setSelectedShift(shift)}
          />
        ) : (
          <div className="bg-white/90 rounded-2xl border border-[#d8e2f1] p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">My Shift Requests</h2>
            <ShiftRequestsList
              requests={requests}
              isAdmin={false}
              onUpdated={fetchData}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedShift && (
        <ShiftDetailPanel
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
        />
      )}

      {showRequestModal && (
        <ShiftRequestModal
          myShifts={myShifts}
          onClose={() => setShowRequestModal(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
