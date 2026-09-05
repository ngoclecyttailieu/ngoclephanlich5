import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, Search, Download, Upload, Check, X } from 'lucide-react';
import { AppDatabase, CohortBlock, StudentClass } from '../types';
import { downloadExcelTemplate } from '../services/excelService';
import { ConfirmModal } from './ConfirmModal';

interface ClassManagementProps {
  db: AppDatabase;
  onAddClass: (newClass: Omit<StudentClass, 'id'>) => void;
  onUpdateClass: (updated: StudentClass) => void;
  onDeleteClass: (id: string) => void;
  onOpenTemplateImport: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  db,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onOpenTemplateImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<StudentClass | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<StudentClass | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [cohortId, setCohortId] = useState(db.cohorts[0]?.id || '');
  const [academicYear, setAcademicYear] = useState('2024-2027');
  const [studentCount, setStudentCount] = useState<number>(35);
  const [faculty, setFaculty] = useState('Khoa Điều dưỡng');

  const cohortMap = new Map<string, CohortBlock>();
  db.cohorts.forEach(c => cohortMap.set(c.id, c));

  const filteredClasses = db.classes.filter(c => {
    if (selectedCohortId !== 'all' && c.cohortId !== selectedCohortId) return false;
    if (searchTerm) {
      const match = `${c.name} ${c.code} ${c.faculty}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const resetForm = () => {
    setCode('');
    setName('');
    setCohortId(db.cohorts[0]?.id || '');
    setAcademicYear('2024-2027');
    setStudentCount(35);
    setFaculty('Khoa Điều dưỡng');
    setIsAdding(false);
    setEditingClass(null);
  };

  const handleStartEdit = (cls: StudentClass) => {
    setEditingClass(cls);
    setCode(cls.code);
    setName(cls.name);
    setCohortId(cls.cohortId);
    setAcademicYear(cls.academicYear);
    setStudentCount(cls.studentCount);
    setFaculty(cls.faculty || 'Khoa Điều dưỡng');
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    if (editingClass) {
      onUpdateClass({
        ...editingClass,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        cohortId,
        academicYear,
        studentCount,
        faculty,
      });
    } else {
      onAddClass({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        cohortId,
        academicYear,
        studentCount,
        faculty,
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Danh Mục Lớp Học ({db.classes.length} Lớp)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tên lớp, khối học (CĐ3, CĐ2, GĐ...), khóa học và sĩ số sinh viên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadExcelTemplate('classes')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Mẫu Excel Lớp
          </button>

          <button
            onClick={onOpenTemplateImport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Excel
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            + Thêm Lớp Mới
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal/Drawer */}
      {(isAdding || editingClass) && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h3 className="text-sm font-bold text-blue-900">
              {editingClass ? `Chỉnh Sửa Lớp: ${editingClass.name}` : 'Thêm Lớp Học Mới'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Lớp (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. CDDD26A"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Lớp (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. CĐĐD 26A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khối Học (Sheet Tab):</label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {db.cohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.description || 'Khối'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khoa / Bộ môn:</label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="Khoa Điều dưỡng, Khoa Dược..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khóa Học:</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-2027"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sĩ Số Sinh Viên:</label>
              <input
                type="number"
                min={1}
                max={200}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
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
              {editingClass ? 'Cập Nhật Lớp' : 'Lưu Lớp Mới'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Lọc theo Khối:</span>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none"
            >
              <option value="all">Tất cả ({db.classes.length} lớp)</option>
              {db.cohorts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({db.classes.filter(cls => cls.cohortId === c.id).length} lớp)
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
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
                <th className="px-4 py-2.5 font-bold uppercase">Mã Lớp</th>
                <th className="px-4 py-2.5 font-bold uppercase">Tên Lớp Học</th>
                <th className="px-4 py-2.5 font-bold uppercase">Khối (Sheet Tab)</th>
                <th className="px-4 py-2.5 font-bold uppercase">Khoa / Bộ Môn</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Khóa Học</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Sĩ Số</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClasses.map((c) => {
                const cohort = cohortMap.get(c.cohortId);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-2.5 font-mono font-bold text-blue-700">
                      {c.code}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-indigo-700">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                        {cohort?.name || c.cohortId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {c.faculty || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {c.academicYear}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                      {c.studentCount} SV
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(c)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
                          title="Sửa lớp"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteClassTarget(c)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa lớp"
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
        isOpen={!!deleteClassTarget}
        title="Xác Nhận Xóa Lớp Học"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Lớp Học"
        message={
          deleteClassTarget ? (
            <div>
              <p>Bạn có chắc chắn muốn xóa lớp <b className="text-rose-700">{deleteClassTarget.name}</b> ({deleteClassTarget.code})?</p>
              <p className="mt-1 text-slate-500">Lịch học và phân công liên quan đến lớp này cũng sẽ được gỡ bỏ.</p>
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteClassTarget) {
            onDeleteClass(deleteClassTarget.id);
            setDeleteClassTarget(null);
          }
        }}
        onClose={() => setDeleteClassTarget(null)}
      />
    </div>
  );
};
