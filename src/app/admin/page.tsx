"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, LogOut, Building2, Loader2, Users, BarChart2, Clock, CalendarClock } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AdminCaregivers } from "@/components/admin/AdminCaregivers";
import { AdminPatients } from "@/components/admin/AdminPatients";
import { AdminShifts } from "@/components/admin/AdminShifts";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminSchedule } from "@/components/admin/AdminSchedule";

type Tab = "caregivers" | "patients" | "shifts" | "schedule" | "analytics";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("patients");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#edf2fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#2f5f9f] animate-spin" />
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "patients", label: "Patients", icon: <Users className="w-4 h-4" /> },
    { key: "caregivers", label: "Caregivers", icon: <Users className="w-4 h-4" /> },
    { key: "schedule", label: "Schedule", icon: <CalendarClock className="w-4 h-4" /> },
    { key: "shifts", label: "Shift Log", icon: <Clock className="w-4 h-4" /> },
    { key: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
  ];

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
                Admin
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
              <div className="w-10 h-10 bg-[#dbe8f8] rounded-full flex items-center justify-center border border-[#c6d7ec]">
                <span className="text-[#2f5f9f] font-semibold">
                  {session.user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome */}
        <div className="bg-white/95 rounded-2xl p-8 shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-[#2f5f9f]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2f5f9f]">Manager Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Welcome, {session.user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-gray-600">Manage your care team, clients, and monitor company-wide activity.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-[#2f5f9f] text-white shadow-[0_8px_16px_rgba(47,95,159,0.28)] ring-2 ring-[#9cbbe2]"
                  : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/95 rounded-2xl shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] p-8">
          {activeTab === "patients" && <AdminPatients />}
          {activeTab === "caregivers" && <AdminCaregivers />}
          {activeTab === "schedule" && <AdminSchedule />}
          {activeTab === "shifts" && <AdminShifts />}
          {activeTab === "analytics" && <AdminAnalytics />}
        </div>
      </main>
    </div>
  );
}
