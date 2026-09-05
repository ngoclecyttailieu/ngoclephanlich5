import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Palette, 
  Paintbrush, 
  Download, 
  RefreshCw, 
  Info, 
  Calendar, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Check, 
  Sun, 
  Moon, 
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Plus,
  ArrowUpDown,
  MoveLeft,
  MoveRight,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Save,
  CheckSquare
} from 'lucide-react';
import { AppDatabase, LectureHall, Subject, SessionSchedule, LectureHallCellColor, SessionType } from '../types';
import { cleanLectureHallCode } from '../services/schedulerService';
import { exportLectureHallScheduleToExcel } from '../services/excelService';
import { INITIAL_LECTURE_HALLS } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface LectureHallScheduleViewProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  selectedWeek: number;
  onSelectWeek?: (week: number) => void;
}

const PALETTE_COLORS = [
  { name: 'Xanh biển (Sky)', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  { name: 'Xanh ngọc (Emerald)', bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  { name: 'Vàng cam (Amber)', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  { name: 'Tím hoa cà (Purple)', bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
  { name: 'Hồng phấn (Pink)', bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4' },
  { name: 'Xanh ngọc bích (Teal)', bg: '#CCFBF1', text: '#115E59', border: '#5EEAD4' },
  { name: 'Cam đào (Orange)', bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
  { name: 'Xanh đậm (Indigo)', bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
  { name: 'Đỏ hoa hồng (Rose)', bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF' },
  { name: 'Xám thanh lịch (Slate)', bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
  { name: 'Trắng tiêu chuẩn', bg: '#FFFFFF', text: '#1E293B', border: '#E2E8F0' },
];

export const LectureHallScheduleView: React.FC<LectureHallScheduleViewProps> = ({
  db,
  onUpdateDb,
  selectedWeek,
  onSelectWeek,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE_COLORS[0].bg);
  const [activeBuildingFilter, setActiveBuildingFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Modal States
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isAddHallModalOpen, setIsAddHallModalOpen] = useState(false);
  const [editingHallModal, setEditingHallModal] = useState<LectureHall | null>(null);

  // Form states for Add/Edit Hall
  const [hallFormCode, setHallFormCode] = useState('');
  const [hallFormExcelName, setHallFormExcelName] = useState('');
  const [hallFormBuilding, setHallFormBuilding] = useState('Khu Giảng đường');
  const [hallFormCapacity, setHallFormCapacity] = useState(80);
  const [hallFormNote, setHallFormNote] = useState('');

  // Cell Edit Modal state
  const [editingCell, setEditingCell] = useState<{
    dayOfWeek: number;
    session: SessionType;
    hallCode: string;
    hallName: string;
    currentBg?: string;
    currentText?: string;
    currentNote?: string;
    matches: Array<{
      className: string;
      subjectName: string;
      teacherNames: string[];
      periodsCount: number;
    }>;
  } | null>(null);

  const [modalNote, setModalNote] = useState('');
  const [modalBg, setModalBg] = useState('');
  const [modalText, setModalText] = useState('');

  // In-app Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    icon?: 'trash' | 'alert' | 'refresh' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Styles from database
  const styleConfig = useMemo(() => {
    return db.lectureHallStyles || {
      includeInExport: true,
      colorMode: 'subject',
      rowColors: {},
      colColors: {},
      cellColors: {},
    };
  }, [db.lectureHallStyles]);

  const colorMode = styleConfig.colorMode || 'subject';
  const customHallOrder = styleConfig.hallOrder || [];
  const hiddenHallIds = new Set(styleConfig.hiddenHallIds || []);

  // Raw lecture halls from DB
  const rawLectureHalls = useMemo(() => {
    const list = Array.isArray(db.lectureHalls) ? db.lectureHalls : INITIAL_LECTURE_HALLS;
    return list;
  }, [db.lectureHalls]);

  // Sorted lecture halls based on custom order / order property
  const sortedLectureHalls = useMemo(() => {
    return [...rawLectureHalls].sort((a, b) => {
      const idxA = customHallOrder.indexOf(a.id) !== -1 ? customHallOrder.indexOf(a.id) : customHallOrder.indexOf(a.code);
      const idxB = customHallOrder.indexOf(b.id) !== -1 ? customHallOrder.indexOf(b.id) : customHallOrder.indexOf(b.code);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      if (orderA !== orderB) return orderA - orderB;

      return a.code.localeCompare(b.code, 'vi');
    });
  }, [rawLectureHalls, customHallOrder]);

  // Visible halls (excluding inactive and hidden)
  const visibleHalls = useMemo(() => {
    return sortedLectureHalls.filter(h => h.isActive !== false && !hiddenHallIds.has(h.id));
  }, [sortedLectureHalls, hiddenHallIds]);

  const buildings = useMemo(() => {
    const set = new Set<string>();
    rawLectureHalls.forEach(h => {
      if (h.building) set.add(h.building);
    });
    return Array.from(set);
  }, [rawLectureHalls]);

  const filteredHalls = useMemo(() => {
    if (activeBuildingFilter === 'all') return visibleHalls;
    return visibleHalls.filter(h => h.building === activeBuildingFilter);
  }, [visibleHalls, activeBuildingFilter]);

  // Schedules in selected week
  const weekSchedules = useMemo(() => {
    return db.schedules.filter(s => s.weekNumber === selectedWeek);
  }, [db.schedules, selectedWeek]);

  // Days list (2..7)
  const days = [2, 3, 4, 5, 6, 7];
  const dayNames: { [key: number]: string } = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7'
  };

  const sessions: Array<{ key: SessionType; label: string; icon: React.ReactNode }> = [
    { key: 'morning', label: 'Sáng', icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
    { key: 'afternoon', label: 'Chiều', icon: <Moon className="w-3.5 h-3.5 text-orange-500" /> },
  ];

  // ----------------------------------------------------
  // Column Reordering & Movement Logic
  // ----------------------------------------------------
  const handleMoveHallHorizontal = (hallId: string, direction: 'left' | 'right') => {
    const currentList = [...sortedLectureHalls];
    const currentIndex = currentList.findIndex(h => h.id === hallId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const temp = currentList[currentIndex];
    currentList[currentIndex] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    const updatedHalls = currentList.map((h, idx) => ({
      ...h,
      order: idx + 1
    }));

    const newHallOrderIds = updatedHalls.map(h => h.id);

    onUpdateDb(prev => ({
      ...prev,
      lectureHalls: updatedHalls,
      lectureHallStyles: {
        ...(prev.lectureHallStyles || {}),
        hallOrder: newHallOrderIds,
      },
    }));
  };

  const handleMoveHallInList = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sortedLectureHalls.length) return;
    const currentList = [...sortedLectureHalls];
    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    const updatedHalls = currentList.map((h, idx) => ({
      ...h,
      order: idx + 1
    }));

    onUpdateDb(prev => ({
      ...prev,
      lectureHalls: updatedHalls,
      lectureHallStyles: {
        ...(prev.lectureHallStyles || {}),
        hallOrder: updatedHalls.map(h => h.id),
      },
    }));
  };

  const handleSortHallsBy = (type: 'building' | 'name' | 'capacity' | 'default') => {
    let sorted = [...rawLectureHalls];
    if (type === 'building') {
      sorted.sort((a, b) => a.building.localeCompare(b.building, 'vi') || a.code.localeCompare(b.code, 'vi'));
    } else if (type === 'name') {
      sorted.sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
    } else if (type === 'capacity') {
      sorted.sort((a, b) => b.capacity - a.capacity);
    } else if (type === 'default') {
      const defaultIndexMap = new Map(INITIAL_LECTURE_HALLS.map((h, idx) => [h.code, idx]));
      sorted.sort((a, b) => {
        const idxA = defaultIndexMap.has(a.code) ? defaultIndexMap.get(a.code)! : 999;
        const idxB = defaultIndexMap.has(b.code) ? defaultIndexMap.get(b.code)! : 999;
        return idxA - idxB;
      });
    }

    const updatedHalls = sorted.map((h, idx) => ({
      ...h,
      order: idx + 1
    }));

    onUpdateDb(prev => ({
      ...prev,
      lectureHalls: updatedHalls,
      lectureHallStyles: {
        ...(prev.lectureHallStyles || {}),
        hallOrder: updatedHalls.map(h => h.id),
      },
    }));
  };

  const handleToggleHideHall = (hallId: string) => {
    const isHidden = hiddenHallIds.has(hallId);
    let nextHidden: string[];
    if (isHidden) {
      nextHidden = (styleConfig.hiddenHallIds || []).filter(id => id !== hallId);
    } else {
      nextHidden = [...(styleConfig.hiddenHallIds || []), hallId];
    }

    onUpdateDb(prev => ({
      ...prev,
      lectureHallStyles: {
        ...(prev.lectureHallStyles || {}),
        hiddenHallIds: nextHidden,
      },
    }));
  };

  // ----------------------------------------------------
  // CRUD Hall from Matrix Header
  // ----------------------------------------------------
  const handleOpenAddHall = () => {
    setHallFormCode('');
    setHallFormExcelName('');
    setHallFormBuilding(buildings[0] || 'Khu Giảng đường');
    setHallFormCapacity(80);
    setHallFormNote('');
    setIsAddHallModalOpen(true);
  };

  const handleOpenEditHall = (hall: LectureHall) => {
    setEditingHallModal(hall);
    setHallFormCode(hall.code);
    setHallFormExcelName(hall.excelName || cleanLectureHallCode(hall.code) || hall.code);
    setHallFormBuilding(hall.building);
    setHallFormCapacity(hall.capacity);
    setHallFormNote(hall.note || '');
  };

  const handleSaveHallForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallFormCode.trim()) return;

    const rawCode = hallFormCode.trim();
    const cleanCode = cleanLectureHallCode(rawCode) || rawCode;
    const finalExcelName = hallFormExcelName.trim() || cleanCode;

    if (editingHallModal) {
      // Edit existing
      onUpdateDb(prev => ({
        ...prev,
        lectureHalls: (prev.lectureHalls || []).map(h => 
          h.id === editingHallModal.id ? {
            ...h,
            code: cleanCode,
            name: rawCode,
            excelName: finalExcelName,
            building: hallFormBuilding.trim(),
            capacity: Number(hallFormCapacity) || 80,
            note: hallFormNote.trim(),
          } : h
        ),
      }));
      setEditingHallModal(null);
    } else {
      // Add new
      const newHall: LectureHall = {
        id: `hall_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
        code: cleanCode,
        name: rawCode,
        excelName: finalExcelName,
        building: hallFormBuilding.trim(),
        capacity: Number(hallFormCapacity) || 80,
        note: hallFormNote.trim(),
        order: sortedLectureHalls.length + 1,
        isActive: true,
      };

      onUpdateDb(prev => ({
        ...prev,
        lectureHalls: [...(prev.lectureHalls || []), newHall],
        lectureHallStyles: {
          ...(prev.lectureHallStyles || {}),
          hallOrder: [...(prev.lectureHallStyles?.hallOrder || []), newHall.id],
        }
      }));
      setIsAddHallModalOpen(false);
    }
  };

  const handleDeleteHall = (hall: LectureHall) => {
    const targetId = hall.id;
    const targetCode = hall.code.trim().toLowerCase();

    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Giảng Đường Khỏi Hệ Thống',
      icon: 'trash',
      confirmVariant: 'danger',
      confirmText: 'Xóa Vĩnh Viễn',
      message: (
        <div>
          <p>Bạn có chắc chắn muốn xóa giảng đường <b className="text-rose-700">"{hall.code}" ({hall.building})</b> khỏi hệ thống?</p>
          <p className="mt-1 text-slate-500">Giảng đường này sẽ được gỡ khỏi bảng biểu lịch học ngay lập tức.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => {
          const currentList = Array.isArray(prev.lectureHalls) ? prev.lectureHalls : INITIAL_LECTURE_HALLS;
          const remaining = currentList.filter(
            h => h.id !== targetId &&
                 h.code !== hall.code &&
                 h.code.trim().toLowerCase() !== targetCode
          );

          return {
            ...prev,
            lectureHalls: remaining,
            lectureHallStyles: {
              ...(prev.lectureHallStyles || {}),
              hallOrder: (prev.lectureHallStyles?.hallOrder || []).filter(id => id !== targetId && id !== hall.code && id.trim().toLowerCase() !== targetCode),
              hiddenHallIds: (prev.lectureHallStyles?.hiddenHallIds || []).filter(id => id !== targetId && id !== hall.code && id.trim().toLowerCase() !== targetCode),
            }
          };
        });

        if (editingHallModal?.id === hall.id) {
          setEditingHallModal(null);
          setIsAddHallModalOpen(false);
        }
      }
    });
  };

  // ----------------------------------------------------
  // Handlers for Color Modes & Style Updates
  // ----------------------------------------------------
  const handleChangeColorMode = (mode: 'subject' | 'session' | 'custom') => {
    onUpdateDb(prev => ({
      ...prev,
      lectureHallStyles: {
        ...(prev.lectureHallStyles || {}),
        colorMode: mode,
      },
    }));
  };

  // Color whole ROW
  const handleColorRow = (dayOfWeek: number, session: SessionType, colorHex: string) => {
    const rowKey = `${dayOfWeek}_${session}`;
    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newRowColors = { ...(current.rowColors || {}), [rowKey]: colorHex };
      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          rowColors: newRowColors,
          colorMode: 'custom',
        },
      };
    });
  };

  // Color whole COLUMN
  const handleColorCol = (hallCode: string, colorHex: string) => {
    const colKey = cleanLectureHallCode(hallCode).toLowerCase();
    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newColColors = { ...(current.colColors || {}), [colKey]: colorHex };
      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          colColors: newColColors,
          colorMode: 'custom',
        },
      };
    });
  };

  // Color ALL Mornings
  const handleColorAllMornings = (colorHex: string) => {
    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newRowColors = { ...(current.rowColors || {}) };
      days.forEach(d => {
        newRowColors[`${d}_morning`] = colorHex;
      });
      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          rowColors: newRowColors,
          colorMode: 'custom',
        },
      };
    });
  };

  // Color ALL Afternoons
  const handleColorAllAfternoons = (colorHex: string) => {
    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newRowColors = { ...(current.rowColors || {}) };
      days.forEach(d => {
        newRowColors[`${d}_afternoon`] = colorHex;
      });
      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          rowColors: newRowColors,
          colorMode: 'custom',
        },
      };
    });
  };

  // Reset all custom colors
  const handleResetColors = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Khôi Phục Màu Sắc Mặc Định',
      icon: 'refresh',
      confirmVariant: 'primary',
      confirmText: 'Khôi Phục Màu',
      message: (
        <div>
          <p>Bạn có chắc muốn khôi phục toàn bộ màu sắc Lịch Giảng Đường về mặc định (Màu pastel môn học)?</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => ({
          ...prev,
          lectureHallStyles: {
            includeInExport: true,
            colorMode: 'subject',
            morningBg: '#EFF6FF',
            afternoonBg: '#FFF7ED',
            rowColors: {},
            colColors: {},
            cellColors: {},
            hallOrder: prev.lectureHallStyles?.hallOrder,
            hiddenHallIds: prev.lectureHallStyles?.hiddenHallIds,
          },
        }));
      }
    });
  };

  // Open Cell Click Modal
  const handleCellClick = (
    dayOfWeek: number,
    session: SessionType,
    hall: LectureHall,
    matches: Array<{
      className: string;
      subjectName: string;
      teacherNames: string[];
      periodsCount: number;
    }>
  ) => {
    const hallCodeClean = cleanLectureHallCode(hall.code).toLowerCase();
    const cellKey = `${selectedWeek}_${dayOfWeek}_${session}_${hallCodeClean}`;
    const customCell = styleConfig.cellColors?.[cellKey];

    setEditingCell({
      dayOfWeek,
      session,
      hallCode: hall.code,
      hallName: hall.name,
      currentBg: customCell?.bgHex || '',
      currentText: customCell?.textHex || '',
      currentNote: customCell?.customNote || '',
      matches,
    });

    setModalBg(customCell?.bgHex || selectedColor);
    setModalText(customCell?.textHex || '#1e293b');
    setModalNote(customCell?.customNote || '');
  };

  // Save Single Cell Color / Note
  const handleSaveCellCustom = () => {
    if (!editingCell) return;
    const hallCodeClean = cleanLectureHallCode(editingCell.hallCode).toLowerCase();
    const cellKey = `${selectedWeek}_${editingCell.dayOfWeek}_${editingCell.session}_${hallCodeClean}`;

    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newCellColors = {
        ...(current.cellColors || {}),
        [cellKey]: {
          bgHex: modalBg,
          textHex: modalText,
          customNote: modalNote.trim(),
        },
      };

      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          cellColors: newCellColors,
        },
      };
    });

    setEditingCell(null);
  };

  // Clear Single Cell Color
  const handleClearCellCustom = () => {
    if (!editingCell) return;
    const hallCodeClean = cleanLectureHallCode(editingCell.hallCode).toLowerCase();
    const cellKey = `${selectedWeek}_${editingCell.dayOfWeek}_${editingCell.session}_${hallCodeClean}`;

    onUpdateDb(prev => {
      const current = prev.lectureHallStyles || {};
      const newCellColors = { ...(current.cellColors || {}) };
      delete newCellColors[cellKey];

      return {
        ...prev,
        lectureHallStyles: {
          ...current,
          cellColors: newCellColors,
        },
      };
    });

    setEditingCell(null);
  };

  // Export Matrix to Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportLectureHallScheduleToExcel(db, selectedWeek, {
        lectureHallColorMode: colorMode,
      });
    } catch (err: any) {
      alert(`Lỗi xuất Excel: ${err?.message || 'Không thể tạo file'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Matrix View Header & Color Customization Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-xs text-sky-700 font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <span>Lịch Sử Dụng Giảng Đường Lý Thuyết</span>
              <span>•</span>
              <span className="text-slate-500 font-normal">Tuần {selectedWeek} ({db.academicYear})</span>
            </div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span>BẢNG THEO DÕI & ĐIỀU PHỐI GIẢNG ĐƯỜNG</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                {filteredHalls.length} / {rawLectureHalls.length} phòng hiển thị
              </span>
              {hiddenHallIds.size > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
                  Ẩn {hiddenHallIds.size} phòng
                </span>
              )}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Add New Hall Button */}
            <button
              type="button"
              onClick={handleOpenAddHall}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              title="Thêm giảng đường mới vào hệ thống"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Giảng Đường</span>
            </button>

            {/* Reorder Columns Modal Button */}
            <button
              type="button"
              onClick={() => setIsReorderModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition"
              title="Sắp xếp lại thứ tự cột hoặc ẩn/hiện giảng đường"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sắp Xếp Cột ({sortedLectureHalls.length})</span>
            </button>

            {/* Color Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleChangeColorMode('subject')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  colorMode === 'subject'
                    ? 'bg-white text-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tô màu tự động theo màu Pastel của từng Môn học"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Màu Môn</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeColorMode('session')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  colorMode === 'session'
                    ? 'bg-white text-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sáng: Xanh nhạt, Chiều: Vàng cam nhạt"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Màu Buổi</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeColorMode('custom')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  colorMode === 'custom'
                    ? 'bg-white text-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tô màu tự do cho từng Hàng, Cột hoặc Ô"
              >
                <Palette className="w-3.5 h-3.5 text-purple-500" />
                <span>Tùy Biến</span>
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel GĐ'}</span>
            </button>
          </div>
        </div>

        {/* Quick Batch Color Tools Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Palette Colors Selection */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
              <Paintbrush className="w-3.5 h-3.5 text-purple-600" />
              <span>Cọ màu:</span>
            </span>

            <div className="flex items-center gap-1.5">
              {PALETTE_COLORS.map(c => {
                const isSelected = selectedColor === c.bg;
                return (
                  <button
                    type="button"
                    key={c.bg}
                    onClick={() => setSelectedColor(c.bg)}
                    title={c.name}
                    style={{ backgroundColor: c.bg, borderColor: c.border }}
                    className={`w-6 h-6 rounded-md border transition flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-1 scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Batch Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleColorAllMornings(selectedColor)}
              className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold transition flex items-center gap-1"
              title="Tô màu đã chọn cho toàn bộ các buổi Sáng trong tuần"
            >
              <Sun className="w-3.5 h-3.5 text-sky-600" />
              <span>Tô tất cả Buổi Sáng</span>
            </button>

            <button
              type="button"
              onClick={() => handleColorAllAfternoons(selectedColor)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition flex items-center gap-1"
              title="Tô màu đã chọn cho toàn bộ các buổi Chiều trong tuần"
            >
              <Moon className="w-3.5 h-3.5 text-amber-600" />
              <span>Tô tất cả Buổi Chiều</span>
            </button>

            <button
              type="button"
              onClick={handleResetColors}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition flex items-center gap-1"
              title="Xóa bỏ màu tùy biến, trở về màu môn học mặc định"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>

        {/* Building Filter Bar */}
        <div className="flex items-center gap-2 text-xs overflow-x-auto pt-2">
          <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc khu:</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveBuildingFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition shrink-0 ${
              activeBuildingFilter === 'all'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({visibleHalls.length} GĐ)
          </button>
          {buildings.map(b => {
            const count = visibleHalls.filter(h => h.building === b).length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                key={b}
                onClick={() => setActiveBuildingFilter(b)}
                className={`px-3 py-1 rounded-lg font-bold transition shrink-0 ${
                  activeBuildingFilter === b
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b} ({count})
              </button>
            );
          })}
        </div>

      </div>

      {/* 2. Interactive Matrix Grid */}
      {filteredHalls.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">
              {rawLectureHalls.length === 0
                ? 'Chưa có giảng đường nào trong hệ thống'
                : 'Không có giảng đường nào phù hợp với bộ lọc hoặc tất cả đang bị ẩn'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {rawLectureHalls.length === 0
                ? 'Bạn có thể bấm "+ Thêm Giảng Đường" bên trên để tạo phòng học mới theo nhu cầu phân lịch.'
                : 'Hãy thử chọn "Tất cả khu" hoặc mở mục "Sắp Xếp Cột" để bật lại các giảng đường đã ẩn.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenAddHall}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Giảng Đường Mới</span>
            </button>
            {hiddenHallIds.size > 0 && (
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Mở Sắp Xếp Cột ({hiddenHallIds.size} phòng đang ẩn)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Header Row: Trộn THỨ + BUỔI thành GIẢNG ĐƯỜNG | 101 | 102 ... */}
                <tr className="bg-slate-900 text-white">
                  <th
                    colSpan={2}
                    className="p-3 text-center font-bold border-r border-slate-800 w-32 sticky left-0 z-20 bg-slate-900 uppercase tracking-wider text-xs"
                  >
                    Giảng đường
                  </th>
                  {filteredHalls.map((hall, hIdx) => {
                    const hallCodeClean = cleanLectureHallCode(hall.code).toLowerCase();
                    const customColBg = styleConfig.colColors?.[hallCodeClean];
                    const displayCode = cleanLectureHallCode(hall.code) || hall.code;
                    const isFirst = hIdx === 0;
                    const isLast = hIdx === filteredHalls.length - 1;

                    return (
                      <th
                        key={hall.id}
                        className="p-2 text-center border-r border-slate-800 min-w-[160px] max-w-[200px] font-bold relative group"
                      >
                        {/* Column Reorder & Quick Action Bar */}
                        <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-slate-800">
                          {/* Move Left */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveHallHorizontal(hall.id, 'left');
                            }}
                            disabled={isFirst}
                            className="p-1 rounded bg-white/10 hover:bg-white/30 text-white disabled:opacity-20 disabled:hover:bg-white/10 transition cursor-pointer"
                            title="Di chuyển cột này sang TRÁI"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Middle Title */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black tracking-wide text-amber-300">
                              {displayCode}
                            </span>
                          </div>

                          {/* Move Right */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveHallHorizontal(hall.id, 'right');
                            }}
                            disabled={isLast}
                            className="p-1 rounded bg-white/10 hover:bg-white/30 text-white disabled:opacity-20 disabled:hover:bg-white/10 transition cursor-pointer"
                            title="Di chuyển cột này sang PHẢI"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Sub details: Building & Capacity */}
                        <div className="text-[10px] text-slate-300 font-normal">
                          {hall.building} • {hall.capacity} chỗ
                        </div>

                        {/* Bottom Quick Tools for this Column */}
                        <div className="flex items-center justify-center gap-1 mt-1.5 pt-1 border-t border-slate-800/80">
                          {/* Edit Hall */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditHall(hall)}
                            className="p-1 rounded bg-white/10 hover:bg-blue-600 text-slate-200 hover:text-white text-[10px] flex items-center gap-1 transition"
                            title="Chỉnh sửa thông tin giảng đường này"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Paint Column */}
                          <button
                            type="button"
                            onClick={() => handleColorCol(hall.code, selectedColor)}
                            title={`Tô màu toàn bộ cột ${displayCode} bằng màu đã chọn`}
                            className="p-1 rounded bg-white/10 hover:bg-purple-600 text-slate-200 hover:text-white text-[10px] flex items-center gap-1 transition"
                          >
                            <Paintbrush className="w-3 h-3" />
                            <span>Tô cột</span>
                          </button>

                          {/* Delete Hall */}
                          <button
                            type="button"
                            onClick={() => handleDeleteHall(hall)}
                            className="p-1 rounded bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white text-[10px] transition"
                            title="Xóa giảng đường này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

            <tbody>
              {days.map((day) => {
                return (
                  <React.Fragment key={day}>
                    {sessions.map((sess, sIdx) => {
                      const rowKey = `${day}_${sess.key}`;
                      const customRowBg = styleConfig.rowColors?.[rowKey];
                      const slotSchedules = weekSchedules.filter(s => s.dayOfWeek === day && s.session === sess.key);

                      return (
                        <tr
                          key={`${day}_${sess.key}`}
                          className={`border-b border-slate-200 transition ${
                            sess.key === 'morning' ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          {/* Col 1: THỨ (Merged 2 rows for morning & afternoon) */}
                          {sIdx === 0 && (
                            <td
                              rowSpan={2}
                              className="p-3 text-center font-black text-slate-800 bg-slate-100 border-r border-b border-slate-300 sticky left-0 z-10 align-middle"
                            >
                              <div className="text-sm">{dayNames[day]}</div>
                            </td>
                          )}

                          {/* Col 2: BUỔI */}
                          <td
                            className={`p-2 text-center font-bold border-r border-slate-200 sticky left-16 z-10 align-middle ${
                              sess.key === 'morning'
                                ? 'bg-sky-50 text-sky-900'
                                : 'bg-amber-50 text-amber-900'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {sess.icon}
                              <span>{sess.label}</span>
                            </div>

                            {/* Quick Paint Row button */}
                            <button
                              type="button"
                              onClick={() => handleColorRow(day, sess.key, selectedColor)}
                              title={`Tô màu toàn bộ hàng ${dayNames[day]} (${sess.label}) bằng màu đã chọn`}
                              className="mt-1 px-1 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-[9px] flex items-center justify-center gap-0.5 mx-auto transition cursor-pointer"
                            >
                              <Paintbrush className="w-2.5 h-2.5" />
                              <span>Tô hàng</span>
                            </button>
                          </td>

                          {/* Lecture Hall Cells */}
                          {filteredHalls.map(hall => {
                            const hallCodeClean = cleanLectureHallCode(hall.code).toLowerCase();
                            const colKey = hallCodeClean;
                            const cellKey = `${selectedWeek}_${day}_${sess.key}_${hallCodeClean}`;

                            const customCell = styleConfig.cellColors?.[cellKey];
                            const customColBg = styleConfig.colColors?.[colKey];

                            // Find theoretical matches in this hall
                            const matches: Array<{
                              className: string;
                              subjectName: string;
                              teacherNames: string[];
                              periodsCount: number;
                              colorBg?: string;
                              colorText?: string;
                            }> = [];

                            slotSchedules.forEach(sch => {
                              const cls = db.classes.find(c => c.id === sch.classId);
                              const clsName = cls ? cls.name : sch.classId;

                              sch.periods.forEach(p => {
                                if (p.periodType === 'LT') {
                                  const pRoomClean = cleanLectureHallCode(p.roomOrHospital).toLowerCase();
                                  if (pRoomClean === hallCodeClean || pRoomClean === hall.code.toLowerCase()) {
                                    const sub = db.subjects.find(s => s.id === p.subjectId);
                                    const teacherNames = (p.teacherIds || []).map(tId => db.teachers.find(t => t.id === tId)?.name || tId);
                                    matches.push({
                                      className: clsName,
                                      subjectName: sub ? (sub.shortName || sub.name) : 'Lý thuyết',
                                      teacherNames,
                                      periodsCount: p.periodsCount,
                                      colorBg: sub?.colorBg,
                                      colorText: sub?.colorText,
                                    });
                                  }
                                }
                              });
                            });

                            // Determine Background & Text Color
                            let bgStyle: string | undefined = undefined;
                            let textStyle: string | undefined = undefined;

                            if (customCell?.bgHex) {
                              bgStyle = customCell.bgHex;
                              textStyle = customCell.textHex || '#1e293b';
                            } else if (customRowBg) {
                              bgStyle = customRowBg;
                            } else if (customColBg) {
                              bgStyle = customColBg;
                            } else if (colorMode === 'session') {
                              bgStyle = sess.key === 'morning' ? '#EFF6FF' : '#FFF7ED';
                              textStyle = sess.key === 'morning' ? '#0369A1' : '#9A3412';
                            } else if (colorMode === 'subject' && matches.length > 0) {
                              bgStyle = matches[0].colorBg || '#EEF2FF';
                              textStyle = matches[0].colorText || '#1E1B4B';
                            }

                            return (
                              <td
                                key={hall.id}
                                onClick={() => handleCellClick(day, sess.key, hall, matches)}
                                style={{
                                  backgroundColor: bgStyle,
                                  color: textStyle,
                                }}
                                className={`p-2.5 border-r border-b border-slate-200 text-center align-middle transition cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-inset relative group min-h-[70px] ${
                                  !bgStyle && (sess.key === 'morning' ? 'bg-white' : 'bg-slate-50/50')
                                }`}
                              >
                                {matches.length > 0 ? (
                                  <div className="space-y-1">
                                    {matches.map((m, mIdx) => (
                                      <div key={mIdx} className={mIdx > 0 ? 'pt-1 border-t border-slate-300/60' : ''}>
                                        <div className="font-extrabold text-[12px] uppercase leading-tight tracking-tight">
                                          {m.className}
                                        </div>
                                        <div className="font-bold text-[11px] leading-snug">
                                          {m.subjectName}
                                        </div>
                                        {m.teacherNames.length > 0 && (
                                          <div className="text-[10px] opacity-85 leading-none mt-0.5">
                                            GV: {m.teacherNames.join(', ')}
                                          </div>
                                        )}
                                        <div className="text-[9.5px] font-semibold opacity-75 mt-0.5">
                                          [{m.periodsCount} tiết]
                                        </div>
                                      </div>
                                    ))}

                                    {customCell?.customNote && (
                                      <div className="mt-1 text-[10px] italic font-semibold text-rose-700 bg-rose-50/80 rounded px-1 py-0.5 border border-rose-200">
                                        📌 {customCell.customNote}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 text-[11px] py-2 flex flex-col items-center justify-center">
                                    {customCell?.customNote ? (
                                      <span className="text-xs font-bold text-slate-700 bg-white/80 rounded px-1.5 py-0.5 border border-slate-200">
                                        📌 {customCell.customNote}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 group-hover:text-blue-500 text-[10px]">
                                        + Thêm ghi chú/màu
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 3. Notice & Instructions */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            💡 Toàn Quyền Quản Lý & Điều Phối Giảng Đường:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800 text-[11px]">
            <li><b>Di chuyển vị trí cột:</b> Bấm trực tiếp nút <b>&lt; (Trái)</b> hoặc <b>&gt; (Phải)</b> trên từng tiêu đề Giảng đường để đổi vị trí, hoặc bấm nút <b>"Sắp Xếp Cột"</b> để kéo thả/xếp tự động.</li>
            <li><b>Chỉnh sửa / Xóa Giảng đường:</b> Bấm nút <b>Sửa</b> hoặc <b>Xóa</b> ngay trên dòng Giảng đường để cập nhật thông tin hoặc xóa phòng khỏi hệ thống.</li>
            <li><b>Tô màu theo Môn học (mặc định):</b> Các ô có lịch học lý thuyết sẽ tự động đồng bộ màu pastel theo từng môn học như trên TKB.</li>
            <li><b>Tô màu đồng loạt cho cả HÀNG hoặc CỘT:</b> Nhấp vào nút <b>"Tô hàng"</b> ở cột Buổi hoặc nút <b>"Tô cột"</b> ở tiêu đề Giảng đường.</li>
            <li><b>Tùy chỉnh từng ô riêng biệt:</b> Nhấp chuột trực tiếp vào bất kỳ ô nào trên bảng để chọn màu nền, màu chữ hoặc gán ghi chú riêng.</li>
            <li><b>Xuất File Excel:</b> Toàn bộ thứ tự cột và màu sắc tùy chỉnh sẽ được xuất chính xác 100% vào sheet <b>"Lịch Giảng Đường"</b> khi tải về.</li>
          </ul>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Column Reordering Modal */}
      {/* ---------------------------------------------------- */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Sắp Xếp & Quản Lý Cột Giảng Đường
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Kéo thả, di chuyển thứ tự hoặc ẩn/hiện các giảng đường trên bảng ma trận và file Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* Quick Sort Options */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sắp xếp nhanh theo tiêu chí:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('building')}
                    className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 border border-slate-300 hover:border-indigo-300 rounded-lg text-xs font-semibold transition"
                  >
                    Theo Khu/Tòa nhà
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('name')}
                    className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 border border-slate-300 hover:border-indigo-300 rounded-lg text-xs font-semibold transition"
                  >
                    Theo Tên phòng (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('capacity')}
                    className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-900 border border-slate-300 hover:border-indigo-300 rounded-lg text-xs font-semibold transition"
                  >
                    Theo Sức chứa (Giảm dần)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('default')}
                    className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-900 border border-slate-300 hover:border-rose-300 rounded-lg text-xs font-semibold transition"
                  >
                    Khôi phục mặc định
                  </button>
                </div>
              </div>

              {/* Halls Order List */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {sortedLectureHalls.map((hall, idx) => {
                  const isHidden = hiddenHallIds.has(hall.id);
                  const isFirst = idx === 0;
                  const isLast = idx === sortedLectureHalls.length - 1;

                  return (
                    <div
                      key={hall.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        isHidden 
                          ? 'bg-slate-100 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{hall.code}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                              {hall.building}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({hall.capacity} chỗ)
                            </span>
                          </div>
                          {hall.excelName && hall.excelName !== hall.code && (
                            <span className="text-[11px] text-slate-400">
                              Excel: {hall.excelName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveHallInList(idx, idx - 1)}
                          disabled={isFirst}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 transition"
                          title="Lên trên"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveHallInList(idx, idx + 1)}
                          disabled={isLast}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 transition"
                          title="Xuống dưới"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Hide / Show */}
                        <button
                          type="button"
                          onClick={() => handleToggleHideHall(hall.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isHidden ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title={isHidden ? 'Hiển thị lại phòng này' : 'Tạm ẩn phòng này'}
                        >
                          {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {/* Quick Edit */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsReorderModalOpen(false);
                            handleOpenEditHall(hall);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Quick Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteHall(hall)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa vĩnh viễn giảng đường này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Tổng cộng: <b>{sortedLectureHalls.length}</b> giảng đường ({visibleHalls.length} hiển thị)
              </span>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
              >
                Hoàn Tất & Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. Add / Edit Hall Modal */}
      {/* ---------------------------------------------------- */}
      {(isAddHallModalOpen || editingHallModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-300" />
                <h3 className="text-sm font-bold text-white">
                  {editingHallModal ? `Chỉnh Sửa Giảng Đường ${editingHallModal.code}` : 'Thêm Giảng Đường Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddHallModalOpen(false);
                  setEditingHallModal(null);
                }}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHallForm} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã / Tên Giảng đường (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 101, 201, Phòng TM, B6P1..."
                  value={hallFormCode}
                  onChange={(e) => setHallFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên hiển thị tiêu đề file Excel:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 101, Phòng TM, GĐ 101..."
                  value={hallFormExcelName}
                  onChange={(e) => setHallFormExcelName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Khu / Tòa nhà (*):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Khu Nhà A, Khu Giảng đường..."
                    value={hallFormBuilding}
                    onChange={(e) => setHallFormBuilding(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sức chứa (SV):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={hallFormCapacity}
                    onChange={(e) => setHallFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Có máy chiếu, Hội trường tầng 2..."
                  value={hallFormNote}
                  onChange={(e) => setHallFormNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {editingHallModal ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteHall(editingHallModal)}
                    className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa phòng</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddHallModalOpen(false);
                      setEditingHallModal(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-xs transition"
                  >
                    {editingHallModal ? 'Lưu Thay Đổi' : 'Tạo Giảng Đường'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. Cell Customization Modal */}
      {/* ---------------------------------------------------- */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Tùy Chỉnh Ô Giảng Đường {editingCell.hallName}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {dayNames[editingCell.dayOfWeek]} • Buổi {editingCell.session === 'morning' ? 'Sáng' : 'Chiều'} (Tuần {selectedWeek})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Lớp & Môn đang học */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-1">Trạng thái hiện tại:</div>
                {editingCell.matches.length > 0 ? (
                  <div className="space-y-1">
                    {editingCell.matches.map((m, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-blue-900">{m.className}</span>: {m.subjectName} ({m.periodsCount} tiết)
                        {m.teacherNames.length > 0 && <span className="text-slate-500"> - GV: {m.teacherNames.join(', ')}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">Giảng đường đang trống trong buổi này.</div>
                )}
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tô màu nền cho ô này:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PALETTE_COLORS.map(c => {
                    const isSelected = modalBg === c.bg;
                    return (
                      <button
                        type="button"
                        key={c.bg}
                        onClick={() => {
                          setModalBg(c.bg);
                          setModalText(c.text);
                        }}
                        style={{ backgroundColor: c.bg, borderColor: c.border }}
                        className={`h-9 rounded-lg border transition flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'ring-2 ring-blue-600 ring-offset-1 scale-105' : 'hover:scale-102'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú riêng cho ô (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Ví dụ: Thi cuối kỳ, Hội nghị, Bảo trì máy chiếu..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearCellCustom}
                className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa màu ô</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveCellCustom}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        confirmVariant={confirmConfig.confirmVariant}
        icon={confirmConfig.icon}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
