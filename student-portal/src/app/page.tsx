'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, Lock, User, AlertCircle, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetchWithRetry } from '@/lib/api';

export default function StudentHome() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('student_token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authFetchWithRetry(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.trim(), password })
      }, { maxRetries: 2, delayMs: 600 });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid student credentials. Please check your roll number/password.');
      }

      const data = await res.json();
      if (data.user?.role !== 'student') {
        throw new Error(
          `This account (${data.user?.email}) is registered with role '${data.user?.role?.toUpperCase()}'. To access the Student Portal, please sign in with your Student Roll Number or visit the Admin Portal (Port 3001).`
        );
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('student_token', data.access_token);
        if (data.user?.full_name) localStorage.setItem('student_name', data.user.full_name);
        if (data.user?.roll_number) localStorage.setItem('student_roll', data.user.roll_number);
        if (data.user?.email) localStorage.setItem('student_email', data.user.email);
        if (data.user?.department) localStorage.setItem('student_branch', data.user.department);
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

      <div className="max-w-md w-full mx-auto space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-[1.75rem] bg-stone-900 items-center justify-center shadow-md mb-2">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            Student Academic Portal
          </h1>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Check your attendance percentage, subject-wise analytics, and eligibility records.
          </p>
        </div>

        {/* Login Card */}
        <motion.div 
          className="rounded-[2rem] bg-white/90 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-6"
        >
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-2 text-rose-900 text-xs">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
              {(errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('register')) && (
                <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-rose-700">New student?</span>
                  <Link
                    href="/enroll"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-900 text-white text-[11px] font-semibold hover:bg-stone-800 transition"
                  >
                    <span>Register / Enroll Now</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
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
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Roll Number or Email"
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
                  placeholder="Password"
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

          {/* New Student Registration Link */}
          <div className="pt-4 border-t border-stone-100 flex flex-col space-y-3">
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-900">New Student?</div>
                  <div className="text-[11px] text-stone-500">Register profile & face photo</div>
                </div>
              </div>
              <Link
                href="/enroll"
                className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition flex items-center space-x-1"
              >
                <span>Register</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
