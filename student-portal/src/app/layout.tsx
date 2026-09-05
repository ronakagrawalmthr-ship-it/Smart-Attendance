import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ScanFace, MessageSquare, LayoutDashboard, User, Settings } from "lucide-react";
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
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white group-hover:text-cyan-400 transition">
                  Student Portal
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Academic Self-Service
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-4 text-xs font-semibold">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <LayoutDashboard className="h-4 w-4 text-cyan-400" />
                <span>Attendance</span>
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <User className="h-4 w-4 text-sky-400" />
                <span>My Profile</span>
              </Link>
              <Link 
                href="/enroll" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <ScanFace className="h-4 w-4 text-indigo-400" />
                <span>Face Enrollment</span>
              </Link>
              <Link 
                href="/grievance" 
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition"
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>Grievance Desk</span>
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
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 University Student Portal. Autonomous AI Face-Biometrics.</p>
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <span>Platform Engineered by</span>
              <span className="font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-full">
                Created by Ronak Agrawal
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
