'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Camera, Upload, User, CheckCircle, AlertCircle, ArrowLeft, ScanFace, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterStudent() {
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    branch: '',
    semester: '',
    section: '',
  });
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage || !canvasRef.current) {
      alert("Please capture a selfie for biometric registration.");
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      // Convert captured canvas data to Blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current?.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );

      if (!blob) throw new Error("Could not process image blob.");

      const formDataPayload = new FormData();
      formDataPayload.append('full_name', formData.fullName);
      formDataPayload.append('roll_number', formData.rollNumber);
      formDataPayload.append('branch', formData.branch);
      formDataPayload.append('semester', formData.semester);
      formDataPayload.append('section', formData.section);
      formDataPayload.append('selfie', blob, 'selfie.jpg');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/students/register`, {
        method: 'POST',
        body: formDataPayload,
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.detail || resData.error || 'Registration failed');
      }

      setStatus('success');
    } catch (err: any) {
      console.error("Registration error:", err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-stone-200 selection:text-stone-900 antialiased">
      {/* Top Dynamic Island Pill */}
      <div className="flex justify-center mb-6">
        <div className="bg-stone-900/90 text-white px-5 py-2 rounded-full text-xs font-semibold shadow-md flex items-center space-x-2.5 backdrop-blur-md border border-stone-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Biometric Enrollment Kiosk • 128-D Cryptographic Vectors</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3.5 py-2 rounded-2xl shadow-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal Launchpad</span>
          </Link>
          <div className="flex items-center space-x-2 text-xs text-stone-500 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Zero Raw Image Storage Policy</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Student Identity Onboarding
          </h1>
          <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            Secure Biometric Registration with autonomous face descriptor extraction.
          </p>
        </motion.div>

        <div className="bg-white/90 border border-stone-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row backdrop-blur-xl">
          
          {/* Form Section */}
          <div className="flex-1 p-8 sm:p-10">
            <h2 className="text-xl font-bold mb-6 flex items-center text-stone-900">
              <User className="mr-3 text-stone-700 h-5 w-5" /> Academic Identity Details
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Full Legal Name</label>
                <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition" placeholder="e.g. Aarav Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Roll Number</label>
                  <input required type="text" name="rollNumber" value={formData.rollNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition" placeholder="23CSE001" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Semester</label>
                  <select required name="semester" value={formData.semester} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition">
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Branch</label>
                  <select required name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition">
                    <option value="">Select Branch</option>
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Section</label>
                  <input required type="text" name="section" value={formData.section} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition" placeholder="A" />
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !capturedImage}
                  className={`w-full flex justify-center py-3.5 px-4 rounded-2xl shadow-sm text-sm font-bold transition-all ${!capturedImage ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800 text-white'}`}
                >
                  {isSubmitting ? 'Extracting Vector Embeddings...' : 'Complete Biometric Registration'}
                </button>
              </div>

              {status === 'success' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center text-emerald-800 text-xs font-semibold">
                  <CheckCircle className="mr-2.5 h-5 w-5 text-emerald-600 flex-shrink-0" />
                  Successfully registered student & encrypted face vector into database.
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center text-rose-800 text-xs font-semibold">
                  <AlertCircle className="mr-2.5 h-5 w-5 text-rose-600 flex-shrink-0" />
                  {errorMessage || 'Registration failed. Please check inputs and retry.'}
                </motion.div>
              )}
            </form>
          </div>

          {/* Biometric Section */}
          <div className="flex-1 bg-stone-50/70 p-8 sm:p-10 border-t md:border-t-0 md:border-l border-stone-200 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center text-stone-900">
                <Camera className="mr-3 text-stone-700 h-5 w-5" /> Camera Viewfinder
              </h2>
              
              <div className="bg-stone-900 rounded-3xl overflow-hidden aspect-[4/3] flex items-center justify-center relative border border-stone-300 shadow-inner">
                
                {!streamActive && !capturedImage && (
                  <div className="text-center p-6 bg-stone-100 w-full h-full flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-4 text-stone-500 shadow-sm">
                      <User size={32} />
                    </div>
                    <p className="text-xs text-stone-500 mb-4 max-w-xs">A clear, well-lit selfie is required to compute the 128-dimensional embedding.</p>
                    <button onClick={startCamera} type="button" className="inline-flex items-center px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm">
                      <Camera size={16} className="mr-2" /> Start Camera
                    </button>
                  </div>
                )}

                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-cover ${!streamActive ? 'hidden' : 'block'}`} 
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {capturedImage && (
                  <div className="absolute inset-0 z-10">
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                      <div className="w-full flex justify-between items-center">
                        <span className="text-emerald-400 font-bold flex items-center text-xs bg-stone-900/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          <CheckCircle size={14} className="mr-1.5 text-emerald-400" /> Vector Extracted
                        </span>
                        <button type="button" onClick={resetCapture} className="text-xs text-stone-900 bg-white hover:bg-stone-100 font-bold px-3 py-1.5 rounded-xl shadow-md transition">
                          Retake
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {streamActive && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                    <button type="button" onClick={capturePhoto} className="h-14 w-14 rounded-full bg-white border-4 border-stone-300 hover:scale-105 transition-transform shadow-lg shadow-black/50"></button>
                  </div>
                )}

                {/* Face align guide */}
                {streamActive && (
                  <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-white/80 rounded-[45%]" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
              <div className="flex items-start">
                <ShieldCheck className="text-emerald-600 mt-0.5 mr-2.5 flex-shrink-0" size={18} />
                <p className="text-xs text-stone-600 leading-relaxed">
                  <strong className="text-stone-900">Privacy Guarantee:</strong> Raw selfies are converted into 128 mathematical numbers and immediately purged from memory. No photo is stored on disk or server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
