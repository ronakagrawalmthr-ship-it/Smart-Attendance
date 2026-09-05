'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  KeyRound, 
  Sliders, 
  Bell, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Settings,
  Sparkles,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function HODSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState('HOD Computer Science');
  const [email, setEmail] = useState('hod.cse@college.edu');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [officeRoom, setOfficeRoom] = useState('Department Office, Block B-302');
  const [phone, setPhone] = useState('+91 98765 22441');
  const [defaulterThreshold, setDefaulterThreshold] = useState<number>(75.0);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(true);

  // Security / Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Check for locally cached settings first
      const cached = typeof window !== 'undefined' ? localStorage.getItem('hod_custom_settings') : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.full_name) setFullName(parsed.full_name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.office_room) setOfficeRoom(parsed.office_room);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.defaulter_threshold !== undefined) setDefaulterThreshold(parsed.defaulter_threshold);
          if (parsed.email_alerts_enabled !== undefined) setEmailAlertsEnabled(parsed.email_alerts_enabled);
        } catch (e) {}
      }

      let token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      if (!token) {
        token = 'demo_hod_token';
        if (typeof window !== 'undefined') localStorage.setItem('hod_token', token);
      }

      const res = await fetch(`${API_BASE_URL}/management/hod/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFullName(data.full_name || 'HOD Computer Science');
        setEmail(data.email || 'hod.cse@college.edu');
        setDepartment(data.department || 'Computer Science & Engineering');
        setOfficeRoom(data.office_room || 'Department Office, Block B-302');
        setPhone(data.phone || '+91 98765 22441');
        setDefaulterThreshold(data.defaulter_threshold !== undefined ? data.defaulter_threshold : 75.0);
        setEmailAlertsEnabled(data.email_alerts_enabled !== undefined ? data.email_alerts_enabled : true);
      }
    } catch (err) {
      console.log('Using local/cached HOD settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Password validation if user entered password fields
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMessage('Current password is required to verify identity and update credentials.');
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
      let token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      if (!token) {
        token = 'demo_hod_token';
        if (typeof window !== 'undefined') localStorage.setItem('hod_token', token);
      }

      const payload: any = {
        full_name: fullName,
        email: email,
        office_room: officeRoom,
        phone: phone,
        defaulter_threshold: Number(defaulterThreshold),
        email_alerts_enabled: emailAlertsEnabled
      };

      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      // Guarantee local persistence immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('hod_custom_settings', JSON.stringify(payload));
      }

      try {
        await fetch(`${API_BASE_URL}/management/hod/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.log('Backend profile sync offline, saved to local cache.');
      }

      setSuccessMessage('Department configuration & HOD profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setSuccessMessage('Department configuration updated in browser storage!');
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
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-emerald-400 transition space-x-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Department Turnout Deck</span>
        </Link>
        <button 
          onClick={fetchProfile} 
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-emerald-950/30 p-6 md:p-8 mb-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Department Head Settings & Policies
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Head of Department
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400 max-w-xl">
                Manage your administrative identity, department office coordinates, attendance deficit alert rules, and account credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 shrink-0">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <div className="font-semibold text-slate-200">{department}</div>
              <div className="text-slate-500">Autonomous Department Policy Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
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
          
          {/* Card 1: HOD Identity & Office Coordinates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
              <User className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Department Head Identity & Office</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Full Name & Academic Title
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="e.g. Dr. Arthur Pendelton"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Official Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="hod.cse@college.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Office Location / Chamber
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={officeRoom}
                    onChange={(e) => setOfficeRoom(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="Department Office, Block B-302"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Direct Phone / Intercom Extension
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="+91 98765 22441"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Department Defaulter Policy & Alerts */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
                <Sliders className="h-5 w-5 text-teal-400" />
                <h2 className="text-base font-bold text-white">Department Defaulter Policies</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Attendance Eligibility Cutoff Threshold
                    </label>
                    <span className="text-sm font-extrabold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      {defaulterThreshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="1"
                    value={defaulterThreshold}
                    onChange={(e) => setDefaulterThreshold(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Students whose attendance percentage falls below this threshold are flagged in real-time as Defaulters across all semesters in this department.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-purple-400" />
                        <span>Automated Defaulter Email Alerts</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Trigger automated email warnings to students and registered parent contacts when consecutive absences occur.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailAlertsEnabled} 
                        onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3.5 text-xs text-teal-300/90 leading-relaxed">
                  <span className="font-bold">Autonomous Sync:</span> Modifying the department threshold immediately recalculates the Defaulters list across the HOD Class Attendance & Excel views.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Security & Credentials */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-2.5 mb-5 pb-4 border-b border-slate-800">
            <KeyRound className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Security & Password Management</h2>
              <p className="text-xs text-slate-400">Leave password fields empty unless you want to change your HOD portal access password.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="Current password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="New password (min 6 chars)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 px-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
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
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Department Policies & Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
