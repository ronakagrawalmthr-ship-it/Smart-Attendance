'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Search, 
  Download, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw, 
  ArrowLeft,
  Sparkles,
  BookOpen,
  Users,
  UserCheck,
  Award,
  ChevronRight,
  Eye,
  X,
  GraduationCap,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

interface SessionLogItem {
  session_id: number;
  date: string;
  time: string;
  start_time: string;
  conducted_by: string;
  original_teacher: string;
  subject_code: string;
  subject_name: string;
  is_guest_lecture: boolean;
  session_type: string;
  notes?: string;
  branch: string;
  semester: number;
  section: string;
  total_enrolled: number;
  present_count: number;
  absent_count: number;
  turnout_percentage: number;
  roster: {
    student_id: number;
    roll_number: string;
    student_name: string;
    is_present: boolean;
    status_tag: string;
    remarks?: string;
  }[];
}

interface StudentSummaryItem {
  student_id: number;
  roll_number: string;
  name: string;
  branch: string;
  semester: number;
  section: string;
  total_lectures: number;
  total_attended: number;
  overall_percentage: number;
  is_defaulter: boolean;
  subject_breakdown: Record<string, {
    subject_code: string;
    subject_name: string;
    total: number;
    attended: number;
    percentage: number;
    teachers: string[];
  }>;
  guest_lectures: {
    total: number;
    attended: number;
    percentage: number;
    topics: {
      topic: string;
      conducted_by: string;
      date: string;
      is_present: boolean;
    }[];
  };
}

interface AttendanceRecord {
  log_id: number;
  session_id: number;
  roll_number: string;
  student_name: string;
  branch: string;
  semester: number;
  section: string;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  conducted_by: string;
  session_type: string;
  notes?: string;
  date: string;
  time: string;
  status: 'Present' | 'Absent';
  is_present: boolean;
  status_tag?: string;
  timestamp: string;
}

export default function ClassAttendancePage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // View Modes: 'sessions' (Conducted Lectures History) | 'students' (Cumulative Ledger) | 'records' (Individual Scan Logs)
  const [viewMode, setViewMode] = useState<'sessions' | 'students' | 'records'>('sessions');

  const [loading, setLoading] = useState(true);
  const [sessionsLog, setSessionsLog] = useState<SessionLogItem[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummaryItem[]>([]);
  const [rawRecords, setRawRecords] = useState<AttendanceRecord[]>([]);
  
  // Filter Options & States
  const [availableBranches, setAvailableBranches] = useState<string[]>(['Computer Science']);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<string[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({
    total_lectures_conducted: 0,
    guest_lectures_conducted: 0,
    average_turnout_percentage: 0,
    total_students: 0,
    defaulters_count: 0
  });

  // Selected Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Science');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Roster Drilldown Modal
  const [selectedSessionModal, setSelectedSessionModal] = useState<SessionLogItem | null>(null);
  const [rosterSearch, setRosterSearch] = useState<string>('');

  // Fetch Comprehensive Attendance Analytics & Records
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.append('branch', selectedBranch);
      
      const dateToFetch = selectedDate === 'custom' ? customDate : selectedDate;
      if (dateToFetch !== 'all') {
        params.append('target_date', dateToFetch);
      }
      if (selectedSemester !== 'all') {
        params.append('semester', selectedSemester);
      }
      if (selectedSection !== 'all') {
        params.append('section', selectedSection);
      }
      if (selectedSubject !== 'all') {
        params.append('subject_code', selectedSubject);
      }
      if (selectedTeacher !== 'all') {
        params.append('teacher_name', selectedTeacher);
      }

      // 1. Fetch Comprehensive Analytics (Sessions + Cumulative Students)
      const analyticsRes = await fetch(`${API_BASE_URL}/management/attendance/comprehensive-analytics?${params.toString()}`, { headers });
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setSessionsLog(data.sessions_log || []);
        setStudentSummary(data.student_summary || []);
        setSummaryStats(data.summary || {});
        if (data.available_filters) {
          if (data.available_filters.subjects) setAvailableSubjects(data.available_filters.subjects);
          if (data.available_filters.teachers) setAvailableTeachers(data.available_filters.teachers);
        }
      }

      // 2. Fetch Raw Class Records (for detailed log exports)
      const rawRes = await fetch(`${API_BASE_URL}/management/attendance/class-records?${params.toString()}`, { headers });
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        setRawRecords(rawData.records || []);
      }
    } catch {
      console.log('Error fetching comprehensive attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedBranch, selectedSemester, selectedSection, selectedSubject, selectedTeacher, selectedDate, customDate]);

  // Client Search Filtering on Sessions Log
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessionsLog;
    const q = searchQuery.toLowerCase();
    return sessionsLog.filter(s => 
      s.subject_name.toLowerCase().includes(q) ||
      s.conducted_by.toLowerCase().includes(q) ||
      s.subject_code.toLowerCase().includes(q) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [sessionsLog, searchQuery]);

  // Client Search Filtering on Student Cumulative Summary
  const filteredStudents = useMemo(() => {
    let list = studentSummary;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = studentSummary.filter(st => 
        st.name.toLowerCase().includes(q) ||
        st.roll_number.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }));
  }, [studentSummary, searchQuery]);

  // Client Search on Raw Records
  const filteredRawRecords = useMemo(() => {
    let list = rawRecords;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = rawRecords.filter(r => 
        r.student_name.toLowerCase().includes(q) ||
        r.roll_number.toLowerCase().includes(q) ||
        r.subject_name.toLowerCase().includes(q) ||
        r.teacher_name.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }));
  }, [rawRecords, searchQuery]);

  // Excel / CSV Export
  const downloadExcelSheet = () => {
    if (rawRecords.length === 0) {
      alert("No attendance records to export for the selected filters.");
      return;
    }

    const headers = [
      "Roll Number",
      "Student Name",
      "Department",
      "Semester",
      "Section",
      "Subject Code",
      "Subject / Topic Name",
      "Conducted By (Teacher)",
      "Session Nature",
      "Session Notes",
      "Date",
      "Lecture Timing",
      "Attendance Status",
      "Biometric Verification Time"
    ];

    const rows = rawRecords.map(r => [
      `"${r.roll_number}"`,
      `"${r.student_name}"`,
      `"${r.branch}"`,
      `"Sem ${r.semester}"`,
      `"Sec ${r.section}"`,
      `"${r.subject_code}"`,
      `"${r.subject_name}"`,
      `"${r.conducted_by || r.teacher_name}"`,
      `"${r.session_type || 'Lecture'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.status}"`,
      `"${r.timestamp}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const semLabel = selectedSemester === 'all' ? 'AllSem' : `Sem${selectedSemester}`;
    const secLabel = selectedSection === 'all' ? 'AllSec' : `Sec${selectedSection}`;
    const fileName = `Department_Attendance_Report_${semLabel}_${secLabel}_${todayStr}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/dashboard"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition mr-2"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">
              HOD Attendance Intelligence
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Department Attendance Explorer</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track which teacher took each lecture (regular faculty, 2nd lecture of the day, proxy, or guest lecture) alongside Total vs Subject-Specific attendance.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={fetchAttendanceData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Attendance Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={downloadExcelSheet}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Full Register (CSV)</span>
          </button>
        </div>
      </header>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Lectures Held</div>
          <div className="text-2xl font-extrabold text-white mt-1">{summaryStats.total_lectures_conducted || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all faculty</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-purple-500/30 p-4 backdrop-blur-xl">
          <div className="text-[10px] uppercase font-bold text-purple-300 flex items-center space-x-1">
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>Guest Lectures</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-300 mt-1">{summaryStats.guest_lectures_conducted || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Invited / Special Sessions</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Average Turnout</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{summaryStats.average_turnout_percentage || 0}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Classroom attendance</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Enrolled Students</div>
          <div className="text-2xl font-extrabold text-white mt-1">{summaryStats.total_students || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active roster</div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-rose-500/30 p-4 backdrop-blur-xl col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase font-bold text-rose-300">Defaulters (&lt;75%)</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">{summaryStats.defaulters_count || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Require HOD warning</div>
        </div>
      </div>

      {/* Control Panel: Filters for Class, Subject, Teacher & Date */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Filter className="h-4 w-4 text-emerald-400" />
            <span>Classroom Query & Attended Conductor Filters</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedDate('today')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                selectedDate === 'today'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Today</span>
            </button>

            <button
              onClick={() => setSelectedDate('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedDate === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All History
            </button>

            <button
              onClick={() => setSelectedDate('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedDate === 'custom'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Custom Date
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          {/* Semester Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s.toString()}>Semester {s}</option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Class Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Subject Filter (All vs Specific vs Guest) */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Subject Scope</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">All Lectures (Cumulative Total)</option>
              <option value="GUEST">🌟 Guest Lectures Only</option>
              {availableSubjects.map(subj => (
                <option key={subj.code} value={subj.code}>
                  {subj.code} - {subj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Conductor Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Conducted By (Faculty)</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">All Conductor Teachers</option>
              {availableTeachers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Custom Date Input */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Target Date</label>
            <input
              type="date"
              value={customDate}
              disabled={selectedDate !== 'custom'}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium disabled:opacity-40 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 shadow-lg">
          <button
            onClick={() => setViewMode('sessions')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              viewMode === 'sessions'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Conducted Lectures Log ({sessionsLog.length})</span>
          </button>

          <button
            onClick={() => setViewMode('students')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              viewMode === 'students'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Total Student Attendance ({studentSummary.length})</span>
          </button>

          <button
            onClick={() => setViewMode('records')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              viewMode === 'records'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Raw Scan Logs ({rawRecords.length})</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic, conductor, roll..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* VIEW MODE 1: CONDUCTED LECTURES LOG */}
      {viewMode === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Conducted Classroom Sessions & Conductor Attribution
            </h2>
            <span className="text-xs text-slate-500">
              Showing {filteredSessions.length} sessions
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
              <p className="text-xs">Fetching conducted lectures history...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
              <Layers className="h-8 w-8 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No conducted lecture sessions found.</p>
              <p className="text-xs text-slate-500">Try adjusting your semester, section, or conductor filter parameters above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSessions.map((sess) => {
                const isGuest = sess.is_guest_lecture;
                return (
                  <motion.div
                    key={sess.session_id}
                    layout
                    className={`rounded-3xl p-6 border backdrop-blur-xl transition-all ${
                      isGuest 
                        ? 'bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-slate-900/90 border-purple-500/40 hover:border-purple-400 shadow-lg shadow-purple-950/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-lg shadow-slate-950/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      {/* Left: Session Identification */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isGuest ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center space-x-1">
                              <Sparkles className="h-3 w-3 text-amber-300" />
                              <span>Guest Lecture</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                              Theory Lecture
                            </span>
                          )}

                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-semibold">
                            {sess.subject_code}
                          </span>

                          <span className="text-xs text-slate-400">
                            {sess.branch} • Sem {sess.semester} • Sec {sess.section}
                          </span>
                        </div>

                        {/* Subject Title */}
                        <h3 className="text-lg font-extrabold text-white tracking-tight">
                          {sess.subject_name}
                        </h3>

                        {/* Conductor & Details */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs">
                          {/* Who conducted the class */}
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
                            <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-slate-400">Conducted By:</span>
                            <span className="font-extrabold text-white">{sess.conducted_by}</span>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center space-x-1 text-slate-400">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>{sess.date}</span>
                            <span>•</span>
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <span>{sess.time}</span>
                          </div>

                          {/* Notes if present */}
                          {sess.notes && (
                            <div className="text-slate-400 italic bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800/60">
                              "{sess.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Turnout Gauge & Inspect Button */}
                      <div className="flex items-center space-x-5 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Turnout Ratio</div>
                          <div className="text-xl font-extrabold text-emerald-400">
                            {sess.present_count} <span className="text-xs text-slate-500 font-normal">/ {sess.total_enrolled}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-indigo-400">{sess.turnout_percentage}% Present</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSessionModal(sess)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition flex items-center space-x-1.5"
                        >
                          <Eye className="h-4 w-4 text-emerald-400" />
                          <span>Inspect Roster</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: TOTAL CUMULATIVE STUDENT ATTENDANCE */}
      {viewMode === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Student Cumulative Attendance (Total & Subject-Specific Ratios)
              </h2>
              <p className="text-xs text-slate-500">
                Evaluating attendance across <span className="text-white font-semibold">{selectedSubject === 'all' ? 'ALL Lectures & Teachers' : selectedSubject}</span>
              </p>
            </div>
            
            <div className="text-xs text-slate-400">
              Showing {filteredStudents.length} students
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-4">Student Details</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-center">Lectures Held</th>
                    <th className="px-6 py-4 text-center">Attended</th>
                    <th className="px-6 py-4 text-center">Overall %</th>
                    <th className="px-6 py-4">Subject & Conductor Breakdown</th>
                    <th className="px-6 py-4 text-right">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        <span>Computing student attendance ledgers...</span>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-semibold">
                        No student attendance records matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const isDefaulter = st.is_defaulter;
                      return (
                        <tr key={st.student_id} className="hover:bg-slate-800/30 transition">
                          {/* Student Details */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-white text-sm">{st.name}</div>
                            <div className="font-mono text-[11px] text-indigo-400">{st.roll_number}</div>
                          </td>

                          {/* Class */}
                          <td className="px-6 py-4 text-slate-300">
                            <div>Sem {st.semester}</div>
                            <div className="text-slate-500">Sec {st.section}</div>
                          </td>

                          {/* Lectures Held */}
                          <td className="px-6 py-4 text-center font-bold text-slate-300 text-sm">
                            {st.total_lectures}
                          </td>

                          {/* Attended */}
                          <td className="px-6 py-4 text-center font-extrabold text-emerald-400 text-sm">
                            {st.total_attended}
                          </td>

                          {/* Percentage */}
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl font-extrabold text-xs inline-block ${
                              isDefaulter
                                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                            }`}>
                              {st.overall_percentage}%
                            </span>
                          </td>

                          {/* Breakdown preview */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {/* Guest lectures pill */}
                              {st.guest_lectures && st.guest_lectures.total > 0 && (
                                <div className="text-[11px] text-purple-300 flex items-center space-x-1">
                                  <Sparkles className="h-3 w-3 text-amber-300" />
                                  <span>Guest: {st.guest_lectures.attended}/{st.guest_lectures.total} ({st.guest_lectures.percentage}%)</span>
                                </div>
                              )}

                              {/* Subjects overview */}
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {Object.values(st.subject_breakdown).slice(0, 3).map(sb => (
                                  <span key={sb.subject_code} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                    {sb.subject_code}: {sb.attended}/{sb.total}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Standing */}
                          <td className="px-6 py-4 text-right">
                            {isDefaulter ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
                                Defaulter
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                                Eligible
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
      )}

      {/* VIEW MODE 3: RAW SCAN RECORDS */}
      {viewMode === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Individual Attendance Logs & Verification Timestamps
            </h2>
            <span className="text-xs text-slate-500">
              Showing {filteredRawRecords.length} records
            </span>
          </div>

          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Subject / Guest Topic</th>
                    <th className="px-6 py-4">Conducted By</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Loading raw attendance records...</span>
                      </td>
                    </tr>
                  ) : filteredRawRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-semibold">
                        No raw logs found for current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRawRecords.map((rec) => (
                      <tr key={rec.log_id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-white">{rec.student_name}</div>
                          <div className="font-mono text-[11px] text-slate-400">{rec.roll_number}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-200">{rec.subject_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{rec.subject_code}</div>
                        </td>
                        <td className="px-6 py-3.5 font-medium text-indigo-300">
                          {rec.conducted_by || rec.teacher_name}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">
                          Sem {rec.semester} • Sec {rec.section}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">
                          <div>{rec.date}</div>
                          <div className="text-[11px] text-slate-500">{rec.time}</div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            rec.is_present
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Roster Drilldown Modal */}
      <AnimatePresence>
        {selectedSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {selectedSessionModal.is_guest_lecture ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center space-x-1">
                        <Sparkles className="h-3 w-3 text-amber-300" />
                        <span>Guest Lecture</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Theory Class
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {selectedSessionModal.branch} • Sem {selectedSessionModal.semester} • Sec {selectedSessionModal.section}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedSessionModal.subject_name}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>Conducted By: <strong className="text-white">{selectedSessionModal.conducted_by}</strong></span>
                    <span>•</span>
                    <span>{selectedSessionModal.date} ({selectedSessionModal.time})</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSessionModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Roster Search Bar */}
              <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search student in this session..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="text-xs font-bold text-slate-300">
                  <span className="text-emerald-400">{selectedSessionModal.present_count} Present</span> / <span className="text-rose-400">{selectedSessionModal.absent_count} Absent</span>
                </div>
              </div>

              {/* Students Roster List */}
              <div className="p-6 overflow-y-auto space-y-2 flex-1">
                {[...selectedSessionModal.roster]
                  .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }))
                  .filter(st => 
                    st.student_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                    st.roll_number.toLowerCase().includes(rosterSearch.toLowerCase())
                  )
                  .map((st) => (
                    <div
                      key={st.student_id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{st.student_name}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{st.roll_number}</div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        st.is_present
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {st.is_present ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
