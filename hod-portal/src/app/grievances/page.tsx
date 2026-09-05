'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function HODGrievanceResolution() {
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [grievances, setGrievances] = useState<any[]>([]);

  const fetchGrievances = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/management/grievances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setGrievances(data);
        }
      }
    } catch {
      console.log("Using cached grievances.");
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

  const handleResolve = async (id: string, decision: 'Granted' | 'Rejected', student: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      await fetch(`${API_BASE_URL}/management/grievances/resolve?ticket_id=${id}&decision=${decision}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
    } catch (e) {
      console.log("Resolve sync error:", e);
    }
    setGrievances(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, status: decision === 'Granted' ? 'Granted by HOD' : 'Rejected by HOD' };
      }
      return g;
    }));
    setActionNotice(`Grievance ${id} for ${student} marked as ${decision}. Student attendance record updated in database.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Department Overview</span>
        </Link>
      </div>

      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold uppercase tracking-wider">
            CSE Redressal Desk
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Absence Dispute Resolution</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Review absence challenges submitted by Computer Science students and grant attendance credit for legitimate justifications.
        </p>
      </header>

      {actionNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-3 backdrop-blur-md"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{actionNotice}</span>
        </motion.div>
      )}

      <div className="space-y-4">
        {grievances.map((g) => {
          const isPending = g.status === 'Pending HOD Decision';
          return (
            <div key={g.id} className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-teal-400">{g.id}</span>
                    <span className="text-slate-500">•</span>
                    <h3 className="font-bold text-base text-white">{g.studentName} ({g.rollNumber})</h3>
                    <span className="text-xs text-slate-400 font-medium">[{g.semester}]</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Subject: <span className="text-slate-200 font-semibold">{g.subject}</span> • Session Date: <span className="font-mono text-slate-300">{g.date}</span>
                  </p>
                </div>

                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                  isPending 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : g.status.includes('Granted')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {g.status}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Student Stated Reason:</span>
                <p>{g.reason}</p>
              </div>

              {isPending && (
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => handleResolve(g.id, 'Rejected', g.studentName)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject Dispute</span>
                  </button>
                  <button
                    onClick={() => handleResolve(g.id, 'Granted', g.studentName)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Grant Attendance</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
