import React, { useState } from 'react';
import { X, Database, Download, Upload, RefreshCw, FileCode, FileText, CheckCircle2 } from 'lucide-react';
import { AppDatabase } from '../types';
import { exportBackupJSON, exportBackupSQL, importBackupJSON, restoreDefaultDatabase } from '../services/backupService';
import { ConfirmModal } from './ConfirmModal';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  onRestoreDatabase: (restored: AppDatabase) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  db,
  onRestoreDatabase,
}) => {
  if (!isOpen) return null;

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const handleJSONExport = () => {
    exportBackupJSON(db);
  };

  const handleSQLExport = () => {
    exportBackupSQL(db);
  };

  const handleRestoreJSON = async () => {
    if (!restoreFile) return;
    try {
      const restored = await importBackupJSON(restoreFile);
      onRestoreDatabase(restored);
      setStatusMsg('✅ Khôi phục toàn bộ hệ thống từ file JSON thành công!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Lỗi khôi phục: ${err.message || 'File sao lưu không hợp lệ'}`);
    }
  };

  const handleResetToDemo = () => {
    setIsConfirmResetOpen(true);
  };

  const executeResetToDemo = () => {
    const initial = restoreDefaultDatabase();
    onRestoreDatabase(initial);
    setStatusMsg('✅ Đã đặt lại dữ liệu mẫu mặc định thành công!');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Database className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Sao Lưu & Phục Hồi Toàn Bộ Hệ Thống
              </h2>
              <p className="text-xs text-sky-200">
                Đa định dạng: JSON • SQL Script (SQLite DDL/DML) • Khôi phục tức thì
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
          
          {/* Export section */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Xuất Bản Sao Lưu Dữ Liệu (Backup Export)
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Lưu trữ toàn bộ thông tin Lớp, Giảng viên, Môn học, Quỹ tiết, Lịch học các tuần ra file ngoài:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleJSONExport}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Sao Lưu Bản JSON (.json)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dùng để nạp lại vào ứng dụng</div>
                </div>
              </button>

              <button
                onClick={handleSQLExport}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-left transition flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Xuất SQL SQLite (.sql)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Schema DDL & DML script</div>
                </div>
              </button>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Restore section */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Phục Hồi Dữ Liệu Từ File (.json)
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <button
                onClick={handleRestoreJSON}
                disabled={!restoreFile}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                Phục Hồi Dữ Liệu
              </button>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Reset Demo Data */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              3. Đặt Lại Dữ Liệu Mặc Định
            </div>
            <button
              onClick={handleResetToDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Khôi Phục Dữ Liệu Mẫu Ban Đầu CĐ Y Tế Thanh Hóa
            </button>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmResetOpen}
        title="Khôi Phục Dữ Liệu Mặc Định"
        icon="refresh"
        confirmVariant="danger"
        confirmText="Khôi Phục Mẫu"
        message={
          <div>
            <p>Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu của <b className="text-rose-700">Trường Cao đẳng Y tế Thanh Hóa</b>?</p>
            <p className="mt-1 text-slate-500">Mọi dữ liệu lớp học, môn học, phân công và lịch học hiện tại sẽ được thay thế bằng dữ liệu mẫu ban đầu.</p>
          </div>
        }
        onConfirm={executeResetToDemo}
        onClose={() => setIsConfirmResetOpen(false)}
      />
    </div>
  );
};
