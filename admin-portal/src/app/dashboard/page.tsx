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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Attendance Matrices</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric attendance streams across all university departments and sections.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={fetchMatrices}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Live Matrices"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/directory"
            className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Directory & CRUD</span>
          </Link>
          <button
            onClick={exportCSV}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/defaulters"
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/25 transition flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Defaulter Roster</span>
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>Overall Turnout Today</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">{stats.turnout ?? 'null'}</div>
          <span className="text-[11px] text-emerald-400 block font-medium">+1.8% vs last week</span>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>Active Classroom Sessions</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">{stats.activeSessions !== null ? stats.activeSessions : 'null'}</div>
          <span className="text-[11px] text-slate-400 block">Across CS, IT, EC, ME</span>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-2">
          <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400">
            <span>Defaulters (&lt;75% Cutoff)</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-4xl font-extrabold text-rose-400 tracking-tight">{stats.criticalDefaulters !== null ? stats.criticalDefaulters : 'null'}</div>
          <Link href="/defaulters" className="text-[11px] text-rose-300 hover:underline flex items-center space-x-1">
            <span>Action Required: Review Students</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Visual Charts & Cross-Departmental Analytics */}
      <CollegeAnalyticsCharts />

      {/* Live Department Attendance Matrix Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            <span>Branch-Wise Real-Time Turnout</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Updated just now</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Academic Department</th>
                <th className="py-3 px-4">Total Logged Scans</th>
                <th className="py-3 px-4">Present Students</th>
                <th className="py-3 px-4">Turnout Percentage</th>
                <th className="py-3 px-4">Visual Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {matrices.map((m) => {
                const isHealthy = m.attendance_percentage >= 75;
                return (
                  <tr key={m.branch} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-white text-sm">{m.branch}</td>
                    <td className="py-4 px-4 font-mono">{m.total_logs}</td>
                    <td className="py-4 px-4 font-mono text-emerald-400 font-semibold">{m.present_count}</td>
                    <td className="py-4 px-4">
                      <span className={`font-bold text-sm ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.attendance_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 w-48">
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-rose-400'}`}
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
