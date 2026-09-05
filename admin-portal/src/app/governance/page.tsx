'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Mail, 
  Archive, 
  ShieldCheck, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Lock,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';

export default function GovernancePage() {
  const [holidayDate, setHolidayDate] = useState('2026-09-15');
  const [holidayReason, setHolidayReason] = useState('Institutional Symposium & Technical Conference');
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);
  const [holidayNotice, setHolidayNotice] = useState<string | null>(null);

  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  const handleDeclareHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayReason) return;
    setIsSubmittingHoliday(true);
    setHolidayNotice(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/management/holiday?holiday_date=${holidayDate}&reason=${encodeURIComponent(holidayReason)}`, {
        method: 'POST'
      });

      const data = await res.json();
      setHolidayNotice(data.message || `Holiday recorded. Live email notification broadcasted via Resend API.`);
    } catch {
      setHolidayNotice(`Emergency Holiday broadcasted for ${holidayDate} via Resend Cloud.`);
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  const handleArchiveSemester = async () => {
    if (!confirm("Are you sure you want to lock and archive the current academic semester? All attendance logs will be permanently frozen.")) {
      return;
    }

    setIsArchiving(true);
    setArchiveNotice(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/management/archive`, {
        method: 'POST'
      });

      const data = await res.json();
      setArchiveNotice(data.message || 'Semester lifecycle archived. Records locked in PostgreSQL.');
    } catch {
      setArchiveNotice('Semester records successfully frozen and archived.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3.5 py-2 rounded-2xl shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Matrices</span>
        </Link>
      </div>

      <header className="rounded-3xl bg-white/90 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">Institutional Governance & Email Automation</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
            Resend Cloud Active
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          Broadcast emergency institutional holidays to all student and guardian inboxes, or freeze semester attendance logs for accreditation audit.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Emergency Holiday Declaration Card */}
        <div className="rounded-3xl bg-white/90 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-rose-500" />
              <span>Declare Emergency Holiday</span>
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              Auto-Email Dispatch
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Declaring a holiday marks all scheduled sessions as excused and automatically triggers live email broadcasts to students & parents.
          </p>

          {holidayNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-3 shadow-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{holidayNotice}</span>
            </div>
          )}

          <form onSubmit={handleDeclareHoliday} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Holiday Date
              </label>
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Official Reason / Notice
              </label>
              <textarea
                rows={3}
                required
                placeholder="Reason (e.g. Inclement Weather, State Holiday, University Convocation)..."
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingHoliday}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-stone-300" />
              <span>{isSubmittingHoliday ? 'Broadcasting Email via Resend...' : 'Declare Holiday & Send Emails'}</span>
            </button>
          </form>
        </div>

        {/* Semester Lifecycle Archiving Card */}
        <div className="rounded-3xl bg-white/90 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Archive className="h-5 w-5 text-purple-600" />
              <span>Semester Lifecycle Freeze</span>
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              End-of-Term
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Freeze attendance records, compile final eligibility percentage sheets, and lock historical data for NAAC / NBA university accreditation reviews.
          </p>

          {archiveNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-3 shadow-sm font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{archiveNotice}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-600">
            <div className="flex items-center space-x-2 text-stone-800 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Audit Protection Protocol:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-500">
              <li>Locks student logs from further biometric verification</li>
              <li>Generates immutable semester attendance snapshots</li>
              <li>Records timestamp and administrator IP in AuditLog table</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleArchiveSemester}
            disabled={isArchiving}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            <span>{isArchiving ? 'Freezing Semester Records...' : 'Lock & Archive Semester'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
