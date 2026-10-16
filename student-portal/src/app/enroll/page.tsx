'use client';

import AppleSelect from '@/components/AppleSelect';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Camera, Upload, User, CheckCircle2, AlertCircle, RefreshCw, ScanFace, ArrowRight, ShieldCheck, Building2, BookOpen, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

export default function StudentEnrollment() {
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    branch: '',
    semester: '1',
    section: 'A',
  });
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [availableSections, setAvailableSections] = useState<string[]>(['A', 'B', 'C', 'D']);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const sName = localStorage.getItem('student_name');
      const sRoll = localStorage.getItem('student_roll');
      if (sName || sRoll) {
        setFormData(prev => ({
          ...prev,
          fullName: sName || prev.fullName,
          rollNumber: sRoll || prev.rollNumber
        }));
      }
    }

    fetch(`${API_BASE_URL}/attendance/departments-meta`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            setAvailableBranches(data.branches);
            setFormData(prev => ({
              ...prev,
              branch: prev.branch || data.branches[0]
            }));
          }
          if (Array.isArray(data.semesters) && data.semesters.length > 0) {
            setAvailableSemesters(data.semesters);
          }
          if (Array.isArray(data.sections) && data.sections.length > 0) {
            setAvailableSections(data.sections);
          }
        }
      })
      .catch(() => {});
  }, []);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera. Please grant browser camera permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setStreamActive(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage) {
      alert("Please capture your face photo before submitting.");
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage(null);
    setIsDuplicate(false);

    if (formData.password && formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();

      const form = new FormData();
      form.append('full_name', formData.fullName.trim());
      form.append('roll_number', formData.rollNumber.trim().toUpperCase());
      form.append('branch', formData.branch);
      form.append('semester', formData.semester);
      form.append('section', formData.section);
      if (formData.email?.trim()) form.append('email', formData.email.trim().toLowerCase());
      if (formData.password?.trim()) form.append('password', formData.password.trim());
      form.append('selfie', blob, 'selfie.jpg');

      const response = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Registration failed." }));
        const detailMsg = errData.detail || "Registration failed. Ensure face is clearly visible.";
        if (detailMsg.toLowerCase().includes('already registered')) {
          setIsDuplicate(true);
        }
        throw new Error(detailMsg);
      }

      const createdStudent = await response.json();

      // Store student details locally for instant seamless experience
      if (typeof window !== 'undefined') {
        localStorage.setItem('student_name', createdStudent.full_name || formData.fullName);
        localStorage.setItem('student_roll', createdStudent.roll_number || formData.rollNumber);
        localStorage.setItem('student_branch', createdStudent.branch || formData.branch);
        if (formData.email?.trim()) localStorage.setItem('student_email', formData.email.trim().toLowerCase());
      }

      // Auto-authenticate student so they can navigate directly to the dashboard
      try {
        const loginIdentifier = formData.email?.trim().toLowerCase() || formData.rollNumber.trim().toUpperCase();
        const loginPwd = formData.password?.trim() || formData.rollNumber.trim().toUpperCase();
        const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginIdentifier, password: loginPwd })
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (typeof window !== 'undefined') {
            localStorage.setItem('student_token', loginData.access_token);
          }
        }
      } catch {
        // Graceful fallback
      }

      setStatus('success');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus-notification', {
          detail: {
            type: 'enrollment_alert',
            title: 'Face ID Biometrics Active',
            detail: `128-d face embedding enrolled for ${formData.fullName || 'Student'} (${formData.rollNumber.toUpperCase()}) in ${formData.branch} (Sem ${formData.semester})`,
            time: 'Just now',
            badge: 'Active'
          }
        }));
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during facial vector extraction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppleDeluxeShell studentName={formData.fullName || 'Student'} rollNumber={formData.rollNumber || 'ROLL-NEW'}>
      <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300/60 text-stone-800 text-xs font-semibold">
          <ScanFace className="h-3.5 w-3.5 text-stone-700" />
          <span>Biometric Self-Onboarding</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Student Face Enrollment</h1>
        <p className="text-xs text-stone-500 max-w-xl mx-auto">
          Self-register directly into the college database. Categorized automatically by department, semester, and section.
        </p>
      </div>

      {status === 'success' ? (
        <motion.div 
          className="rounded-[2.5rem] bg-white/80 border border-stone-200/80 p-10 text-center space-y-6 backdrop-blur-xl shadow-sm"
        >
          <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-stone-900">Enrollment Successfully Completed!</h2>
            <p className="text-stone-500 text-xs max-w-md mx-auto">
              Your biometric face profile for <strong>{formData.rollNumber.toUpperCase()}</strong> is directly registered in the database under <strong>{formData.branch} (Semester {formData.semester} - Section {formData.section})</strong>.
            </p>
          </div>

          {/* Credentials Card */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-left space-y-2">
            <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Your Official Login Credentials</div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Full Name:</span>
              <span className="font-semibold text-stone-900">{formData.fullName}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Roll Number / ID:</span>
              <span className="font-mono font-bold text-stone-900">{formData.rollNumber.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Department & Class:</span>
              <span className="font-semibold text-stone-800">{formData.branch} (Sem {formData.semester}, Sec {formData.section})</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Default Password:</span>
              <span className="font-mono font-semibold text-stone-900">Provided upon registration</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-sm transition flex items-center space-x-2"
            >
              <span>Go to Attendance Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form Column */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-8 backdrop-blur-xl space-y-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <User className="h-4 w-4 text-stone-700" />
              <span>Academic Details</span>
            </h2>

            {status === 'error' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-950">Registration Notice</p>
                    <p className="text-rose-800 leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                {isDuplicate && (
                  <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-rose-700">Already have an institutional account?</span>
                    <Link
                      href="/login"
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <LogIn className="h-3 w-3" />
                      <span>Sign In Now</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} id="enroll-form" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  id="fullName"
                  autoComplete="name"
                  required
                  placeholder="e.g. Student Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  University Roll Number
                </label>
                <input
                  type="text"
                  name="rollNumber"
                  id="rollNumber"
                  autoComplete="username"
                  required
                  placeholder="e.g. University Roll Number"
                  value={formData.rollNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition font-mono uppercase"
                />
              </div>

              {/* Department / Branch */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Department / Branch
                </label>
                <AppleSelect
                  value={formData.branch}
                  onChange={(val) => setFormData(prev => ({ ...prev, branch: val }))}
                  options={availableBranches.map((b) => ({
                    value: b,
                    label: b,
                    badge: b.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()
                  }))}
                />
              </div>

              {/* Semester & Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Class / Semester
                  </label>
                  <AppleSelect
                    value={formData.semester}
                    onChange={(val) => setFormData(prev => ({ ...prev, semester: val }))}
                    options={availableSemesters.map((s) => ({
                      value: String(s),
                      label: `Semester ${s}`,
                      badge: `Sem ${s}`
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Section
                  </label>
                  <AppleSelect
                    value={formData.section}
                    onChange={(val) => setFormData(prev => ({ ...prev, section: val }))}
                    options={availableSections.map((sec) => ({
                      value: sec,
                      label: `Section ${sec}`,
                      badge: `Sec ${sec}`
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Institutional Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  placeholder="e.g. student@university.edu"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Create Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    autoComplete="new-password"
                    placeholder="Custom login password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Camera Viewfinder Column */}
          <div className="rounded-3xl bg-white/80 border border-stone-200/80 p-8 backdrop-blur-xl space-y-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Camera className="h-4 w-4 text-stone-700" />
              <span>Facial Biometric Viewport</span>
            </h2>

            <div className="relative aspect-video rounded-3xl bg-stone-900 overflow-hidden border border-stone-800 flex items-center justify-center">
              {capturedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`} 
                  />
                  {!streamActive && (
                    <div className="text-center p-6 space-y-3">
                      <ScanFace className="h-10 w-10 text-stone-500 mx-auto" />
                      <p className="text-xs text-stone-400">Camera is idle. Click below to start live stream.</p>
                    </div>
                  )}
                  {streamActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-40 h-52 border-2 border-dashed border-emerald-400/90 rounded-[45px] animate-pulse" />
                    </div>
                  )}
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              {!streamActive && !capturedImage && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2.5 px-4 rounded-2xl font-medium text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center justify-center space-x-2 border border-stone-200/80 shadow-xs"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start Camera</span>
                </button>
              )}

              {streamActive && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-full py-2.5 px-4 rounded-2xl font-medium text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition flex items-center justify-center space-x-2"
                >
                  <ScanFace className="h-4 w-4" />
                  <span>Capture & Analyze Face</span>
                </button>
              )}

              {capturedImage && (
                <button
                  type="button"
                  onClick={resetCapture}
                  className="w-full py-2.5 px-4 rounded-2xl font-medium text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center justify-center space-x-2 border border-stone-200/80 shadow-xs"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retake Photo</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              form="enroll-form"
              disabled={isSubmitting || !capturedImage}
              className="w-full py-3 px-4 rounded-2xl font-semibold text-xs bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Verifying Liveness & Saving to Database...' : 'Register Directly into College Database'}</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </AppleDeluxeShell>
  );
}
