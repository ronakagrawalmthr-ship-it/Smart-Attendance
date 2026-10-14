'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  ArrowLeft, 
  Download, 
  Network,
  Laptop,
  Radio,
  Cog,
  Mail,
  Phone,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetch, getHodPortalUrl } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

const ICON_MAP: Record<string, any> = {
  CSE: Laptop,
  IT: Network,
  ECE: Radio,
  MECH: Cog,
};

const getHodDeckUrl = () => getHodPortalUrl('/dashboard');

export default function AllDepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [totalFaculty, setTotalFaculty] = useState<number | null>(null);
  const [avgTurnout, setAvgTurnout] = useState<number | null>(null);

  const fetchDepartmentsSummary = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/management/college/departments-summary`);
      if (res.ok) {
        const data = await res.json();
        setTotalStudents(data.totalCollegeStudents ?? null);
        setTotalFaculty(data.totalCollegeFaculty ?? null);
        setAvgTurnout(data.collegeAvgTurnout ?? null);

        if (data.departments && data.departments.length > 0) {
          const mapped = data.departments.map((d: any) => ({
            ...d,
            icon: ICON_MAP[d.code] || Building2
          }));
          setDepartments(mapped);
        }
      }
    } catch {
      console.log('Using real Indian college database state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentsSummary();
  }, []);

  const exportDeptCSV = (dept: any) => {
    const csv = `Department,Code,HOD,Email,Phone,Students,Faculty,Labs,Turnout,Accreditation\n`
      + `"${dept.name}","${dept.code}","${dept.hod}","${dept.hodEmail}","${dept.hodPhone}",${dept.students ?? 'null'},${dept.faculty ?? 'null'},${dept.labs ?? 'null'},${dept.turnoutToday ? `${dept.turnoutToday}%` : 'null'},"${dept.rank ?? 'null'}"`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dept.code}_Department_Snapshot.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppleDeluxeShell userRole="Institutional Governance">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition px-3 py-1.5 rounded-full hover:bg-stone-200/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to College Overview</span>
        </Link>
        <button
          onClick={fetchDepartmentsSummary}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 text-xs text-stone-700 hover:text-stone-900 px-3.5 py-2 rounded-2xl bg-white/80 border border-stone-200/80 shadow-xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-stone-900' : 'text-stone-500'}`} />
          <span>Refresh Live Stats</span>
        </button>
      </div>

      <header className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 font-semibold tracking-wide">
            Institutional Master Directory
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Whole College Departments Directory</h1>
        </div>
        <p className="text-xs text-stone-500 mt-1.5">
          Master administrative view over all academic engineering departments, appointed faculty HOD authorities, student enrollments, and live attendance metrics.
        </p>
      </header>

      {/* College Aggregate Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-[#F4EFE6]/80 border border-stone-200/80 p-6 backdrop-blur-xl shadow-xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-stone-500 block mb-2">Total College Students</span>
          <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
            {totalStudents !== null ? totalStudents : '--'}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Across all {departments.length} engineering faculties</span>
        </div>

        <div className="rounded-3xl bg-[#EBF3FF]/80 border border-blue-100 p-6 backdrop-blur-xl shadow-xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-blue-700 block mb-2">Total College Faculty</span>
          <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
            {totalFaculty !== null ? totalFaculty : '--'}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">Professors, Associate & Assistant</span>
        </div>

        <div className="rounded-3xl bg-[#E8F8F0]/80 border border-emerald-100 p-6 backdrop-blur-xl shadow-xs">
          <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 block mb-2">University Average Turnout</span>
          <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
            {avgTurnout !== null ? `${avgTurnout}%` : '--'}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Live calculated biometric turnout</span>
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading && departments.length === 0 ? (
        <div className="py-16 text-center text-stone-400 text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-stone-400" />
          Loading departments directory...
        </div>
      ) : departments.length === 0 ? (
        <div className="py-16 text-center text-stone-400 text-sm bg-white/50 rounded-3xl border border-stone-200/60">
          No engineering departments configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {departments.map((dept) => {
          const Icon = dept.icon || Building2;
          const turnoutVal = dept.turnoutToday ?? 0;
          const isHealthy = turnoutVal >= 75;
          return (
            <div 
              key={dept.id}
              className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 backdrop-blur-xl space-y-5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${dept.color} flex items-center justify-center text-white shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {dept.code}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-stone-900 tracking-tight">{dept.name}</h3>
                  <span className="text-[11px] text-stone-500 block mt-0.5">{dept.rank || 'null'}</span>
                </div>

                {/* HOD Details Box */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Appointed Head of Department (HOD)</span>
                  <p className="font-semibold text-stone-900">{dept.hod || 'null'}</p>
                  <div className="text-[11px] text-stone-600 space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <Mail className="h-3 w-3 text-stone-400" />
                      <span>{dept.hodEmail || 'null'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Phone className="h-3 w-3 text-stone-400" />
                      <span>{dept.hodPhone || 'null'}</span>
                    </div>
                  </div>
                </div>

                {/* Department Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                    <span className="text-[10px] text-stone-500 block font-medium">Students</span>
                    <span className="font-bold text-stone-900 text-sm">{dept.students !== null ? dept.students : 'null'}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                    <span className="text-[10px] text-stone-500 block font-medium">Faculty</span>
                    <span className="font-bold text-stone-900 text-sm">{dept.faculty !== null ? dept.faculty : 'null'}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                    <span className="text-[10px] text-stone-500 block font-medium">Labs</span>
                    <span className="font-bold text-stone-900 text-sm">{dept.labs !== null ? dept.labs : 'null'}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Bar */}
              <div className="pt-3 border-t border-stone-100 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">Department Turnout</span>
                  <span className={`font-bold ${dept.turnoutToday === null ? 'text-stone-400' : isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {dept.turnoutToday !== null ? `${dept.turnoutToday.toFixed(1)}%` : 'null'}
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${turnoutVal}%` }}
                  />
                </div>
              </div>

              {/* Department Quick Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs font-semibold">
                <Link
                  href={getHodDeckUrl()}
                  target="_blank"
                  className="flex-1 py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200/80 transition flex items-center justify-center space-x-1.5 shadow-xs"
                  title="Open department-exclusive HOD deck"
                >
                  <Building2 className="h-3.5 w-3.5 text-stone-700" />
                  <span>HOD Deck</span>
                </Link>

                <a
                  href={`mailto:${dept.hodEmail}?subject=Institutional%20Inquiry%20-%20${dept.code}`}
                  className="py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 transition flex items-center space-x-1"
                  title={`Email ${dept.hod}`}
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => exportDeptCSV(dept)}
                  className="py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-emerald-700 border border-stone-200/80 transition flex items-center space-x-1"
                  title="Export department summary CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}
      </div>
    </AppleDeluxeShell>
  );
}
