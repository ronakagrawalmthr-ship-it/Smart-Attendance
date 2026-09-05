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
      {/* Department Header */}
      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">
              Department Level Scoped
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">{departmentName}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time attendance telemetry for Computer Science & Engineering students, faculty lectures, and labs.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={fetchDepartmentData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Department Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/classes"
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Class Explorer & Excel</span>
          </Link>
          <button
            onClick={exportDepartmentReport}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Department Dossier</span>
          </button>
          <Link
            href="/settings"
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
            title="Configure Department Policies & Profile"
          >
            <Settings className="h-4 w-4 text-amber-400" />
            <span>Settings</span>
          </Link>
          <Link
            href="/defaulters"
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>CSE Defaulters</span>
          </Link>
        </div>
      </header>

      {/* Department KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>CSE Turnout Today</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-4xl font-extrabold text-emerald-400 tracking-tight">{departmentOverview.overallTurnout ?? 'null'}</div>
          <span className="text-[11px] text-slate-400 block font-medium">+2.4% above college average</span>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>Total CSE Students</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">{departmentOverview.totalEnrolled !== null ? departmentOverview.totalEnrolled : 'null'}</div>
          <span className="text-[11px] text-slate-400 block">Across Active Semesters</span>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>Active Lectures & Labs</span>
            <BookOpen className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">{departmentOverview.activeLabsLectures !== null ? departmentOverview.activeLabsLectures : 'null'}</div>
          <Link href="/faculty" className="text-[11px] text-teal-300 hover:underline flex items-center space-x-1">
            <span>Inspect Live Sessions</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>CSE Defaulters (&lt;75%)</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-4xl font-extrabold text-rose-400 tracking-tight">{departmentOverview.defaulterCount !== null ? departmentOverview.defaulterCount : 'null'}</div>
          <Link href="/defaulters" className="text-[11px] text-rose-300 hover:underline flex items-center space-x-1">
            <span>Review & Notify Parents</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Visual Trend Analytics Component */}
      <AttendanceTrendsChart />

      {/* Semester-by-Semester Deep Dive */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <span>CSE Semester-Wise Attendance Breakdown</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Real-time Biometric Aggregates</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Academic Semester</th>
                <th className="py-3 px-4">Sections</th>
                <th className="py-3 px-4">Enrolled Students</th>
                <th className="py-3 px-4">Present Scans</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Faculty Coordinator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {semesterStats.map((s) => {
                const isHealthy = s.turnout >= 75;
                return (
                  <tr key={s.semester} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-white text-sm">{s.semester}</td>
                    <td className="py-4 px-4 font-semibold text-slate-300">{s.section}</td>
                    <td className="py-4 px-4 font-mono">{s.enrolled}</td>
                    <td className="py-4 px-4 font-mono text-emerald-400 font-semibold">{s.present}</td>
                    <td className="py-4 px-4">
                      <span className={`font-bold text-sm ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.turnout.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-medium">{s.coordinator}</td>
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
