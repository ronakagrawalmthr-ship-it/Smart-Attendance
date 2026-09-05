'use client';

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface BranchMetric {
  branch: string;
  code: string;
  total_enrolled: number;
  present_count: number;
  attendance_percentage: number;
}

interface MonthlyTrendPoint {
  week: string;
  turnout: number;
  classes: number;
}

const DEFAULT_BRANCH_DATA: BranchMetric[] = [
  { branch: 'Computer Science', code: 'CSE', total_enrolled: 525, present_count: 458, attendance_percentage: 87.3 },
  { branch: 'Information Tech', code: 'IT', total_enrolled: 380, present_count: 328, attendance_percentage: 86.4 },
  { branch: 'Electronics & Comm', code: 'ECE', total_enrolled: 310, present_count: 225, attendance_percentage: 72.5 },
  { branch: 'Mechanical Engg', code: 'ME', total_enrolled: 290, present_count: 232, attendance_percentage: 80.0 },
  { branch: 'Civil Engineering', code: 'CE', total_enrolled: 230, present_count: 180, attendance_percentage: 78.2 },
];

const DEFAULT_MONTHLY_DATA: MonthlyTrendPoint[] = [
  { week: 'Week 1', turnout: 83.2, classes: 142 },
  { week: 'Week 2', turnout: 85.7, classes: 156 },
  { week: 'Week 3', turnout: 87.9, classes: 160 },
  { week: 'Week 4', turnout: 84.8, classes: 148 },
];

const RISK_DISTRIBUTION_DATA = [
  { name: 'Safe (>75%)', value: 1360, percentage: 78.4, color: '#10b981' },
  { name: 'Warning (65-75%)', value: 246, percentage: 14.2, color: '#f59e0b' },
  { name: 'Critical Defaulters (<65%)', value: 129, percentage: 7.4, color: '#f43f5e' },
];

// Custom Tooltip for Admin Charts
const AdminCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-bold text-stone-900 border-b border-stone-100 pb-1 flex items-center justify-between">
          <span>{data.branch || data.name || label}</span>
          {data.code && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{data.code}</span>}
        </div>
        <div className="space-y-1 text-[11px] text-stone-600">
          {data.total_enrolled && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-stone-400">Total Enrolled:</span>
              <span className="font-semibold text-stone-900">{data.total_enrolled}</span>
            </div>
          )}
          {data.present_count !== undefined && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-stone-400">Avg Present:</span>
              <span className="font-semibold text-emerald-600">{data.present_count}</span>
            </div>
          )}
          {data.attendance_percentage !== undefined && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-stone-400">Turnout Rate:</span>
              <span className={`font-bold ${data.attendance_percentage >= 75 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {data.attendance_percentage}%
              </span>
            </div>
          )}
          {data.turnout !== undefined && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-stone-400">Weekly Avg:</span>
              <span className="font-bold text-indigo-600">{data.turnout}%</span>
            </div>
          )}
          {data.percentage !== undefined && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-stone-400">Share:</span>
              <span className="font-bold text-stone-900">{data.percentage}% ({data.value} students)</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function CollegeAnalyticsCharts({
  branches = DEFAULT_BRANCH_DATA,
  monthly = DEFAULT_MONTHLY_DATA
}: {
  branches?: BranchMetric[];
  monthly?: MonthlyTrendPoint[];
}) {
  const [tab, setTab] = useState<'branches' | 'trajectory' | 'defaulters'>('branches');

  return (
    <div className="rounded-[2rem] border border-stone-200/70 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Institutional Analytics</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Cross-Departmental
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Comparative departmental attendance rates, 30-day institutional trajectory, and statutory risk distributions.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 bg-stone-100/80 p-1 rounded-full border border-stone-200/50 shrink-0">
          <button
            onClick={() => setTab('branches')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              tab === 'branches'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Branch Breakdown</span>
          </button>
          <button
            onClick={() => setTab('trajectory')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              tab === 'trajectory'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
            <span>Monthly Curve</span>
          </button>
          <button
            onClick={() => setTab('defaulters')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              tab === 'defaulters'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5 text-rose-500" />
            <span>Defaulter Risk</span>
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="h-72 w-full">
        {tab === 'branches' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branches} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="code" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }} 
              />
              <YAxis 
                domain={[50, 100]} 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<AdminCustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#f43f5e" 
                strokeDasharray="4 4" 
                label={{ value: '75% Institutional Cutoff', fill: '#f43f5e', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Bar dataKey="attendance_percentage" radius={[8, 8, 0, 0]} maxBarSize={48}>
                {branches.map((entry, index) => {
                  const color = entry.attendance_percentage >= 85 
                    ? '#6366f1' 
                    : entry.attendance_percentage >= 75 
                    ? '#8b5cf6' 
                    : '#fb7185';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 'trajectory' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="collegeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="week" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }} 
              />
              <YAxis 
                domain={[60, 100]} 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<AdminCustomTooltip />} />
              <ReferenceLine 
                y={75} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ value: '75% Cutoff', fill: '#ef4444', fontSize: 10, position: 'insideBottomRight' }} 
              />
              <Area 
                type="monotone" 
                dataKey="turnout" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#collegeGradient)" 
                activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {tab === 'defaulters' && (
          <div className="flex flex-col md:flex-row items-center justify-around h-full gap-6">
            <div className="h-56 w-56 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<AdminCustomTooltip />} />
                  <Pie
                    data={RISK_DISTRIBUTION_DATA}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {RISK_DISTRIBUTION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-stone-900">1,735</span>
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Students</span>
              </div>
            </div>

            {/* Legend & Breakdown Cards */}
            <div className="space-y-2.5 w-full max-w-sm">
              {RISK_DISTRIBUTION_DATA.map((tier, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                    <span className="text-xs font-semibold text-stone-700">{tier.name}</span>
                  </div>
                  <div className="text-xs font-bold text-stone-900">
                    {tier.value} <span className="text-stone-400 font-normal">({tier.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <span>CSE and IT lead institutional turnout; ECE is 2.5% below statutory cutoff.</span>
        </div>
        <div className="hidden sm:block text-stone-400 font-mono text-[11px]">
          Live AI telemetry synchronized
        </div>
      </div>
    </div>
  );
}
