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
      <div className="max-w-md w-full mx-auto space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-stone-900 text-white items-center justify-center shadow-md mb-2">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
            {step === 'request' && 'Enter your student roll number or institutional email to receive a secure recovery code.'}
            {step === 'verify' && 'Enter the 6-digit verification code sent to your email and your new password.'}
            {step === 'completed' && 'Your account password has been updated. You can now log in.'}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white/90 border border-stone-200/80 p-8 backdrop-blur-xl shadow-sm space-y-5"
        >
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* STEP 1 FORM */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Roll Number or Student Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 23CSE001 or student@college.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Dispatching Verification Code...' : 'Send Recovery Code'}</span>
                <ArrowRight className="h-4 w-4 text-stone-300" />
              </button>

              <div className="pt-2 text-center">
                <Link href="/" className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition inline-flex items-center space-x-1">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2 FORM */}
          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {devOtp && (
                <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
                  <span>Demo Code: <strong className="text-stone-900 font-mono text-sm">{devOtp}</strong></span>
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Auto-Filled</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-[8px] font-mono text-lg py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Updating Password...' : 'Confirm & Update Password'}</span>
                <CheckCircle2 className="h-4 w-4 text-stone-300" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Roll Number / Email</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 'completed' && (
            <div className="text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-900">Password Updated Successfully!</h3>
                <p className="text-xs text-stone-600">
                  You can now log in using your student identifier and your newly established password.
                </p>
              </div>
              <Link
                href="/"
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition flex items-center justify-center space-x-2"
              >
                <span>Sign In Now</span>
                <ArrowRight className="h-4 w-4 text-stone-300" />
              </Link>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-stone-100 text-center text-xs text-stone-400 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>End-to-End Cryptographic Bcrypt Security</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

