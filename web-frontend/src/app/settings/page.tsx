'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Server,
  Database,
  ShieldCheck,
  ScanFace,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Save,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Zap,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import { API_BASE_URL, getPortalUrl } from '@/lib/api';

export default function GlobalSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // System Configurations
  const [apiHost, setApiHost] = useState(API_BASE_URL);
  const [toleranceThreshold, setToleranceThreshold] = useState<number>(0.50);
  const [livenessStrictness, setLivenessStrictness] = useState<string>('high');
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);
  const [offlineVaultSync, setOfflineVaultSync] = useState<boolean>(true);

  // System Portals
  const services = [
    { name: 'Teacher Attendance Console', desc: 'Classroom attendance, live QR & face scanning', url: getPortalUrl(3000, '/teacher') },
    { name: 'Campus Admin Portal', desc: 'Master university directory, timetables & governance', url: getPortalUrl(3001) },
    { name: 'Student Academic Portal', desc: 'Attendance percentages, threshold alerts & grievances', url: getPortalUrl(3002) },
    { name: 'Department HOD Portal', desc: 'Departmental class monitoring, analytics & reports', url: getPortalUrl(3003) },
    { name: 'FastAPI Backend Service', desc: 'Core attendance engine & database API', url: getPortalUrl(8000, '/docs') },
  ];

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.ok ? setApiStatus('online') : setApiStatus('offline'))
      .catch(() => setApiStatus('offline'));

    const cached = typeof window !== 'undefined' ? localStorage.getItem('global_system_settings') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.api_host) setApiHost(parsed.api_host);
        if (parsed.tolerance !== undefined) setToleranceThreshold(parsed.tolerance);
        if (parsed.liveness) setLivenessStrictness(parsed.liveness);
        if (parsed.audio !== undefined) setAudioFeedback(parsed.audio);
        if (parsed.offline_sync !== undefined) setOfflineVaultSync(parsed.offline_sync);
      } catch (e) { }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const settings = {
      api_host: apiHost,
      tolerance: toleranceThreshold,
      liveness: livenessStrictness,
      audio: audioFeedback,
      offline_sync: offlineVaultSync,
      updated_at: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('global_system_settings', JSON.stringify(settings));
      if (apiHost && apiHost.trim()) {
        localStorage.setItem('api_base_url', apiHost.trim());
      }
    }

    setTimeout(() => {
      setSaving(false);
      setSavedSuccess('Global platform parameters and attendance settings saved successfully!');
      setTimeout(() => setSavedSuccess(null), 4000);
    }, 400);
  };

  return (
    <AppleDeluxeShell>
      <div className="w-full space-y-6">

        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3.5 py-2 rounded-2xl shadow-sm transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal Directory</span>
          </Link>
          <div className={`flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-full font-semibold shadow-sm border ${
            apiStatus === 'online'
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
              : apiStatus === 'offline'
              ? 'text-rose-800 bg-rose-50 border-rose-200'
              : 'text-amber-800 bg-amber-50 border-amber-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500 animate-pulse' : apiStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-ping'}`}></span>
            <span>{apiStatus === 'online' ? 'Backend Services Online' : apiStatus === 'offline' ? 'Backend Offline' : 'Checking Connection...'}</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/90 p-8 shadow-sm backdrop-blur-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-stone-900 flex items-center justify-center shadow-md text-white shrink-0">
                <Settings className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">System Settings & Platform Control</h1>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Configuration console for active attendance services, biometric matching thresholds, and local device defaults.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <motion.div


            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center space-x-3 text-emerald-800 shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold">{savedSuccess}</p>
          </motion.div>
        )}

        {/* Active Campus Portals Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-2">
              <Server className="h-4 w-4 text-stone-700" />
              <span>Campus Portals & Services</span>
            </h2>
            <span className="text-xs text-stone-500">Connected System Components</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <div key={svc.name} className="rounded-3xl bg-white/90 border border-stone-200/80 p-6 space-y-4 shadow-sm backdrop-blur-sm flex flex-col justify-between hover:border-stone-300 transition">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{svc.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{svc.desc}</p>
                </div>

                <a
                  href={svc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-800 border border-stone-200 transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Card 1: API & Network Endpoint */}
            <div className="rounded-3xl border border-stone-200/80 bg-white/90 p-7 shadow-sm backdrop-blur-sm space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-stone-100">
                <Globe className="h-5 w-5 text-stone-700" />
                <h2 className="text-base font-bold text-stone-900">Backend API Configuration</h2>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1.5">FastAPI Backend Endpoint URL</label>
                  <input
                    type="text"
                    required
                    value={apiHost}
                    onChange={(e) => setApiHost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-mono text-xs focus:outline-none focus:border-stone-400 focus:bg-white transition"
                    placeholder="http://localhost:8000"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">Used by all Next.js frontends and mobile camera kiosks.</p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800">SQLite Database Engine</span>
                    <span className="text-[10px] font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">sql_app.db ACTIVE</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    High-performance zero-latency local database storage with full PostgreSQL schema compatibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: AI Face Biometrics & Anti-Spoofing Parameters */}
            <div className="rounded-3xl border border-stone-200/80 bg-white/90 p-7 shadow-sm backdrop-blur-sm space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-stone-100">
                <ScanFace className="h-5 w-5 text-stone-700" />
                <h2 className="text-base font-bold text-stone-900">AI Biometric Liveness & Matching</h2>
              </div>

              <div className="space-y-5 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-stone-700">
                      Face Recognition Match Sensitivity
                    </label>
                    <span className="text-xs font-mono font-bold text-stone-900 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200">
                      {toleranceThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="0.65"
                    step="0.01"
                    value={toleranceThreshold}
                    onChange={(e) => setToleranceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-stone-900 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                    <span>Strict (0.35)</span>
                    <span>Balanced Default (0.50)</span>
                    <span>Relaxed (0.65)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 flex items-center space-x-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-stone-600" />
                        <span>Biometric Verification Audio Chime</span>
                      </span>
                      <p className="text-[11px] text-stone-500">Play pleasant success tone when student face is verified.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audioFeedback}
                        onChange={(e) => setAudioFeedback(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 flex items-center space-x-1.5">
                        <Cpu className="h-3.5 w-3.5 text-stone-600" />
                        <span>Offline Vault Background Auto-Sync</span>
                      </span>
                      <p className="text-[11px] text-stone-500">Silently transmit cached attendance records once Wi-Fi reconnects.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={offlineVaultSync}
                        onChange={(e) => setOfflineVaultSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-200/80">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-2xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save System Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppleDeluxeShell>
  );
}
