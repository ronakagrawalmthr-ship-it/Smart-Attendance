'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  MessageSquare, 
  RefreshCw,
  TrendingUp,
  UserCog,
  Layers,
  Sparkles,
  UserCheck,
  Award,
  ChevronRight,
  HelpCircle,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

interface DaySession {
  log_id: number;
  session_id: number;
  time: string;
  subject_code: string;
  subject_name: string;
  is_guest_lecture: boolean;
  conducted_by: string;
  session_type: string;
  notes?: string;
  is_present: boolean;
  status: string;
  status_tag: string;
  remarks?: string;
}

interface DayWiseItem {
  date: string;
  formatted_date: string;
  day_name: string;
  total_lectures: number;
  attended_lectures: number;
  absent_lectures: number;
  turnout_pct: number;
  sessions: DaySession[];
}

interface SubjectItem {
  code: string;
  name: string;
  semester?: number;
  total: number;
  attended: number;
  absent: number;
  pct: number;
  is_safe: boolean;
  teachers: string[];
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subject' | 'day' | 'recent'>('subject');

  const [studentData, setStudentData] = useState({
    name: 'Aarav Sharma',
    roll: '23CSE001',
    semester: 6,
    academicYear: 3,
    academicYearLabel: '3rd Year (Semester 6)',
    stage: '3rd Year (Junior Batch)',
    branch: 'Computer Science & Engineering',
    overallAttendance: 92.3,
    eligibility: 'Eligible for Exams',
    totalClasses: 13,
    attendedClasses: 12,
    absentClasses: 1,
    subjects: [] as SubjectItem[],
    guestLectures: {
      total: 0,
      attended: 0,
      pct: 0.0,
      topics: [] as any[]
    },
    dayWise: [] as DayWiseItem[],
    recentLogs: [] as any[]
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/portal/metrics`, { headers });

      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setStudentData({
            name: data.profile?.name || 'Aarav Sharma',
            roll: data.profile?.roll_number || '23CSE001',
            semester: data.profile?.semester || 6,
            academicYear: data.profile?.academic_year || 3,
            academicYearLabel: data.profile?.academic_year_label || '3rd Year (Semester 6)',
            stage: data.profile?.stage || '3rd Year (Junior Batch)',
            branch: data.profile?.branch || 'Computer Science & Engineering',
            overallAttendance: data.metrics.overall_percentage,
            totalClasses: data.metrics.total_classes,
            attendedClasses: data.metrics.attended_classes,
            absentClasses: data.metrics.absent_classes || (data.metrics.total_classes - data.metrics.attended_classes),
            eligibility: data.metrics.overall_percentage >= 75 ? 'Eligible for University Exams' : 'Defaulter Risk Warning (<75%)',
            subjects: data.subjects || [],
            guestLectures: data.guest_lectures || { total: 0, attended: 0, pct: 0, topics: [] },
            dayWise: data.day_wise || [],
            recentLogs: data.recent_logs || []
          });
        }
      }
    } catch {
      console.log("Using cached/preview attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const isAboveThreshold = studentData.overallAttendance >= 75;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Student Profile & Academic Year Header */}
      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-cyan-500/20">
            {studentData.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{studentData.name}</h1>
              
              {/* Dynamic Academic Year Badge */}
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold flex items-center space-x-1.5 shadow-sm">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                <span>{studentData.academicYearLabel}</span>
              </span>

              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                {studentData.stage}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Roll No: <span className="text-slate-200 font-mono font-bold">{studentData.roll}</span> • {studentData.branch} Department
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Attendance"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/profile"
            className="flex-1 sm:flex-none py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
          >
            <UserCog className="h-4 w-4 text-cyan-400" />
            <span>Profile & Year</span>
          </Link>
          <Link
            href="/settings"
            className="flex-1 sm:flex-none py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
          >
            <Settings className="h-4 w-4 text-amber-400" />
            <span>Settings</span>
          </Link>
          <Link
            href="/grievance"
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Dispute an Absence</span>
          </Link>
        </div>
      </header>

      {/* Promotion / Academic Year Notice Banner */}
      <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-4 backdrop-blur-md flex items-start space-x-3 text-xs">
        <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 text-slate-300">
          <span className="font-bold text-white">Institutional Academic Year Synchronization: </span>
          <span>
            Your profile is currently active in <strong>{studentData.academicYearLabel}</strong>. When you are promoted to the next semester/year by your HOD or Registrar, your academic year updates automatically across your profile, attendance ledgers, and exam hall tickets.
          </span>
        </div>
      </div>

      {/* Total Attendance KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Percentage Gauge */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Total Cumulative Attendance</span>
          <div className="flex items-baseline space-x-2 my-2">
            <span className={`text-5xl font-black tracking-tight ${isAboveThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
              {studentData.overallAttendance.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">/ 100%</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-2">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${isAboveThreshold ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-400'}`}
              style={{ width: `${Math.min(studentData.overallAttendance, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-3 block">
            Minimum required institutional cutoff is <strong>75.0%</strong>
          </span>
        </div>

        {/* Classes Breakdown */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Lectures Turnout Ratio</span>
          <div className="space-y-2 my-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Lectures Attended</span>
              <span className="font-extrabold text-emerald-400">{studentData.attendedClasses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Lectures Held</span>
              <span className="font-bold text-white">{studentData.totalClasses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Missed / Absent Classes</span>
              <span className="font-bold text-rose-400">{studentData.absentClasses}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-cyan-400 mt-2">
            <TrendingUp className="h-4 w-4" />
            <span>Biometrically Verified across All Faculty</span>
          </div>
        </div>

        {/* University Exam Eligibility */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">University Exam Eligibility</span>
          <div className="my-2">
            <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              isAboveThreshold 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              {isAboveThreshold ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-rose-400" />}
              <span>{studentData.eligibility}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {isAboveThreshold 
              ? 'Your attendance complies with university academic regulations. Hall ticket is approved.' 
              : 'You are currently below 75%. Attend upcoming lectures or submit duty leave to avoid debarment.'}
          </p>
        </div>
      </div>

      {/* Main Attendance View Tabs: Subject-Wise vs Day-Wise vs Recent Logs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex rounded-2xl bg-slate-900 p-1.5 border border-slate-800 shadow-lg">
          <button
            onClick={() => setActiveTab('subject')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'subject'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Subject-Wise Attendance ({studentData.subjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('day')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'day'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Day-Wise Attendance ({studentData.dayWise.length} Days)</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'recent'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Recent Scans</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBJECT-WISE ATTENDANCE */}
      {activeTab === 'subject' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                <span>Curriculum Subject Attendance & Conductor Roster</span>
              </h2>
              <span className="text-xs text-slate-400">
                Current Standing in {studentData.academicYearLabel}
              </span>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studentData.subjects.map((sub) => {
                const subOk = sub.pct >= 75;
                return (
                  <div key={sub.code} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 shadow-md hover:border-slate-700 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                          {sub.code}
                        </span>
                        <h3 className="font-bold text-sm text-white mt-1.5">{sub.name}</h3>
                      </div>
                      <span className={`text-base font-extrabold ${subOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {sub.pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${subOk ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(sub.pct, 100)}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-slate-400 flex justify-between font-medium">
                      <span>{sub.attended} Attended</span>
                      <span>{sub.total} Held</span>
                      <span className={subOk ? 'text-emerald-400' : 'text-rose-400'}>
                        {subOk ? '✓ On Track' : '⚠ Defaulter'}
                      </span>
                    </div>

                    {/* Faculty Conductors */}
                    {sub.teachers && sub.teachers.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center space-x-1.5">
                        <UserCheck className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span className="truncate">Faculty: {sub.teachers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Special Guest Lectures Card */}
            {studentData.guestLectures && studentData.guestLectures.total > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-950/60 to-slate-950/60 border border-purple-500/40 p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Departmental Guest Lectures & Industry Workshops</h3>
                      <p className="text-[11px] text-slate-400">Invited expert talks attended this academic year</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-purple-300">
                      {studentData.guestLectures.attended} / {studentData.guestLectures.total}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-bold">({studentData.guestLectures.pct}%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {studentData.guestLectures.topics.map((top: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{top.topic}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Speaker: {top.conducted_by} • {top.date}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        top.is_present ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {top.is_present ? 'Attended' : 'Missed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DAY-WISE ATTENDANCE CALENDAR */}
      {activeTab === 'day' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Day-By-Day Attendance Journal</span>
            </h2>
            <span className="text-xs text-slate-500">
              Showing {studentData.dayWise.length} days recorded
            </span>
          </div>

          {studentData.dayWise.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Calendar className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-400">No daily attendance logs recorded yet.</p>
              <p className="text-xs text-slate-500 mt-1">Daily attendance appears automatically once faculty submits class records.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentData.dayWise.map((day) => (
                <div 
                  key={day.date}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-xl space-y-3 shadow-lg"
                >
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-sm text-white">
                        {day.date.split('-')[2]}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center space-x-2">
                          <span>{day.formatted_date}</span>
                          <span className="text-xs font-normal text-slate-400">• {day.day_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {day.total_lectures} lecture{day.total_lectures > 1 ? 's' : ''} scheduled
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-semibold text-slate-300">
                        Day Turnout: <strong className="text-emerald-400">{day.attended_lectures}</strong> / {day.total_lectures} ({day.turnout_pct}%)
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        day.turnout_pct === 100 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : (day.turnout_pct > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                      }`}>
                        {day.turnout_pct === 100 ? 'Full Attendance' : (day.turnout_pct > 0 ? 'Partial' : 'Absent')}
                      </span>
                    </div>
                  </div>

                  {/* Day Sessions List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {day.sessions.map((sess) => (
                      <div 
                        key={sess.session_id}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between space-y-2 ${
                          sess.is_present
                            ? 'bg-slate-950/80 border-emerald-500/30'
                            : 'bg-slate-950/80 border-rose-500/30 opacity-90'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {sess.time}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              sess.is_present 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {sess.status}
                            </span>
                          </div>

                          <div className="font-bold text-white text-xs line-clamp-1">
                            {sess.subject_name}
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <UserCheck className="h-3 w-3 text-indigo-400 shrink-0" />
                            <span className="truncate">By: {sess.conducted_by}</span>
                          </div>

                          {sess.notes && (
                            <div className="text-[10px] text-slate-500 italic truncate">
                              "{sess.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECENT SCANS LOG */}
      {activeTab === 'recent' && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <span>Biometric Classroom Scan Stream</span>
            </h2>
            <Link
              href="/grievance"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center space-x-1"
            >
              <span>Dispute an entry</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject / Topic</th>
                  <th className="py-3 px-4">Conducted By</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {studentData.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono">{log.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{log.subject}</td>
                    <td className="py-3.5 px-4 text-indigo-300">{log.conducted_by || 'Faculty'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{log.time}</td>
                    <td className="py-3.5 px-4 text-right">
                      {log.status === 'Present' ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Present (Biometric Match)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-rose-400 font-semibold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Absent</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
