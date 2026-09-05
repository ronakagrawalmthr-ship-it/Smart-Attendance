import type { Metadata } from "next";
import Link from "next/link";
import { Building2, BarChart3, AlertTriangle, ShieldCheck, Mail, Users, Network, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Administrator Portal — Whole Institutional Governance",
  description: "Whole college attendance intelligence across all engineering & science departments, HOD directories, and institutional policy enforcement.",
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
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-purple-400 transition">
                    College Administrator Portal
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Institutional Wide
                  </span>
                </div>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Whole College Governance & Department Directory
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-semibold">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span>Overview</span>
              </Link>
              <Link 
                href="/directory" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Directory & CRUD</span>
              </Link>
              <Link 
                href="/departments" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Network className="h-4 w-4 text-cyan-400" />
                <span>Departments</span>
              </Link>
              <Link 
                href="/defaulters" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Defaulters</span>
              </Link>
              <Link 
                href="/governance" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Mail className="h-4 w-4 text-pink-400" />
                <span>Governance</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <Settings className="h-4 w-4 text-emerald-400" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-5 px-6 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 Institutional Governance Suite. Full College & Department Authority.</p>
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <span>System Architect & Lead Developer:</span>
              <span className="font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/40 px-2.5 py-0.5 rounded-full">
                Created by Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
