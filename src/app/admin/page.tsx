"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, LogOut, Building2, Loader2, Users, BarChart2, Clock, CalendarClock, DollarSign, ExternalLink, CheckCircle2, Zap } from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AdminCaregivers } from "@/components/admin/AdminCaregivers";
import { AdminPatients } from "@/components/admin/AdminPatients";
import { AdminShifts } from "@/components/admin/AdminShifts";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminSchedule } from "@/components/admin/AdminSchedule";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Bot } from "lucide-react";

type Tab = "assistant" | "caregivers" | "patients" | "shifts" | "schedule" | "analytics" | "hr";

const HR_SERVICES = [
  {
    name: "Gusto",
    category: "Payroll",
    description: "Run payroll, manage direct deposit, and handle tax filings for your care team.",
    url: "https://app.gusto.com",
    color: "from-[#f97316] to-[#ea580c]",
    badge: "bg-orange-100 text-orange-700",
    features: ["Automated payroll", "Tax filing", "Direct deposit", "Pay stubs"],
  },
  {
    name: "Gusto Benefits",
    category: "Benefits",
    description: "Health insurance, dental, vision, and 401(k) administration for your employees.",
    url: "https://app.gusto.com/benefits",
    color: "from-[#8b5cf6] to-[#7c3aed]",
    badge: "bg-purple-100 text-purple-700",
    features: ["Health insurance", "Dental & vision", "401(k)", "FSA/HSA"],
  },
  {
    name: "Gusto Time & Attendance",
    category: "Time Tracking",
    description: "Track caregiver hours, approve timesheets, and sync with payroll automatically.",
    url: "https://app.gusto.com/time_and_attendance",
    color: "from-[#0ea5e9] to-[#0284c7]",
    badge: "bg-sky-100 text-sky-700",
    features: ["Time tracking", "Timesheet approval", "Payroll sync", "Overtime alerts"],
  },
  {
    name: "Gusto Hiring",
    category: "Hiring & Onboarding",
    description: "Post jobs, collect offer letters, and onboard new caregivers paperlessly.",
    url: "https://app.gusto.com/hiring",
    color: "from-[#10b981] to-[#059669]",
    badge: "bg-emerald-100 text-emerald-700",
    features: ["Job postings", "Offer letters", "e-Signatures", "Digital onboarding"],
  },
];

function HRTab() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200 mb-1">Integrations</p>
          <h2 className="text-2xl font-bold mb-1">Payroll, Benefits & HR</h2>
          <p className="text-orange-100 text-sm">Quick access to all your Gusto HR tools. Click any card to open the platform.</p>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {HR_SERVICES.map((svc) => (
          <div key={svc.name} className="bg-white rounded-2xl border border-[#d8e2f1] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Card header */}
            <div className={`bg-gradient-to-r ${svc.color} px-5 py-4 flex items-center justify-between`}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-white/80">{svc.category}</span>
                <h3 className="text-xl font-bold text-white">{svc.name}</h3>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Card body */}
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{svc.description}</p>

              {/* Feature list */}
              <ul className="space-y-1.5 mb-5">
                {svc.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={svc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2f5f9f] hover:bg-[#224978] text-white font-semibold rounded-xl transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open {svc.name}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center">
        These links open Gusto in a new tab. Contact your Gusto account manager to connect your guardian.ai account for automatic sync.
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("assistant");

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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; highlight?: boolean }[] = [
    { key: "assistant", label: "AI Assistant", icon: <Bot className="w-4 h-4" />, highlight: true },
    { key: "patients", label: "Patients", icon: <Users className="w-4 h-4" /> },
    { key: "caregivers", label: "Caregivers", icon: <Users className="w-4 h-4" /> },
    { key: "schedule", label: "Schedule", icon: <CalendarClock className="w-4 h-4" /> },
    { key: "shifts", label: "Shift Log", icon: <Clock className="w-4 h-4" /> },
    { key: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
    { key: "hr", label: "Payroll & HR", icon: <DollarSign className="w-4 h-4" /> },
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
                  : tab.highlight
                  ? "bg-[#eef4ff] text-[#2f5f9f] hover:bg-[#dbe8f8] border-2 border-[#b8d0ef]"
                  : "bg-white text-gray-800 hover:bg-[#eff5ff] border-2 border-[#d6e2f1]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "assistant" ? (
          <ChatPanel role="ADMIN" />
        ) : activeTab === "hr" ? (
          <HRTab />
        ) : (
          <div className="bg-white/95 rounded-2xl shadow-[0_18px_42px_rgba(25,48,88,0.10)] border border-[#d8e2f1] p-8">
            {activeTab === "patients" && <AdminPatients />}
            {activeTab === "caregivers" && <AdminCaregivers />}
            {activeTab === "schedule" && <AdminSchedule />}
            {activeTab === "shifts" && <AdminShifts />}
            {activeTab === "analytics" && <AdminAnalytics />}
          </div>
        )}
      </main>
    </div>
  );
}
