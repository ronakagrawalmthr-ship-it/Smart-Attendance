import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ScanFace, MessageSquare, LayoutDashboard, User, Settings, Sparkles, CheckCircle2 } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Academic Portal — Smart Attendance",
  description: "Official student attendance portal, face enrollment, profile settings, and absence grievance redressal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#FAF7F2] text-stone-900 antialiased selection:bg-stone-200">
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2] text-stone-900">
        {/* Floating Apple Dynamic Island Live Attendance Pill */}
        <div className="sticky top-2 z-50 flex justify-center px-4 pointer-events-none mb-1">
          <div className="pointer-events-auto inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-stone-900 text-white text-xs shadow-xl shadow-stone-900/10 border border-white/10 backdrop-blur-2xl transition hover:scale-[1.01]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[11px] tracking-wide text-stone-200">
              Biometric Live Sync • Continuous Facial Authentication Active
            </span>
            <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
              Auto Logged
            </span>
          </div>
        </div>

        {/* Apple Frosted Navbar */}
        <nav className="sticky top-11 z-40 backdrop-blur-2xl bg-[#FAF7F2]/80 border-b border-stone-200/80 px-6 py-3.5 transition">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-10 w-10 rounded-2xl bg-stone-900 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-stone-900 group-hover:text-stone-600 transition">
                  Student Portal
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-stone-400">
                  Academic Self-Service
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 transition"
              >
                <LayoutDashboard className="h-4 w-4 text-stone-600" />
                <span>Attendance</span>
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 transition"
              >
                <User className="h-4 w-4 text-stone-600" />
                <span>Profile</span>
              </Link>
              <Link 
                href="/enroll" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 transition"
              >
                <ScanFace className="h-4 w-4 text-stone-600" />
                <span>Enroll Face</span>
              </Link>
              <Link 
                href="/grievance" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 transition"
              >
                <MessageSquare className="h-4 w-4 text-stone-600" />
                <span>Grievance</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl hover:bg-stone-200/50 text-stone-700 hover:text-stone-900 transition"
              >
                <Settings className="h-4 w-4 text-stone-600" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* Creamy Footer */}
        <footer className="border-t border-stone-200/70 bg-[#FAF7F2]/90 py-5 px-6 text-xs text-stone-500">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 University Student Portal. Autonomous AI Face-Biometrics.</p>
            <div className="flex items-center space-x-2 text-stone-400 text-[11px]">
              <span>Platform Engineered by</span>
              <span className="font-semibold text-stone-800 bg-stone-200/70 border border-stone-300/60 px-3 py-1 rounded-full">
                Created by Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

