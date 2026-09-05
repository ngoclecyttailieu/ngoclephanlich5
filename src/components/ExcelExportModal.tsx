import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Check, CheckSquare, Square, Settings2, Info } from 'lucide-react';
import { AppDatabase, ExportExcelOptions } from '../types';
import { exportTimetableToExcel } from '../services/excelService';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  selectedWeek: number;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  db,
  selectedWeek,
}) => {
  if (!isOpen) return null;

  const [options, setOptions] = useState<ExportExcelOptions>({
    ...db.exportOptions,
    selectedCohortIds: db.cohorts.map(c => c.id),
  });

  const [isExporting, setIsExporting] = useState(false);

  const toggleCohort = (cohortId: string) => {
    setOptions(prev => {
      const list = prev.selectedCohortIds || [];
      if (list.includes(cohortId)) {
        return { ...prev, selectedCohortIds: list.filter(id => id !== cohortId) };
      } else {
        return { ...prev, selectedCohortIds: [...list, cohortId] };
      }
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportTimetableToExcel(db, selectedWeek, options);
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Xuất Thời Khóa Biểu Ra Excel Chuẩn Mẫu
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                Mẫu TKB Tuần {selectedWeek} ({db.academicYear}) • Đa Sheet Khối Học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Options List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-emerald-600" />
              <span>3 Phương Án Tùy Chọn Khi Xuất Excel:</span>
            </div>

            {/* Switch 1: Hide Teacher Name */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.hideTeacherName}
                onChange={(e) => setOptions({ ...options, hideTeacherName: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Phương án 1: Không để tên giảng viên
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ẩn dòng thông tin "GV: Họ tên" trong các ô có tiết học.
                </p>
              </div>
            </label>

            {/* Switch 2: Hide Lesson Title */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.hideLessonTitle}
                onChange={(e) => setOptions({ ...options, hideLessonTitle: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Phương án 2: Không để tên bài học
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chỉ hiển thị tên môn & hình thức, ẩn tiêu đề bài học/chuyên đề chi tiết.
                </p>
              </div>
            </label>

            {/* Switch 3: Hide Period Count */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.hidePeriodCount}
                onChange={(e) => setOptions({ ...options, hidePeriodCount: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Phương án 3: Không hiện số tiết học của buổi học
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ẩn badge "[4 tiết]" khỏi nội dung ô trên file Excel.
                </p>
              </div>
            </label>

            {/* Switch 4: Include Lecture Hall Schedule Sheet */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeLectureHallSheet !== false}
                  onChange={(e) => setOptions({ ...options, includeLectureHallSheet: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <span>✨ Tạo thêm Sheet "Lịch Giảng Đường (GĐ)"</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold uppercase">Mới</span>
                  </span>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5">
                    Hàng ngang là các giảng đường lý thuyết (GĐ 101, 102...). Chỉ hiển thị các môn học lý thuyết và giảng đường dạy lý thuyết tương ứng với TKB.
                  </p>
                </div>
              </label>

              {options.includeLectureHallSheet !== false && (
                <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs">
                  <span className="text-indigo-900 font-semibold text-[11px]">Chế độ phối màu Sheet GĐ:</span>
                  <select
                    value={options.lectureHallColorMode || 'subject'}
                    onChange={(e) => setOptions({ ...options, lectureHallColorMode: e.target.value as any })}
                    className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-xs text-indigo-950 font-bold outline-none"
                  >
                    <option value="subject">🎨 Theo màu môn học (Pastel đồng nhất)</option>
                    <option value="session">🌅 Theo buổi (Sáng xanh, Chiều cam đào)</option>
                    <option value="custom">🖌️ Phối màu tùy biến (Theo cấu hình Hàng/Cột)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Sheet Selection */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Chọn các Sheet (Khối học) cần xuất vào file Excel:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {db.cohorts.map(c => {
                const isSelected = options.selectedCohortIds?.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCohort(c.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Sheet: {c.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              File Excel xuất ra được định dạng chuẩn in ấn (khổ giấy ngang A4), tô màu pastel đồng nhất theo từng môn học, tự động đánh dấu <b>"TT &lt;Môn&gt; 1/2"</b> cho các lớp thực hành chia đôi tổ.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Đóng
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Đang tạo file Excel...' : 'TẢI FILE EXCEL (.xlsx)'}
          </button>
        </div>

      </div>
    </div>
  );
};
