import Link from "next/link";
import { Heart, FileText, Bell, CheckSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">CareCheck</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            Caring for Your Loved Ones,{" "}
            <span className="text-blue-600">Together</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            CareCheck helps families coordinate elderly care with smart medication
            tracking, daily task management, and real-time updates.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Smart Document Scanning
            </h3>
            <p className="text-gray-600">
              Upload discharge papers and prescriptions. Our OCR technology
              automatically extracts medication schedules.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Easy Task Management
            </h3>
            <p className="text-gray-600">
              Create and track daily tasks for medications, appointments,
              exercises, and personal care routines.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Real-Time Notifications
            </h3>
            <p className="text-gray-600">
              Family members receive instant updates when tasks are completed,
              providing peace of mind from anywhere.
            </p>
          </div>
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto mt-10">
            <div className="flex-1">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Upload Documents</h4>
              <p className="text-gray-600 text-sm">
                Scan or photograph discharge papers and prescriptions
              </p>
            </div>
            <div className="flex-1">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Review & Customize</h4>
              <p className="text-gray-600 text-sm">
                Verify extracted medications and add custom tasks
              </p>
            </div>
            <div className="flex-1">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Stay Connected</h4>
              <p className="text-gray-600 text-sm">
                Family members get notified as tasks are completed
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200">
        <div className="flex items-center justify-between text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            <span>CareCheck</span>
          </div>
          <p>&copy; 2026 CareCheck. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
