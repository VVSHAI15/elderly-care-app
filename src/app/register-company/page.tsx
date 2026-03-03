"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Loader2, Building2, ChevronRight, CheckCircle2 } from "lucide-react";

type Step = 1 | 2 | 3;

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, adminName, adminEmail, adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create organization");
        return;
      }

      // Auto sign in
      const result = await signIn("credentials", {
        email: adminEmail,
        password: adminPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please log in.");
        router.push("/login");
      } else {
        setStep(3);
        setTimeout(() => router.push("/admin"), 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbe8f8_0%,_#eef4fb_45%,_#f6f9fe_100%)] flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <Heart className="w-9 h-9 text-[#2f5f9f]" />
          <span className="text-2xl font-bold text-gray-900">guardian.ai</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white/95 rounded-2xl shadow-[0_22px_48px_rgba(20,44,86,0.14)] border border-[#d8e2f1] p-10">

            {step === 3 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
                <p className="text-gray-600">Taking you to your admin dashboard...</p>
              </div>
            ) : step === 1 ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-[#edf2fb] rounded-xl">
                    <Building2 className="w-6 h-6 text-[#2f5f9f]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#2f5f9f]">Step 1 of 2</span>
                    <h1 className="text-2xl font-bold text-gray-900">Your company</h1>
                  </div>
                </div>

                <p className="text-gray-600 mb-8">
                  guardian.ai helps home care companies manage their clients and caregivers in one place.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); if (companyName.trim()) setStep(2); }} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-[#cdd9e9] rounded-xl bg-[#fcfdff] focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none transition-shadow text-base"
                      placeholder="Sunrise Home Care"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#2f5f9f] text-white font-semibold text-lg rounded-xl hover:bg-[#224978] transition-colors flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(47,95,159,0.28)]"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#2f5f9f] hover:text-[#224978] font-semibold underline">
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} className="text-sm text-gray-600 hover:text-gray-900 mb-6 font-medium flex items-center gap-1">
                  &larr; Back
                </button>
                <div className="mb-6">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#2f5f9f]">Step 2 of 2</span>
                  <h1 className="text-2xl font-bold text-gray-900">Admin account</h1>
                  <p className="text-gray-600 mt-1">This will be the manager account for <strong>{companyName}</strong>.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-[#cdd9e9] rounded-xl bg-[#fcfdff] focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none transition-shadow text-base"
                      placeholder="Jane Smith"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Work Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-[#cdd9e9] rounded-xl bg-[#fcfdff] focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none transition-shadow text-base"
                      placeholder="jane@sunrisehomecare.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-[#cdd9e9] rounded-xl bg-[#fcfdff] focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none transition-shadow text-base"
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-[#cdd9e9] rounded-xl bg-[#fcfdff] focus:ring-2 focus:ring-[#2f5f9f] focus:border-[#2f5f9f] outline-none transition-shadow text-base"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-[#2f5f9f] text-white font-semibold text-lg rounded-xl hover:bg-[#224978] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(47,95,159,0.28)]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Company Account"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
