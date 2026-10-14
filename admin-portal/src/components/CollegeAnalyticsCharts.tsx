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

const DEFAULT_BRANCH_DATA: BranchMetric[] = [];

const DEFAULT_MONTHLY_DATA: MonthlyTrendPoint[] = [];

const RISK_DISTRIBUTION_DATA: Array<{ name: string; value: number; percentage: number; color: string }> = [];

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

export interface CollegeAnalyticsChartsProps {
  branches?: BranchMetric[];
  monthly?: MonthlyTrendPoint[];
  riskDistribution?: Array<{ name: string; value: number; percentage: number; color: string }>;
  totalStudents?: number;
}

export default function CollegeAnalyticsCharts({
  branches = DEFAULT_BRANCH_DATA,
  monthly = DEFAULT_MONTHLY_DATA,
  riskDistribution,
  totalStudents
}: CollegeAnalyticsChartsProps) {
  const [tab, setTab] = useState<'branches' | 'trajectory' | 'defaulters'>('branches');

  const safeBranches = Array.isArray(branches) ? branches : DEFAULT_BRANCH_DATA;
  const safeMonthly = Array.isArray(monthly) ? monthly : DEFAULT_MONTHLY_DATA;
  const riskData = Array.isArray(riskDistribution) && riskDistribution.length > 0 ? riskDistribution : RISK_DISTRIBUTION_DATA;
  const totalCount = totalStudents !== undefined 
    ? totalStudents 
    : riskData.reduce((sum, item) => sum + item.value, 0);

  // Dynamic insight message based on branch data
  const bestBranch = safeBranches.length > 0 
    ? [...safeBranches].sort((a, b) => b.attendance_percentage - a.attendance_percentage)[0]
    : null;
  const lowestBranch = safeBranches.length > 0
    ? [...safeBranches].sort((a, b) => a.attendance_percentage - b.attendance_percentage)[0]
    : null;

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
              Live Database Connected
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time departmental attendance rates, 30-day institutional trajectory, and statutory risk distributions.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-stone-100/80 border border-stone-200/60 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setTab('branches')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition ${
              tab === 'branches' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Departments</span>
          </button>
          <button
            onClick={() => setTab('trajectory')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition ${
              tab === 'trajectory' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Trajectory</span>
          </button>
          <button
            onClick={() => setTab('defaulters')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition ${
              tab === 'defaulters' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span>Risk Breakdown</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-72 w-full pt-2">
        {tab === 'branches' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeBranches} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="code" 
                tick={{ fill: '#78716c', fontSize: 11, fontWeight: 600 }} 
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#78716c', fontSize: 11 }} 
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<AdminCustomTooltip />} />
              <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '75% Cutoff', fill: '#f43f5e', fontSize: 10, position: 'right' }} />
              <Bar 
                dataKey="attendance_percentage" 
                radius={[8, 8, 0, 0]} 
                maxBarSize={48}
              >
                {safeBranches.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.attendance_percentage >= 75 ? '#818cf8' : '#fb7185'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 'trajectory' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="collegeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: '#78716c', fontSize: 11, fontWeight: 600 }} 
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
              />
              <YAxis 
                domain={[50, 100]} 
                tick={{ fill: '#78716c', fontSize: 11 }} 
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<AdminCustomTooltip />} />
              <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '75% Statutory', fill: '#f43f5e', fontSize: 10, position: 'insideTopLeft' }} />
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
                    data={riskData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-stone-900">{totalCount}</span>
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Students</span>
              </div>
            </div>

            {/* Legend & Breakdown Cards */}
            <div className="space-y-2.5 w-full max-w-sm">
              {riskData.map((tier, idx) => (
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
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            {bestBranch 
              ? `${bestBranch.branch} leads college turnout at ${bestBranch.attendance_percentage}%.`
              : 'Direct SQL database connectivity active across all departments.'}
            {lowestBranch && lowestBranch.attendance_percentage < 75 
              ? ` ${lowestBranch.code} is under observation at ${lowestBranch.attendance_percentage}%.` 
              : ''}
          </span>
        </div>
        <div className="hidden sm:block text-stone-400 font-mono text-[11px]">
          Live SQL Database Synced
        </div>
      </div>
    </div>
  );
}
