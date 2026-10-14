'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  GraduationCap, 
  LayoutDashboard, 
  Settings, 
  BookOpen,
  ChevronRight,
  Loader2,
  CornerDownLeft,
  ScanFace,
  FileCheck2,
  User,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/lib/api';

interface SearchItem {
  type: 'page' | 'subject' | 'action';
  title: string;
  subtitle: string;
  url: string;
  category: string;
}

const DEFAULT_STUDENT_COMMANDS: SearchItem[] = [
  { type: 'page', title: 'Personal Attendance Dashboard', subtitle: 'View real-time lecture attendance & 75% cutoff status', url: '/dashboard', category: 'Navigation' },
  { type: 'page', title: 'Face Biometric Enrollment', subtitle: 'Register 3D facial vectors for classroom scanner kiosks', url: '/enroll', category: 'Biometrics' },
  { type: 'page', title: 'Submit Absence Dispute / Grievance', subtitle: 'Appeal missed lectures with medical or official duty proof', url: '/grievance', category: 'Academic Redressal' },
  { type: 'page', title: 'Student Profile & Digital ID', subtitle: 'Roll number, semester, section & biometric status', url: '/profile', category: 'Profile' },
  { type: 'page', title: 'Account & Security Settings', subtitle: 'Password changes and notification preferences', url: '/settings', category: 'Settings' }
];

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(DEFAULT_STUDENT_COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    const handleOpenCustom = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-spotlight-search', handleOpenCustom);
    window.addEventListener('open-spotlight', handleOpenCustom);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-spotlight-search', handleOpenCustom);
      window.removeEventListener('open-spotlight', handleOpenCustom);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setResults(DEFAULT_STUDENT_COMMANDS);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(DEFAULT_STUDENT_COMMANDS);
      setLoading(false);
      return;
    }

    const filtered = DEFAULT_STUDENT_COMMANDS.filter(c => 
      c.title.toLowerCase().includes(query.toLowerCase()) || 
      c.subtitle.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  return (
    <>
      {/* Spotlight Trigger Pill */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200/80 text-stone-500 hover:text-stone-800 transition shadow-inner border border-stone-200/80 text-xs group"
        title="Search Portal (Cmd+K)"
      >
        <div className="flex items-center space-x-2.5">
          <Search className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-700 transition" />
          <span className="font-medium text-stone-500 group-hover:text-stone-900">Spotlight quick-search...</span>
        </div>
        <kbd className="font-mono text-[10px] bg-white border border-stone-300/80 px-1.5 py-0.5 rounded-md text-stone-500 shadow-2xs font-semibold">
          ⌘K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-stone-900/40 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-white/95 rounded-[28px] shadow-2xl border border-stone-200/90 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-5 py-4 border-b border-stone-200/80">
              <Search className="h-5 w-5 text-blue-600 shrink-0 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDownInInput}
                placeholder="Type a subject, action, or portal page..."
                className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-stone-400 mr-2" />}
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 mr-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg transition"
              >
                ESC
              </button>
            </div>

            {/* Results Roster */}
            <div className="overflow-y-auto p-3 space-y-1 divide-y divide-stone-100 max-h-[420px]">
              {results.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400 font-medium">
                  No matches found for &quot;{query}&quot;
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSel = idx === selectedIndex;
                  return (
                    <div
                      key={item.title + idx}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                        isSel 
                          ? 'bg-[#EDF6FE] text-blue-900 font-semibold shadow-2xs' 
                          : 'hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          item.type === 'page' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'subject' ? 'bg-teal-100 text-teal-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {item.type === 'page' ? <LayoutDashboard className="h-4 w-4" /> :
                           item.type === 'subject' ? <BookOpen className="h-4 w-4" /> :
                           <Calendar className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-stone-900">{item.title}</p>
                          <p className="text-[11px] text-stone-500 truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                        {isSel && <CornerDownLeft className="h-3 w-3 text-blue-600" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Legend */}
            <div className="px-5 py-2.5 bg-stone-50/80 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-400">
              <span className="flex items-center space-x-1.5">
                <span>Navigate</span>
                <kbd className="font-mono bg-white border border-stone-200 px-1 py-0.2 rounded text-stone-600">↑</kbd>
                <kbd className="font-mono bg-white border border-stone-200 px-1 py-0.2 rounded text-stone-600">↓</kbd>
              </span>
              <span className="flex items-center space-x-1.5">
                <span>Select</span>
                <kbd className="font-mono bg-white border border-stone-200 px-1.5 py-0.2 rounded text-stone-600">↵</kbd>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
