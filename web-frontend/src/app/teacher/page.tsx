'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ScanFace, 
  GraduationCap, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  BookOpen, 
  UserCheck, 
  Clock, 
  Layers, 
  AlertCircle,
  Building2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Send,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  Lock,
  KeyRound,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000';

interface Student {
  id: number;
  roll_number: string;
  name: string;
  branch: string;
  semester: number;
  section: string;
  phone?: string;
  has_face?: boolean;
}

interface Subject {
  id: number;
  code: string;
  name: string;
  branch: string;
  semester: number;
}

export default function TeacherAttendancePage() {
  // Navigation & Metadata
  const [branches, setBranches] = useState<string[]>([
    'Computer Science & Engineering', 
    'Information Technology', 
    'Electronics & Communication', 
    'Mechanical Engineering'
  ]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Kiosk PIN Security States (Default: null / No PIN)
  const [kioskExitPin, setKioskExitPin] = useState<string | null>(null);
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [isExitChallengeOpen, setIsExitChallengeOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [challengePinInput, setChallengePinInput] = useState('');
  const [kioskPinError, setKioskPinError] = useState<string | null>(null);
  const [kioskPinSuccess, setKioskPinSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedPin = localStorage.getItem('teacher_kiosk_exit_pin');
    if (savedPin) {
      setKioskExitPin(savedPin);
    }
  }, []);

  const handleSaveKioskPin = () => {
    setKioskPinError(null);
    setKioskPinSuccess(null);

    if (kioskExitPin) {
      if (!currentPinInput) {
        setKioskPinError("Please enter your current PIN (purani PIN).");
        return;
      }
      if (currentPinInput !== kioskExitPin) {
        setKioskPinError("Incorrect Current PIN! Purani PIN galat hai.");
        return;
      }
    }

    if (!newPinInput || newPinInput.trim().length === 0) {
      setKioskPinError("Please enter a new PIN.");
      return;
    }
    if (newPinInput.length < 4) {
      setKioskPinError("New PIN must be at least 4 digits.");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setKioskPinError("New PIN and Confirm PIN do not match.");
      return;
    }

    localStorage.setItem('teacher_kiosk_exit_pin', newPinInput);
    const wasUpdate = !!kioskExitPin;
    setKioskExitPin(newPinInput);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setKioskPinSuccess(wasUpdate ? "✓ Kiosk Exit PIN updated successfully!" : "✓ Kiosk Exit PIN set! Console exit is now protected.");
    setTimeout(() => setKioskPinSuccess(null), 3500);
  };

  const handleRemoveKioskPin = () => {
    setKioskPinError(null);
    if (!currentPinInput) {
      setKioskPinError("Enter your current PIN to remove security lock.");
      return;
    }
    if (currentPinInput !== kioskExitPin) {
      setKioskPinError("Incorrect Current PIN. Cannot remove.");
      return;
    }

    localStorage.removeItem('teacher_kiosk_exit_pin');
    setKioskExitPin(null);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setKioskPinSuccess("✓ Kiosk Exit PIN removed. Default (No PIN) restored.");
    setTimeout(() => setKioskPinSuccess(null), 3500);
  };

  const handleRequestHomeExit = (e: React.MouseEvent) => {
    if (kioskExitPin) {
      e.preventDefault();
      setChallengePinInput('');
      setKioskPinError(null);
      setIsExitChallengeOpen(true);
    }
  };

  const handleVerifyExitChallenge = () => {
    if (challengePinInput === kioskExitPin) {
      setIsExitChallengeOpen(false);
      window.location.href = '/';
    } else {
      setKioskPinError("Incorrect Security PIN. Access Denied.");
      setChallengePinInput('');
    }
  };

  // Form selections
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Science & Engineering');
  const [selectedSemester, setSelectedSemester] = useState<number>(6);
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [sessionCategory, setSessionCategory] = useState<'regular' | 'guest' | 'proxy'>('regular');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [conductedByName, setConductedByName] = useState<string>('Dr. Rajesh Sharma');
  const [isSecondLecture, setIsSecondLecture] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Student Roster & Attendance States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, boolean>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'present' | 'absent'>('all');

  // Submission States
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any | null>(null);

  // 1. Fetch Metadata (Branches, Subjects)
  const fetchMeta = async () => {
    try {
      setLoadingMeta(true);
      const res = await fetch(`${API_BASE_URL}/attendance/departments-meta`);
      if (res.ok) {
        const data = await res.json();
        if (data.branches && data.branches.length > 0) setBranches(data.branches);
        if (data.subjects) setAvailableSubjects(data.subjects);
        if (data.teachers && data.teachers.length > 0 && !conductedByName) {
          setConductedByName(data.teachers[0].name);
        }
      }
    } catch {
      console.log('Error loading metadata, using defaults');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  // Filter subjects for the selected branch and semester
  const filteredSubjects = useMemo(() => {
    return availableSubjects.filter(s => 
      s.branch.toLowerCase().includes(selectedBranch.toLowerCase()) && 
      (selectedSemester ? s.semester === selectedSemester : true)
    );
  }, [availableSubjects, selectedBranch, selectedSemester]);

  // Set default subject if changed
  useEffect(() => {
    if (filteredSubjects.length > 0 && (!selectedSubjectId || !filteredSubjects.some(s => s.id === selectedSubjectId))) {
      setSelectedSubjectId(filteredSubjects[0].id);
    }
  }, [filteredSubjects, selectedSubjectId]);

  // 2. Fetch Roster when Branch, Semester, or Section changes
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams({
        branch: selectedBranch,
        semester: selectedSemester.toString(),
        section: selectedSection
      });
      const res = await fetch(`${API_BASE_URL}/attendance/class-students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const roster: Student[] = (data.students || []).sort((a: Student, b: Student) => 
          a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' })
        );
        setStudents(roster);

        // Default all students to PRESENT
        const initialAttendance: Record<number, boolean> = {};
        roster.forEach(s => {
          initialAttendance[s.id] = true;
        });
        setAttendanceState(initialAttendance);
      }
    } catch {
      console.log('Error fetching students roster');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedBranch, selectedSemester, selectedSection]);

  // Attendance Toggles
  const toggleAttendance = (studentId: number) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAll = (status: boolean) => {
    const updated: Record<number, boolean> = {};
    students.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceState(updated);
  };

  // Metrics
  const totalStudentsCount = students.length;
  const presentCount = useMemo(() => {
    return Object.values(attendanceState).filter(Boolean).length;
  }, [attendanceState]);
  const absentCount = totalStudentsCount - presentCount;
  const turnoutPct = totalStudentsCount > 0 ? ((presentCount / totalStudentsCount) * 100).toFixed(1) : '0.0';

  // Filtered Students in UI - Strictly sorted by roll number
  const displayStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }))
      .filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const isPres = !!attendanceState[s.id];
        if (filterTab === 'present') return isPres;
        if (filterTab === 'absent') return !isPres;
        return true;
      });
  }, [students, attendanceState, searchQuery, filterTab]);

  // Selected Subject Details
  const currentSubjectObj = useMemo(() => {
    return availableSubjects.find(s => s.id === selectedSubjectId);
  }, [availableSubjects, selectedSubjectId]);

  // Submit Final Attendance to Backend
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      // Strictly sequential payload by roll number
      const attendanceList = [...students]
        .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }))
        .map(s => ({
          student_id: s.id,
          roll_number: s.roll_number,
          is_present: !!attendanceState[s.id],
          status_tag: attendanceState[s.id] ? 'PRESENT' : 'ABSENT',
          remarks: !attendanceState[s.id] ? 'Marked Absent in classroom session' : null
        }));

      let notesCombined = sessionNotes.trim();
      if (isSecondLecture) {
        notesCombined = notesCombined ? `[Lecture 2 of the day] ${notesCombined}` : 'Lecture 2 of the day';
      }
      if (sessionCategory === 'proxy') {
        notesCombined = notesCombined ? `[Proxy Lecture] ${notesCombined}` : 'Proxy Lecture';
      }

      const payload = {
        branch: selectedBranch,
        semester: selectedSemester,
        section: selectedSection,
        session_type: sessionCategory === 'guest' ? 'guest_lecture' : 'lecture',
        subject_id: sessionCategory === 'guest' ? null : selectedSubjectId,
        custom_subject_name: sessionCategory === 'guest' ? (customSubjectName.trim() || 'Special Industry Guest Lecture') : (currentSubjectObj?.name || null),
        conducted_by_name: conductedByName.trim() || 'Faculty Coordinator',
        notes: notesCombined || null,
        attendance: attendanceList
      };

      const res = await fetch(`${API_BASE_URL}/attendance/create-and-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setSubmissionSuccess(result);
        setIsReviewOpen(false);
      } else {
        const err = await res.json();
        alert(`Error submitting attendance: ${err.detail || 'Server error'}`);
      }
    } catch {
      alert('Failed to connect to backend server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-gradient-to-br from-indigo-600/15 via-purple-600/15 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-600/10 via-teal-600/10 to-transparent blur-[140px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link 
              href="/"
              onClick={handleRequestHomeExit}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                kioskExitPin 
                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-300 hover:bg-amber-900/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={kioskExitPin ? "Protected Return Home (PIN Required)" : "Return Home"}
            >
              {kioskExitPin ? <Lock className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Link>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ScanFace className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Teacher Terminal
                </span>
                <span className="text-xs text-slate-400">• Institutional Kiosk</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">Classroom Attendance Console</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Kiosk PIN Configuration Button */}
            <button
              onClick={() => {
                setKioskPinError(null);
                setKioskPinSuccess(null);
                setIsKioskModalOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center space-x-1.5 ${
                kioskExitPin 
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
              title="Configure Kiosk Exit PIN"
            >
              <KeyRound className={`h-3.5 w-3.5 ${kioskExitPin ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{kioskExitPin ? 'Exit PIN: Active 🔒' : 'Set Kiosk PIN'}</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">Conductor:</span>
              <span className="text-xs font-bold text-white">{conductedByName || 'Faculty'}</span>
            </div>
            <Link
              href="http://localhost:3003/classes"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5"
            >
              <span>HOD Deck</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </Link>

            <Link
              href="/settings"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center space-x-1.5"
              title="System & Scanner Settings"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Step 1: Lecture & Class Setup Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-slate-950/50 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">1. Select Target Class & Lecture Details</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure the department, semester, section, and choose between regular subject or guest lecture.
              </p>
            </div>

            {/* Lecture Mode Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-stretch sm:self-auto">
              <button
                onClick={() => setSessionCategory('regular')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'regular'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Regular Subject</span>
              </button>
              <button
                onClick={() => setSessionCategory('guest')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'guest'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Guest Lecture</span>
              </button>
              <button
                onClick={() => setSessionCategory('proxy')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'proxy'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Proxy Class</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Department Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Department / Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
              >
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Year / Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Class Section
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['A', 'B', 'C'].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      selectedSection === sec
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Sec {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Conducted By Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Conducted By (Teacher Name)
              </label>
              <input
                type="text"
                value={conductedByName}
                onChange={(e) => setConductedByName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma / Guest Speaker"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Subject or Guest Lecture Topic Specification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {sessionCategory === 'regular' || sessionCategory === 'proxy' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Academic Subject
                </label>
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
                >
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map(subj => (
                      <option key={subj.id} value={subj.id}>
                        {subj.code} - {subj.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Core Departmental Lecture</option>
                  )}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-400 mb-1.5 flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Guest Lecture Title / Topic Covered</span>
                </label>
                <input
                  type="text"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="e.g. Special Guest Lecture: Generative AI & Autonomous Agents"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-purple-800/60 text-white text-sm font-medium focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            )}

            {/* Session Notes & 2nd Lecture Flag */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lecture Remarks / Slot Details
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSecondLecture}
                    onChange={(e) => setIsSecondLecture(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0"
                  />
                  <span className="text-[11px] font-semibold text-indigo-400">2nd Lecture of the Day</span>
                </label>
              </div>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="e.g. Extra afternoon slot, Lab practicals, Guest speaker from Google"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Student Attendance Marking Roster */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-slate-950/50 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">2. Mark Student Attendance Roster</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Showing enrolled students for <span className="text-white font-semibold">{selectedBranch} Sem {selectedSemester} Sec {selectedSection}</span>. Toggle attendance below.
              </p>
            </div>

            {/* Turnout Stats Pill */}
            <div className="flex items-center space-x-4 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Present</div>
                <div className="text-base font-extrabold text-emerald-400">{presentCount} <span className="text-xs text-slate-500 font-normal">/ {totalStudentsCount}</span></div>
              </div>
              <div className="h-7 w-[1px] bg-slate-800" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Absent</div>
                <div className="text-base font-extrabold text-rose-400">{absentCount}</div>
              </div>
              <div className="h-7 w-[1px] bg-slate-800" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Turnout</div>
                <div className="text-base font-extrabold text-indigo-400">{turnoutPct}%</div>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Filter Tabs, Bulk Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or roll number..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({totalStudentsCount})
              </button>
              <button
                onClick={() => setFilterTab('present')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterTab === 'present' ? 'bg-emerald-600/30 text-emerald-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setFilterTab('absent')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterTab === 'absent' ? 'bg-rose-600/30 text-rose-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Absent ({absentCount})
              </button>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => markAll(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center space-x-1"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => markAll(false)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center space-x-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Student Roster Grid */}
          {loadingStudents ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
              <p className="text-xs">Loading class roster from database...</p>
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800">
              <Users className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No students found matching current criteria.</p>
              <p className="text-xs text-slate-500 mt-1">Try switching department, semester, or section parameters above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayStudents.map((st) => {
                const isPresent = !!attendanceState[st.id];
                return (
                  <motion.div
                    key={st.id}
                    layout
                    onClick={() => toggleAttendance(st.id)}
                    className={`cursor-pointer select-none rounded-2xl p-4 border transition-all flex items-center justify-between ${
                      isPresent
                        ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-950/80 border-rose-500/30 hover:border-rose-400/60 opacity-85'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-white">{st.name}</span>
                        {st.has_face && (
                          <span title="Face Biometrics Enrolled">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                        <span className="font-mono text-indigo-300 font-semibold">{st.roll_number}</span>
                        <span>• Sec {st.section || selectedSection}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAttendance(st.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                        isPresent
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Present</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>Absent</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Submission Action Bar */}
          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-400">
              Ready to transmit: <span className="text-emerald-400 font-bold">{presentCount} Present</span>, <span className="text-rose-400 font-bold">{absentCount} Absent</span> to HOD Records.
            </div>

            <button
              onClick={() => setIsReviewOpen(true)}
              disabled={students.length === 0}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span>Review & Submit to HOD</span>
            </button>
          </div>
        </div>
      </main>

      {/* Review & Confirmation Modal */}
      <AnimatePresence>
        {isReviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Classroom Attendance Submission</h3>
                  <p className="text-xs text-slate-400">This will commit the attendance log directly to institutional records.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Conducted By:</span>
                  <span className="font-bold text-white">{conductedByName || 'Faculty Coordinator'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Session Nature:</span>
                  <span className="font-bold uppercase text-purple-400">{sessionCategory.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Subject / Topic:</span>
                  <span className="font-bold text-white">
                    {sessionCategory === 'guest' 
                      ? (customSubjectName || 'Special Guest Lecture') 
                      : (currentSubjectObj?.name || 'Core Lecture')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Class & Section:</span>
                  <span className="font-bold text-white">{selectedBranch} • Sem {selectedSemester} • Sec {selectedSection}</span>
                </div>
                {sessionNotes && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Notes:</span>
                    <span className="text-slate-300 italic">{sessionNotes}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm pt-2">
                  <span className="font-semibold text-slate-300">Turnout Summary:</span>
                  <span className="font-extrabold text-emerald-400">
                    {presentCount} Present / {absentCount} Absent ({turnoutPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel & Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm & Commit</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Success Screen Modal */}
      <AnimatePresence>
        {submissionSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 text-center space-y-5"
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Attendance Successfully Committed!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Session ID <span className="font-mono text-indigo-400 font-bold">#{submissionSuccess.session_id}</span> has been logged to institutional records.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Conducted By:</span>
                  <span className="font-bold text-white">{submissionSuccess.conducted_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nature:</span>
                  <span className="font-bold text-purple-400 uppercase">{submissionSuccess.session_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Turnout:</span>
                  <span className="font-bold text-emerald-400">{submissionSuccess.present_count} Present, {submissionSuccess.absent_count} Absent</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmissionSuccess(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  New Class Session
                </button>
                <Link
                  href="http://localhost:3003/classes"
                  target="_blank"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <span>Inspect in HOD Portal</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kiosk Configuration Modal */}
      <AnimatePresence>
        {isKioskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Kiosk Exit Security PIN</h3>
                    <p className="text-xs text-slate-400">Teacher Protection Lock</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsKioskModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-medium text-slate-400">Current Security Status:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  kioskExitPin 
                    ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-300' 
                    : 'bg-amber-950/60 border border-amber-800/40 text-amber-300'
                }`}>
                  {kioskExitPin ? '● PIN Protected' : '○ No PIN (Default Open)'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {kioskExitPin
                  ? "Kiosk exit is secured with your PIN. To change your PIN, enter your current (purani) PIN first."
                  : "Default is set to No PIN. Set a 4-digit PIN so students cannot exit or leave the attendance kiosk."}
              </p>

              {kioskPinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 font-semibold">
                  {kioskPinSuccess}
                </div>
              )}
              {kioskPinError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 font-semibold">
                  ⚠ {kioskPinError}
                </div>
              )}

              <div className="space-y-3">
                {kioskExitPin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Current PIN (Purani PIN)
                    </label>
                    <input 
                      type="password"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="Enter existing PIN"
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {kioskExitPin ? 'New Kiosk PIN (4 digits)' : 'Set New Kiosk PIN (4 digits)'}
                  </label>
                  <input 
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="e.g. 2468"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New PIN
                  </label>
                  <input 
                    type="password"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Re-enter PIN"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveKioskPin}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
                >
                  {kioskExitPin ? 'Update Kiosk PIN' : 'Save Kiosk PIN'}
                </button>
                {kioskExitPin && (
                  <button
                    type="button"
                    onClick={handleRemoveKioskPin}
                    className="px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/40 font-bold text-xs transition"
                  >
                    Remove PIN
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kiosk Exit Challenge Modal */}
      <AnimatePresence>
        {isExitChallengeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Faculty Exit Verification</h3>
                <p className="text-xs text-slate-400 mt-1">
                  This console is locked in Kiosk Mode. Enter your Teacher PIN to exit.
                </p>
              </div>

              {kioskPinError && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 font-semibold">
                  ⚠ {kioskPinError}
                </div>
              )}

              <div>
                <input 
                  type="password"
                  autoFocus
                  value={challengePinInput}
                  onChange={(e) => {
                    setChallengePinInput(e.target.value);
                    setKioskPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyExitChallenge();
                  }}
                  placeholder="••••"
                  maxLength={8}
                  className="w-full text-center px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xl tracking-widest font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyExitChallenge}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
                >
                  Verify & Exit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExitChallengeOpen(false);
                    setChallengePinInput('');
                    setKioskPinError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Platform Credit Footer */}
      <footer className="mt-12 border-t border-slate-900/80 pt-6 pb-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto px-4">
        <p>© 2026 Smart Attendance Suite • Faculty Mobile & Web Kiosk Engine</p>
        <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
          <span>System Architect & Lead Developer:</span>
          <span className="font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-0.5 rounded-full">
            Created by Ronak Agrawal
          </span>
        </div>
      </footer>
    </div>
  );
}
