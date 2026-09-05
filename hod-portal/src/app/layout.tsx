import type { Metadata } from "next";
import Link from "next/link";
import { Laptop, BarChart3, AlertTriangle, Users, MessageSquare, ShieldCheck, FileSpreadsheet, Settings } from "lucide-react";
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
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Laptop className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition">
                    HOD Department Deck
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CSE Department
                  </span>
                </div>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Departmental Academic Operations
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-semibold">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span>Turnout</span>
              </Link>
              <Link 
                href="/classes" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-teal-400" />
                <span>Classes & Excel</span>
              </Link>
              <Link 
                href="/operations" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>Academic Ops</span>
              </Link>
              <Link 
                href="/defaulters" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>Defaulters</span>
              </Link>
              <Link 
                href="/faculty" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Users className="h-4 w-4 text-cyan-400" />
                <span>Faculty</span>
              </Link>
              <Link 
                href="/grievances" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span>Grievances</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Settings className="h-4 w-4 text-amber-400" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-5 px-6 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 Department of Computer Science & Engineering. Autonomous Biometric Intelligence.</p>
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <span>System Architect & Lead Developer:</span>
              <span className="font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                Created by Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
