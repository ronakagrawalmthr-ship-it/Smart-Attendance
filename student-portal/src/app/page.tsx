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
      {/* Ambient Warm Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-[1.75rem] bg-stone-900 items-center justify-center shadow-md mb-2">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            Student Academic Portal
          </h1>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Sign in to inspect your attendance standing, exam eligibility, or submit an absence grievance.
          </p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-white/80 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-6"
        >
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center space-x-3 text-rose-900 text-xs">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">
                Roll Number or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 23CSE001 or student@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-stone-600">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-stone-500 hover:text-stone-900 transition">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Login Pill */}
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 flex items-center justify-between text-xs text-stone-600">
            <div>
              <span className="font-semibold text-stone-900">Demo Account:</span> 23CSE001
            </div>
            <button
              type="button"
              onClick={() => { setIdentifier('23CSE001'); setPassword('StudentPass123!'); }}
              className="px-2.5 py-1 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-[11px] transition"
            >
              Auto-fill
            </button>
          </div>

          <div className="pt-2 border-t border-stone-100 flex flex-col space-y-3">
            <Link
              href="/enroll"
              className="w-full py-3 px-4 rounded-2xl font-semibold text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 transition flex items-center justify-center space-x-2 shadow-xs"
            >
              <ScanFace className="h-4 w-4 text-stone-700" />
              <span>New Student? Enroll Biometric Face</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
