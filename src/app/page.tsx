import Link from "next/link";
import { Heart, FileText, Bell, CheckSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-9 h-9 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">CareCheck</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-5 py-3 text-gray-800 hover:text-gray-900 transition-colors font-medium text-lg"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Caring for Your Loved Ones,{" "}
            <span className="text-blue-600">Together</span>
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            CareCheck helps families coordinate elderly care with smart medication
            tracking, daily task management, and real-time updates.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Smart Document Scanning
            </h3>
            <p className="text-gray-700 text-base">
              Upload discharge papers and prescriptions. Our AI technology
              automatically extracts medication schedules.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CheckSquare className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Easy Task Management
            </h3>
            <p className="text-gray-700 text-base">
              Create and track daily tasks for medications, appointments,
              exercises, and personal care routines.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Real-Time Notifications
            </h3>
            <p className="text-gray-700 text-base">
              Family members receive instant updates when tasks are completed,
              providing peace of mind from anywhere.
            </p>
          </div>
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto mt-10">
            <div className="flex-1">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Upload Documents</h4>
              <p className="text-gray-700 text-base">
                Scan or photograph discharge papers and prescriptions
              </p>
            </div>
            <div className="flex-1">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Review & Customize</h4>
              <p className="text-gray-700 text-base">
                Verify extracted medications and add custom tasks
              </p>
            </div>
            <div className="flex-1">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Stay Connected</h4>
              <p className="text-gray-700 text-base">
                Family members get notified as tasks are completed
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200">
        <div className="flex items-center justify-between text-gray-600 text-base">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            <span className="font-medium">CareCheck</span>
          </div>
          <p>&copy; 2026 CareCheck. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
