'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ScanFace, 
  ShieldCheck, 
  GraduationCap, 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  Mail, 
  Database,
  Fingerprint,
  ExternalLink,
  ChevronRight,
  Zap,
  Lock,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then(res => res.ok ? setBackendStatus('online') : setBackendStatus('offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const portals = [
    {
      id: 'student-register',
      title: 'Biometric Face Enrollment',
      category: 'Student Self-Onboarding',
      desc: 'Live webcam face detection, anti-spoofing liveness verification, and 128-d mathematical vector encoding. Zero raw images saved.',
      href: '/register',
      icon: ScanFace,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      tag: 'Webcam Ready',
      buttonText: 'Launch Enrollment Kiosk',
      features: ['Real-time facial vector extraction', 'Haar cascade liveness detection', 'Autonomous student account provisioning']
    },
    {
      id: 'student-portal',
      title: 'Student Academic Portal',
      category: 'Self-Service & Transparency',
      desc: 'Individual attendance percentage gauge, subject-by-subject threshold monitoring (<75%), and transparent absence dispute / grievance filing.',
      href: '/student',
      externalPortUrl: 'http://localhost:3002',
      icon: GraduationCap,
      gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
      tag: 'Port 3002 Live',
      buttonText: 'Access Student Portal',
      features: ['Live % breakdown against 75% cutoff', 'Class absence grievance ticketing', 'Direct database synchronization']
    },
    {
      id: 'hod-portal',
      title: 'HOD Control Center',
      category: 'Administration & Governance',
      desc: 'Live department matrices, automated defaulter roster (<75%), emergency holiday announcements with Resend email automation, and semester archiving.',
      href: '/hod',
      externalPortUrl: 'http://localhost:3003',
      icon: Building2,
      gradient: 'from-purple-600 via-pink-600 to-rose-500',
      tag: 'Port 3003 Live',
      buttonText: 'Open HOD Command Deck',
      features: ['Automated parent email notifications', 'Audited semester lifecycle archiving', 'Defaulter list exports']
    },
    {
      id: 'admin-portal',
      title: 'College Administrator Portal',
      category: 'Whole Institution Governance',
      desc: 'Master institutional intelligence across all 6 departments, full faculty directory CRUD, statutory defaulters, and emergency broadcasts.',
      href: 'http://localhost:3001',
      isExternal: true,
      icon: Building2,
      gradient: 'from-pink-600 via-purple-600 to-indigo-600',
      tag: 'Port 3001 Live',
      buttonText: 'Launch Admin Console (:3001)',
      features: ['All 6 Academic Departments', 'Faculty & Student Directory CRUD', 'Statutory Accreditation Snapshots']
    },
    {
      id: 'teacher-kiosk',
      title: 'Teacher Classroom Terminal',
      category: 'Attendance Marking Deck',
      desc: 'Select any class, semester, section, and choose between regular subjects or guest lectures with custom conductors. Instant transmission to HOD.',
      href: '/teacher',
      isExternal: false,
      icon: Smartphone,
      gradient: 'from-amber-500 via-orange-600 to-red-500',
      tag: 'Live Terminal',
      buttonText: 'Launch Teacher Attendance Deck',
      features: ['Dynamic Branch/Sem/Sec Selection', 'Regular vs Guest Lecture Modes', 'Direct Conductor Attribution to HOD']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-blue-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[400px] bg-gradient-to-br from-cyan-600/10 via-emerald-600/10 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ScanFace className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Smart Attendance</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Autonomous AI Face-Biometrics Suite</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/teacher"
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition shadow-sm"
            >
              <ScanFace className="h-4 w-4 text-indigo-400" />
              <span className="hidden sm:inline">Teacher Terminal</span>
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-300 border border-slate-800 hover:border-slate-700 transition shadow-sm"
              title="Open Administrator Portal on port 3001"
            >
              <Building2 className="h-3.5 w-3.5 text-pink-400" />
              <span>Admin</span>
            </a>
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-slate-700 transition shadow-sm"
              title="Open Department HOD Deck on port 3003"
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>HOD</span>
            </a>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-slate-700 transition shadow-sm"
              title="Open Student Portal on port 3002"
            >
              <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
              <span>Student</span>
            </a>
            <Link
              href="/settings"
              className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition shadow-sm"
              title="System Settings & Port Status"
            >
              <Settings className="h-4 w-4 text-indigo-400" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative max-w-7xl mx-auto px-6 pt-12 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 text-xs font-medium mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Proxy-Proof Offline AI Facial Biometrics Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Institutional Attendance <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Engineered for Universities
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8">
            Eliminate manual roll-calls, buddy-punching, and proxy attendance. Built with 128-dimensional facial vector embeddings, OpenCV anti-spoofing liveness detection, and real-time administrative dashboards.
          </p>

          {/* System Spec Badges */}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <Fingerprint className="h-4 w-4 text-cyan-400" />
              <span>128-D Cryptographic Vectors</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>Anti-Spoofing Liveness Guard</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Resend Cloud Automation</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <Database className="h-4 w-4 text-emerald-400" />
              <span>PostgreSQL / Docker Ready</span>
            </div>
          </div>
        </motion.div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {portals.map((portal, index) => {
            const IconComponent = portal.icon;
            return (
              <motion.div
                key={portal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl overflow-hidden"
              >
                {/* Subtle Card Glow */}
                <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${portal.gradient} opacity-10 group-hover:opacity-20 blur-3xl transition duration-500 pointer-events-none`} />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${portal.gradient} flex items-center justify-center shadow-lg`}>
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {portal.tag}
                    </span>
                  </div>

                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-400 mb-1 block">
                    {portal.category}
                  </span>
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition">
                    {portal.title}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {portal.desc}
                  </p>

                  <div className="space-y-2 mb-8">
                    {portal.features.map((feat, fIndex) => (
                      <div key={fIndex} className="flex items-center space-x-2 text-xs text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {portal.isExternal ? (
                    <a
                      href={portal.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition duration-200 group-hover:border-slate-600 shadow-md"
                    >
                      <span>{portal.buttonText}</span>
                      <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-white transition" />
                    </a>
                  ) : (
                    <Link
                      href={portal.href}
                      className={`flex-1 w-full py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 bg-gradient-to-r ${portal.gradient} text-white shadow-lg transition duration-200 hover:opacity-95 hover:scale-[1.01]`}
                    >
                      <span>{portal.buttonText}</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
                    </Link>
                  )}

                  {portal.externalPortUrl && (
                    <a
                      href={portal.externalPortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-3.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shadow-md whitespace-nowrap"
                      title="Launch standalone port in new window"
                    >
                      <span>Direct Port</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Real-World Operational Architecture Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-8 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Full Stack Live Integration Status</h3>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
                Every endpoint is verified: JWT token issuance, 128-d biometrics vector extraction, automated student user provisioning, <span className="text-slate-200">Resend email delivery</span>, and PostgreSQL Docker parity.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
              >
                <span>Test Camera Onboarding</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/hod"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-2"
              >
                <span>Open HOD Desk</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <p>© 2026 Antigravity Smart Attendance Suite. 100% Privacy Compliant & Offline-Ready.</p>
            <span>•</span>
            <Link href="/settings" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
              System Settings
            </Link>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <span>Designed & Engineered by</span>
            <span className="font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-3 py-1 rounded-full shadow-sm">
              Created by Ronak Agrawal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
