'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  CornerDownLeft, 
  Compass, 
  GraduationCap, 
  Users, 
  BookOpen, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Command,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, getPortalUrl } from '@/lib/api';

interface SpotlightResult {
  type: 'page' | 'student' | 'faculty' | 'subject';
  title: string;
  subtitle: string;
  url: string;
  category: string;
  meta?: any;
}

interface SpotlightSearchProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const getFallbackGateways = (): SpotlightResult[] => [
  { type: 'page', title: 'Teacher Attendance Terminal', subtitle: 'Live webcam face detection & session marking', url: '/teacher', category: 'University Gateways' },
  { type: 'page', title: 'Student Academic Portal', subtitle: 'Attendance %, subject thresholds & grievances (:3002)', url: getPortalUrl(3002), category: 'University Gateways' },
  { type: 'page', title: 'HOD Command Center', subtitle: 'Departmental rosters, analytics & live telemetry (:3003)', url: getPortalUrl(3003), category: 'University Gateways' },
  { type: 'page', title: 'College Administrator Portal', subtitle: 'Executive accreditation, directory CRUD & audits (:3001)', url: getPortalUrl(3001), category: 'University Gateways' },
  { type: 'page', title: 'Biometric Face Enrollment', subtitle: '128-d AI face vector registration kiosk', url: '/register', category: 'University Gateways' },
  { type: 'page', title: 'System Settings & Diagnostics', subtitle: 'Camera FPS, biometric confidence & port health', url: '/settings', category: 'University Gateways' },
  { type: 'page', title: 'Defaulters Roster (<75%)', subtitle: 'Statutory attendance alerts & warning notices', url: getPortalUrl(3001, '/defaulters'), category: 'Executive Control' },
  { type: 'page', title: 'Academic Directory Management', subtitle: 'CRUD students, faculty, HODs and subjects', url: getPortalUrl(3001, '/directory'), category: 'Executive Control' },
];

export default function SpotlightSearch({ isOpen: propIsOpen, onClose: propOnClose }: SpotlightSearchProps = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
  const onClose = propOnClose || (() => setInternalOpen(false));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setInternalOpen(prev => !prev);
      }
    };
    const handleCustomSpotlight = () => setInternalOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-spotlight', handleCustomSpotlight);
    window.addEventListener('open-spotlight-search', handleCustomSpotlight);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-spotlight', handleCustomSpotlight);
      window.removeEventListener('open-spotlight-search', handleCustomSpotlight);
    };
  }, []);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'page' | 'student' | 'faculty' | 'subject'>('all');
  const [results, setResults] = useState<SpotlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setQuery('');
      setSelectedIndex(0);
      fetchResults('');
    }
  }, [isOpen]);

  // Live search debounced
  const fetchResults = async (q: string) => {
    setLoading(true);
    const fallback = getFallbackGateways();
    try {
      const res = await fetch(`${API_BASE_URL}/management/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setResults(data.results);
          setSelectedIndex(0);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback local filtering
    }

    const filteredFallback = fallback.filter(item => 
      !q || item.title.toLowerCase().includes(q.toLowerCase()) || item.subtitle.toLowerCase().includes(q.toLowerCase())
    );
    setResults(filteredFallback);
    setSelectedIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchResults(query);
    }, 150);
    return () => clearTimeout(timeout);
  }, [query]);

  // Filter by category tab
  const displayedResults = results.filter(item => {
    if (activeCategory === 'all') return true;
    return item.type === activeCategory;
  });

  // Navigate to item
  const handleSelect = (item: SpotlightResult) => {
    onClose();
    if (item.url.startsWith('http')) {
      window.open(item.url, '_blank');
    } else {
      router.push(item.url);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1 < displayedResults.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : displayedResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayedResults[selectedIndex]) {
          handleSelect(displayedResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayedResults, selectedIndex]);

  // Auto scroll to active item
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-4 w-4 text-emerald-600" />;
      case 'faculty':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'subject':
        return <BookOpen className="h-4 w-4 text-amber-600" />;
      default:
        return <Compass className="h-4 w-4 text-blue-600" />;
    }
  };

  const getCategoryBg = (type: string) => {
    switch (type) {
      case 'student':
        return 'bg-emerald-50 border-emerald-200/80';
      case 'faculty':
        return 'bg-purple-50 border-purple-200/80';
      case 'subject':
        return 'bg-amber-50 border-amber-200/80';
      default:
        return 'bg-blue-50 border-blue-200/80';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[82vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input Box */}
          <div className="flex items-center px-5 py-4 border-b border-stone-100 gap-3">
            <Search className="h-5 w-5 text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, faculty, subjects, campus portals..."
              className="flex-1 text-sm sm:text-base font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 text-stone-400 animate-spin shrink-0" />}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-100 border border-stone-200 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center space-x-1.5 px-5 py-2.5 bg-stone-50/80 border-b border-stone-100 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Results' },
              { id: 'page', label: 'Gateways' },
              { id: 'student', label: 'Students' },
              { id: 'faculty', label: 'Faculty & HODs' },
              { id: 'subject', label: 'Subjects' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id as any);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {displayedResults.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-stone-600">No matching campus records found</p>
                <p className="text-xs text-stone-400 mt-1">Try searching by student name, roll number, or department</p>
              </div>
            ) : (
              displayedResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isExternal = item.url.startsWith('http');
                return (
                  <div
                    key={`${item.type}-${item.title}-${idx}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelect(item)}
                    className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-stone-100/90 shadow-2xs' 
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center shrink-0 ${getCategoryBg(item.type)}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-stone-900' : 'text-stone-800'}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {isExternal ? (
                        <span className="text-[11px] text-stone-400 group-hover:text-stone-700 flex items-center space-x-1 font-medium">
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 group-hover:text-stone-700 flex items-center space-x-1 font-medium">
                          <span>Jump</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-stone-500 ml-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer Keyboard Shortcut Guide */}
          <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <kbd className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] text-stone-600">↑</kbd>
                <kbd className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] text-stone-600">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] text-stone-600">↵</kbd>
                <span className="ml-1">Select</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded text-[10px] text-stone-600">esc</kbd>
                <span className="ml-1">Close</span>
              </span>
            </div>
            <div className="flex items-center space-x-1 text-stone-400">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Universal Database Search</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
