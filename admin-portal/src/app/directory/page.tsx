'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  BookOpen, 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRightLeft,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';

type TabType = 'hods' | 'teachers' | 'students' | 'subjects';

export default function DirectoryManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('hods');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data stores
  const [hods, setHods] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Modal states
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Batch Promotion Modal States
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteBranch, setPromoteBranch] = useState('all');
  const [isPromoting, setIsPromoting] = useState(false);

  // Faculty Handover / Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromTeacher, setTransferFromTeacher] = useState<number | null>(null);
  const [transferToTeacher, setTransferToTeacher] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState<any>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTransferClasses = async () => {
    if (!transferFromTeacher || !transferToTeacher) {
      showToast("Please select both outgoing and replacement faculty.");
      return;
    }
    if (transferFromTeacher === transferToTeacher) {
      showToast("Outgoing and replacement faculty cannot be the same person.");
      return;
    }
    try {
      setIsTransferring(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_BASE_URL}/management/crud/teachers/transfer-classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          from_teacher_id: transferFromTeacher,
          to_teacher_id: transferToTeacher
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setShowTransferModal(false);
        fetchAllData();
      } else {
        showToast("Class transfer failed. Please check faculty records.");
      }
    } catch {
      showToast("Network error during class transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleBatchPromotion = async () => {
    try {
      setIsPromoting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_BASE_URL}/management/crud/students/batch-promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch: promoteBranch,
          promote_mode: 'annual',
          academic_year: '2026-2027'
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setShowPromoteModal(false);
        fetchAllData();
      } else {
        showToast("Batch promotion failed. Please verify records.");
      }
    } catch {
      showToast("Network error during batch promotion.");
    } finally {
      setIsPromoting(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resHods, resTeachers, resStudents, resSubjects] = await Promise.all([
        fetch(`${API_BASE_URL}/management/crud/hods`, { headers }),
        fetch(`${API_BASE_URL}/management/crud/teachers`, { headers }),
        fetch(`${API_BASE_URL}/management/crud/students`, { headers }),
        fetch(`${API_BASE_URL}/management/crud/subjects`, { headers }),
      ]);

      if (resHods.ok) setHods((await resHods.json()).hods || []);
      if (resTeachers.ok) setTeachers((await resTeachers.json()).teachers || []);
      if (resStudents.ok) {
        const stds = (await resStudents.json()).students || [];
        stds.sort((a: any, b: any) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true, sensitivity: 'base' }));
        setStudents(stds);
      }
      if (resSubjects.ok) setSubjects((await resSubjects.json()).subjects || []);
    } catch {
      console.log("Error fetching directory records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEntity(null);
    if (activeTab === 'hods') {
      setFormData({ full_name: '', email: '', department: 'Computer Science', password: 'AdminPass123!' });
    } else if (activeTab === 'teachers') {
      setFormData({ full_name: '', email: '', department: 'Computer Science', password: 'TeacherPass123!' });
    } else if (activeTab === 'students') {
      setFormData({ full_name: '', roll_number: '', branch: 'Computer Science', semester: 6, section: 'A', email: '' });
    } else if (activeTab === 'subjects') {
      setFormData({ code: '', name: '', branch: 'Computer Science', semester: 6 });
    }
  };

  const openEditModal = (item: any) => {
    setModalMode('edit');
    setSelectedEntity(item);
    setFormData({ ...item });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedEntity(null);
    setFormData({});
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      let endpoint = `${API_BASE_URL}/management/crud/${activeTab}`;
      let method = 'POST';

      if (modalMode === 'edit') {
        method = 'PUT';
        const targetId = activeTab === 'hods' ? selectedEntity.id : (activeTab === 'teachers' ? selectedEntity.id : (activeTab === 'students' ? selectedEntity.id : selectedEntity.id));
        endpoint = `${API_BASE_URL}/management/crud/${activeTab}/${targetId}`;
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast(modalMode === 'create' ? `Successfully added new record to ${activeTab.toUpperCase()}!` : `Updated record successfully!`);
        closeModal();
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.detail || "Operation failed.");
      }
    } catch (err: any) {
      alert("Error contacting management API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from ${activeTab.toUpperCase()}? This action is immediate.`)) {
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    try {
      const res = await fetch(`${API_BASE_URL}/management/crud/${activeTab}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Deleted ${name} successfully.`);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete.");
      }
    } catch {
      alert("Error deleting record.");
    }
  };

  // Filtered lists for active tab
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'hods') {
      return hods.filter(h => h.full_name?.toLowerCase().includes(q) || h.email?.toLowerCase().includes(q) || h.department?.toLowerCase().includes(q));
    }
    if (activeTab === 'teachers') {
      return teachers.filter(t => t.full_name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.department?.toLowerCase().includes(q));
    }
    if (activeTab === 'students') {
      return students.filter(s => s.full_name?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q) || s.branch?.toLowerCase().includes(q));
    }
    if (activeTab === 'subjects') {
      return subjects.filter(sub => sub.code?.toLowerCase().includes(q) || sub.name?.toLowerCase().includes(q) || sub.branch?.toLowerCase().includes(q));
    }
    return [];
  }, [activeTab, searchQuery, hods, teachers, students, subjects]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-stone-900 text-white shadow-xl border border-stone-800 text-xs flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </AnimatePresence>

      {/* Header Container */}
      <header className="rounded-[2rem] bg-white border border-stone-200/70 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
              Authority Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Academic Directory & Records</h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Create, manage, edit, and decommission Department Heads (HODs), Faculty, Students, and Curriculum Subjects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button 
            onClick={fetchAllData}
            className="p-3 rounded-2xl bg-stone-100/80 hover:bg-stone-200/80 text-stone-600 transition"
            title="Refresh All Records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          {activeTab === 'students' && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200/80 text-violet-700 text-xs font-bold transition flex items-center space-x-2"
              title="Promote all students to next academic year & archive final year"
            >
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span>Batch Progression</span>
            </button>
          )}

          {activeTab === 'teachers' && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200/80 text-indigo-700 text-xs font-bold transition flex items-center space-x-2"
              title="Transfer classes and academic sessions to a replacement teacher"
            >
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              <span>Handover Classes</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="py-2.5 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New {activeTab === 'hods' ? 'HOD' : (activeTab === 'teachers' ? 'Teacher' : (activeTab === 'students' ? 'Student' : 'Subject'))}</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation (Apple Pill Style) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setActiveTab('hods')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'hods'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200/70 text-stone-600 hover:text-stone-900 shadow-sm'
          }`}
        >
          <Building2 className="h-4 w-4 text-indigo-400" />
          <span>Department HODs</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px]">{hods.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'teachers'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200/70 text-stone-600 hover:text-stone-900 shadow-sm'
          }`}
        >
          <UserCheck className="h-4 w-4 text-violet-400" />
          <span>Teachers & Faculty</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px]">{teachers.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'students'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200/70 text-stone-600 hover:text-stone-900 shadow-sm'
          }`}
        >
          <GraduationCap className="h-4 w-4 text-sky-400" />
          <span>Students Roster</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px]">{students.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'subjects'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200/70 text-stone-600 hover:text-stone-900 shadow-sm'
          }`}
        >
          <BookOpen className="h-4 w-4 text-amber-400" />
          <span>Classes & Subjects</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px]">{subjects.length}</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="rounded-[2rem] bg-white border border-stone-200/70 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-6">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
          <div className="relative w-full sm:w-96">
            <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeTab} by name, roll no, email...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-full pl-10 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="text-xs text-stone-500">
            Showing <span className="text-stone-900 font-bold">{filteredList.length}</span> verified entries
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-6 w-6 text-purple-400 animate-spin" />
            <span>Loading database records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm space-y-2">
            <AlertCircle className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No records found for this query.</p>
            <p className="text-xs text-slate-500">Click the "+ Add New" button to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. HOD TABLE */}
            {activeTab === 'hods' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">HOD Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredList.map((h) => (
                    <tr key={h.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-xl bg-violet-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-violet-700" />
                        </div>
                        <span>{h.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-200/60 text-violet-700 font-semibold text-xs">
                          {h.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-500">{h.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${h.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                          {h.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(h)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                          title="Edit HOD"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(h.id, h.full_name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                          title="Delete HOD"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. TEACHER TABLE */}
            {activeTab === 'teachers' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredList.map((t) => (
                    <tr key={t.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-xl bg-sky-100 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-sky-700" />
                        </div>
                        <span>{t.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-semibold">{t.department}</td>
                      <td className="py-3.5 px-4 font-mono text-stone-500">{t.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                          {t.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.full_name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. STUDENT TABLE */}
            {activeTab === 'students' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class & Section</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Biometric Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredList.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{s.roll_number}</td>
                      <td className="py-3.5 px-4 font-medium text-stone-900 flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                          {s.full_name.charAt(0)}
                        </div>
                        <span>{s.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                          Sem {s.semester} • Sec {s.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-medium">{s.branch}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          s.has_face_encoding
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}>
                          {s.has_face_encoding ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          <span>{s.has_face_encoding ? 'Biometrics Enrolled' : 'Pending Selfie'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. SUBJECTS TABLE */}
            {activeTab === 'subjects' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Subject Title</th>
                    <th className="py-3 px-4">Academic Semester</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{sub.code}</td>
                      <td className="py-3.5 px-4 font-medium text-stone-900">{sub.name}</td>
                      <td className="py-3.5 px-4 text-stone-600">Semester {sub.semester}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[11px]">
                          {sub.branch}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(sub)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        )}
      </div>

      {/* CRUD Modal Form */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {modalMode === 'create' ? 'Add New' : 'Edit'} {activeTab === 'hods' ? 'HOD' : (activeTab === 'teachers' ? 'Faculty Member' : (activeTab === 'students' ? 'Student Record' : 'Subject'))}
                  </h3>
                  <p className="text-xs text-stone-500">Institutional Database Operation</p>
                </div>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* HOD FORM */}
                {activeTab === 'hods' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">HOD Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="Dr. Rajesh Sharma"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Institutional Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="hod.cse@college.edu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Department Authority</label>
                      <select
                        value={formData.department || 'Computer Science'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                      >
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Electrical">Electrical</option>
                      </select>
                    </div>
                    {modalMode === 'create' && (
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Temporary Password</label>
                        <input
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                          placeholder="AdminPass123!"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* TEACHER FORM */}
                {activeTab === 'teachers' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Faculty Name</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="Prof. Priya Nair"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="teacher@college.edu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Department</label>
                      <select
                        value={formData.department || 'Computer Science'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                      >
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                      </select>
                    </div>
                  </>
                )}

                {/* STUDENT FORM */}
                {activeTab === 'students' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Roll Number</label>
                        <input
                          type="text"
                          required
                          value={formData.roll_number || ''}
                          onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
                          placeholder="23CSE001"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Student Name</label>
                        <input
                          type="text"
                          required
                          value={formData.full_name || ''}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                          placeholder="Rahul Verma"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Semester</label>
                        <select
                          value={formData.semester || 6}
                          onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        >
                          <option value="2">Sem 2</option>
                          <option value="4">Sem 4</option>
                          <option value="6">Sem 6</option>
                          <option value="8">Sem 8</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Section</label>
                        <select
                          value={formData.section || 'A'}
                          onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        >
                          <option value="A">Sec A</option>
                          <option value="B">Sec B</option>
                          <option value="C">Sec C</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Branch</label>
                        <input
                          type="text"
                          value={formData.branch || 'Computer Science'}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* SUBJECT FORM */}
                {activeTab === 'subjects' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Course Code</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="CS405"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-stone-700 font-semibold">Course Title</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        placeholder="Cloud Computing & DevOps"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Semester</label>
                        <select
                          value={formData.semester || 6}
                          onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        >
                          <option value="2">Semester 2</option>
                          <option value="4">Semester 4</option>
                          <option value="6">Semester 6</option>
                          <option value="8">Semester 8</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-stone-700 font-semibold">Branch</label>
                        <input
                          type="text"
                          value={formData.branch || 'Computer Science'}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{modalMode === 'create' ? 'Save Record' : 'Apply Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Annual Batch Progression Modal */}
        {showPromoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPromoteModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-stone-100 text-stone-400 hover:text-stone-800 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Annual Academic Progression</h3>
                  <p className="text-xs text-stone-500">Promote entire college/branch to next academic year</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-700 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
                <p className="font-semibold text-amber-900">How Academic Progression Works:</p>
                <ul className="space-y-1.5 list-disc list-inside text-stone-600">
                  <li><strong className="text-stone-900">1st Year (Sem 1/2)</strong> &rarr; Promoted to 2nd Year (Sem 3/4)</li>
                  <li><strong className="text-stone-900">2nd Year (Sem 3/4)</strong> &rarr; Promoted to 3rd Year (Sem 5/6)</li>
                  <li><strong className="text-stone-900">3rd Year (Sem 5/6)</strong> &rarr; Promoted to 4th Year (Sem 7/8)</li>
                  <li><strong className="text-stone-900">4th Year (Sem 7/8)</strong> &rarr; Archived as <span className="text-emerald-700 font-bold">Graduated Alumni</span> (Historical attendance logs & biometrics preserved permanently).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700">Select Target Department</label>
                <select
                  value={promoteBranch}
                  onChange={(e) => setPromoteBranch(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="all">All Departments (Entire College)</option>
                  <option value="Computer Science">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics">Electronics & Communication</option>
                  <option value="Mechanical">Mechanical Engineering</option>
                  <option value="Civil">Civil Engineering</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPromoting}
                  onClick={handleBatchPromotion}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  {isPromoting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  <span>{isPromoting ? 'Promoting...' : 'Execute Annual Progression'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Faculty Handover & Class Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowTransferModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-stone-100 text-stone-400 hover:text-stone-800 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Faculty Handover & Class Transfer</h3>
                  <p className="text-xs text-stone-500">Reassign academic sessions from outgoing to replacement teacher</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-700 bg-sky-50/50 p-4 rounded-2xl border border-sky-200/60">
                <p className="font-semibold text-sky-900">Class Handover Architecture:</p>
                <p className="text-stone-600 leading-relaxed">
                  When a teacher leaves or is replaced, their active subject timetable and academic sessions are instantly transferred to the new teacher. Past student attendance logs taken by the previous teacher remain untouched and audit-compliant.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-stone-700">Outgoing / Leaving Faculty</label>
                  <select
                    value={transferFromTeacher || ''}
                    onChange={(e) => setTransferFromTeacher(parseInt(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="">-- Select Outgoing Faculty --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-stone-700">Incoming Replacement Faculty</label>
                  <select
                    value={transferToTeacher || ''}
                    onChange={(e) => setTransferToTeacher(parseInt(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="">-- Select Replacement Faculty --</option>
                    {teachers
                      .filter((t) => t.id !== transferFromTeacher)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.department})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={handleTransferClasses}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  {isTransferring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                  <span>{isTransferring ? 'Transferring...' : 'Execute Class Handover'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
