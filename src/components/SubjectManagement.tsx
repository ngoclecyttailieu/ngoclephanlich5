import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload, Check, X, Palette, BookOpen, Sparkles, Wand2, RefreshCw } from 'lucide-react';
import { AppDatabase, Subject } from '../types';
import { PRESET_COLORS, ColorPreset } from '../services/colorPresets';
import { downloadExcelTemplate } from '../services/excelService';
import { generateSubjectShortName } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface SubjectManagementProps {
  db: AppDatabase;
  onAddSubject: (newSubject: Omit<Subject, 'id'>) => void;
  onUpdateSubject: (updated: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onOpenTemplateImport: () => void;
}

export const SubjectManagement: React.FC<SubjectManagementProps> = ({
  db,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onOpenTemplateImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'abbreviations'>('all');
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [credits, setCredits] = useState<number>(3);
  const [theoryPeriods, setTheoryPeriods] = useState<number>(30);
  const [practicePeriods, setPracticePeriods] = useState<number>(15);
  const [clinicalPeriods, setClinicalPeriods] = useState<number>(0);
  const [testPeriods, setTestPeriods] = useState<number>(0);
  const [colorBg, setColorBg] = useState<string>(PRESET_COLORS[0].bgHex);
  const [colorText, setColorText] = useState<string>(PRESET_COLORS[0].textHex);
  const [colorBorder, setColorBorder] = useState<string>(PRESET_COLORS[0].borderHex);

  // Quick inline abbreviation edit map
  const [inlineShortNames, setInlineShortNames] = useState<Record<string, string>>({});

  const totalPeriods = theoryPeriods + practicePeriods + clinicalPeriods + testPeriods;

  const filteredSubjects = db.subjects.filter(s => {
    if (searchTerm) {
      const match = `${s.name} ${s.shortName || ''} ${s.code}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const resetForm = () => {
    setCode('');
    setName('');
    setShortName('');
    setDepartmentId('');
    setCredits(3);
    setTheoryPeriods(30);
    setPracticePeriods(15);
    setClinicalPeriods(0);
    setTestPeriods(0);
    setColorBg(PRESET_COLORS[0].bgHex);
    setColorText(PRESET_COLORS[0].textHex);
    setColorBorder(PRESET_COLORS[0].borderHex);
    setIsAdding(false);
    setEditingSubject(null);
  };

  const handleStartEdit = (s: Subject) => {
    setEditingSubject(s);
    setCode(s.code);
    setName(s.name);
    setShortName(s.shortName || generateSubjectShortName(s.name));
    setDepartmentId(s.departmentId || '');
    setCredits(s.credits);
    setTheoryPeriods(s.theoryPeriods);
    setPracticePeriods(s.practicePeriods);
    setClinicalPeriods(s.clinicalPeriods);
    setTestPeriods(s.testPeriods || 0);
    setColorBg(s.colorBg);
    setColorText(s.colorText);
    setColorBorder(s.colorBorder || '#93C5FD');
    setIsAdding(false);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingSubject && (!shortName || shortName === generateSubjectShortName(name))) {
      setShortName(generateSubjectShortName(val));
    }
  };

  const handleSelectPresetColor = (preset: ColorPreset) => {
    setColorBg(preset.bgHex);
    setColorText(preset.textHex);
    setColorBorder(preset.borderHex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const finalShortName = shortName.trim() || generateSubjectShortName(name.trim());

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        shortName: finalShortName,
        departmentId: departmentId || undefined,
        credits,
        theoryPeriods,
        practicePeriods,
        clinicalPeriods,
        testPeriods,
        totalPeriods,
        colorBg,
        colorText,
        colorBorder,
      });
    } else {
      onAddSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        shortName: finalShortName,
        departmentId: departmentId || undefined,
        credits,
        theoryPeriods,
        practicePeriods,
        clinicalPeriods,
        testPeriods,
        totalPeriods,
        colorBg,
        colorText,
        colorBorder,
      });
    }
    resetForm();
  };

  // Quick save inline abbreviation
  const handleSaveInlineShortName = (sub: Subject) => {
    const newShort = inlineShortNames[sub.id];
    if (newShort !== undefined && newShort.trim() !== (sub.shortName || '')) {
      onUpdateSubject({
        ...sub,
        shortName: newShort.trim() || generateSubjectShortName(sub.name),
      });
    }
  };

  // Auto suggest for all subjects
  const handleAutoSuggestAll = () => {
    db.subjects.forEach(sub => {
      const suggested = generateSubjectShortName(sub.name);
      if (sub.shortName !== suggested) {
        onUpdateSubject({
          ...sub,
          shortName: suggested,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <span>Môn Học, Tên Viết Tắt & Quỹ Tiết Phân Bổ (LT / TH / LS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tên viết tắt tinh gọn cho TKB/Excel (LS Nội, TT Dược lý 1/2...), quy chuẩn số tiết và bảng màu pastel đồng nhất.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadExcelTemplate('subjects')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Mẫu Excel Môn
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
            + Thêm Môn Học Mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Danh Sách Môn Học Chi Tiết ({db.subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('abbreviations')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'abbreviations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hệ Thống Tên Viết Tắt Tinh Gọn TKB (LS / TT)</span>
        </button>
      </div>

      {/* Form Drawer */}
      {(isAdding || editingSubject) && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-5 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h3 className="text-sm font-bold text-blue-900">
              {editingSubject ? `Chỉnh Sửa Môn Học: ${editingSubject.name}` : 'Thêm Môn Học Mới'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Môn (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. DUOC-LY"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Đầy Đủ Môn Học (*):</label>
              <input
                type="text"
                required
                placeholder="e.g. Bệnh học Nội khoa & Lâm sàng"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center justify-between">
                <span>Tên Viết Tắt (TKB/Excel):</span>
                <button
                  type="button"
                  onClick={() => setShortName(generateSubjectShortName(name))}
                  className="text-[10px] text-indigo-600 hover:underline font-normal flex items-center gap-0.5"
                >
                  <Wand2 className="w-2.5 h-2.5" /> Gợi ý
                </button>
              </label>
              <input
                type="text"
                placeholder="e.g. Nội, Dược lý..."
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full bg-white border-2 border-indigo-300 rounded-lg px-3 py-1.5 text-xs text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bộ Môn Quản Lý Phòng TH:</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-purple-900 font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">-- Chưa gán Bộ môn --</option>
                {(db.departments || []).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.practiceRoomCount} phòng TH)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số Tín Chỉ:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Quotas 3 types */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Tiết Lý Thuyết (LT) (*):
              </label>
              <input
                type="number"
                min={0}
                max={150}
                value={theoryPeriods}
                onChange={(e) => setTheoryPeriods(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1" title="Mỗi tổ của lớp phải học đủ số tiết thực hành này">
                Tiết Thực Hành (TH) (*):
              </label>
              <input
                type="number"
                min={0}
                max={150}
                value={practicePeriods}
                onChange={(e) => setPracticePeriods(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-[10px] text-purple-700">Mỗi tổ học đủ {practicePeriods}t</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                Tiết Lâm Sàng (LS) (*):
              </label>
              <input
                type="number"
                min={0}
                max={150}
                value={clinicalPeriods}
                onChange={(e) => setClinicalPeriods(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Live Preview Bar */}
          <div className="bg-white rounded-xl p-3 border border-indigo-200 grid grid-cols-1 md:grid-cols-4 gap-2 items-center text-xs">
            <div className="font-bold text-slate-700">
              🔍 Xem trước hiển thị trên TKB & Excel:
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Lý thuyết (LT):</span>
              <span className="font-bold text-blue-900">{shortName || name || 'Môn học'} (101)</span>
            </div>
            <div className="p-2 rounded bg-purple-50 border border-purple-200">
              <span className="text-[10px] text-purple-600 block">Thực hành (TH 1/2):</span>
              <span className="font-bold text-purple-900">TT {shortName || name || 'Môn học'} 1/2</span>
            </div>
            <div className="p-2 rounded bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-600 block">Lâm sàng (LS):</span>
              <span className="font-bold text-amber-900">LS {shortName || name || 'Môn học'}</span>
            </div>
          </div>

          {/* Color Palette & Color Mixer */}
          <div className="bg-white rounded-xl p-4 border border-slate-300 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Bảng Màu Pastel Cho Môn Học (Tô màu đồng nhất trên TKB & Excel):</span>
              </label>
              <div
                style={{ backgroundColor: colorBg, borderColor: colorBorder, color: colorText }}
                className="px-3 py-1 rounded-md text-xs font-bold border shadow-2xs"
              >
                Màu xem trước: {shortName || name || 'Môn mẫu'}
              </div>
            </div>

            {/* Preset Color Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PRESET_COLORS.map(preset => {
                const isSelected = colorBg.toLowerCase() === preset.bgHex.toLowerCase();
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleSelectPresetColor(preset)}
                    style={{ backgroundColor: preset.bgHex, color: preset.textHex, borderColor: preset.borderHex }}
                    className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition flex items-center justify-between ${
                      isSelected ? 'ring-2 ring-blue-600 shadow-xs' : 'hover:opacity-90'
                    }`}
                  >
                    <span className="truncate">{preset.name.split(' ')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Mixer */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
              <span className="font-semibold text-slate-600">Phối màu tùy chọn:</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Màu nền:</span>
                <input
                  type="color"
                  value={colorBg}
                  onChange={(e) => setColorBg(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{colorBg}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Màu chữ:</span>
                <input
                  type="color"
                  value={colorText}
                  onChange={(e) => setColorText(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{colorText}</span>
              </div>
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
              {editingSubject ? 'Cập Nhật Môn' : 'Lưu Môn Học'}
            </button>
          </div>
        </form>
      )}

      {/* Tab Content: Abbreviations Management */}
      {activeTab === 'abbreviations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-200 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Hệ Thống Tùy Ý Chỉnh Sửa, Thêm, Bớt Tên Viết Tắt Môn Học</span>
              </h3>
              <p className="text-xs text-indigo-700 mt-1">
                Người xếp lịch tùy ý tinh chỉnh tên viết tắt cho từng môn để các ô thời khóa biểu và file Excel xuất ra tinh gọn, chuẩn mẫu Y tế:
                <br />
                • Buổi Lâm sàng: <b>LS &lt;Tên viết tắt&gt;</b> (VD: <i>LS Nội, LS Ngoại, LS Sản, LS Nhi</i>)
                <br />
                • Buổi Thực hành: <b>TT &lt;Tên viết tắt&gt; 1/2</b> (VD: <i>TT Dược lý 1/2, TT ĐDCS 1/2</i>)
              </p>
            </div>

            <button
              onClick={handleAutoSuggestAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              title="Tự động điền gợi ý tên viết tắt cho tất cả các môn"
            >
              <Wand2 className="w-3.5 h-3.5" />
              ⚡ Tự Động Gợi Ý Chuẩn Cho Tất Cả Môn
            </button>
          </div>

          {/* Quick inline editing grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                  <th className="px-3 py-2.5 font-bold uppercase w-28">Mã Môn</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Tên Đầy Đủ</th>
                  <th className="px-3 py-2.5 font-bold uppercase w-48 text-indigo-200">Tên Viết Tắt (Tùy chỉnh)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center w-36">Mẫu Lâm Sàng (LS)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center w-36">Mẫu Thực Hành (TT)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center w-28">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSubjects.map(sub => {
                  const currentShort = inlineShortNames[sub.id] !== undefined
                    ? inlineShortNames[sub.id]
                    : (sub.shortName || generateSubjectShortName(sub.name));

                  const isModified = inlineShortNames[sub.id] !== undefined && inlineShortNames[sub.id] !== (sub.shortName || '');

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-700">
                        {sub.code}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {sub.name}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={currentShort}
                            onChange={(e) => {
                              setInlineShortNames({
                                ...inlineShortNames,
                                [sub.id]: e.target.value,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveInlineShortName(sub);
                              }
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Nhập tên viết tắt..."
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          LS {currentShort || sub.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          TT {currentShort || sub.name} 1/2
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isModified ? (
                            <button
                              onClick={() => handleSaveInlineShortName(sub)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                              title="Lưu tên viết tắt này"
                            >
                              <Check className="w-3 h-3" /> Lưu
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const suggested = generateSubjectShortName(sub.name);
                                setInlineShortNames({
                                  ...inlineShortNames,
                                  [sub.id]: suggested,
                                });
                                onUpdateSubject({
                                  ...sub,
                                  shortName: suggested,
                                });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-[10px]"
                              title="Đặt lại theo gợi ý"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Subjects Table (Tab: all) */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-700">
              Tổng cộng: <b>{db.subjects.length}</b> môn học đang quản lý
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã, tên hoặc viết tắt..."
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
                  <th className="px-3 py-2.5 font-bold uppercase">Mã Môn</th>
                  <th className="px-3 py-2.5 font-bold uppercase">Tên Đầy Đủ</th>
                  <th className="px-3 py-2.5 font-bold uppercase bg-indigo-900/60">Tên Viết Tắt (TKB)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center">Tín Chỉ</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center bg-blue-900/60">Lý Thuyết (LT)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center bg-purple-900/60">Thực Hành (TH/Tổ)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center bg-amber-900/60">Lâm Sàng (LS)</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center">Tổng Tiết</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center">Màu TKB</th>
                  <th className="px-3 py-2.5 font-bold uppercase text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 font-mono font-bold text-blue-700">
                      {s.code}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      <div>{s.name}</div>
                      {s.departmentId && (
                        <div className="text-[10px] text-purple-700 font-normal mt-0.5">
                          {db.departments?.find(d => d.id === s.departmentId)?.name || 'Bộ môn TH'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-indigo-900 bg-indigo-50/30">
                      <span className="inline-block px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 shadow-2xs font-semibold">
                        {s.shortName || generateSubjectShortName(s.name)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                      {s.credits} TC
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-800 bg-blue-50/40">
                      {s.theoryPeriods}t
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-purple-800 bg-purple-50/40">
                      <div>{s.practicePeriods}t</div>
                      <div className="text-[9px] text-slate-400 font-normal">mỗi tổ</div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-amber-800 bg-amber-50/40">
                      {s.clinicalPeriods}t
                    </td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-slate-900">
                      {s.totalPeriods}t
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        style={{ backgroundColor: s.colorBg, color: s.colorText, borderColor: s.colorBorder || '#cbd5e1' }}
                        className="px-2.5 py-1 rounded text-[11px] font-bold border shadow-2xs inline-block"
                      >
                        {s.shortName || 'Màu'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(s)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
                          title="Sửa môn học & tên viết tắt"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteSubjectTarget(s)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa môn học"
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
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteSubjectTarget}
        title="Xác Nhận Xóa Môn Học"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Môn Học"
        message={
          deleteSubjectTarget ? (
            <div>
              <p>Bạn có chắc chắn muốn xóa môn học <b className="text-rose-700">{deleteSubjectTarget.name}</b> ({deleteSubjectTarget.code})?</p>
              <p className="mt-1 text-slate-500">Các phân công hoặc lịch giảng dạy liên quan đến môn này sẽ cần được điều chỉnh lại.</p>
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteSubjectTarget) {
            onDeleteSubject(deleteSubjectTarget.id);
            setDeleteSubjectTarget(null);
          }
        }}
        onClose={() => setDeleteSubjectTarget(null)}
      />
    </div>
  );
};
