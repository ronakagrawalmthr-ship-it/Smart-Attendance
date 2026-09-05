'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Laptop, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function FacultyLecturesPage() {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([
    {
      id: 13,
      subject: 'Design & Analysis of Algorithms (CS305)',
      faculty: 'Prof. Manoj Joshi',
      room: 'Room A - Lab 2',
      semester: 'Semester 6 - Sec A',
      scanned: 15,
      total: 15,
      status: 'In Progress (Active Scan)',
      startTime: '10:00 AM - 11:00 AM'
    },
    {
      id: 12,
      subject: 'Computer Networks & Security (CS303)',
      faculty: 'Dr. Rajesh Sharma',
      room: 'Room A - Lab 1',
      semester: 'Semester 6 - Sec A',
      scanned: 13,
      total: 15,
      status: 'Attendance Committed',
      startTime: '10:00 AM - 11:00 AM'
    },
    {
      id: 11,
      subject: 'Database Management Systems (CS302)',
      faculty: 'Prof. Kavita Reddy',
      room: 'Room A - Lab 4',
      semester: 'Semester 6 - Sec A',
      scanned: 13,
      total: 15,
      status: 'In Progress (Active Scan)',
      startTime: '10:00 AM - 11:00 AM'
    },
    {
      id: 10,
      subject: 'Operating Systems (CS301)',
      faculty: 'Dr. Rajesh Sharma',
      room: 'Room A - Lab 3',
      semester: 'Semester 6 - Sec A',
      scanned: 12,
      total: 15,
      status: 'Attendance Committed',
      startTime: '09:00 AM - 10:00 AM'
    }
  ]);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('hod_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/management/department/faculty-lectures?branch=Computer%20Science`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
        }
      }
    } catch {
      console.log('Using cached Indian faculty sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  const liveCount = sessions.filter(s => s.status && s.status.includes('In Progress')).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Department Overview</span>
        </Link>
        <button
          onClick={fetchLectures}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Sessions</span>
        </button>
      </div>

      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase tracking-wider">
              Faculty Telemetry
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">CSE Faculty & Lecture Tracker</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of ongoing lectures, classroom tablet scanners, and faculty submission checkpoints.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{liveCount > 0 ? `${liveCount} Sessions Live Now` : 'null Live Sessions'}</span>
          </span>
        </div>
      </header>

      {/* Classroom Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => {
          const totalVal = s.total || 1;
          const scannedVal = s.scanned ?? 0;
          const progressPct = Math.min(100, Math.round((scannedVal / totalVal) * 100));

          return (
            <div key={s.id} className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                    {s.semester || 'null'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{s.subject || 'null'}</h3>
                  <p className="text-xs text-slate-400 font-medium">{s.faculty || 'null'} • {s.room || 'null'}</p>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  s.status && s.status.includes('In Progress')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : s.status && s.status.includes('Committed')
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {s.status || 'null'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Class Attendance Progress</span>
                  <span className="text-lg font-bold text-white">
                    {s.scanned !== null ? s.scanned : 'null'}{' '}
                    <span className="text-xs text-slate-500">/ {s.total !== null ? s.total : 'null'} Verified</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Scheduled Time</span>
                  <span className="text-xs font-mono text-slate-300">{s.startTime || 'null'}</span>
                </div>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="pt-1 flex justify-end">
                <Link
                  href="/classes"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-white text-xs font-semibold border border-slate-800 hover:border-slate-700 transition"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Class Ledger</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
