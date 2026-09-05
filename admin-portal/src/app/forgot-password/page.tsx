'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function AdminForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not initiate password reset.');
      }

      setStatusMessage(`Recovery verification code sent to: ${data.email}`);
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
        setOtp(data.dev_otp);
      }
      setStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, new_password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reset password.');
      }

      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 items-center justify-center shadow-xl shadow-purple-500/20 mb-2">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Recovery</h1>
          <p className="text-sm text-slate-400">
            {step === 'request' && 'Enter your institutional administrator email to receive a secure recovery code.'}
            {step === 'verify' && 'Enter the 6-digit code and choose your new administrator password.'}
            {step === 'completed' && 'Your admin credentials have been updated.'}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 backdrop-blur-xl shadow-2xl"
        >
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center space-x-3 text-purple-300 text-xs">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-purple-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Institutional Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@college.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white shadow-lg shadow-purple-600/25 transition flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Dispatching Code...' : 'Send Recovery Code'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-2 text-center">
                <Link href="/" className="text-xs text-slate-400 hover:text-white transition inline-flex items-center space-x-1">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {devOtp && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300 flex items-center justify-between">
                  <span>Demo Code: <strong className="text-white font-mono text-sm">{devOtp}</strong></span>
                  <span className="text-[10px] text-purple-400 uppercase">Auto-Filled</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-[8px] font-mono text-lg py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Admin Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white shadow-lg shadow-purple-600/25 transition flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Updating...' : 'Update Admin Password'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'completed' && (
            <div className="text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Password Updated!</h3>
                <p className="text-xs text-slate-400">
                  Your administrator password is now active.
                </p>
              </div>
              <Link
                href="/"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-95 text-white shadow-lg shadow-purple-600/25 transition flex items-center justify-center space-x-2"
              >
                <span>Return to Admin Login</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Cryptographic Bcrypt Security Guard</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
