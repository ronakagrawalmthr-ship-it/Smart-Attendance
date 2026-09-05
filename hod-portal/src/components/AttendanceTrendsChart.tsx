'use client';

import React, { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell 
} from 'recharts';
import { TrendingUp, BarChart2, Calendar, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface WeeklyDataPoint {
  day: string;
  date: string;
  turnout: number;
  present: number;
  total: number;
}

interface SemesterDataPoint {
  semester: string;
  turnout: number;
  enrolled: number;
  present: number;
}

const DEFAULT_WEEKLY_DATA: WeeklyDataPoint[] = [
  { day: 'Mon', date: 'Feb 23', turnout: 88.5, present: 465, total: 525 },
  { day: 'Tue', date: 'Feb 24', turnout: 89.2, present: 468, total: 525 },
  { day: 'Wed', date: 'Feb 25', turnout: 86.4, present: 454, total: 525 },
  { day: 'Thu', date: 'Feb 26', turnout: 91.2, present: 479, total: 525 },
  { day: 'Fri', date: 'Feb 27', turnout: 84.1, present: 442, total: 525 },
  { day: 'Sat', date: 'Feb 28', turnout: 87.3, present: 458, total: 525 },
];

const DEFAULT_SEMESTER_DATA: SemesterDataPoint[] = [
  { semester: 'Sem 2', turnout: 89.1, enrolled: 128, present: 114 },
  { semester: 'Sem 4', turnout: 82.9, enrolled: 135, present: 112 },
  { semester: 'Sem 6', turnout: 87.3, enrolled: 142, present: 124 },
  { semester: 'Sem 8', turnout: 90.0, enrolled: 120, present: 108 },
];

// Custom Dark Mode Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center space-x-2 text-xs font-bold text-white mb-1">
          <span>{data.day ? `${data.day} (${data.date})` : data.semester}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-slate-400">Turnout:</span>
            <span className="font-extrabold text-emerald-400">{data.turnout}%</span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-slate-400">Present:</span>
            <span className="font-semibold text-slate-200">
              {data.present} / {data.total || data.enrolled}
            </span>
          </div>
          {data.turnout >= 75 ? (
            <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              <span>Above Accreditation Threshold</span>
            </div>
          ) : (
            <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Defaulter Warning Zone</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function AttendanceTrendsChart({
  weeklyData = DEFAULT_WEEKLY_DATA,
  semesterData = DEFAULT_SEMESTER_DATA
}: {
  weeklyData?: WeeklyDataPoint[];
  semesterData?: SemesterDataPoint[];
}) {
  const [chartMode, setChartMode] = useState<'timeline' | 'semesters'>('timeline');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Department Turnout Intelligence</h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Interactive Analytics
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visual attendance trajectories, weekday trends, and semester compliance against the 75% threshold.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setChartMode('timeline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              chartMode === 'timeline'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Weekly Trend</span>
          </button>
          <button
            onClick={() => setChartMode('semesters')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              chartMode === 'semesters'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Semester Bars</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Badges */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
          <div className="text-[11px] font-semibold text-slate-400">Peak Turnout</div>
          <div className="text-lg font-extrabold text-emerald-400 mt-0.5">91.2% (Thu)</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
          <div className="text-[11px] font-semibold text-slate-400">Weekly Avg</div>
          <div className="text-lg font-extrabold text-teal-400 mt-0.5">87.8%</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
          <div className="text-[11px] font-semibold text-slate-400">Compliance Rate</div>
          <div className="text-lg font-extrabold text-cyan-400 mt-0.5">100% &gt; 75%</div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-72 w-full">
        {chartMode === 'timeline' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="turnoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#334155' }} 
              />
              <YAxis 
                domain={[60, 100]} 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ value: '75% Cutoff', fill: '#f87171', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Area 
                type="monotone" 
                dataKey="turnout" 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#turnoutGradient)" 
                activeDot={{ r: 6, fill: '#34d399', stroke: '#022c22', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semesterData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="semester" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#334155' }} 
              />
              <YAxis 
                domain={[60, 100]} 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ value: '75% Cutoff', fill: '#f87171', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Bar dataKey="turnout" radius={[8, 8, 0, 0]} maxBarSize={48}>
                {semesterData.map((entry, index) => {
                  const color = entry.turnout >= 88 ? '#10b981' : entry.turnout >= 75 ? '#06b6d4' : '#f43f5e';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>CSE turnout has exceeded departmental SLA for 18 consecutive lecture days.</span>
        </div>
        <div className="hidden sm:block text-slate-500 font-mono text-[11px]">
          Live telemetry updated 2m ago
        </div>
      </div>
    </div>
  );
}
