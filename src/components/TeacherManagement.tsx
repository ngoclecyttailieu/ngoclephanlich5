import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload, Check, X, Phone, Mail, Award, BookOpen } from 'lucide-react';
import { AppDatabase, Teacher } from '../types';
import { downloadExcelTemplate } from '../services/excelService';
import { ConfirmModal } from './ConfirmModal';

interface TeacherManagementProps {
  db: AppDatabase;
  onAddTeacher: (newTeacher: Omit<Teacher, 'id'>) => void;
  onUpdateTeacher: (updated: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onOpenTemplateImport: () => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  db,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onOpenTemplateImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteTeacherTarget, setDeleteTeacherTarget] = useState<Teacher | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('Khoa Y');
  const [specialty, setSpecialty] = useState('');
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState<number>(24);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Collect distinct faculties
  const faculties = Array.from(new Set(db.teachers.map(t => t.faculty).filter(Boolean)));

  const filteredTeachers = db.teachers.filter(t => {
    if (selectedFaculty !== 'all' && t.faculty !== selectedFaculty) return false;
    if (searchTerm) {
      const match = `${t.name} ${t.code} ${t.faculty} ${t.specialty}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const resetForm = () => {
    setCode('');
    setName('');
    setFaculty('Khoa Y');
    setSpecialty('');
    setMaxPeriodsPerWeek(24);
    setPhone('');
    setEmail('');
    setIsAdding(false);
    setEditingTeacher(null);
  };

  const handleStartEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setCode(t.code);
    setName(t.name);
    setFaculty(t.faculty);
    setSpecialty(t.specialty || '');
    setMaxPeriodsPerWeek(t.maxPeriodsPerWeek || 24);
    setPhone(t.phone || '');
    setEmail(t.email || '');
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        faculty: faculty.trim(),
        specialty: specialty.trim(),
        maxPeriodsPerWeek,
        phone: phone.trim(),
        email: email.trim(),
      });
    } else {
      onAddTeacher({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        faculty: faculty.trim(),
        specialty: specialty.trim(),
        maxPeriodsPerWeek,
        phone: phone.trim(),
        email: email.trim(),
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>Danh Mục Giảng Viên ({db.teachers.length} Giảng viên)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin giảng viên, khoa/bộ môn phụ trách và định mức số tiết tối đa / tuần.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadExcelTemplate('teachers')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Mẫu Excel GV
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
            + Thêm Giảng Viên Mới
          </button>
        </div>
      </div>

      {/* Form Drawer */}
      {(isAdding || editingTeacher) && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h3 className="text-sm font-bold text-blue-900">
              {editingTeacher ? `Chỉnh Sửa Giảng Viên: ${editingTeacher.name}` : 'Thêm Giảng Viên Mới'}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã GV (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. GV09"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. ThS.BS. Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bộ Môn / Khoa (*):</label>
              <input
                type="text"
                required
                placeholder="Khoa Dược, Bộ môn Lâm sàng..."
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyên Môn Giảng Dạy:</label>
              <input
                type="text"
                placeholder="Nội khoa, Dược lâm sàng, Điều dưỡng..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số Tiết Tối Đa / Tuần:</label>
              <input
                type="number"
                min={4}
                max={40}
                value={maxPeriodsPerWeek}
                onChange={(e) => setMaxPeriodsPerWeek(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại:</label>
              <input
                type="text"
                placeholder="0912.xxx.xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              {editingTeacher ? 'Cập Nhật GV' : 'Lưu Giảng Viên'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Lọc theo Khoa:</span>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium outline-none"
            >
              <option value="all">Tất cả khoa / bộ môn ({db.teachers.length} GV)</option>
              {faculties.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm giảng viên..."
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
                <th className="px-4 py-2.5 font-bold uppercase">Mã GV</th>
                <th className="px-4 py-2.5 font-bold uppercase">Họ và Tên</th>
                <th className="px-4 py-2.5 font-bold uppercase">Bộ Môn / Khoa</th>
                <th className="px-4 py-2.5 font-bold uppercase">Chuyên Môn Giảng Dạy</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Tiết Tối Đa / Tuần</th>
                <th className="px-4 py-2.5 font-bold uppercase">Liên Hệ</th>
                <th className="px-4 py-2.5 font-bold uppercase text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-blue-700">
                    {t.code}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    {t.name}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {t.faculty}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {t.specialty || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                    {t.maxPeriodsPerWeek} tiết/tuần
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      {t.phone && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {t.phone}
                        </span>
                      )}
                      {t.email && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {t.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
                        title="Sửa giảng viên"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTeacherTarget(t)}
                        className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                        title="Xóa giảng viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTeacherTarget}
        title="Xác Nhận Xóa Giảng Viên"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Giảng Viên"
        message={
          deleteTeacherTarget ? (
            <div>
              <p>Bạn có chắc chắn muốn xóa giảng viên <b className="text-rose-700">{deleteTeacherTarget.name}</b> ({deleteTeacherTarget.code})?</p>
              <p className="mt-1 text-slate-500">Các phân công hoặc lịch giảng dạy liên quan sẽ cần được phân bổ lại.</p>
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteTeacherTarget) {
            onDeleteTeacher(deleteTeacherTarget.id);
            setDeleteTeacherTarget(null);
          }
        }}
        onClose={() => setDeleteTeacherTarget(null)}
      />
    </div>
  );
};
