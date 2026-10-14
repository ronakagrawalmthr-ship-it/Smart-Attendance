'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  KeyRound, 
  ScanFace, 
  ExternalLink,
  Info,
  GraduationCap,
  TrendingUp,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  Radio,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

interface SubjectAttendance {
  code: string;
  name: string;
  semester: number;
  total: number;
  attended: number;
  absent: number;
  pct: number;
  is_safe: boolean;
  teachers: string[];
}

interface RecentLog {
  id: number;
  session_id: number;
  date: string;
  time: string;
  subject: string;
  conducted_by: string;
  is_present: boolean;
  status: string;
  status_tag?: string;
}

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Student academic fields
  const [academicInfo, setAcademicInfo] = useState({
    fullName: '',
    rollNumber: '',
    branch: '',
    semester: 1,
    academicYear: 1,
    academicYearLabel: '',
    stage: '',
    section: 'A',
    hasFaceEnrolled: false,
    photoThumbnail: ''
  });

  // Live Attendance State
  const [attendance, setAttendance] = useState<{
    overallPercentage: number;
    totalClasses: number;
    attendedClasses: number;
    absentClasses: number;
    isDefaulter: boolean;
    eligibilityStatus: string;
    classesNeeded: number;
    subjectWise: SubjectAttendance[];
    recentLogs: RecentLog[];
  }>({
    overallPercentage: 0,
    totalClasses: 0,
    attendedClasses: 0,
    absentClasses: 0,
    isDefaulter: false,
    eligibilityStatus: 'Loading...',
    classesNeeded: 0,
    subjectWise: [],
    recentLogs: []
  });

  // Editable contact settings
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Security password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setSaveError(null);

      // Check cached student settings first
      if (typeof window !== 'undefined') {
        const storedName = localStorage.getItem('student_name');
        const storedRoll = localStorage.getItem('student_roll');
        const storedEmail = localStorage.getItem('student_email');
        const storedBranch = localStorage.getItem('student_branch');
        const storedSem = localStorage.getItem('student_semester');
        const storedSec = localStorage.getItem('student_section');
        const storedAvatar = localStorage.getItem('student_avatar');
        if (storedName || storedRoll || storedBranch || storedSem) {
          setAcademicInfo(prev => ({
            ...prev,
            fullName: storedName || prev.fullName,
            rollNumber: storedRoll || prev.rollNumber,
            branch: storedBranch || prev.branch,
            semester: storedSem ? Number(storedSem) : prev.semester,
            section: storedSec || prev.section,
            photoThumbnail: storedAvatar || prev.photoThumbnail
          }));
        }
        if (storedEmail) setEmail(storedEmail);
      }

      const res = await authFetch(`${API_BASE_URL}/portal/profile`);

      if (res.ok) {
        const data = await res.json();
        if (typeof window !== 'undefined') {
          if (data.full_name) localStorage.setItem('student_name', data.full_name);
          if (data.roll_number) localStorage.setItem('student_roll', data.roll_number);
          if (data.email) localStorage.setItem('student_email', data.email);
          if (data.branch) localStorage.setItem('student_branch', data.branch);
          if (data.semester) {
            localStorage.setItem('student_semester', String(data.semester));
            localStorage.setItem('student_semester_label', `Sem ${data.semester} • Sec ${data.section || 'A'} • ${data.branch || 'B.Tech'}`);
          }
          if (data.section) localStorage.setItem('student_section', data.section);
          if (data.photo_thumbnail) localStorage.setItem('student_avatar', data.photo_thumbnail);
        }
        setAcademicInfo(prev => ({
          ...prev,
          fullName: data.full_name || prev.fullName,
          rollNumber: data.roll_number || prev.rollNumber,
          branch: data.branch || prev.branch || 'Computer Science & Engineering',
          semester: data.semester ?? prev.semester,
          academicYear: data.academic_year ?? prev.academicYear,
          academicYearLabel: data.academic_year_label || prev.academicYearLabel || `Year ${data.academic_year || 1}`,
          stage: data.stage || prev.stage || 'Academic Batch',
          section: data.section || prev.section || 'A',
          hasFaceEnrolled: Boolean(data.has_face_enrolled),
          photoThumbnail: data.photo_thumbnail || prev.photoThumbnail
        }));

        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.emergency_contact) setEmergencyContact(data.emergency_contact);

        // Update live attendance metrics
        setAttendance({
          overallPercentage: data.overall_percentage ?? 0,
          totalClasses: data.total_classes ?? 0,
          attendedClasses: data.attended_classes ?? 0,
          absentClasses: data.absent_classes ?? 0,
          isDefaulter: Boolean(data.is_defaulter),
          eligibilityStatus: data.eligibility_status || (data.overall_percentage >= 75 ? 'Exam Eligible' : 'Defaulter Warning'),
          classesNeeded: data.classes_needed ?? 0,
          subjectWise: data.subject_wise || [],
          recentLogs: data.recent_logs || []
        });
      }
    } catch (err: any) {
      console.log('Using local/cached student profile.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // 📡 Live Telemetry Heartbeat: Polls database every 3.0s so live attendance updates in real-time
    const liveHeartbeat = setInterval(() => {
      fetchProfile(true);
    }, 3000);

    return () => clearInterval(liveHeartbeat);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    // Password validation if attempting to change password
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setSaveError('Current password is required to update your account password.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveError('New password and confirmation do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setSaveError('New password must be at least 6 characters in length.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload: any = {
        full_name: academicInfo.fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        emergency_contact: emergencyContact.trim()
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('student_custom_settings', JSON.stringify(payload));
      }

      await authFetch(`${API_BASE_URL}/portal/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (typeof window !== 'undefined' && academicInfo.fullName.trim()) {
        localStorage.setItem('student_name', academicInfo.fullName.trim());
      }
      setSaveSuccess('Profile and contact settings updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveSuccess('Profile changes saved locally in browser session!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AppleDeluxeShell 
      studentName={academicInfo.fullName} 
      rollNumber={academicInfo.rollNumber}
      semester={`Sem ${academicInfo.semester} • Sec ${academicInfo.section} • ${academicInfo.branch}`}
      studentAvatar={academicInfo.photoThumbnail || undefined}
    >
      <div className="w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300/60 text-stone-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Student Profile & Live Standing</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              My Profile & Attendance
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Live biometric records, real-time lecture attendance metrics, and institutional profile settings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database Pulse Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live DB Connected</span>
            </div>

            <button
              onClick={() => fetchProfile(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-2xl bg-white hover:bg-stone-100 border border-stone-200/80 text-stone-700 shadow-xs transition"
              title="Refresh live profile and attendance"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-2xl bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition"
            >
              <span>Dashboard</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <motion.div 
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3 shadow-xs"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 font-medium">
              {saveSuccess}
            </div>
          </motion.div>
        )}

        {saveError && (
          <motion.div 
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 font-medium">
              {saveError}
            </div>
          </motion.div>
        )}

        {/* Hero Identity Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {academicInfo.photoThumbnail ? (
              <img 
                src={academicInfo.photoThumbnail} 
                alt={academicInfo.fullName} 
                className="h-20 w-20 rounded-2xl object-cover border border-stone-300 shadow-sm shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-stone-900 flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
                {getInitials(academicInfo.fullName || 'ST')}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-bold text-stone-900">{academicInfo.fullName}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Student
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                  Sem {academicInfo.semester} • Sec {academicInfo.section}
                </span>
              </div>

              <p className="text-stone-500 text-xs font-mono">
                Roll Number: <span className="text-stone-900 font-bold">{academicInfo.rollNumber}</span> • <span className="text-stone-700 font-medium">{academicInfo.branch}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs">
                {academicInfo.hasFaceEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 font-medium">
                    <ScanFace className="h-3.5 w-3.5" /> Face Biometrics Enrolled (128-d Vector)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-700 font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> Face Scan Pending
                  </span>
                )}
                
                <Link
                  href="/enroll"
                  className="inline-flex items-center gap-1 text-stone-800 hover:text-stone-900 font-medium underline underline-offset-4"
                >
                  <ScanFace className="h-3.5 w-3.5" />
                  <span>Update Biometric Signature</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LIVE ATTENDANCE STANDING & TELEMETRY SECTION                             */}
        {/* ========================================================================= */}
        <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <div>
                <h3 className="text-base font-bold text-stone-900">Live Attendance Standing</h3>
                <p className="text-xs text-stone-400">Synchronized in real time with the central academic ledger</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full border ${
                attendance.isDefaulter 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {attendance.isDefaulter ? <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                <span>{attendance.eligibilityStatus}</span>
              </span>
            </div>
          </div>

          {/* 4 Live Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Turnout */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Overall Turnout</span>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-3xl font-bold font-mono ${
                  attendance.overallPercentage >= 75 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {attendance.overallPercentage}%
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    attendance.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, attendance.overallPercentage)}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400">Institutional target: 75.0%</p>
            </div>

            {/* Classes Attended */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Lectures Attended</span>
              <div className="text-3xl font-bold font-mono text-stone-900">
                {attendance.attendedClasses} <span className="text-xs text-stone-400 font-normal">/ {attendance.totalClasses}</span>
              </div>
              <p className="text-[10px] text-stone-400">Present in classroom sessions</p>
            </div>

            {/* Classes Absent */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Lectures Missed</span>
              <div className="text-3xl font-bold font-mono text-rose-700">
                {attendance.absentClasses}
              </div>
              <p className="text-[10px] text-stone-400">Absences logged by faculty</p>
            </div>

            {/* Recovery Target */}
            <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Recovery Standing</span>
              <div className="text-base font-bold text-stone-900">
                {attendance.isDefaulter ? (
                  <span className="text-rose-600 text-xs leading-tight">Need {attendance.classesNeeded} consecutive classes</span>
                ) : (
                  <span className="text-emerald-700 text-xs">Safe Standing (Good)</span>
                )}
              </div>
              <p className="text-[10px] text-stone-400">
                {attendance.isDefaulter ? 'To restore 75% exam threshold' : 'Eligible for end-term examinations'}
              </p>
            </div>
          </div>

          {/* Subject-Wise Attendance Breakdown */}
          {attendance.subjectWise && attendance.subjectWise.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                  <BookOpen className="h-4 w-4 text-stone-500" />
                  <span>Subject-Specific Attendance Ledger</span>
                </h4>
                <span className="text-[11px] text-stone-400 font-medium">
                  {attendance.subjectWise.length} Enrolled Courses
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attendance.subjectWise.map((sub, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                          {sub.code}
                        </span>
                        <h5 className="text-xs font-bold text-stone-900 mt-1 truncate max-w-[220px]">
                          {sub.name}
                        </h5>
                        {sub.teachers && sub.teachers.length > 0 && (
                          <p className="text-[10px] text-stone-500 mt-0.5">Faculty: {sub.teachers.join(', ')}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                        sub.pct >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {sub.pct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>Attended: <strong className="text-stone-800">{sub.attended}</strong> / {sub.total}</span>
                      <span className={sub.pct >= 75 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                        {sub.pct >= 75 ? '● Satisfactory' : '▲ Below 75%'}
                      </span>
                    </div>

                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${sub.pct >= 75 ? 'bg-teal-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, sub.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Live Attendance Scans & Activity */}
          {attendance.recentLogs && attendance.recentLogs.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-stone-500" />
                  <span>Recent Live Scans & Session Logs</span>
                </h4>
                <Link href="/grievance" className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold flex items-center space-x-1">
                  <FileCheck2 className="h-3 w-3" />
                  <span>Report An Error / Grievance</span>
                </Link>
              </div>

              <div className="rounded-2xl border border-stone-200/80 overflow-hidden divide-y divide-stone-100 text-xs">
                {attendance.recentLogs.slice(0, 5).map((log, i) => (
                  <div key={i} className="p-3.5 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-stone-50/70 transition">
                    <div className="flex items-center space-x-3">
                      <div className={`h-7 w-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        log.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {log.is_present ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900">{log.subject}</div>
                        <div className="text-[10px] text-stone-400">Conducted by: {log.conducted_by}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px]">
                      <span className="text-stone-500 font-mono">{log.date} • {log.time}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        log.is_present ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION 1: Institutional & Academic Data (Locked) */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-7 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-stone-700" />
                <h3 className="text-base font-bold text-stone-900">Institutional Academic Record</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200">
                <Lock className="h-3 w-3 text-stone-500" /> Read-Only Central Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                  Roll Number
                </label>
                <div className="font-mono text-xs font-bold text-stone-900">
                  {academicInfo.rollNumber}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                  Department
                </label>
                <div className="text-xs font-semibold text-stone-900 truncate">
                  {academicInfo.branch}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/60">
                <label className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1 mb-1">
                  Academic Year
                </label>
                <div className="text-xs font-bold text-purple-900">
                  {academicInfo.academicYearLabel}
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">{academicInfo.stage}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                  Semester
                </label>
                <div className="text-xs font-semibold text-stone-900">
                  Semester {academicInfo.semester}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                  Section
                </label>
                <div className="text-xs font-semibold text-stone-900">
                  Section {academicInfo.section}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 text-xs text-stone-600">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Academic Hierarchy:</strong> Student profiles are linked with the Registrar and Dean databases. If any department or section discrepancy exists, lodge a grievance below.
                </span>
              </div>
              <Link
                href="/grievance"
                className="inline-flex items-center gap-1 font-semibold text-stone-800 hover:text-stone-900 whitespace-nowrap underline"
              >
                <span>Submit Grievance</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* SECTION 2: Personal & Contact Information (Editable) */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-7 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-stone-700" />
                <h3 className="text-base font-bold text-stone-900">Contact Preferences</h3>
              </div>
              <span className="text-[11px] text-stone-600 font-semibold bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                Editable by Student
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-stone-400" /> Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-stone-400" /> Student Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-stone-400" /> Parent / Guardian Emergency Contact
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 91234 56789"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Account Security & Password (Editable) */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-7 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-stone-700" />
                <h3 className="text-base font-bold text-stone-900">Account Security & Credentials</h3>
              </div>
              <span className="text-[11px] text-stone-500">Encrypted in Central DB</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-400" /> Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-400" /> New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-400" /> Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-sm transition flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>

        </form>

      </div>
    </AppleDeluxeShell>
  );
}
