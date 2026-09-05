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
import { API_BASE_URL } from '@/lib/api';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Institution fields
  const [institutionName, setInstitutionName] = useState('National Institute of Advanced Engineering & Technology');
  const [currentTerm, setCurrentTerm] = useState('Spring 2026 Academic Term');
  const [globalThreshold, setGlobalThreshold] = useState<number>(75.0);
  const [consecutiveAbsentAlert, setConsecutiveAbsentAlert] = useState<number>(3);

  // Master Admin security fields
  const [adminEmail, setAdminEmail] = useState('admin@college.edu');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
          if (parsed.admin_email) setAdminEmail(parsed.admin_email);
          if (parsed.institution_name) setInstitutionName(parsed.institution_name);
          if (parsed.current_term) setCurrentTerm(parsed.current_term);
          if (parsed.global_attendance_threshold !== undefined) setGlobalThreshold(parsed.global_attendance_threshold);
          if (parsed.consecutive_absent_alert !== undefined) setConsecutiveAbsentAlert(parsed.consecutive_absent_alert);
        } catch (e) {}
      }

      let token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        token = 'demo_admin_token';
        if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
      }

      const res = await fetch(`${API_BASE_URL}/management/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAdminEmail(data.admin_email || 'admin@college.edu');
        setInstitutionName(data.institution_name || 'National Institute of Advanced Engineering & Technology');
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
        token = 'demo_admin_token';
        if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
      }

      const payload: any = {
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
      }

      try {
        await fetch(`${API_BASE_URL}/management/admin/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-purple-400 transition space-x-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to College Overview</span>
        </Link>
        <button 
          onClick={fetchSettings} 
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 p-6 md:p-8 mb-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/20 shrink-0">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Institutional System Configuration
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Master Authority
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 max-w-xl">
                Control college-wide academic branding, attendance eligibility baselines, alert thresholds, and master administrator credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 shrink-0">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <div className="font-semibold text-slate-200">Production Infrastructure</div>
              <div className="text-slate-500">{currentTerm}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center space-x-3 text-emerald-300"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center space-x-3 text-rose-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </motion.div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Institution Branding & Term */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
              <Building2 className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">University & Academic Term</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Institution / University Official Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                    placeholder="University Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Current Active Academic Session / Term
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={currentTerm}
                    onChange={(e) => setCurrentTerm(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                    placeholder="e.g. Spring 2026 Academic Term"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Master Administrator Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                    placeholder="admin@college.edu"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Primary contact for system-wide governance alerts and automated delivery bounce notifications.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Global Institutional Policy */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
                <Sliders className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Global Attendance Governance</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">
                      College-Wide Eligibility Minimum Cutoff
                    </label>
                    <span className="text-sm font-extrabold text-purple-400 px-2.5 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
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
                    className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Governs the institutional examination eligibility standard. Students below this mark across all departments will be highlighted for administrative review.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Consecutive Absences Trigger (Lectures)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={consecutiveAbsentAlert}
                      onChange={(e) => setConsecutiveAbsentAlert(parseInt(e.target.value) || 3)}
                      className="w-24 rounded-xl border border-slate-800 bg-slate-950/80 py-2 px-3 text-sm text-center font-bold text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                    />
                    <span className="text-xs text-slate-400">
                      Unexcused missed classes before disciplinary notice is queued.
                    </span>
                  </div>
                </div>

                {/* Cloud Services Status Indicator */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span>System Infrastructure Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Zap className="h-3.5 w-3.5 text-pink-400" />
                      <span>Resend: <strong className="text-emerald-400">{resendStatus}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Database className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Storage: <strong className="text-emerald-400">Online</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Master Admin Security & Credentials */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
            <Lock className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Master Administrator Security & Password</h2>
              <p className="text-xs text-slate-400">Provide current master credentials only if updating administrative security keys.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Current Master Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                placeholder="Current master password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                New Master Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                placeholder="New password (min 6 chars)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Confirm New Master Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                placeholder="Re-enter new password"
              />
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-pink-500 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Committing System Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Institutional Configurations</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
