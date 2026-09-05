'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, User, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Student Onboarding
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Secure Biometric Registration & Identity Profiling
          </p>
        </motion.div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Form Section */}
          <div className="flex-1 p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <User className="mr-3 text-indigo-400" /> Identity Details
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300">Full Legal Name</label>
                <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3" placeholder="e.g. Aarav Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Roll Number</label>
                  <input required type="text" name="rollNumber" value={formData.rollNumber} onChange={handleInputChange} className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3" placeholder="23CSE001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Semester</label>
                  <select required name="semester" value={formData.semester} onChange={handleInputChange} className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3">
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Branch</label>
                  <select required name="branch" value={formData.branch} onChange={handleInputChange} className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3">
                    <option value="">Select</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Section</label>
                  <input required type="text" name="section" value={formData.section} onChange={handleInputChange} className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3" placeholder="A" />
                </div>
              </div>
              
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !capturedImage}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all ${!capturedImage ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500'}`}
                >
                  {isSubmitting ? 'Processing Biometrics...' : 'Complete Registration'}
                </button>
              </div>

              {status === 'success' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-emerald-900/30 border border-emerald-800 rounded-lg flex items-center text-emerald-400">
                  <CheckCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                  Successfully registered student & encrypted face vector.
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-rose-900/30 border border-rose-800 rounded-lg flex items-center text-rose-400">
                  <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                  {errorMessage || 'Registration failed. Please check inputs and retry.'}
                </motion.div>
              )}
            </form>
          </div>

          {/* Biometric Section */}
          <div className="flex-1 bg-slate-800/50 p-8 border-t md:border-t-0 md:border-l border-slate-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Camera className="mr-3 text-blue-400" /> Biometric Capture
            </h2>
            
            <div className="bg-slate-900 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center relative border-2 border-dashed border-slate-700">
              
              {!streamActive && !capturedImage && (
                <div className="text-center p-6">
                  <div className="mx-auto h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <User size={32} />
                  </div>
                  <p className="text-sm text-slate-400 mb-4">A clear, well-lit selfie is required to extract the 128-d face vector.</p>
                  <button onClick={startCamera} type="button" className="inline-flex items-center px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors">
                    <Camera size={18} className="mr-2" /> Start Camera
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                    <div className="w-full flex justify-between items-center">
                      <span className="text-emerald-400 font-medium flex items-center text-sm">
                        <CheckCircle size={16} className="mr-1" /> Vector Extracted
                      </span>
                      <button type="button" onClick={resetCapture} className="text-sm text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors">
                        Retake
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {streamActive && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                  <button type="button" onClick={capturePhoto} className="h-14 w-14 rounded-full bg-white border-4 border-slate-300 hover:scale-105 transition-transform shadow-lg shadow-black/50"></button>
                </div>
              )}

              {/* Grid Overlay to look technical */}
              {streamActive && (
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-500"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    {/* Face align guide */}
                    <ellipse cx="50%" cy="50%" rx="30%" ry="45%" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" className="text-blue-400" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <div className="flex items-start">
                <AlertCircle className="text-amber-400 mt-0.5 mr-2 flex-shrink-0" size={18} />
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Privacy Guarantee:</strong> Your raw photo is analyzed in real-time to extract a cryptographic facial embedding and is <span className="text-white">instantly purged</span> from our servers. Only the mathematical vector is stored in the cloud database.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
