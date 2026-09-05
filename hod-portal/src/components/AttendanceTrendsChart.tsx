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

// Custom Light Apple Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-2 text-xs font-extrabold text-stone-900 mb-1">
          <span>{data.day ? `${data.day} (${data.date})` : data.semester}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-stone-500">Turnout:</span>
            <span className="font-extrabold text-emerald-700">{data.turnout}%</span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-stone-500">Present:</span>
            <span className="font-semibold text-stone-800">
              {data.present} / {data.total || data.enrolled}
            </span>
          </div>
          {data.turnout >= 75 ? (
            <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
              <CheckCircle className="h-3 w-3" />
              <span>Above Accreditation Threshold</span>
            </div>
          ) : (
            <div className="mt-1 flex items-center space-x-1 text-[10px] font-bold text-rose-600">
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
    <div className="rounded-3xl border border-stone-200/80 bg-white/85 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-extrabold text-stone-900">Department Turnout Intelligence</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Interactive Analytics
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Visual attendance trajectories, weekday trends, and semester compliance against the 75% threshold.
          </p>
        </div>

        {/* Tab Controls - Apple Segmented Pill */}
        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-full border border-stone-200/80 shrink-0">
          <button
            onClick={() => setChartMode('timeline')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              chartMode === 'timeline'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Weekly Trend</span>
          </button>
          <button
            onClick={() => setChartMode('semesters')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              chartMode === 'semesters'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Semester Bars</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Badges */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5">
          <div className="text-[11px] font-bold text-stone-500">Peak Turnout</div>
          <div className="text-lg font-extrabold text-emerald-700 mt-0.5">91.2% (Thu)</div>
        </div>
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5">
          <div className="text-[11px] font-bold text-stone-500">Weekly Avg</div>
          <div className="text-lg font-extrabold text-teal-700 mt-0.5">87.8%</div>
        </div>
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5">
          <div className="text-[11px] font-bold text-stone-500">Compliance Rate</div>
          <div className="text-lg font-extrabold text-sky-700 mt-0.5">100% &gt; 75%</div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-72 w-full">
        {chartMode === 'timeline' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="turnoutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#a8a29e" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e7e5e4' }} 
              />
              <YAxis 
                domain={[60, 100]} 
                stroke="#a8a29e" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e7e5e4' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#f43f5e" 
                strokeDasharray="4 4" 
                label={{ value: '75% Cutoff', fill: '#e11d48', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Area 
                type="monotone" 
                dataKey="turnout" 
                stroke="#059669" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#turnoutGradient)" 
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semesterData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="semester" 
                stroke="#a8a29e" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e7e5e4' }} 
              />
              <YAxis 
                domain={[60, 100]} 
                stroke="#a8a29e" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e7e5e4' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#f43f5e" 
                strokeDasharray="4 4" 
                label={{ value: '75% Cutoff', fill: '#e11d48', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Bar dataKey="turnout" radius={[8, 8, 0, 0]} maxBarSize={48}>
                {semesterData.map((entry, index) => {
                  const color = entry.turnout >= 88 ? '#059669' : entry.turnout >= 75 ? '#0284c7' : '#e11d48';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>CSE turnout has exceeded departmental SLA for 18 consecutive lecture days.</span>
        </div>
        <div className="hidden sm:block text-stone-400 font-mono text-[11px]">
          Live telemetry updated 2m ago
        </div>
      </div>
    </div>
  );
}
