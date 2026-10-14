'use client';

import AppleSelect from '@/components/AppleSelect';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCircle2, AlertCircle, ArrowLeft, Send, Clock, ShieldCheck, Paperclip, Upload, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

export default function GrievanceDesk() {
  const [sessionId, setSessionId] = useState('1');
  const [subjectName, setSubjectName] = useState('Operating Systems');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    'Operating Systems',
    'Database Management Systems',
    'Computer Networks',
    'Design & Analysis of Algorithms'
  ]);
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  const [pastGrievances, setPastGrievances] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error');
      setStatusMessage("File size exceeds 5MB limit. Please upload a smaller image or document.");
      return;
    }
    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const fetchStudentContext = async () => {
    if (typeof window !== 'undefined') {
      const sName = localStorage.getItem('student_name');
      const sRoll = localStorage.getItem('student_roll');
      if (sName) setStudentName(sName);
      if (sRoll) setRollNumber(sRoll);
    }
    try {
      const res = await authFetch(`${API_BASE_URL}/portal/metrics`);
      if (res.ok) {
        const data = await res.json();
        let subNames: string[] = [];
        if (data.subjects && data.subjects.length > 0) {
          subNames = data.subjects.map((s: any) => s.name);
          setAvailableSubjects(subNames);
          setSubjectName(subNames[0]);
        }
        if (data.recent_logs && data.recent_logs.length > 0) {
          setRecentSessions(data.recent_logs);
          const firstMissed = data.recent_logs.find((l: any) => !l.is_present);
          if (firstMissed) {
            setSessionId(String(firstMissed.session_id || 1));
            setSubjectName(firstMissed.subject_name || firstMissed.subject || subNames[0] || 'Computer Networks');
            setDate(firstMissed.date || new Date().toISOString().slice(0, 10));
          }
        }
      }
    } catch {
      console.log("Using cached subjects list.");
    }
  };

  const fetchPastGrievances = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/portal/grievances`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setPastGrievances(data.map((g: any) => ({
            id: g.id || g.ticket_id,
            ticket_id: g.ticket_id,
            date: g.date || (g.created_at ? new Date(g.created_at).toLocaleDateString() : 'Recent'),
            subject: g.subject || g.subject_name,
            reason: g.reason,
            status: g.status,
            document_url: g.document_url,
            document_name: g.document_name,
            color: g.status?.includes('Granted') || g.status?.includes('Approved')
              ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
              : g.status?.includes('Rejected')
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
    fetchStudentContext();
    fetchPastGrievances();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setStatus('error');
      setStatusMessage("Please provide a valid justification for disputing the absence.");
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setStatusMessage(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/portal/grievance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: Number(sessionId) || 1,
          reason: reason.trim(),
          subject_name: subjectName,
          document_url: documentUrl || null,
          document_name: documentName || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Could not record grievance." }));
        throw new Error(errData.detail || "Could not record grievance. Please verify session details.");
      }

      const data = await res.json();
      setStatus('success');
      setStatusMessage(data.message || "Grievance lodged successfully. It has been routed to your HOD for formal verification.");
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus-notification', {
          detail: {
            type: 'grievance_alert',
            title: 'Dispute Lodged with HOD',
            detail: `${data.ticket_id || 'Dispute'}: Attendance dispute lodged for ${subjectName}`,
            time: 'Just now',
            badge: 'Under Review'
          }
        }));
      }
      
      setReason('');
      setDocumentUrl(null);
      setDocumentName(null);
      fetchPastGrievances();
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to submit grievance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppleDeluxeShell studentName={studentName} rollNumber={rollNumber}>
      <div className="w-full space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition px-3 py-1.5 rounded-full hover:bg-stone-200/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Attendance</span>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-stone-200/70 border border-stone-300/60 text-stone-800 text-xs font-semibold">
          <MessageSquare className="h-3.5 w-3.5 text-stone-700" />
          <span>Student Redressal Desk</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
          Attendance Grievance & Dispute Center
        </h1>
        <p className="text-xs text-stone-500 max-w-lg mx-auto">
          Challenge marked absences due to on-duty leaves, technical scanner issues, or medical emergencies with full audit transparency.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form Card */}
        <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-6">
          <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
            <Send className="h-4 w-4 text-stone-700" />
            <span>File New Dispute</span>
          </h2>

          {status === 'success' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                Subject
              </label>
              <AppleSelect
                value={subjectName}
                onChange={(val) => setSubjectName(val)}
                options={availableSubjects.map((sub) => ({
                  value: sub,
                  label: sub,
                  badge: 'Subject'
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Session Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                Reason & Justification
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain why the absence is disputed (e.g. scanner misaligned, medical leave approved, hackathon on-duty)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
              />
            </div>

            {/* Document Proof Attachment */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                Supporting Document Proof (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-300/80 text-stone-700 text-xs font-semibold transition">
                  <Upload className="h-4 w-4 text-stone-500" />
                  <span>{documentName ? 'Change Document' : 'Attach Medical / Duty Certificate'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {documentName && (
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl text-xs text-blue-800 font-medium">
                    <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate max-w-[160px]">{documentName}</span>
                    <button
                      type="button"
                      onClick={() => { setDocumentUrl(null); setDocumentName(null); }}
                      className="text-stone-400 hover:text-rose-600 transition ml-1"
                      title="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Upload medical prescription, hospital slip, or official sports/symposium duty letter (Max 5MB).
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-2xl font-semibold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Lodging Grievance...' : 'Submit Grievance to Faculty'}</span>
            </button>
          </form>
        </div>

        {/* History Card */}
        <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-8 backdrop-blur-xl space-y-6 shadow-sm">
          <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-stone-700" />
            <span>Grievance History & Status</span>
          </h2>

          <div className="space-y-4">
            {pastGrievances.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">No previous grievances lodged.</p>
            ) : (
              pastGrievances.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-stone-400 font-semibold">{item.ticket_id || item.id}</span>
                      <h3 className="font-bold text-xs text-stone-900">{item.subject}</h3>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">{item.reason}</p>

                  {/* Attached Proof link */}
                  {item.document_url && (
                    <div className="pt-1">
                      <a
                        href={item.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-lg transition"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{item.document_name || 'View Attached Proof'}</span>
                      </a>
                    </div>
                  )}

                  <span className="text-[10px] text-stone-400 block pt-1">Logged on: {item.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </AppleDeluxeShell>
  );
}
