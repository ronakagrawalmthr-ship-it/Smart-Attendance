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
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, authFetch, getHodPortalUrl } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

const ICON_MAP: Record<string, any> = {
  CSE: Laptop,
  IT: Network,
  ECE: Radio,
  MECH: Cog,
  CIVIL: Building2,
  EE: Radio,
  BBA: BookOpen,
  MBA: GraduationCap,
  MBBS: Users,
  BSC: Layers,
  BCA: Laptop,
};

const DEGREE_OPTIONS = [
  { value: 'UG', label: 'Undergraduate Degree (UG)' },
  { value: 'PG', label: 'Postgraduate Master\'s (PG)' },
  { value: 'Diploma', label: 'Polytechnic / Diploma' },
  { value: 'Integrated', label: 'Integrated Dual Degree (5-Year)' },
  { value: 'Doctorate', label: 'Doctorate (Ph.D.)' }
];

const DURATION_PRESETS: Record<number, number> = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12
};

export default function AllDepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [totalFaculty, setTotalFaculty] = useState<number | null>(null);
  const [avgTurnout, setAvgTurnout] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    degree_type: 'UG',
    duration_years: 4,
    total_semesters: 8,
    sections: 'A, B, C',
    hod_name: '',
    hod_email: '',
    hod_phone: '',
    rank: 'Tier 1 (NBA Accredited)',
    description: ''
  });

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDepartmentsSummary = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/management/college/departments-summary`);
      if (res.ok) {
        const data = await res.json();
        setTotalStudents(data.totalCollegeStudents ?? null);
        setTotalFaculty(data.totalCollegeFaculty ?? null);
        setAvgTurnout(data.collegeAvgTurnout ?? null);

        if (data.departments) {
          const mapped = data.departments.map((d: any) => ({
            ...d,
            icon: ICON_MAP[d.code] || Building2
          }));
          setDepartments(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentsSummary();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      degree_type: 'UG',
      duration_years: 4,
      total_semesters: 8,
      sections: 'A, B, C',
      hod_name: '',
      hod_email: '',
      hod_phone: '',
      rank: 'Tier 1 (NBA Accredited)',
      description: ''
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: any) => {
    setIsEditMode(true);
    setEditingId(dept.id);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      degree_type: dept.degree_type || 'UG',
      duration_years: dept.duration_years || 4,
      total_semesters: dept.total_semesters || 8,
      sections: dept.sections || (dept.sectionsList ? dept.sectionsList.join(', ') : 'A, B, C'),
      hod_name: dept.hod === 'Not Appointed' ? '' : (dept.hod || ''),
      hod_email: dept.hodEmail === '-' ? '' : (dept.hodEmail || ''),
      hod_phone: dept.hodPhone === '-' ? '' : (dept.hodPhone || ''),
      rank: dept.rank || 'Academic Faculty',
      description: dept.description || ''
    });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const handleDurationChange = (years: number) => {
    const defaultSems = DURATION_PRESETS[years] || (years * 2);
    setFormData(prev => ({
      ...prev,
      duration_years: years,
      total_semesters: defaultSems
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!formData.name.trim()) {
      setModalError('Department name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setModalError('Department code is required.');
      return;
    }

    try {
      setModalLoading(true);
      const url = isEditMode
        ? `${API_BASE_URL}/management/departments/${editingId}`
        : `${API_BASE_URL}/management/departments`;

      const method = isEditMode ? 'PUT' : 'POST';

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        degree_type: formData.degree_type,
        duration_years: Number(formData.duration_years),
        total_semesters: Number(formData.total_semesters),
        sections: formData.sections.trim() || 'A, B, C',
        hod_name: formData.hod_name.trim() || null,
        hod_email: formData.hod_email.trim() || null,
        hod_phone: formData.hod_phone.trim() || null,
        rank: formData.rank.trim() || 'Academic Faculty',
        description: formData.description.trim() || null
      };

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.detail || 'Failed to save department.');
      }

      setModalSuccess(isEditMode ? 'Department updated successfully!' : 'Department created successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        fetchDepartmentsSummary();
      }, 700);
    } catch (err: any) {
      setModalError(err.message || 'Operation failed. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const url = `${API_BASE_URL}/management/departments/${deleteTarget.id}?force=${deleteForce}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.detail || 'Failed to delete department.');
      }

      setDeleteTarget(null);
      setDeleteForce(false);
      fetchDepartmentsSummary();
    } catch (err: any) {
      setDeleteError(err.message || 'Could not delete department.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportDeptCSV = (dept: any) => {
    const csv = `Department,Code,Degree,Duration (Years),Total Semesters,HOD,Email,Phone,Students,Faculty,Labs,Turnout,Accreditation\n`
      + `"${dept.name}","${dept.code}","${dept.degree_type || 'UG'}",${dept.duration_years || 4},${dept.total_semesters || 8},"${dept.hod || 'Unassigned'}","${dept.hodEmail || 'N/A'}","${dept.hodPhone || 'N/A'}",${dept.students ?? 0},${dept.faculty ?? 0},${dept.labs ?? 0},${dept.turnoutToday !== null ? `${dept.turnoutToday}%` : 'N/A'},"${dept.rank || 'N/A'}"`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dept.code}_Department_Snapshot.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filtering
  const filteredDepartments = departments.filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.hod || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppleDeluxeShell userRole="Institutional Governance">
      <div className="space-y-8">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition px-3 py-1.5 rounded-full hover:bg-stone-200/50 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to College Overview</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDepartmentsSummary}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 text-xs text-stone-700 hover:text-stone-900 px-3.5 py-2 rounded-2xl bg-white/80 border border-stone-200/80 shadow-xs transition hover:bg-stone-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-stone-900' : 'text-stone-500'}`} />
              <span>Refresh Live Stats</span>
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white px-4 py-2 rounded-2xl bg-stone-900 hover:bg-black shadow-sm transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </button>
          </div>
        </div>

        {/* Hero Title Section */}
        <header className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 sm:p-8 backdrop-blur-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 font-semibold tracking-wide">
                Institutional Master Directory
              </span>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Academic Departments Management</h1>
            </div>
            <p className="text-xs text-stone-500 max-w-2xl">
              Configure, edit, and oversee all academic departments across the institution. Set course duration in years, custom semester counts (e.g. BBA 3yr/6sem, MBBS 5yr/10sem, BTech 4yr/8sem), appoint HOD leadership, and monitor live attendance analytics.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search branch name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* College Aggregate Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="rounded-3xl bg-[#F4EFE6]/80 border border-stone-200/80 p-6 backdrop-blur-xl shadow-xs">
            <span className="text-[11px] uppercase font-bold tracking-wider text-stone-500 block mb-2">Total College Students</span>
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {totalStudents !== null ? totalStudents : '--'}
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">Actively registered across all branches</span>
          </div>

          <div className="rounded-3xl bg-[#EBF3FF]/80 border border-blue-100 p-6 backdrop-blur-xl shadow-xs">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-700 block mb-2">Total College Faculty</span>
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {totalFaculty !== null ? totalFaculty : '--'}
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">Professors, HODs & Lecturers</span>
          </div>

          <div className="rounded-3xl bg-[#FAF5FF]/80 border border-purple-100 p-6 backdrop-blur-xl shadow-xs">
            <span className="text-[11px] uppercase font-bold tracking-wider text-purple-700 block mb-2">Active Departments</span>
            <div className="text-3xl font-extrabold text-purple-900 tracking-tight">
              {departments.length}
            </div>
            <span className="text-[11px] text-purple-600 mt-1 block">Full institutional programs configured</span>
          </div>

          <div className="rounded-3xl bg-[#E8F8F0]/80 border border-emerald-100 p-6 backdrop-blur-xl shadow-xs">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 block mb-2">Campus Average Turnout</span>
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {avgTurnout !== null ? `${avgTurnout}%` : '--'}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block">Live calculated biometric turnout</span>
          </div>
        </div>

        {/* Department Cards Grid */}
        {loading && departments.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-sm bg-white/60 rounded-3xl border border-stone-200">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-stone-400" />
            Loading academic departments directory...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-20 text-center text-stone-500 text-sm bg-white/60 rounded-3xl border border-stone-200 space-y-3">
            <Building2 className="h-10 w-10 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">No matching academic departments found.</p>
            <p className="text-xs text-stone-400">Click &quot;Add Department&quot; above to create a new program.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white px-4 py-2 rounded-2xl bg-stone-900 hover:bg-black transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredDepartments.map((dept) => {
              const Icon = dept.icon || Building2;
              const turnoutVal = dept.turnoutToday ?? 0;
              const isHealthy = turnoutVal >= 75;
              const durationYears = dept.duration_years || 4;
              const totalSemesters = dept.total_semesters || (durationYears * 2);
              const degreeType = dept.degree_type || 'UG';

              return (
                <div 
                  key={dept.id || dept.code}
                  className="rounded-3xl bg-white/80 border border-stone-200/80 p-6 backdrop-blur-xl space-y-5 flex flex-col justify-between shadow-sm hover:shadow-md transition relative group"
                >
                  <div className="space-y-4">
                    {/* Header badge row */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${dept.color || 'from-stone-700 to-stone-900'} flex items-center justify-center text-white shadow-sm`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                              {dept.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                              {degreeType}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-stone-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-stone-400 inline" />
                            {durationYears} {durationYears === 1 ? 'Year' : 'Years'} • {totalSemesters} Sem • Sec: {dept.sections || 'A, B, C'}
                          </span>
                        </div>
                      </div>

                      {/* Top Action Buttons (Edit / Delete) */}
                      <div className="flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                          title="Edit Department Details & Semesters"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(dept);
                            setDeleteForce(false);
                            setDeleteError(null);
                          }}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-stone-900 tracking-tight">{dept.name}</h3>
                      {dept.rank && (
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <Award className="h-3 w-3 text-amber-500 inline" />
                          <span className="text-[11px] text-stone-500 font-medium">{dept.rank}</span>
                        </div>
                      )}
                      {dept.description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{dept.description}</p>
                      )}
                    </div>

                    {/* HOD Details Box */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        Head of Department (HOD)
                      </span>
                      <p className="font-semibold text-stone-900">{dept.hod || 'Not Appointed'}</p>
                      <div className="text-[11px] text-stone-600 space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="h-3 w-3 text-stone-400" />
                          <span>{dept.hodEmail || '—'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{dept.hodPhone || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Department Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <span className="text-[10px] text-stone-500 block font-medium">Students</span>
                        <span className="font-bold text-stone-900 text-sm">{dept.students ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <span className="text-[10px] text-stone-500 block font-medium">Faculty</span>
                        <span className="font-bold text-stone-900 text-sm">{dept.faculty ?? 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                        <span className="text-[10px] text-stone-500 block font-medium">Labs</span>
                        <span className="font-bold text-stone-900 text-sm">{dept.labs ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Turnout Progress Bar */}
                  <div className="pt-3 border-t border-stone-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500 font-medium">Department Turnout</span>
                      <span className={`font-bold ${dept.turnoutToday === null ? 'text-stone-400' : isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {dept.turnoutToday !== null ? `${dept.turnoutToday.toFixed(1)}%` : 'No sessions today'}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(turnoutVal, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Quick Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs font-semibold">
                    <Link
                      href={getHodPortalUrl('/dashboard')}
                      target="_blank"
                      className="flex-1 py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200/80 transition flex items-center justify-center space-x-1.5 shadow-xs"
                      title="Open department-exclusive HOD deck"
                    >
                      <Building2 className="h-3.5 w-3.5 text-stone-700" />
                      <span>HOD Deck</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => openEditModal(dept)}
                      className="py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 transition flex items-center space-x-1 cursor-pointer"
                      title="Edit Department"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportDeptCSV(dept)}
                      className="py-2 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-emerald-700 border border-stone-200/80 transition flex items-center space-x-1 cursor-pointer"
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

        {/* ------------------------------------------------------------------ */}
        {/* ADD / EDIT DEPARTMENT MODAL                                        */}
        {/* ------------------------------------------------------------------ */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-9 w-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">
                        {isEditMode ? 'Edit Academic Department' : 'Register New Department'}
                      </h2>
                      <p className="text-[11px] text-stone-500">
                        {isEditMode ? 'Modify department settings, total years, and semesters.' : 'Create a new department with custom duration and semesters.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                  {modalError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {modalSuccess && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{modalSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Department Name */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-stone-700">Department / Branch Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bachelor of Business Administration"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      />
                    </div>

                    {/* Department Code */}
                    <div className="space-y-1">
                      <label className="font-semibold text-stone-700">Code / Abbr *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BBA"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 uppercase font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Degree Program & Duration Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-stone-700">Degree Level</label>
                      <select
                        value={formData.degree_type}
                        onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      >
                        {DEGREE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-stone-700">Duration (Years)</label>
                      <select
                        value={formData.duration_years}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      >
                        <option value={1}>1 Year (e.g. PG Diploma)</option>
                        <option value={2}>2 Years (e.g. MBA, MTech)</option>
                        <option value={3}>3 Years (e.g. BBA, BCA, BSc)</option>
                        <option value={4}>4 Years (e.g. BTech, BPharm)</option>
                        <option value={5}>5 Years (e.g. MBBS, BArch)</option>
                        <option value={6}>6 Years (e.g. Dual PhD)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-stone-700">Total Semesters</label>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        required
                        value={formData.total_semesters}
                        onChange={(e) => setFormData({ ...formData, total_semesters: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* Dynamic Sections Configuration */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-stone-700 text-xs">Active Class Sections</label>
                      <span className="text-[11px] text-stone-400">Click a preset or type custom sections</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'A (1 Sec)', val: 'A' },
                        { label: 'A, B (2 Sec)', val: 'A, B' },
                        { label: 'A, B, C (3 Sec)', val: 'A, B, C' },
                        { label: 'A to D (4 Sec)', val: 'A, B, C, D' },
                        { label: 'A to E (5 Sec)', val: 'A, B, C, D, E' },
                        { label: 'A to F (6 Sec)', val: 'A, B, C, D, E, F' }
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, sections: preset.val })}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
                            formData.sections === preset.val
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. A, B, C, D or custom names"
                      value={formData.sections}
                      onChange={(e) => setFormData({ ...formData, sections: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-900 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-stone-400 transition"
                    />
                  </div>

                  {/* Appointed HOD Details */}
                  <div className="border-t border-stone-100 pt-3 space-y-3">
                    <span className="text-[11px] font-bold uppercase text-stone-400 tracking-wider block">
                      Appointed Leadership & Contact
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-stone-600 font-medium">HOD Name</label>
                        <input
                          type="text"
                          placeholder="Prof. Rajesh Sharma"
                          value={formData.hod_name}
                          onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-stone-600 font-medium">HOD Email</label>
                        <input
                          type="email"
                          placeholder="hod.bba@campus.edu"
                          value={formData.hod_email}
                          onChange={(e) => setFormData({ ...formData, hod_email: e.target.value })}
                          className="w-full px-3 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-stone-600 font-medium">HOD Phone</label>
                        <input
                          type="text"
                          placeholder="+91 98765 43210"
                          value={formData.hod_phone}
                          onChange={(e) => setFormData({ ...formData, hod_phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rank & Overview */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-stone-600 font-medium">Accreditation / Department Status</label>
                      <input
                        type="text"
                        placeholder="e.g. Tier 1 (NBA Accredited) or UGC Recognized"
                        value={formData.rank}
                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-stone-600 font-medium">Department Description (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Key academic focuses, specialized laboratory facilities, or curriculum notes..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="border-t border-stone-100 pt-4 flex items-center justify-end space-x-2.5">
                    <button
                      type="button"
                      disabled={modalLoading}
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-black text-white font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {modalLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>{isEditMode ? 'Save Changes' : 'Create Department'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* DELETE CONFIRMATION DIALOG                                         */}
        {/* ------------------------------------------------------------------ */}
        <AnimatePresence>
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 space-y-4"
              >
                <div className="flex items-center space-x-3 text-rose-600">
                  <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Delete Department</h3>
                    <p className="text-xs text-stone-500">{deleteTarget.name} ({deleteTarget.code})</p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to delete this department? This will remove the branch configuration from institutional lists and attendance portals.
                </p>

                {(deleteTarget.students > 0 || deleteError) && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      Warning: {deleteTarget.students} student(s) currently registered under this department.
                    </p>
                    <label className="flex items-center space-x-2 text-xs text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteForce}
                        onChange={(e) => setDeleteForce(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Force delete anyway (students will remain in database with archived branch tag)</span>
                    </label>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    disabled={deleteLoading}
                    onClick={() => {
                      setDeleteTarget(null);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-2xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteLoading || (deleteTarget.students > 0 && !deleteForce)}
                    onClick={handleDeleteConfirm}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {deleteLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppleDeluxeShell>
  );
}
