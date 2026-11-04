'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Sparkles } from 'lucide-react';

export default function StudentPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Student Portal Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 text-stone-900 font-sans selection:bg-stone-300">
      <div className="max-w-md w-full bg-white/85 backdrop-blur-xl border border-stone-200/80 rounded-3xl p-8 shadow-2xl shadow-stone-200/50 text-center space-y-6">
        <div className="inline-flex items-center justify-center p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600 shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-stone-900">
            Student Portal Notice
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            We encountered a temporary issue loading your academic standing. Please retry or return to your dashboard.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-left">
            <span className="text-[11px] font-mono text-stone-600 break-words block">
              {error.message}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-stone-900/10 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Page
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 text-xs font-semibold border border-stone-200/80 transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
