'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Laptop, 
  ArrowRight, 
  Lock, 
  Mail, 
  AlertCircle, 
  ChevronDown, 
  Check, 
  Search,
  Cog,
  Radio,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authFetchWithRetry } from '@/lib/api';

const getDeptCode = (name: string) => {
  if (!name) return 'DEPT';
  const words = name.replace('&', '').split(' ').filter(Boolean);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
  return name.slice(0, 4).toUpperCase();
};

const getDeptIcon = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('computer') || n.includes('it') || n.includes('info') || n.includes('bca') || n.includes('mca')) return Laptop;
  if (n.includes('mechanic')) return Cog;
  if (n.includes('electron') || n.includes('ece') || n.includes('ee') || n.includes('electric')) return Radio;
  if (n.includes('business') || n.includes('bba') || n.includes('mba') || n.includes('commerce')) return BookOpen;
  return Building2;
};

export default function HODLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState<string>('');
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hod_token')) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    authFetchWithRetry(`${API_BASE_URL}/attendance/departments-meta`, {}, { maxRetries: 2, delayMs: 500 })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.branches) && data.branches.length > 0) {
          setDepartments(data.branches);
          setDepartment((prev) => (prev && data.branches.includes(prev) ? prev : data.branches[0]));
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
        setIsDeptOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authFetchWithRetry(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      }, { maxRetries: 2, delayMs: 600 });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid HOD credentials for this department.');
      }

      const data = await res.json();
      if (data.user?.role !== 'hod' && data.user?.role !== 'admin') {
        throw new Error(
          `Access denied: Account registered with role '${data.user?.role?.toUpperCase()}'. Only Department Heads (HODs) and Administrators are authorized.`
        );
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('hod_token', data.access_token);
        localStorage.setItem('hod_department', data.user?.department || department);
        if (data.user?.full_name) {
          localStorage.setItem('hod_name', data.user.full_name);
        }
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDepts = departments.filter(d => 
    d.toLowerCase().includes(deptSearch.toLowerCase()) ||
    getDeptCode(d).toLowerCase().includes(deptSearch.toLowerCase())
  );

  const ActiveDeptIcon = getDeptIcon(department);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#FAF7F2]">
      {/* Apple Soft Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-200/35 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 items-center justify-center shadow-xl shadow-emerald-500/20 mb-2 transform hover:scale-105 transition-transform duration-300">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Head of Department Deck
          </h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            Sign in to access your department-exclusive attendance matrices, class turnouts, faculty sessions, and student grievance appeals.
          </p>
        </div>

        <motion.div 
          className="rounded-3xl bg-white/85 border border-stone-200/80 p-8 backdrop-blur-2xl shadow-xl shadow-stone-900/5"
        >
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Custom Apple-Style Department Selector */}
            <div className="relative" ref={deptRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Select Your Department
                </label>
                {departments.length > 0 && (
                  <span className="text-[11px] text-stone-400 font-medium">
                    {departments.length} Faculties
                  </span>
                )}
              </div>

              {/* Selector Button */}
              <button
                type="button"
                onClick={() => setIsDeptOpen(!isDeptOpen)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50/80 hover:bg-white border border-stone-200/90 hover:border-emerald-500/50 text-stone-900 text-sm font-medium flex items-center justify-between shadow-xs transition duration-200 group focus:outline-hidden focus:ring-3 focus:ring-emerald-500/15 cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <ActiveDeptIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-left truncate">
                    <span className="block text-xs font-bold text-stone-900 truncate">
                      {department || 'Choose Department'}
                    </span>
                    <span className="block text-[10px] text-stone-500 font-medium">
                      Academic Faculty
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                    {getDeptCode(department)}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ${isDeptOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Quick Select Chips */}
              {departments.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {departments.slice(0, 5).map((d) => {
                    const isSelected = d === department;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDepartment(d);
                          setIsDeptOpen(false);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200/60'
                        }`}
                      >
                        {getDeptCode(d)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Animated Floating Popover Card */}
              <AnimatePresence>
                {isDeptOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-2xl border border-stone-200 shadow-2xl rounded-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-1"
                  >
                    {departments.length > 4 && (
                      <div className="px-2 py-1 mb-1 sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-stone-100">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                          <input
                            type="text"
                            placeholder="Filter department..."
                            value={deptSearch}
                            onChange={(e) => setDeptSearch(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:bg-white transition"
                          />
                        </div>
                      </div>
                    )}
                    {filteredDepts.map((d) => {
                      const Icon = getDeptIcon(d);
                      const isSelected = d === department;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDepartment(d);
                            setIsDeptOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60 shadow-xs' 
                              : 'hover:bg-stone-50 text-stone-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500'}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs truncate">{d}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                              {getDeptCode(d)}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                HOD Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. hod.dept@university.ac.in"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/70 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm font-medium focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">
                  Department Access Key
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/70 border border-stone-200 text-stone-900 text-sm font-medium focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-stone-900 hover:bg-black text-white shadow-lg shadow-stone-900/10 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating HOD...' : 'Enter Department Control Center'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 flex justify-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/60">
              Institutional Department Access
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
