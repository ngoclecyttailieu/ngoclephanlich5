import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload, Check, X, UserCheck, BookOpen, Layers } from 'lucide-react';
import { AppDatabase, StudentClass, Subject, Teacher, TeachingAssignment } from '../types';
import { downloadExcelTemplate } from '../services/excelService';
import { ConfirmModal } from './ConfirmModal';

interface AssignmentManagementProps {
  db: AppDatabase;
  onSaveAssignment: (assignment: TeachingAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  onOpenTemplateImport: () => void;
}

export const AssignmentManagement: React.FC<AssignmentManagementProps> = ({
  db,
  onSaveAssignment,
  onDeleteAssignment,
  onOpenTemplateImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<TeachingAssignment | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<TeachingAssignment | null>(null);

  // Form states
  const [classId, setClassId] = useState(db.classes[0]?.id || '');
  const [subjectId, setSubjectId] = useState(db.subjects[0]?.id || '');
  const [theoryTeachers, setTheoryTeachers] = useState<string[]>([]);
  const [practiceTeachers, setPracticeTeachers] = useState<string[]>([]);
  const [clinicalTeachers, setClinicalTeachers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  const subjectMap = new Map<string, Subject>();
  db.subjects.forEach(s => subjectMap.set(s.id, s));

  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  const filteredAssignments = db.assignments.filter(a => {
    if (selectedClassId !== 'all' && a.classId !== selectedClassId) return false;
    const cls = classMap.get(a.classId);
    const sub = subjectMap.get(a.subjectId);
    if (searchTerm) {
      const match = `${cls?.name} ${sub?.name}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const resetForm = () => {
    setClassId(db.classes[0]?.id || '');
    setSubjectId(db.subjects[0]?.id || '');
    setTheoryTeachers([]);
    setPracticeTeachers([]);
    setClinicalTeachers([]);
    setNotes('');
    setIsEditing(false);
    setCurrentAssignment(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (a: TeachingAssignment) => {
    setCurrentAssignment(a);
    setClassId(a.classId);
    setSubjectId(a.subjectId);
    setTheoryTeachers(a.theoryTeacherIds || []);
    setPracticeTeachers(a.practiceTeacherIds || []);
    setClinicalTeachers(a.clinicalTeacherIds || []);
    setNotes(a.notes || '');
    setIsEditing(true);
  };

  const toggleTeacherInList = (list: string[], setList: (arr: string[]) => void, teacherId: string) => {
    if (list.includes(teacherId)) {
      setList(list.filter(id => id !== teacherId));
    } else {
      setList([...list, teacherId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asg: TeachingAssignment = {
      id: currentAssignment?.id || `asg_${classId}_${subjectId}_${Math.random().toString(36).substring(2, 7)}`,
      classId,
      subjectId,
      theoryTeacherIds: theoryTeachers,
      practiceTeacherIds: practiceTeachers,
      clinicalTeacherIds: clinicalTeachers,
      notes,
    };
    onSaveAssignment(asg);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>Phân Công Giảng Dạy (Gán Giáo Viên Theo LT / TH / LS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gán một hoặc nhiều giảng viên phụ trách từng phân hệ mô-đun của môn học cho từng lớp cụ thể.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadExcelTemplate('assignments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Mẫu Phân Công
          </button>

          <button
            onClick={onOpenTemplateImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Excel
          </button>

          <button
            onClick={handleStartAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            + Phân Công Mới
          </button>
        </div>
      </div>

      {/* Assignment Modal/Form */}
      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50/80 border-2 border-blue-200 rounded-xl p-5 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h3 className="text-sm font-bold text-blue-900">
              {currentAssignment ? 'Cập Nhật Phân Công Giảng Dạy' : 'Thêm Phân Công Mới'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Chọn Lớp Học:
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {db.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.faculty || 'Khoa'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Chọn Môn Học:
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {db.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.totalPeriods}t</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Teacher Assignment per Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Theory Teachers */}
            <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-2xs">
              <label className="block text-xs font-bold text-blue-900 mb-1.5 flex items-center justify-between">
                <span>GV Giảng Dạy Lý Thuyết (LT):</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  {theoryTeachers.length} GV
                </span>
              </label>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {db.teachers.map(t => {
                  const checked = theoryTeachers.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                        checked ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacherInList(theoryTeachers, setTheoryTeachers, t.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{t.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Practice Teachers */}
            <div className="bg-white rounded-xl p-3 border border-purple-200 shadow-2xs">
              <label className="block text-xs font-bold text-purple-900 mb-1.5 flex items-center justify-between">
                <span>GV Hướng Dẫn Thực Hành (TH):</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                  {practiceTeachers.length} GV
                </span>
              </label>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {db.teachers.map(t => {
                  const checked = practiceTeachers.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                        checked ? 'bg-purple-50 text-purple-900 font-semibold border border-purple-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacherInList(practiceTeachers, setPracticeTeachers, t.id)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="truncate">{t.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Clinical Teachers */}
            <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-2xs">
              <label className="block text-xs font-bold text-amber-900 mb-1.5 flex items-center justify-between">
                <span>GV Hướng Dẫn Lâm Sàng (LS):</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                  {clinicalTeachers.length} GV
                </span>
              </label>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {db.teachers.map(t => {
                  const checked = clinicalTeachers.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer transition ${
                        checked ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacherInList(clinicalTeachers, setClinicalTeachers, t.id)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="truncate">{t.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Phân Công:</label>
            <input
              type="text"
              placeholder="Ví dụ: Thực tập tại Bệnh viện Đa khoa Tỉnh..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu Phân Công
            </button>
          </div>
        </form>
      )}

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Lọc theo Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none"
            >
              <option value="all">Tất cả lớp ({db.assignments.length} phân công)</option>
              {db.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm phân công..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                <th className="px-4 py-2.5 font-bold uppercase">Lớp Học</th>
                <th className="px-4 py-2.5 font-bold uppercase">Môn Học</th>
                <th className="px-4 py-2.5 font-bold uppercase">GV Lý Thuyết (LT)</th>
                <th className="px-4 py-2.5 font-bold uppercase">GV Thực Hành (TH)</th>
                <th className="px-4 py-2.5 font-bold uppercase">GV Lâm Sàng (LS)</th>
                <th className="px-4 py-2.5 font-bold uppercase">Ghi Chú</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAssignments.map((a) => {
                const cls = classMap.get(a.classId);
                const sub = subjectMap.get(a.subjectId);

                const renderTeachers = (ids: string[]) => {
                  if (!ids || ids.length === 0) return <span className="text-slate-400">—</span>;
                  return ids.map(id => teacherMap.get(id)?.name || id).join(', ');
                };

                return (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {cls?.name || a.classId}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-blue-900">
                      {sub?.name || a.subjectId}
                    </td>
                    <td className="px-4 py-2.5 text-blue-800 font-medium">
                      {renderTeachers(a.theoryTeacherIds)}
                    </td>
                    <td className="px-4 py-2.5 text-purple-800 font-medium">
                      {renderTeachers(a.practiceTeacherIds)}
                    </td>
                    <td className="px-4 py-2.5 text-amber-800 font-medium">
                      {renderTeachers(a.clinicalTeacherIds)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 italic">
                      {a.notes || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(a)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
                          title="Sửa phân công"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteAssignmentTarget(a)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa phân công"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteAssignmentTarget}
        title="Xác Nhận Xóa Phân Công"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Phân Công"
        message={
          deleteAssignmentTarget ? (
            <div>
              <p>Bạn có chắc chắn muốn xóa phân công giảng dạy môn <b>{subjectMap.get(deleteAssignmentTarget.subjectId)?.name || 'này'}</b> cho lớp <b>{classMap.get(deleteAssignmentTarget.classId)?.name || 'này'}</b>?</p>
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteAssignmentTarget) {
            onDeleteAssignment(deleteAssignmentTarget.id);
            setDeleteAssignmentTarget(null);
          }
        }}
        onClose={() => setDeleteAssignmentTarget(null)}
      />
    </div>
  );
};
