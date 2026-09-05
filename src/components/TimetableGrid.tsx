import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  User, 
  MapPin, 
  Layers, 
  Palette, 
  Paintbrush, 
  Check, 
  RotateCcw,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  EyeOff,
  Eye,
  SlidersHorizontal,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Scan,
  Maximize,
  HelpCircle
} from 'lucide-react';
import { 
  AppDatabase, 
  CohortBlock, 
  PeriodDetail, 
  ScheduleConflict, 
  SessionSchedule, 
  StudentClass, 
  Subject, 
  Teacher 
} from '../types';
import { formatSubjectDisplayName, cleanLectureHallCode } from '../services/schedulerService';
import { ClassColumnCustomizerModal, CLASS_PALETTE_COLORS } from './ClassColumnCustomizerModal';
import { QuickAddClassModal } from './QuickAddClassModal';
import { ConfirmModal } from './ConfirmModal';

interface TimetableGridProps {
  db: AppDatabase;
  onUpdateDb?: (updater: (prev: AppDatabase) => AppDatabase) => void;
  activeCohort: CohortBlock;
  selectedWeek: number;
  conflicts: ScheduleConflict[];
  onOpenScheduleModal: (params: {
    classId: string;
    dayOfWeek: number;
    session: 'morning' | 'afternoon';
    existingSchedule?: SessionSchedule;
  }) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onAddClass?: (newClass: Omit<StudentClass, 'id'>) => void;
  onOpenAutoSchedule?: () => void;
}

interface CellGroupItem {
  type: 'empty' | 'single' | 'combined';
  classes: StudentClass[];
  schedule?: SessionSchedule;
  colSpan: number;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  db,
  onUpdateDb,
  activeCohort,
  selectedWeek,
  conflicts,
  onOpenScheduleModal,
  onDeleteSchedule,
  onAddClass,
  onOpenAutoSchedule,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(CLASS_PALETTE_COLORS[0].bg);
  const [showColorToolbar, setShowColorToolbar] = useState<boolean>(false);
  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState<boolean>(false);
  const [isQuickAddClassOpen, setIsQuickAddClassOpen] = useState<boolean>(false);
  const [activeHeaderColorPickerId, setActiveHeaderColorPickerId] = useState<string | null>(null);
  
  // Timetable Zoom & Panoramic Overview State
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('timetable_zoom_level');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 50 && parsed <= 160) return parsed;
    }
    return 100;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleSetZoom = (newZoom: number) => {
    const clamped = Math.min(160, Math.max(50, Math.round(newZoom)));
    setZoomLevel(clamped);
    localStorage.setItem('timetable_zoom_level', clamped.toString());
  };

  const handleZoomIn = () => handleSetZoom(zoomLevel + 10);
  const handleZoomOut = () => handleSetZoom(zoomLevel - 10);
  const handleResetZoom = () => handleSetZoom(100);

  // Esc key listener for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // All classes belonging to active cohort
  const rawCohortClasses = db.classes.filter(c => c.cohortId === activeCohort.id);
  const timetableStyles = db.timetableStyles || {};
  const customOrder = timetableStyles.classOrder?.[activeCohort.id] || [];
  const hiddenClassIds = new Set(timetableStyles.hiddenClassIds || []);

  // Ordered classes
  const sortedCohortClasses = [...rawCohortClasses].sort((a, b) => {
    const idxA = customOrder.indexOf(a.id);
    const idxB = customOrder.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Visible classes on the matrix
  const visibleClasses = sortedCohortClasses.filter(c => !hiddenClassIds.has(c.id));

  const subjectMap = new Map<string, Subject>();
  db.subjects.forEach(s => subjectMap.set(s.id, s));

  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  // Days list (2: Thứ 2 ... 7: Thứ 7)
  const days = [2, 3, 4, 5, 6, 7];
  const dayNames: { [key: number]: string } = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
  };

  const sessions: Array<{ key: 'morning' | 'afternoon'; label: string; timeHint: string; icon: React.ReactNode }> = [
    { key: 'morning', label: 'Sáng', timeHint: '07:00 - 11:30', icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
    { key: 'afternoon', label: 'Chiều', timeHint: '13:30 - 17:30', icon: <Moon className="w-3.5 h-3.5 text-orange-500" /> },
  ];

  // ----------------------------------------------------
  // Column Operations
  // ----------------------------------------------------
  const handleMoveClassHorizontal = (classId: string, direction: 'left' | 'right') => {
    if (!onUpdateDb) return;
    const currentList = [...sortedCohortClasses];
    const currentIndex = currentList.findIndex(c => c.id === classId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const temp = currentList[currentIndex];
    currentList[currentIndex] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    const newOrderIds = currentList.map(c => c.id);

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        classOrder: {
          ...(prev.timetableStyles?.classOrder || {}),
          [activeCohort.id]: newOrderIds,
        },
      },
    }));
  };

  const handleToggleHideClass = (classId: string) => {
    if (!onUpdateDb) return;
    const isHidden = hiddenClassIds.has(classId);
    let nextHidden: string[];
    if (isHidden) {
      nextHidden = (timetableStyles.hiddenClassIds || []).filter(id => id !== classId);
    } else {
      nextHidden = [...(timetableStyles.hiddenClassIds || []), classId];
    }

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        hiddenClassIds: nextHidden,
      },
    }));
  };

  const handleColorClass = (classId: string, colorHex: string) => {
    if (!onUpdateDb) return;
    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        classColors: {
          ...(prev.timetableStyles?.classColors || {}),
          [classId]: colorHex,
        },
      },
    }));
    setActiveHeaderColorPickerId(null);
  };

  const handleColorAllClasses = (colorHex: string) => {
    if (!onUpdateDb) return;
    const newClassColors: { [key: string]: string } = {};
    rawCohortClasses.forEach(c => {
      newClassColors[c.id] = colorHex;
    });
    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        headerClassRowBg: colorHex,
        classColors: {
          ...(prev.timetableStyles?.classColors || {}),
          ...newClassColors,
        },
      },
    }));
  };

  const handleColorDay = (day: number, colorHex: string) => {
    if (!onUpdateDb) return;
    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        dayColors: {
          ...(prev.timetableStyles?.dayColors || {}),
          [day]: colorHex,
        },
      },
    }));
  };

  const handleResetColors = () => {
    if (!onUpdateDb) return;
    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        headerClassRowBg: undefined,
        headerCornerBg: undefined,
        classColors: {},
        dayColors: {},
      },
    }));
  };

  // Helper: check if two session schedules belong to the same combined group
  const isSameCombinedSchedule = (
    sch1?: SessionSchedule,
    sch2?: SessionSchedule
  ): boolean => {
    if (!sch1 || !sch2) return false;
    if (!sch1.periods || !sch2.periods || sch1.periods.length === 0 || sch2.periods.length === 0) return false;

    // Direct match via combinedGroupId
    if (sch1.combinedGroupId && sch2.combinedGroupId && sch1.combinedGroupId === sch2.combinedGroupId) {
      return true;
    }

    // Match via combinedClassIds
    if (
      sch1.combinedClassIds &&
      sch2.combinedClassIds &&
      sch1.combinedClassIds.includes(sch2.classId) &&
      sch2.combinedClassIds.includes(sch1.classId)
    ) {
      return true;
    }

    return false;
  };

  // ----------------------------------------------------
  // Build Grid Cells for a Row (With Automatic ColSpan for Merged Classes)
  // ----------------------------------------------------
  const buildRowCellGroups = (
    day: number,
    session: 'morning' | 'afternoon'
  ): CellGroupItem[] => {
    const groups: CellGroupItem[] = [];
    let i = 0;

    while (i < visibleClasses.length) {
      const cls = visibleClasses[i];
      const schedule = db.schedules.find(
        s => s.weekNumber === selectedWeek &&
             s.dayOfWeek === day &&
             s.session === session &&
             s.classId === cls.id
      );

      if (!schedule || !schedule.periods || schedule.periods.length === 0) {
        // Empty cell
        groups.push({
          type: 'empty',
          classes: [cls],
          schedule: undefined,
          colSpan: 1,
        });
        i++;
        continue;
      }

      // Check if this schedule is combined with other classes
      const isCombined = (schedule.combinedClassIds && schedule.combinedClassIds.length > 1) || !!schedule.combinedGroupId;

      if (isCombined) {
        // Look ahead for consecutive classes in visibleClasses that share this combined schedule
        let span = 1;
        while (i + span < visibleClasses.length) {
          const nextCls = visibleClasses[i + span];
          const nextSchedule = db.schedules.find(
            s => s.weekNumber === selectedWeek &&
                 s.dayOfWeek === day &&
                 s.session === session &&
                 s.classId === nextCls.id
          );

          if (isSameCombinedSchedule(schedule, nextSchedule)) {
            span++;
          } else {
            break;
          }
        }

        groups.push({
          type: span > 1 ? 'combined' : 'single',
          classes: visibleClasses.slice(i, i + span),
          schedule,
          colSpan: span,
        });

        i += span;
      } else {
        // Single regular class schedule
        groups.push({
          type: 'single',
          classes: [cls],
          schedule,
          colSpan: 1,
        });
        i++;
      }
    }

    return groups;
  };

  // Delete all schedules in a combined group cleanly
  const handleDeleteCombinedSchedule = (cellItem: CellGroupItem, day: number, session: 'morning' | 'afternoon') => {
    if (!cellItem.schedule) return;
    const classNames = cellItem.classes.map(c => c.name).join(' & ');
    const classIds = cellItem.classes.map(c => c.id);

    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Lịch Học Ghép',
      confirmText: 'Xóa Lịch Ghép',
      message: (
        <div>
          <p>Bạn có chắc muốn xóa lịch học cho các lớp (<b className="text-rose-700">{classNames}</b>)?</p>
          <p className="mt-1 text-slate-500">Số tiết đã trừ sẽ được hoàn trả đầy đủ lại vào quỹ môn học của các lớp.</p>
        </div>
      ),
      onConfirm: () => {
        if (onUpdateDb) {
          onUpdateDb(prev => ({
            ...prev,
            schedules: prev.schedules.filter(
              s => !(
                s.weekNumber === selectedWeek &&
                s.dayOfWeek === day &&
                s.session === session &&
                classIds.includes(s.classId)
              )
            ),
          }));
        } else {
          onDeleteSchedule(cellItem.schedule!.id);
        }
      }
    });
  };

  const handleDeleteSingleSchedule = (scheduleId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Buổi Học Này',
      confirmText: 'Xóa Buổi Học',
      message: (
        <div>
          <p>Bạn có chắc muốn xóa lịch buổi học này?</p>
          <p className="mt-1 text-slate-500">Số tiết đã trừ sẽ được hoàn trả lại vào quỹ tiết môn học của lớp.</p>
        </div>
      ),
      onConfirm: () => {
        onDeleteSchedule(scheduleId);
      }
    });
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  if (rawCohortClasses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6 max-w-2xl mx-auto shadow-xs">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          Khối {activeCohort.name} Chưa Có Lớp Học Nào
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Vui lòng thêm lớp học mới vào khối này để bắt đầu phân tiết và xếp thời khóa biểu.
        </p>
        <button
          type="button"
          onClick={() => setIsQuickAddClassOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm Lớp Mới Vào Khối {activeCohort.name}</span>
        </button>

        {/* Quick Add Class Modal */}
        <QuickAddClassModal
          isOpen={isQuickAddClassOpen}
          onClose={() => setIsQuickAddClassOpen(false)}
          db={db}
          activeCohort={activeCohort}
          onAddClass={newCls => {
            if (onAddClass) onAddClass(newCls);
            else if (onUpdateDb) {
              const cls: StudentClass = { ...newCls, id: `cls_${Date.now()}` };
              onUpdateDb(prev => ({ ...prev, classes: [...prev.classes, cls] }));
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Main Action Bar & Column Customization Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-xs text-sky-700 font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <span>Thời Khóa Biểu Tuần {selectedWeek} ({db.academicYear})</span>
              <span>•</span>
              <span className="text-slate-500 font-normal">Khối {activeCohort.name.toUpperCase()}</span>
            </div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span>BẢNG PHÂN LỊCH GIẢNG DẠY & HỌC TẬP</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                {visibleClasses.length} / {rawCohortClasses.length} lớp hiển thị
              </span>
              {hiddenClassIds.size > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
                  Ẩn {hiddenClassIds.size} lớp
                </span>
              )}
            </h2>
          </div>

          {/* Quick Toolbar Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Schedule Button */}
            {onOpenAutoSchedule && (
              <button
                type="button"
                onClick={onOpenAutoSchedule}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                title="Phân lịch tự động thông minh theo môn học & cân bằng giảng đường"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Phân Lịch Tự Động</span>
              </button>
            )}

            {/* 1. Quick Add Class */}
            <button
              type="button"
              onClick={() => setIsQuickAddClassOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Lớp</span>
            </button>

            {/* 2. Column Customizer Button */}
            <button
              type="button"
              onClick={() => setIsColumnCustomizerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Tùy Chỉnh Cột Lớp ({rawCohortClasses.length})</span>
            </button>

            {/* 3. Color Palette Toggle */}
            <button
              type="button"
              onClick={() => setShowColorToolbar(!showColorToolbar)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                showColorToolbar
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{showColorToolbar ? 'Đóng Bảng Màu' : '🎨 Tô Màu Nhanh'}</span>
            </button>
          </div>
        </div>

        {/* 1b. DEDICATED ZOOM & PANORAMIC CONTROLS TOOLBAR */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 px-2 flex items-center gap-1">
                <Scan className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Thu Phóng Thời Khóa Biểu:</span>
              </span>

              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                title="Thu nhỏ để quan sát rộng hơn (-10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Slider */}
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={zoomLevel}
                onChange={(e) => handleSetZoom(Number(e.target.value))}
                className="w-16 sm:w-28 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg mx-1"
                title={`Mức thu phóng hiện tại: ${zoomLevel}%`}
              />

              {/* Percentage Badge */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-900 font-black text-xs border border-blue-200 transition cursor-pointer min-w-[50px] text-center shadow-2xs"
                title="Nhấp để đặt lại kích thước chuẩn 100%"
              >
                {zoomLevel}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 150}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                title="Phóng to để nhìn rõ hơn (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSetZoom(70)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  zoomLevel === 70
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Chế độ Toàn Cảnh (70%): Nhìn toàn bộ các lớp của khối mà không cần cuộn ngang"
              >
                <span>🌐 Toàn Cảnh (70%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetZoom(85)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  zoomLevel === 85
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Chế độ Tổng Quan (85%)"
              >
                <span>Tổng Quan (85%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetZoom(100)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  zoomLevel === 100
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Kích thước tiêu chuẩn (100%)"
              >
                <span>Chuẩn (100%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetZoom(125)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  zoomLevel === 125
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title="Phóng to chi tiết (125%)"
              >
                <span>Phóng To (125%)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Chế độ Toàn Màn Hình: Tối đa hóa diện tích quan sát toàn bộ thời khóa biểu"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Thu Nhỏ Màn Hình</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Toàn Màn Hình</span>
                </>
              )}
            </button>

            {/* Copyright Mark */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium select-none">
              <span>Bản quyền:</span>
              <span className="font-semibold text-sky-700">ngoclecyt@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Expandable Palette & Quick Color Bar */}
        {showColorToolbar && (
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-150">
            {/* Palette selection */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
                <Paintbrush className="w-3.5 h-3.5 text-purple-600" />
                <span>Màu cọ:</span>
              </span>

              <div className="flex items-center gap-1.5">
                {CLASS_PALETTE_COLORS.map(c => {
                  const isSelected = selectedColor === c.bg;
                  return (
                    <button
                      type="button"
                      key={c.bg}
                      onClick={() => setSelectedColor(c.bg)}
                      title={c.name}
                      style={{ backgroundColor: c.bg, borderColor: c.border }}
                      className={`w-6 h-6 rounded-md border transition flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-purple-600 ring-offset-1 scale-110' : 'hover:scale-105'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleColorAllClasses(selectedColor)}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold transition flex items-center gap-1"
                title="Tô màu đã chọn cho toàn bộ các ô ở dòng Lớp"
              >
                <Paintbrush className="w-3 h-3 text-indigo-600" />
                <span>Tô tất cả dòng "Lớp"</span>
              </button>

              <button
                type="button"
                onClick={handleResetColors}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold transition flex items-center gap-1"
                title="Khôi phục màu mặc định cho dòng Lớp và cột Thứ"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Mặc định</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Timetable Matrix Grid (With dedicated THỨ & BUỔI columns + Automatic Merging for Combined Classes) */}
      <div 
        className={`bg-white rounded-2xl border border-slate-200 shadow-xs transition-all ${
          isFullscreen 
            ? 'fixed inset-0 z-50 rounded-none border-none p-4 flex flex-col bg-slate-950 backdrop-blur-md overflow-hidden text-slate-100' 
            : 'overflow-hidden relative'
        }`}
      >
        {/* Fullscreen Header Controls (Only when Fullscreen is active) */}
        {isFullscreen && (
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 shrink-0 text-white">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <h3 className="text-sm sm:text-base font-black tracking-wide text-white flex items-center gap-2">
                  <span>BẢNG PHÂN LỊCH GIẢNG DẠY & HỌC TẬP • TOÀN CẢNH</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-sky-400/30 text-xs font-bold">
                    Khối {activeCohort.name} • Tuần {selectedWeek}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Hiển thị {visibleClasses.length} lớp • Bản quyền: <span className="text-sky-300 font-semibold">ngoclecyt@gmail.com</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Zoom bar in Fullscreen */}
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Thu nhỏ (-10%)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={zoomLevel}
                  onChange={(e) => handleSetZoom(Number(e.target.value))}
                  className="w-20 sm:w-28 accent-sky-400 cursor-pointer h-1.5 bg-slate-600 rounded-lg mx-1"
                />
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 rounded-lg bg-sky-600 text-white font-black text-xs transition cursor-pointer min-w-[46px] text-center"
                  title="Đặt lại 100%"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Phóng to (+10%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Close Fullscreen */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Thoát (Esc)</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Container with Custom Zoom Applied */}
        <div 
          className={`overflow-auto transition-all ${
            isFullscreen ? 'flex-1 bg-white rounded-xl shadow-inner text-slate-900' : 'max-h-[calc(100vh-250px)] sm:max-h-[80vh]'
          }`}
          style={{
            zoom: `${zoomLevel}%`,
          }}
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              {/* Header Row: THỨ | BUỔI | LỚP: A | LỚP: B ... */}
              <tr className="bg-slate-900 text-white divide-x divide-slate-800">
                {/* Column 1: THỨ Header (Sticky left 0px) */}
                <th
                  style={{
                    backgroundColor: timetableStyles.headerCornerBg || '#0F172A',
                  }}
                  className="w-24 px-3 py-3.5 text-center text-xs font-black uppercase tracking-wider sticky left-0 z-30 shadow-xs"
                >
                  <div className="flex items-center justify-center">
                    <span>THỨ</span>
                  </div>
                </th>

                {/* Column 2: BUỔI Header (Sticky left 96px) */}
                <th
                  style={{
                    backgroundColor: timetableStyles.headerCornerBg || '#0F172A',
                  }}
                  className="w-24 px-3 py-3.5 text-center text-xs font-black uppercase tracking-wider sticky left-24 z-30 shadow-xs border-r-2 border-slate-700"
                >
                  <div className="flex items-center justify-center">
                    <span>BUỔI</span>
                  </div>
                </th>

                {/* Class Column Headers ("Lớp: ...") with rich reorder, color, hide controls */}
                {visibleClasses.map((cls, colIdx) => {
                  const customClassBg = timetableStyles.classColors?.[cls.id] || timetableStyles.headerClassRowBg;
                  const isCustomBgDark = !customClassBg || customClassBg === '#0F172A' || customClassBg === '#1E293B' || customClassBg === '#1E3A8A' || customClassBg === '#065F46' || customClassBg === '#5B21B6' || customClassBg === '#9A3412' || customClassBg === '#9D174D' || customClassBg === '#334155';

                  const isFirstCol = colIdx === 0;
                  const isLastCol = colIdx === visibleClasses.length - 1;

                  return (
                    <th
                      key={cls.id}
                      style={{
                        backgroundColor: customClassBg || '#1E293B',
                      }}
                      className="min-w-[240px] max-w-[300px] px-3 py-2.5 text-center text-xs font-bold tracking-wider relative group"
                    >
                      <div className="flex flex-col items-center justify-center">
                        {/* Class Name & Faculty */}
                        <div className={`font-black text-sm tracking-wide ${isCustomBgDark ? 'text-white' : 'text-slate-900'}`}>
                          Lớp: {cls.name}
                        </div>
                        <div className={`text-[11px] font-medium mt-0.5 truncate ${isCustomBgDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {cls.faculty || 'Khoa Y'} • {cls.studentCount || 0} SV
                        </div>

                        {/* Interactive Column Tools (Move Left, Move Right, Color, Hide) */}
                        <div className="flex items-center gap-1 mt-1.5 opacity-90 group-hover:opacity-100 transition">
                          {/* Move Left */}
                          <button
                            type="button"
                            disabled={isFirstCol}
                            onClick={() => handleMoveClassHorizontal(cls.id, 'left')}
                            className={`p-1 rounded bg-black/20 hover:bg-black/40 text-white text-[10px] transition ${
                              isFirstCol ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                            title="Chuyển cột này sang trái (hoặc bấm Tùy chỉnh cột)"
                          >
                            <ArrowLeft className="w-2.5 h-2.5" />
                          </button>

                          {/* Quick Paint Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveHeaderColorPickerId(
                                  activeHeaderColorPickerId === cls.id ? null : cls.id
                                )
                              }
                              className="px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 text-white text-[10px] flex items-center gap-0.5 transition"
                              title="Đổi màu sắc cho cột Lớp này"
                            >
                              <Palette className="w-2.5 h-2.5" />
                              <span>Màu</span>
                            </button>

                            {/* Mini Palette Popup */}
                            {activeHeaderColorPickerId === cls.id && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 p-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-40 w-48 text-slate-900 animate-in fade-in">
                                <div className="text-[10px] font-bold mb-1 flex items-center justify-between">
                                  <span>Chọn màu cột:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleColorClass(cls.id, '')}
                                    className="text-[9px] text-blue-600 hover:underline"
                                  >
                                    Mặc định
                                  </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {CLASS_PALETTE_COLORS.map(c => (
                                    <button
                                      type="button"
                                      key={c.bg}
                                      onClick={() => handleColorClass(cls.id, c.bg)}
                                      style={{ backgroundColor: c.bg }}
                                      className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition"
                                      title={c.name}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Move Right */}
                          <button
                            type="button"
                            disabled={isLastCol}
                            onClick={() => handleMoveClassHorizontal(cls.id, 'right')}
                            className={`p-1 rounded bg-black/20 hover:bg-black/40 text-white text-[10px] transition ${
                              isLastCol ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                            title="Chuyển cột này sang phải (hoặc bấm Tùy chỉnh cột)"
                          >
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>

                          {/* Hide Column Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleHideClass(cls.id)}
                            className="p-1 rounded bg-black/20 hover:bg-amber-600 text-white text-[10px] transition"
                            title="Ẩn bớt cột này (có thể mở lại trong Tùy chỉnh cột)"
                          >
                            <EyeOff className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {days.map(day => {
                const dayLabel = dayNames[day] || `Thứ ${day}`;
                const customDayBg = timetableStyles.dayColors?.[day];

                // Build cell items for morning and afternoon
                const morningGroups = buildRowCellGroups(day, 'morning');
                const afternoonGroups = buildRowCellGroups(day, 'afternoon');

                return (
                  <React.Fragment key={day}>
                    {/* ----------------- ROW 1: BUỔI SÁNG ----------------- */}
                    <tr className="hover:bg-slate-50/80 transition divide-x divide-slate-200 group bg-white">
                      {/* Column 1: THỨ (spans 2 rows: Sáng & Chiều) */}
                      <td
                        rowSpan={2}
                        style={{
                          backgroundColor: customDayBg || '#F8FAFC',
                        }}
                        className="px-3 py-3 text-center border-r border-slate-300 sticky left-0 z-20 align-middle shadow-xs bg-slate-50"
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="text-sm font-black text-slate-900 leading-tight">
                            {dayLabel}
                          </div>
                          
                          {/* Quick Paint Day button */}
                          <button
                            type="button"
                            onClick={() => handleColorDay(day, selectedColor)}
                            title={`Tô màu toàn bộ hàng ${dayLabel} bằng màu cọ`}
                            className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-medium flex items-center justify-center gap-1 mx-auto transition"
                          >
                            <Paintbrush className="w-2.5 h-2.5 text-purple-600" />
                            <span>Tô Thứ</span>
                          </button>
                        </div>
                      </td>

                      {/* Column 2: BUỔI SÁNG (Sticky left 96px) */}
                      <td
                        style={{
                          backgroundColor: customDayBg ? undefined : '#F0F9FF',
                        }}
                        className="px-2 py-3 text-center border-r-2 border-slate-300 sticky left-24 z-20 align-middle shadow-xs bg-sky-50/70"
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                            <span>Sáng</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            07:00 - 11:30
                          </div>
                        </div>
                      </td>

                      {/* Class Cells for Morning (With colSpan auto-merge for combined classes) */}
                      {morningGroups.map((groupItem, gIdx) => {
                        return renderCellGroup(
                          groupItem,
                          gIdx,
                          day,
                          'morning',
                          selectedWeek,
                          conflicts,
                          subjectMap,
                          teacherMap,
                          db,
                          onOpenScheduleModal,
                          handleDeleteSingleSchedule,
                          handleDeleteCombinedSchedule
                        );
                      })}
                    </tr>

                    {/* ----------------- ROW 2: BUỔI CHIỀU ----------------- */}
                    <tr className="hover:bg-slate-50/80 transition divide-x divide-slate-200 group bg-slate-50/40">
                      {/* Column 2: BUỔI CHIỀU (Sticky left 96px) */}
                      <td
                        style={{
                          backgroundColor: customDayBg ? undefined : '#FFFBEB',
                        }}
                        className="px-2 py-3 text-center border-r-2 border-slate-300 sticky left-24 z-20 align-middle shadow-xs bg-amber-50/70"
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Moon className="w-3.5 h-3.5 text-orange-500" />
                            <span>Chiều</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            13:30 - 17:30
                          </div>
                        </div>
                      </td>

                      {/* Class Cells for Afternoon (With colSpan auto-merge for combined classes) */}
                      {afternoonGroups.map((groupItem, gIdx) => {
                        return renderCellGroup(
                          groupItem,
                          gIdx,
                          day,
                          'afternoon',
                          selectedWeek,
                          conflicts,
                          subjectMap,
                          teacherMap,
                          db,
                          onOpenScheduleModal,
                          handleDeleteSingleSchedule,
                          handleDeleteCombinedSchedule
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Info & Watermark */}
        <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between text-xs transition-colors ${
          isFullscreen 
            ? 'bg-slate-900 border-slate-800 text-slate-400' 
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Thời Khóa Biểu:</span>
            <span>Khối {activeCohort.name} • Tuần {selectedWeek} • {visibleClasses.length} lớp hiển thị</span>
            <span>•</span>
            <span>Thu phóng hiện tại: <b className="text-sky-600 font-bold">{zoomLevel}%</b></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Bản quyền phần mềm:</span>
            <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
              ngoclecyt@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Class Column Customizer Modal */}
      <ClassColumnCustomizerModal
        isOpen={isColumnCustomizerOpen}
        onClose={() => setIsColumnCustomizerOpen(false)}
        db={db}
        activeCohort={activeCohort}
        onUpdateDb={onUpdateDb || (() => {})}
        onOpenAddClass={() => setIsQuickAddClassOpen(true)}
      />

      {/* MODAL 2: Quick Add Class Modal */}
      <QuickAddClassModal
        isOpen={isQuickAddClassOpen}
        onClose={() => setIsQuickAddClassOpen(false)}
        db={db}
        activeCohort={activeCohort}
        onAddClass={newCls => {
          if (onAddClass) onAddClass(newCls);
          else if (onUpdateDb) {
            const cls: StudentClass = { ...newCls, id: `cls_${Date.now()}` };
            onUpdateDb(prev => ({ ...prev, classes: [...prev.classes, cls] }));
          }
        }}
      />
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        icon="trash"
        confirmVariant="danger"
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// ====================================================================
// Sub-render function for a Cell Group (Single class or Merged classes)
// ====================================================================
function renderCellGroup(
  groupItem: CellGroupItem,
  groupIndex: number,
  day: number,
  session: 'morning' | 'afternoon',
  selectedWeek: number,
  conflicts: ScheduleConflict[],
  subjectMap: Map<string, Subject>,
  teacherMap: Map<string, Teacher>,
  db: AppDatabase,
  onOpenScheduleModal: (params: {
    classId: string;
    dayOfWeek: number;
    session: 'morning' | 'afternoon';
    existingSchedule?: SessionSchedule;
  }) => void,
  onDeleteSchedule: (scheduleId: string) => void,
  handleDeleteCombinedSchedule: (cellItem: CellGroupItem, day: number, session: 'morning' | 'afternoon') => void
) {
  const primaryClass = groupItem.classes[0];
  const isMerged = groupItem.colSpan > 1;

  // Case 1: Empty slot
  if (groupItem.type === 'empty' || !groupItem.schedule || !groupItem.schedule.periods || groupItem.schedule.periods.length === 0) {
    return (
      <td
        key={`cell_${primaryClass.id}_${day}_${session}_${groupIndex}`}
        colSpan={groupItem.colSpan}
        onClick={() => onOpenScheduleModal({
          classId: primaryClass.id,
          dayOfWeek: day,
          session,
        })}
        className="p-2 align-top h-28 hover:bg-blue-50/50 cursor-pointer transition relative group/cell border-b border-slate-200 bg-white"
      >
        <div className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 group-hover/cell:border-blue-400 group-hover/cell:bg-blue-50/40 text-slate-400 group-hover/cell:text-blue-600 transition">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-0 group-hover/cell:opacity-100 transition">
            <Plus className="w-3.5 h-3.5" />
            Xếp lịch
          </span>
        </div>
      </td>
    );
  }

  // Case 2: Has Schedule (Single or Combined Merged)
  const schedule = groupItem.schedule;
  const classIds = groupItem.classes.map(c => c.id);

  // Check conflicts for this cell
  const cellConflicts = conflicts.filter(c => 
    c.weekNumber === selectedWeek &&
    c.dayOfWeek === day &&
    c.session === session &&
    c.details.classIds?.some(id => classIds.includes(id))
  );

  // Names of all classes combined in this cell
  const combinedClassNames = groupItem.classes.map(c => c.name);

  // Check if this schedule is combined with classes OUTSIDE the current contiguous span
  const allCombinedClassIds = schedule.combinedClassIds || [];
  const otherOutsideClassNames = allCombinedClassIds
    .filter(id => !classIds.includes(id))
    .map(id => db.classes.find(c => c.id === id)?.name || id);

  return (
    <td
      key={`cell_${primaryClass.id}_${day}_${session}_${groupIndex}`}
      colSpan={groupItem.colSpan}
      className={`p-1.5 align-top h-28 relative group/cell border-b border-slate-200 bg-white transition ${
        isMerged ? 'ring-2 ring-indigo-500/30 ring-inset bg-indigo-50/20' : ''
      }`}
    >
      <div className="flex flex-col gap-1.5 h-full">
        {schedule.periods.map((p, pIdx) => {
          const sub = subjectMap.get(p.subjectId);
          const formattedName = formatSubjectDisplayName(sub, p.periodType, p.practiceType);

          // EXACT PRESET COLORS CONFIGURED BY THE SCHEDULER:
          const bgStyle = sub?.colorBg || '#DBEAFE';
          const textStyle = sub?.colorText || '#1E3A8A';
          const borderStyle = sub?.colorBorder || '#93C5FD';

          const teacherNames = p.teacherIds
            .map(tId => teacherMap.get(tId)?.name || tId)
            .join(', ');

          // Clean room display for LT
          const displayRoom = p.periodType === 'LT'
            ? (cleanLectureHallCode(p.roomOrHospital) || p.roomOrHospital)
            : p.periodType === 'LS'
              ? (p.roomOrHospital || '')
              : '';

          return (
            <div
              key={pIdx}
              style={{ backgroundColor: bgStyle, borderColor: borderStyle }}
              className="p-2 rounded-lg border shadow-2xs flex-1 flex flex-col justify-between transition hover:shadow-sm"
            >
              <div>
                {/* 1. Exam Badge */}
                {p.isExam && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black tracking-wide shadow-xs mb-1.5 animate-pulse">
                    <Sparkles className="w-3 h-3 text-white shrink-0" />
                    <span>THI KẾT THÚC MÔN (Lần {p.examAttempt || 1})</span>
                  </div>
                )}

                {/* 1b. Merged Class Header Banner if Combined */}
                {isMerged ? (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-700 text-white text-[10px] font-black tracking-wide shadow-xs mb-1.5">
                    <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>HỌC GHÉP {groupItem.classes.length} LỚP: {combinedClassNames.join(' + ')}</span>
                  </div>
                ) : (
                  otherOutsideClassNames.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-200 text-indigo-900 text-[10px] font-extrabold mb-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                      <span>Ghép: +{otherOutsideClassNames.join(', ')}</span>
                    </div>
                  )
                )}

                {/* 2. Subject Title & Type Badge */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span
                    style={{ color: textStyle }}
                    className="font-bold text-xs leading-snug line-clamp-2"
                    title={sub?.name}
                  >
                    {formattedName}
                  </span>
                  
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    p.periodType === 'TH' ? 'bg-purple-200 text-purple-900' :
                    p.periodType === 'LS' ? 'bg-amber-200 text-amber-900' :
                    'bg-blue-200 text-blue-900'
                  }`}>
                    {p.periodType}
                    {p.periodType === 'TH' && (p.practiceType === 'half' || p.practiceType === 'group1' || p.practiceType === 'group2') && ' (1/2)'}
                  </span>
                </div>

                {/* 3. Lesson Title */}
                {p.lessonTitle && (
                  <div className="text-[11px] text-slate-700 italic font-medium mb-1 line-clamp-1">
                    • {p.lessonTitle}
                  </div>
                )}
              </div>

              {/* 4. Period Count & Room & Teacher info */}
              <div className="mt-1 pt-1 border-t border-black/10 flex flex-col gap-0.5 text-[11px] text-slate-800">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold text-slate-900">
                    [{p.periodsCount} tiết]
                  </span>
                  {displayRoom && (
                    <span className="truncate max-w-[140px] font-medium text-slate-700 flex items-center gap-0.5" title={p.roomOrHospital}>
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {displayRoom}
                    </span>
                  )}
                </div>

                {teacherNames && (
                  <div className="text-slate-800 font-medium truncate flex items-center gap-1 mt-0.5" title={`GV: ${teacherNames}`}>
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{teacherNames}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conflict Alert Badge if any */}
      {cellConflicts.length > 0 && (
        <div
          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow-md animate-bounce cursor-pointer z-20"
          title={cellConflicts.map(c => c.message).join('\n')}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Quick Admin Actions on Hover */}
      <div className="absolute top-1 right-1 hidden group-hover/cell:flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs p-1 rounded-md shadow-md z-10">
        <button
          onClick={() => onOpenScheduleModal({
            classId: primaryClass.id,
            dayOfWeek: day,
            session,
            existingSchedule: schedule,
          })}
          className="p-1 text-sky-300 hover:text-white transition"
          title={isMerged ? 'Sửa lịch học ghép cho tất cả các lớp này' : 'Sửa lịch học'}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (isMerged) {
              handleDeleteCombinedSchedule(groupItem, day, session);
            } else {
              onDeleteSchedule(schedule.id);
            }
          }}
          className="p-1 text-rose-400 hover:text-rose-200 transition"
          title={isMerged ? 'Xóa lịch ghép của các lớp này (Hoàn trả số tiết)' : 'Xóa lịch (Hoàn trả số tiết)'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </td>
  );
}
