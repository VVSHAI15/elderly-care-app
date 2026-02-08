"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Loader2, User, Users, Stethoscope } from "lucide-react";

type Role = "PATIENT" | "FAMILY_MEMBER" | "CAREGIVER";

const roles: { value: Role; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "PATIENT",
    label: "I am the patient",
    description: "I need help managing my own care",
    icon: <User className="w-6 h-6" />,
  },
  {
    value: "FAMILY_MEMBER",
    label: "Family member",
    description: "I help care for a loved one",
    icon: <Users className="w-6 h-6" />,
  },
  {
    value: "CAREGIVER",
    label: "Professional caregiver",
    description: "I provide care professionally",
    icon: <Stethoscope className="w-6 h-6" />,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but failed to sign in. Please try logging in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <Heart className="w-9 h-9 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">CareCheck</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            {step === 1 ? (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h1>
                <p className="text-lg text-gray-700 mb-8">How will you be using CareCheck?</p>

                <div className="space-y-4">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => handleRoleSelect(r.value)}
                      className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left flex items-start gap-4 group"
                    >
                      <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-blue-100 transition-colors text-gray-600 group-hover:text-blue-600">
                        {r.icon}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{r.label}</p>
                        <p className="text-base text-gray-600">{r.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="mt-8 text-center text-lg text-gray-700">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-700 hover:text-blue-800 font-semibold underline">
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="text-base text-gray-700 hover:text-gray-900 mb-6 font-medium flex items-center gap-1"
                >
                  &larr; Back
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your details</h1>
                <p className="text-lg text-gray-700 mb-8">
                  {role === "PATIENT"
                    ? "Set up your personal care account"
                    : "Create your caregiver account"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-4 rounded-xl text-base font-medium">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-base font-semibold text-gray-800 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-base font-semibold text-gray-800 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-base font-semibold text-gray-800 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-base font-semibold text-gray-800 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-base"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-blue-600 text-white font-semibold text-lg rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-lg text-gray-700">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-700 hover:text-blue-800 font-semibold underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
