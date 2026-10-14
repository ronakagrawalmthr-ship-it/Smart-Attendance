'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  LayoutDashboard, 
  Settings, 
  BookOpen,
  ChevronRight,
  Loader2,
  CornerDownLeft,
  Calendar,
  Layers
} from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/lib/api';

interface SearchItem {
  type: 'page' | 'student' | 'faculty';
  title: string;
  subtitle: string;
  url: string;
  category: string;
  meta?: any;
}

const DEFAULT_COMMANDS: SearchItem[] = [
  { type: 'page', title: 'Department Dashboard', subtitle: 'CSE Attendance, sections and live labs', url: '/dashboard', category: 'Quick Navigation' },
  { type: 'page', title: 'Classes & Lab Sessions', subtitle: 'Lecture telemetry, active time-slots and labs', url: '/classes', category: 'Quick Navigation' },
  { type: 'page', title: 'CSE Faculty Directory', subtitle: 'Faculty members, subjects and lecture logs', url: '/faculty', category: 'Quick Navigation' },
  { type: 'page', title: 'Student Grievance Desk', subtitle: 'Review absence disputes and grant attendance', url: '/grievances', category: 'Quick Navigation' },
  { type: 'page', title: 'Defaulters Action Roster', subtitle: 'Students below statutory 75% cutoff with WhatsApp alert', url: '/defaulters', category: 'Quick Navigation' },
  { type: 'page', title: 'Academic Operations', subtitle: 'Duty Leave (OD), Holidays and Proxy allocations', url: '/operations', category: 'Quick Navigation' },
  { type: 'page', title: 'Department Settings', subtitle: 'Cutoff thresholds and HOD credentials', url: '/settings', category: 'Quick Navigation' },
];

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(DEFAULT_COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setResults(DEFAULT_COMMANDS);
    }
  }, [isOpen]);

  // Live query
  useEffect(() => {
    if (!query.trim()) {
      setResults(DEFAULT_COMMANDS);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await authFetch(`${API_BASE_URL}/management/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: SearchItem[] = (data.results || []).map((r: any) => ({
            type: r.type,
            title: r.title,
            subtitle: r.subtitle,
            url: r.url || '/classes',
            category: r.type === 'student' ? 'CSE Students' : 'CSE Faculty',
            meta: r
          }));
          setResults(mapped.length > 0 ? mapped : DEFAULT_COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase())));
        } else {
          setResults(DEFAULT_COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase())));
        }
      } catch {
        setResults(DEFAULT_COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase())));
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-100 flex items-center space-x-3 bg-stone-50/50">
          <Search className="h-5 w-5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search CSE students, faculty, or jump to page..."
            className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {results.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              onClick={() => handleSelect(item)}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-teal-50/70 cursor-pointer transition-colors group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-stone-100 group-hover:bg-teal-100 text-stone-600 group-hover:text-teal-700 flex items-center justify-center shrink-0">
                  {item.type === 'student' ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate">{item.title}</p>
                  <p className="text-[11px] text-stone-400 truncate">{item.subtitle}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-stone-400 group-hover:text-teal-700 px-2 py-0.5 rounded-full bg-stone-100 group-hover:bg-teal-100/60 shrink-0">
                {item.category}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between text-[11px] text-stone-400 px-4">
          <div className="flex items-center space-x-2">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] font-mono">Esc</kbd>
            <span>to close</span>
          </div>
          <span className="font-medium text-teal-700">HOD Quick Navigator</span>
        </div>
      </div>
    </div>
  );
}
