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
  TrendingUp,
  Trophy,
  Award,
  X
} from 'lucide-react';
import { API_BASE_URL, authFetch, authFetchWithRetry } from '@/lib/api';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [adminName, setAdminName] = useState<string>('Administrator');
  const initialGreeting = getClientGreeting();
  const [greeting, setGreeting] = useState<string>(initialGreeting.greeting);
  const [greetingIcon, setGreetingIcon] = useState<string>(initialGreeting.icon);
  const [activeSchedule, setActiveSchedule] = useState<string>('Campus Lectures');
  const [isAchieversModalOpen, setIsAchieversModalOpen] = useState(false);
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

  const fetchDashboardData = async (isManualRetry = false) => {
    try {
      if (isManualRetry) setRetrying(true);
      setLoading(true);
      setFetchError(null);

      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('admin_name');
        if (cached) setAdminName(cached);
      }

      const [resLive, resKpi, resMe, resTelemetry] = await Promise.all([
        authFetchWithRetry(`${API_BASE_URL}/management/attendance/live`, {}, { maxRetries: 2, delayMs: 600 }),
        authFetchWithRetry(`${API_BASE_URL}/management/college/kpi-stats`, {}, { maxRetries: 2, delayMs: 600 }),
        authFetchWithRetry(`${API_BASE_URL}/api/auth/me`, {}, { maxRetries: 2, delayMs: 600 }),
        authFetchWithRetry(`${API_BASE_URL}/management/telemetry/recent-scans?limit=8`, {}, { maxRetries: 2, delayMs: 600 })
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

      // If key endpoints failed
      if (!resLive.ok && !resKpi.ok) {
        setFetchError('Institutional system server returned an unexpected response.');
      }

    } catch (e: any) {
      console.log('Error synchronizing dashboard metrics:', e);
      setFetchError('Unable to connect to live campus attendance system. Check network status or retry.');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRetrying(false);
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

  const turnoutFloat = parseFloat(String(stats?.turnout || '0').replace('%', '')) || 0.0;
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
      
      {/* ☀️ Top Contextual Smart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
          {greeting}, {adminName} {greetingIcon} • {activeSchedule}
        </h1>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fetchDashboardData()} 
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

      {/* âš  Actionable Connection Recovery Banner */}
      {fetchError && (
        <div className="rounded-2xl bg-rose-50/90 border border-rose-200/90 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">Institutional Telemetry Connection Error</p>
              <p className="text-[11px] text-rose-700">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={retrying}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Re-syncing...' : 'Retry Sync'}</span>
          </button>
        </div>
      )}

      {/* 🔍 Inline Spotlight Quick-Search Trigger Pill */}
      <div 
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-spotlight-search'));
            window.dispatchEvent(new CustomEvent('open-spotlight'));
          }
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

      {initialLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-3xl bg-white border border-stone-200/70 p-5 shadow-xs h-48 flex flex-col justify-between animate-pulse">
                <div className="h-9 w-9 rounded-2xl bg-stone-100"></div>
                <div className="space-y-2">
                  <div className="h-7 w-24 bg-stone-200/80 rounded-lg"></div>
                  <div className="h-3 w-16 bg-stone-100 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-72 rounded-3xl bg-white border border-stone-200/70 p-8 animate-pulse flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin text-stone-400" />
            <span className="text-xs font-semibold text-stone-500">Synchronizing Institutional Analytics & Live Matrices...</span>
          </div>
        </div>
      ) : (
        <>
      {/* ⭕ Top Widgets Deck: Overall Attendance + 4 Tinted Pastel Squircle Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4.5">
        
        {/* Widget 1: Overall Attendance Card */}
        <div className="rounded-3xl bg-white border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="w-full flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-stone-800">Overall Attendance</span>
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
            Campus required minimum: 75.0%
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

        {/* Widget 4: ⚠️ Defaulters (Pastel Coral Peach Card) */}
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

        {/* Widget 5: ⏱️ On-Time Punctuality (Pastel Mint Green Card) */}
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

      {/* 🏆 Institutional Hall of Fame: Top 3 High Attendance Achievers */}
      <div className="rounded-3xl bg-linear-to-br from-amber-50/50 via-white to-stone-50 border border-amber-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-600 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">Institutional Attendance Champions</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Top 3 College-Wide
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Recognizing outstanding academic consistency & zero-proxy commitment</p>
            </div>
          </div>

          {(kpiStats?.topAchievers || []).length > 0 && (
            <button
              type="button"
              onClick={() => setIsAchieversModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-amber-300 text-xs font-semibold text-stone-700 hover:text-amber-700 shadow-xs transition cursor-pointer"
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>View Merit List (Top 10)</span>
              <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            </button>
          )}
        </div>

        {(!kpiStats?.topAchievers || kpiStats.topAchievers.length === 0) ? (
          <div className="p-8 text-center bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
            <Trophy className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-600">No attendance records logged yet</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Top attendance achievers will appear here as live classroom sessions are recorded</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(kpiStats.topAchievers || []).slice(0, 3).map((student: any, idx: number) => {
              const medalStyles = [
                {
                  ring: 'border-amber-300 bg-linear-to-b from-amber-50 to-white shadow-amber-500/10',
                  badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                  medalIcon: '🥇',
                  title: '1st Place • Gold',
                  pctColor: 'text-amber-700'
                },
                {
                  ring: 'border-slate-300 bg-linear-to-b from-slate-50 to-white shadow-slate-500/10',
                  badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
                  medalIcon: '🥈',
                  title: '2nd Place • Silver',
                  pctColor: 'text-slate-700'
                },
                {
                  ring: 'border-orange-300 bg-linear-to-b from-orange-50 to-white shadow-orange-500/10',
                  badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
                  medalIcon: '🥉',
                  title: '3rd Place • Bronze',
                  pctColor: 'text-orange-700'
                }
              ][idx] || {
                ring: 'border-stone-200 bg-white shadow-xs',
                badgeBg: 'bg-stone-100 text-stone-800 border-stone-200',
                medalIcon: '🎖️',
                title: `Rank #${idx + 1}`,
                pctColor: 'text-stone-700'
              };

              return (
                <div 
                  key={student.id || student.roll_number}
                  className={`relative p-5 rounded-2xl border ${medalStyles.ring} shadow-xs flex flex-col justify-between transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${medalStyles.badgeBg}`}>
                      <span>{medalStyles.medalIcon}</span>
                      <span>{medalStyles.title}</span>
                    </span>
                    <span className={`text-xl font-black ${medalStyles.pctColor}`}>
                      {student.attendance_percentage}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-3.5 my-4">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-stone-100 border-2 border-white shadow-xs shrink-0 flex items-center justify-center">
                      {student.photo_thumbnail ? (
                        <img 
                          src={student.photo_thumbnail} 
                          alt={student.name} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <span className="text-base font-extrabold text-stone-500">
                          {student.name?.charAt(0) || 'S'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-stone-900 truncate" title={student.name}>
                        {student.name}
                      </h3>
                      <div className="text-[11px] font-mono text-stone-500 font-semibold">
                        {student.roll_number}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate mt-0.5">
                        {student.branch} • Sem {student.semester}-{student.section}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100/90 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Lectures Attended</span>
                    <span className="font-bold text-stone-800">
                      {student.attended_classes} of {student.total_classes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🏅 Top Achievers Merit List Modal */}
      {isAchieversModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">College Attendance Merit List</h3>
                  <p className="text-xs text-stone-400">Top ranked students by overall attendance percentage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAchieversModalOpen(false)}
                className="h-8 w-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {(kpiStats?.topAchievers || []).map((st: any, i: number) => (
                <div 
                  key={st.id || st.roll_number}
                  className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-stone-50 transition border border-stone-100"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black w-7 text-center text-stone-400">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-stone-100 shrink-0 flex items-center justify-center border border-stone-200">
                      {st.photo_thumbnail ? (
                        <img src={st.photo_thumbnail} alt={st.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-stone-500">{st.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">{st.name}</div>
                      <div className="text-[10px] text-stone-400">{st.roll_number} • {st.branch} (Sem {st.semester}-{st.section})</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-amber-600">{st.attendance_percentage}%</div>
                    <div className="text-[10px] text-stone-400">{st.attended_classes}/{st.total_classes} classes</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={() => setIsAchieversModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition cursor-pointer"
              >
                Close Merit List
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 📋 Student Live-Feed Table Card (Exact match to Reference Image) */}
      <div className="rounded-3xl bg-white border border-stone-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Recent Attendance Activity</h2>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
            Live Updates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 font-semibold text-[11px]">
                <th className="pb-3 pl-2">Roll Number</th>
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
                    {(dept?.branch || 'General').replace('& Engineering', '').replace('Engineering', 'Engg')}
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
      </>
      )}

    </AppleDeluxeShell>
  );
}
