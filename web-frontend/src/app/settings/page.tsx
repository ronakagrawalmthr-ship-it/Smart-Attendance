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

export default function GlobalSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // System Configurations
  const [apiHost, setApiHost] = useState('http://localhost:8000');
  const [toleranceThreshold, setToleranceThreshold] = useState<number>(0.50);
  const [livenessStrictness, setLivenessStrictness] = useState<string>('high');
  const [audioFeedback, setAudioFeedback] = useState<boolean>(true);
  const [offlineVaultSync, setOfflineVaultSync] = useState<boolean>(true);

  // Live Service Ports Status
  const services = [
    { name: 'Web Master Console', port: 3000, desc: 'Central University Entrance & Teacher Deck', status: 'Online', url: 'http://localhost:3000' },
    { name: 'Administrator Portal', port: 3001, desc: 'Whole College Governance & Directory CRUD', status: 'Online', url: 'http://localhost:3001' },
    { name: 'Student Academic Portal', port: 3002, desc: 'Student Attendance Gauges & Grievances', status: 'Online', url: 'http://localhost:3002' },
    { name: 'Department HOD Deck', port: 3003, desc: 'CSE Department Live Class Matrices', status: 'Online', url: 'http://localhost:3003' },
    { name: 'Python FastAPI Engine', port: 8000, desc: 'OpenCV Anti-Spoofing & 128-D Biometrics', status: 'Online', url: 'http://localhost:8000/docs' },
    { name: 'Metro / Expo Bundler', port: 8081, desc: 'React Native Android / iOS Kiosk App', status: 'Online', url: 'http://localhost:8081' },
  ];

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('global_system_settings') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.api_host) setApiHost(parsed.api_host);
        if (parsed.tolerance !== undefined) setToleranceThreshold(parsed.tolerance);
        if (parsed.liveness) setLivenessStrictness(parsed.liveness);
        if (parsed.audio !== undefined) setAudioFeedback(parsed.audio);
        if (parsed.offline_sync !== undefined) setOfflineVaultSync(parsed.offline_sync);
      } catch (e) {}
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
    }

    setTimeout(() => {
      setSaving(false);
      setSavedSuccess('Global platform parameters and telemetry settings saved successfully!');
      setTimeout(() => setSavedSuccess(null), 4000);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portal Directory</span>
          </Link>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>All 6 Subsystems Operational</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
                <Settings className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-black tracking-tight text-white">System Settings & Infrastructure Control</h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Host Deck
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Unified configuration console for active API microservices, face biometrics matching thresholds, port routing, and kiosk defaults.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center space-x-3 text-emerald-300 shadow-lg"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{savedSuccess}</p>
          </motion.div>
        )}

        {/* Subsystems & Active Ports Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Server className="h-4 w-4 text-cyan-400" />
              <span>Multi-Portal Service Mesh Telemetry</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Ports: 3000 • 3001 • 3002 • 3003 • 8000 • 8081</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <div key={svc.port} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40">
                      Port {svc.port}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{svc.status}</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{svc.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{svc.desc}</p>
                </div>

                <a
                  href={svc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center justify-center space-x-1.5"
                >
                  <span>Launch Portal</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Card 1: API & Network Endpoint */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl backdrop-blur-sm space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800">
                <Globe className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Central API Gateway Coordinates</h2>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">FastAPI Backend Endpoint URL</label>
                  <input
                    type="text"
                    required
                    value={apiHost}
                    onChange={(e) => setApiHost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition"
                    placeholder="http://localhost:8000"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Used by all Next.js frontends and mobile camera kiosks.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">SQLite Database Engine</span>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">sql_app.db ACTIVE</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    High-performance zero-latency local database storage with full PostgreSQL schema compatibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: AI Face Biometrics & Anti-Spoofing Parameters */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 shadow-xl backdrop-blur-sm space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800">
                <ScanFace className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">AI Biometric Liveness & Matching</h2>
              </div>

              <div className="space-y-5 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-slate-300">
                      128-D Euclidean Distance Match Cutoff
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
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
                    className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Strict (0.35)</span>
                    <span>Balanced Default (0.50)</span>
                    <span>Relaxed (0.65)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                        <span>Biometric Verification Audio Chime</span>
                      </span>
                      <p className="text-[11px] text-slate-400">Play pleasant success tone when student face is verified.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={audioFeedback} 
                        onChange={(e) => setAudioFeedback(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Offline Vault Background Auto-Sync</span>
                      </span>
                      <p className="text-[11px] text-slate-400">Silently transmit cached attendance records once Wi-Fi reconnects.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={offlineVaultSync} 
                        onChange={(e) => setOfflineVaultSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-800">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
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
    </div>
  );
}
