'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCircle2, AlertCircle, ArrowLeft, Send, Clock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function GrievanceDesk() {
  const [sessionId, setSessionId] = useState('1');
  const [subjectName, setSubjectName] = useState('Machine Learning');
  const [date, setDate] = useState('2026-09-01');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [pastGrievances, setPastGrievances] = useState<any[]>([
    {
      id: 'GRV-901',
      date: '2026-09-01',
      subject: 'Machine Learning',
      reason: 'Face scanner failed to match due to low classroom lighting.',
      status: 'Under Review by Faculty',
      color: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    }
  ]);

  const fetchPastGrievances = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/portal/grievances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setPastGrievances(data.map((g: any) => ({
            id: g.id,
            date: g.date,
            subject: g.subject,
            reason: g.reason,
            status: g.status,
            color: g.status.includes('Granted') || g.status.includes('Approved')
              ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
              : g.status.includes('Rejected')
              ? 'text-rose-400 border-rose-400/30 bg-rose-400/10'
              : 'text-amber-400 border-amber-400/30 bg-amber-400/10'
          })));
        }
      }
    } catch {
      console.log("Using cached past grievances.");
    }
  };

  useEffect(() => {
    fetchPastGrievances();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a justification for disputing the absence.");
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setStatusMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      const res = await fetch(`${API_BASE_URL}/portal/grievance?session_id=${sessionId}&reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error("Could not record grievance. Please verify session ID.");
      }

      const data = await res.json();
      setStatus('success');
      setStatusMessage(data.message || "Grievance lodged successfully. Assigned to faculty for verification.");
      
      setPastGrievances(prev => [
        {
          id: `GRV-${Math.floor(100 + Math.random() * 900)}`,
          date,
          subject: subjectName,
          reason,
          status: 'Under Review by Faculty',
          color: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
        },
        ...prev
      ]);
      setReason('');
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to submit grievance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Attendance</span>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Student Redressal Desk</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Attendance Grievance & Dispute Center
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Challenge marked absences due to on-duty leaves, technical scanner issues, or medical emergencies with full audit transparency.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 backdrop-blur-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Send className="h-5 w-5 text-emerald-400" />
            <span>File New Dispute</span>
          </h2>

          {status === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Subject
              </label>
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Machine Learning">Machine Learning (CS301)</option>
                <option value="Database Management Systems">Database Management Systems (CS302)</option>
                <option value="Computer Networks">Computer Networks (CS303)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Session Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Reason & Justification
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain why the absence is disputed (e.g. scanner misaligned, medical leave approved, hackathon on-duty)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Lodging Grievance...' : 'Submit Grievance to Faculty'}</span>
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 backdrop-blur-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            <span>Grievance History & Status</span>
          </h2>

          <div className="space-y-4">
            {pastGrievances.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                    <h3 className="font-bold text-sm text-white">{item.subject}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.color}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{item.reason}</p>
                <span className="text-[10px] text-slate-500 block">Logged on: {item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
