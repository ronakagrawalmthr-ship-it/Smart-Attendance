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
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 items-center justify-center shadow-xl shadow-purple-600/20 mb-2">
            <Building2 className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Governance & HOD Console
          </h1>
          <p className="text-sm text-slate-400">
            Sign in with institutional administrative credentials to access department matrices, defaulter alerts, and emergency broadcasts.
          </p>
        </div>

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
                Administrator / HOD Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.edu or hod@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300 transition">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white shadow-lg shadow-purple-600/25 transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Command Deck'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo Credentials Quick-Select Pill */}
          <div className="mt-5 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between text-xs text-purple-300">
            <div>
              <span className="font-semibold text-white">Demo Admin:</span> admin@college.edu / AdminPass123!
            </div>
            <button
              type="button"
              onClick={() => { setEmail('admin@college.edu'); setPassword('AdminPass123!'); }}
              className="px-2 py-1 rounded bg-purple-600/50 hover:bg-purple-600 text-white font-medium text-[11px] transition"
            >
              Fill
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Role-Based Access Guard Active (RBAC)</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
