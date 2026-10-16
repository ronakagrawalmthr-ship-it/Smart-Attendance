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
  Sparkles,
  Award,
  ChevronRight,
  HelpCircle,
  Settings,
  ScanFace,
  Check,
  UserCheck,
  Sliders,
  Coffee,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Compass,
  QrCode,
  Camera,
  Bot,
  MapPin,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

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
  const [simulatorDelta, setSimulatorDelta] = useState<number>(0);

  const [studentData, setStudentData] = useState({
    name: '',
    roll: '',
    semester: 1,
    section: 'A',
    academicYear: 1,
    academicYearLabel: '',
    stage: '',
    branch: '',
    photoThumbnail: '',
    overallAttendance: 0,
    eligibility: 'Loading status...',
    totalClasses: 0,
    attendedClasses: 0,
    absentClasses: 0,
    subjects: [] as SubjectItem[],
    guestLectures: {
      total: 0,
      attended: 0,
      pct: 0,
      topics: [] as string[]
    },
    dayWise: [] as DayWiseItem[],
    recentLogs: [] as any[]
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/portal/metrics`);

      if (res.ok) {
        const data = await res.json();
        if (data.profile && typeof window !== 'undefined') {
          if (data.profile.name) localStorage.setItem('student_name', data.profile.name);
          if (data.profile.roll_number) localStorage.setItem('student_roll', data.profile.roll_number);
          if (data.profile.branch) localStorage.setItem('student_branch', data.profile.branch);
          if (data.profile.semester) {
            localStorage.setItem('student_semester', String(data.profile.semester));
            localStorage.setItem('student_semester_label', `Sem ${data.profile.semester} • Sec ${data.profile.section || 'A'} • ${data.profile.branch || 'B.Tech'}`);
          }
          if (data.profile.section) localStorage.setItem('student_section', data.profile.section);
          if (data.profile.photo_thumbnail) localStorage.setItem('student_avatar', data.profile.photo_thumbnail);
        }

        if (data.metrics) {
          setStudentData(prev => ({
            ...prev,
            name: data.profile?.name || prev.name,
            roll: data.profile?.roll_number || prev.roll,
            semester: data.profile?.semester ?? prev.semester,
            section: data.profile?.section || prev.section || 'A',
            academicYear: data.profile?.academic_year ?? prev.academicYear,
            academicYearLabel: data.profile?.academic_year_label || prev.academicYearLabel || `Year ${data.profile?.academic_year || 1}`,
            stage: data.profile?.stage || prev.stage || 'Academic Batch',
            branch: data.profile?.branch || prev.branch || 'Engineering',
            photoThumbnail: data.profile?.photo_thumbnail || prev.photoThumbnail,
            overallAttendance: Number(data.metrics.overall_percentage) || 0,
            totalClasses: Number(data.metrics.total_classes) || 0,
            attendedClasses: Number(data.metrics.attended_classes) || 0,
            absentClasses: Number(data.metrics.absent_classes ?? (data.metrics.total_classes - data.metrics.attended_classes)) || 0,
            eligibility: Number(data.metrics.total_classes) === 0 ? 'Classes Not Yet Started' : (data.metrics.overall_percentage >= 75 ? 'Eligible for University Exams' : 'Defaulter Risk Warning (<75%)'),
            subjects: data.subjects || [],
            guestLectures: data.guest_lectures || { total: 0, attended: 0, pct: 0, topics: [] },
            dayWise: data.day_wise || [],
            recentLogs: data.recent_logs || []
          }));
        }
      }
    } catch {
      console.log("Using cached/preview attendance data.");
    } finally {
      setLoading(false);
    }
  };

  // 📅 Timetable & Gemini AI Advisor States
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [scheduleDay, setScheduleDay] = useState<string>('Today');
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [aiAdvisor, setAiAdvisor] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchTodaySchedule = async () => {
    try {
      setLoadingSchedule(true);
      const res = await authFetch(`${API_BASE_URL}/timetable/today`);
      if (res && res.ok) {
        const data = await res.json();
        setTodaySchedule(data.slots || []);
        setScheduleDay(data.day_of_week || 'Today');
      }
    } catch (e) {
      console.error('Error fetching today schedule:', e);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchAiAdvisor = async () => {
    try {
      setLoadingAi(true);
      const res = await authFetch(`${API_BASE_URL}/timetable/ai-advisor`);
      if (res && res.ok) {
        const data = await res.json();
        setAiAdvisor(data.ai_advisory);
      }
    } catch (e) {
      console.error('Error fetching AI advisor:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedName = localStorage.getItem('student_name');
      const cachedRoll = localStorage.getItem('student_roll');
      if (cachedName || cachedRoll) {
        setStudentData(prev => ({
          ...prev,
          name: cachedName || prev.name,
          roll: cachedRoll || prev.roll,
        }));
      }
    }
    fetchMetrics();
    fetchTodaySchedule();
    fetchAiAdvisor();

    // 📡 Live Sync Heartbeat: Polls SQLite DB every 3s to update student attendance live
    const liveInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await authFetch(`${API_BASE_URL}/portal/metrics`);
        if (res.ok) {
          const data = await res.json();
          setStudentData(prev => ({
            ...prev,
            name: data.profile?.name || prev.name,
            roll: data.profile?.roll_number || prev.roll,
            semester: data.profile?.semester ?? prev.semester,
            section: data.profile?.section || prev.section,
            academicYear: data.profile?.academic_year ?? prev.academicYear,
            academicYearLabel: data.profile?.academic_year_label || prev.academicYearLabel,
            stage: data.profile?.stage || prev.stage,
            branch: data.profile?.branch || prev.branch,
            photoThumbnail: data.profile?.photo_thumbnail || prev.photoThumbnail,
            overallAttendance: data.metrics?.overall_percentage ?? prev.overallAttendance,
            totalClasses: data.metrics?.total_classes ?? prev.totalClasses,
            attendedClasses: data.metrics?.attended_classes ?? prev.attendedClasses,
            absentClasses: data.metrics?.absent_classes ?? prev.absentClasses,
            subjects: (data.subjects && data.subjects.length > 0) ? data.subjects : ((data.subject_wise && data.subject_wise.length > 0) ? data.subject_wise : prev.subjects),
            recentLogs: (data.recent_logs && data.recent_logs.length > 0) ? data.recent_logs : ((data.recent_attendance && data.recent_attendance.length > 0) ? data.recent_attendance : prev.recentLogs)
          }));
        }
      } catch (e) {
        // Silent background heartbeat catch
      }
    }, 3000);

    return () => clearInterval(liveInterval);
  }, []);

  const isAboveThreshold = studentData.overallAttendance >= 75;
  const total = studentData.totalClasses;
  const attended = studentData.attendedClasses;
  const safeAbsences = total > 0 ? Math.max(0, Math.floor(attended / 0.75 - total)) : 0;
  const neededClasses = (total > 0 && !isAboveThreshold) ? Math.ceil((0.75 * total - attended) / 0.25) : 0;
  const absentRate = total > 0 ? ((studentData.absentClasses / total) * 100).toFixed(1) : '0.0';
  const attendanceQuality = studentData.overallAttendance >= 85 ? 'Excellent' : studentData.overallAttendance >= 75 ? 'Good' : 'Needs Attention';
  const nextSubjectText = studentData.subjects && studentData.subjects.length > 0 
    ? `Next Class: ${studentData.subjects[0].name}`
    : 'Academic Schedule Active';

  // 🧮 What-If Simulator Predictive Calculations:
  // If delta < 0: Student misses |delta| upcoming classes (taking rest)
  // If delta > 0: Student attends delta upcoming classes
  const simulatedAttended = simulatorDelta >= 0 ? attended + simulatorDelta : attended;
  const simulatedTotal = total + Math.abs(simulatorDelta);
  const simulatedPct = simulatedTotal > 0 ? (simulatedAttended / simulatedTotal) * 100 : (total > 0 ? (attended / total) * 100 : 0);
  const pctDiff = simulatedPct - (total > 0 ? (attended / total) * 100 : 0);
  const isSimulatedSafe = simulatedPct >= 75.0;

  return (
    <AppleDeluxeShell 
      studentName={studentData.name} 
      rollNumber={studentData.roll}
      semester={`Sem ${studentData.semester} • Sec ${studentData.section} • ${studentData.branch}`}
      studentAvatar={studentData.photoThumbnail || undefined}
    >
      <div className="w-full space-y-6">
        
        {/* ⚡ Dynamic Anti-Proxy QR Scanner Quick Check-in Banner */}
        <div className="rounded-[26px] bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-6 border border-stone-850 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <QrCode className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-extrabold text-white">Live Classroom QR Check-in</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-stone-950">
                  New 10s Token
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Teacher displaying a rotating dynamic QR on screen? Scan it with your device camera to automatically mark attendance.
              </p>
            </div>
          </div>
          <Link
            href="/scan"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
          >
            <Camera className="h-4 w-4" />
            <span>Launch Scanner</span>
          </Link>
        </div>

        {/* 📅 Today's Live Academic Schedule Widget */}
        <div className="rounded-[28px] bg-white border border-stone-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60 font-bold">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 tracking-tight flex items-center space-x-2">
                  <span>Today's Academic Schedule</span>
                  <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                    {scheduleDay}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400 font-medium">
                  Official university timetable for Sem {studentData.semester} Sec {studentData.section}
                </p>
              </div>
            </div>

            <button
              onClick={fetchTodaySchedule}
              disabled={loadingSchedule}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              title="Refresh Timetable"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSchedule ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {loadingSchedule && todaySchedule.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 flex items-center justify-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-stone-500" />
              <span>Fetching departmental timetable...</span>
            </div>
          ) : todaySchedule.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 bg-stone-50/60 rounded-2xl border border-stone-100">
              No lectures scheduled for {scheduleDay}. Enjoy your academic recess!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {todaySchedule.map((slot: any) => (
                <div
                  key={slot.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                    slot.is_ongoing
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20 shadow-sm'
                      : slot.is_past
                      ? 'bg-stone-50/60 border-stone-200/70 opacity-75'
                      : 'bg-white border-stone-200/90 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-stone-600 flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-stone-400" />
                      <span>{slot.start_time} - {slot.end_time}</span>
                    </span>
                    {slot.is_ongoing ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Live Now</span>
                      </span>
                    ) : slot.is_past ? (
                      <span className="text-[10px] font-semibold text-stone-400">Concluded</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">Upcoming</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-stone-900 line-clamp-1">
                      {slot.subject_name}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium line-clamp-1 mt-0.5">
                      {slot.teacher_name}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 font-medium flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      <span>{slot.room_number || 'LH-101'}</span>
                    </span>

                    {slot.is_ongoing ? (
                      <Link
                        href="/scan"
                        className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200"
                      >
                        <Zap className="h-3 w-3" />
                        <span>Scan QR</span>
                      </Link>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-stone-400">
                        {slot.session_type || 'Lecture'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🏆 Top Section: Apple Fitness-Ring Card + 4 Colourful Pastel Squircles (Exact Reference Match) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          
          {/* Left Column: Attendance Fitness-Ring Card (md:col-span-5) */}
          <div className="md:col-span-5 rounded-[28px] bg-white p-5 sm:p-6 border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Biometric Attendance
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isAboveThreshold 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}>
                  {isAboveThreshold ? 'Safe Standing' : 'Debarment Risk'}
                </span>
              </div>

              {/* Fitness Ring Gauge & Percentage Display */}
              <div className="flex items-center space-x-6 my-5">
                {/* SVG Apple Circular Ring */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-28 h-28 -rotate-90">
                    <circle cx="56" cy="56" r="44" stroke="#F0ECE4" strokeWidth="9" fill="none" />
                    <circle
                      cx="56"
                      cy="56"
                      r="44"
                      stroke="url(#studentFitnessGradient)"
                      strokeWidth="9"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(studentData.overallAttendance, 100) / 100)}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="studentFitnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-extrabold text-stone-900 tracking-tight block leading-none">
                      {studentData.overallAttendance.toFixed(1)}%
                    </span>
                    <span className={`text-[9px] font-bold block mt-0.5 ${
                      isAboveThreshold ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isAboveThreshold ? 'On Track' : 'Below 75%'}
                    </span>
                  </div>
                </div>

                {/* Ring Metadata Details */}
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-lg font-extrabold text-stone-900 tracking-tight leading-tight">
                    {studentData.overallAttendance >= 75 ? 'Academic Criteria Satisfied' : 'Low Attendance Alert'}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Mandatory Cutoff: <span className="text-stone-800 font-bold">75.0%</span>
                  </p>
                  <div className={`inline-flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl border ${
                    isAboveThreshold 
                      ? 'text-blue-700 bg-blue-50/80 border-blue-200/60' 
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}>
                    <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${isAboveThreshold ? 'text-blue-600' : 'text-rose-600'}`} />
                    <span>
                      {isAboveThreshold 
                        ? (safeAbsences > 0 ? `Safe Margin: ${safeAbsences} absences allowed` : 'Critical: No absences allowed')
                        : `Recovery: Must attend next ${neededClasses} lectures`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions at bottom of ring card */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">{nextSubjectText}</span>
              <button 
                onClick={fetchMetrics}
                className="inline-flex items-center space-x-1 text-blue-600 font-bold hover:text-blue-800 transition"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Right Column: 4 Colourful Pastel Squircle Tiles (md:col-span-7) */}
          <div className="md:col-span-7 grid grid-cols-2 gap-3.5 sm:gap-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            
            {/* 🪻 Lilac Squircle: Classes Attended */}
            <div className="rounded-[26px] bg-[#F3EFFE] border border-[#E5DCFA] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6D42C7]">Attended</span>
                <div className="h-8 w-8 rounded-xl bg-purple-100/90 text-purple-700 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {studentData.attendedClasses}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Classes verified in Sem {studentData.semester}
                </span>
              </div>
              <div className="pt-2 border-t border-purple-200/50 flex items-center justify-between text-[11px]">
                <span className="text-purple-700 font-semibold">Verified presence</span>
                <span className="font-mono text-purple-900 font-bold">100% Face Synced</span>
              </div>
            </div>

            {/* 🩵 Sky Blue Squircle: Total Classes Held */}
            <div className="rounded-[26px] bg-[#EDF6FE] border border-[#DAECFC] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B66B2]">Total Held</span>
                <div className="h-8 w-8 rounded-xl bg-blue-100/90 text-blue-700 flex items-center justify-center shadow-2xs">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {studentData.totalClasses}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Curriculum lectures conducted
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200/50 flex items-center justify-between text-[11px]">
                <span className="text-blue-700 font-semibold">Semester Schedule</span>
                <span className="font-mono text-blue-900 font-bold truncate max-w-[120px]">{studentData.branch || 'Academic Dept'}</span>
              </div>
            </div>

            {/* 🍑 Coral Squircle: Missed Classes / Absences */}
            <div className="rounded-[26px] bg-[#FEF1F0] border border-[#FCD8D4] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C93B2B]">Missed</span>
                <div className="h-8 w-8 rounded-xl bg-rose-100/90 text-rose-700 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {studentData.absentClasses}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Unexcused absences
                </span>
              </div>
              <div className="pt-2 border-t border-rose-200/50 flex items-center justify-between text-[11px]">
                <Link href="/grievance" className="text-rose-700 font-semibold hover:underline">
                  Dispute an absence →
                </Link>
                <span className="font-mono text-rose-900 font-bold">{absentRate}% Rate</span>
              </div>
            </div>

            {/* 🍃 Mint Squircle: Punctuality / On-Time */}
            <div className="rounded-[26px] bg-[#EFFBF5] border border-[#CEF4DE] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F7A4D]">Punctuality</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {studentData.overallAttendance.toFixed(1)}%
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Verified biometric presence
                </span>
              </div>
              <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold">Attendance Quality</span>
                <span className="font-mono text-emerald-900 font-bold">{attendanceQuality}</span>
              </div>
            </div>

          </div>
        </div>

        {/* 🧠 Google Gemini AI Academic Advisor & Smart Insights Widget */}
        <div className="p-[1px] rounded-[30px] bg-gradient-to-r from-purple-500/40 via-sky-500/40 to-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="rounded-[29px] bg-white/95 backdrop-blur-xl p-5 sm:p-7 space-y-4">
            
            {/* AI Advisor Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
                      Gemini AI Academic Advisor
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                      Live AI
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    Personalized attendance health, rest margins & timetable strategy
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/60 hidden sm:inline-block">
                  {aiAdvisor?.source || 'Powered by Google Gemini'}
                </span>
                <Link
                  href="/copilot"
                  className="flex items-center space-x-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-2xl transition shadow-sm"
                >
                  <Bot className="h-3.5 w-3.5 text-purple-300" />
                  <span>Chat with Copilot</span>
                </Link>
                <button
                  onClick={fetchAiAdvisor}
                  disabled={loadingAi}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                  title="Regenerate Gemini Advice"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingAi ? 'animate-spin text-purple-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* AI Advisor Content */}
            {loadingAi && !aiAdvisor ? (
              <div className="py-8 text-center text-xs text-stone-400 flex flex-col items-center justify-center space-y-2">
                <Sparkles className="h-6 w-6 animate-spin text-purple-500" />
                <span>Consulting Gemini AI with your academic telemetry...</span>
              </div>
            ) : aiAdvisor ? (
              <div className="space-y-4">
                {/* Headline Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-cyan-50/40 p-4 border border-purple-100 flex items-start space-x-3">
                  <Bot className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                      "{aiAdvisor.headline}"
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {aiAdvisor.executive_summary}
                    </p>
                  </div>
                </div>

                {/* Two-Column Tactical Advice: Today's Gameplan & Mathematical Recovery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl bg-stone-50/80 p-4 border border-stone-200/70 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>Today's Tactical Gameplan</span>
                    </span>
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                      {aiAdvisor.today_gameplan}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50/80 p-4 border border-stone-200/70 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block flex items-center space-x-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Clearance & Rest Margin Rule</span>
                    </span>
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                      {aiAdvisor.recovery_step}
                    </p>
                  </div>
                </div>

                {/* Quick Action Tips */}
                {aiAdvisor.quick_tips && aiAdvisor.quick_tips.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-2">
                    {aiAdvisor.quick_tips.map((tip: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        <span>{tip}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Ask Copilot Footer CTA */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-purple-100/60 text-xs">
                  <span className="text-[11px] text-stone-500 font-medium">Have questions about bunking, lectures, or room locations?</span>
                  <Link
                    href="/copilot"
                    className="font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
                  >
                    <span>Ask Campus Copilot</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* 🎛️ Attendance Margin & Rest Simulator ("What-If" Engine) */}
        <div className="rounded-[28px] bg-gradient-to-b from-white to-stone-50/80 p-6 sm:p-7 border border-stone-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                  Attendance Margin & Rest Simulator
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Calculate exactly how taking rest or attending upcoming classes affects your 75.0% examination criteria.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
                Institutional Cutoff: 75.0%
              </span>
              {simulatorDelta !== 0 && (
                <button
                  onClick={() => setSimulatorDelta(0)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                >
                  Reset Forecast
                </button>
              )}
            </div>
          </div>

          {/* Core Institutional Standing Banner: Rest Allowance vs Recovery Target */}
          {total === 0 ? (
            <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium">
              Academic sessions have not commenced yet. As soon as faculty conduct classes, your real-time rest allowance and recovery metrics will appear here.
            </div>
          ) : isAboveThreshold ? (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/40 border border-emerald-200/80 p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Eligible Rest Margin
                    </span>
                    <h3 className="text-lg font-extrabold text-emerald-950 tracking-tight">
                      {safeAbsences > 0 ? (
                        <>You can safely miss up to <span className="text-emerald-700 underline underline-offset-2">{safeAbsences} upcoming {safeAbsences === 1 ? 'class' : 'classes'}</span></>
                      ) : (
                        <>Borderline Status: 0 Safe Misses Allowed</>
                      )}
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  {safeAbsences > 0 ? 'Rest Safe' : 'Attend Next'}
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 leading-relaxed pl-0 sm:pl-[52px]">
                {safeAbsences > 0 ? (
                  <>
                    Your current turnout is <strong>{studentData.overallAttendance.toFixed(1)}%</strong>. If you feel unwell or need rest, you can take off for up to <strong>{safeAbsences} consecutive lectures</strong> and your attendance will stay at or above <strong>75.0%</strong> ({((attended / (total + safeAbsences)) * 100).toFixed(1)}% predicted floor) without losing exam eligibility!
                  </>
                ) : (
                  <>
                    You are exactly on the boundary at <strong>{studentData.overallAttendance.toFixed(1)}%</strong>. Missing even a single upcoming class will immediately drop you into the defaulter category (&lt;75%). Make sure to attend your upcoming lectures!
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/70 to-rose-50/40 border border-rose-200/80 p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
                      Recovery Requirement
                    </span>
                    <h3 className="text-lg font-extrabold text-rose-950 tracking-tight">
                      Must attend next <span className="text-rose-700 underline underline-offset-2">{neededClasses} consecutive {neededClasses === 1 ? 'class' : 'classes'}</span>
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-bold px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 border border-rose-200">
                  Defaulter Warning
                </span>
              </div>
              <p className="text-xs text-rose-900/90 leading-relaxed pl-0 sm:pl-[52px]">
                Your current attendance is <strong>{studentData.overallAttendance.toFixed(1)}%</strong>, which is below the university cutoff. You must attend the next <strong>{neededClasses} consecutive classes</strong> without any absence to bring your standing back to <strong>{(((attended + neededClasses) / (total + neededClasses)) * 100).toFixed(1)}%</strong> and secure exam clearance.
              </p>
            </div>
          )}

          {/* Interactive What-If Scenario Slider & Quick Presets */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-stone-500" />
                <span className="text-xs font-bold text-stone-800">
                  Simulate Upcoming Classes
                </span>
              </div>
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSimulatorDelta(-4)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    simulatorDelta === -4 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Take 4 Classes Rest
                </button>
                <button
                  onClick={() => setSimulatorDelta(-2)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    simulatorDelta === -2 
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Take 2 Classes Rest
                </button>
                <button
                  onClick={() => setSimulatorDelta(0)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    simulatorDelta === 0 
                      ? 'bg-stone-800 text-white border-stone-800 shadow-2xs' 
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Current (0)
                </button>
                <button
                  onClick={() => setSimulatorDelta(5)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    simulatorDelta === 5 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Attend Next 5
                </button>
                <button
                  onClick={() => setSimulatorDelta(10)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    simulatorDelta === 10 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Attend Next 10
                </button>
              </div>
            </div>

            {/* Slider Track */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-stone-400">
                <span className="text-amber-700">← Miss 10 Classes (Take Rest)</span>
                <span className="text-stone-700 font-extrabold font-mono">
                  {simulatorDelta < 0 ? `Resting for ${Math.abs(simulatorDelta)} classes` : simulatorDelta > 0 ? `Attending ${simulatorDelta} upcoming classes` : `Current Standing`}
                </span>
                <span className="text-blue-700">Attend 15 Classes →</span>
              </div>
              <input
                type="range"
                min="-10"
                max="15"
                step="1"
                value={simulatorDelta}
                onChange={(e) => setSimulatorDelta(Number(e.target.value))}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Interactive Simulation Result Card */}
            <div className={`p-4 rounded-xl border transition duration-200 ${
              isSimulatedSafe 
                ? 'bg-emerald-50/50 border-emerald-200/80' 
                : 'bg-rose-50/50 border-rose-200/80'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-stone-700">Projected Turnout:</span>
                    <span className={`text-2xl font-black font-mono ${isSimulatedSafe ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {simulatedPct.toFixed(1)}%
                    </span>
                    {pctDiff !== 0 && (
                      <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        pctDiff > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {pctDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {pctDiff > 0 ? `+${pctDiff.toFixed(1)}%` : `${pctDiff.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600">
                    {simulatorDelta < 0 ? (
                      <>
                        If you take rest for the next <strong>{Math.abs(simulatorDelta)} classes</strong>, your turnout will be <strong>{simulatedPct.toFixed(1)}%</strong> ({attended}/{simulatedTotal} classes).{' '}
                        {isSimulatedSafe ? (
                          <span className="text-emerald-700 font-bold">You remain safely above the 75% exam cutoff!</span>
                        ) : (
                          <span className="text-rose-700 font-bold">Warning: This will drop you below the 75% criteria.</span>
                        )}
                      </>
                    ) : simulatorDelta > 0 ? (
                      <>
                        If you attend the next <strong>{simulatorDelta} classes</strong>, your turnout will rise to <strong>{simulatedPct.toFixed(1)}%</strong> ({simulatedAttended}/{simulatedTotal} classes).{' '}
                        {isSimulatedSafe ? (
                          <span className="text-emerald-700 font-bold">You will be in safe standing for semester examinations!</span>
                        ) : (
                          <span className="text-rose-700 font-bold">You will still need {Math.max(0, neededClasses - simulatorDelta)} more classes to cross 75%.</span>
                        )}
                      </>
                    ) : (
                      <>
                        Currently at <strong>{studentData.overallAttendance.toFixed(1)}%</strong> ({attended}/{total} classes). Move the slider or tap any preset button to preview future scenarios.
                      </>
                    )}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200/60">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSimulatedSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isSimulatedSafe ? 'Examination Safe' : 'Debarment Risk'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-stone-500">
                    {simulatedAttended} / {simulatedTotal} total
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📚 Subject-Wise Attendance Overview Cards */}
        <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>Subject-Wise Attendance & Conductor Roster</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Current turnout breakdown across enrolled subjects for {studentData.academicYearLabel || ('Semester ' + studentData.semester)}.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              {studentData.subjects.length} Subjects Active
            </span>
          </div>

          {studentData.subjects.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-stone-50/60 border border-dashed border-stone-200 p-6 space-y-2">
              <BookOpen className="h-8 w-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-600">No subject courses enrolled yet for Semester {studentData.semester}</p>
              <p className="text-[11px] text-stone-400">Once your faculty or HOD assigns subjects to your batch, live course turnouts will appear here.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {studentData.subjects.map((sub) => {
              const subSafe = sub.pct >= 75;
              const subSafeRest = sub.total > 0 && subSafe ? Math.max(0, Math.floor(sub.attended / 0.75 - sub.total)) : 0;
              const subNeeded = sub.total > 0 && !subSafe ? Math.ceil((0.75 * sub.total - sub.attended) / 0.25) : 0;
              return (
                <div key={sub.code} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/70 space-y-3 hover:shadow-xs transition">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200">
                      {sub.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      subSafe 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {subSafe ? 'Safe' : 'Warning'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{sub.name}</h4>
                    <p className="text-[11px] text-stone-500 truncate">{sub.teachers?.[0] || 'Faculty Member'}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-stone-900">{sub.pct.toFixed(1)}%</span>
                      <span className="text-stone-500 text-[11px] font-mono">{sub.attended}/{sub.total} held</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-200/80 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${subSafe ? 'bg-blue-600' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(sub.pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Granular Rest Allowance per subject */}
                  <div className="pt-2 border-t border-stone-200/60 text-[11px] flex items-center justify-between">
                    <span className="text-stone-500">Rest Allowance:</span>
                    <span className={`font-semibold ${subSafe ? (subSafeRest > 0 ? 'text-emerald-700' : 'text-amber-700') : 'text-rose-700'}`}>
                      {subSafe 
                        ? (subSafeRest > 0 ? `Can miss ${subSafeRest} cls` : '0 safe misses') 
                        : `Need +${subNeeded} cls`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* 📋 Student Live Verification Feed Table (Exact Match to Image Format) */}
        <div className="rounded-[28px] bg-white p-6 sm:p-7 border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center space-x-2">
                <Clock className="h-4 w-4 text-stone-700" />
                <span>Recent Biometric Attendance Logs</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Timestamped biometric authentication history captured by classroom kiosk tablets.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Camera Stream 100% Online</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Subject / Lab</th>
                  <th className="py-3 px-4">Conducted By</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800 font-medium">
                {studentData.recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400 text-xs">
                      <Clock className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                      <span>No biometric attendance records logged yet. Verified scans will appear here live once attendance is taken in class.</span>
                    </td>
                  </tr>
                ) : (
                studentData.recentLogs.map((log) => {
                  const isPresent = log.status === 'Present';
                  return (
                    <tr key={log.id} className="hover:bg-stone-50/80 transition duration-150">
                      
                      {/* Avatar + Student Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={studentData.photoThumbnail || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                            alt={studentData.name} 
                            className="h-8 w-8 rounded-full object-cover border border-stone-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-stone-900 block">{studentData.name}</span>
                            <span className="text-[10px] text-stone-400">Sem {studentData.semester} • Sec {studentData.section}</span>
                          </div>
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-600">
                        {studentData.roll}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-900">{log.subject}</span>
                      </td>

                      {/* Conducted By */}
                      <td className="py-3.5 px-4 text-stone-600">
                        {log.conducted_by}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                        {log.date} • {log.time}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-right">
                        {isPresent ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            <span>Absent</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 🤖 Floating Apple-Style Campus AI Copilot Button */}
      <Link
        href="/copilot"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 bg-stone-900/95 hover:bg-stone-900 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl border border-white/20 transition-all hover:scale-105 group backdrop-blur-xl"
        title="Open Campus AI Copilot"
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 text-white flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        </div>
        <span className="text-xs font-bold tracking-tight">AI Copilot</span>
        <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-mono">
          Online
        </span>
      </Link>
    </AppleDeluxeShell>
  );
}
