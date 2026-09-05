import React, { useState } from 'react';
import { X, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Building2, FlaskConical } from 'lucide-react';
import { AppDatabase } from '../types';
import { 
  downloadExcelTemplate, 
  importClassesFromExcel, 
  importTeachersFromExcel, 
  importSubjectsFromExcel,
  importLectureHallsFromExcel,
  importDepartmentsFromExcel
} from '../services/excelService';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onRefreshDatabase: () => void;
}

export const TemplateImportModal: React.FC<TemplateImportModalProps> = ({
  isOpen,
  onClose,
  db,
  onRefreshDatabase,
}) => {
  if (!isOpen) return null;

  const [importType, setImportType] = useState<'classes' | 'teachers' | 'subjects' | 'rooms' | 'departments'>('classes');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResultMessage(null);
    }
  };

  const handleProcessImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResultMessage(null);

    try {
      if (importType === 'classes') {
        const res = await importClassesFromExcel(file, db);
        if (res.errors.length > 0) {
          setResultMessage({ success: false, text: `Đã nhập ${res.count} lớp. Có lỗi: ${res.errors.join('; ')}` });
        } else {
          setResultMessage({ success: true, text: `✅ Đã nhập thành công ${res.count} lớp học vào hệ thống!` });
        }
      } else if (importType === 'teachers') {
        const res = await importTeachersFromExcel(file, db);
        if (res.errors.length > 0) {
          setResultMessage({ success: false, text: `Đã nhập ${res.count} GV. Có lỗi: ${res.errors.join('; ')}` });
        } else {
          setResultMessage({ success: true, text: `✅ Đã nhập thành công ${res.count} giảng viên vào hệ thống!` });
        }
      } else if (importType === 'subjects') {
        const res = await importSubjectsFromExcel(file, db);
        if (res.errors.length > 0) {
          setResultMessage({ success: false, text: `Đã nhập ${res.count} môn. Có lỗi: ${res.errors.join('; ')}` });
        } else {
          setResultMessage({ success: true, text: `✅ Đã nhập thành công ${res.count} môn học & quỹ tiết vào hệ thống!` });
        }
      } else if (importType === 'rooms') {
        const res = await importLectureHallsFromExcel(file, db);
        if (res.errors.length > 0) {
          setResultMessage({ success: false, text: `Đã nhập ${res.count} giảng đường. Có lỗi: ${res.errors.join('; ')}` });
        } else {
          setResultMessage({ success: true, text: `✅ Đã nhập thành công ${res.count} giảng đường lý thuyết!` });
        }
      } else if (importType === 'departments') {
        const res = await importDepartmentsFromExcel(file, db);
        if (res.errors.length > 0) {
          setResultMessage({ success: false, text: `Đã nhập ${res.count} bộ môn. Có lỗi: ${res.errors.join('; ')}` });
        } else {
          setResultMessage({ success: true, text: `✅ Đã nhập thành công ${res.count} bộ môn & phòng thực hành!` });
        }
      }
      onRefreshDatabase();
    } catch (err: any) {
      console.error(err);
      setResultMessage({ success: false, text: `Lỗi đọc file: ${err.message || 'File không đúng định dạng chuẩn!'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <FileSpreadsheet className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Tải Mẫu & Nhập Dữ Liệu Hàng Loạt (Excel .xlsx)
              </h2>
              <p className="text-xs text-sky-200">
                Chuẩn hóa dữ liệu đầu vào với File Excel Mẫu định dạng sẵn
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Download Templates */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Bước 1: Tải File Excel Mẫu Chuẩn (Downloadable Template)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Tải file mẫu về máy tính, điền dữ liệu theo đúng tiêu đề cột chuẩn của Nhà trường, sau đó tải lên ở Bước 2:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => downloadExcelTemplate('classes')}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Mẫu Lớp Học</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải về .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate('teachers')}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Mẫu Giảng Viên</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải về .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate('subjects')}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Mẫu Môn & Quỹ Tiết</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải về .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate('rooms')}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Mẫu Giảng Đường LT</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải về .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate('departments')}
                className="p-3 rounded-xl border border-purple-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-purple-900">Mẫu Bộ Môn & Phòng TH</span>
                <span className="text-[10px] text-purple-600 font-semibold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải về .xlsx
                </span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelTemplate('all')}
                className="p-3 rounded-xl border border-blue-300 bg-blue-50 text-left transition flex flex-col justify-between shadow-2xs"
              >
                <span className="text-xs font-bold text-blue-900">Trọn Bộ Mẫu (All-in-One)</span>
                <span className="text-[10px] text-blue-700 font-bold mt-2 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Tải full .xlsx
                </span>
              </button>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Section 2: Upload Excel File */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Bước 2: Tải Lên File Excel (.xlsx) Để Nạp Dữ Liệu</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Loại Dữ Liệu Trong File Của Bạn:
                </label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="classes">Danh Sách Lớp Học</option>
                  <option value="teachers">Danh Sách Giảng Viên</option>
                  <option value="subjects">Danh Sách Môn Học & Quỹ Tiết (LT/TH/LS)</option>
                  <option value="rooms">Danh Sách Giảng Đường Lý Thuyết (101, 201, B6P1...)</option>
                  <option value="departments">Danh Sách Bộ Môn & Giới Hạn Phòng Thực Hành</option>
                </select>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition bg-slate-50/50">
                <input
                  type="file"
                  id="excel_file_input"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="excel_file_input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-8 h-8 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">
                    {file ? `Đã chọn: ${file.name}` : 'Kéo thả hoặc Nhấp để chọn file Excel (.xlsx)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Hỗ trợ định dạng Microsoft Excel .xlsx
                  </span>
                </label>
              </div>

              {/* Result Message */}
              {resultMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    resultMessage.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  {resultMessage.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{resultMessage.text}</span>
                </div>
              )}
            </div>
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
            onClick={handleProcessImport}
            disabled={!file || isProcessing}
            className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isProcessing ? 'Đang Xử Lý Nạp...' : 'BẮT ĐẦU NẠP DỮ LIỆU'}
          </button>
        </div>

      </div>
    </div>
  );
};
