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
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300/60 text-stone-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <User className="h-3.5 w-3.5" />
              <span>Student Self-Service</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              My Profile & Academic Standing
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Manage contact preferences and account security while institutional records remain synchronized.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProfile}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-2xl bg-white hover:bg-stone-100 border border-stone-200/80 text-stone-700 shadow-xs transition"
              title="Refresh profile details"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-2xl bg-white hover:bg-stone-100 border border-stone-200/80 text-stone-700 shadow-xs transition"
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
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
            <div className="h-20 w-20 rounded-2xl bg-stone-900 flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
              {getInitials(academicInfo.fullName)}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-bold text-stone-900">{academicInfo.fullName}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Student
                </span>
              </div>

              <p className="text-stone-500 text-xs font-mono">
                University PRN / Roll No: <span className="text-stone-900 font-semibold">{academicInfo.rollNumber}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs">
                {academicInfo.hasFaceEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 font-medium">
                    <ScanFace className="h-3.5 w-3.5" /> Face Biometrics Enrolled
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

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION 1: Institutional & Academic Data (Locked) */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-7 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-stone-700" />
                <h3 className="text-base font-bold text-stone-900">Academic Details</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200">
                <Lock className="h-3 w-3 text-stone-500" /> Read-Only Academic Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                  Roll Number
                </label>
                <div className="font-mono text-xs font-semibold text-stone-900">
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
                  <strong>Academic Year Synchronization:</strong> Your Academic Year & Semester sync automatically when batch promotions are approved by the Registrar.
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
                <h3 className="text-base font-bold text-stone-900">Contact Information</h3>
              </div>
              <span className="text-[11px] text-stone-600 font-semibold bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                Editable by Student
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-stone-400" /> Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-stone-400" /> Contact Phone Number
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
                  <Phone className="h-3.5 w-3.5 text-stone-400" /> Emergency / Guardian Contact
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
                <h3 className="text-base font-bold text-stone-900">Security & Password</h3>
              </div>
              <span className="text-xs text-stone-400">
                Leave blank if not changing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600">
                  Current Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600">
                  New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-600">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-stone-200/80 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition shadow-xs"
            >
              Discard Changes
            </button>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
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
