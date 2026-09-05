'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@college.edu');
  const [password, setPassword] = useState('AdminPass123!');
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
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid administrative credentials.');
      }

      const data = await res.json();
      if (data.user?.role !== 'admin' && data.user?.role !== 'hod') {
        throw new Error('Access denied: Only Department HODs and Administrators are authorized.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', data.access_token);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Soft warm ambient glow behind the card */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-amber-200/30 via-rose-200/30 to-indigo-200/30 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-7 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 items-center justify-center shadow-xl shadow-indigo-500/20 mb-1">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Institutional Console
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
            Sign in with institutional credentials to access academic directories, defaulter matrices, and emergency governance.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-white/95 border border-stone-200/80 p-8 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.05)]"
        >
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center space-x-3 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 pl-1">
                Administrator / HOD Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.edu or hod@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 pl-1">
                <label className="block text-xs font-semibold text-stone-600">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition">
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
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-50/80 border border-stone-200 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-full font-bold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white shadow-lg shadow-indigo-600/25 transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In to Console'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Fill Pill */}
          <div className="mt-5 p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs text-stone-600">
            <div className="truncate mr-2">
              <span className="font-semibold text-stone-900">Demo Admin:</span> admin@college.edu
            </div>
            <button
              type="button"
              onClick={() => { setEmail('admin@college.edu'); setPassword('AdminPass123!'); }}
              className="px-3 py-1 rounded-full bg-white border border-stone-200 hover:border-stone-300 text-stone-800 font-semibold text-[11px] shadow-sm transition"
            >
              Fill
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 text-center text-xs text-stone-400 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Encrypted Institutional Security (RBAC)</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

