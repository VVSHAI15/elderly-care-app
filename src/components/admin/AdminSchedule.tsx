"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { ScheduleCalendar, ShiftDetailPanel } from "@/components/schedule/ScheduleCalendar";
import { CreateShiftModal } from "@/components/schedule/CreateShiftModal";
import { ShiftRequestsList } from "@/components/schedule/ShiftRequestsList";
import type { ScheduledShift, ShiftRequest } from "@/components/schedule/types";

interface Caregiver {
  id: string;
  name: string | null;
  email: string;
}

interface Patient {
  id: string;
  user: { name: string | null };
}

export function AdminSchedule() {
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "requests">("calendar");
  const [requestFilter, setRequestFilter] = useState<string>("PENDING");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, requestsRes, caregiversRes, patientsRes] = await Promise.all([
        fetch("/api/schedule"),
        fetch(`/api/schedule/requests${requestFilter ? `?status=${requestFilter}` : ""}`),
        fetch("/api/admin/caregivers"),
        fetch("/api/admin/patients"),
      ]);

      if (shiftsRes.ok) setShifts(await shiftsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
      if (caregiversRes.ok) {
        const data = await caregiversRes.json();
        // admin/caregivers returns { caregivers: [...] }
        setCaregivers(data.caregivers ?? data);
      }
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(data.patients ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, [requestFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cancelShift = async (id: string) => {
    const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedShift(null);
      fetchData();
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white rounded-xl border border-[#d8e2f1] p-1 gap-1">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "calendar" ? "bg-[#2f5f9f] text-white" : "text-gray-600 hover:bg-[#f0f5fd]"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "requests" ? "bg-[#2f5f9f] text-white" : "text-gray-600 hover:bg-[#f0f5fd]"
            }`}
          >
            Requests
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-xs rounded-full font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="p-2.5 rounded-xl border border-[#d8e2f1] hover:bg-[#f0f5fd] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2f5f9f] text-white rounded-xl text-sm font-medium hover:bg-[#254e87] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Shift
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Upcoming shifts", value: shifts.filter((s) => s.status === "SCHEDULED" && new Date(s.startTime) > new Date()).length },
          { label: "In progress", value: shifts.filter((s) => s.status === "IN_PROGRESS").length },
          { label: "Pending requests", value: shifts.filter(() => false).length + pendingCount },
          { label: "Caregivers scheduled", value: new Set(shifts.filter((s) => s.status === "SCHEDULED").map((s) => s.caregiverId)).size },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-[#d8e2f1] px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-[#2f5f9f]">{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      {activeTab === "calendar" ? (
        <ScheduleCalendar
          shifts={shifts}
          onShiftClick={(s) => setSelectedShift(s)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#d8e2f1] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Shift Requests</h3>
            <select
              value={requestFilter}
              onChange={(e) => setRequestFilter(e.target.value)}
              className="border border-[#d8e2f1] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f5f9f]/30"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FULFILLED">Fulfilled</option>
            </select>
          </div>
          <ShiftRequestsList
            requests={requests}
            isAdmin={true}
            caregivers={caregivers}
            onUpdated={fetchData}
          />
        </div>
      )}

      {/* Modals */}
      {selectedShift && (
        <ShiftDetailPanel
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onCancel={cancelShift}
          isAdmin
        />
      )}

      {showCreateModal && (
        <CreateShiftModal
          caregivers={caregivers}
          patients={patients}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
