'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Camera, Upload, User, CheckCircle2, AlertCircle, RefreshCw, ScanFace, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

export default function StudentEnrollment() {
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    branch: 'Computer Science',
    semester: '6',
    section: 'A',
  });
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
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

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();

      const form = new FormData();
      form.append('full_name', formData.fullName);
      form.append('roll_number', formData.rollNumber);
      form.append('branch', formData.branch);
      form.append('semester', formData.semester);
      form.append('section', formData.section);
      form.append('selfie', blob, 'selfie.jpg');

      const response = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Registration failed. Ensure face is clearly visible.");
      }

      // Auto-authenticate student so they can navigate directly to the dashboard
      try {
        const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.rollNumber, password: 'StudentPass123!' })
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
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during facial vector extraction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300/60 text-stone-800 text-xs font-semibold">
          <ScanFace className="h-3.5 w-3.5 text-stone-700" />
          <span>Biometric Self-Onboarding</span>
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Student Face Enrollment</h1>
        <p className="text-xs text-stone-500 max-w-xl mx-auto">
          Create your unique 128-d biometric attendance signature. Raw selfie photos are destroyed from memory immediately after vector extraction.
        </p>
      </div>

      {status === 'success' ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[2.5rem] bg-white/80 border border-stone-200/80 p-10 text-center space-y-6 backdrop-blur-xl shadow-sm"
        >
          <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-stone-900">Enrollment Successfully Completed!</h2>
            <p className="text-stone-500 text-xs max-w-md mx-auto">
              Your biometric face profile for <strong>{formData.rollNumber}</strong> is active. You can now mark walk-up attendance in all lecture halls and practical labs.
            </p>
          </div>

          {/* Credentials Card */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-left space-y-2">
            <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">Your Login Credentials</div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Roll Number / ID:</span>
              <span className="font-mono font-bold text-stone-900">{formData.rollNumber}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Password:</span>
              <span className="font-mono font-semibold text-stone-900">StudentPass123!</span>
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
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
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
                  required
                  placeholder="e.g. Aarav Sharma"
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
                  required
                  placeholder="e.g. 23CSE001"
                  value={formData.rollNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Branch
                  </label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-stone-400 transition"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Tech">Information Tech</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Section
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/80 text-stone-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-stone-400 transition"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
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
              <span>{isSubmitting ? 'Verifying Liveness & Enrolling...' : 'Confirm & Complete Enrollment'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
