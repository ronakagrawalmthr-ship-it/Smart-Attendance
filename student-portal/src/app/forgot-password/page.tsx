'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Step 1: Request OTP Code
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

      setStatusMessage(`Verification code sent to your registered address: ${data.email}`);
      if (data.dev_otp) {
        setDevOtp(data.dev_otp);
        setOtp(data.dev_otp); // Prefill for immediate testing convenience
      }
      setStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP & Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          otp,
          new_password: newPassword
        })
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
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/20 mb-2">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-slate-400">
            {step === 'request' && 'Enter your student roll number or institutional email to receive a secure recovery code.'}
            {step === 'verify' && 'Enter the 6-digit verification code sent to your email and your new password.'}
            {step === 'completed' && 'Your account password has been updated. You can now log in.'}
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

          {statusMessage && (
            <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center space-x-3 text-cyan-300 text-xs">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* STEP 1 FORM */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Roll Number or Student Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Dispatching Verification Code...' : 'Send Recovery Code'}</span>
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

          {/* STEP 2 FORM */}
          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {devOtp && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center justify-between">
                  <span>Demo Code: <strong className="text-white font-mono text-sm">{devOtp}</strong></span>
                  <span className="text-[10px] text-cyan-400 uppercase">Auto-Filled</span>
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
                  className="w-full text-center tracking-[8px] font-mono text-lg py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Updating Password...' : 'Confirm & Update Password'}</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs text-slate-400 hover:text-white transition inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Roll Number / Email</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 'completed' && (
            <div className="text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Password Updated Successfully!</h3>
                <p className="text-xs text-slate-400">
                  You can now log in using your student identifier and your newly established password.
                </p>
              </div>
              <Link
                href="/"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition flex items-center justify-center space-x-2"
              >
                <span>Sign In Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>End-to-End Cryptographic Bcrypt Security</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
