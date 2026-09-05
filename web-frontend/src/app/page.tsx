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
  Settings,
  Search
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
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/60',
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
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
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
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200/60',
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
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200/60',
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
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      tag: 'Live Terminal',
      buttonText: 'Launch Teacher Attendance Deck',
      features: ['Dynamic Branch/Sem/Sec Selection', 'Regular vs Guest Lecture Modes', 'Direct Conductor Attribution to HOD']
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 font-sans selection:bg-stone-200 selection:text-stone-900 antialiased">
      {/* Dynamic Island Banner */}
      <div className="pt-3 px-4 flex justify-center sticky top-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-stone-900/90 hover:bg-stone-900 text-white px-5 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xl border border-stone-800 flex items-center space-x-3 transition-all">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide">Apex University Biometric Grid: All 4 Portals Synchronized • AI Liveness Active</span>
          <span className="text-[10px] bg-stone-800 px-2 py-0.5 rounded-full text-stone-300 font-mono">
            {backendStatus === 'online' ? 'BACKEND ONLINE' : backendStatus === 'checking' ? 'SYNCING' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-12 z-40 backdrop-blur-xl bg-white/70 border-b border-stone-200/70 px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-md shadow-stone-900/10">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-stone-900">Smart Attendance</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Enterprise Deluxe
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">Autonomous AI Face-Biometrics Suite</p>
            </div>
          </div>

          {/* Spotlight Search Pill */}
          <div className="hidden lg:flex items-center space-x-2 bg-stone-100/90 text-stone-500 px-3.5 py-1.5 rounded-full text-xs border border-stone-200/80 shadow-inner w-64">
            <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-400">Search portals, classes, rosters...</span>
            <kbd className="ml-auto font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-stone-200 text-stone-500">⌘K</kbd>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/teacher"
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 transition shadow-sm"
            >
              <ScanFace className="h-4 w-4 text-stone-600" />
              <span className="hidden sm:inline">Teacher Terminal</span>
            </Link>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition shadow-sm"
              title="Open Administrator Portal on port 3001"
            >
              <Building2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Admin</span>
            </a>
            <a
              href="http://localhost:3003"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition shadow-sm"
              title="Open Department HOD Deck on port 3003"
            >
              <Building2 className="h-3.5 w-3.5 text-purple-600" />
              <span>HOD</span>
            </a>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition shadow-sm"
              title="Open Student Portal on port 3002"
            >
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
              <span>Student</span>
            </a>
            <Link
              href="/settings"
              className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 transition shadow-sm"
              title="System Settings & Port Status"
            >
              <Settings className="h-4 w-4 text-stone-500" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative max-w-7xl mx-auto px-6 pt-10 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 text-xs font-medium mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Proxy-Proof Offline AI Facial Biometrics Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 mb-6 leading-[1.1]">
            Institutional Attendance <br />
            <span className="text-stone-500 font-semibold">
              Engineered for Universities
            </span>
          </h1>

          <p className="text-stone-600 text-base sm:text-lg leading-relaxed mb-8">
            Eliminate manual roll-calls, buddy-punching, and proxy attendance. Built with 128-dimensional facial vector embeddings, OpenCV anti-spoofing liveness detection, and real-time administrative dashboards.
          </p>

          {/* System Spec Badges */}
          <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-700 font-medium">
            <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
              <Fingerprint className="h-4 w-4 text-blue-600" />
              <span>128-D Cryptographic Vectors</span>
            </div>
            <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Anti-Spoofing Liveness Guard</span>
            </div>
            <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
              <Mail className="h-4 w-4 text-purple-600" />
              <span>Resend Cloud Automation</span>
            </div>
            <div className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
              <Database className="h-4 w-4 text-emerald-600" />
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
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group relative rounded-3xl bg-white/85 border border-stone-200/80 hover:border-stone-300 p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl shadow-sm backdrop-blur-xl overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`h-14 w-14 rounded-2xl ${portal.iconBg} flex items-center justify-center shadow-sm`}>
                      <IconComponent className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      {portal.tag}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400 mb-1 block">
                    {portal.category}
                  </span>
                  <h2 className="text-2xl font-bold text-stone-900 mb-3 group-hover:text-stone-700 transition">
                    {portal.title}
                  </h2>
                  <p className="text-stone-600 text-sm leading-relaxed mb-6">
                    {portal.desc}
                  </p>

                  <div className="space-y-2.5 mb-8">
                    {portal.features.map((feat, fIndex) => (
                      <div key={fIndex} className="flex items-center space-x-2 text-xs text-stone-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 border-t border-stone-100">
                  {portal.isExternal ? (
                    <a
                      href={portal.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 bg-stone-900 hover:bg-stone-800 text-white transition duration-200 shadow-sm"
                    >
                      <span>{portal.buttonText}</span>
                      <ExternalLink className="h-4 w-4 text-stone-300 group-hover:text-white transition" />
                    </a>
                  ) : (
                    <Link
                      href={portal.href}
                      className="flex-1 w-full py-3 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition duration-200 hover:scale-[1.01]"
                    >
                      <span>{portal.buttonText}</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition text-stone-300" />
                    </Link>
                  )}

                  {portal.externalPortUrl && (
                    <a
                      href={portal.externalPortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center space-x-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 transition shadow-sm whitespace-nowrap"
                      title="Launch standalone port in new window"
                    >
                      <span>Direct Port</span>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Real-World Operational Architecture Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-stone-100 via-white to-stone-100 border border-stone-200/80 p-8 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-stone-900">Full Stack Live Integration Status</h3>
              </div>
              <p className="text-stone-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Every endpoint is verified: JWT token issuance, 128-d biometrics vector extraction, automated student user provisioning, <span className="font-semibold text-stone-800">Resend email delivery</span>, and PostgreSQL Docker parity.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-2"
              >
                <span>Test Camera Onboarding</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/hod"
                className="px-5 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 transition flex items-center space-x-2 shadow-sm"
              >
                <span>Open HOD Desk</span>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/60 py-8 px-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <p>© 2026 Antigravity Smart Attendance Suite. 100% Privacy Compliant & Offline-Ready.</p>
            <span>•</span>
            <Link href="/settings" className="text-stone-700 hover:text-stone-900 font-semibold transition">
              System Settings
            </Link>
          </div>
          <div className="flex items-center space-x-2 text-stone-500 text-xs">
            <span>Designed & Engineered by</span>
            <span className="font-bold text-stone-800 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full shadow-sm">
              Created by Ronak Agrawal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
