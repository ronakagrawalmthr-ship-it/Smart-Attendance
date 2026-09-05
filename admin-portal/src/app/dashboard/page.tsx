'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Calendar, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import CollegeAnalyticsCharts from '@/components/CollegeAnalyticsCharts';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [matrices, setMatrices] = useState<any[]>([
    { branch: 'Computer Science & Engineering', total_logs: 195, present_count: 163, attendance_percentage: 83.6 },
    { branch: 'Information Technology', total_logs: 130, present_count: 101, attendance_percentage: 77.7 },
    { branch: 'Electronics & Communication', total_logs: 130, present_count: 100, attendance_percentage: 76.9 },
    { branch: 'Mechanical Engineering', total_logs: 130, present_count: 100, attendance_percentage: 76.9 },
  ]);

  const [stats, setStats] = useState<{
    turnout: string | null;
    activeSessions: number | null;
    criticalDefaulters: number | null;
  }>({
    turnout: '79.3%',
    activeSessions: 52,
    criticalDefaulters: 10,
  });

  const fetchMatrices = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      const [resLive, resKpi] = await Promise.all([
        fetch(`${API_BASE_URL}/management/attendance/live`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/management/college/kpi-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (resLive.ok) {
        const data = await resLive.json();
        if (data.live_matrices && data.live_matrices.length > 0) {
          setMatrices(data.live_matrices);
          const totalLogs = data.live_matrices.reduce((acc: number, cur: any) => acc + cur.total_logs, 0);
          const totalPresent = data.live_matrices.reduce((acc: number, cur: any) => acc + cur.present_count, 0);
          const avgTurnout = totalLogs > 0 ? (totalPresent / totalLogs * 100).toFixed(1) : null;
          setStats(prev => ({ ...prev, turnout: avgTurnout ? `${avgTurnout}%` : null }));
        }
      }

      if (resKpi.ok) {
        const kpiData = await resKpi.json();
        setStats(prev => ({
          ...prev,
          activeSessions: kpiData.activeSessions ?? null,
          criticalDefaulters: kpiData.criticalDefaulters ?? null,
          turnout: kpiData.overallTurnout ?? prev.turnout
        }));
      }
    } catch {
      console.log("Using cached department matrices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrices();
  }, []);

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Branch,Total Logs,Present Count,Attendance Percentage\n"
      + matrices.map(e => `${e.branch},${e.total_logs},${e.present_count},${e.attendance_percentage}%`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Matrix_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-7">
      {/* Contextual Apple Greeting Header */}
      <header className="rounded-[2rem] bg-white border border-stone-200/70 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Good morning, Dr. Rajesh Sharma ☀️
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 flex items-center space-x-2">
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
              Period 2: Institutional Governance
            </span>
            <span>• Whole campus telemetry across CSE, IT, ECE & ME departments.</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button 
            onClick={fetchMatrices}
            className="p-3 rounded-2xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 transition"
            title="Refresh Live Matrices"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <Link
            href="/directory"
            className="py-2.5 px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-2"
          >
            <Users className="h-4 w-4 text-violet-400" />
            <span>Directory & CRUD</span>
          </Link>
          <button
            onClick={exportCSV}
            className="py-2.5 px-4 rounded-full bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 shadow-sm transition flex items-center space-x-2"
          >
            <Download className="h-4 w-4 text-stone-500" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/defaulters"
            className="py-2.5 px-4 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 text-xs font-semibold transition flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Defaulters ({stats.criticalDefaulters ?? 10})</span>
          </Link>
        </div>
      </header>

      {/* Top Apple Widgets Row: Attendance Ring Gauge + 4 Squircle Pastel Metric Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Apple Fitness-Style Attendance Ring Widget */}
        <div className="lg:col-span-4 rounded-[2rem] bg-white border border-stone-200/70 p-7 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Attendance Fitness-Ring</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Live Rate
            </span>
          </div>

          <div className="relative flex flex-col items-center justify-center py-2">
            {/* Soft Ambient Ring Glow */}
            <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-amber-300/25 via-rose-300/25 to-indigo-300/25 blur-2xl pointer-events-none" />
            
            {/* SVG Circular Progress Ring */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-stone-100 stroke-current"
                  strokeWidth="9"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-current"
                  strokeWidth="9"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - 0.814)}
                  strokeLinecap="round"
                  fill="transparent"
                  stroke="url(#appleGradientRing)"
                />
                <defs>
                  <linearGradient id="appleGradientRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight">
                  {stats.turnout ?? '81.4%'}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  Safe Standing
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Cutoff: 75.0% statutory</span>
            <span className="font-semibold text-stone-700">+1.8% vs last week</span>
          </div>
        </div>

        {/* 4 Pastel Squircle Metric Tiles */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-2 gap-4">
          {/* Tile 1: Enrolled (Lilac) */}
          <div className="rounded-[2rem] bg-violet-50/60 border border-violet-100/80 p-6 flex flex-col justify-between hover:scale-[1.015] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-violet-900">Enrolled Students</span>
              <div className="h-9 w-9 rounded-2xl bg-violet-100 flex items-center justify-center shadow-sm">
                <Users className="h-4 w-4 text-violet-700" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">1,420</div>
              <span className="text-[11px] text-violet-700/80 font-medium">All 4 Engineering Branches</span>
            </div>
          </div>

          {/* Tile 2: Faculty (Sky Cyan) */}
          <div className="rounded-[2rem] bg-sky-50/60 border border-sky-100/80 p-6 flex flex-col justify-between hover:scale-[1.015] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sky-900">Active Faculty</span>
              <div className="h-9 w-9 rounded-2xl bg-sky-100 flex items-center justify-center shadow-sm">
                <Building2 className="h-4 w-4 text-sky-700" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">48</div>
              <span className="text-[11px] text-sky-700/80 font-medium">100% Biometric Registered</span>
            </div>
          </div>

          {/* Tile 3: Defaulters (Peach Coral) */}
          <div className="rounded-[2rem] bg-rose-50/60 border border-rose-100/80 p-6 flex flex-col justify-between hover:scale-[1.015] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-rose-900">Defaulters (&lt;75%)</span>
              <div className="h-9 w-9 rounded-2xl bg-rose-100 flex items-center justify-center shadow-sm">
                <AlertTriangle className="h-4 w-4 text-rose-700" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-rose-600">
                {stats.criticalDefaulters ?? 10}
              </div>
              <Link href="/defaulters" className="text-[11px] text-rose-700 hover:underline flex items-center space-x-1 font-semibold">
                <span>View action roster</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Tile 4: Punctuality (Pistachio Mint) */}
          <div className="rounded-[2rem] bg-emerald-50/60 border border-emerald-100/80 p-6 flex flex-col justify-between hover:scale-[1.015] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-emerald-900">Punctuality Rate</span>
              <div className="h-9 w-9 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900">96.2%</div>
              <span className="text-[11px] text-emerald-700/80 font-medium">Classroom Scan Accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <CollegeAnalyticsCharts />

      {/* Branch-Wise Real-Time Turnout Table */}
      <div className="rounded-[2rem] bg-white border border-stone-200/70 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex justify-between items-center border-b border-stone-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-indigo-700" />
            </div>
            <h2 className="text-base font-bold text-stone-900">Branch-Wise Real-Time Turnout</h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">Updated just now</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Academic Department</th>
                <th className="py-3 px-4">Total Logged Scans</th>
                <th className="py-3 px-4">Present Students</th>
                <th className="py-3 px-4">Turnout Percentage</th>
                <th className="py-3 px-4">Visual Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {matrices.map((m) => {
                const isHealthy = m.attendance_percentage >= 75;
                return (
                  <tr key={m.branch} className="hover:bg-stone-50/70 transition">
                    <td className="py-4 px-4 font-bold text-stone-900 text-sm">{m.branch}</td>
                    <td className="py-4 px-4 font-mono text-stone-600">{m.total_logs}</td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-700">{m.present_count}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        isHealthy 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}>
                        {m.attendance_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 w-48">
                      <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHealthy ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-pink-500'
                          }`}
                          style={{ width: `${Math.min(m.attendance_percentage, 100)}%` }}
                        />
                      </div>
                    </td>
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

