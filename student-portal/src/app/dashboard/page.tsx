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
      <header className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-stone-900 flex items-center justify-center font-bold text-2xl text-white shadow-sm">
            {studentData.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{studentData.name}</h1>
              
              {/* Dynamic Academic Year Badge */}
              <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 font-semibold flex items-center space-x-1.5 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                <span>{studentData.academicYearLabel}</span>
              </span>

              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium">
                {studentData.stage}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Roll No: <span className="text-stone-900 font-mono font-semibold">{studentData.roll}</span> • {studentData.branch}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={fetchMetrics}
            className="p-2.5 rounded-2xl bg-white border border-stone-200/80 text-stone-600 hover:text-stone-900 shadow-xs transition"
            title="Refresh Attendance"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/profile"
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-2xl bg-white border border-stone-200/80 text-stone-700 hover:text-stone-900 text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <UserCog className="h-4 w-4 text-stone-500" />
            <span>Profile</span>
          </Link>
          <Link
            href="/settings"
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-2xl bg-white border border-stone-200/80 text-stone-700 hover:text-stone-900 text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <Settings className="h-4 w-4 text-stone-500" />
            <span>Settings</span>
          </Link>
          <Link
            href="/grievance"
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium shadow-sm transition flex items-center justify-center space-x-2"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Dispute an Absence</span>
          </Link>
        </div>
      </header>

      {/* Institutional Academic Year Notice Banner */}
      <div className="rounded-2xl bg-[#FAF7F2] border border-stone-200/80 p-4 flex items-start space-x-3 text-xs shadow-2xs">
        <div className="p-1 rounded-lg bg-stone-200/60 text-stone-600 shrink-0 mt-0.5">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 text-stone-600">
          <span className="font-semibold text-stone-900">Academic Standing Sync: </span>
          <span>
            Currently verified in <strong>{studentData.academicYearLabel}</strong>. Updates dynamically when semester promotion is recorded by the Academic Registrar.
          </span>
        </div>
      </div>

      {/* Total Attendance KPI Section: Apple Health Ring & Pastel Squircles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Apple Health Circular Gradient Gauge Card */}
        <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 flex flex-col justify-between backdrop-blur-xl shadow-sm">
          <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400 mb-1">
            Overall Turnout Standing
          </span>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="flex items-baseline space-x-1">
                <span className={`text-4xl font-extrabold tracking-tight ${isAboveThreshold ? 'text-stone-900' : 'text-rose-600'}`}>
                  {studentData.overallAttendance.toFixed(1)}%
                </span>
                <span className="text-xs text-stone-400">/ 100</span>
              </div>
              <span className={`inline-block mt-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isAboveThreshold 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' 
                  : 'bg-rose-50 text-rose-700 border-rose-200/70'
              }`}>
                {isAboveThreshold ? 'Safe Standing' : 'Defaulter Risk'}
              </span>
            </div>

            {/* Apple Activity Circular Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="38" stroke="#F5F5F4" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="url(#appleHealthStudentGrad)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(studentData.overallAttendance, 100) / 100)}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="appleHealthStudentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-[11px] font-bold text-stone-700">
                {Math.round(studentData.overallAttendance)}%
              </div>
            </div>
          </div>
          <span className="text-[11px] text-stone-400 pt-2 border-t border-stone-100">
            Mandated threshold: <strong>75.0%</strong>
          </span>
        </div>

        {/* Classes Breakdown in Soft Lilac Squircle */}
        <div className="rounded-3xl bg-[#F7F4FA]/90 border border-purple-100 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-purple-700 mb-1">
            Lectures Attendance Ratio
          </span>
          <div className="space-y-2 py-1">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Lectures Attended</span>
              <span className="font-bold text-emerald-700 text-sm">{studentData.attendedClasses}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Total Lectures Held</span>
              <span className="font-semibold text-stone-900 text-sm">{studentData.totalClasses}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Missed Lectures</span>
              <span className="font-bold text-rose-600 text-sm">{studentData.absentClasses}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-purple-700 font-medium pt-2 border-t border-purple-100/60">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Facial Biometric Verified</span>
          </div>
        </div>

        {/* University Exam Clearance in Soft Mint Squircle */}
        <div className="rounded-3xl bg-[#E8F8F0]/90 border border-emerald-100 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 mb-1">
            University Exam Eligibility
          </span>
          <div className="my-2">
            <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isAboveThreshold 
                ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200' 
                : 'bg-rose-100/70 text-rose-800 border-rose-200'
            }`}>
              {isAboveThreshold ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
              <span>{studentData.eligibility}</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 pt-2 border-t border-emerald-100/60">
            {isAboveThreshold 
              ? 'Attendance complies with regulations. Exam hall ticket is approved.' 
              : 'Turnout is below 75%. Attend upcoming lectures or dispute marked absences.'}
          </p>
        </div>
      </div>

      {/* Segmented Control Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="inline-flex rounded-2xl bg-stone-200/60 p-1 border border-stone-300/40 shadow-xs">
          <button
            onClick={() => setActiveTab('subject')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
              activeTab === 'subject'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Subject-Wise ({studentData.subjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('day')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
              activeTab === 'day'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Day-Wise ({studentData.dayWise.length} Days)</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
              activeTab === 'recent'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Recent Scans</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBJECT-WISE ATTENDANCE */}
      {activeTab === 'subject' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-stone-700" />
                <span>Curriculum Subject Attendance & Conductor Roster</span>
              </h2>
              <span className="text-xs text-stone-400">
                Standing in {studentData.academicYearLabel}
              </span>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {studentData.subjects.map((sub) => {
                const subOk = sub.pct >= 75;
                return (
                  <div key={sub.code} className="p-5 rounded-3xl bg-stone-50/80 border border-stone-200/70 space-y-3 shadow-2xs hover:shadow-xs transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-stone-700 px-2 py-0.5 rounded-lg bg-stone-200/60 border border-stone-300/60">
                          {sub.code}
                        </span>
                        <h3 className="font-bold text-xs text-stone-900 mt-1.5 line-clamp-1">{sub.name}</h3>
                      </div>
                      <span className={`text-base font-extrabold ${subOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {sub.pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${subOk ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(sub.pct, 100)}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-stone-500 flex justify-between font-medium">
                      <span>{sub.attended} Attended</span>
                      <span>{sub.total} Held</span>
                      <span className={subOk ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                        {subOk ? '✓ Safe' : '⚠ Defaulter'}
                      </span>
                    </div>

                    {/* Faculty Conductors */}
                    {sub.teachers && sub.teachers.length > 0 && (
                      <div className="pt-2 border-t border-stone-200/60 text-[10px] text-stone-500 flex items-center space-x-1.5">
                        <UserCheck className="h-3 w-3 text-stone-400 shrink-0" />
                        <span className="truncate">Faculty: {sub.teachers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Special Guest Lectures Card */}
            {studentData.guestLectures && studentData.guestLectures.total > 0 && (
              <div className="rounded-2xl bg-[#F7F4FA] border border-purple-200/70 p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-stone-900">Guest Lectures & Industry Workshops</h3>
                      <p className="text-[11px] text-stone-500">Invited expert talks attended this academic term</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-purple-800">
                      {studentData.guestLectures.attended} / {studentData.guestLectures.total}
                    </span>
                    <span className="text-xs text-stone-500 ml-1.5">({studentData.guestLectures.pct}%)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {studentData.guestLectures.topics.map((top: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-white border border-stone-200/70 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-stone-900">{top.topic}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">Speaker: {top.conducted_by} • {top.date}</div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                        top.is_present ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
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

      {/* TAB 2: DAY-WISE ATTENDANCE */}
      {activeTab === 'day' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-stone-600" />
              <span>Day-By-Day Attendance Journal</span>
            </h2>
            <span className="text-xs text-stone-400">
              {studentData.dayWise.length} days recorded
            </span>
          </div>

          {studentData.dayWise.length === 0 ? (
            <div className="py-16 text-center text-stone-400 bg-white/80 rounded-3xl border border-stone-200/80 shadow-sm">
              <Calendar className="h-8 w-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs font-bold text-stone-700">No daily attendance logs recorded yet.</p>
              <p className="text-[11px] text-stone-400 mt-1">Daily records appear automatically once faculty submits attendance.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentData.dayWise.map((day) => (
                <div 
                  key={day.date}
                  className="rounded-3xl bg-white/80 border border-stone-200/80 p-5 backdrop-blur-xl space-y-3 shadow-sm"
                >
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-900">
                        {day.date.split('-')[2]}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 text-xs flex items-center space-x-2">
                          <span>{day.formatted_date}</span>
                          <span className="text-stone-400 font-normal">• {day.day_name}</span>
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {day.total_lectures} lecture{day.total_lectures > 1 ? 's' : ''} scheduled
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-medium text-stone-600">
                        Turnout: <strong className="text-stone-900">{day.attended_lectures}</strong> / {day.total_lectures} ({day.turnout_pct}%)
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        day.turnout_pct === 100 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (day.turnout_pct > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200')
                      }`}>
                        {day.turnout_pct === 100 ? 'Full Turnout' : (day.turnout_pct > 0 ? 'Partial' : 'Absent')}
                      </span>
                    </div>
                  </div>

                  {/* Day Sessions List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {day.sessions.map((sess) => (
                      <div 
                        key={sess.session_id}
                        className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between space-y-2 ${
                          sess.is_present
                            ? 'bg-stone-50 border-emerald-200/80'
                            : 'bg-stone-50 border-rose-200/80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-[10px] font-medium text-stone-400">
                              {sess.time}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              sess.is_present 
                                ? 'bg-emerald-100/70 text-emerald-800' 
                                : 'bg-rose-100/70 text-rose-800'
                            }`}>
                              {sess.status}
                            </span>
                          </div>

                          <div className="font-bold text-stone-900 text-xs line-clamp-1">
                            {sess.subject_name}
                          </div>

                          <div className="text-[11px] text-stone-500 flex items-center space-x-1">
                            <UserCheck className="h-3 w-3 text-stone-400 shrink-0" />
                            <span className="truncate">By: {sess.conducted_by}</span>
                          </div>

                          {sess.notes && (
                            <div className="text-[10px] text-stone-400 italic truncate">
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
        <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-stone-100 pb-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-stone-700" />
              <span>Biometric Classroom Scan Stream</span>
            </h2>
            <Link
              href="/grievance"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition flex items-center space-x-1"
            >
              <span>Dispute an entry</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200/70 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject / Topic</th>
                  <th className="py-3 px-4">Conducted By</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {studentData.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-stone-500">{log.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-stone-900">{log.subject}</td>
                    <td className="py-3.5 px-4 text-stone-600">{log.conducted_by || 'Faculty'}</td>
                    <td className="py-3.5 px-4 text-stone-400">{log.time}</td>
                    <td className="py-3.5 px-4 text-right">
                      {log.status === 'Present' ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Present (Biometric Match)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-rose-600 font-semibold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
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
