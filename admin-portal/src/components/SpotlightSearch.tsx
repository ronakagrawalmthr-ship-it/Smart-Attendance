'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Users, 
  Building2, 
  GraduationCap, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Mail, 
  BookOpen,
  ChevronRight,
  Loader2,
  CornerDownLeft
} from 'lucide-react';
import { API_BASE_URL, authFetch } from '@/lib/api';

interface SearchItem {
  type: 'page' | 'student' | 'faculty' | 'subject';
  title: string;
  subtitle: string;
  url: string;
  category: string;
  meta?: any;
}

const DEFAULT_COMMANDS: SearchItem[] = [
  { type: 'page', title: 'Dashboard Overview', subtitle: 'Live campus turnout & aggregate metrics', url: '/dashboard', category: 'Quick Navigation' },
  { type: 'page', title: 'Student & Faculty Directory', subtitle: 'Full CRUD across students, faculty & HOD accounts', url: '/directory', category: 'Quick Navigation' },
  { type: 'page', title: 'Engineering Departments', subtitle: 'CSE, IT, ECE & Mechanical departmental data', url: '/departments', category: 'Quick Navigation' },
  { type: 'page', title: 'Defaulter Action Roster (<75%)', subtitle: 'Students below 75% attendance threshold', url: '/defaulters', category: 'Quick Navigation' },
  { type: 'page', title: 'Institutional Governance', subtitle: 'Official notices, alerts and term management', url: '/governance', category: 'Quick Navigation' },
  { type: 'page', title: 'Master Console Settings', subtitle: 'Institutional thresholds & admin credentials', url: '/settings', category: 'Quick Navigation' },
];

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>(DEFAULT_COMMANDS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keyboard shortcut listener: Cmd+K or Ctrl+K opens; Escape closes
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setResults(DEFAULT_COMMANDS);
    }
  }, [isOpen]);

  // Live database query
  useEffect(() => {
    if (!query.trim()) {
      setResults(DEFAULT_COMMANDS);
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await authFetch(`${API_BASE_URL}/management/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const items: SearchItem[] = data.results || [];
          setResults(items);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn("Spotlight search fallback:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    router.push(url);
  };

  // Keyboard navigation up / down / enter
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].url);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-4 w-4 text-violet-600" />;
      case 'faculty':
        return <Users className="h-4 w-4 text-sky-600" />;
      case 'subject':
        return <BookOpen className="h-4 w-4 text-emerald-600" />;
      case 'page':
      default:
        return <BarChart3 className="h-4 w-4 text-indigo-600" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'student':
        return 'bg-violet-50 text-violet-700 border-violet-200/70';
      case 'faculty':
        return 'bg-sky-50 text-sky-700 border-sky-200/70';
      case 'subject':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  return (
    <>
      {/* Navbar trigger pill */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Open Spotlight Search"
        className="hidden lg:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-stone-100/90 hover:bg-stone-100 border border-stone-200/70 text-stone-500 text-xs hover:border-stone-300 transition shadow-xs group"
      >
        <Search className="h-3.5 w-3.5 text-stone-400 group-hover:text-indigo-600 transition" />
        <span className="group-hover:text-stone-700 transition">Spotlight Quick Search...</span>
        <kbd className="text-[10px] font-semibold bg-white border border-stone-200 px-1.5 py-0.5 rounded-md text-stone-600 shadow-2xs">
          ⌘K
        </kbd>
      </button>

      {/* Spotlight modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop with creamy glass blur */}
          <div 
            className="fixed inset-0 bg-stone-900/35 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)} 
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-2xl border border-stone-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden z-10">
            {/* Search Input Bar */}
            <div className="flex items-center space-x-3 px-5 py-4 border-b border-stone-100">
              <Search className="h-5 w-5 text-indigo-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search students, roll numbers, faculty, subjects, or navigate..."
                className="flex-1 text-sm sm:text-base text-stone-900 placeholder:text-stone-400 bg-transparent outline-none font-medium"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
              {query && !loading && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block text-[10px] font-bold text-stone-400 border border-stone-200 px-2 py-0.5 rounded-lg bg-stone-50">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2.5 space-y-1">
              {results.length > 0 ? (
                results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition text-left group ${
                        isSelected 
                          ? 'bg-indigo-50/70 border border-indigo-200/60 shadow-xs' 
                          : 'hover:bg-stone-100/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-stone-100'
                        }`}>
                          {getIcon(item.type)}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-stone-900 text-xs sm:text-sm truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 pl-3">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getBadgeColor(item.type)}`}>
                          {item.category}
                        </span>
                        {isSelected && (
                          <CornerDownLeft className="h-3.5 w-3.5 text-indigo-600 hidden sm:inline-block" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-stone-500 space-y-2">
                  <Search className="h-8 w-8 text-stone-300 mx-auto" />
                  <p className="font-medium text-stone-700">No database records found</p>
                  <p className="text-[11px] text-stone-400">
                    No results matched &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-stone-50/80 px-5 py-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">↑</kbd>
                  <kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="font-mono bg-white border border-stone-200 px-1 py-0.5 rounded text-[10px]">↵</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span className="font-mono text-[10px] text-stone-400">Live Database Query Engine</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
