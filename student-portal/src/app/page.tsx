'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ScanFace, ArrowRight, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function StudentHome() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('student@college.edu');
  const [password, setPassword] = useState('StudentPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });

      if (!res.ok) {
        throw new Error('Invalid student credentials. Please check your roll number/password.');
      }

      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_token', data.access_token);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/20 mb-2">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Student Academic Portal
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to inspect your attendance metrics, exam eligibility, or submit an absence grievance.
          </p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 backdrop-blur-xl shadow-2xl"
        >
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Roll Number or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 23CSE001 or student@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 transition">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Login Pill */}
          <div className="mt-5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between text-xs text-cyan-300">
            <div>
              <span className="font-semibold text-white">Student Account:</span> 23CSE001 / StudentPass123!
            </div>
            <button
              type="button"
              onClick={() => { setIdentifier('23CSE001'); setPassword('StudentPass123!'); }}
              className="px-2 py-1 rounded bg-cyan-600/50 hover:bg-cyan-600 text-white font-medium text-[11px] transition"
            >
              Fill
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col space-y-3">
            <Link
              href="/enroll"
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition flex items-center justify-center space-x-2"
            >
              <ScanFace className="h-4 w-4 text-indigo-400" />
              <span>New Student? Enroll Biometric Face</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
