'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  RefreshCw, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ScanFace, 
  BookOpen, 
  Layers, 
  Phone, 
  Mail, 
  Filter, 
  Clock, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authFetch } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';
import AppleSelect from '@/components/AppleSelect';

export default function HODStudentRosterPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Class Category Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedBiometric, setSelectedBiometric] = useState<string>('all');
  
  const [departmentName, setDepartmentName] = useState('Computer Science');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/management/crud/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        if (data.students && data.students.length > 0 && data.students[0].branch) {
          setDepartmentName(data.students[0].branch);
        }
      }
    } catch (err) {
      console.error('Error fetching department student roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filtered and Naturally Sorted Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.full_name?.toLowerCase().includes(q) ||
          s.roll_number?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q);

        const matchesSem =
          selectedSemester === 'all' || String(s.semester) === String(selectedSemester);

        const matchesSec =
          selectedSection === 'all' || s.section?.toUpperCase() === selectedSection.toUpperCase();

        const matchesBio =
          selectedBiometric === 'all' ||
          (selectedBiometric === 'enrolled' && s.has_face_encoding) ||
          (selectedBiometric === 'pending' && !s.has_face_encoding);

        return matchesSearch && matchesSem && matchesSec && matchesBio;
      })
      .sort((a, b) => {
        return a.roll_number.localeCompare(b.roll_number, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [students, searchQuery, selectedSemester, selectedSection, selectedBiometric]);

  // Aggregate Metrics for Selected Category
  const metrics = useMemo(() => {
    const total = filteredStudents.length;
    const enrolledBio = filteredStudents.filter((s) => s.has_face_encoding).length;
    const defaulters = filteredStudents.filter((s) => s.is_defaulter).length;
    const avgAtt =
      total > 0
        ? Math.round(
            (filteredStudents.reduce((acc, s) => acc + (s.attendance_percentage || 0), 0) /
              total) *
              10
          ) / 10
        : 0;

    return { total, enrolledBio, defaulters, avgAtt };
  }, [filteredStudents]);

  return (
    <AppleDeluxeShell userRole="Department Head Command" userName="HOD CSE">
      <div className="space-y-6">
        
        {/* Header Container */}
        <header className="rounded-[2rem] bg-white border border-stone-200/70 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/60 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                {departmentName}
              </span>
              <span className="text-[11px] text-stone-400 font-medium">Institutional Student Database</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Department Student Roster
            </h1>
            <p className="text-xs text-stone-500 max-w-xl">
              Real-time directory of enrolled students categorized by class, semester, section, and biometric face registration standing.
            </p>
          </div>

          <button
            onClick={fetchStudents}
            className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-2 border border-stone-200/80 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live DB</span>
          </button>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-white border border-stone-200/70 p-5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Enrolled In Class
            </span>
            <div className="text-2xl font-bold text-stone-900 font-mono">{metrics.total}</div>
            <p className="text-[10px] text-stone-400">Total verified students</p>
          </div>

          <div className="rounded-3xl bg-white border border-stone-200/70 p-5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600">
              Face ID Enrolled
            </span>
            <div className="text-2xl font-bold text-teal-700 font-mono">
              {metrics.enrolledBio} <span className="text-xs text-stone-400 font-normal">/ {metrics.total}</span>
            </div>
            <p className="text-[10px] text-stone-400">128-d biometric signatures</p>
          </div>

          <div className="rounded-3xl bg-white border border-stone-200/70 p-5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Avg Class Attendance
            </span>
            <div className="text-2xl font-bold text-indigo-700 font-mono">
              {metrics.avgAtt}%
            </div>
            <p className="text-[10px] text-stone-400">Live lecture turnout</p>
          </div>

          <div className="rounded-3xl bg-white border border-stone-200/70 p-5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Defaulter Risk (&lt;75%)
            </span>
            <div className="text-2xl font-bold text-rose-700 font-mono">
              {metrics.defaulters}
            </div>
            <p className="text-[10px] text-stone-400">Critical review required</p>
          </div>
        </div>

        {/* Category Filter Controls */}
        <div className="rounded-[2rem] bg-white border border-stone-200/70 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-stone-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Class & Semester Categorization Filters
              </h2>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              Showing <span className="font-bold text-stone-900">{filteredStudents.length}</span> students
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Class / Semester
              </label>
              <AppleSelect
                value={selectedSemester}
                onChange={(val) => setSelectedSemester(val)}
                options={[
                  { value: 'all', label: 'All Semesters', badge: 'All' },
                  { value: '1', label: 'Semester 1 (1st Yr)', badge: 'Sem 1' },
                  { value: '2', label: 'Semester 2 (1st Yr)', badge: 'Sem 2' },
                  { value: '3', label: 'Semester 3 (2nd Yr)', badge: 'Sem 3' },
                  { value: '4', label: 'Semester 4 (2nd Yr)', badge: 'Sem 4' },
                  { value: '5', label: 'Semester 5 (3rd Yr)', badge: 'Sem 5' },
                  { value: '6', label: 'Semester 6 (3rd Yr)', badge: 'Sem 6' },
                  { value: '7', label: 'Semester 7 (4th Yr)', badge: 'Sem 7' },
                  { value: '8', label: 'Semester 8 (4th Yr)', badge: 'Sem 8' }
                ]}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Section
              </label>
              <AppleSelect
                value={selectedSection}
                onChange={(val) => setSelectedSection(val)}
                options={[
                  { value: 'all', label: 'All Sections', badge: 'All' },
                  { value: 'A', label: 'Section A', badge: 'Sec A' },
                  { value: 'B', label: 'Section B', badge: 'Sec B' },
                  { value: 'C', label: 'Section C', badge: 'Sec C' }
                ]}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1.5 uppercase tracking-wider">
                Face Biometrics
              </label>
              <AppleSelect
                value={selectedBiometric}
                onChange={(val) => setSelectedBiometric(val)}
                options={[
                  { value: 'all', label: 'All Biometric Statuses', badge: 'All' },
                  { value: 'enrolled', label: 'Biometrics Enrolled', badge: 'Active' },
                  { value: 'pending', label: 'Pending Selfie Capture', badge: 'Pending' }
                ]}
              />
            </div>

            <div>
              {(selectedSemester !== 'all' || selectedSection !== 'all' || selectedBiometric !== 'all') ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemester('all');
                    setSelectedSection('all');
                    setSelectedBiometric('all');
                    setSearchQuery('');
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-stone-500" />
                  <span>Reset Class Filters</span>
                </button>
              ) : (
                <div className="relative">
                  <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search roll no, name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-teal-500 transition"
                  />
                </div>
              )}
            </div>
          </div>

          {/* If filters reset, also show search bar */}
          {(selectedSemester !== 'all' || selectedSection !== 'all' || selectedBiometric !== 'all') && (
            <div className="relative pt-2">
              <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-5" />
              <input
                type="text"
                placeholder="Search roll no, name within filtered class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-teal-500 transition"
              />
            </div>
          )}
        </div>

        {/* Student Data Table */}
        <div className="rounded-[2rem] bg-white border border-stone-200/70 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 text-center text-stone-400 text-xs flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-6 w-6 text-teal-500 animate-spin" />
              <span>Loading department student directory...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-stone-500 text-xs space-y-2">
              <AlertCircle className="h-8 w-8 text-stone-400 mx-auto" />
              <p className="font-semibold text-stone-700">No students found matching the selected class criteria.</p>
              <p className="text-stone-400">Try selecting "All Semesters" or resetting your search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-6">Roll Number</th>
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Class & Section</th>
                    <th className="py-4 px-6">Biometric Face ID</th>
                    <th className="py-4 px-6 text-center">Classes Attended</th>
                    <th className="py-4 px-6 text-center">Attendance %</th>
                    <th className="py-4 px-6">Institutional Standing</th>
                    <th className="py-4 px-6 text-right">Student Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-6 font-mono font-bold text-stone-900">
                        {s.roll_number}
                      </td>

                      <td className="py-3.5 px-6 font-medium text-stone-900">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-7 w-7 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-800 text-xs shrink-0">
                            {s.full_name?.charAt(0) || 'S'}
                          </div>
                          <span className="font-semibold">{s.full_name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-semibold text-[11px]">
                          Sem {s.semester} • Sec {s.section}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            s.has_face_encoding
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          {s.has_face_encoding ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{s.has_face_encoding ? 'Enrolled' : 'Pending'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-center font-mono font-semibold text-stone-800">
                        {s.present_classes || 0} <span className="text-stone-400 font-normal">/ {s.total_classes || 0}</span>
                      </td>

                      <td className="py-3.5 px-6 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              s.is_defaulter ? 'text-rose-600' : 'text-stone-900'
                            }`}
                          >
                            {s.attendance_percentage || 0}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            s.is_defaulter
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          {s.is_defaulter ? (
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                          ) : (
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          )}
                          <span>{s.is_defaulter ? 'Defaulter Risk' : 'Eligible'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="text-[11px] font-mono text-stone-600">{s.email}</div>
                        {s.phone && s.phone !== 'N/A' && (
                          <div className="text-[10px] text-stone-400">{s.phone}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppleDeluxeShell>
  );
}
