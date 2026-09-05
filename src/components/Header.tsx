import React from 'react';
import { 
  Calendar, 
  Download, 
  Upload, 
  Sparkles, 
  BarChart3, 
  Database, 
  Code2, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Building2,
  Settings,
  Palette,
  Copy,
  Undo2,
  Redo2,
  BookOpen,
  FileCheck2
} from 'lucide-react';
import { WeekConfig } from '../types';

export type ViewTab = 'timetable' | 'classes' | 'teachers' | 'subjects' | 'assignments' | 'progress' | 'rooms' | 'exams' | 'curriculums';

interface HeaderProps {
  schoolName?: string;
  academicYear?: string;
  selectedWeek: number;
  weeks: WeekConfig[];
  activeTab?: ViewTab;
  activeView?: ViewTab;
  onChangeTab?: (tab: ViewTab) => void;
  onNavigateView?: (view: ViewTab) => void;
  onChangeWeek?: (weekNum: number) => void;
  onSelectWeek?: (weekNum: number) => void;
  onChangeAcademicYear?: (year: string) => void;
  onOpenExcelExport?: () => void;
  onOpenTemplateImport?: () => void;
  onOpenAutoSchedule?: () => void;
  onOpenBackupRestore?: () => void;
  onOpenWeekManager?: () => void;
  onOpenDiffSync?: () => void;
  onOpenUserGuide?: () => void;
  conflictCount?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoCount?: number;
  redoCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  schoolName = 'Trường Cao đẳng Y tế Thanh Hóa',
  academicYear = 'Năm học 2026 - 2027',
  selectedWeek,
  weeks,
  activeTab,
  activeView,
  onChangeTab,
  onNavigateView,
  onChangeWeek,
  onSelectWeek,
  onChangeAcademicYear,
  onOpenExcelExport,
  onOpenTemplateImport,
  onOpenAutoSchedule,
  onOpenBackupRestore,
  onOpenWeekManager,
  onOpenDiffSync,
  onOpenUserGuide,
  conflictCount = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoCount = 0,
  redoCount = 0,
}) => {
  const currentView = activeView || activeTab || 'timetable';
  
  const handleNavigate = (view: ViewTab) => {
    if (onNavigateView) onNavigateView(view);
    if (onChangeTab) onChangeTab(view);
  };

  const handleSelectWeek = (w: number) => {
    if (onSelectWeek) onSelectWeek(w);
    if (onChangeWeek) onChangeWeek(w);
  };

  const currentWeekConfig = (weeks || []).find(w => w.weekNumber === selectedWeek);

  const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    const p = dStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Building2 className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-sky-200 uppercase">
                UBND Tỉnh Thanh Hóa
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                {schoolName}
              </h1>
              <p className="text-xs text-blue-200/90 font-medium">
                Hệ thống Phân tiết Giảng dạy & Xếp Thời khóa biểu Thông minh
              </p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Author Copyright Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 border border-white/15 text-xs select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Bản quyền:</span>
              <span className="font-bold text-white tracking-wide">ngoclecyt@gmail.com</span>
            </div>

            {conflictCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                {conflictCount} Xung đột lịch
              </span>
            )}

            <button
              onClick={onOpenBackupRestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-sky-300" />
              Sao lưu & Phục hồi
            </button>
          </div>
        </div>
      </div>

      {/* Main Control Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1 text-sm scrollbar-none">
          <button
            onClick={() => handleNavigate('timetable')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'timetable'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Thời Khóa Biểu
          </button>

          <button
            onClick={() => handleNavigate('progress')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'progress'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Tiến Độ & Quỹ Tiết
          </button>

          <button
            onClick={() => handleNavigate('classes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'classes'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Lớp Học
          </button>

          <button
            onClick={() => handleNavigate('teachers')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'teachers'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Giảng Viên
          </button>

          <button
            onClick={() => handleNavigate('subjects')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'subjects'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            Môn Học
          </button>

          <button
            onClick={() => handleNavigate('assignments')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'assignments'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Phân Công Giảng Dạy
          </button>

          <button
            onClick={() => handleNavigate('rooms')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'rooms'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Giảng Đường & Phòng TH
          </button>

          <button
            onClick={() => handleNavigate('exams')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'exams'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Lịch Thi
          </button>
          <button
            onClick={() => handleNavigate('curriculums')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              currentView === 'curriculums'
                ? 'bg-blue-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            CTĐT
          </button>
        </div>

        {/* Week Navigator & Export Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => handleSelectWeek(Math.max(1, selectedWeek - 1))}
              disabled={selectedWeek <= 1}
              className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2 text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Tuần {selectedWeek}</span>
              {currentWeekConfig && (
                <span className="text-[11px] font-normal text-slate-500">
                  ({formatDate(currentWeekConfig.startDate)} - {formatDate(currentWeekConfig.endDate)})
                </span>
              )}
            </div>

            <button
              onClick={() => handleSelectWeek(selectedWeek + 1)}
              className="p-1 rounded hover:bg-white text-slate-700 cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenWeekManager}
              className="ml-1 p-1 rounded hover:bg-white text-slate-600 hover:text-blue-700 cursor-pointer"
              title="Quản lý cấu hình ngày/tuần & Nhân bản cả năm"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo History Controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                canUndo
                  ? 'bg-white text-indigo-700 shadow-2xs hover:bg-indigo-50 border border-slate-200/80 active:scale-95'
                  : 'text-slate-400 cursor-not-allowed opacity-40 hover:bg-transparent'
              }`}
              title="Quay lại thao tác trước (Hoàn tác / Undo - Phím tắt Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quay lại</span>
              {undoCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-black">
                  {undoCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                canRedo
                  ? 'bg-white text-indigo-700 shadow-2xs hover:bg-indigo-50 border border-slate-200/80 active:scale-95'
                  : 'text-slate-400 cursor-not-allowed opacity-40 hover:bg-transparent'
              }`}
              title="Làm lại thao tác vừa hoàn tác (Redo - Phím tắt Ctrl+Y hoặc Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm lại</span>
              {redoCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-black">
                  {redoCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onOpenAutoSchedule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="Phân lịch tự động theo môn học, số tiết, số buổi cho mỗi lớp, lớp đơn/lớp ghép & giảng đường"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Phân Lịch Tự Động</span>
          </button>

          <button
            onClick={onOpenWeekManager}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Nhân bản lịch hoặc quản lý tuần & lịch vạn niên"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Tuần &amp; Lịch Vạn Niên</span>
          </button>

          <button
            onClick={onOpenTemplateImport}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Nhập dữ liệu hoặc tải file mẫu Excel"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Nhập / Tải Mẫu</span>
          </button>

          <button
            onClick={onOpenDiffSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="Tiếp nhận tệp TKB chỉnh sửa thủ công (CSV/TXT/JSON), đối chiếu sai khác (Diffing), kiểm tra xung đột và cập nhật Master Schedule"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-teal-200" />
            <span>Đối Chiếu &amp; Cập Nhật TKB</span>
          </button>

          <button
            onClick={onOpenExcelExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="Xuất file Excel chuẩn Trường CĐYT Thanh Hóa"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>

          {onOpenUserGuide && (
            <button
              onClick={onOpenUserGuide}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Xem hướng dẫn sử dụng và cẩm nang thao tác chi tiết"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Hướng Dẫn</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
