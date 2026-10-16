'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function SetupWizardPage() {
  const router = useRouter();

  // Wizard Steps: 1 = Details & Email, 2 = 6-Digit OTP, 3 = Create Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Initialization lock state
  const [isAlreadyInitialized, setIsAlreadyInitialized] = useState<boolean | null>(null);

  // Form states
  const [institutionName, setInstitutionName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  
  // OTP state (6 discrete digits)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [emailDispatched, setEmailDispatched] = useState<boolean | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if system is already initialized on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/setup/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_initialized && data.admin_count > 0) {
            setIsAlreadyInitialized(true);
            if (data.institution_name) {
              setInstitutionName(data.institution_name);
            }
          } else {
            setIsAlreadyInitialized(false);
          }
        }
      } catch (err) {
        console.error('Setup status check error:', err);
        setIsAlreadyInitialized(false);
      }
    }
    checkStatus();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (step === 2 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          if (prev <= 570) {
            setCanResend(true);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const nextEmptyIndex = newOtp.findIndex((d) => d === '');
    if (nextEmptyIndex !== -1) {
      otpInputsRef.current[nextEmptyIndex]?.focus();
    } else {
      otpInputsRef.current[5]?.focus();
    }
  };

  // Step 1: Send OTP to Admin Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailClean = adminEmail.trim().toLowerCase();
    const instClean = institutionName.trim();
    const nameClean = adminName.trim();

    if (!instClean) {
      setErrorMessage('Please enter your University or Institution name.');
      return;
    }
    if (!nameClean) {
      setErrorMessage('Please enter the Administrator full name.');
      return;
    }
    if (!emailClean || !emailClean.includes('@')) {
      setErrorMessage('Please provide a valid institutional email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/setup/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_name: instClean,
          admin_name: nameClean,
          admin_email: emailClean
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to dispatch security verification code.');
      }

      setDevOtp(data.dev_otp || null);
      setEmailDispatched(data.email_dispatched ?? null);
      setDispatchError(data.dispatch_error || null);
      setTimeLeft(600);
      setCanResend(false);
      setStep(2);
      if (data.email_dispatched) {
        setSuccessMessage(`Real verification email dispatched to ${emailClean}. Check your inbox!`);
      } else {
        setSuccessMessage(`Setup initialized for ${emailClean}.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error dispatching OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = otp.join('').trim();
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/setup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: adminEmail.trim().toLowerCase(),
          otp: fullOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid or expired verification code.');
      }

      setSetupToken(data.setup_token);
      setSuccessMessage('Email domain ownership verified! Now create your Master Password.');
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Setup with Master Password
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!setupToken) {
      setErrorMessage('Verification session expired. Please re-verify your email.');
      setStep(2);
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Master password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/setup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_token: setupToken,
          institution_name: institutionName.trim(),
          admin_name: adminName.trim(),
          admin_email: adminEmail.trim().toLowerCase(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to finalize administrator setup.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_name', adminName.trim());
        localStorage.setItem('institution_name', institutionName.trim());
      }

      setStep(4);
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Setup finalization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-stone-900 flex flex-col justify-between font-sans selection:bg-stone-200">
      
      {/* Top Brand Bar */}
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-2xl bg-stone-900 flex items-center justify-center text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-stone-900 block leading-tight">
                Smart Attendance & Governance
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                Day-0 Institution Initialization
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Standalone Enterprise Setup</span>
            </span>
            <button
              onClick={() => router.push('/')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition"
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-xl">
          {/* LOCKED STATE BANNER */}
          {isAlreadyInitialized && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-5"
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/60">
                  <Lock className="h-3 w-3" />
                  <span>Day-0 Setup Permanently Locked</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                  {institutionName || 'University'} Initialized
                </h1>
                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  This system is already initialized and protected. To prevent unauthorized account takeover, re-running the First-Time Setup Wizard is strictly prohibited.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-6 rounded-2xl bg-stone-900 text-white font-semibold text-xs hover:bg-black transition shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Return to Administrator Login</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {!isAlreadyInitialized && (<>
          
          {/* Stepper Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-200 -translate-y-1/2 -z-10" />
              
              {/* Step 1 Pill */}
              <div className="flex items-center space-x-2 bg-[#FBFBFD] px-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 1 ? 'bg-stone-900 text-white shadow-md' : (step > 1 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500')
                }`}>
                  {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${step === 1 ? 'text-stone-900' : 'text-stone-400'}`}>
                  Institution
                </span>
              </div>

              {/* Step 2 Pill */}
              <div className="flex items-center space-x-2 bg-[#FBFBFD] px-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 2 ? 'bg-stone-900 text-white shadow-md' : (step > 2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500')
                }`}>
                  {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${step === 2 ? 'text-stone-900' : 'text-stone-400'}`}>
                  OTP Verify
                </span>
              </div>

              {/* Step 3 Pill */}
              <div className="flex items-center space-x-2 bg-[#FBFBFD] px-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === 3 ? 'bg-stone-900 text-white shadow-md' : (step >= 4 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500')
                }`}>
                  {step >= 4 ? <CheckCircle2 className="h-4 w-4" /> : '3'}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${step === 3 ? 'text-stone-900' : 'text-stone-400'}`}>
                  Master Key
                </span>
              </div>
            </div>
          </div>

          {/* Card Container */}
          <motion.div 
            layout
            className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 relative overflow-hidden"
          >
            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start space-x-3 text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && !errorMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start space-x-3 text-emerald-800 text-xs animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Institution & Admin Info */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                    Initialize New University
                  </h1>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                    Set up your college or university instance. No default passwords are used—you will create your own custom credentials after email verification.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      University / Institution Name
                    </label>
                    <div className="relative">
                      <Building2 className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Indian Institute of Technology / Oxford / Stanford"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Super Administrator Name
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dean Academic Affairs / Registrar"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Official Institutional Email (Admin ID)
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@college.edu or dean@univ.ac.in"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start space-x-3 text-amber-900 text-xs">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                  <span className="leading-relaxed">
                    <b>Security Protocol:</b> A 6-digit verification code will be dispatched to this email to ensure you are the verified administrator before password creation is unlocked.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 text-white hover:bg-black font-semibold text-sm transition shadow-sm hover:shadow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Dispatching Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Security Verification OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                      Verify Your Email
                    </h1>
                    <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                      We dispatched a 6-digit code to <span className="font-semibold text-stone-800">{adminEmail}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition flex items-center space-x-1 text-xs font-semibold"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Change</span>
                  </button>
                </div>

                {/* Real Email vs Sandbox Status Indicator */}
                {emailDispatched ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start space-x-3 text-emerald-900 text-xs shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 text-xs">Real Email Sent Successfully!</p>
                      <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                        We have dispatched your 6-digit security code to <b>{adminEmail}</b>. Please check your inbox (or spam folder).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 space-y-2 text-amber-950 text-xs shadow-2xs">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 text-xs">Resend Sandbox Mode Active</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                          Resend free tier only delivers external emails to the verified owner of your Resend API key.
                          For instant activation in development mode, use the auto-fill developer code below.
                        </p>
                      </div>
                    </div>
                    {devOtp && (
                      <div className="pt-2 flex items-center justify-between border-t border-amber-200/60">
                        <span className="font-semibold text-[11px] text-amber-900">
                          Sandbox Code: <b className="font-mono text-sm tracking-widest text-amber-950">{devOtp}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = devOtp.split('');
                            setOtp(digits);
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shadow-2xs transition"
                        >
                          Auto-Fill Code
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 6 Digit Split Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="flex justify-center items-center gap-2 sm:gap-3 py-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-stone-900 bg-stone-50 border-2 border-stone-200 rounded-2xl focus:border-stone-900 focus:bg-white focus:outline-none transition shadow-2xs"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                  <span>Code expires in: <b className="font-mono text-stone-900">{formatTime(timeLeft)}</b></span>
                  <button
                    type="button"
                    disabled={!canResend || isLoading}
                    onClick={handleSendOtp}
                    className="font-bold text-stone-800 hover:text-black disabled:text-stone-300 transition"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 text-white hover:bg-black font-semibold text-sm transition shadow-sm hover:shadow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: Create Master Password */}
            {step === 3 && (
              <form onSubmit={handleCompleteSetup} className="space-y-6">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Identity Verified: {adminEmail}</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                    Create Master Password
                  </h1>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                    Set a secure master password for your administrator account. This will be used to log in and create credentials for your HODs and faculty.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Master Password
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl pl-10 pr-11 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Confirm Master Password
                    </label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200/90 rounded-2xl pl-10 pr-11 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-[11px]">
                    <span className="font-bold text-stone-700 block uppercase tracking-wider text-[10px]">
                      Security Requirements
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-stone-600">
                      <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-600 font-bold' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${hasUpperCase ? 'text-emerald-600 font-bold' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${hasUpperCase ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                        <span>Contains number</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${passwordsMatch ? 'text-emerald-600 font-bold' : ''}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !hasMinLength || !passwordsMatch}
                  className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 text-white hover:bg-black font-semibold text-sm transition shadow-sm hover:shadow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Initializing Platform...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize University & Launch Portal</span>
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: Success & Launch */}
            {step === 4 && (
              <div className="py-8 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                  Setup Completed Successfully!
                </h1>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  <b>{institutionName}</b> is now fully initialized. Your master administrator account is secured. Redirecting you to the master dashboard...
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="py-3 px-6 rounded-2xl bg-stone-900 text-white font-semibold text-xs hover:bg-black transition shadow-sm"
                  >
                    Enter Master Dashboard Now →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
          </>)}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/50 backdrop-blur-sm py-4 text-center text-xs text-stone-500">
        Enterprise Identity & Access Governance • Multi-University Deploy Engine
      </footer>
    </div>
  );
}
