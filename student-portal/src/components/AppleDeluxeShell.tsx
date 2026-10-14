'use client';

import { API_BASE_URL, authFetch } from '@/lib/api';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ScanFace, 
  FileCheck2, 
  User, 
  Settings, 
  ChevronDown, 
  Check, 
  GraduationCap,
  ShieldCheck,
  Radio,
  Calendar,
  Award,
  Bell,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Search,
  QrCode,
  Sparkles,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightSearch from './SpotlightSearch';

interface AppleDeluxeShellProps {
  children: React.ReactNode;
  studentName?: string;
  rollNumber?: string;
  studentAvatar?: string;
  semester?: string;
  branch?: string;
  section?: string;
}

interface StudentAlert {
  type?: string;
  title: string;
  detail: string;
  time?: string;
  badge?: string;
}

const getNotificationStyle = (type?: string) => {
  switch (type) {
    case 'holiday_alert':
      return {
        ring: 'bg-teal-500/20 border-teal-400/60 text-teal-400',
        title: 'text-teal-400',
        badge: 'bg-teal-500/20 border-teal-400/40 text-teal-300',
        bar: 'from-teal-400 to-emerald-400',
        icon: Calendar,
      };
    case 'grievance_alert':
      return {
        ring: 'bg-amber-500/20 border-amber-400/60 text-amber-400',
        title: 'text-amber-400',
        badge: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
        bar: 'from-amber-400 to-orange-400',
        icon: FileCheck2,
      };
    case 'parent_alert':
      return {
        ring: 'bg-sky-500/20 border-sky-400/60 text-sky-400',
        title: 'text-sky-400',
        badge: 'bg-sky-500/20 border-sky-400/40 text-sky-300',
        bar: 'from-sky-400 to-cyan-400',
        icon: Bell,
      };
    case 'od_leave_alert':
      return {
        ring: 'bg-indigo-500/20 border-indigo-400/60 text-indigo-400',
        title: 'text-indigo-400',
        badge: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300',
        bar: 'from-indigo-400 to-purple-400',
        icon: Award,
      };
    case 'proxy_alert':
      return {
        ring: 'bg-violet-500/20 border-violet-400/60 text-violet-400',
        title: 'text-violet-400',
        badge: 'bg-violet-500/20 border-violet-400/40 text-violet-300',
        bar: 'from-violet-400 to-fuchsia-400',
        icon: UserCheck,
      };
    case 'enrollment_alert':
      return {
        ring: 'bg-cyan-500/20 border-cyan-400/60 text-cyan-400',
        title: 'text-cyan-400',
        badge: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
        bar: 'from-cyan-400 to-blue-400',
        icon: ScanFace,
      };
    case 'security_alert':
      return {
        ring: 'bg-rose-500/20 border-rose-400/60 text-rose-400',
        title: 'text-rose-400',
        badge: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
        bar: 'from-rose-500 to-red-500',
        icon: ShieldAlert,
      };
    case 'defaulter_alert':
      return {
        ring: 'bg-red-500/20 border-red-400/60 text-red-400',
        title: 'text-red-400',
        badge: 'bg-red-500/20 border-red-400/40 text-red-300',
        bar: 'from-red-500 to-rose-600',
        icon: AlertTriangle,
      };
    case 'attendance_submission':
    default:
      return {
        ring: 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400',
        title: 'text-emerald-400',
        badge: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
        bar: 'from-emerald-400 to-teal-300',
        icon: Check,
      };
  }
};

export default function AppleDeluxeShell({
  children,
  studentName = '',
  rollNumber = '',
  studentAvatar = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  semester = '',
  branch = '',
  section = ''
}: AppleDeluxeShellProps) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState(studentName || '');
  const [displayRoll, setDisplayRoll] = useState(rollNumber || '');
  const [displaySemester, setDisplaySemester] = useState(semester || 'Student Console');
  const [displayAvatar, setDisplayAvatar] = useState(studentAvatar);

  // Dynamic Island State: 'compact' (resting) vs 'expanded' (5-second notification)
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<StudentAlert>({
    type: 'attendance_submission',
    title: 'Biometric System Connected',
    detail: 'Face Recognition Scanner Online',
    time: 'Just now',
    badge: 'Active'
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef<boolean>(true);
  const eventIndexRef = useRef<number>(0);
  const [progressKey, setProgressKey] = useState(0);

  const triggerNotification = (alert: StudentAlert) => {
    setCurrentAlert(alert);
    setIsExpanded(true);
    setProgressKey(prev => prev + 1);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
  };

  useEffect(() => {
    if (studentName) setDisplayName(studentName);
    if (rollNumber) setDisplayRoll(rollNumber);
    if (semester) setDisplaySemester(semester);
    if (studentAvatar && studentAvatar.startsWith('data:')) setDisplayAvatar(studentAvatar);
  }, [studentName, rollNumber, semester, studentAvatar]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('student_name') || localStorage.getItem('user_name');
      const storedRoll = localStorage.getItem('student_roll') || localStorage.getItem('roll_number');
      const storedSemester = localStorage.getItem('student_semester_label');
      const storedAvatar = localStorage.getItem('student_avatar');
      if (storedName) setDisplayName(storedName);
      if (storedRoll) setDisplayRoll(storedRoll);
      if (storedSemester) setDisplaySemester(storedSemester);
      if (storedAvatar) setDisplayAvatar(storedAvatar);

      const token = localStorage.getItem('student_token');
      if (token) {
        fetch(`${API_BASE_URL}/portal/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.full_name) {
              setDisplayName(data.full_name);
              localStorage.setItem('student_name', data.full_name);
            }
            if (data?.roll_number) {
              setDisplayRoll(data.roll_number);
              localStorage.setItem('student_roll', data.roll_number);
            }
            if (data?.semester) {
              const semLabel = `Sem ${data.semester} • Sec ${data.section || 'A'} • ${data.branch || 'B.Tech'}`;
              setDisplaySemester(semLabel);
              localStorage.setItem('student_semester_label', semLabel);
              localStorage.setItem('student_semester', String(data.semester));
              localStorage.setItem('student_branch', data.branch || '');
              localStorage.setItem('student_section', data.section || 'A');
            }
            if (data?.photo_thumbnail) {
              setDisplayAvatar(data.photo_thumbnail);
              localStorage.setItem('student_avatar', data.photo_thumbnail);
            }
          })
          .catch(() => {});
      }
    }

    // STRICT PRIVACY & ROLE ISOLATION:
    // Poll only genuine notifications belonging to THIS student (Attendance marks, personal grievance decisions, holidays)

    const fetchStudentNotifications = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/portal/notifications`);
        if (res.ok) {
          const events: any[] = await res.json();
          if (Array.isArray(events) && events.length > 0) {
            // On first load, record existing IDs so we do not spam old events
            if (isFirstFetch.current) {
              events.forEach((ev: any) => seenAlertIds.current.add(ev.id));
              isFirstFetch.current = false;
            } else {
              // Only trigger if a genuine NEW event has arrived
              const unread = events.filter((ev: any) => !seenAlertIds.current.has(ev.id));
              if (unread.length > 0) {
                const latest = unread[0];
                unread.forEach((ev: any) => seenAlertIds.current.add(ev.id));
                triggerNotification({
                  type: latest.type || 'attendance_submission',
                  title: latest.title || 'Campus Update',
                  detail: latest.detail || '',
                  time: latest.time || 'Just now',
                  badge: latest.badge || 'New'
                });
              }
            }
          }
        }
      } catch {
        // Silent fallback - Dynamic Island remains quietly at rest
      }
    };

    fetchStudentNotifications();
    // Poll every 30s for any real new student updates
    const interval = setInterval(fetchStudentNotifications, 30000);

    const handleCustomNotification = (e: Event) => {
      const customEvent = e as CustomEvent<StudentAlert>;
      if (customEvent.detail) {
        triggerNotification(customEvent.detail);
      }
    };
    window.addEventListener('campus-notification', handleCustomNotification);
    return () => {
      clearInterval(interval);
      window.removeEventListener('campus-notification', handleCustomNotification);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [displayName, displayRoll]);

  const navItems = [
    { label: 'Attendance', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Campus Copilot', href: '/copilot', icon: Sparkles },
    { label: 'Scan QR', href: '/scan', icon: QrCode },
    { label: 'Face ID Enroll', href: '/enroll', icon: ScanFace },
    { label: 'Grievance Desk', href: '/grievance', icon: FileCheck2 },
    { label: 'Student Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const currentStyle = getNotificationStyle(currentAlert.type);
  const AlertIcon = currentStyle.icon;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col items-center py-6 px-3 sm:px-6 relative">
      
      {/* 🏝️ Apple Dynamic Island Notification Capsule */}
      <div className="fixed top-3.5 z-50 pointer-events-none flex justify-center w-full px-4">
        <motion.div
          layout
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          onClick={() => setIsExpanded(prev => !prev)}
          className={`pointer-events-auto bg-[#0B0C0E]/95 text-white backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-white/12 flex items-center justify-between cursor-pointer select-none transition-all duration-300 relative overflow-hidden ${
            isExpanded 
              ? 'px-4 py-2.5 rounded-[24px] min-w-[340px] sm:min-w-[440px] max-w-lg' 
              : 'px-3.5 py-1.5 rounded-full w-auto hover:scale-105'
          }`}
        >
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              /* Compact Resting Pill State */
              <motion.div
                key="compact-island"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center space-x-2.5 py-0.5"
                title="Dynamic Island • Click to preview biometric status"
              >
                <div className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/30 animate-ping absolute"></span>
                </div>
                <span className="text-[11px] font-semibold text-stone-200 tracking-wider uppercase">
                  Face ID Active
                </span>
                <Radio className="h-3 w-3 text-blue-400/80 animate-pulse" />
              </motion.div>
            ) : (
              /* Expanded 5-Second Notification State */
              <motion.div
                key="expanded-island"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between w-full space-x-3.5 py-0.5"
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${currentStyle.ring}`}>
                  <AlertIcon className="h-4 w-4 stroke-[2.5]" />
                </div>

                <div className="text-left flex flex-col flex-1 min-w-0 pr-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStyle.title}`}>
                      {currentAlert.title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      • {currentAlert.time || 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate max-w-[240px] sm:max-w-[310px] leading-snug">
                    {currentAlert.detail}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center space-x-0.5 px-0.5">
                    <span className="w-0.5 h-3 bg-blue-400 rounded-full animate-pulse"></span>
                    <span className="w-0.5 h-4.5 bg-blue-400 rounded-full animate-pulse delay-75"></span>
                    <span className="w-0.5 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></span>
                    <span className="w-0.5 h-3.5 bg-blue-400 rounded-full animate-pulse delay-100"></span>
                  </div>
                  {currentAlert.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentStyle.badge}`}>
                      {currentAlert.badge}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5-Second Thin Apple Timer Progress Bar */}
          {isExpanded && (
            <motion.div
              key={progressKey}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${currentStyle.bar} opacity-80`}
            />
          )}
        </motion.div>
      </div>

      {/* 💻 macOS Floating Deluxe Window Container */}
      <div className="w-full max-w-7xl mt-10 md:mt-12 mb-20 md:mb-6 bg-white/95 rounded-[24px] sm:rounded-[32px] border border-stone-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-6rem)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        
        {/* Mobile / Cover Screen Glass Header (< md) */}
        <header className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2]/80 border-b border-stone-200/70 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56] inline-block"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E] inline-block"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F] inline-block"></span>
            </div>
            <span className="text-xs font-extrabold text-stone-800 ml-1.5 tracking-tight">
              {navItems.find(i => i.href === pathname)?.label || 'Console'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-spotlight-search'));
                }
              }}
              className="p-1.5 rounded-xl bg-stone-200/60 active:bg-stone-300 text-stone-700 transition flex items-center space-x-1 text-xs px-2"
              title="Quick Search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold text-stone-500">⌘K</span>
            </button>
            <img 
              src={displayAvatar} 
              alt={displayName} 
              className="h-7 w-7 rounded-full object-cover border border-stone-300 shadow-2xs"
            />
          </div>
        </header>

        {/* Adaptive macOS Rail Sidebar (Hidden on mobile/cover, w-20 on Fold Unfolded / Tablets, w-60 on Desktop) */}
        <aside className="hidden md:flex md:w-20 lg:w-60 bg-[#FAF7F2]/60 border-b md:border-b-0 md:border-r border-stone-200/70 p-3 lg:p-5 flex-col justify-between shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          
          <div>
            {/* macOS Window Traffic Light Controls */}
            <div className="flex items-center justify-center lg:justify-start space-x-2 mb-8 pt-1 lg:pl-1">
              <span className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-2xs inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-2xs inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-2xs inline-block"></span>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5 text-xs font-medium">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-[#F0ECE4] text-stone-900 font-bold shadow-2xs' 
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/70'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-teal-600' : 'text-stone-400'}`} />
                    <span className="hidden lg:inline truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Student Profile Chip & Sign Out */}
          <div className="pt-4 lg:pt-6 border-t border-stone-200/60 mt-6 flex items-center justify-between transition-all duration-200">
            <div className="flex items-center space-x-3 min-w-0">
              <img 
                src={displayAvatar} 
                alt={displayName} 
                className="h-8 w-8 rounded-full object-cover border border-stone-200 shrink-0 shadow-2xs"
              />
              <div className="min-w-0 flex-1 hidden lg:block">
                <p className="text-xs font-bold text-stone-900 truncate">{displayName}</p>
                <p className="text-[10px] text-stone-500 font-medium truncate">{displayRoll} • {displaySemester}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('student_token');
                  localStorage.removeItem('student_name');
                  localStorage.removeItem('student_roll');
                  localStorage.removeItem('student_email');
                  localStorage.removeItem('student_branch');
                  localStorage.removeItem('student_semester');
                  localStorage.removeItem('student_semester_label');
                  localStorage.removeItem('student_section');
                  localStorage.removeItem('student_avatar');
                  window.location.href = '/';
                }
              }}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition"
              title="Sign Out of Student Account"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-gradient-to-b from-white to-[#FAF7F2]/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          {children}
        </main>

      </div>

      {/* 🍎 Floating Apple Mobile Bottom Dock (< md) with Spring Animation */}
      <nav 
        className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 bg-[#0B0C0E]/90 backdrop-blur-2xl px-1.5 sm:px-2 py-1 rounded-full border border-white/12 shadow-[0_16px_36px_rgba(0,0,0,0.35)] flex items-center space-x-0.5 sm:space-x-1.5 md:hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-w-[96vw] overflow-x-auto scrollbar-none"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full flex flex-col items-center justify-center transition-all duration-200 shrink-0 ${
                isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="student-mobile-active-pill"
                  className="absolute inset-0 bg-white/15 rounded-full border border-white/20 shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-teal-400' : 'text-stone-400'}`} />
              <span className="text-[9px] relative z-10 mt-0.5 tracking-tight scale-90">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('student_token');
              localStorage.removeItem('student_name');
              localStorage.removeItem('student_roll');
              localStorage.removeItem('student_email');
              localStorage.removeItem('student_branch');
              localStorage.removeItem('student_semester');
              localStorage.removeItem('student_semester_label');
              localStorage.removeItem('student_section');
              localStorage.removeItem('student_avatar');
              window.location.href = '/';
            }
          }}
          className="relative px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full flex flex-col items-center justify-center transition-all duration-200 shrink-0 text-stone-400 hover:text-rose-400"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
          <span className="text-[9px] mt-0.5 tracking-tight scale-90 text-rose-400">Exit</span>
        </button>
      </nav>

      {/* Global Spotlight Search Modal */}
      <SpotlightSearch />

      {/* Footer Info */}
      <footer className="mt-4 md:mt-8 pb-16 md:pb-0 text-center text-xs text-stone-400 font-medium transition-all">
        Student Academic Console • Deluxe Apple Experience Edition
      </footer>

    </div>
  );
}
