import type { Metadata } from "next";
import Link from "next/link";
import { Building2, BarChart3, AlertTriangle, Mail, Users, Network, Settings, Sparkles, Search, CheckCircle2 } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Administrator Portal — Institutional Governance",
  description: "Whole college attendance intelligence across all engineering & science departments, HOD directories, and institutional policy enforcement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#FAF7F2] text-stone-900 antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2]">
        {/* Apple Dynamic Island Floating Banner */}
        <div className="pt-3 px-4 flex justify-center sticky top-2 z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center space-x-3 px-4 py-2 rounded-full bg-stone-900 text-white shadow-xl shadow-stone-900/10 border border-stone-800 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>23CSE001 Aarav Sharma</span>
              </span>
            </div>
            <span className="text-stone-500 text-xs">|</span>
            <div className="flex items-center space-x-1.5 text-xs text-stone-300">
              <span>Recognized</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                99.4%
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-1 pl-1">
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
            </div>
          </div>
        </div>

        {/* Apple Frosted Floating Navbar */}
        <header className="px-4 sm:px-8 pt-2 pb-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-2.5 rounded-3xl bg-white/80 backdrop-blur-xl border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <Link href="/" className="flex items-center space-x-3 group pl-2">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-stone-900 group-hover:text-indigo-600 transition">
                    Administrator Portal
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    College ERP
                  </span>
                </div>
                <span className="block text-[11px] font-medium text-stone-500">
                  Institutional Governance & Academic Directory
                </span>
              </div>
            </Link>

            {/* Quick Spotlight Search Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-stone-100/80 border border-stone-200/60 text-stone-500 text-xs hover:bg-white hover:border-stone-300 transition cursor-pointer">
              <Search className="h-3.5 w-3.5 text-stone-400" />
              <span>Spotlight Quick Search...</span>
              <kbd className="text-[10px] font-semibold bg-white border border-stone-200 px-1.5 py-0.5 rounded-md text-stone-600">
                ⌘K
              </kbd>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <span>Overview</span>
              </Link>
              <Link 
                href="/directory" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <Users className="h-4 w-4 text-violet-600" />
                <span>Directory</span>
              </Link>
              <Link 
                href="/departments" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <Network className="h-4 w-4 text-sky-600" />
                <span>Depts</span>
              </Link>
              <Link 
                href="/defaulters" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Defaulters</span>
              </Link>
              <Link 
                href="/governance" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <Mail className="h-4 w-4 text-rose-500" />
                <span>Governance</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition"
              >
                <Settings className="h-4 w-4 text-stone-500" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-4">{children}</main>

        <footer className="border-t border-stone-200/60 bg-white/50 backdrop-blur-md py-6 px-6 text-xs text-stone-500 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-medium">© 2026 Smart Attendance Institutional Governance Suite • Deluxe Apple Aesthetic Edition</p>
            <div className="flex items-center space-x-2 text-stone-500 text-[11px]">
              <span>System Architect:</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
                Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

