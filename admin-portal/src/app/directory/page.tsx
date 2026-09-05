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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 rounded-2xl bg-emerald-600 text-white px-5 py-3 shadow-2xl flex items-center space-x-2 text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/dashboard"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition mr-2"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold uppercase tracking-wider">
              College Authority Control Center
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Directory & CRUD Operations</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create, manage, edit, and decommission Department Heads (HODs), Faculty, Students, and Curriculum Subjects.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={fetchAllData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh All Records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {activeTab === 'students' && (
            <button
              onClick={() => setShowPromoteModal(true)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center space-x-2"
              title="Promote all students to next academic year & archive final year"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Annual Batch Progression</span>
            </button>
          )}

          {activeTab === 'teachers' && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center space-x-2"
              title="Transfer classes and academic sessions to a replacement teacher"
            >
              <ArrowRightLeft className="h-4 w-4 text-indigo-400" />
              <span>Handover Classes</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New {activeTab === 'hods' ? 'HOD' : (activeTab === 'teachers' ? 'Teacher' : (activeTab === 'students' ? 'Student' : 'Subject'))}</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveTab('hods')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'hods'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Department HODs</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px]">{hods.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'teachers'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Teachers & Faculty</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px]">{teachers.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'students'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Students Roster</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px]">{students.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'subjects'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Classes & Subjects</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px]">{subjects.length}</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="text-white font-bold">{filteredList.length}</span> entries
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
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">HOD Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-purple-400" />
                        <span>{h.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
                          {h.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{h.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {h.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(h)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Edit HOD"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(h.id, h.full_name)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
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
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-cyan-400" />
                        <span>{t.full_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{t.department}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{t.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {t.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.full_name)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
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
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class & Section</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Biometric Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{s.roll_number}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-100">{s.full_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-[11px]">
                          Sem {s.semester} • Sec {s.section}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{s.branch}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.has_face_encoding
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {s.has_face_encoding ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          <span>{s.has_face_encoding ? 'Biometrics Enrolled' : 'Pending Selfie'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
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
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Subject Title</th>
                    <th className="py-3 px-4">Academic Semester</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredList.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{sub.code}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-100">{sub.name}</td>
                      <td className="py-3.5 px-4 text-slate-300">Semester {sub.semester}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px]">
                          {sub.branch}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(sub)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
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
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {modalMode === 'create' ? 'Add New' : 'Edit'} {activeTab === 'hods' ? 'HOD' : (activeTab === 'teachers' ? 'Faculty Member' : (activeTab === 'students' ? 'Student Record' : 'Subject'))}
                  </h3>
                  <p className="text-xs text-slate-400">Institutional Database Operation</p>
                </div>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* HOD FORM */}
                {activeTab === 'hods' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">HOD Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        placeholder="Dr. Rajesh Sharma"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Institutional Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        placeholder="hod.cse@college.edu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Department Authority</label>
                      <select
                        value={formData.department || 'Computer Science'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
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
                        <label className="text-slate-300 font-semibold">Temporary Password</label>
                        <input
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
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
                      <label className="text-slate-300 font-semibold">Faculty Name</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        placeholder="Prof. Priya Nair"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        placeholder="teacher@college.edu"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Department</label>
                      <select
                        value={formData.department || 'Computer Science'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
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
                        <label className="text-slate-300 font-semibold">Roll Number</label>
                        <input
                          type="text"
                          required
                          value={formData.roll_number || ''}
                          onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                          placeholder="23CSE001"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Student Name</label>
                        <input
                          type="text"
                          required
                          value={formData.full_name || ''}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                          placeholder="Rahul Verma"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Semester</label>
                        <select
                          value={formData.semester || 6}
                          onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="2">Sem 2</option>
                          <option value="4">Sem 4</option>
                          <option value="6">Sem 6</option>
                          <option value="8">Sem 8</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Section</label>
                        <select
                          value={formData.section || 'A'}
                          onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="A">Sec A</option>
                          <option value="B">Sec B</option>
                          <option value="C">Sec C</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Branch</label>
                        <input
                          type="text"
                          value={formData.branch || 'Computer Science'}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* SUBJECT FORM */}
                {activeTab === 'subjects' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Course Code</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
                        placeholder="CS405"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Course Title</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        placeholder="Cloud Computing & DevOps"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Semester</label>
                        <select
                          value={formData.semester || 6}
                          onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="2">Semester 2</option>
                          <option value="4">Semester 4</option>
                          <option value="6">Semester 6</option>
                          <option value="8">Semester 8</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-300 font-semibold">Branch</label>
                        <input
                          type="text"
                          value={formData.branch || 'Computer Science'}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center space-x-1.5"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPromoteModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Annual Academic Progression</h3>
                  <p className="text-xs text-slate-400">Promote entire college/branch to next academic year</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <p className="font-semibold text-purple-300">How Academic Progression Works:</p>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                  <li><strong className="text-white">1st Year (Sem 1/2)</strong> &rarr; Promoted to 2nd Year (Sem 3/4)</li>
                  <li><strong className="text-white">2nd Year (Sem 3/4)</strong> &rarr; Promoted to 3rd Year (Sem 5/6)</li>
                  <li><strong className="text-white">3rd Year (Sem 5/6)</strong> &rarr; Promoted to 4th Year (Sem 7/8)</li>
                  <li><strong className="text-white">4th Year (Sem 7/8)</strong> &rarr; Archived as <span className="text-emerald-400 font-bold">Graduated Alumni</span> (Historical attendance logs & biometrics preserved permanently).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Select Target Department</label>
                <select
                  value={promoteBranch}
                  onChange={(e) => setPromoteBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPromoting}
                  onClick={handleBatchPromotion}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-bold transition flex items-center space-x-2"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowTransferModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Faculty Handover & Class Transfer</h3>
                  <p className="text-xs text-slate-400">Reassign academic sessions from outgoing to replacement teacher</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <p className="font-semibold text-indigo-300">Class Handover Architecture:</p>
                <p className="text-slate-400 leading-relaxed">
                  When a teacher leaves or is replaced, their active subject timetable and academic sessions are instantly transferred to the new teacher. Past student attendance logs taken by the previous teacher remain untouched and audit-compliant.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Outgoing / Leaving Faculty</label>
                  <select
                    value={transferFromTeacher || ''}
                    onChange={(e) => setTransferFromTeacher(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
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
                  <label className="font-semibold text-slate-300">Incoming Replacement Faculty</label>
                  <select
                    value={transferToTeacher || ''}
                    onChange={(e) => setTransferToTeacher(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={handleTransferClasses}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold transition flex items-center space-x-2"
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
