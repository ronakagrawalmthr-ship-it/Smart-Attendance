'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  BookOpen, 
  UserCheck, 
  XCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import { API_BASE_URL, authFetch } from '@/lib/api';

export default function StudentQrScannerPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Verification Result States
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    already_marked?: boolean;
    subject_name?: string;
    conducted_by?: string;
    marked_at?: string;
    message?: string;
    detail?: string;
  } | null>(null);

  // Fallback Manual Token Input
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Student Profile Context for Header
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    roll: string;
    branch: string;
    semester: number;
    section: string;
  }>({
    name: typeof window !== 'undefined' ? (localStorage.getItem('student_name') || 'Student') : 'Student',
    roll: typeof window !== 'undefined' ? (localStorage.getItem('student_roll') || '') : '',
    branch: typeof window !== 'undefined' ? (localStorage.getItem('student_branch') || '') : '',
    semester: typeof window !== 'undefined' ? (Number(localStorage.getItem('student_semester')) || 1) : 1,
    section: typeof window !== 'undefined' ? (localStorage.getItem('student_section') || 'A') : 'A'
  });

  const html5QrCodeRef = useRef<any>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    // 1. Fetch current student profile for verification display
    const fetchStudentMe = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/portal/profile`);
        if (res && res.ok) {
          const data = await res.json();
          setStudentInfo({
            name: data.full_name || 'Student',
            roll: data.roll_number || '',
            branch: data.branch || '',
            semester: data.semester || 1,
            section: data.section || 'A'
          });
        }
      } catch (e) {
        console.error('Error fetching student profile:', e);
      }
    };
    fetchStudentMe();
  }, []);

  // Initialize Camera Scanner
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Dynamically import Html5Qrcode on client side
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        const scannerId = "student-qr-viewport";
        const container = document.getElementById(scannerId);
        if (!container) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        const onScanSuccess = (decodedText: string) => {
          if (!isMounted || !isScanningRef.current) return;
          handleProcessToken(decodedText);
        };

        const onScanFailure = () => {
          // Frame by frame scanning - silent on no code in view
        };

        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
          );
          if (isMounted) {
            isScanningRef.current = true;
            setScannerActive(true);
            setCameraError(null);
          }
        } catch (errBack) {
          // If back camera not found (e.g. laptop webcam), try default camera
          try {
            await html5QrCode.start(
              { facingMode: "user" },
              config,
              onScanSuccess,
              onScanFailure
            );
            if (isMounted) {
              isScanningRef.current = true;
              setScannerActive(true);
              setCameraError(null);
            }
          } catch (errFront: any) {
            if (isMounted) {
              setCameraError(errFront?.message || 'Camera permission required or no video input device detected.');
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraError('Failed to initialize QR camera engine.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      isScanningRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(() => {});
        } catch {
          // Ignore unmount error
        }
      }
    };
  }, []);

  // Process and Submit Scanned Token to Backend
  const handleProcessToken = async (tokenString: string) => {
    if (!tokenString || tokenString.trim().length === 0) return;
    
    // Pause scanning while verifying
    isScanningRef.current = false;
    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/attendance/qr/verify-and-mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: tokenString.trim(),
          student_roll: studentInfo.roll || (typeof window !== 'undefined' ? (localStorage.getItem('student_roll') || undefined) : undefined)
        })
      });

      if (res && res.ok) {
        const data = await res.json();
        setVerifyResult({
          success: true,
          already_marked: data.already_marked,
          subject_name: data.subject_name,
          conducted_by: data.conducted_by,
          marked_at: data.marked_at,
          message: data.message
        });

        // Trigger campus notification event so dynamic island picks it up immediately
        window.dispatchEvent(new CustomEvent('campus-notification', {
          detail: {
            type: 'attendance_submission',
            title: data.already_marked ? 'Attendance Verified' : 'Attendance Marked Present!',
            detail: `${data.subject_name || 'Classroom Session'} • ${data.conducted_by || 'Faculty'}`,
            time: data.marked_at || 'Just now',
            badge: 'QR Verified'
          }
        }));
      } else {
        const err = await res?.json().catch(() => ({}));
        setVerifyResult({
          success: false,
          detail: err?.detail || 'Attendance verification failed. Token may be invalid.'
        });
      }
    } catch {
      setVerifyResult({
        success: false,
        detail: 'Network connection failed. Please ensure you are connected to the campus network.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetScan = () => {
    setVerifyResult(null);
    setManualToken('');
    isScanningRef.current = true;
  };

  return (
    <AppleDeluxeShell
      studentName={studentInfo.name}
      rollNumber={studentInfo.roll}
      semester={studentInfo.branch ? `Sem ${studentInfo.semester} • Sec ${studentInfo.section} • ${studentInfo.branch}` : 'Classroom Attendance Scanner'}
    >
      <div className="w-full max-w-2xl mx-auto space-y-6">
        
        {/* Top Navigation & Status Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-bold text-stone-500 hover:text-stone-900 transition bg-white px-3.5 py-2 rounded-2xl border border-stone-200/80 shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Anti-Proxy 10s Scanner</span>
            </span>
          </div>
        </div>

        {/* Verification Result Card (Success or Error Overlay) */}
        <AnimatePresence mode="wait">
          {verifyResult ? (
            <motion.div
              key="result-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`rounded-[32px] p-6 sm:p-8 border shadow-xl text-center space-y-5 backdrop-blur-xl ${
                verifyResult.success
                  ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-200 text-stone-900'
                  : 'bg-gradient-to-b from-rose-50/90 to-white border-rose-200 text-stone-900'
              }`}
            >
              <div className="mx-auto flex items-center justify-center">
                {verifyResult.success ? (
                  <div className="h-20 w-20 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-10 w-10 animate-bounce" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-3xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <XCircle className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {verifyResult.success 
                    ? (verifyResult.already_marked ? 'Already Checked In!' : 'Attendance Verified!') 
                    : 'Verification Unsuccessful'}
                </h2>
                <p className="text-xs text-stone-600 mt-1.5 font-medium max-w-md mx-auto">
                  {verifyResult.success
                    ? (verifyResult.message || `Presence officially recorded for ${verifyResult.subject_name}`)
                    : (verifyResult.detail || 'The QR token could not be verified.')}
                </p>
              </div>

              {verifyResult.success && (
                <div className="rounded-2xl bg-white p-4 border border-stone-200/80 shadow-2xs text-xs space-y-2.5 max-w-md mx-auto text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-stone-400 font-semibold flex items-center space-x-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-stone-500" />
                      <span>Subject / Lecture:</span>
                    </span>
                    <span className="font-extrabold text-stone-900 text-right">{verifyResult.subject_name || 'Core Session'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-stone-400 font-semibold flex items-center space-x-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-stone-500" />
                      <span>Faculty In-Charge:</span>
                    </span>
                    <span className="font-bold text-stone-800">{verifyResult.conducted_by || 'Faculty'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 font-semibold flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-stone-500" />
                      <span>Check-in Timestamp:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-700">{verifyResult.marked_at || 'Just now'}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Scan Another Class</span>
                </button>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center justify-center space-x-2"
                >
                  <span>Go to Attendance Dashboard</span>
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Active Camera Scanner Card */
            <motion.div
              key="scanner-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-[32px] bg-white border border-stone-200/80 p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* Header Info */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Real-Time Optical Reticle</span>
                </div>
                <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                  Scan Teacher's Dynamic QR
                </h1>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Point your camera at the rotating QR code displayed on the teacher's podium or screen.
                </p>
              </div>

              {/* Viewport Frame with Targeting Laser Line */}
              <div className="relative mx-auto w-full max-w-sm aspect-square rounded-[28px] overflow-hidden bg-stone-950 border-4 border-stone-900 shadow-2xl flex items-center justify-center">
                
                {/* Html5Qrcode video container mount */}
                <div 
                  id="student-qr-viewport" 
                  className="w-full h-full object-cover"
                />

                {/* Loading / Verifying Shimmer Overlay */}
                {isVerifying && (
                  <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-3 z-30">
                    <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
                    <span className="text-xs font-bold tracking-wider uppercase">Verifying Academic Match...</span>
                  </div>
                )}

                {/* Laser Scanning Animation Bar */}
                {!isVerifying && scannerActive && (
                  <motion.div
                    className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] pointer-events-none z-20"
                    animate={{ top: ['15%', '85%', '15%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Viewfinder Target Reticle Corners */}
                <div className="absolute inset-8 pointer-events-none z-10 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                  </div>
                </div>

                {/* Camera Error State */}
                {cameraError && (
                  <div className="absolute inset-0 bg-stone-900 p-6 flex flex-col items-center justify-center text-center space-y-3 z-30">
                    <Camera className="h-10 w-10 text-rose-400" />
                    <span className="text-sm font-bold text-white">Camera Access Required</span>
                    <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
                    >
                      Use Manual Input
                    </button>
                  </div>
                )}
              </div>

              {/* Systematic Validation Notice */}
              <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-stone-900 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Automatic Systematic Isolation:</span>
                </div>
                <p className="text-stone-500 leading-relaxed text-[11px]">
                  Attendance is verified against your registered department (<strong className="text-stone-800">{studentInfo.branch || 'Branch'}</strong>), Semester (<strong className="text-stone-800">{studentInfo.semester}</strong>), and Section (<strong className="text-stone-800">{studentInfo.section}</strong>). Scanning lectures outside your section will be rejected.
                </p>
              </div>

              {/* Optional Manual Token Section */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-stone-500 hover:text-stone-900 font-bold transition flex items-center space-x-1"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{showManualInput ? 'Hide Manual Token' : 'Enter QR Token String Directly'}</span>
                </button>
                <span className="text-[11px] text-stone-400">10s Expiry Guard</span>
              </div>

              {showManualInput && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <label className="block text-xs font-bold text-stone-700">
                    Paste Scanned JWT Token (Diagnostic Fallback):
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleProcessToken(manualToken)}
                      disabled={!manualToken || isVerifying}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs disabled:opacity-40"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Help Footer */}
        <div className="text-center text-[11px] text-stone-400 space-y-1">
          <p>🔒 University Cryptographic Token Service • Validated via SHA-256 JWT</p>
          <p>Tokens rotate every 10 seconds. Static screenshots will fail verification.</p>
        </div>
      </div>
    </AppleDeluxeShell>
  );
}
