'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  Clock, 
  Search, 
  RefreshCw, 
  Download, 
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import CollegeAnalyticsCharts from '@/components/CollegeAnalyticsCharts';

interface StudentFeedItem {
  roll_number: string;
  name: string;
  department: string;
  avatar: string;
  status: 'Present' | 'Late' | 'Excused';
  time: string;
}

const getClientGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return { greeting: 'Good morning', icon: '🌅' };
  if (hour >= 12 && hour < 17) return { greeting: 'Good afternoon', icon: '☀️' };
  if (hour >= 17 && hour < 22) return { greeting: 'Good evening', icon: '🌆' };
  return { greeting: 'Good night', icon: '🌙' };
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>('Administrator');
  const initialGreeting = getClientGreeting();
  const [greeting, setGreeting] = useState<string>(initialGreeting.greeting);
  const [greetingIcon, setGreetingIcon] = useState<string>(initialGreeting.icon);
  const [activeSchedule, setActiveSchedule] = useState<string>('Whole Campus Biometrics');
  const [matrices, setMatrices] = useState<any[]>([]);

  const [stats, setStats] = useState({
    enrolled: 0,
    faculty: 0,
    defaulters: 0,
    onTime: '0.0%',
    turnout: '0.0%'
  });

  const [kpiStats, setKpiStats] = useState<any>({});
  const [studentFeed, setStudentFeed] = useState<StudentFeedItem[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('admin_name');
        if (cached && cached !== 'Ronak Agrawal') setAdminName(cached);
      }

      const [resLive, resKpi, resMe, resTelemetry] = await Promise.all([
        authFetch(`${API_BASE_URL}/management/attendance/live`),
        authFetch(`${API_BASE_URL}/management/college/kpi-stats`),
        authFetch(`${API_BASE_URL}/api/auth/me`),
        authFetch(`${API_BASE_URL}/management/telemetry/recent-scans?limit=8`)
      ]);

      if (resMe.ok) {
        const meData = await resMe.json();
        if (meData.full_name) {
          setAdminName(meData.full_name);
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_name', meData.full_name);
          }
        }
      }

      if (resLive.ok) {
        const data = await resLive.json();
        if (data.live_matrices && data.live_matrices.length > 0) {
          setMatrices(data.live_matrices);
          const totalLogs = data.live_matrices.reduce((acc: number, cur: any) => acc + cur.total_logs, 0);
          const totalPresent = data.live_matrices.reduce((acc: number, cur: any) => acc + cur.present_count, 0);
          const avgTurnout = totalLogs > 0 ? (totalPresent / totalLogs * 100).toFixed(1) : '0.0';
          setStats(prev => ({ ...prev, turnout: `${avgTurnout}%` }));
        }
      }

      if (resKpi.ok) {
        const kpi = await resKpi.json();
        setKpiStats(kpi);
        if (kpi.greeting) setGreeting(kpi.greeting);
        if (kpi.greetingIcon) setGreetingIcon(kpi.greetingIcon);
        if (kpi.activeSchedule) setActiveSchedule(kpi.activeSchedule);
        setStats(prev => ({
          ...prev,
          enrolled: kpi.totalStudents ?? prev.enrolled,
          faculty: kpi.totalFaculty ?? prev.faculty,
          defaulters: kpi.criticalDefaulters ?? prev.defaulters,
          onTime: kpi.punctualityRate ?? prev.onTime
        }));
      }

      if (resTelemetry.ok) {
        const scans = await resTelemetry.json();
        if (Array.isArray(scans) && scans.length > 0) {
          const mapped: StudentFeedItem[] = scans.slice(0, 6).map((sc: any) => ({
            roll_number: sc.roll_number,
            name: sc.student_name,
            department: sc.branch || 'Engineering',
            avatar: sc.avatar,
            status: 'Present',
            time: sc.timestamp
          }));
          setStudentFeed(mapped);
        }
      }

    } catch (e) {
      console.log('Using local fallback state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (!token || token === 'undefined' || token === 'null' || token === 'demo_admin_token') {
        window.location.href = '/';
        return;
      }
    }
    fetchDashboardData();

    // 📡 Live Telemetry Heartbeat: Polls SQLite DB every 2.5s for real-time campus attendance sync
    const liveInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const [resLive, resKpi, resTelemetry] = await Promise.all([
          authFetch(`${API_BASE_URL}/management/attendance/live`),
          authFetch(`${API_BASE_URL}/management/college/kpi-stats`),
          authFetch(`${API_BASE_URL}/management/telemetry/recent-scans?limit=6`)
        ]);

        if (resLive.ok) {
          const liveData = await resLive.json();
          if (liveData.liveToday) {
            setStats(prev => ({
              ...prev,
              enrolled: liveData.liveToday.total_students ?? prev.enrolled,
              turnout: `${liveData.liveToday.turnout_pct ?? 0}%`,
              defaulters: liveData.liveToday.absent_today ?? prev.defaulters
            }));
          }
        }

        if (resTelemetry.ok) {
          const scans = await resTelemetry.json();
          if (Array.isArray(scans) && scans.length > 0) {
            const mapped: StudentFeedItem[] = scans.slice(0, 6).map((sc: any) => ({
              roll_number: sc.roll_number,
              name: sc.student_name,
              department: sc.department || sc.room || 'Campus General',
              avatar: sc.avatar,
              status: 'Present',
              time: sc.timestamp
            }));
            setStudentFeed(mapped);
          }
        }
      } catch (e) {
        // Silent background heartbeat catch
      }
    }, 2500);

    return () => clearInterval(liveInterval);
  }, []);

  const turnoutFloat = parseFloat(stats.turnout.replace('%', '')) || 0.0;
  const ringOffset = 251.2 * (1 - Math.min(Math.max(turnoutFloat / 100, 0), 1));

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
    <AppleDeluxeShell userRole="Institutional Governance" userName={adminName}>
      
      {/* ☀️ Top Contextual Smart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          {greeting}, {adminName} {greetingIcon} • {activeSchedule}
        </h1>

        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchDashboardData} 
            className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition shadow-2xs"
            title="Refresh Matrices"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button 
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs transition flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 🔍 Inline Spotlight Quick-Search Trigger Pill */}
      <div 
        onClick={() => {
          // Dispatch synthetic Cmd+K
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
        className="w-full rounded-2xl bg-stone-50/90 hover:bg-white border border-stone-200/80 px-4 py-2.5 flex items-center justify-between cursor-pointer transition shadow-2xs group"
      >
        <div className="flex items-center space-x-2.5 text-xs text-stone-400 group-hover:text-stone-600">
          <Search className="h-4 w-4 text-stone-400 group-hover:text-stone-700 transition" />
          <span className="font-medium">Spotlight quick-search</span>
        </div>
        <kbd className="px-2 py-0.5 rounded-lg bg-stone-200/60 border border-stone-300/60 text-[10px] font-mono font-bold text-stone-600">
          Cmd+K
        </kbd>
      </div>

      {/* ⭕ Top Widgets Deck: Attendance Fitness-Ring + 4 Tinted Pastel Squircle Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4.5">
        
        {/* Widget 1: Attendance Fitness-Ring Card */}
        <div className="rounded-3xl bg-white border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="w-full flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-stone-800">Attendance fitness-ring</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="relative w-36 h-36 flex items-center justify-center my-1">
            {/* SVG Activity Ring with Sunset Coral to Violet gradient */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="text-stone-100 stroke-current"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-current"
                strokeWidth="10"
                strokeDasharray="238.7"
                strokeDashoffset={238.7 * (1 - Math.min(Math.max(turnoutFloat / 100, 0), 1))}
                strokeLinecap="round"
                fill="transparent"
                stroke="url(#deluxeSunsetGradient)"
              />
              <defs>
                <linearGradient id="deluxeSunsetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {stats.turnout}
              </span>
              <span className="text-[11px] font-semibold text-stone-500 mt-0.5">
                On Track
              </span>
            </div>
          </div>

          <div className="w-full text-center text-[10px] text-stone-400 font-medium">
            Campus statutory target: 75.0%
          </div>
        </div>

        {/* Widget 2: 🪻 Enrolled Students (Pastel Lilac Card) */}
        <div className="rounded-3xl bg-[#F3EFFE] border border-purple-200/60 p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="h-9 w-9 rounded-2xl bg-purple-100/90 text-purple-600 flex items-center justify-center mb-4">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {stats.enrolled.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-stone-600 mt-0.5">
              Enrolled
            </div>
          </div>
        </div>

        {/* Widget 3: 🩵 Faculty (Pastel Sky Blue Card) */}
        <div className="rounded-3xl bg-[#EDF6FE] border border-blue-200/60 p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="h-9 w-9 rounded-2xl bg-blue-100/90 text-blue-600 flex items-center justify-center mb-4">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {stats.faculty}
            </div>
            <div className="text-xs font-semibold text-stone-600 mt-0.5">
              Faculty
            </div>
          </div>
        </div>

        {/* Widget 4: 🍑 Defaulters (Pastel Coral Peach Card) */}
        <div className="rounded-3xl bg-[#FEF1F0] border border-rose-200/60 p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="h-9 w-9 rounded-2xl bg-rose-100/90 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {stats.defaulters}
            </div>
            <div className="text-xs font-semibold text-stone-600 mt-0.5">
              Defaulters
            </div>
          </div>
        </div>

        {/* Widget 5: 🍃 On-Time Punctuality (Pastel Mint Green Card) */}
        <div className="rounded-3xl bg-[#EFFBF5] border border-emerald-200/60 p-5 shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="h-9 w-9 rounded-2xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center mb-4">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {stats.onTime}
            </div>
            <div className="text-xs font-semibold text-stone-600 mt-0.5">
              On-Time
            </div>
          </div>
        </div>

      </div>

      {/* 📋 Student Live-Feed Table Card (Exact match to Reference Image) */}
      <div className="rounded-3xl bg-white border border-stone-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Student live-feed</h2>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
            Real-Time Stream
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 font-semibold text-[11px]">
                <th className="pb-3 pl-2">Indian Roll No. ↑</th>
                <th className="pb-3">Student Name</th>
                <th className="pb-3 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/70 font-medium">
              {studentFeed.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-stone-400 text-xs">
                    No recent biometric scans detected. Ready for incoming attendance logs...
                  </td>
                </tr>
              ) : (
                studentFeed.map((item) => {
                  let badgeClass = 'bg-[#DCFCE7] text-[#166534]';
                  if (item.status === 'Late') badgeClass = 'bg-[#FEE2E2] text-[#991B1B]';
                  if (item.status === 'Excused') badgeClass = 'bg-[#FEF3C7] text-[#92400E]';

                  return (
                    <tr key={item.roll_number} className="hover:bg-stone-50/70 transition-colors">
                      {/* Roll & Avatar */}
                      <td className="py-3 pl-2 flex items-center space-x-3">
                        <img 
                          src={item.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80'} 
                          alt={item.name} 
                          className="h-8 w-8 rounded-full object-cover border border-stone-200 shrink-0"
                        />
                        <span className="font-mono font-bold text-stone-900">{item.roll_number}</span>
                      </td>

                      {/* Name & Department */}
                      <td className="py-3">
                        <div className="text-stone-900 font-semibold">{item.name}</div>
                        <div className="text-[10px] text-stone-400">{item.department}</div>
                      </td>

                      {/* Pill Status */}
                      <td className="py-3 text-right pr-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center ${badgeClass}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📊 Department Turnout Breakdown & Analytics Section */}
      <div className="rounded-3xl bg-white border border-stone-200/80 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Department Turnout Breakdown</h2>
            <p className="text-xs text-stone-400 mt-0.5">Real-time attendance rates across engineering branches</p>
          </div>
          <Link
            href="/departments"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>Master Directory</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matrices.map((dept: any) => {
            const pct = dept.attendance_percentage ?? 0;
            return (
              <div key={dept.branch} className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 truncate" title={dept.branch}>
                    {dept.branch.replace('& Engineering', '').replace('Engineering', 'Engg')}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    pct >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${pct >= 75 ? 'bg-indigo-600' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>{dept.present_count} Present</span>
                  <span>{dept.total_logs} Enrolled</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Charts */}
        <div className="pt-4 border-t border-stone-100">
          <CollegeAnalyticsCharts 
            branches={kpiStats.branchBreakdown} 
            riskDistribution={kpiStats.riskDistribution} 
          />
        </div>
      </div>

    </AppleDeluxeShell>
  );
}
