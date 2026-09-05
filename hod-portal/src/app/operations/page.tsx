'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Users, 
  Award, 
  FileCheck2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  Clock, 
  Search,
  BookOpen,
  ArrowRightLeft,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

type TabType = 'dutyleave' | 'holidays' | 'proxy' | 'classtests';

export default function AcademicOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dutyleave');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dutyLeaveRecords, setDutyLeaveRecords] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [proxyList, setProxyList] = useState<any[]>([]);
  const [testRecords, setTestRecords] = useState<any[]>([]);

  // Form states
  const [odStudentRoll, setOdStudentRoll] = useState('');
  const [odDate, setOdDate] = useState(new Date().toISOString().slice(0, 10));
  const [odEvent, setOdEvent] = useState('Smart India Hackathon Finalist');
  const [odRemarks, setOdRemarks] = useState('Official College Representation Duty Leave');

  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().slice(0, 10));
  const [holidayDesc, setHolidayDesc] = useState('');

  const [proxyOrigTeacher, setProxyOrigTeacher] = useState<number | null>(null);
  const [proxySubTeacher, setProxySubTeacher] = useState<number | null>(null);
  const [proxySubject, setProxySubject] = useState<number | null>(null);
  const [proxyDate, setProxyDate] = useState(new Date().toISOString().slice(0, 10));
  const [proxyReason, setProxyReason] = useState('Attending National Conference / FDP');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('hod_token') || localStorage.getItem('token')) : null;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch basic metadata
      const [stRes, tRes, sRes, odRes, hRes, pRes, testRes] = await Promise.all([
        fetch(`${API_BASE_URL}/management/crud/students`, { headers }),
        fetch(`${API_BASE_URL}/management/crud/teachers`, { headers }),
        fetch(`${API_BASE_URL}/management/crud/subjects`, { headers }),
        fetch(`${API_BASE_URL}/management/hod/duty-leave/records`, { headers }),
        fetch(`${API_BASE_URL}/management/holidays`, { headers }),
        fetch(`${API_BASE_URL}/management/hod/proxy/list`, { headers }),
        fetch(`${API_BASE_URL}/management/attendance/test-records`, { headers })
      ]);

      if (stRes.ok) setStudents((await stRes.json()).students || []);
      if (tRes.ok) setTeachers((await tRes.json()).teachers || []);
      if (sRes.ok) setSubjects((await sRes.json()).subjects || []);
      if (odRes.ok) setDutyLeaveRecords((await odRes.json()).records || []);
      if (hRes.ok) setHolidays((await hRes.json()).holidays || []);
      if (pRes.ok) setProxyList((await pRes.json()).proxy_assignments || []);
      if (testRes.ok) setTestRecords((await testRes.json()).test_records || []);
    } catch (e) {
      console.error(e);
      showToast('Error loading operational records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. Grant Duty Leave Handler
  const handleGrantDutyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const matched = students.find(s => s.roll_number.toLowerCase() === odStudentRoll.trim().toLowerCase());
    if (!matched) {
      showToast(`Student with roll number ${odStudentRoll} not found.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/management/hod/duty-leave/grant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_ids: [matched.id],
          date: odDate,
          event_name: odEvent,
          remarks: odRemarks
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setOdStudentRoll('');
        fetchAllData();
      } else {
        showToast('Failed to grant duty leave.');
      }
    } catch {
      showToast('Network error.');
    }
  };

  // 2. Declare Holiday Handler
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayTitle.trim()) {
      showToast('Please provide a holiday title.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/management/holidays`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: holidayTitle,
          date: holidayDate,
          department: 'Computer Science',
          description: holidayDesc
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setHolidayTitle('');
        setHolidayDesc('');
        fetchAllData();
      } else {
        showToast('Failed to declare holiday.');
      }
    } catch {
      showToast('Network error.');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/management/holidays/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Holiday removed.');
        fetchAllData();
      }
    } catch {
      showToast('Network error.');
    }
  };

  // 3. Assign Proxy Teacher Handler
  const handleAssignProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proxyOrigTeacher || !proxySubTeacher || !proxySubject) {
      showToast('Please select original faculty, substitute faculty, and subject.');
      return;
    }
    if (proxyOrigTeacher === proxySubTeacher) {
      showToast('Original faculty and substitute cannot be the same person.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/management/hod/proxy/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          original_teacher_id: proxyOrigTeacher,
          proxy_teacher_id: proxySubTeacher,
          subject_id: proxySubject,
          date: proxyDate,
          reason: proxyReason
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        fetchAllData();
      } else {
        showToast('Failed to allocate proxy teacher.');
      }
    } catch {
      showToast('Network error.');
    }
  };

  // 4. Notify Test Absentee Parents
  const handleNotifyTestParents = async (session_id: number, subject_name: string, absentees: any[]) => {
    if (!absentees.length) {
      showToast('No absentees in this test session.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/management/attendance/test-absentees/notify-parents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          session_id,
          subject_name,
          absent_student_ids: absentees.map(a => a.id)
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
      } else {
        showToast('Failed to dispatch parent alerts.');
      }
    } catch {
      showToast('Network error.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-xs shadow-2xl flex items-center space-x-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Departmental Academic Operations</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage Duty Leave (OD) exemptions, holiday calendar, proxy teaching handovers, and Class Test attendance proof.
          </p>
        </div>

        <button 
          onClick={fetchAllData}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh All Records"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Operational Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveTab('dutyleave')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'dutyleave'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Award className="h-4 w-4 text-indigo-300" />
          <span>Duty Leave (OD) Exemption</span>
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'holidays'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4 text-amber-300" />
          <span>Holidays & Class Suspension</span>
        </button>

        <button
          onClick={() => setActiveTab('proxy')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'proxy'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4 text-cyan-300" />
          <span>Substitute / Proxy Teachers</span>
        </button>

        <button
          onClick={() => setActiveTab('classtests')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'classtests'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="h-4 w-4 text-emerald-300" />
          <span>Class Tests & Exams</span>
        </button>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. DUTY LEAVE (OD) TAB */}
      {activeTab === 'dutyleave' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grant Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Award className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Grant Official Duty Leave</h3>
            </div>
            <p className="text-xs text-slate-400">
              For students representing the institution at hackathons, sports tournaments, and conferences.
            </p>

            <form onSubmit={handleGrantDutyLeave} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Student Roll Number</label>
                <input
                  type="text"
                  required
                  value={odStudentRoll}
                  onChange={(e) => setOdStudentRoll(e.target.value)}
                  placeholder="e.g. CS2024001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Event Date</label>
                <input
                  type="date"
                  required
                  value={odDate}
                  onChange={(e) => setOdDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Event / Competition Name</label>
                <input
                  type="text"
                  required
                  value={odEvent}
                  onChange={(e) => setOdEvent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Verification Remarks</label>
                <input
                  type="text"
                  value={odRemarks}
                  onChange={(e) => setOdRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Grant Verified OD Attendance</span>
              </button>
            </form>
          </div>

          {/* Audit Records Table */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>Official Duty Leave (OD) Audit Trail</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Subject Session</th>
                    <th className="py-2.5 px-3">Event / Reason</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {dutyLeaveRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-white">{r.student_name}</td>
                      <td className="py-3 px-3 font-mono text-indigo-300">{r.roll_number}</td>
                      <td className="py-3 px-3">{r.subject}</td>
                      <td className="py-3 px-3 text-slate-400">{r.remarks}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                          DUTY LEAVE (100%)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dutyLeaveRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No Duty Leave records granted yet for this academic term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. HOLIDAYS TAB */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Holiday Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Calendar className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Declare Department Holiday</h3>
            </div>
            <p className="text-xs text-slate-400">
              Suspends classroom sessions on fest, workshop, or holiday dates with zero attendance penalty.
            </p>

            <form onSubmit={handleCreateHoliday} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Holiday / Event Title</label>
                <input
                  type="text"
                  required
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  placeholder="e.g. Department Coding Fest 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Date</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Description / Notes</label>
                <textarea
                  rows={3}
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  placeholder="Regular classes suspended for national seminar..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>Declare Non-Instructional Day</span>
              </button>
            </form>
          </div>

          {/* Holidays Calendar List */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Official Departmental Holidays & Suspensions</span>
            </h3>

            <div className="space-y-3">
              {holidays.map((h) => (
                <div key={h.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{h.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {h.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{h.description || 'Classes suspended for department.'}</p>
                    <span className="text-[10px] text-slate-500">Declared by: {h.created_by}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
                    title="Remove Holiday"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {holidays.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No upcoming holidays scheduled for this department.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. PROXY TEACHERS TAB */}
      {activeTab === 'proxy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proxy Assignment Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <ArrowRightLeft className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Assign Proxy Faculty</h3>
            </div>
            <p className="text-xs text-slate-400">
              Authorizes a substitute teacher to conduct sessions & take attendance when regular faculty is absent.
            </p>

            <form onSubmit={handleAssignProxy} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Regular / Absent Faculty</label>
                <select
                  required
                  value={proxyOrigTeacher || ''}
                  onChange={(e) => setProxyOrigTeacher(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Select Regular Faculty --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.department})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Substitute / Proxy Faculty</label>
                <select
                  required
                  value={proxySubTeacher || ''}
                  onChange={(e) => setProxySubTeacher(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Select Substitute Faculty --</option>
                  {teachers.filter(t => t.id !== proxyOrigTeacher).map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.department})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Subject / Lecture</label>
                <select
                  required
                  value={proxySubject || ''}
                  onChange={(e) => setProxySubject(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Date of Proxy</label>
                <input
                  type="date"
                  required
                  value={proxyDate}
                  onChange={(e) => setProxyDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Reason for Absence</label>
                <input
                  type="text"
                  value={proxyReason}
                  onChange={(e) => setProxyReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Authorize Proxy Allocation</span>
              </button>
            </form>
          </div>

          {/* Active Proxy List */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
              <span>Active Department Proxy Allocations</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Regular Faculty</th>
                    <th className="py-2.5 px-3">Proxy Faculty</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {proxyList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-slate-300">{p.original_teacher}</td>
                      <td className="py-3 px-3 font-bold text-cyan-300">{p.proxy_teacher}</td>
                      <td className="py-3 px-3">{p.subject_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{p.date}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                  {proxyList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No proxy teaching allocations registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CLASS TESTS & EXAMS TAB */}
      {activeTab === 'classtests' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>Class Tests & Internal Exam Attendance Tracker</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Biometric proof of exam appearance and instant absentee alert dispatch for internal assessment compliance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testRecords.map((t) => (
              <div key={t.session_id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                      {t.subject_code}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{t.subject_name}</h4>
                    <p className="text-xs text-slate-400">{t.branch} • {t.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">{t.appeared_count} / {t.total_enrolled} Appeared</span>
                    {t.absent_count > 0 && (
                      <span className="block text-[10px] font-bold text-rose-400 mt-0.5">
                        {t.absent_count} Absent in Exam
                      </span>
                    )}
                  </div>
                </div>

                {t.absent_count > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-300">Exam Absentees List:</span>
                      <button
                        onClick={() => handleNotifyTestParents(t.session_id, t.subject_name, t.absentees)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition flex items-center space-x-1 shadow-lg shadow-rose-600/20"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send Absentee Alerts to Parents</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {t.absentees.map((a: any) => (
                        <div key={a.id} className="text-[11px] text-slate-300 flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span>{a.name} ({a.roll_number})</span>
                          <span className="text-slate-500 font-mono text-[10px]">{a.phone || 'No phone'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {testRecords.length === 0 && (
              <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                No class test or exam sessions recorded yet. Teachers can select "Session Type: Class Test" in the mobile app when conducting exams.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
