import React, { useState } from 'react';
import { X, Plus, Users, BookOpen, Layers } from 'lucide-react';
import { AppDatabase, CohortBlock, StudentClass } from '../types';

interface QuickAddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  activeCohort: CohortBlock;
  onAddClass: (newClass: Omit<StudentClass, 'id'>) => void;
}

export const QuickAddClassModal: React.FC<QuickAddClassModalProps> = ({
  isOpen,
  onClose,
  db,
  activeCohort,
  onAddClass,
}) => {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [cohortId, setCohortId] = useState(activeCohort.id);
  const [academicYear, setAcademicYear] = useState(db.academicYear || '2026-2027');
  const [studentCount, setStudentCount] = useState<number>(35);
  const [faculty, setFaculty] = useState('Khoa Điều dưỡng');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    onAddClass({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      cohortId,
      academicYear,
      studentCount: Number(studentCount) || 35,
      faculty,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thêm Lớp Học Mới Vào Cột
              </h3>
              <p className="text-xs text-slate-500">Khối {activeCohort.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên Lớp Học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CĐĐD 26C, DƯỢC K14C..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mã Lớp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CDDD26C"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Sĩ số (Sinh viên)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={studentCount}
                onChange={e => setStudentCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Khối Đào Tạo
              </label>
              <select
                value={cohortId}
                onChange={e => setCohortId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
              >
                {db.cohorts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Khoa Quản Lý
              </label>
              <select
                value={faculty}
                onChange={e => setFaculty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
              >
                <option value="Khoa Điều dưỡng">Khoa Điều dưỡng</option>
                <option value="Khoa Dược">Khoa Dược</option>
                <option value="Khoa Y học Lâm sàng">Khoa Y học Lâm sàng</option>
                <option value="Khoa Kỹ thuật Y học">Khoa Kỹ thuật Y học</option>
                <option value="Khoa Khoa học Cơ bản">Khoa Khoa học Cơ bản</option>
                <option value="Khoa Y tế Công cộng">Khoa Y tế Công cộng</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Cột Lớp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
