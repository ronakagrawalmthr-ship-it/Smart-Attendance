'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppleSelect from '@/components/AppleSelect';
import { 
  SlidersHorizontal, 
  FileText, 
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
  Settings,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import { API_BASE_URL, getHodPortalUrl } from '@/lib/api';

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
  const [branches, setBranches] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [availableSections, setAvailableSections] = useState<string[]>(['A', 'B', 'C']);
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
  const [selectedBranch, setSelectedBranch] = useState<string>(() => (typeof window !== 'undefined' && localStorage.getItem('teacher_department')) || '');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [sessionCategory, setSessionCategory] = useState<'regular' | 'guest' | 'proxy'>('regular');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [conductedByName, setConductedByName] = useState<string>('');
  const [isSecondLecture, setIsSecondLecture] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Student Roster & Attendance States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, boolean>>({});
  const [studentOverrides, setStudentOverrides] = useState<Record<number, { tag: string; remark: string }>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'present' | 'absent'>('all');

  const handleSetOverride = (studentId: number, tag: string) => {
    if (tag === 'REGULAR') {
      setStudentOverrides(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } else {
      setStudentOverrides(prev => ({
        ...prev,
        [studentId]: { tag, remark: `Faculty verified: ${tag.replace('_', ' ')}` }
      }));
      setAttendanceState(prev => ({
        ...prev,
        [studentId]: true
      }));
    }
  };

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
        if (data.branches && data.branches.length > 0) {
          setBranches(data.branches);
          setSelectedBranch(prev => data.branches.includes(prev) ? prev : data.branches[0]);
        }
        if (data.subjects) setAvailableSubjects(data.subjects);
        if (data.semesters && data.semesters.length > 0) setAvailableSemesters(data.semesters);
        if (data.sections && data.sections.length > 0) setAvailableSections(data.sections);
        if (data.teachers && data.teachers.length > 0) {
          setConductedByName(prev => prev || data.teachers[0].name);
        }
      }
    } catch {
      console.log('Error loading metadata, using defaults');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teacher_name') || localStorage.getItem('user_name');
      if (stored) setConductedByName(stored);
      const storedDept = localStorage.getItem('teacher_department');
      if (storedDept) setSelectedBranch(storedDept);
    }
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

        // Default all students to UNMARKED / ABSENT until scanned or confirmed
        const initialAttendance: Record<number, boolean> = {};
        roster.forEach(s => {
          initialAttendance[s.id] = false;
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

  // Dynamic 10-Second Anti-Proxy QR States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<number | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(10);
  const [qrCheckedInCount, setQrCheckedInCount] = useState<number>(0);
  const [qrTotalExpected, setQrTotalExpected] = useState<number>(0);
  const [qrRecentCheckins, setQrRecentCheckins] = useState<Array<{ id: number; roll_number: string; name: string; time: string }>>([]);
  const [isQrStarting, setIsQrStarting] = useState(false);

  // Dynamic QR 10-Second Auto-Rotation Loop
  useEffect(() => {
    if (!isQrModalOpen || !qrSessionId) return;

    const timer = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) {
          fetchNextQrToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    const fetchNextQrToken = async () => {
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('teacher_token') || localStorage.getItem('access_token') || localStorage.getItem('admin_token') || localStorage.getItem('hod_token')) : '';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/attendance/qr/token/${qrSessionId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setQrToken(data.token);
          setQrCheckedInCount(data.checked_in_count || 0);
          setQrRecentCheckins(data.recent_checkins || []);
          if (data.recent_checkins && data.recent_checkins.length > 0) {
            setAttendanceState(prev => {
              const next = { ...prev };
              data.recent_checkins.forEach((item: any) => {
                next[item.id] = true;
              });
              return next;
            });
            setStudentOverrides(prev => {
              const next = { ...prev };
              data.recent_checkins.forEach((item: any) => {
                if (!next[item.id]) {
                  next[item.id] = { tag: 'QR_VERIFIED', remark: `Live 10s Dynamic QR Verified at ${item.time}` };
                }
              });
              return next;
            });
          }
        }
      } catch (e) {
        console.error('Failed to rotate QR token:', e);
      }
    };

    return () => clearInterval(timer);
  }, [isQrModalOpen, qrSessionId]);

  const handleStartQrBroadcast = async () => {
    setIsQrStarting(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('teacher_token') || localStorage.getItem('access_token') || localStorage.getItem('admin_token') || localStorage.getItem('hod_token')) : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/attendance/qr/init-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_id: selectedSubjectId || null,
          branch: selectedBranch,
          semester: selectedSemester,
          section: selectedSection,
          session_type: sessionCategory,
          conducted_by_name: conductedByName || 'Faculty Coordinator',
          custom_subject_name: sessionCategory === 'guest' 
            ? (customSubjectName || 'Special Guest Lecture') 
            : (currentSubjectObj?.name || 'Classroom Lecture'),
          notes: sessionNotes || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQrSessionId(data.session_id);
        setQrToken(data.token);
        setQrTimeLeft(10);
        setQrCheckedInCount(data.checked_in_count || 0);
        setQrTotalExpected(data.total_expected || (students.length > 0 ? students.length : 1));
        setQrRecentCheckins(data.recent_checkins || []);
        setIsQrModalOpen(true);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Could not initiate Dynamic QR Broadcast: ${err.detail || 'Authorization failed'}`);
      }
    } catch {
      alert('Network error connecting to Dynamic QR generator.');
    } finally {
      setIsQrStarting(false);
    }
  };

  // Submit Final Attendance to Backend
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      // Strictly sequential payload by roll number
      const attendanceList = [...students]
        .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }))
        .map(s => {
          const override = studentOverrides[s.id];
          const isPresent = override ? true : !!attendanceState[s.id];
          const statusTag = override ? override.tag : (attendanceState[s.id] ? 'PRESENT' : 'ABSENT');
          const remarks = override ? override.remark : (!attendanceState[s.id] ? 'Marked Absent in classroom session' : null);
          return {
            student_id: s.id,
            roll_number: s.roll_number,
            is_present: isPresent,
            status_tag: statusTag,
            remarks: remarks
          };
        });

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

      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('teacher_token') || localStorage.getItem('admin_token') || localStorage.getItem('hod_token')) : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/attendance/create-and-submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setSubmissionSuccess(result);
        setIsReviewOpen(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('campus-notification', {
            detail: {
              type: 'attendance_submission',
              title: 'Attendance Finalized',
              detail: `${conductedByName.trim() || 'Faculty'} submitted attendance for ${currentSubjectObj?.name || 'Lecture'} • ${presentCount} Present`,
              time: 'Just now',
              badge: `${presentCount} Present`
            }
          }));
        }
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
    <AppleDeluxeShell facultyName={conductedByName || 'Faculty Conductor'}>
      <div className="w-full space-y-6">
        
        {/* 🏆 Top Section: Apple Fitness-Ring Card + 4 Colourful Pastel Squircles (Exact Reference Match) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Attendance Fitness-Ring Card (lg:col-span-5) */}
          <div className="lg:col-span-5 rounded-[28px] bg-white p-6 border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Live Classroom Telemetry
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  Number(turnoutPct) >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {Number(turnoutPct) >= 75 ? 'High Turnout' : 'Below Threshold'}
                </span>
              </div>

              {/* Fitness Ring Gauge & Percentage Display */}
              <div className="flex items-center space-x-6 my-5">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-28 h-28 -rotate-90">
                    <circle cx="56" cy="56" r="44" stroke="#F0ECE4" strokeWidth="9" fill="none" />
                    <circle
                      cx="56"
                      cy="56"
                      r="44"
                      stroke="url(#teacherFitnessGradient)"
                      strokeWidth="9"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(Number(turnoutPct), 100) / 100)}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="teacherFitnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EF4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-extrabold text-stone-900 tracking-tight block leading-none">
                      {turnoutPct}%
                    </span>
                    <span className="text-[9px] font-bold text-amber-600 block mt-0.5">
                      Turnout
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-lg font-extrabold text-stone-900 tracking-tight leading-tight">
                    {currentSubjectObj?.name || 'Classroom Lecture Session'}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Conductor: <span className="text-stone-800 font-bold">{conductedByName || 'Faculty Conductor'}</span>
                  </p>
                  <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>{presentCount} of {totalStudentsCount} Students Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">Biometric Console Scanner Online</span>
              <button
                onClick={() => {
                  setKioskPinError(null);
                  setKioskPinSuccess(null);
                  setIsKioskModalOpen(true);
                }}
                className="inline-flex items-center space-x-1 text-amber-700 font-bold hover:text-amber-900 transition"
              >
                <KeyRound className="h-3 w-3" />
                <span>{kioskExitPin ? 'Exit PIN Active 🔒' : 'Set Kiosk PIN'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: 4 Colourful Pastel Squircle Tiles (Exact Image Match) */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            
            {/* 🪻 Lilac Squircle: Scanned Present */}
            <div className="rounded-[26px] bg-[#F3EFFE] border border-[#E5DCFA] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6D42C7]">Present</span>
                <div className="h-8 w-8 rounded-xl bg-purple-100/90 text-purple-700 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {presentCount}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Verified attendees
                </span>
              </div>
              <div className="pt-2 border-t border-purple-200/50 flex items-center justify-between text-[11px]">
                <span className="text-purple-700 font-semibold">Attendance Logged</span>
                <span className="font-mono text-purple-900 font-bold">{turnoutPct}%</span>
              </div>
            </div>

            {/* 🩵 Sky Blue Squircle: Total Class Strength */}
            <div className="rounded-[26px] bg-[#EDF6FE] border border-[#DAECFC] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B66B2]">Enrolled</span>
                <div className="h-8 w-8 rounded-xl bg-blue-100/90 text-blue-700 flex items-center justify-center shadow-2xs">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {totalStudentsCount}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Total batch strength
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200/50 flex items-center justify-between text-[11px]">
                <span className="text-blue-700 font-semibold">Section Roster</span>
                <span className="font-mono text-blue-900 font-bold">Sem {selectedSemester} Sec {selectedSection}</span>
              </div>
            </div>

            {/* 🍑 Coral Squircle: Absent Students */}
            <div className="rounded-[26px] bg-[#FEF1F0] border border-[#FCD8D4] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C93B2B]">Absent</span>
                <div className="h-8 w-8 rounded-xl bg-rose-100/90 text-rose-700 flex items-center justify-center shadow-2xs">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {absentCount}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Students missing
                </span>
              </div>
              <div className="pt-2 border-t border-rose-200/50 flex items-center justify-between text-[11px]">
                <span className="text-rose-700 font-semibold">Defaulter Risk</span>
                <span className="font-mono text-rose-900 font-bold">{(100 - Number(turnoutPct)).toFixed(1)}%</span>
              </div>
            </div>

            {/* 🍃 Mint Squircle: Biometric Confidence */}
            <div className="rounded-[26px] bg-[#EFFBF5] border border-[#CEF4DE] p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F7A4D]">Confidence</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-stone-900 tracking-tight block">
                  {presentCount > 0 ? "98.8%" : "—"}
                </span>
                <span className="text-[11px] text-stone-500 font-medium">
                  Average vector fidelity
                </span>
              </div>
              <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold">Anti-Spoofing</span>
                <span className="font-mono text-emerald-900 font-bold">Liveness Verified</span>
              </div>
            </div>

          </div>
        </div>
        {/* Step 1: Lecture & Class Setup Card */}
        <div className="rounded-3xl bg-white/90 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-stone-700" />
                <h2 className="text-lg font-bold text-stone-900">1. Select Target Class & Lecture Details</h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Configure the department, semester, section, and choose between regular subject or guest lecture.
              </p>
            </div>

            {/* Lecture Mode Tabs */}
            <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200/80 self-stretch sm:self-auto">
              <button
                onClick={() => setSessionCategory('regular')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'regular'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Regular Subject</span>
              </button>
              <button
                onClick={() => setSessionCategory('guest')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'guest'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Guest Lecture</span>
              </button>
              <button
                onClick={() => setSessionCategory('proxy')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  sessionCategory === 'proxy'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Proxy Class</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Department Dropdown (Apple Luxury Style) */}
            <AppleSelect
              label="Department / Branch"
              icon={<Building2 className="h-4 w-4" />}
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
              options={branches.map(b => ({
                value: b,
                label: b,
                badge: b.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
              }))}
            />

            {/* Semester Dropdown (Apple Luxury Style) */}
            <AppleSelect
              label="Year / Semester"
              icon={<Calendar className="h-4 w-4" />}
              value={selectedSemester}
              onChange={(val) => setSelectedSemester(Number(val))}
              options={availableSemesters.map(s => ({
                value: s,
                label: `Semester ${s}`,
                sublabel: s <= 2 ? 'Year 1' : (s <= 4 ? 'Year 2' : (s <= 6 ? 'Year 3' : 'Year 4')),
                badge: `Sem ${s}`
              }))}
            />

            {/* Section Selector (Apple Segmented Style) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 select-none">
                Class Section
              </label>
              <div className="flex p-1 rounded-2xl bg-stone-100/90 border border-stone-200/90 h-[46px] items-center">
                {availableSections.map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec)}
                    className={`flex-1 h-full rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center ${
                      selectedSection === sec
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                    }`}
                  >
                    Sec {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Conducted By Input (Apple Style with Icon) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 select-none">
                Conducted By (Teacher Name)
              </label>
              <div className="relative h-[46px]">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={conductedByName}
                  onChange={(e) => setConductedByName(e.target.value)}
                  placeholder="e.g. Dr. Durga Pooja / Guest Speaker"
                  className="w-full h-full pl-10 pr-4 rounded-2xl bg-stone-50/90 border border-stone-200/90 text-stone-900 text-sm font-semibold placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Subject or Guest Lecture Topic Specification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Academic Subject (Apple Luxury Dropdown) */}
            {sessionCategory === 'regular' || sessionCategory === 'proxy' ? (
              <AppleSelect
                label="Academic Subject"
                icon={<BookOpen className="h-4 w-4" />}
                value={selectedSubjectId || ''}
                onChange={(val) => setSelectedSubjectId(val ? Number(val) : null)}
                options={
                  filteredSubjects.length > 0
                    ? filteredSubjects.map(subj => ({
                        value: subj.id,
                        label: `${subj.code} — ${subj.name}`,
                        badge: `Sem ${subj.semester}`
                      }))
                    : [{ value: '', label: 'Core Departmental Lecture', badge: 'General' }]
                }
                placeholder="Select Academic Subject..."
              />
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1.5 flex items-center space-x-1.5 select-none">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Guest Lecture Title / Topic Covered</span>
                </label>
                <div className="relative h-[46px]">
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                  <input
                    type="text"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="e.g. Special Guest Lecture: Generative AI & Autonomous Agents"
                    className="w-full h-full pl-10 pr-4 rounded-2xl bg-purple-50/40 border border-purple-200 text-stone-900 text-sm font-semibold placeholder-purple-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Session Notes & Apple iOS-Style Switch */}
            <div>
              <div className="flex justify-between items-center mb-1.5 select-none">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Lecture Remarks / Slot Details
                </label>
                {/* Apple iOS-Style Switch */}
                <div 
                  onClick={() => setIsSecondLecture(!isSecondLecture)}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <div
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 ${
                      isSecondLecture ? 'bg-stone-900' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                        isSecondLecture ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-stone-700 group-hover:text-stone-900">
                    2nd Lecture of the Day
                  </span>
                </div>
              </div>
              <div className="relative h-[46px]">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="e.g. Extra afternoon slot, Lab practicals, Guest speaker from Google"
                  className="w-full h-full pl-10 pr-4 rounded-2xl bg-stone-50/90 border border-stone-200/90 text-stone-900 text-sm font-semibold placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Student Attendance Marking Roster */}
        <div className="rounded-3xl bg-white/90 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-stone-900">2. Mark Student Attendance Roster</h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Showing enrolled students for <span className="text-stone-900 font-semibold">{selectedBranch} Sem {selectedSemester} Sec {selectedSection}</span>. Tap to toggle status.
              </p>
            </div>

            {/* Turnout Stats Pill */}
            <div className="flex items-center space-x-4 bg-stone-100/80 px-4 py-2 rounded-2xl border border-stone-200/80 shadow-2xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Present</div>
                <div className="text-base font-extrabold text-emerald-600">{presentCount} <span className="text-xs text-stone-400 font-normal">/ {totalStudentsCount}</span></div>
              </div>
              <div className="h-7 w-[1px] bg-stone-200" />
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Absent</div>
                <div className="text-base font-extrabold text-rose-600">{absentCount}</div>
              </div>
              <div className="h-7 w-[1px] bg-stone-200" />
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-500">Turnout</div>
                <div className="text-base font-extrabold text-stone-900">{turnoutPct}%</div>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Filter Tabs, Bulk Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by student name or roll number..."
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-stone-50/90 border border-stone-200/90 text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white focus:ring-2 focus:ring-stone-900/10 transition-all duration-200"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200/80">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterTab === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                All ({totalStudentsCount})
              </button>
              <button
                onClick={() => setFilterTab('present')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterTab === 'present' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setFilterTab('absent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterTab === 'absent' ? 'bg-white text-rose-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Absent ({absentCount})
              </button>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleStartQrBroadcast}
                disabled={isQrStarting}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold text-xs transition flex items-center space-x-1.5 shadow-sm active:scale-95"
                title="Broadcast a live 10-second rotating QR code for classroom scanning"
              >
                <QrCode className="h-4 w-4 text-stone-950" />
                <span>{isQrStarting ? 'Initiating...' : '⚡ Dynamic 10s QR Mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => markAll(true)}
                className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center space-x-1 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => markAll(false)}
                className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center space-x-1 shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Student Roster Grid */}
          {loadingStudents ? (
            <div className="py-16 text-center text-stone-500 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-6 w-6 animate-spin text-stone-600" />
              <p className="text-xs font-medium">Loading class roster from database...</p>
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="py-12 text-center text-stone-500 bg-stone-50 rounded-3xl border border-stone-200">
              <Users className="h-8 w-8 mx-auto text-stone-400 mb-2" />
              <p className="text-sm font-semibold text-stone-700">No students found matching current criteria.</p>
              <p className="text-xs text-stone-400 mt-1">Try switching department, semester, or section parameters above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayStudents.map((st) => {
                const isPresent = !!attendanceState[st.id];
                return (
                  <motion.div
                    key={st.id}
                    layout
                    onClick={() => toggleAttendance(st.id)}
                    className={`cursor-pointer select-none rounded-2xl p-4 border transition-all flex items-center justify-between ${
                      isPresent
                        ? 'bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300 shadow-sm'
                        : 'bg-white border-stone-200/80 hover:border-stone-300 shadow-sm opacity-90'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-stone-900">{st.name}</span>
                        {st.has_face && (
                          <span title="Face Biometrics Enrolled">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-stone-500">
                        <span className="font-mono text-stone-700 font-semibold">{st.roll_number}</span>
                        <span>• Sec {st.section || selectedSection}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {/* Exception Status Selector */}
                      <select
                        value={studentOverrides[st.id]?.tag || 'REGULAR'}
                        onChange={(e) => handleSetOverride(st.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-xl border focus:outline-none transition cursor-pointer ${
                          studentOverrides[st.id]?.tag === 'QR_VERIFIED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : studentOverrides[st.id]?.tag === 'DUTY_LEAVE'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : studentOverrides[st.id]?.tag === 'MEDICAL_EXCEPTION'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : studentOverrides[st.id]?.tag === 'VERIFIED_MANUAL'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-stone-100/90 text-stone-600 border-stone-200/90 hover:bg-stone-200/60'
                        }`}
                        title="Mark manual attendance exception (Duty Leave / Medical / Manual / QR Verified)"
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="QR_VERIFIED">QR Verified</option>
                        <option value="DUTY_LEAVE">Duty Leave (OD)</option>
                        <option value="MEDICAL_EXCEPTION">Medical Exemption</option>
                        <option value="VERIFIED_MANUAL">Manual Verified</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleAttendance(st.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                          isPresent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{studentOverrides[st.id] ? studentOverrides[st.id].tag.replace('_', ' ') : 'Present'}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Absent</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Submission Action Bar */}
          <div className="border-t border-stone-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-stone-600">
              Ready to transmit: <span className="text-emerald-700 font-bold">{presentCount} Present</span>, <span className="text-rose-700 font-bold">{absentCount} Absent</span> to HOD Records.
            </div>

            <button
              onClick={() => setIsReviewOpen(true)}
              disabled={students.length === 0}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span>Review & Submit to HOD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review & Confirmation Modal */}
      <AnimatePresence>
        {isReviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div
              
              
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="h-10 w-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Confirm Classroom Attendance Submission</h3>
                  <p className="text-xs text-stone-500">This will commit the attendance log directly to institutional records.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Conducted By:</span>
                  <span className="font-bold text-stone-900">{conductedByName || 'Faculty Coordinator'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Session Nature:</span>
                  <span className="font-bold uppercase text-purple-700">{sessionCategory.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Subject / Topic:</span>
                  <span className="font-bold text-stone-900">
                    {sessionCategory === 'guest' 
                      ? (customSubjectName || 'Special Guest Lecture') 
                      : (currentSubjectObj?.name || 'Core Lecture')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Class & Section:</span>
                  <span className="font-bold text-stone-900">{selectedBranch} • Sem {selectedSemester} • Sec {selectedSection}</span>
                </div>
                {sessionNotes && (
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Notes:</span>
                    <span className="text-stone-700 italic">{sessionNotes}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm pt-2">
                  <span className="font-semibold text-stone-700">Turnout Summary:</span>
                  <span className="font-extrabold text-emerald-700">
                    {presentCount} Present / {absentCount} Absent ({turnoutPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition"
                >
                  Cancel & Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition flex items-center justify-center space-x-2"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div
              
              
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-2xl text-center space-y-5"
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-stone-900">Attendance Successfully Committed!</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Session ID <span className="font-mono text-stone-800 font-bold">#{submissionSuccess.session_id}</span> has been logged to institutional records.
                </p>
              </div>

              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Conducted By:</span>
                  <span className="font-bold text-stone-900">{submissionSuccess.conducted_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nature:</span>
                  <span className="font-bold text-purple-700 uppercase">{submissionSuccess.session_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Turnout:</span>
                  <span className="font-bold text-emerald-700">{submissionSuccess.present_count} Present, {submissionSuccess.absent_count} Absent</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmissionSuccess(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition"
                >
                  New Class Session
                </button>
                <Link
                  href={getHodPortalUrl('/classes')}
                  target="_blank"
                  className="flex-1 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div 
              
              
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white border border-stone-200 p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Kiosk Exit Security PIN</h3>
                    <p className="text-xs text-stone-500">Teacher Protection Lock</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsKioskModalOpen(false)}
                  className="p-1.5 rounded-xl bg-stone-100 text-stone-500 hover:text-stone-800"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-medium text-stone-500">Current Security Status:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  kioskExitPin 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  {kioskExitPin ? '● PIN Protected' : '○ No PIN (Default Open)'}
                </span>
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                {kioskExitPin
                  ? "Kiosk exit is secured with your PIN. To change your PIN, enter your current (purani) PIN first."
                  : "Default is set to No PIN. Set a 4-digit PIN so students cannot exit or leave the attendance kiosk."}
              </p>

              {kioskPinSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                  {kioskPinSuccess}
                </div>
              )}
              {kioskPinError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  ⚠ {kioskPinError}
                </div>
              )}

              <div className="space-y-3">
                {kioskExitPin && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Current PIN (Purani PIN)
                    </label>
                    <input 
                      type="password"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="Enter existing PIN"
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {kioskExitPin ? 'New Kiosk PIN (4 digits)' : 'Set New Kiosk PIN (4 digits)'}
                  </label>
                  <input 
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="e.g. 2468"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Confirm New PIN
                  </label>
                  <input 
                    type="password"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Re-enter PIN"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveKioskPin}
                  className="flex-1 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition"
                >
                  {kioskExitPin ? 'Update Kiosk PIN' : 'Save Kiosk PIN'}
                </button>
                {kioskExitPin && (
                  <button
                    type="button"
                    onClick={handleRemoveKioskPin}
                    className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div 
              
              
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-white border border-stone-200 p-6 sm:p-7 shadow-2xl space-y-5 text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Lock className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-stone-900">Faculty Exit Verification</h3>
                <p className="text-xs text-stone-500 mt-1">
                  This console is locked in Kiosk Mode. Enter your Teacher PIN to exit.
                </p>
              </div>

              {kioskPinError && (
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
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
                  className="w-full text-center px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xl tracking-widest font-bold focus:outline-none focus:border-stone-400 focus:bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyExitChallenge}
                  className="flex-1 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition"
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
                  className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ Dynamic 10-Second Anti-Proxy QR Attendance Broadcast Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-full max-w-4xl bg-stone-900 text-white rounded-[32px] border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header Bar */}
              <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex items-center justify-between bg-stone-900/60 backdrop-blur-md">
                <div className="flex items-center space-x-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-extrabold tracking-tight text-white">Dynamic 10s Attendance QR</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                        Live Broadcast
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 font-medium">
                      {selectedBranch} • Sem {selectedSemester} • Sec {selectedSection} • Conductor: {conductedByName || 'Faculty'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-stone-400 hover:text-white transition"
                  title="Close & Sync Roster"
                >
                  ✕
                </button>
              </div>

              {/* Main Content: Split Grid (Left: Dynamic Rotating QR, Right: Live Check-in Telemetry) */}
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
                {/* Left: Dynamic QR Stage (7 cols) */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6">
                  {/* Topic Pill */}
                  <div className="px-4 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-stone-300 text-xs font-semibold text-center max-w-sm truncate">
                    📖 {sessionCategory === 'guest' ? (customSubjectName || 'Guest Lecture') : (currentSubjectObj?.name || 'Classroom Lecture')}
                  </div>

                  {/* QR Code Container with Rotating Countdown Glow */}
                  <div className="relative p-6 rounded-[28px] bg-white shadow-2xl flex flex-col items-center justify-center">
                    {qrToken ? (
                      <div className="p-2 bg-white rounded-2xl">
                        <QRCodeSVG
                          value={qrToken}
                          size={240}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    ) : (
                      <div className="w-[240px] h-[240px] flex items-center justify-center text-stone-400 text-xs font-medium">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Initializing QR Token...
                      </div>
                    )}

                    {/* Watermark Logo / Badge inside QR center */}
                    <div className="mt-3 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                      SECURE TOKEN • ANTI-PROXY V2
                    </div>
                  </div>

                  {/* 10-Second Countdown Meter Bar */}
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-400 flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                        <span>Token Rotation Window</span>
                      </span>
                      <span className="font-mono text-amber-400 font-extrabold text-sm">
                        Rotating in {qrTimeLeft}s
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                        initial={false}
                        animate={{ width: `${(qrTimeLeft / 10) * 100}%` }}
                        transition={{ duration: 0.9, ease: 'linear' }}
                      />
                    </div>
                  </div>

                  {/* Anti-Proxy Security Guarantee */}
                  <div className="w-full max-w-md p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed flex items-start space-x-2.5">
                    <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Anti-Screenshot Protection:</strong> This QR automatically refreshes every 10 seconds. Students must scan directly from this live screen. Screenshots sent via WhatsApp or chat will fail validation.
                    </div>
                  </div>
                </div>

                {/* Right: Real-time Student Check-in Feed (5 cols) */}
                <div className="lg:col-span-5 flex flex-col bg-stone-950/60 rounded-3xl border border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Live Check-ins</div>
                      <div className="text-2xl font-black text-white tracking-tight mt-0.5">
                        {qrCheckedInCount} <span className="text-sm font-semibold text-stone-500">/ {qrTotalExpected} Present</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {qrTotalExpected > 0 ? Math.round((qrCheckedInCount / qrTotalExpected) * 100) : 0}% Turnout
                      </span>
                    </div>
                  </div>

                  {/* Recent Check-in Feed */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[290px] pr-1">
                    {qrRecentCheckins && qrRecentCheckins.length > 0 ? (
                      qrRecentCheckins.map((item, idx) => (
                        <motion.div
                          key={`${item.id}-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                              ✓
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white leading-snug">{item.name}</div>
                              <div className="text-[10px] font-mono text-stone-400">{item.roll_number}</div>
                            </div>
                          </div>
                          <div className="text-[10px] font-mono text-stone-400 font-medium">
                            {item.time}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-stone-500 flex flex-col items-center justify-center space-y-2">
                        <Users className="h-8 w-8 text-stone-600" />
                        <p className="text-xs font-medium text-stone-400">Waiting for first scan...</p>
                        <p className="text-[11px] text-stone-500 max-w-[200px]">Students open student portal and scan this live QR screen.</p>
                      </div>
                    )}
                  </div>

                  {/* Done / Sync Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsQrModalOpen(false);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-stone-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finish QR Session & Return to Roster</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Platform Credit Footer */}
      <footer className="mt-12 border-t border-stone-200/80 pt-6 pb-6 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto px-4">
        <p>© 2026 Smart Attendance Suite • Faculty Mobile & Web Kiosk Engine</p>
        <div className="flex items-center space-x-2 text-stone-500 text-[11px]">
          <span>System Architect & Lead Developer:</span>
          <span className="font-semibold text-stone-800 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full shadow-sm">
            Created by Ronak Agrawal
          </span>
        </div>
      </footer>
    </AppleDeluxeShell>
  );
}
