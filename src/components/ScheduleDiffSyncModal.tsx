import React, { useState, useRef } from 'react';
import {
  X,
  FileCheck2,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Copy,
  Download,
  ArrowRight,
  RefreshCw,
  Sliders,
  Layers,
  FileText,
  Clock,
  Building,
  UserCheck,
  Check,
  AlertCircle,
  HelpCircle,
  Info,
  FileSpreadsheet,
  Grid,
  ListFilter
} from 'lucide-react';
import { AppDatabase, SessionSchedule } from '../types';
import {
  parseScheduleTextOrCSV,
  parseScheduleExcel,
  downloadScheduleDiffTemplate,
  analyzeScheduleDiff,
  DiffAnalysisResult,
  formatDayOfWeek,
  formatSessionName,
  ScheduleDiffRecord
} from '../services/scheduleDiffService';

interface ScheduleDiffSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  currentWeek: number;
  onApplyMasterSchedule: (updatedSchedules: SessionSchedule[], summaryText: string) => void;
}

export const ScheduleDiffSyncModal: React.FC<ScheduleDiffSyncModalProps> = ({
  isOpen,
  onClose,
  db,
  currentWeek,
  onApplyMasterSchedule,
}) => {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState<'excel' | 'paste'>('excel');
  const [inputText, setInputText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetWeek, setTargetWeek] = useState<number>(currentWeek);
  const [scopeMode, setScopeMode] = useState<'current_week' | 'all_weeks'>('current_week');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [detectedSheets, setDetectedSheets] = useState<{ name: string; type: string; rowCount: number }[]>([]);
  const [parsedSessions, setParsedSessions] = useState<SessionSchedule[]>([]);
  const [diffResult, setDiffResult] = useState<DiffAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'conflicts' | 'json' | 'table'>('summary');
  const [copiedJson, setCopiedJson] = useState(false);
  const [ignoreConflicts, setIgnoreConflicts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data generator for quick test
  const handleLoadSampleCSV = () => {
    const cls1 = db.classes[0]?.name || 'CĐĐD 26A';
    const cls2 = db.classes[1]?.name || 'CĐĐD 26B';
    const sub1 = db.subjects[0]?.name || 'Bệnh học Nội khoa';
    const sub2 = db.subjects[1]?.name || 'Dược lý';
    const teacher1 = db.teachers[0]?.name || 'ThS.BS. Nguyễn Văn A';
    const teacher2 = db.teachers[1]?.name || 'BS. Trần Thị B';

    const sample = `Tuần,Thứ,Buổi,Lớp,Môn học,Giảng viên,Phòng,Số tiết,Loại
Tuần ${currentWeek},Thứ 2,Sáng,${cls1},${sub1},${teacher1},101,4,LT
Tuần ${currentWeek},Thứ 3,Chiều,${cls1},${sub2},${teacher2},Phòng BM,4,TH
Tuần ${currentWeek},Thứ 4,Sáng,${cls2},${sub1},${teacher1},102,4,LT
Tuần ${currentWeek},Thứ 5,Sáng,${cls2},${sub2},${teacher2},101,4,LT`;
    setInputText(sample);
    setInputMode('paste');
    setSelectedFile(null);
    setParsedSessions([]);
    setDetectedSheets([]);
    setParseErrors([]);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setParseErrors([]);
    setDetectedSheets([]);
    setParsedSessions([]);
    setDiffResult(null);

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      setIsAnalyzing(true);
      try {
        const buffer = await file.arrayBuffer();
        const { sessions, parseErrors: errors, detectedSheets: sheets } = parseScheduleExcel(buffer, db, targetWeek);
        setDetectedSheets(sheets || []);
        setParsedSessions(sessions);
        if (errors.length > 0) {
          setParseErrors(errors);
        }
        if (sessions.length === 0 && errors.length > 0) {
          setIsAnalyzing(false);
          return;
        }

        // Run diff directly
        const weekFilter = scopeMode === 'current_week' ? targetWeek : undefined;
        const analysis = analyzeScheduleDiff(db, sessions, weekFilter);
        setDiffResult(analysis);
      } catch (err: any) {
        setParseErrors([`Lỗi khi đọc file Excel: ${err.message || 'Tệp không hợp lệ hoặc bị khóa định dạng.'}`]);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // CSV, TXT, JSON
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInputText(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadExcelTemplate = () => {
    try {
      downloadScheduleDiffTemplate(db, targetWeek);
    } catch (err: any) {
      alert(`Lỗi khi tạo file mẫu Excel: ${err.message}`);
    }
  };

  const handleRunDiff = () => {
    if (selectedFile) {
      setIsAnalyzing(true);
      setParseErrors([]);
      setDiffResult(null);
      setTimeout(async () => {
        try {
          const isExcel = selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls');
          if (isExcel) {
            const buffer = await selectedFile.arrayBuffer();
            const { sessions, parseErrors: errors, detectedSheets: sheets } = parseScheduleExcel(buffer, db, targetWeek);
            setDetectedSheets(sheets || []);
            setParsedSessions(sessions);
            const weekFilter = scopeMode === 'current_week' ? targetWeek : undefined;
            const analysis = analyzeScheduleDiff(db, sessions, weekFilter);
            setDiffResult(analysis);
            if (errors.length > 0) {
              setParseErrors(errors);
            }
          } else {
            const weekFilter = scopeMode === 'current_week' ? targetWeek : undefined;
            const { sessions, parseErrors: errors } = parseScheduleTextOrCSV(inputText, db, targetWeek);
            setParsedSessions(sessions);
            const analysis = analyzeScheduleDiff(db, sessions, weekFilter);
            setDiffResult(analysis);
            if (errors.length > 0) {
              setParseErrors(errors);
            }
          }
        } catch (err: any) {
          setParseErrors([`Lỗi khi phân tích: ${err.message}`]);
        } finally {
          setIsAnalyzing(false);
        }
      }, 100);
      return;
    }

    if (!inputText.trim()) {
      setParseErrors(['Vui lòng tải file Excel lên hoặc dán nội dung văn bản/CSV trước khi đối chiếu.']);
      return;
    }

    setIsAnalyzing(true);
    setParseErrors([]);
    setDiffResult(null);

    setTimeout(() => {
      try {
        const weekFilter = scopeMode === 'current_week' ? targetWeek : undefined;
        const { sessions, parseErrors: errors } = parseScheduleTextOrCSV(inputText, db, targetWeek);

        if (errors.length > 0 && sessions.length === 0) {
          setParseErrors(errors);
          setIsAnalyzing(false);
          return;
        }

        const analysis = analyzeScheduleDiff(db, sessions, weekFilter);
        setDiffResult(analysis);
        if (errors.length > 0) {
          setParseErrors(errors);
        }
      } catch (err: any) {
        setParseErrors([`Lỗi trong quá trình phân tích: ${err.message || 'Dữ liệu không đúng chuẩn.'}`]);
      } finally {
        setIsAnalyzing(false);
      }
    }, 200);
  };

  const handleCopyJson = () => {
    if (!diffResult) return;
    navigator.clipboard.writeText(JSON.stringify(diffResult.structuredJson, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!diffResult) return;
    const blob = new Blob([JSON.stringify(diffResult.structuredJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TKB_Diff_Sync_Week_${targetWeek}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyMaster = () => {
    if (!diffResult) return;
    const errorCount = diffResult.conflicts.filter(c => c.severity === 'error').length;
    if (errorCount > 0 && !ignoreConflicts) {
      alert('Vui lòng kiểm tra và xử lý các lỗi xung đột lịch, hoặc tích chọn "Tôi xác nhận bỏ qua cảnh báo và tiếp tục cập nhật".');
      return;
    }

    onApplyMasterSchedule(
      diffResult.finalMasterSchedules,
      `Đã cập nhật ${diffResult.summary.addedCount + diffResult.summary.modifiedCount + diffResult.summary.removedCount} thay đổi lên Thời khóa biểu chuẩn (Master Schedule)!`
    );
    onClose();
  };

  return (
    <div id="schedule-diff-sync-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div id="schedule-diff-sync-modal-container" className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header with Role Banner */}
        <div id="diff-modal-header" className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 shadow-inner">
              <FileCheck2 className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  Chuyên Gia Quản Lý &amp; Điều Phối Thời Khóa Biểu Thông Minh
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-400/20 text-sky-200 border border-sky-300/30">
                  Excel &amp; CSV Diff Engine
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                Đối chiếu tệp Excel/CSV thời khóa biểu đã chỉnh sửa thủ công với bản gốc Master Schedule
              </p>
            </div>
          </div>

          <button
            id="close-diff-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div id="diff-modal-body" className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          
          {/* STEP 1: INPUT DATA & EXCEL UPLOAD */}
          <div id="diff-step-1-input" className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Tải Lên File Excel (.xlsx, .xls) hoặc Dán CSV/Text Để Đối Chiếu:
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="download-excel-template-btn"
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Tải tệp Excel mẫu chuẩn kèm danh mục Lớp, Môn, Giảng viên để đối chiếu"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tải Mẫu Excel Chuẩn</span>
                </button>

                <button
                  id="load-sample-csv-btn"
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Dán dữ liệu mẫu nhanh để kiểm tra"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dán Mẫu CSV</span>
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Phạm vi đối chiếu:</span>
                <div className="flex items-center gap-1">
                  <button
                    id="scope-current-week-btn"
                    type="button"
                    onClick={() => setScopeMode('current_week')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      scopeMode === 'current_week'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Chỉ Tuần {targetWeek}
                  </button>
                  <button
                    id="scope-all-weeks-btn"
                    type="button"
                    onClick={() => setScopeMode('all_weeks')}
                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      scopeMode === 'all_weeks'
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Toàn bộ các tuần
                  </button>
                </div>
              </div>

              {scopeMode === 'current_week' && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="font-bold text-slate-700">Chọn tuần áp dụng:</span>
                  <select
                    id="diff-target-week-select"
                    value={targetWeek}
                    onChange={(e) => setTargetWeek(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none"
                  >
                    {Array.from({ length: 45 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>Tuần {w}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Input area: File Upload (Excel/CSV) vs Paste Text */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  id="tab-excel-upload"
                  type="button"
                  onClick={() => setInputMode('excel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'excel'
                      ? 'bg-white text-emerald-700 border border-emerald-300 shadow-2xs'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tải Tệp Excel / CSV (.xlsx, .xls, .csv)</span>
                </button>
                <button
                  id="tab-paste-text"
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'paste'
                      ? 'bg-white text-blue-700 border border-blue-300 shadow-2xs'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dán Văn Bản / CSV Trực Tiếp</span>
                </button>
              </div>

              {inputMode === 'excel' ? (
                <div
                  id="excel-dropzone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-6 bg-white border-2 border-dashed rounded-xl text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[1.005]'
                      : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="schedule-diff-excel-file"
                    accept=".xlsx,.xls,.csv,.txt,.json,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full shadow-inner">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {selectedFile ? (
                          <span className="text-emerald-700 font-extrabold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Đã nạp file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          'Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây, hoặc Bấm để chọn file'
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Hỗ trợ cả file mẫu dạng bảng danh sách và file TKB dạng lưới từng khối/lớp (CĐ3, CĐ2,...)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  id="paste-schedule-diff-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Dán nội dung CSV hoặc bảng dữ liệu TKB vào đây...\nVí dụ định dạng chuẩn:\nTuần 1, Thứ 2, Sáng, CĐĐD 26A, Bệnh học Nội khoa, ThS.BS. Nguyễn Văn A, 101, 4, LT\nTuần 1, Thứ 3, Chiều, CĐĐD 26A, Dược lý, BS. Trần Thị B, Phòng BM, 4, TH`}
                  className="w-full h-36 p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                />
              )}
            </div>

            {/* Detected Sheets Indicator */}
            {detectedSheets.length > 0 && (
              <div id="detected-excel-sheets-badge" className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Grid className="w-4 h-4 text-emerald-600" />
                  <span>Các trang (Sheets) đã nhận diện trong file Excel:</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {detectedSheets.map((s, idx) => (
                    <div key={idx} className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-emerald-800 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
                      {s.type === 'tabular' ? <ListFilter className="w-3 h-3 text-indigo-600" /> : <Grid className="w-3 h-3 text-emerald-600" />}
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({s.type === 'tabular' ? 'Bảng danh sách' : 'Lưới TKB'}, {s.rowCount} dòng)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error alerts if any */}
            {parseErrors.length > 0 && (
              <div id="diff-parse-errors-alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Phát hiện cảnh báo khi đọc dữ liệu:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                  {parseErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Trigger Button */}
            <div className="flex justify-end pt-1">
              <button
                id="run-diff-analysis-btn"
                type="button"
                onClick={handleRunDiff}
                disabled={isAnalyzing || (!selectedFile && !inputText.trim())}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                  isAnalyzing || (!selectedFile && !inputText.trim())
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Phân Tích &amp; Đối Chiếu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-300" />
                    <span>Tiến Hành Phân Tích &amp; Đối Chiếu (Diffing)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STEP 2: STANDARD 3-PART OUTPUT */}
          {diffResult && (
            <div id="diff-step-2-results" className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm space-y-0 animate-in fade-in duration-200">
              
              {/* Diff Summary Metrics Header */}
              <div id="diff-metrics-header" className="bg-slate-900 text-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Kết Quả Đối Chiếu Dữ Liệu
                    </span>
                    <h3 className="text-base font-black text-white">
                      Phát hiện {diffResult.summary.addedCount + diffResult.summary.modifiedCount + diffResult.summary.removedCount} thay đổi so với Bản Chuẩn (Master Schedule)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="copy-diff-json-btn"
                      type="button"
                      onClick={handleCopyJson}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Sao chép toàn bộ khối JSON cấu trúc"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? 'Đã Sao Chép!' : 'Sao Chép JSON'}</span>
                    </button>
                    <button
                      id="download-diff-json-btn"
                      type="button"
                      onClick={handleDownloadJson}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Tải về file JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải JSON</span>
                    </button>
                  </div>
                </div>

                {/* Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
                    <span className="text-[10px] text-emerald-300 block font-bold">Thêm Mới (Added)</span>
                    <span className="text-lg font-black text-emerald-400">+{diffResult.summary.addedCount}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
                    <span className="text-[10px] text-amber-300 block font-bold">Sửa Đổi (Modified)</span>
                    <span className="text-lg font-black text-amber-400">~{diffResult.summary.modifiedCount}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
                    <span className="text-[10px] text-rose-300 block font-bold">Đã Xóa (Removed)</span>
                    <span className="text-lg font-black text-rose-400">-{diffResult.summary.removedCount}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
                    <span className="text-[10px] text-slate-300 block font-bold">Giữ Nguyên</span>
                    <span className="text-lg font-black text-slate-300">{diffResult.summary.unchangedCount}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center border border-white/10">
                    <span className="text-[10px] text-red-300 block font-bold">Xung Đột</span>
                    <span className={`text-lg font-black ${diffResult.summary.conflictCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                      {diffResult.summary.conflictCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for 3 Standard Output Parts */}
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap gap-2">
                <button
                  id="tab-btn-summary"
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Tóm Tắt Thay Đổi (Báo Cáo Tự Nhiên)</span>
                </button>

                <button
                  id="tab-btn-conflicts"
                  type="button"
                  onClick={() => setActiveTab('conflicts')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'conflicts'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <AlertTriangle className={`w-3.5 h-3.5 ${diffResult.summary.conflictCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`} />
                  <span>2. Cảnh Báo Xung Đột ({diffResult.summary.conflictCount})</span>
                </button>

                <button
                  id="tab-btn-json"
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'json'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>3. Dữ Liệu Cấu Trúc (JSON Hệ Thống)</span>
                </button>

                <button
                  id="tab-btn-table"
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'table'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>4. Bảng So Sánh Chi Tiết</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-4 max-h-80 overflow-y-auto space-y-4">
                
                {/* TAB 1: NATURAL LANGUAGE SUMMARY */}
                {activeTab === 'summary' && (
                  <div id="tab-content-summary" className="space-y-4">
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 whitespace-pre-line font-medium leading-relaxed">
                      {diffResult.naturalLanguageSummary}
                    </div>

                    {/* Detailed Cards */}
                    <div className="space-y-2">
                      <div className="font-bold text-xs text-slate-700 uppercase">
                        Danh sách các mục thay đổi cụ thể:
                      </div>

                      {diffResult.changes.added.map(item => (
                        <div key={item.id} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-700 text-white shrink-0 mt-0.5">
                            THÊM MỚI
                          </span>
                          <div className="flex-1">
                            <span className="font-bold text-emerald-950">{item.explanation}</span>
                          </div>
                        </div>
                      ))}

                      {diffResult.changes.modified.map(item => (
                        <div key={item.id} className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white shrink-0 mt-0.5">
                            SỬA ĐỔI
                          </span>
                          <div className="flex-1">
                            <span className="font-bold text-amber-950">{item.explanation}</span>
                          </div>
                        </div>
                      ))}

                      {diffResult.changes.removed.map(item => (
                        <div key={item.id} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-700 text-white shrink-0 mt-0.5">
                            ĐÃ XÓA
                          </span>
                          <div className="flex-1">
                            <span className="font-bold text-rose-950">{item.explanation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 2: CONFLICTS REPORT */}
                {activeTab === 'conflicts' && (
                  <div id="tab-content-conflicts" className="space-y-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                      {diffResult.conflictReport}
                    </div>

                    {diffResult.conflicts.map((cf, i) => (
                      <div
                        key={cf.id || i}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          cf.severity === 'error'
                            ? 'bg-red-50 border-red-300 text-red-950'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{cf.message}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-6">
                          💡 <b>Đề xuất xử lý</b>: Điều phối lại giảng đường hoặc đổi giảng viên khác phù hợp với chuyên môn.
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: STRUCTURED JSON */}
                {activeTab === 'json' && (
                  <div id="tab-content-json" className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Dữ liệu JSON chuẩn hóa dành cho đồng bộ hệ thống phần mềm:</span>
                      <button
                        id="copy-json-inline-btn"
                        type="button"
                        onClick={handleCopyJson}
                        className="text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép JSON</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 leading-tight">
                      {JSON.stringify(diffResult.structuredJson, null, 2)}
                    </pre>
                  </div>
                )}

                {/* TAB 4: SIDE-BY-SIDE TABLE */}
                {activeTab === 'table' && (
                  <div id="tab-content-table" className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="p-2 font-bold">Loại</th>
                          <th className="p-2 font-bold">Lớp</th>
                          <th className="p-2 font-bold">Thời gian</th>
                          <th className="p-2 font-bold">Lịch Cũ (Master)</th>
                          <th className="p-2 font-bold">Lịch Mới (File tải lên)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {[...diffResult.changes.added, ...diffResult.changes.modified, ...diffResult.changes.removed].map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                row.type === 'added' ? 'bg-emerald-100 text-emerald-800'
                                : row.type === 'modified' ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                              }`}>
                                {row.type === 'added' ? 'Thêm mới' : row.type === 'modified' ? 'Sửa đổi' : 'Xóa'}
                              </span>
                            </td>
                            <td className="p-2 font-bold text-slate-900">{row.className}</td>
                            <td className="p-2 text-slate-600">
                              {formatDayOfWeek(row.dayOfWeek)} - {formatSessionName(row.session)} (T{row.weekNumber})
                            </td>
                            <td className="p-2 text-slate-500 max-w-xs truncate">
                              {row.oldSession ? row.differences[0]?.oldValue || 'Có lịch' : 'Trống lịch'}
                            </td>
                            <td className="p-2 font-semibold text-blue-900 max-w-xs truncate">
                              {row.newSession ? row.differences[0]?.newValue || 'Có lịch mới' : 'Đã xóa'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

              {/* STEP 3: MASTER SCHEDULE STATE UPDATE BUTTON */}
              <div id="diff-step-3-actions" className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {diffResult.summary.conflictCount > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        id="ignore-conflicts-checkbox"
                        type="checkbox"
                        checked={ignoreConflicts}
                        onChange={(e) => setIgnoreConflicts(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tôi xác nhận bỏ qua cảnh báo và tiếp tục cập nhật</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="cancel-diff-modal-btn"
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    id="apply-master-schedule-btn"
                    type="button"
                    onClick={handleApplyMaster}
                    disabled={diffResult.summary.conflictCount > 0 && !ignoreConflicts}
                    className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                      diffResult.summary.conflictCount > 0 && !ignoreConflicts
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Cập Nhật Thành Bản Chuẩn (Master Schedule)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

