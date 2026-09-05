import type { Metadata } from "next";
import Link from "next/link";
import { Laptop, BarChart3, AlertTriangle, Users, MessageSquare, ShieldCheck, FileSpreadsheet, Settings, Search } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Department HOD Control Deck — Smart Attendance",
  description: "Department-specific live classroom matrices, student defaulter management, faculty monitoring, and grievance redressal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#FAF7F2] text-stone-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <body className="min-h-full flex flex-col font-sans">
        {/* Floating Apple Dynamic Island Live Banner */}
        <div className="sticky top-2 z-50 flex justify-center px-4 pointer-events-none mb-1">
          <div className="pointer-events-auto inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-stone-900/90 text-white backdrop-blur-xl border border-stone-800 shadow-xl shadow-stone-900/10 text-xs transition-all hover:scale-[1.02]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-tight text-[11px] sm:text-xs">HOD Live Intelligence:</span>
            <span className="text-stone-300 text-[11px] sm:text-xs">CSE Dept Active • Period 2 Classrooms Synced</span>
          </div>
        </div>

        {/* Frosted Acrylic Navbar */}
        <nav className="sticky top-11 z-40 backdrop-blur-2xl bg-[#FAF7F2]/80 border-b border-stone-200/80 px-4 sm:px-8 py-3.5 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                <Laptop className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base tracking-tight text-stone-900 group-hover:text-emerald-700 transition">
                    HOD Department Deck
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    CSE Dept
                  </span>
                </div>
                <span className="block text-[10px] font-medium tracking-wide text-stone-500">
                  Departmental Academic Operations
                </span>
              </div>
            </Link>

            {/* Apple Spotlight Search Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-stone-200/80 text-stone-400 text-xs shadow-sm hover:border-stone-300 transition cursor-pointer">
              <Search className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-stone-500">Search student, faculty or class...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200">⌘K</kbd>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold overflow-x-auto py-1">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Turnout</span>
              </Link>
              <Link 
                href="/classes" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                <span className="hidden sm:inline">Classes & Excel</span>
              </Link>
              <Link 
                href="/operations" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden md:inline">Academic Ops</span>
              </Link>
              <Link 
                href="/defaulters" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-rose-50 text-rose-700 hover:text-rose-800 transition"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span>Defaulters</span>
              </Link>
              <Link 
                href="/faculty" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <Users className="h-3.5 w-3.5 text-cyan-600" />
                <span>Faculty</span>
              </Link>
              <Link 
                href="/grievances" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                <span className="hidden md:inline">Grievances</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition"
              >
                <Settings className="h-3.5 w-3.5 text-amber-600" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone-200/80 bg-white/60 py-6 px-6 text-xs text-stone-500 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 Department of Computer Science & Engineering • Autonomous Biometric Intelligence</p>
            <div className="flex items-center space-x-2 text-stone-500 text-[11px]">
              <span>System Architect & Lead Developer:</span>
              <span className="font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-sm">
                Created by Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
