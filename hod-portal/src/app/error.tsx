'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default function HodPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled HOD Portal Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 text-stone-900 font-sans selection:bg-stone-300">
      <div className="max-w-md w-full bg-white/85 backdrop-blur-xl border border-stone-200/80 rounded-3xl p-8 shadow-2xl shadow-stone-200/50 text-center space-y-6">
        <div className="inline-flex items-center justify-center p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-stone-900">
            Department Operations Interrupted
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            A temporary communication failure occurred while rendering this departmental governance view.
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
            Retry
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 text-xs font-semibold border border-stone-200/80 transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
