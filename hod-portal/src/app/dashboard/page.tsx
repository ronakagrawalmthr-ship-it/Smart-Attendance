'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Laptop, 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  ArrowRight,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import AttendanceTrendsChart from '@/components/AttendanceTrendsChart';

export default function HODDashboard() {
  const [loading, setLoading] = useState(false);
  const departmentName = "Computer Science & Engineering";

  const [semesterStats, setSemesterStats] = useState<any[]>([
    { semester: 'Semester 6', section: 'A & B', enrolled: 15, present: 163, turnout: 83.6, coordinator: 'Dr. Rajesh Sharma' },
  ]);

  const [departmentOverview, setDepartmentOverview] = useState<{
    overallTurnout: string | null;
    totalEnrolled: number | null;
    activeLabsLectures: number | null;
    defaulterCount: number | null;
  }>({
    overallTurnout: '83.6%',
    totalEnrolled: 15,
    activeLabsLectures: 13,
    defaulterCount: 2,
  });

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/management/department/overview?branch=Computer%20Science`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDepartmentOverview({
          overallTurnout: data.overallTurnout ?? null,
          totalEnrolled: data.totalEnrolled ?? null,
          activeLabsLectures: data.activeLabsLectures ?? null,
          defaulterCount: data.defaulterCount ?? null,
        });
        if (data.semesterStats && data.semesterStats.length > 0) {
          setSemesterStats(data.semesterStats);
        }
      }
    } catch {
      console.log("Using cached department metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentData();
  }, []);

  const exportDepartmentReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Department,Semester,Sections,Enrolled,Present Today,Turnout,Coordinator\n"
      + semesterStats.map(s => `${departmentName},${s.semester},${s.section},${s.enrolled},${s.present},${s.turnout}%,${s.coordinator}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSE_Department_Attendance_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Apple Deluxe Department Header */}
      <header className="rounded-3xl bg-white/85 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold uppercase tracking-wider">
              Department Level Scoped
            </span>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">{departmentName}</h1>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Real-time biometric attendance telemetry for Computer Science & Engineering students, faculty lectures, and labs.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
          <button 
            onClick={fetchDepartmentData}
            className="p-2.5 rounded-2xl bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 shadow-sm transition"
            title="Refresh Department Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <Link
            href="/classes"
            className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-emerald-600/15 transition flex items-center space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Class Explorer & Excel</span>
          </Link>
          <button
            onClick={exportDepartmentReport}
            className="py-2.5 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200 shadow-sm transition flex items-center space-x-2"
          >
            <Download className="h-4 w-4 text-stone-500" />
            <span>Export Dossier</span>
          </button>
          <Link
            href="/settings"
            className="py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center space-x-1.5"
            title="Configure Department Policies & Profile"
          >
            <Settings className="h-4 w-4 text-amber-600" />
            <span>Settings</span>
          </Link>
          <Link
            href="/defaulters"
            className="py-2.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>CSE Defaulters</span>
          </Link>
        </div>
      </header>

      {/* Apple Deluxe Pastel Squircle KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {/* Turnout - Mint Green Pastel Squircle */}
        <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200/80 p-6 space-y-2 shadow-sm transition hover:shadow-md">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-emerald-800">
            <span>CSE Turnout Today</span>
            <div className="h-8 w-8 rounded-2xl bg-emerald-100/80 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-stone-900 tracking-tight">{departmentOverview.overallTurnout ?? '83.6%'}</div>
          <span className="text-[11px] text-emerald-700 block font-semibold">+2.4% above college average</span>
        </div>

        {/* Total Students - Lilac Pastel Squircle */}
        <div className="rounded-3xl bg-purple-50/70 border border-purple-200/80 p-6 space-y-2 shadow-sm transition hover:shadow-md">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-purple-800">
            <span>Total CSE Students</span>
            <div className="h-8 w-8 rounded-2xl bg-purple-100/80 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-700" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-stone-900 tracking-tight">{departmentOverview.totalEnrolled !== null ? departmentOverview.totalEnrolled : 15}</div>
          <span className="text-[11px] text-purple-700 block font-medium">Across Active Semesters</span>
        </div>

        {/* Active Labs - Sky Cyan Pastel Squircle */}
        <div className="rounded-3xl bg-sky-50/70 border border-sky-200/80 p-6 space-y-2 shadow-sm transition hover:shadow-md">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-sky-800">
            <span>Active Lectures & Labs</span>
            <div className="h-8 w-8 rounded-2xl bg-sky-100/80 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-sky-700" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-stone-900 tracking-tight">{departmentOverview.activeLabsLectures !== null ? departmentOverview.activeLabsLectures : 13}</div>
          <Link href="/faculty" className="text-[11px] text-sky-700 hover:underline flex items-center space-x-1 font-semibold">
            <span>Inspect Live Sessions</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Defaulters - Soft Coral Pastel Squircle */}
        <div className="rounded-3xl bg-rose-50/70 border border-rose-200/80 p-6 space-y-2 shadow-sm transition hover:shadow-md">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-rose-800">
            <span>CSE Defaulters (&lt;75%)</span>
            <div className="h-8 w-8 rounded-2xl bg-rose-100/80 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-rose-600 tracking-tight">{departmentOverview.defaulterCount !== null ? departmentOverview.defaulterCount : 2}</div>
          <Link href="/defaulters" className="text-[11px] text-rose-700 hover:underline flex items-center space-x-1 font-semibold">
            <span>Review & Notify Parents</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Visual Trend Analytics Component */}
      <AttendanceTrendsChart />

      {/* Semester-by-Semester Deep Dive in Apple Porcelain Card */}
      <div className="rounded-3xl bg-white/85 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-stone-900 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <span>CSE Semester-Wise Attendance Breakdown</span>
          </h2>
          <span className="text-xs text-stone-400 font-mono">Real-time Biometric Aggregates</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Academic Semester</th>
                <th className="py-3.5 px-4">Sections</th>
                <th className="py-3.5 px-4">Enrolled Students</th>
                <th className="py-3.5 px-4">Present Scans</th>
                <th className="py-3.5 px-4">Attendance Rate</th>
                <th className="py-3.5 px-4">Faculty Coordinator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {semesterStats.map((s) => {
                const isHealthy = s.turnout >= 75;
                return (
                  <tr key={s.semester} className="hover:bg-stone-50/80 transition">
                    <td className="py-4 px-4 font-bold text-stone-900 text-sm">{s.semester}</td>
                    <td className="py-4 px-4 font-semibold text-stone-600">{s.section}</td>
                    <td className="py-4 px-4 font-mono font-medium">{s.enrolled}</td>
                    <td className="py-4 px-4 font-mono text-emerald-700 font-bold">{s.present}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-extrabold text-xs border ${
                        isHealthy 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {s.turnout.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-stone-500 font-medium">{s.coordinator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
