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
  ChevronRight,
  BookOpen
} from 'lucide-react';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import { API_BASE_URL, authFetch } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  source?: string;
  timestamp: string;
}

export default function CampusCopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      content: 'Hello! Main aapka **Campus AI Copilot** hoon powered by Google Gemini.\n\nMain aapki live attendance, safe bunk allowances, aur weekly timetable ko real-time analyze karke personalized guidance deta hoon. Aap mujhse classes, bunks ya timetable ke baare me kuch bhi pooch sakte hain!',
      source: 'Google Gemini AI',
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: typeof window !== 'undefined' ? (localStorage.getItem('student_name') || 'Student') : 'Student',
    roll: typeof window !== 'undefined' ? (localStorage.getItem('student_roll') || '') : '',
    attendance: 0.0,
    safeBunks: 0,
    status: 'Syncing standing...'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch metrics to populate header telemetry dynamically
    const loadTelemetry = async () => {
      try {
        const storedRoll = typeof window !== 'undefined' ? localStorage.getItem('student_roll') : '';
        const advisorUrl = storedRoll 
          ? `${API_BASE_URL}/timetable/ai-advisor?student_roll=${encodeURIComponent(storedRoll)}` 
          : `${API_BASE_URL}/timetable/ai-advisor`;

        const [resMetrics, resAdvisor] = await Promise.all([
          authFetch(`${API_BASE_URL}/portal/metrics`),
          authFetch(advisorUrl)
        ]);
        if (resMetrics.ok) {
          const m = await resMetrics.json();
          if (m.profile) {
            setStudentInfo(prev => ({
              ...prev,
              name: m.profile.name || prev.name,
              roll: m.profile.roll_number || prev.roll,
              attendance: Number(m.metrics?.overall_percentage ?? prev.attendance)
            }));
          }
        }
        if (resAdvisor.ok) {
          const a = await resAdvisor.json();
          setStudentInfo(prev => ({
            ...prev,
            safeBunks: a.safe_bunk_margin ?? prev.safeBunks,
            status: a.ai_advisory?.status_badge ?? prev.status
          }));
        }
      } catch (err) {
        console.log('Using local student telemetry');
      }
    };
    loadTelemetry();
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
      // Build history for multi-turn context
      const historyPayload = messages
        .filter(m => m.id !== 'init-1')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const currentRoll = studentInfo.roll || (typeof window !== 'undefined' ? (localStorage.getItem('student_roll') || undefined) : undefined);

      const res = await authFetch(`${API_BASE_URL}/timetable/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          student_roll: currentRoll,
          history: historyPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `b-${Date.now()}`,
          role: 'model',
          content: data.reply || 'Analysis complete.',
          source: data.source || 'Google Gemini AI',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error('Chat API returned error');
      }
    } catch {
      // Safe fallback
      const fallbackMsg: ChatMessage = {
        id: `fb-${Date.now()}`,
        role: 'model',
        content: `Aapki current attendance **${studentInfo.attendance}%** hai. Aapke paas **${studentInfo.safeBunks} safe bunk buffer** available hai. Timetable aur dynamic QR codes scan karke apna record maintain rakhein!`,
        source: 'Campus Copilot Fallback Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "Kya mai aaj ki last class bunk kar sakta hoon?",
    "Show my today's timetable schedule",
    "How to reach 85% attendance?",
    "Who teaches Operating Systems?"
  ];

  return (
    <AppleDeluxeShell>
      <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto w-full p-3 sm:p-6 lg:p-8 pb-20 md:pb-6 space-y-3 sm:space-y-4">
        
        {/* Header Navigation & Live Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200/80">
          <div className="flex items-center space-x-3">
            <Link 
              href="/dashboard"
              className="p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                  Campus AI Copilot
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
                  Google Gemini 3
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Intelligent conversational assistant for attendance, bunk limits & lecture navigation
              </p>
            </div>
          </div>

          {/* Quick Telemetry Chips */}
          <div className="flex items-center gap-2">
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl px-3 py-1.5 text-right shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-stone-400 block tracking-wider">Attendance</span>
              <span className="text-xs font-mono font-extrabold text-stone-900">{studentInfo.attendance.toFixed(1)}%</span>
            </div>
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl px-3 py-1.5 text-right shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-purple-500 block tracking-wider">Safe Bunk</span>
              <span className="text-xs font-mono font-extrabold text-purple-800">{studentInfo.safeBunks} Class</span>
            </div>
            <button
              onClick={() => setMessages([messages[0]])}
              className="p-2 rounded-2xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat Feed Container */}
        <div className="flex-1 bg-white/80 rounded-[28px] border border-stone-200/80 shadow-sm p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 min-h-[300px] max-h-[calc(100dvh-340px)] sm:max-h-[calc(100dvh-290px)]">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-[24px] p-4.5 sm:p-5 shadow-2xs ${
                  isUser 
                    ? 'bg-stone-900 text-white rounded-br-sm' 
                    : 'bg-[#F9F7F4] text-stone-800 border border-stone-200/80 rounded-bl-sm space-y-2'
                }`}>
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-2 mb-2">
                      <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" /> Campus Copilot
                      </span>
                      {msg.source && (
                        <span className="text-[9px] font-mono text-stone-400 bg-white/80 px-2 py-0.5 rounded-full border border-stone-200/50">
                          {msg.source}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </div>

                  <div className={`text-[10px] pt-1 text-right ${isUser ? 'text-stone-400' : 'text-stone-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#F9F7F4] border border-stone-200/80 rounded-[24px] rounded-bl-sm p-4 text-xs text-stone-500 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-600 animate-spin" />
                <span className="font-semibold">Gemini AI is analyzing attendance & timetable...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-[11px] font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-stone-200/90 hover:border-stone-300 rounded-full px-3.5 py-1.5 shrink-0 transition shadow-2xs hover:shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Input Bar Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="flex items-center gap-2 bg-white rounded-2xl p-2 border border-stone-200/90 shadow-sm focus-within:border-stone-400 transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot: 'Can I bunk today?', 'Next class room?', 'Attendance impact'..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

      </div>
    </AppleDeluxeShell>
  );
}
