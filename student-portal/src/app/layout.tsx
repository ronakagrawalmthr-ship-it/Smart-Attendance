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
        <main className="flex-1">{children}</main>

        {/* Apple Deluxe Minimal Footer */}
        <footer className="border-t border-stone-200/70 bg-[#FAF7F2]/90 py-5 px-6 text-xs text-stone-500">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© 2026 University Student Portal • Autonomous AI Face-Biometrics</p>
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

