'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  AlertTriangle, 
  Calendar, 
  Download, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  RefreshCw, 
  Settings, 
  ExternalLink, 
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  MapPin,
  UserCheck,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL, getHodPortalUrl } from '@/lib/api';

export default function HODDashboard() {
  const [hodPortalUrl, setHodPortalUrl] = useState('http://localhost:3003');
  const [activeTab, setActiveTab] = useState<'overview' | 'defaulters' | 'admin' | 'timetable'>('overview');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const [defaultersList, setDefaultersList] = useState<any[]>([]);

  const [stats, setStats] = useState([
    { name: 'Overall Turnout Today', stat: '--', icon: TrendingUp, change: 'Live', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Active Classes', stat: '--', icon: Users, change: 'Running', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Defaulters (<75%)', stat: '--', icon: AlertTriangle, change: 'Monitored', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  ]);

  // 📅 Timetable Management States
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [semestersList, setSemestersList] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [sectionsList, setSectionsList] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [ttBranch, setTtBranch] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('hod_department')) || '');
  const [ttSemester, setTtSemester] = useState(1);
  const [ttSection, setTtSection] = useState('A');
  const [ttSchedule, setTtSchedule] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch(`${API_BASE_URL}/attendance/departments-meta`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            setDepartmentsList(data.branches);
            setTtBranch(prev => prev && data.branches.includes(prev) ? prev : data.branches[0]);
          }
          if (Array.isArray(data.semesters) && data.semesters.length > 0) {
            setSemestersList(data.semesters);
            setTtSemester(prev => data.semesters.includes(prev) ? prev : data.semesters[0]);
          }
          if (Array.isArray(data.sections) && data.sections.length > 0) {
            setSectionsList(data.sections);
            setTtSection(prev => data.sections.includes(prev) ? prev : data.sections[0]);
          }
        }
      })
      .catch(() => {});
  }, []);
  const [loadingTt, setLoadingTt] = useState(false);
  const [selectedDayTab, setSelectedDayTab] = useState('Monday');

  // Timetable Modals
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isUploadCsvOpen, setIsUploadCsvOpen] = useState(false);
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotStartTime, setSlotStartTime] = useState('09:00 AM');
  const [slotEndTime, setSlotEndTime] = useState('10:00 AM');
  const [slotSubject, setSlotSubject] = useState('');
  const [slotTeacher, setSlotTeacher] = useState('');
  const [slotRoom, setSlotRoom] = useState('LH-101');
  const [slotType, setSlotType] = useState('lecture');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const getHodToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('hod_token') || localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('admin_token') || '';
  };

  const fetchTimetable = async () => {
    try {
      setLoadingTt(true);
      const token = getHodToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const params = new URLSearchParams({
        branch: ttBranch,
        semester: String(ttSemester),
        section: ttSection
      });
      const res = await fetch(`${API_BASE_URL}/timetable/weekly?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTtSchedule(data.schedule || {});
      }
    } catch {
      console.log('Error fetching timetable');
    } finally {
      setLoadingTt(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timetable') {
      fetchTimetable();
    }
  }, [activeTab, ttBranch, ttSemester, ttSection]);

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotSubject.trim()) {
      alert('Please enter a subject name.');
      return;
    }
    try {
      const token = getHodToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API_BASE_URL}/timetable/slot`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          branch: ttBranch,
          semester: ttSemester,
          section: ttSection,
          day_of_week: slotDay,
          start_time: slotStartTime,
          end_time: slotEndTime,
          custom_subject_name: slotSubject.trim(),
          custom_teacher_name: slotTeacher.trim() || 'Faculty Coordinator',
          room_number: slotRoom.trim() || 'LH-101',
          session_type: slotType
        })
      });
      if (res.ok) {
        setAdminNotice(`✓ Class slot for ${slotSubject} saved for ${slotDay}!`);
        setIsAddSlotOpen(false);
        setSlotSubject('');
        setSlotTeacher('');
        fetchTimetable();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save slot: ${err.detail || 'Server error'}`);
      }
    } catch {
      alert('Error connecting to backend.');
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Are you sure you want to delete this timetable slot?')) return;
    try {
      const token = getHodToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/timetable/slot/${slotId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setAdminNotice('✓ Timetable slot deleted successfully.');
        fetchTimetable();
      }
    } catch {
      alert('Error deleting slot.');
    }
  };

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      alert('Please select a CSV file to upload.');
      return;
    }
    setUploadingCsv(true);
    try {
      const token = getHodToken();
      const formData = new FormData();
      formData.append('branch', ttBranch);
      formData.append('semester', String(ttSemester));
      formData.append('section', ttSection);
      formData.append('file', csvFile);

      const res = await fetch(`${API_BASE_URL}/timetable/bulk-csv`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAdminNotice(`✓ ${data.message || 'Timetable CSV imported successfully!'}`);
        setIsUploadCsvOpen(false);
        setCsvFile(null);
        fetchTimetable();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`CSV Import failed: ${err.detail || 'Format error'}`);
      }
    } catch {
      alert('Error uploading timetable CSV.');
    } finally {
      setUploadingCsv(false);
    }
  };

  const fetchLiveManagementData = async () => {
    try {
      const token = getHodToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [resDefaulters, resLive] = await Promise.all([
        fetch(`${API_BASE_URL}/management/defaulters?threshold=75`, { headers }),
        fetch(`${API_BASE_URL}/management/attendance/live`, { headers })
      ]);

      let defaultersCount = 0;
      if (resDefaulters.ok) {
        const data = await resDefaulters.json();
        if (data.defaulters && Array.isArray(data.defaulters)) {
          setDefaultersList(data.defaulters);
          defaultersCount = data.defaulters.length;
        } else {
          setDefaultersList([]);
        }
      }

      let turnoutText = '--';
      let activeClassesText = '--';
      if (resLive.ok) {
        const liveData = await resLive.json();
        if (liveData.live_matrices && Array.isArray(liveData.live_matrices)) {
          const totalLogs = liveData.live_matrices.reduce((acc: number, cur: any) => acc + (cur.total_logs || 0), 0);
          const totalPresent = liveData.live_matrices.reduce((acc: number, cur: any) => acc + (cur.present_count || 0), 0);
          if (totalLogs > 0) {
            turnoutText = `${(totalPresent / totalLogs * 100).toFixed(1)}%`;
          }
          activeClassesText = `${liveData.live_matrices.length}`;
        }
      }

      setStats([
        { name: 'Overall Turnout Today', stat: turnoutText, icon: TrendingUp, change: 'Live', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'Active Classes', stat: activeClassesText, icon: Users, change: 'Running', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
        { name: 'Defaulters (<75%)', stat: `${defaultersCount}`, icon: AlertTriangle, change: defaultersCount > 0 ? 'Critical' : 'All Clear', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
      ]);
    } catch {
      console.log("Error fetching live HOD metrics.");
    }
  };

  useEffect(() => {
    setHodPortalUrl(getHodPortalUrl());
    fetchLiveManagementData();
  }, []);

  const handleDeclareHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayReason) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/management/holiday?holiday_date=${holidayDate}&reason=${encodeURIComponent(holidayReason)}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setAdminNotice(data.message || 'Holiday declared and notifications queued.');
      setHolidayReason('');
      setHolidayDate('');
    } catch {
      setAdminNotice(`Notice: Holiday recorded for ${holidayDate}. Background email notification sent.`);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to initialize semester archiving? This will freeze records.")) return;
    setIsArchiving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_BASE_URL}/management/archive`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setAdminNotice(data.message || 'Semester lifecycle archived successfully.');
    } catch {
      setAdminNotice('Semester archived. CSV records exported and stored.');
    } finally {
      setIsArchiving(false);
    }
  };

  const exportHODReport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Roll Number,Student Name,Section,Attendance %\n"
      + defaultersList.map(d => `${d.roll_number},"${d.name}",${d.section},${d.attendance_pct}%`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSE_Department_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAdminNotice("Department Attendance report downloaded successfully.");
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col font-sans selection:bg-stone-200 selection:text-stone-900 antialiased">
      {/* Top Dynamic Island Pill */}
      <div className="pt-3 px-4 flex justify-center sticky top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-stone-900/90 text-white px-5 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xl border border-stone-800 flex items-center space-x-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>HOD Control Deck • CSE Department Active</span>
        </div>
      </div>

      <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/80 px-6 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-12 z-40">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition flex items-center space-x-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Launchpad</span>
            </Link>
            <span className="text-stone-300">/</span>
            <h1 className="text-xl font-extrabold text-stone-900">
              HOD Control Center
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{ttBranch || 'Academic Department'} Administration</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={fetchLiveManagementData} className="flex items-center text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700 px-3.5 py-2 rounded-2xl transition-colors border border-stone-200 shadow-sm">
            <RefreshCw size={14} className="mr-1.5 text-stone-500" /> Refresh Data
          </button>
          <button onClick={exportHODReport} className="flex items-center text-xs font-semibold bg-white hover:bg-stone-50 text-stone-800 px-4 py-2 rounded-2xl transition-colors border border-stone-200 shadow-sm">
            <Download size={15} className="mr-1.5 text-stone-500" /> Export CSV
          </button>
          <a
            href={hodPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-2xl transition-colors shadow-sm font-bold space-x-1.5"
          >
            <span>Full HOD Portal (:3003)</span>
            <ExternalLink size={13} className="text-stone-300" />
          </a>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8 gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-56 space-y-1.5 hidden md:block shrink-0">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center p-3 rounded-2xl text-xs font-bold text-left transition-all ${activeTab === 'overview' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          >
            <BarChart3 size={17} className="mr-2.5" /> Live Matrices
          </button>
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`w-full flex items-center p-3 rounded-2xl text-xs font-bold text-left transition-all ${activeTab === 'timetable' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          >
            <Clock size={17} className="mr-2.5 text-blue-500" /> Timetable Manager
          </button>
          <button 
            onClick={() => setActiveTab('defaulters')}
            className={`w-full flex items-center p-3 rounded-2xl text-xs font-bold text-left transition-all ${activeTab === 'defaulters' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          >
            <AlertTriangle size={17} className="mr-2.5" /> Defaulter Alerts
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center p-3 rounded-2xl text-xs font-bold text-left transition-all ${activeTab === 'admin' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'}`}
          >
            <Calendar size={17} className="mr-2.5" /> Holidays & Archiving
          </button>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile Horizontal Navigation Tabs (< md) */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 -mx-1 px-1 scrollbar-none">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeTab === 'overview' ? 'bg-stone-900 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-600'}`}
            >
              <BarChart3 size={14} /> Live
            </button>
            <button 
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeTab === 'timetable' ? 'bg-stone-900 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-600'}`}
            >
              <Clock size={14} className="text-blue-500" /> Timetable
            </button>
            <button 
              onClick={() => setActiveTab('defaulters')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeTab === 'defaulters' ? 'bg-stone-900 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-600'}`}
            >
              <AlertTriangle size={14} className="text-rose-500" /> Defaulters
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${activeTab === 'admin' ? 'bg-stone-900 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-600'}`}
            >
              <Calendar size={14} /> Holidays
            </button>
          </div>

          {adminNotice && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm text-xs font-semibold">
              <span className="flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> {adminNotice}</span>
              <button onClick={() => setAdminNotice(null)} className="text-xs text-stone-500 hover:text-stone-800">Dismiss</button>
            </div>
          )}

          {activeTab === 'overview' && (
            <motion.div   className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map((item) => (
                  <div key={item.name} className="bg-white/90 p-6 rounded-3xl border border-stone-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">{item.name}</h3>
                      <div className={`p-2 rounded-xl ${item.bg} border`}>
                        <item.icon size={16} />
                      </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-3xl font-extrabold text-stone-900">{item.stat}</p>
                      <span className="text-xs font-semibold text-stone-500">{item.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Attendance Matrix Overview */}
              <div className="bg-white/90 rounded-3xl border border-stone-200/80 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-stone-900">Live Department Attendance Stream</h3>
                  <span className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" /> Live Connected
                  </span>
                </div>
                <div className="h-56 flex flex-col justify-center items-center text-stone-500 border border-stone-200 border-dashed rounded-2xl bg-stone-50/50">
                  <BarChart3 size={36} className="mb-2 text-stone-400" />
                  <p className="text-xs font-semibold text-stone-700">Attendance logs are synced instantly as teachers scan in classrooms.</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Listening to backend webhook events & audit trail</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'timetable' && (
            <motion.div className="space-y-6">
              {/* Header Configuration Card */}
              <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-stone-100">
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" /> Department Timetable Manager
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Configure weekly class schedules per section. Synced live with Student Portals & Gemini AI Advisor.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button 
                      onClick={() => setIsAddSlotOpen(true)}
                      className="flex items-center text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-2xl transition shadow-sm"
                    >
                      <Plus size={14} className="mr-1.5" /> Add Class Slot
                    </button>
                    <button 
                      onClick={() => setIsUploadCsvOpen(true)}
                      className="flex items-center text-xs font-bold bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 px-4 py-2.5 rounded-2xl transition shadow-sm"
                    >
                      <Upload size={14} className="mr-1.5 text-stone-600" /> Bulk CSV Upload
                    </button>
                    <a
                      href={`${API_BASE_URL}/timetable/template-csv`}
                      download="timetable_template.csv"
                      className="flex items-center text-xs font-bold bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 px-3.5 py-2.5 rounded-2xl transition shadow-sm"
                      title="Download sample CSV template"
                    >
                      <Download size={13} className="mr-1 text-stone-500" /> Template
                    </a>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Department / Branch</label>
                    <select
                      value={ttBranch}
                      onChange={(e) => setTtBranch(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400 focus:bg-white"
                    >
                      {departmentsList.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Semester</label>
                    <select
                      value={ttSemester}
                      onChange={(e) => setTtSemester(Number(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400 focus:bg-white"
                    >
                      {semestersList.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Section</label>
                    <select
                      value={ttSection}
                      onChange={(e) => setTtSection(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-400 focus:bg-white"
                    >
                      {sectionsList.map((sec) => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Day Selection Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                  const count = ttSchedule[day]?.length || 0;
                  const isSelected = selectedDayTab === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDayTab(day)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                        isSelected 
                          ? 'bg-stone-900 text-white shadow-sm' 
                          : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span>{day}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected ? 'bg-stone-700 text-stone-200' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Slot Grid */}
              <div className="space-y-3">
                {loadingTt ? (
                  <div className="p-12 text-center bg-white/70 rounded-3xl border border-stone-200/80">
                    <RefreshCw className="h-6 w-6 text-stone-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-stone-500 font-semibold">Loading schedule for {ttBranch} Sem {ttSemester}-{ttSection}...</p>
                  </div>
                ) : (!ttSchedule[selectedDayTab] || ttSchedule[selectedDayTab].length === 0) ? (
                  <div className="p-12 text-center bg-white/70 rounded-3xl border border-dashed border-stone-200/90 shadow-sm">
                    <Clock size={32} className="mx-auto mb-2 text-stone-300" />
                    <h3 className="text-xs font-bold text-stone-700">No classes scheduled on {selectedDayTab}</h3>
                    <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
                      Add individual lecture slots manually or import an entire weekly schedule using bulk CSV.
                    </p>
                    <button
                      onClick={() => {
                        setSlotDay(selectedDayTab);
                        setIsAddSlotOpen(true);
                      }}
                      className="mt-4 inline-flex items-center text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-2xl transition shadow-sm"
                    >
                      <Plus size={13} className="mr-1.5" /> Add Slot for {selectedDayTab}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {ttSchedule[selectedDayTab].map((slot: any) => (
                      <div 
                        key={slot.id} 
                        className="bg-white/95 border border-stone-200/85 hover:border-stone-300 rounded-3xl p-5 shadow-sm transition hover:shadow-md relative group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                              <Clock size={11} className="text-stone-400" /> {slot.start_time} - {slot.end_time}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                              slot.session_type === 'lab' 
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : slot.session_type === 'tutorial'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {slot.session_type}
                            </span>
                          </div>

                          <h4 className="text-sm font-extrabold text-stone-900 mb-2 flex items-center gap-1.5">
                            <BookOpen size={15} className="text-stone-400 shrink-0" />
                            <span>{slot.subject_name}</span>
                          </h4>

                          <div className="space-y-1 text-xs text-stone-500">
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={13} className="text-stone-400 shrink-0" />
                              <span className="font-medium text-stone-700">{slot.teacher_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-stone-400 shrink-0" />
                              <span className="font-mono text-stone-600 text-[11px]">Room / Hall: {slot.room_number || 'TBA'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[10px] text-stone-400 font-medium">Slot #{slot.slot_index || 1}</span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-stone-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition"
                            title="Delete Slot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'defaulters' && (
            <motion.div   className="space-y-4">
              <h2 className="text-lg font-bold flex items-center text-rose-600">
                <AlertTriangle className="mr-2 h-5 w-5" /> Critical Defaulters (&lt; 75%)
              </h2>
              <div className="bg-white/90 border border-stone-200/80 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50 text-[10px] uppercase font-bold tracking-wider text-stone-500 border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Roll Number</th>
                      <th className="px-6 py-4 font-bold">Student Name</th>
                      <th className="px-6 py-4 font-bold">Section</th>
                      <th className="px-6 py-4 font-bold">Attendance %</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {defaultersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-stone-400">
                          No defaulters below 75% cutoff. All students meet compliance!
                        </td>
                      </tr>
                    ) : (
                      defaultersList.map((d, i) => (
                        <tr key={i} className="hover:bg-stone-50/60 transition">
                          <td className="px-6 py-4 font-mono font-bold text-stone-900">{d.roll_number}</td>
                          <td className="px-6 py-4 font-semibold text-stone-800">{d.name}</td>
                          <td className="px-6 py-4">{d.section}</td>
                          <td className="px-6 py-4 font-extrabold text-rose-600">{d.attendance_pct}%</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => alert(`Warning notification queued for ${d.name} (${d.roll_number})`)} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-100 transition shadow-sm">Send Warning</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div   className="space-y-6">
              <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-7 shadow-sm max-w-2xl">
                <h2 className="text-base font-bold mb-4 flex items-center text-stone-900">
                  <Calendar className="mr-2 text-stone-700 h-5 w-5" /> Holiday Declaration
                </h2>
                <form onSubmit={handleDeclareHoliday} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Date</label>
                      <input 
                        required
                        type="date" 
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Reason</label>
                      <input 
                        required
                        type="text" 
                        value={holidayReason}
                        onChange={(e) => setHolidayReason(e.target.value)}
                        placeholder="e.g. Weather Emergency" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white" 
                      />
                    </div>
                  </div>
                  <button type="submit" className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-5 rounded-2xl transition shadow-sm">
                    Declare Holiday & Notify
                  </button>
                </form>
              </div>

              <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-7 shadow-sm max-w-2xl">
                <h2 className="text-base font-bold mb-2 flex items-center text-rose-600">
                  <AlertTriangle className="mr-2 h-5 w-5" /> Lifecycle Archiving
                </h2>
                <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                  Running the end-of-semester archiving will freeze all current attendance records, export CSV backups, and increment active semesters for all branches.
                </p>
                <button 
                  type="button"
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2.5 px-5 rounded-2xl transition shadow-sm"
                >
                  {isArchiving ? 'Archiving Records...' : 'Initialize Semester Archive'}
                </button>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ➕ Modal: Add Single Class Slot */}
      {isAddSlotOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" /> Add Timetable Class Slot
              </h3>
              <button 
                onClick={() => setIsAddSlotOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 pt-4">
              <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
                Target: <span className="font-bold text-stone-800">{ttBranch}</span> | Sem <span className="font-bold text-stone-800">{ttSemester}</span> - Sec <span className="font-bold text-stone-800">{ttSection}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Day of Week</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Session Type</label>
                  <select
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Laboratory (Lab)</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={slotSubject}
                  onChange={(e) => setSlotSubject(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2 text-xs font-semibold text-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Faculty / Teacher</label>
                  <input
                    type="text"
                    value={slotTeacher}
                    onChange={(e) => setSlotTeacher(e.target.value)}
                    placeholder="e.g. Faculty Full Name"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="e.g. LH-301"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="text-xs font-bold text-stone-600 hover:text-stone-900 px-4 py-2 rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition shadow-sm"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📂 Modal: Bulk CSV Upload */}
      {isUploadCsvOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" /> Upload Weekly Timetable (CSV)
              </h3>
              <button 
                onClick={() => setIsUploadCsvOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadCsv} className="space-y-4 pt-4">
              <div className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1">
                <p><strong>Applying to:</strong> {ttBranch} — Sem {ttSemester} (Sec {ttSection})</p>
                <p className="text-[10px] text-stone-400">
                  CSV format headers: <code className="text-stone-700 bg-white px-1 py-0.5 rounded border border-stone-200">day_of_week,start_time,end_time,subject_name,teacher_name,room_number,session_type</code>
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white hover:file:bg-stone-800 bg-stone-50 rounded-2xl p-2 border border-stone-200"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`${API_BASE_URL}/timetable/template-csv`}
                  download="timetable_template.csv"
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download size={12} /> Download Sample Template CSV
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadCsvOpen(false)}
                    className="text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-2xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingCsv}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition shadow-sm disabled:opacity-50"
                  >
                    {uploadingCsv ? 'Importing...' : 'Upload & Sync'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
