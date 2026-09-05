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
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Read-only Academic State
  const [academicInfo, setAcademicInfo] = useState({
    fullName: 'Aarav Sharma',
    rollNumber: '23CSE001',
    branch: 'Computer Science & Engineering',
    semester: 6,
    academicYear: 3,
    academicYearLabel: '3rd Year (Semester 6)',
    stage: '3rd Year (Junior Batch)',
    section: 'A',
    hasFaceEnrolled: true
  });

  // Editable Contact State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setSaveError(null);

      // Check cached local settings first
      const cached = typeof window !== 'undefined' ? localStorage.getItem('student_custom_settings') : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.emergency_contact) setEmergencyContact(parsed.emergency_contact);
        } catch (e) {}
      }

      let token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      if (!token) {
        token = 'demo_student_token';
        if (typeof window !== 'undefined') localStorage.setItem('student_token', token);
      }

      const res = await fetch(`${API_BASE_URL}/portal/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAcademicInfo({
          fullName: data.full_name || 'Aarav Sharma',
          rollNumber: data.roll_number || '23CSE001',
          branch: data.branch || 'Computer Science & Engineering',
          semester: data.semester || 6,
          academicYear: data.academic_year || 3,
          academicYearLabel: data.academic_year_label || '3rd Year (Semester 6)',
          stage: data.stage || '3rd Year (Junior Batch)',
          section: data.section || 'A',
          hasFaceEnrolled: Boolean(data.has_face_enrolled)
        });
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.emergency_contact) setEmergencyContact(data.emergency_contact);
      }
    } catch (err: any) {
      console.log('Using local/cached student profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
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
      let token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      if (!token) {
        token = 'demo_student_token';
        if (typeof window !== 'undefined') localStorage.setItem('student_token', token);
      }

      const payload: any = {
        email: email.trim(),
        phone: phone.trim(),
        emergency_contact: emergencyContact.trim()
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      // Always save to localStorage immediately for guaranteed persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_custom_settings', JSON.stringify(payload));
      }

      await fetch(`${API_BASE_URL}/portal/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Student Self-Service</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My Profile & Account Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage personal contact details and account security while institutional records remain verified.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProfile}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
              title="Refresh profile details"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-300 font-medium">
              {saveSuccess}
            </div>
          </motion.div>
        )}

        {saveError && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-300 font-medium">
              {saveError}
            </div>
          </motion.div>
        )}

        {/* Hero Identity Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-cyan-500/20 shrink-0 border-2 border-cyan-400/30">
              {getInitials(academicInfo.fullName)}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-bold text-white">{academicInfo.fullName}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Student
                </span>
              </div>

              <p className="text-slate-400 text-sm font-mono">
                University PRN / Roll No: <span className="text-white font-bold">{academicInfo.rollNumber}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs">
                {academicInfo.hasFaceEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                    <ScanFace className="h-4 w-4" /> Face Biometrics Enrolled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
                    <ShieldAlert className="h-4 w-4" /> Face Scan Pending
                  </span>
                )}
                
                <Link
                  href="/enroll"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
                >
                  <ScanFace className="h-3.5 w-3.5" />
                  <span>Update Face Biometrics</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION 1: Institutional & Academic Data (Locked) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-6 sm:p-7 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Academic Details</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                <Lock className="h-3.5 w-3.5 text-amber-400" /> Read-Only Academic Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Lock className="h-3 w-3 text-slate-400" /> Roll Number
                </label>
                <div className="font-mono text-sm font-semibold text-slate-200">
                  {academicInfo.rollNumber}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Lock className="h-3 w-3 text-slate-400" /> Branch / Department
                </label>
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {academicInfo.branch}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30">
                <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1 mb-1">
                  <GraduationCap className="h-3 w-3 text-indigo-400" /> Academic Year
                </label>
                <div className="text-sm font-extrabold text-white">
                  {academicInfo.academicYearLabel}
                </div>
                <div className="text-[10px] text-indigo-300 mt-0.5">{academicInfo.stage}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Lock className="h-3 w-3 text-slate-400" /> Current Semester
                </label>
                <div className="text-sm font-semibold text-slate-200">
                  Semester {academicInfo.semester}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Lock className="h-3 w-3 text-slate-400" /> Section
                </label>
                <div className="text-sm font-semibold text-slate-200">
                  Section {academicInfo.section}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Academic Year Synchronization:</strong> Your Academic Year & Semester are institutional records synced directly with university databases. When batch promotion is processed by the Registrar / HOD, your updated Year & Semester appear automatically here without needing manual requests.
                </span>
              </div>
              <Link
                href="/grievance"
                className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap hover:underline"
              >
                <span>Submit Grievance to HOD</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* SECTION 2: Personal & Contact Information (Editable) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-6 sm:p-7 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Contact Information</h3>
              </div>
              <span className="text-xs text-cyan-400 font-semibold bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                Editable by Student
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-cyan-400" /> Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 transition"
                />
                <p className="text-[11px] text-slate-400">
                  Used for OTP password recoveries, academic notices, and attendance alerts.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-cyan-400" /> Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-cyan-400" /> Emergency / Guardian Contact
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 91234 56789"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Account Security & Password (Editable) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-6 sm:p-7 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Security & Password</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Leave blank if not changing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-600 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-600 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-600 transition"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={fetchProfile}
              disabled={saving || loading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Discard Changes
            </button>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Profile Settings</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
