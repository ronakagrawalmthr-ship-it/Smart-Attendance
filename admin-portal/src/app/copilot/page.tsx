'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ShieldCheck,
  User,
  Trash2,
  Building2,
  Users,
  GraduationCap
} from 'lucide-react';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import { API_BASE_URL, authFetch, authFetchWithRetry } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  source?: string;
  timestamp: string;
  isError?: boolean;
}

export default function AdminCopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      content: 'Hello Administrator! I am your **Executive University AI Copilot** powered by live academic database telemetry.\n\nI can instantly provide:\n- **Campus-wide attendance & turnout status** across all departments\n- **Today\'s absent students list** with names, roll numbers, and subjects\n- **Critical defaulters (< 75%)** university-wide\n- **Department-by-department comparison** & faculty lecture load\n- **Pending student grievances** awaiting institutional resolution\n\nAsk me anything or tap one of the suggested queries below!',
      source: 'Executive University Copilot',
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [campusStats, setCampusStats] = useState({
    adminName: typeof window !== 'undefined' ? (localStorage.getItem('admin_name') || 'Administrator') : 'Administrator',
    totalStudents: 0,
    totalFaculty: 0,
    turnout: '0.0%',
    criticalDefaulters: 0
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCampusKPIs = async () => {
      try {
        const res = await authFetchWithRetry(`${API_BASE_URL}/management/college/kpi-stats`, {}, { maxRetries: 2, delayMs: 600 });
        if (res.ok) {
          const kpi = await res.json();
          setCampusStats(prev => ({
            ...prev,
            totalStudents: kpi.totalStudents ?? prev.totalStudents,
            totalFaculty: kpi.totalFaculty ?? prev.totalFaculty,
            turnout: kpi.overallTurnout ?? prev.turnout,
            criticalDefaulters: kpi.criticalDefaulters ?? prev.criticalDefaulters
          }));
        }
      } catch (err) {
        console.log('Using cached campus telemetry');
      }
    };
    loadCampusKPIs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'init-1' && !m.isError)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await authFetchWithRetry(`${API_BASE_URL}/timetable/staff-ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload
        })
      }, { maxRetries: 2, delayMs: 800 });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `b-${Date.now()}`,
          role: 'model',
          content: data.reply || 'Data retrieved successfully.',
          source: data.source || 'Executive AI Engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error('Copilot response error');
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `fb-${Date.now()}`,
        role: 'model',
        content: `Could not retrieve live response. Please verify network connectivity.\n\nCampus Snapshot: Total **${campusStats.totalStudents}** students, **${campusStats.totalFaculty}** faculty, overall turnout **${campusStats.turnout}**.`,
        source: 'Executive Copilot Fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'Aaj kitne students absent hain aur unke naam kya hain?',
    'Show me all critical defaulters below 75% across departments',
    'What is today\'s overall campus turnout & session status?',
    'Show department-wise attendance summary and comparison'
  ];

  return (
    <AppleDeluxeShell>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* Header Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3.5 py-2 rounded-2xl shadow-xs transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Governance Dashboard</span>
          </Link>
          <button
            onClick={() => setMessages([messages[0]])}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-500 hover:text-rose-600 bg-white border border-stone-200 px-3 py-2 rounded-2xl shadow-xs transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Conversation</span>
          </button>
        </div>

        {/* Hero Card */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/90 p-6 sm:p-7 backdrop-blur-xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-2xl bg-stone-950 flex items-center justify-center text-teal-400 shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  University Executive AI Copilot
                </h1>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Whole-campus intelligence for Administrator {campusStats.adminName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Campus Turnout: {campusStats.turnout}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                Defaulters: {campusStats.criticalDefaulters}
              </div>
            </div>
          </div>

          {/* Quick Query Suggestion Pills */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/95 p-4 sm:p-6 shadow-xs min-h-[460px] max-h-[600px] overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl p-4 sm:p-5 space-y-2 ${
                  m.role === 'user'
                    ? 'bg-stone-950 text-white shadow-sm'
                    : m.isError
                    ? 'bg-rose-50/90 text-rose-950 border border-rose-200/80'
                    : 'bg-[#FAF7F2] text-stone-900 border border-stone-200/70 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between space-x-3 text-[11px] opacity-70">
                  <span className="font-bold flex items-center space-x-1">
                    {m.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-teal-600" />}
                    <span>{m.role === 'user' ? 'You (Administrator)' : (m.source || 'Executive AI')}</span>
                  </span>
                  <span>{m.timestamp}</span>
                </div>

                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#FAF7F2] border border-stone-200/70 rounded-3xl p-4 text-xs font-bold text-stone-600 flex items-center space-x-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
                <span>Querying campus-wide institutional records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2.5 bg-white p-2.5 rounded-3xl border border-stone-200/90 shadow-md"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about today's absentees, department turnouts, university defaulters, or faculty..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-transparent focus:outline-none text-stone-900 placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-teal-400 font-bold text-xs transition flex items-center space-x-1.5 shadow-sm disabled:opacity-40"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

      </div>
    </AppleDeluxeShell>
  );
}
