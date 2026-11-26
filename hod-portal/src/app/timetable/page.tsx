'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Upload,
  Download,
  BookOpen,
  UserCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  X,
  ArrowLeft,
} from 'lucide-react';
import { API_BASE_URL, authFetchWithRetry } from '@/lib/api';
import AppleDeluxeShell from '@/components/AppleDeluxeShell';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_PRESETS = [30, 40, 45, 50, 60, 75, 90, 120, 180];

function parseTimeStrToMinutes(tStr: string): number | null {
  if (!tStr) return null;
  const s = tStr.trim().toUpperCase();
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const mer = ampmMatch[3];
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (mer === 'AM') {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return h * 60 + m;
  }
  const h24Match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const h = parseInt(h24Match[1], 10);
    const m = parseInt(h24Match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  return null;
}

function formatMinutesToTimeStr(totalMins: number): string {
  const norm = ((Math.round(totalMins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(norm / 60);
  const mins = norm % 60;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${mer}`;
}

function addMinutesToTimeStr(startTime: string, durationMins: number): string | null {
  const start = parseTimeStrToMinutes(startTime);
  if (start === null || !Number.isFinite(durationMins) || durationMins <= 0) return null;
  return formatMinutesToTimeStr(start + durationMins);
}

export default function HODTimetablePage() {
  const [branches, setBranches] = useState<string[]>([]);
  const [branchPrograms, setBranchPrograms] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<string[]>(['A', 'B', 'C']);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [selectedBranch, setSelectedBranch] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('hod_department') || '' : ''
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(3);
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [selectedDayTab, setSelectedDayTab] = useState<string>('Monday');

  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [loadingTt, setLoadingTt] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bell Schedule / Default Duration Policy States
  const [defaultLectureMins, setDefaultLectureMins] = useState<number>(60);
  const [defaultLabMins, setDefaultLabMins] = useState<number>(120);
  const [defaultTutorialMins, setDefaultTutorialMins] = useState<number>(60);
  const [dayStartTime, setDayStartTime] = useState<string>('09:00 AM');
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [resequenceTimes, setResequenceTimes] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Add / Edit Slot Modal States
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotDay, setSlotDay] = useState<string>('Monday');
  const [slotType, setSlotType] = useState<string>('lecture');
  const [slotIndex, setSlotIndex] = useState<number>(1);
  const [slotStartTime, setSlotStartTime] = useState<string>('09:00 AM');
  const [slotEndTime, setSlotEndTime] = useState<string>('10:00 AM');
  const [slotDurationMins, setSlotDurationMins] = useState<number>(60);
  const [slotSubjectId, setSlotSubjectId] = useState<string>('');
  const [slotCustomSubject, setSlotCustomSubject] = useState<string>('');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('');
  const [slotCustomTeacher, setSlotCustomTeacher] = useState<string>('');
  const [slotRoom, setSlotRoom] = useState<string>('LH-101');
  const [slotSubBatch, setSlotSubBatch] = useState<string>('All');
  const [savingSlot, setSavingSlot] = useState<boolean>(false);

  // Bulk CSV Upload Modal States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState<boolean>(false);

  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSlotModalOpen || isCsvModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSlotModalOpen, isCsvModalOpen]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const availableSemesters = useMemo(() => {
    const bp = branchPrograms[selectedBranch];
    if (bp && Array.isArray(bp.semesters) && bp.semesters.length > 0) return bp.semesters as number[];
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, [branchPrograms, selectedBranch]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(
      (s) =>
        (!selectedBranch ||
          (s.branch || '').toLowerCase().includes(selectedBranch.toLowerCase()) ||
          selectedBranch.toLowerCase().includes((s.branch || '').toLowerCase())) &&
        (!selectedSemester || s.semester === selectedSemester)
    );
  }, [subjects, selectedBranch, selectedSemester]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metaRes, subjRes, teachRes] = await Promise.all([
          authFetchWithRetry(`${API_BASE_URL}/attendance/departments-meta`),
          authFetchWithRetry(`${API_BASE_URL}/management/crud/subjects`),
          authFetchWithRetry(`${API_BASE_URL}/management/crud/teachers`),
        ]);
        if (metaRes.ok) {
          const m = await metaRes.json();
          if (Array.isArray(m.branches) && m.branches.length > 0) {
            setBranches(m.branches);
            setSelectedBranch((prev) => {
              if (prev && m.branches.includes(prev)) return prev;
              const match = prev
                ? m.branches.find(
                    (b: string) =>
                      b.toLowerCase().includes(prev.toLowerCase()) ||
                      prev.toLowerCase().includes(b.toLowerCase())
                  )
                : null;
              return match || m.branches[0];
            });
          }
          if (m.branch_programs) setBranchPrograms(m.branch_programs);
          if (Array.isArray(m.sections) && m.sections.length > 0) setSections(m.sections);
          if (Array.isArray(m.subjects) && m.subjects.length > 0) setSubjects(m.subjects);
        }
        if (subjRes.ok) {
          const sj = await subjRes.json();
          if (Array.isArray(sj.subjects) && sj.subjects.length > 0) setSubjects(sj.subjects);
        }
        if (teachRes.ok) {
          const tj = await teachRes.json();
          if (Array.isArray(tj.teachers)) setTeachers(tj.teachers);
        }
      } catch {
        showNotice('error', 'Unable to load academic metadata.');
      }
    };
    loadMetadata();
  }, []);

  const fetchConfigAndTimetable = async (branchVal = selectedBranch, semVal = selectedSemester, secVal = selectedSection) => {
    if (!branchVal) return;
    setLoadingTt(true);
    try {
      const [cfgRes, ttRes] = await Promise.all([
        authFetchWithRetry(`${API_BASE_URL}/timetable/config?branch=${encodeURIComponent(branchVal)}`),
        authFetchWithRetry(
          `${API_BASE_URL}/timetable/weekly?branch=${encodeURIComponent(branchVal)}&semester=${semVal}&section=${encodeURIComponent(secVal)}`
        ),
      ]);
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setDefaultLectureMins(Number(cfg.default_lecture_minutes) || 60);
        setDefaultLabMins(Number(cfg.default_lab_minutes) || 120);
        setDefaultTutorialMins(Number(cfg.default_tutorial_minutes) || 60);
        if (cfg.day_start_time) setDayStartTime(cfg.day_start_time);
        setBreakMinutes(Number(cfg.break_minutes) || 0);
      }
      if (ttRes.ok) {
        const tt = await ttRes.json();
        setSchedule(tt.schedule || {});
      }
    } catch {
      showNotice('error', 'Failed to sync timetable from backend.');
    } finally {
      setLoadingTt(false);
    }
  };

  useEffect(() => {
    fetchConfigAndTimetable();
  }, [selectedBranch, selectedSemester, selectedSection]);

  const handleSaveConfig = async (applyToExisting: boolean) => {
    if (!selectedBranch) return;
    setSavingConfig(true);
    try {
      const res = await authFetchWithRetry(`${API_BASE_URL}/timetable/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: selectedBranch,
          default_lecture_minutes: Math.max(10, Math.min(360, Number(defaultLectureMins) || 60)),
          default_lab_minutes: Math.max(15, Math.min(480, Number(defaultLabMins) || 120)),
          default_tutorial_minutes: Math.max(10, Math.min(360, Number(defaultTutorialMins) || 60)),
          day_start_time: dayStartTime.trim() || '09:00 AM',
          break_minutes: Math.max(0, Math.min(120, Number(breakMinutes) || 0)),
          apply_to_existing_slots: applyToExisting,
          resequence_times: applyToExisting ? resequenceTimes : false,
          semester: applyToExisting ? selectedSemester : null,
          section: applyToExisting ? selectedSection : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotice('success', data.message || `Default lecture duration saved (${defaultLectureMins} min).`);
        fetchConfigAndTimetable();
      } else {
        showNotice('error', data.detail || 'Could not update lecture duration policy.');
      }
    } catch {
      showNotice('error', 'Network error while saving duration policy.');
    } finally {
      setSavingConfig(false);
    }
  };

  const openAddModal = (day: string = selectedDayTab) => {
    const existingCount = (schedule[day] || []).length;
    const prevSlot = existingCount > 0 ? schedule[day][existingCount - 1] : null;
    let nextStart = dayStartTime || '09:00 AM';
    if (prevSlot?.end_time) {
      const shifted = addMinutesToTimeStr(prevSlot.end_time, breakMinutes);
      nextStart = shifted || prevSlot.end_time;
    }
    const initDur = defaultLectureMins || 60;
    setEditingSlotId(null);
    setSlotDay(day);
    setSlotType('lecture');
    setSlotIndex(existingCount + 1);
    setSlotDurationMins(initDur);
    setSlotStartTime(nextStart);
    setSlotEndTime(addMinutesToTimeStr(nextStart, initDur) || '10:00 AM');
    setSlotSubjectId('');
    setSlotCustomSubject('');
    setSlotTeacherId('');
    setSlotCustomTeacher('');
    setSlotRoom('LH-101');
    setSlotSubBatch('All');
    setIsSlotModalOpen(true);
  };

  const openEditModal = (slot: any) => {
    const dur = Number(slot.duration_minutes) || 60;
    setEditingSlotId(slot.id);
    setSlotDay(slot.day_of_week || selectedDayTab);
    setSlotType(slot.session_type || 'lecture');
    setSlotIndex(Number(slot.slot_index) || 1);
    setSlotDurationMins(dur);
    setSlotStartTime(slot.start_time || '09:00 AM');
    setSlotEndTime(slot.end_time || addMinutesToTimeStr(slot.start_time || '09:00 AM', dur) || '10:00 AM');
    setSlotSubjectId(slot.subject_id ? String(slot.subject_id) : '');
    setSlotCustomSubject(slot.subject_id ? '' : slot.subject_name || '');
    setSlotTeacherId(slot.teacher_id ? String(slot.teacher_id) : '');
    setSlotCustomTeacher(slot.teacher_id ? '' : slot.teacher_name || '');
    setSlotRoom(slot.room_number || 'LH-101');
    setSlotSubBatch(slot.sub_batch || 'All');
    setIsSlotModalOpen(true);
  };

  const updateModalDuration = (mins: number) => {
    const valid = Math.max(10, Math.min(480, Math.round(mins)));
    setSlotDurationMins(valid);
    const nextEnd = addMinutesToTimeStr(slotStartTime, valid);
    if (nextEnd) setSlotEndTime(nextEnd);
  };

  const updateModalStartTime = (val: string) => {
    setSlotStartTime(val);
    const nextEnd = addMinutesToTimeStr(val, slotDurationMins);
    if (nextEnd) setSlotEndTime(nextEnd);
  };

  const updateModalEndTime = (val: string) => {
    setSlotEndTime(val);
    const s = parseTimeStrToMinutes(slotStartTime);
    const e = parseTimeStrToMinutes(val);
    if (s !== null && e !== null && e > s) {
      setSlotDurationMins(e - s);
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setSavingSlot(true);
    try {
      const selectedSub = filteredSubjects.find((s) => String(s.id) === slotSubjectId);
      const selectedTeach = teachers.find((t) => String(t.id) === slotTeacherId);
      const isPractical = slotType === 'practical' || slotType === 'lab';
      const payload = {
        branch: selectedBranch,
        semester: selectedSemester,
        section: selectedSection,
        day_of_week: slotDay,
        slot_index: Number(slotIndex) || 1,
        start_time: slotStartTime.trim(),
        end_time: slotEndTime.trim(),
        duration_minutes: Math.max(10, Math.min(480, Number(slotDurationMins) || 60)),
        subject_id: slotSubjectId ? Number(slotSubjectId) : null,
        custom_subject_name: slotCustomSubject.trim() || selectedSub?.name || 'Classroom Lecture',
        teacher_id: slotTeacherId ? Number(slotTeacherId) : null,
        custom_teacher_name: slotCustomTeacher.trim() || selectedTeach?.full_name || 'Faculty Coordinator',
        room_number: slotRoom.trim() || 'LH-101',
        session_type: slotType,
        sub_batch: isPractical ? slotSubBatch : 'All',
      };
      const url = editingSlotId ? `${API_BASE_URL}/timetable/slot/${editingSlotId}` : `${API_BASE_URL}/timetable/slot`;
      const method = editingSlotId ? 'PUT' : 'POST';
      const res = await authFetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotice('success', data.message || `Slot saved (${slotDurationMins} min).`);
        setIsSlotModalOpen(false);
        setSelectedDayTab(slotDay);
        fetchConfigAndTimetable();
      } else {
        showNotice('error', data.detail || 'Could not save timetable slot.');
      }
    } catch {
      showNotice('error', 'Network error saving timetable slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Remove this class slot from the weekly timetable?')) return;
    try {
      const res = await authFetchWithRetry(`${API_BASE_URL}/timetable/slot/${slotId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotice('success', 'Timetable slot removed.');
        fetchConfigAndTimetable();
      } else {
        showNotice('error', 'Failed to delete timetable slot.');
      }
    } catch {
      showNotice('error', 'Network error removing slot.');
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !selectedBranch) return;
    setUploadingCsv(true);
    try {
      const fd = new FormData();
      fd.append('branch', selectedBranch);
      fd.append('semester', String(selectedSemester));
      fd.append('section', selectedSection);
      fd.append('file', csvFile);
      const res = await authFetchWithRetry(`${API_BASE_URL}/timetable/bulk-csv`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotice('success', data.message || 'CSV timetable imported.');
        setIsCsvModalOpen(false);
        setCsvFile(null);
        fetchConfigAndTimetable();
      } else {
        showNotice('error', data.detail || 'Bulk CSV import failed.');
      }
    } catch {
      showNotice('error', 'Network error uploading CSV.');
    } finally {
      setUploadingCsv(false);
    }
  };

  return (
    <AppleDeluxeShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Department Dashboard</span>
          </Link>
          <button
            onClick={() => fetchConfigAndTimetable()}
            disabled={loadingTt}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-stone-200 bg-white text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingTt ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh Timetable</span>
          </button>
        </div>

        {notice && (
          <div
            className={`rounded-2xl border p-4 flex items-center justify-between text-xs font-semibold shadow-sm ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-stone-400 hover:text-stone-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 1. LECTURE DURATION & BELL SCHEDULE POLICY CARD */}
        <div className="rounded-3xl bg-white border border-stone-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-4">
            <div className="flex items-start space-x-3">
              <div className="h-11 w-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-stone-900">
                  Lecture Duration & Timetable Manager
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set standard lecture length (e.g. 40, 45, 50, 60 min or any custom minutes) and configure weekly schedules.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-bold">
              Active Default: {defaultLectureMins} min / lecture
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
            <div className="lg:col-span-6 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Standard Lecture Duration (Minutes)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[30, 40, 45, 50, 60, 75, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDefaultLectureMins(mins)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      defaultLectureMins === mins
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
                <div className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-stone-500">Custom:</span>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={defaultLectureMins}
                    onChange={(e) => setDefaultLectureMins(parseInt(e.target.value, 10) || 40)}
                    className="w-14 bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-900 text-center"
                  />
                  <span className="text-[11px] font-semibold text-stone-500">min</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Lab Duration (min)
              </label>
              <input
                type="number"
                min={15}
                max={480}
                value={defaultLabMins}
                onChange={(e) => setDefaultLabMins(parseInt(e.target.value, 10) || 120)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                First Slot Starts
              </label>
              <input
                type="text"
                value={dayStartTime}
                onChange={(e) => setDayStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Break (min)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
            <label className="inline-flex items-center space-x-2 text-xs text-stone-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={resequenceTimes}
                onChange={(e) => setResequenceTimes(e.target.checked)}
                className="rounded border-stone-300 text-stone-900"
              />
              <span>Auto-shift consecutive slot timings from {dayStartTime} (+{breakMinutes}m break) when applying to existing slots</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={savingConfig || !selectedBranch}
                onClick={() => handleSaveConfig(false)}
                className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition disabled:opacity-50"
              >
                Save Default Duration
              </button>
              <button
                type="button"
                disabled={savingConfig || !selectedBranch}
                onClick={() => handleSaveConfig(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{savingConfig ? 'Applying...' : 'Save & Apply to Existing Timetable'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. CLASS FILTERS & ACTIONS */}
        <div className="rounded-3xl bg-white border border-stone-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <span>Weekly Section Schedule</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Add individual lecture/lab periods or bulk upload via CSV. Changes sync live with Teacher & Student Portals.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openAddModal(selectedDayTab)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Class Slot</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-bold shadow-sm transition"
              >
                <Upload className="h-4 w-4 text-stone-600" />
                <span>Bulk CSV</span>
              </button>
              <a
                href={`${API_BASE_URL}/timetable/template-csv`}
                download="department_timetable_template.csv"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold transition"
              >
                <Download className="h-4 w-4" />
                <span>Template CSV</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Department / Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
              >
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
              >
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DAYS_ORDER.map((day) => {
              const count = schedule[day]?.length || 0;
              const active = selectedDayTab === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayTab(day)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 ${
                    active
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>{day}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      active ? 'bg-stone-700 text-stone-200' : 'bg-white text-stone-500 border border-stone-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slot Grid */}
          {loadingTt ? (
            <div className="p-10 text-center rounded-2xl bg-stone-50 border border-stone-200/70">
              <RefreshCw className="h-6 w-6 text-stone-400 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-500">
                Loading {selectedBranch} Sem {selectedSemester}-{selectedSection} schedule...
              </p>
            </div>
          ) : !schedule[selectedDayTab] || schedule[selectedDayTab].length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70">
              <Clock className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-700">No slots configured for {selectedDayTab}</h3>
              <p className="text-xs text-stone-500 mt-1">
                Add classes manually (with {defaultLectureMins} min or any custom duration) or upload your weekly CSV.
              </p>
              <button
                type="button"
                onClick={() => openAddModal(selectedDayTab)}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add {selectedDayTab} Slot</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedule[selectedDayTab].map((slot: any) => (
                <div
                  key={slot.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-white p-5 transition shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold bg-white border border-stone-200 text-stone-800 px-2.5 py-1 rounded-xl">
                          <Clock className="h-3 w-3 text-teal-600" />
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800">
                          {slot.duration_minutes || 60} min
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600">
                        {slot.session_type}
                        {slot.sub_batch && slot.sub_batch !== 'All' ? ` • ${slot.sub_batch}` : ''}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5 mb-2">
                      <BookOpen className="h-4 w-4 text-stone-400 shrink-0" />
                      <span>{slot.subject_name}</span>
                    </h4>

                    <div className="space-y-1 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-semibold text-stone-700">{slot.teacher_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-mono text-[11px]">Room: {slot.room_number || 'LH-101'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-stone-400">Period #{slot.slot_index || 1}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(slot)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT SLOT (Portalled to document.body) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        isSlotModalOpen ? (
          <div className="fixed inset-0 z-[9999] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setIsSlotModalOpen(false)} />
            <div className="relative z-10 bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <span>{editingSlotId ? 'Edit Timetable Slot' : 'Add Timetable Class Slot'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 pt-4">
              <div className="text-[11px] font-semibold text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                Class: <span className="font-bold text-stone-900">{selectedBranch}</span> • Sem {selectedSemester} • Sec {selectedSection}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Day</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    {DAYS_ORDER.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Type</label>
                  <select
                    value={slotType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSlotType(next);
                      if (!editingSlotId) {
                        const targetDur = next === 'practical' ? defaultLabMins : (next === 'tutorial' ? defaultTutorialMins : defaultLectureMins);
                        updateModalDuration(targetDur);
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="practical">Practical / Lab</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Period #</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={slotIndex}
                    onChange={(e) => setSlotIndex(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              {/* Duration Quick Picker */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Lecture Duration (Auto-calculates End Time)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateModalDuration(mins)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                        slotDurationMins === mins
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                  <div className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1">
                    <input
                      type="number"
                      min={10}
                      max={480}
                      value={slotDurationMins}
                      onChange={(e) => updateModalDuration(parseInt(e.target.value, 10) || 50)}
                      className="w-12 bg-white border border-stone-200 rounded px-1 py-0.5 text-[11px] font-bold text-center text-stone-900"
                    />
                    <span className="text-[10px] font-bold text-stone-500">min</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={slotStartTime}
                    onChange={(e) => updateModalStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={slotEndTime}
                    onChange={(e) => updateModalEndTime(e.target.value)}
                    placeholder="09:50 AM"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Select Subject</label>
                  <select
                    value={slotSubjectId}
                    onChange={(e) => {
                      setSlotSubjectId(e.target.value);
                      if (e.target.value) setSlotCustomSubject('');
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    <option value="">-- Custom / Manual Subject --</option>
                    {filteredSubjects.map((sub) => (
                      <option key={sub.id} value={String(sub.id)}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Or Type Subject Name</label>
                  <input
                    type="text"
                    required={!slotSubjectId}
                    value={slotCustomSubject}
                    onChange={(e) => {
                      setSlotCustomSubject(e.target.value);
                      if (e.target.value) setSlotSubjectId('');
                    }}
                    placeholder="e.g. Operating Systems"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Select Faculty</label>
                  <select
                    value={slotTeacherId}
                    onChange={(e) => {
                      setSlotTeacherId(e.target.value);
                      if (e.target.value) setSlotCustomTeacher('');
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    <option value="">-- Custom / Manual Faculty --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Or Type Faculty Name</label>
                  <input
                    type="text"
                    value={slotCustomTeacher}
                    onChange={(e) => {
                      setSlotCustomTeacher(e.target.value);
                      if (e.target.value) setSlotTeacherId('');
                    }}
                    placeholder="Faculty Full Name"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={slotRoom}
                    onChange={(e) => setSlotRoom(e.target.value)}
                    placeholder="LH-101"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Sub-Batch</label>
                  <select
                    value={slotSubBatch}
                    onChange={(e) => setSlotSubBatch(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                  >
                    {['All', 'A1', 'A2', 'A3', 'B1', 'B2'].map((sb) => (
                      <option key={sb} value={sb}>{sb}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingSlot ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null,
      document.body
    )}

      {/* MODAL: BULK CSV UPLOAD (Portalled to document.body) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        isCsvModalOpen ? (
          <div className="fixed inset-0 z-[9999] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="fixed inset-0" onClick={() => setIsCsvModalOpen(false)} />
            <div className="relative z-10 bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4 text-emerald-600" />
                  <span>Bulk Timetable Import (CSV)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCsvUpload} className="space-y-4 pt-4">
                <div className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1">
                  <p><strong>Target:</strong> {selectedBranch} — Sem {selectedSemester} (Sec {selectedSection})</p>
                  <p className="text-[10px] text-stone-500">
                    Columns: <code className="bg-white px-1 py-0.5 rounded border border-stone-200">day_of_week,slot_index,start_time,end_time,subject_name,teacher_name,room_number,session_type,duration_minutes</code>
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-900 file:text-white bg-stone-50 rounded-2xl p-2 border border-stone-200"
                />
                <div className="flex items-center justify-between pt-2">
                  <a
                    href={`${API_BASE_URL}/timetable/template-csv`}
                    download="department_timetable_template.csv"
                    className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Template CSV</span>
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCsvModalOpen(false)}
                      className="px-3 py-2 text-xs font-bold text-stone-600 hover:text-stone-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingCsv}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {uploadingCsv ? 'Importing...' : 'Upload & Sync'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </AppleDeluxeShell>
  );
}
