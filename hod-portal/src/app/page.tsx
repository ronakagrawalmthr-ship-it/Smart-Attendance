'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Laptop, ArrowRight, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function HODLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('hod.cse@college.edu');
  const [password, setPassword] = useState('AdminPass123!');
  const [department, setDepartment] = useState('Computer Science');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // In production or synthetic suite, verify credentials
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid HOD credentials for this department.');
      }

      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('hod_token', data.access_token);
        localStorage.setItem('hod_department', department);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#FAF7F2]">
      {/* Apple Soft Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-200/35 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 items-center justify-center shadow-xl shadow-emerald-500/20 mb-2 transform hover:scale-105 transition-transform duration-300">
            <Laptop className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
            Head of Department Deck
          </h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            Sign in to access your department-exclusive attendance matrices, class turnouts, faculty sessions, and student grievance appeals.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white/85 border border-stone-200/80 p-8 backdrop-blur-2xl shadow-xl shadow-stone-900/5"
        >
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                Select Your Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-stone-50/70 border border-stone-200 text-stone-900 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
              >
                <option value="Computer Science">Computer Science & Engineering</option>
                <option value="Information Tech">Information Technology</option>
                <option value="Electronics">Electronics & Communication</option>
                <option value="Mechanical">Mechanical Engineering</option>
              </select>
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
                  placeholder="hod.cse@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/70 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
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
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/70 border border-stone-200 text-stone-900 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Authenticating HOD...' : 'Enter Department Control Center'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo Credentials Quick-Select Pill */}
          <div className="mt-5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
            <div>
              <span className="font-bold text-emerald-950">Demo HOD:</span> hod.cse@college.edu / AdminPass123!
            </div>
            <button
              type="button"
              onClick={() => { setEmail('hod.cse@college.edu'); setPassword('AdminPass123!'); }}
              className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition"
            >
              Fill
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-200/80 text-center text-xs text-stone-500 flex items-center justify-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Strict Department Isolation Active</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
