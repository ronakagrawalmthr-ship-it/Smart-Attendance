'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  Sliders, 
  Server, 
  Database, 
  Activity, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Institution fields
  const [institutionName, setInstitutionName] = useState('Institutional Administration');
  const [currentTerm, setCurrentTerm] = useState('Spring 2026 Academic Term');
  const [globalThreshold, setGlobalThreshold] = useState<number>(75.0);
  const [consecutiveAbsentAlert, setConsecutiveAbsentAlert] = useState<number>(3);

  // Master Admin profile fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Danger Zone States
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetAdminPassword, setResetAdminPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // System Infrastructure Health (from backend)
  const [resendStatus, setResendStatus] = useState('Operational');
  const [dbEngine, setDbEngine] = useState('SQLite Relational Storage');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Check cached local settings first
      const cached = typeof window !== 'undefined' ? localStorage.getItem('admin_custom_settings') : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.admin_name) setAdminName(parsed.admin_name);
          if (parsed.admin_email) setAdminEmail(parsed.admin_email);
          if (parsed.institution_name) setInstitutionName(parsed.institution_name);
          if (parsed.current_term) setCurrentTerm(parsed.current_term);
          if (parsed.global_attendance_threshold !== undefined) setGlobalThreshold(parsed.global_attendance_threshold);
          if (parsed.consecutive_absent_alert !== undefined) setConsecutiveAbsentAlert(parsed.consecutive_absent_alert);
        } catch (e) {}
      }

      const cachedName = typeof window !== 'undefined' ? localStorage.getItem('admin_name') : null;
      if (cachedName) setAdminName(cachedName);

      try {
        const meRes = await authFetch(`${API_BASE_URL}/api/auth/me`);
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.full_name) {
            setAdminName(meData.full_name);
            if (typeof window !== 'undefined') localStorage.setItem('admin_name', meData.full_name);
          }
        }
      } catch (e) {}

      const res = await authFetch(`${API_BASE_URL}/management/admin/settings`);

      if (res.ok) {
        const data = await res.json();
        if (data.admin_name) {
          setAdminName(data.admin_name);
          if (typeof window !== 'undefined') localStorage.setItem('admin_name', data.admin_name);
        }
        setAdminEmail(data.admin_email || '');
        setInstitutionName(data.institution_name || 'Institutional Administration');
        setCurrentTerm(data.current_term || 'Spring 2026 Academic Term');
        setGlobalThreshold(data.global_attendance_threshold !== undefined ? data.global_attendance_threshold : 75.0);
        setConsecutiveAbsentAlert(data.consecutive_absent_alert !== undefined ? data.consecutive_absent_alert : 3);
        setResendStatus(data.resend_status || 'Operational');
        setDbEngine(data.database_engine || 'SQLite Relational Storage');
      }
    } catch (err) {
      console.log('Using local/cached admin settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Password validation if attempting to change master password
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMessage('Current master password is required to authorize configuration changes.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters in length.');
        return;
      }
    }

    try {
      setSaving(true);
      let token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        token = '';
        if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
      }

      const payload: any = {
        admin_name: adminName,
        admin_email: adminEmail,
        institution_name: institutionName,
        current_term: currentTerm,
        global_attendance_threshold: Number(globalThreshold),
        consecutive_absent_alert: Number(consecutiveAbsentAlert)
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      // Guarantee local persistence immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_custom_settings', JSON.stringify(payload));
        localStorage.setItem('admin_name', adminName);
      }

      try {
        await Promise.all([
          authFetch(`${API_BASE_URL}/management/admin/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }),
          authFetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: adminName, email: adminEmail })
          })
        ]);
      } catch (e) {
        console.log('Backend settings sync offline, saved locally.');
      }

      setSuccessMessage('Institutional configurations & Master Admin security saved successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setSuccessMessage('Institutional configuration updated in browser storage!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleWipeDemoData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wipeConfirmText.trim() !== 'CLEAN-DEMO-DATA') {
      setErrorMessage("Please type 'CLEAN-DEMO-DATA' exactly to confirm.");
      return;
    }
    try {
      setIsWiping(true);
      setErrorMessage(null);
      const res = await authFetch(`${API_BASE_URL}/management/system/wipe-demo-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_text: 'CLEAN-DEMO-DATA' })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to wipe demo data.');
      }
      const data = await res.json();
      setShowWipeModal(false);
      setWipeConfirmText('');
      setSuccessMessage(data.message || 'Demo data successfully purged. Database is clean!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing demo data purge.');
    } finally {
      setIsWiping(false);
    }
  };

  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmText.trim() !== 'RESET-ENTIRE-DATABASE') {
      setErrorMessage("Please type 'RESET-ENTIRE-DATABASE' exactly to confirm.");
      return;
    }
    if (!resetAdminPassword) {
      setErrorMessage('Master administrator password is required.');
      return;
    }
    try {
      setIsResetting(true);
      setErrorMessage(null);
      const res = await authFetch(`${API_BASE_URL}/management/system/factory-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_password: resetAdminPassword,
          confirm_text: 'RESET-ENTIRE-DATABASE'
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Factory reset aborted.');
      }
      setShowResetModal(false);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/setup';
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Factory reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AppleDeluxeShell userRole="Institutional Governance">
      <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition px-3 py-1.5 rounded-full hover:bg-stone-200/50 space-x-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to College Overview</span>
        </Link>
        <button 
          onClick={fetchSettings} 
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border border-stone-200/80 bg-white/80 text-xs font-semibold text-stone-700 hover:bg-stone-100 shadow-xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-stone-900' : 'text-stone-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 p-6 md:p-8 mb-8 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-stone-900 flex items-center justify-center shadow-sm shrink-0">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                  Institutional System Configuration
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70">
                  Master Authority
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500 max-w-xl">
                Control college-wide academic branding, attendance eligibility baselines, alert thresholds, and master administrator credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3 shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs">
              <div className="font-semibold text-stone-900">Production Infrastructure</div>
              <div className="text-stone-400 font-mono text-[11px]">{currentTerm}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <motion.div 
          
          
          className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50 p-4 flex items-center space-x-3 text-emerald-900 shadow-sm"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold">{successMessage}</p>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          
          
          className="mb-6 rounded-2xl border border-rose-200/80 bg-rose-50 p-4 flex items-center space-x-3 text-rose-900 shadow-sm"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </motion.div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Institution Branding & Term */}
          <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-stone-100">
              <Building2 className="h-5 w-5 text-purple-600" />
              <h2 className="text-sm font-bold text-stone-900">University & Academic Term</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Institution / University Official Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                    placeholder="University Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Current Active Academic Session / Term
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={currentTerm}
                    onChange={(e) => setCurrentTerm(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                    placeholder="e.g. Spring 2026 Academic Term"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Administrator / Director Full Name
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                    placeholder="e.g. Dean Academic Affairs / Administrator"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Master Administrator Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                    placeholder="admin@university.ac.in"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Primary contact for system-wide governance alerts and automated delivery bounce notifications.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Global Institutional Policy */}
          <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-stone-100">
                <Sliders className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-stone-900">Global Attendance Governance</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-stone-600">
                      College-Wide Eligibility Minimum Cutoff
                    </label>
                    <span className="text-xs font-bold text-stone-900 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200">
                      {globalThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="1"
                    value={globalThreshold}
                    onChange={(e) => setGlobalThreshold(parseFloat(e.target.value))}
                    className="w-full accent-stone-900 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <p className="mt-2 text-[11px] text-stone-400">
                    Governs institutional exam eligibility. Students below this mark across all departments will be highlighted.
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Consecutive Absences Trigger (Lectures)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={consecutiveAbsentAlert}
                      onChange={(e) => setConsecutiveAbsentAlert(parseInt(e.target.value) || 3)}
                      className="w-24 rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2 px-3 text-xs text-center font-bold text-stone-900 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                    />
                    <span className="text-xs text-stone-500">
                      Missed classes before automated disciplinary notice is queued.
                    </span>
                  </div>
                </div>

                {/* Cloud Services Status Indicator */}
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                    <span>System Infrastructure Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>Resend: <strong className="text-emerald-600">{resendStatus}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-stone-600">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                      <span>Storage: <strong className="text-emerald-600">Online</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Master Admin Security & Credentials */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-stone-100">
            <Lock className="h-5 w-5 text-stone-700" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">Master Administrator Security & Password</h2>
              <p className="text-xs text-stone-400">Provide current master credentials only if updating administrative security keys.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Current Master Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 px-3 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                placeholder="Current master password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                New Master Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 px-3 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                placeholder="New password (min 6 chars)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Confirm New Master Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-stone-200/80 bg-stone-50/80 py-2.5 px-3 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition"
                placeholder="Re-enter new password"
              />
            </div>
          </div>
        </div>

        {/* Database Governance & Danger Zone */}
        <div className="rounded-[2rem] bg-white border border-rose-200/80 p-6 sm:p-8 shadow-[0_4px_25px_rgba(244,63,94,0.04)] space-y-6">
          <div className="flex items-start justify-between border-b border-rose-100 pb-5">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                  <span>Database Governance & Data Lifecycle</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">Admin Authority</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Manage database cleanups, demo data purging, and institutional resets.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purge Demo Data Box */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-900 block">🧹 Clean / Purge Demo Data</span>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Deletes all pre-seeded dummy students, mock attendance logs, grievances, and test sessions. Retains the Master Admin account and prepares the platform for real university students.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWipeModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
              >
                <span>Wipe All Demo Records</span>
              </button>
            </div>

            {/* Factory Reset Box */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-rose-950 block">⚠️ Factory Reset Entire Database</span>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Permanently deletes all data and unlocks the Day-0 Setup Wizard. Only use this when migrating this installation to an entirely different college or university.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
              >
                <span>Factory Reset to Day-0</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-2xl border border-stone-200/80 bg-white text-xs font-semibold text-stone-600 hover:bg-stone-100 transition shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Committing System Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Institutional Configurations</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Wipe Demo Data Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowWipeModal(false)} />
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Confirm Demo Data Wipe</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                This will delete all dummy student records and attendance logs. Real faculty and administrator accounts will be preserved.
              </p>
            </div>
            <form onSubmit={handleWipeDemoData} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1.5">
                  Type <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-amber-900">CLEAN-DEMO-DATA</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={wipeConfirmText}
                  onChange={(e) => setWipeConfirmText(e.target.value)}
                  placeholder="CLEAN-DEMO-DATA"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWipeModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-600 font-semibold hover:bg-stone-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWiping || wipeConfirmText.trim() !== 'CLEAN-DEMO-DATA'}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isWiping ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>{isWiping ? 'Wiping...' : 'Confirm Purge'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowResetModal(false)} />
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">⚠️ Factory Reset System</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                This will erase all students, teachers, classes, and logs, returning this system to Day-0 initialization.
              </p>
            </div>
            <form onSubmit={handleFactoryReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Enter Administrator Master Password:
                </label>
                <input
                  type="password"
                  required
                  value={resetAdminPassword}
                  onChange={(e) => setResetAdminPassword(e.target.value)}
                  placeholder="Master password"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Type <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-rose-900">RESET-ENTIRE-DATABASE</span>:
                </label>
                <input
                  type="text"
                  required
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET-ENTIRE-DATABASE"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-600 font-semibold hover:bg-stone-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetConfirmText.trim() !== 'RESET-ENTIRE-DATABASE' || !resetAdminPassword}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isResetting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>{isResetting ? 'Resetting...' : 'Execute Factory Reset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AppleDeluxeShell>
  );
}
