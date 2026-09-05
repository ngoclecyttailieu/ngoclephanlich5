import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  FlaskConical, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Download, 
  Upload, 
  Info, 
  Calendar, 
  Filter, 
  ArrowRight,
  Palette,
  Sparkles,
  Type,
  FileSpreadsheet,
  RefreshCw,
  PlusCircle,
  Wand2,
  Check,
  Tag,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { AppDatabase, LectureHall, Department, SessionSchedule, Subject, StudentClass, CombinedClassAlias } from '../types';
import { cleanLectureHallCode } from '../services/schedulerService';
import { downloadExcelTemplate } from '../services/excelService';
import { 
  generateClassShortName, 
  getClassShortName, 
  getCombinedClassShortName, 
  getLectureHallExcelName,
  INITIAL_LECTURE_HALLS
} from '../services/storage';
import { LectureHallScheduleView } from './LectureHallScheduleView';
import { ConfirmModal } from './ConfirmModal';

interface RoomManagementProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  selectedWeek: number;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  db,
  onUpdateDb,
  selectedWeek,
}) => {
  const [subTab, setSubTab] = useState<'matrix' | 'halls' | 'departments' | 'aliases' | 'live_status'>('matrix');
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [viewSlotDay, setViewSlotDay] = useState<number>(2); // Thứ 2 default
  const [viewSlotSession, setViewSlotSession] = useState<'morning' | 'afternoon'>('morning');

  // Alias filter states
  const [aliasSearch, setAliasSearch] = useState('');
  const [aliasCohortFilter, setAliasCohortFilter] = useState<string>('all');

  // Selected halls for batch deletion / actions
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);

  // Modal / Form states for Lecture Hall
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<LectureHall | null>(null);
  const [hallCode, setHallCode] = useState('');
  const [hallName, setHallName] = useState('');
  const [hallExcelName, setHallExcelName] = useState('');
  const [hallBuilding, setHallBuilding] = useState('Khu Nhà A');
  const [hallCapacity, setHallCapacity] = useState(80);
  const [hallType, setHallType] = useState<'LT' | 'TH' | 'LS'>('LT');
  const [hallNote, setHallNote] = useState('');
  const [hallOrder, setHallOrder] = useState<number>(1);

  // Modal / Form states for Department
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptPracticeRoomNames, setDeptPracticeRoomNames] = useState<string[]>([]);
  const [deptNote, setDeptNote] = useState('');

  // Modal / Form states for Combined Alias
  const [isCombinedAliasModalOpen, setIsCombinedAliasModalOpen] = useState(false);
  const [editingCombinedAlias, setEditingCombinedAlias] = useState<CombinedClassAlias | null>(null);
  const [selectedClassIdsForAlias, setSelectedClassIdsForAlias] = useState<string[]>([]);
  const [customCombinedShortName, setCustomCombinedShortName] = useState('');

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

  const lectureHalls = useMemo(() => {
    const list = db.lectureHalls || [];
    return [...list].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.code.localeCompare(b.code, 'vi');
    });
  }, [db.lectureHalls]);
  const departments = useMemo(() => db.departments || [], [db.departments]);
  const combinedAliases = useMemo(() => db.combinedClassAliases || (db as any).combinedAliases || [], [db.combinedClassAliases, (db as any).combinedAliases]);

  const handleMoveHall = (id: string, direction: 'up' | 'down') => {
    const currentList = [...lectureHalls];
    const currentIndex = currentList.findIndex(h => h.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const temp = currentList[currentIndex];
    currentList[currentIndex] = currentList[targetIndex];
    currentList[targetIndex] = temp;

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
      }
    }));
  };

  const handleSortHallsBy = (type: 'building' | 'name' | 'capacity') => {
    let sorted = [...lectureHalls];
    if (type === 'building') {
      sorted.sort((a, b) => a.building.localeCompare(b.building, 'vi') || a.code.localeCompare(b.code, 'vi'));
    } else if (type === 'name') {
      sorted.sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
    } else if (type === 'capacity') {
      sorted.sort((a, b) => b.capacity - a.capacity);
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
      }
    }));
  };

  // Unique buildings
  const buildings = useMemo(() => {
    const set = new Set<string>();
    lectureHalls.forEach(h => {
      if (h.building) set.add(h.building);
    });
    return Array.from(set);
  }, [lectureHalls]);

  // Schedules in selected week
  const weekSchedules = useMemo(() => {
    return db.schedules.filter(s => s.weekNumber === selectedWeek);
  }, [db.schedules, selectedWeek]);

  // Slot schedules (selectedWeek, viewSlotDay, viewSlotSession)
  const slotSchedules = useMemo(() => {
    return weekSchedules.filter(s => s.dayOfWeek === viewSlotDay && s.session === viewSlotSession);
  }, [weekSchedules, viewSlotDay, viewSlotSession]);

  // Map of hall usage in current slot
  const hallUsageMap = useMemo(() => {
    const map = new Map<string, { className: string; subjectName: string; periodsCount: number; teacherNames: string[] }>();
    slotSchedules.forEach(sch => {
      const cls = db.classes.find(c => c.id === sch.classId);
      const clsName = cls?.name || sch.classId;
      sch.periods.forEach(p => {
        if (p.periodType === 'LT') {
          const code = cleanLectureHallCode(p.roomOrHospital);
          if (code) {
            const sub = db.subjects.find(s => s.id === p.subjectId);
            const teacherNames = (p.teacherIds || []).map(tId => db.teachers.find(t => t.id === tId)?.name || tId);
            map.set(code.toLowerCase(), {
              className: clsName,
              subjectName: sub?.name || 'Lý thuyết',
              periodsCount: p.periodsCount,
              teacherNames,
            });
          }
        }
      });
    });
    return map;
  }, [slotSchedules, db.classes, db.subjects, db.teachers]);

  // Department practice room usage in current slot
  const deptUsageMap = useMemo(() => {
    const map = new Map<string, { count: number; classes: Array<{ className: string; subjectName: string; practiceType: string }> }>();
    slotSchedules.forEach(sch => {
      const cls = db.classes.find(c => c.id === sch.classId);
      const clsName = cls?.name || sch.classId;
      sch.periods.forEach(p => {
        if (p.periodType === 'TH') {
          const sub = db.subjects.find(s => s.id === p.subjectId);
          const deptId = sub?.departmentId;
          if (deptId) {
            const entry = map.get(deptId) || { count: 0, classes: [] };
            entry.count += 1;
            entry.classes.push({
              className: clsName,
              subjectName: sub?.name || 'Thực hành',
              practiceType: p.practiceType === 'half' ? '1/2 lớp' : 'Cả lớp',
            });
            map.set(deptId, entry);
          }
        }
      });
    });
    return map;
  }, [slotSchedules, db.classes, db.subjects]);

  // Handlers for Lecture Halls
  const handleOpenAddHall = () => {
    setEditingHall(null);
    setHallCode('');
    setHallName('');
    setHallExcelName('');
    setHallBuilding(buildings[0] || 'Khu Nhà A');
    setHallCapacity(80);
    setHallType('LT');
    setHallNote('');
    setHallOrder(lectureHalls.length + 1);
    setIsHallModalOpen(true);
  };

  const handleOpenEditHall = (hall: LectureHall) => {
    setEditingHall(hall);
    setHallCode(hall.code);
    setHallName(hall.name);
    setHallExcelName(hall.excelName || cleanLectureHallCode(hall.code) || hall.code);
    setHallBuilding(hall.building);
    setHallCapacity(hall.capacity);
    setHallType(hall.type || 'LT');
    setHallNote(hall.note || '');
    setHallOrder(hall.order || 1);
    setIsHallModalOpen(true);
  };

  const handleSaveHall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallCode.trim()) return;

    const rawCode = hallCode.trim();
    const cleanCode = cleanLectureHallCode(rawCode) || rawCode;
    const finalExcelName = hallExcelName.trim() || cleanCode;

    if (editingHall) {
      onUpdateDb(prev => ({
        ...prev,
        lectureHalls: (prev.lectureHalls || []).map(h => 
          h.id === editingHall.id ? {
            ...h,
            code: cleanCode,
            name: rawCode,
            excelName: finalExcelName,
            building: hallBuilding.trim(),
            capacity: Number(hallCapacity) || 80,
            type: hallType,
            note: hallNote.trim(),
            order: Number(hallOrder) || 1,
          } : h
        ),
      }));
    } else {
      const newHall: LectureHall = {
        id: `hall_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
        code: cleanCode,
        name: rawCode,
        excelName: finalExcelName,
        building: hallBuilding.trim(),
        capacity: Number(hallCapacity) || 80,
        type: hallType,
        note: hallNote.trim(),
        order: Number(hallOrder) || (lectureHalls.length + 1),
        isActive: true,
      };
      onUpdateDb(prev => ({
        ...prev,
        lectureHalls: [...(prev.lectureHalls || []), newHall],
      }));
    }
    setIsHallModalOpen(false);
  };

  // Toggle single selection
  const handleToggleSelectHall = (id: string) => {
    setSelectedHallIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all currently filtered halls
  const handleSelectAllFiltered = () => {
    const ids = filteredHalls.map(h => h.id);
    setSelectedHallIds(prev => {
      const set = new Set([...prev, ...ids]);
      return Array.from(set);
    });
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedHallIds([]);
  };

  // Delete selected halls
  const handleDeleteSelectedHalls = () => {
    if (selectedHallIds.length === 0) return;
    const count = selectedHallIds.length;

    setConfirmConfig({
      isOpen: true,
      title: 'Xác Nhận Xóa Nhiều Giảng Đường',
      icon: 'trash',
      confirmVariant: 'danger',
      confirmText: `Xóa ${count} Giảng Đường`,
      message: (
        <div>
          <p>Bạn có chắc chắn muốn xóa vĩnh viễn <b>{count} giảng đường đã chọn</b> khỏi hệ thống?</p>
          <p className="mt-1 text-slate-500">Các cột lịch tương ứng sẽ được dọn dẹp và cập nhật lại ngay lập tức.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => {
          const currentList = Array.isArray(prev.lectureHalls) ? prev.lectureHalls : INITIAL_LECTURE_HALLS;
          const selectedSet = new Set(selectedHallIds);
          const matchedHalls = currentList.filter(h => selectedSet.has(h.id) || selectedSet.has(h.code));
          const idsToRemove = new Set([
            ...selectedHallIds,
            ...matchedHalls.map(h => h.id),
            ...matchedHalls.map(h => h.code),
            ...matchedHalls.map(h => h.code.trim().toLowerCase()),
          ]);

          const remaining = currentList.filter(
            h => !idsToRemove.has(h.id) && !idsToRemove.has(h.code) && !idsToRemove.has(h.code.trim().toLowerCase())
          );

          return {
            ...prev,
            lectureHalls: remaining,
            lectureHallStyles: {
              ...(prev.lectureHallStyles || {}),
              hallOrder: (prev.lectureHallStyles?.hallOrder || []).filter(hId => !idsToRemove.has(hId)),
              hiddenHallIds: (prev.lectureHallStyles?.hiddenHallIds || []).filter(hId => !idsToRemove.has(hId)),
            }
          };
        });
        setSelectedHallIds([]);
      }
    });
  };

  const handleDeleteHall = (id: string) => {
    const hall = lectureHalls.find(h => h.id === id || h.code === id || h.code.trim().toLowerCase() === id.trim().toLowerCase());
    const hallNameDisplay = hall ? `"${hall.name || hall.code}" (${hall.building})` : `mã "${id}"`;

    const targetId = hall?.id || id;
    const targetCode = (hall?.code || id).trim().toLowerCase();

    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Giảng Đường Khỏi Hệ Thống',
      icon: 'trash',
      confirmVariant: 'danger',
      confirmText: 'Xóa Vĩnh Viễn',
      message: (
        <div>
          <p>Bạn có chắc chắn muốn xóa vĩnh viễn giảng đường <b className="text-rose-700">{hallNameDisplay}</b> khỏi hệ thống?</p>
          <p className="mt-1 text-slate-500">Giảng đường này sẽ không còn xuất hiện trong danh mục và bảng lịch giảng đường.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => {
          const currentList = Array.isArray(prev.lectureHalls) ? prev.lectureHalls : INITIAL_LECTURE_HALLS;
          const remaining = currentList.filter(
            h => h.id !== targetId &&
                 h.id !== id &&
                 h.code !== id &&
                 h.code.trim().toLowerCase() !== targetCode
          );

          return {
            ...prev,
            lectureHalls: remaining,
            lectureHallStyles: {
              ...(prev.lectureHallStyles || {}),
              hallOrder: (prev.lectureHallStyles?.hallOrder || []).filter(hId => hId !== targetId && hId !== id && hId.trim().toLowerCase() !== targetCode),
              hiddenHallIds: (prev.lectureHallStyles?.hiddenHallIds || []).filter(hId => hId !== targetId && hId !== id && hId.trim().toLowerCase() !== targetCode),
            }
          };
        });

        setSelectedHallIds(prev => prev.filter(item => item !== id && item !== targetId));
        if (editingHall?.id === id || editingHall?.id === targetId) {
          setIsHallModalOpen(false);
          setEditingHall(null);
        }
      }
    });
  };

  const handleRestoreDefaultHalls = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Khôi Phục Danh Sách 27 Giảng Đường Chuẩn',
      icon: 'refresh',
      confirmVariant: 'primary',
      confirmText: 'Khôi Phục Mặc Định',
      message: (
        <div>
          <p>Hệ thống sẽ tải lại <b>27 Giảng đường tiêu chuẩn</b> của Trường Cao đẳng Y tế Thanh Hóa (Khu Giảng đường A, B, B6-B9, Phòng TM).</p>
          <p className="mt-1 text-slate-500">Các tùy chỉnh tên hoặc phòng thêm mới trước đó sẽ được làm mới về chuẩn ban đầu.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => ({
          ...prev,
          lectureHalls: INITIAL_LECTURE_HALLS,
          lectureHallStyles: {
            ...(prev.lectureHallStyles || {}),
            hallOrder: INITIAL_LECTURE_HALLS.map(h => h.id),
            hiddenHallIds: [],
          }
        }));
        setSelectedHallIds([]);
      }
    });
  };

  const handleClearAllHalls = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Toàn Bộ Danh Sách Giảng Đường',
      icon: 'alert',
      confirmVariant: 'danger',
      confirmText: 'Xóa Hết Toàn Bộ',
      message: (
        <div>
          <p className="font-bold text-rose-700">CẢNH BÁO NGUY HIỂM:</p>
          <p className="mt-1">Bạn có chắc chắn muốn xóa TOÀN BỘ tất cả các giảng đường hiện có khỏi hệ thống không?</p>
          <p className="mt-1 text-slate-500">Sau khi xóa, bạn có thể tự nhập giảng đường mới tùy ý hoặc bấm nút Khôi phục để lấy lại bất kỳ lúc nào.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => ({
          ...prev,
          lectureHalls: [],
          lectureHallStyles: {
            ...(prev.lectureHallStyles || {}),
            hallOrder: [],
            hiddenHallIds: [],
          }
        }));
        setSelectedHallIds([]);
      }
    });
  };

  const handleToggleHallActive = (id: string) => {
    onUpdateDb(prev => ({
      ...prev,
      lectureHalls: (prev.lectureHalls || []).map(h => 
        h.id === id ? { ...h, isActive: !h.isActive } : h
      ),
    }));
  };

  // Handlers for Departments
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptCode('');
    setDeptName('');
    setDeptPracticeRoomNames([]);
    setDeptNote('');
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptCode(dept.code);
    setDeptName(dept.name);
    
    let initialNames = dept.practiceRoomNames || [];
    if (initialNames.length === 0 && dept.practiceRoomCount > 0) {
      initialNames = Array.from({ length: dept.practiceRoomCount }).map((_, i) => `Phòng TH ${i + 1} - ${dept.name}`);
    }
    setDeptPracticeRoomNames(initialNames);
    
    setDeptNote(dept.note || '');
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode.trim() || !deptName.trim()) return;

    if (editingDept) {
      onUpdateDb(prev => ({
        ...prev,
        departments: (prev.departments || []).map(d => 
          d.id === editingDept.id ? {
            ...d,
            code: deptCode.trim(),
            name: deptName.trim(),
            practiceRoomCount: deptPracticeRoomNames.length,
            practiceRoomNames: deptPracticeRoomNames.filter(n => n.trim() !== ''),
            note: deptNote.trim(),
          } : d
        ),
      }));
    } else {
      const newDept: Department = {
        id: `bm_${deptCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
        code: deptCode.trim(),
        name: deptName.trim(),
        practiceRoomCount: deptPracticeRoomNames.length,
        practiceRoomNames: deptPracticeRoomNames.filter(n => n.trim() !== ''),
        note: deptNote.trim(),
      };
      onUpdateDb(prev => ({
        ...prev,
        departments: [...(prev.departments || []), newDept],
      }));
    }
    setIsDeptModalOpen(false);
  };

  const handleDeleteDept = (id: string) => {
    const dept = (db.departments || []).find(d => d.id === id);
    const deptName = dept?.name || id;

    setConfirmConfig({
      isOpen: true,
      title: 'Xác Nhận Xóa Bộ Môn & Phòng TH',
      icon: 'trash',
      confirmVariant: 'danger',
      confirmText: 'Xóa Bộ Môn',
      message: (
        <div>
          <p>Bạn có chắc chắn muốn xóa bộ môn <b className="text-rose-700">{deptName}</b> khỏi hệ thống?</p>
          <p className="mt-1 text-slate-500">Các môn học thuộc bộ môn này sẽ cần được kiểm tra hoặc phân bổ lại phòng TH.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => ({
          ...prev,
          departments: (prev.departments || []).filter(d => d.id !== id),
        }));
      }
    });
  };

  // Handlers for Class Short Names & Combined Aliases
  const handleUpdateClassShortName = (classId: string, newShortName: string) => {
    onUpdateDb(prev => {
      const updatedClasses = prev.classes.map(c => 
        c.id === classId ? { ...c, shortName: newShortName.trim() } : c
      );
      const updatedMap = { ...(prev.classShortNames || {}) };
      if (newShortName.trim()) {
        updatedMap[classId] = newShortName.trim();
      } else {
        delete updatedMap[classId];
      }
      return {
        ...prev,
        classes: updatedClasses,
        classShortNames: updatedMap,
      };
    });
  };

  const handleAutoGenerateAllClassShortNames = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Tự Động Sinh Tên Viết Tắt Lớp',
      icon: 'info',
      confirmVariant: 'primary',
      confirmText: 'Tiến Hành Tạo',
      message: (
        <div>
          <p>Hệ thống sẽ quét và tự động tạo tên viết tắt chuẩn ngành Y (Ví dụ: CĐĐD 26A → <b>ĐD26A</b>, DƯỢC K14A → <b>D14A</b>) cho các lớp.</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => {
          const updatedClasses = prev.classes.map(c => {
            const generated = generateClassShortName(c.name);
            return {
              ...c,
              shortName: c.shortName || generated,
            };
          });
          const updatedMap = { ...(prev.classShortNames || {}) };
          updatedClasses.forEach(c => {
            if (c.shortName) updatedMap[c.id] = c.shortName;
          });
          return {
            ...prev,
            classes: updatedClasses,
            classShortNames: updatedMap,
          };
        });
      }
    });
  };

  const handleOpenAddCombinedAlias = () => {
    setEditingCombinedAlias(null);
    setSelectedClassIdsForAlias([]);
    setCustomCombinedShortName('');
    setIsCombinedAliasModalOpen(true);
  };

  const handleOpenEditCombinedAlias = (alias: CombinedClassAlias) => {
    setEditingCombinedAlias(alias);
    setSelectedClassIdsForAlias([...alias.classIds]);
    setCustomCombinedShortName(alias.alias || alias.shortName || '');
    setIsCombinedAliasModalOpen(true);
  };

  const handleSaveCombinedAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIdsForAlias.length < 2 || !customCombinedShortName.trim()) {
      alert('Vui lòng chọn ít nhất 2 lớp và nhập tên viết tắt cho lớp ghép.');
      return;
    }

    const short = customCombinedShortName.trim();
    if (editingCombinedAlias) {
      onUpdateDb(prev => {
        const existing = prev.combinedClassAliases || (prev as any).combinedAliases || [];
        const updated = existing.map((a: CombinedClassAlias) => 
          a.id === editingCombinedAlias.id ? {
            ...a,
            classIds: [...selectedClassIdsForAlias],
            alias: short,
            shortName: short,
          } : a
        );
        return {
          ...prev,
          combinedClassAliases: updated,
        };
      });
    } else {
      const newAlias: CombinedClassAlias = {
        id: `alias_${Date.now()}`,
        classIds: [...selectedClassIdsForAlias],
        alias: short,
        shortName: short,
      };
      onUpdateDb(prev => {
        const existing = prev.combinedClassAliases || (prev as any).combinedAliases || [];
        return {
          ...prev,
          combinedClassAliases: [...existing, newAlias],
        };
      });
    }
    setIsCombinedAliasModalOpen(false);
  };

  const handleDeleteCombinedAlias = (id: string) => {
    const alias = (db.combinedClassAliases || (db as any).combinedAliases || []).find((a: CombinedClassAlias) => a.id === id);
    const aliasName = alias?.alias || alias?.shortName || id;

    setConfirmConfig({
      isOpen: true,
      title: 'Xóa Tên Viết Tắt Lớp Ghép',
      icon: 'trash',
      confirmVariant: 'danger',
      confirmText: 'Xóa Lớp Ghép',
      message: (
        <div>
          <p>Bạn có chắc chắn muốn xóa tên viết tắt lớp ghép <b className="text-rose-700">"{aliasName}"</b>?</p>
        </div>
      ),
      onConfirm: () => {
        onUpdateDb(prev => {
          const existing = prev.combinedClassAliases || (prev as any).combinedAliases || [];
          return {
            ...prev,
            combinedClassAliases: existing.filter((a: CombinedClassAlias) => a.id !== id),
          };
        });
      }
    });
  };

  const handleAutoScanCombinedFromSchedules = () => {
    // Detect combinations from schedules and assignments
    const foundMap = new Map<string, string[]>();

    db.schedules.forEach(s => {
      s.periods.forEach(p => {
        if (p.practiceType === 'full' && s.combinedClassIds && s.combinedClassIds.length > 1) {
          const sorted = [...s.combinedClassIds].sort();
          const key = sorted.join('_');
          if (!foundMap.has(key)) {
            foundMap.set(key, sorted);
          }
        }
      });
      if (s.combinedClassIds && s.combinedClassIds.length > 1) {
        const sorted = [...s.combinedClassIds].sort();
        const key = sorted.join('_');
        if (!foundMap.has(key)) {
          foundMap.set(key, sorted);
        }
      }
    });

    db.assignments.forEach(a => {
      if ((a as any).isCombined && (a as any).combinedClassIds && (a as any).combinedClassIds.length > 1) {
        const sorted = [...(a as any).combinedClassIds].sort();
        const key = sorted.join('_');
        if (!foundMap.has(key)) {
          foundMap.set(key, sorted);
        }
      }
    });

    if (foundMap.size === 0) {
      alert('Chưa tìm thấy tổ hợp lớp ghép nào trong thời khóa biểu hoặc phân công giảng dạy.');
      return;
    }

    let addedCount = 0;
    onUpdateDb(prev => {
      const existing = prev.combinedClassAliases || (prev as any).combinedAliases || [];
      const newAliases: CombinedClassAlias[] = [...existing];

      foundMap.forEach((cIds) => {
        const key = [...cIds].sort().join('_');
        const exists = newAliases.some(a => [...a.classIds].sort().join('_') === key);
        if (!exists) {
          const autoName = getCombinedClassShortName(cIds, prev);
          newAliases.push({
            id: `alias_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            classIds: cIds,
            alias: autoName,
            shortName: autoName,
          });
          addedCount++;
        }
      });

      return {
        ...prev,
        combinedClassAliases: newAliases,
      };
    });

    alert(`Đã tự động phát hiện và thêm ${addedCount} cấu hình tên viết tắt lớp ghép!`);
  };

  // Filtered halls
  const filteredHalls = useMemo(() => {
    return lectureHalls.filter(h => {
      const matchesSearch = h.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (h.name && h.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.excelName && h.excelName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        h.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.note && h.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBuilding = filterBuilding === 'all' || h.building === filterBuilding;
      return matchesSearch && matchesBuilding;
    });
  }, [lectureHalls, searchTerm, filterBuilding]);

  // Filtered classes for aliases
  const filteredClassesForAliases = useMemo(() => {
    return db.classes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(aliasSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(aliasSearch.toLowerCase()) ||
        (c.shortName && c.shortName.toLowerCase().includes(aliasSearch.toLowerCase()));
      const matchesCohort = aliasCohortFilter === 'all' || c.cohortId === aliasCohortFilter;
      return matchesSearch && matchesCohort;
    });
  }, [db.classes, aliasSearch, aliasCohortFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Overview Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span>Hệ thống Cơ sở Vật chất, Giảng đường & Tên Viết Tắt</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Quản Lý Giảng Đường, Phòng TH & Tên Viết Tắt</h2>
            <p className="text-sm text-slate-500 mt-1">
              Toàn quyền thêm, bớt, chỉnh sửa giảng đường (kèm tên lưu file Excel), phòng thực hành bộ môn và cấu hình tên viết tắt cho các lớp đơn & lớp ghép.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => downloadExcelTemplate('rooms')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title="Tải mẫu Excel danh mục Giảng đường"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mẫu Giảng đường</span>
            </button>

            <button
              onClick={() => downloadExcelTemplate('departments')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title="Tải mẫu Excel phòng Thực hành Bộ môn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mẫu Bộ môn</span>
            </button>

            {subTab === 'halls' ? (
              <button
                onClick={handleOpenAddHall}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Giảng Đường</span>
              </button>
            ) : subTab === 'departments' ? (
              <button
                onClick={handleOpenAddDept}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Bộ Môn & Phòng TH</span>
              </button>
            ) : subTab === 'aliases' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoGenerateAllClassShortNames}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  title="Tự động tạo tên viết tắt cho các lớp"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Tự Động Sinh Tên Viết Tắt</span>
                </button>
                <button
                  onClick={handleOpenAddCombinedAlias}
                  className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Lớp Ghép</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setSubTab('matrix')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
              subTab === 'matrix'
                ? 'border-blue-700 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Lịch Giảng Đường & Phối Màu (GĐ)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold uppercase">Mới</span>
          </button>

          <button
            onClick={() => setSubTab('halls')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
              subTab === 'halls'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Danh Mục Giảng Đường ({lectureHalls.length})</span>
          </button>

          <button
            onClick={() => setSubTab('aliases')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
              subTab === 'aliases'
                ? 'border-indigo-700 text-indigo-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4 text-indigo-600" />
            <span>Tên Viết Tắt Lớp Đơn & Lớp Ghép ({db.classes.length} Lớp)</span>
          </button>

          <button
            onClick={() => setSubTab('departments')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
              subTab === 'departments'
                ? 'border-purple-700 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Phòng Thực Hành Bộ Môn ({departments.length})</span>
          </button>

          <button
            onClick={() => setSubTab('live_status')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
              subTab === 'live_status'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Thống Kê Giảng Đường & Phòng Trống (Tuần {selectedWeek})</span>
          </button>
        </div>
      </div>

      {/* TAB 0: LECTURE HALL MATRIX & COLOR CUSTOMIZATION */}
      {subTab === 'matrix' && (
        <LectureHallScheduleView
          db={db}
          onUpdateDb={onUpdateDb}
          selectedWeek={selectedWeek}
        />
      )}

      {/* TAB 1: LECTURE HALLS */}
      {subTab === 'halls' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo số phòng (101, 201, Phòng TM, B6P1) hoặc tòa nhà..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="all">Tất cả Khu/Tòa nhà ({buildings.length})</option>
                  {buildings.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 px-1.5 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                    <span>Xếp:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('building')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold border border-slate-200"
                  >
                    Khu/Tòa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('name')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold border border-slate-200"
                  >
                    Tên A-Z
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortHallsBy('capacity')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold border border-slate-200"
                  >
                    Sức chứa
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span><b>{filteredHalls.length}</b> / {lectureHalls.length} GĐ</span>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultHalls}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                    title="Khôi phục 27 Giảng đường mặc định của trường"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Khôi Phục 27 GĐ Gốc</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddHall}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm GĐ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Selection & Deletion Bar */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={filteredHalls.length > 0 && filteredHalls.every(h => selectedHallIds.includes(h.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAllFiltered();
                      } else {
                        handleDeselectAll();
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Chọn tất cả ({filteredHalls.length} phòng đang hiển thị)</span>
                </label>

                {selectedHallIds.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-[11px]">
                    Đã chọn {selectedHallIds.length} GĐ
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedHallIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedHalls}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
                    title="Xóa vĩnh viễn các giảng đường đã chọn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa {selectedHallIds.length} Giảng Đường Đã Chọn</span>
                  </button>
                )}

                {lectureHalls.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHalls}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 transition"
                    title="Xóa toàn bộ tất cả giảng đường để tạo mới từ đầu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Toàn Bộ GĐ</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Empty State if No Lecture Halls */}
          {filteredHalls.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  {lectureHalls.length === 0
                    ? 'Chưa có giảng đường nào trong hệ thống'
                    : 'Không tìm thấy giảng đường phù hợp với bộ lọc'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {lectureHalls.length === 0
                    ? 'Bạn có toàn quyền thêm mới giảng đường theo ý muốn hoặc khôi phục lại 27 giảng đường mặc định ban đầu.'
                    : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn "Tất cả Khu/Tòa nhà".'}
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
                {lectureHalls.length === 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultHalls}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition"
                  >
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <span>Khôi Phục 27 GĐ Mặc Định</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Halls Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredHalls.map((hall, hIdx) => {
                const excelDisplayName = getLectureHallExcelName(hall);
                const isFirst = hIdx === 0;
                const isLast = hIdx === filteredHalls.length - 1;
                const isSelected = selectedHallIds.includes(hall.id);

                return (
                  <div
                    key={hall.id}
                    className={`bg-white rounded-xl p-3.5 border transition hover:shadow-md flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                        : hall.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectHall(hall.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            title="Chọn giảng đường này để thao tác xóa hoặc quản lý hàng loạt"
                          />
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold truncate max-w-[80px]">
                            {hall.building}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveHall(hall.id, 'up')}
                            disabled={isFirst}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 transition"
                            title="Di chuyển lên trước"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveHall(hall.id, 'down')}
                            disabled={isLast}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 transition"
                            title="Di chuyển xuống sau"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleToggleHallActive(hall.id)}
                            className={`text-[10px] font-semibold px-1 py-0.5 rounded cursor-pointer ${
                              hall.isActive ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                            title="Bật/Tắt sử dụng giảng đường"
                          >
                            {hall.isActive ? 'Mở' : 'Khóa'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-center">
                        <span className="text-2xl font-black text-slate-900 tracking-tight block">
                          {hall.code}
                        </span>
                        <div className="mt-1 text-[11px] bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100 inline-block text-slate-600 max-w-full truncate">
                          Xuất Excel: <b className="text-blue-700">{excelDisplayName}</b>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Sức chứa: <b>{hall.capacity} SV</b>
                        </p>
                        {hall.note && (
                          <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">
                            {hall.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditHall(hall)}
                        className="flex-1 py-1 rounded-md text-slate-600 hover:text-blue-700 hover:bg-blue-50 text-[11px] font-semibold flex items-center justify-center gap-1 transition border border-transparent hover:border-blue-200"
                        title="Chỉnh sửa giảng đường và tên xuất Excel"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDeleteHall(hall.id)}
                        className="flex-1 py-1 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-semibold flex items-center justify-center gap-1 transition border border-transparent hover:border-rose-200"
                        title="Xóa vĩnh viễn giảng đường này khỏi hệ thống"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLASS ABBREVIATIONS & COMBINED ALIASES */}
      {subTab === 'aliases' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-indigo-950 mb-1">
                Cấu Hình Tên Viết Tắt Lớp Đơn & Lớp Ghép (Áp dụng cho Xuất Excel Giảng Đường & Tổng Thể)
              </h4>
              <p className="text-indigo-800 leading-relaxed">
                Người xếp lịch được <b>cấp toàn quyền thêm, bớt, xóa, thay đổi tên viết tắt</b> của các lớp đơn và lớp ghép. Trong file Excel Giảng Đường, các ô phân lịch sẽ tự động hiển thị chính xác tên viết tắt đã thiết lập tại đây (Ví dụ: <code>ĐD26A</code>, <code>ĐD26A,B</code>, <code>D14A,B</code>, <code>YS2A,B</code>...).
              </p>
            </div>
          </div>

          {/* Section 1: Combined Class Aliases */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>1. Tên Viết Tắt Lớp Ghép ({combinedAliases.length} cấu hình)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tùy chỉnh tên hiển thị cho các lớp khi học ghép cùng 1 giảng đường lý thuyết.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoScanCombinedFromSchedules}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Quét các lớp thường ghép từ TKB và Phân công"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tự Động Quét Lớp Ghép</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddCombinedAlias}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Lớp Ghép Mới</span>
                </button>
              </div>
            </div>

            {combinedAliases.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                Chưa có cấu hình viết tắt lớp ghép riêng. Nhấn "Thêm Lớp Ghép Mới" hoặc "Tự Động Quét Lớp Ghép" để tạo cấu hình.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {combinedAliases.map(alias => {
                  const classNames = alias.classIds.map(cId => {
                    const c = db.classes.find(cls => cls.id === cId);
                    return c ? c.name : cId;
                  });

                  return (
                    <div
                      key={alias.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                            Ghép {alias.classIds.length} lớp
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditCombinedAlias(alias)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 transition"
                              title="Sửa tên viết tắt"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCombinedAlias(alias.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                              title="Xóa cấu hình"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="text-lg font-black text-indigo-950">
                            {alias.alias || alias.shortName}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                            {classNames.map((name, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                <span className="font-medium text-slate-800">{name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Single Class Abbreviations */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-600" />
                  <span>2. Tên Viết Tắt Các Lớp Đơn ({db.classes.length} Lớp)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập trực tiếp tên viết tắt mong muốn cho từng lớp đơn (lưu tự động ngay khi gõ).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Tìm tên lớp..."
                    value={aliasSearch}
                    onChange={(e) => setAliasSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg border border-slate-300 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-40 sm:w-48"
                  />
                </div>

                <select
                  value={aliasCohortFilter}
                  onChange={(e) => setAliasCohortFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none"
                >
                  <option value="all">Tất cả Khối ({db.cohorts.length})</option>
                  {db.cohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleAutoGenerateAllClassShortNames}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Tự Động Điền</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-12 text-center">STT</th>
                    <th className="px-4 py-2.5">Tên Lớp Đầy Đủ</th>
                    <th className="px-3 py-2.5">Mã Lớp</th>
                    <th className="px-3 py-2.5">Khối</th>
                    <th className="px-4 py-2.5 w-56">Tên Viết Tắt (Xuất Excel)</th>
                    <th className="px-3 py-2.5 w-24 text-center">Gợi Ý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClassesForAliases.map((cls, idx) => {
                    const cohort = db.cohorts.find(c => c.id === cls.cohortId);
                    const currentShortName = getClassShortName(cls.id, db);
                    const suggestedShortName = generateClassShortName(cls.name);

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900">
                          {cls.name}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono">
                          {cls.code}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            {cohort?.name || cls.cohortId}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={cls.shortName || ''}
                              placeholder={suggestedShortName}
                              onChange={(e) => handleUpdateClassShortName(cls.id, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            {cls.shortName && (
                              <span className="text-emerald-600" title="Đã lưu">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateClassShortName(cls.id, suggestedShortName)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            title={`Điền nhanh: ${suggestedShortName}`}
                          >
                            {suggestedShortName}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENT PRACTICE ROOMS */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-purple-950 mb-1">Quy định Số lượng Phòng Thực Hành Cố Định</h4>
              <p className="text-purple-800 leading-relaxed">
                Mỗi bộ môn chuyên ngành có một số lượng phòng thực hành/tiền lâm sàng cố định. Khi người xếp lịch phân buổi học thực hành cho các lớp, nếu số lượng lớp cùng học trong một buổi vượt quá giới hạn phòng thực hành của Bộ môn, hệ thống sẽ <b>phát cảnh báo quá tải</b> để người xếp lịch chủ động điều chỉnh.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => {
              // Count subjects in this dept
              const deptSubjects = db.subjects.filter(s => s.departmentId === dept.id);

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                        Mã: {dept.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="p-1 rounded-md text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition"
                          title="Sửa bộ môn"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa bộ môn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      {dept.name}
                    </h3>

                    <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Số phòng thực hành cố định:</span>
                        <span className="font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded text-sm">
                          {dept.practiceRoomCount} phòng
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Môn học phụ trách:</span>
                        <span className="font-semibold text-slate-800">
                          {deptSubjects.length} môn
                        </span>
                      </div>
                    </div>

                    {/* Subject Tags */}
                    {deptSubjects.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Các môn thực hành:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {deptSubjects.map(s => (
                            <span
                              key={s.id}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {s.name} ({s.practicePeriods} tiết TH)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {dept.note && (
                      <p className="text-xs text-slate-500 mt-2.5 italic">
                        * {dept.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LIVE STATUS (GIẢNG ĐƯỜNG ĐÃ DÙNG & CÒN TRỐNG) */}
      {subTab === 'live_status' && (
        <div className="space-y-4">
          {/* Slot Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Xem tình trạng slot học:</span>
              </span>

              {/* Day Selector (Thứ 2 - Thứ 7) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {[2, 3, 4, 5, 6, 7].map(d => (
                  <button
                    key={d}
                    onClick={() => setViewSlotDay(d)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      viewSlotDay === d
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Thứ {d}
                  </button>
                ))}
              </div>

              {/* Session Selector (Sáng / Chiều) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewSlotSession('morning')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    viewSlotSession === 'morning'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buổi Sáng
                </button>
                <button
                  onClick={() => setViewSlotSession('afternoon')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                    viewSlotSession === 'afternoon'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buổi Chiều
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Đang xem: <b>Thứ {viewSlotDay} ({viewSlotSession === 'morning' ? 'Sáng' : 'Chiều'})</b> - Tuần {selectedWeek}
            </div>
          </div>

          {/* Real-time Lecture Halls Status Grid */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700" />
                <span>Tình trạng Giảng đường Lý thuyết ({lectureHalls.length} Giảng đường)</span>
              </h3>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Còn trống ({lectureHalls.filter(h => !hallUsageMap.has(h.code.toLowerCase())).length})
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Đang sử dụng ({hallUsageMap.size})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {lectureHalls.map(hall => {
                const usage = hallUsageMap.get(hall.code.toLowerCase());
                const isOccupied = !!usage;

                return (
                  <div
                    key={hall.id}
                    className={`rounded-xl p-3.5 border transition ${
                      isOccupied
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-slate-900">
                        {hall.code}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isOccupied ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {isOccupied ? 'ĐANG DÙNG' : 'TRỐNG'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs">
                      {isOccupied ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-rose-900 line-clamp-1">
                            Lớp: {usage.className}
                          </p>
                          <p className="text-[11px] text-slate-700 line-clamp-1">
                            {usage.subjectName} ({usage.periodsCount} tiết)
                          </p>
                          {usage.teacherNames.length > 0 && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              GV: {usage.teacherNames.join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-emerald-700 text-[11px] py-2 text-center font-medium">
                          Sẵn sàng xếp lịch ({hall.capacity} chỗ)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Practice Workload Status in this slot */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-purple-950 mb-3 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-700" />
              <span>Tình trạng Phòng Thực Hành Bộ Môn trong buổi này</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments.map(dept => {
                const usage = deptUsageMap.get(dept.id);
                const used = usage ? usage.count : 0;
                const limit = dept.practiceRoomCount;
                const isOver = used > limit;
                const isFull = used === limit;

                return (
                  <div
                    key={dept.id}
                    className={`rounded-xl p-4 border transition ${
                      isOver
                        ? 'bg-rose-50 border-rose-300'
                        : isFull
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">
                        {dept.name}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isOver
                          ? 'bg-rose-200 text-rose-900'
                          : isFull
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        Đang dùng {used} / {limit} phòng TH
                      </span>
                    </div>

                    <div className="mt-3">
                      {usage && usage.classes.length > 0 ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            Các lớp thực hành:
                          </span>
                          {usage.classes.map((c, idx) => (
                            <div key={idx} className="text-xs bg-white p-1.5 rounded border border-slate-200 text-slate-800 font-medium">
                              <b>{c.className}</b>: TT {c.subjectName} ({c.practiceType})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 py-1 italic">
                          Chưa có lớp nào xếp thực hành trong buổi này.
                        </div>
                      )}
                    </div>

                    {isOver && (
                      <div className="mt-2 text-[11px] text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Cảnh báo: Vượt quá {used - limit} phòng TH của Bộ môn!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LECTURE HALL */}
      {isHallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingHall ? 'Chỉnh Sửa Giảng Đường' : 'Thêm Giảng Đường Mới'}
            </h3>

            <form onSubmit={handleSaveHall} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã / Tên Giảng Đường (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 101, 201, Phòng TM, B6P1..."
                  value={hallCode}
                  onChange={(e) => setHallCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên hiển thị trên File Excel TKB (*):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 101, 201, Phòng TM, B6P1..."
                  value={hallExcelName}
                  onChange={(e) => setHallExcelName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-950 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * Tên này sẽ xuất hiện trên tiêu đề cột của file Excel Giảng Đường.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khu / Tòa Nhà:
                  </label>
                  <input
                    type="text"
                    required
                    list="building-suggestions"
                    placeholder="Ví dụ: Khu Nhà A, Khu Nhà B..."
                    value={hallBuilding}
                    onChange={(e) => setHallBuilding(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="building-suggestions">
                    {buildings.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại Phòng:
                  </label>
                  <select
                    value={hallType}
                    onChange={(e) => setHallType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LT">Lý thuyết</option>
                    <option value="TH">Thực hành</option>
                    <option value="LS">Lâm sàng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sức Chứa (SV):
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={hallCapacity}
                  onChange={(e) => setHallCapacity(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giảng đường tầng 2 nhà A"
                  value={hallNote}
                  onChange={(e) => setHallNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {editingHall ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteHall(editingHall.id)}
                    className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Giảng Đường</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHallModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md"
                  >
                    {editingHall ? 'Lưu Thay Đổi' : 'Thêm Giảng Đường'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COMBINED CLASS ALIAS */}
      {isCombinedAliasModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingCombinedAlias ? 'Chỉnh Sửa Tên Viết Tắt Lớp Ghép' : 'Thêm Cấu Hình Lớp Ghép Mới'}
            </h3>

            <form onSubmit={handleSaveCombinedAlias} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn các lớp tham gia ghép (*):
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50">
                  {db.classes.map(c => {
                    const isSelected = selectedClassIdsForAlias.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${
                          isSelected ? 'bg-indigo-100 text-indigo-950 font-bold' : 'hover:bg-white text-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassIdsForAlias([...selectedClassIdsForAlias, c.id]);
                            } else {
                              setSelectedClassIdsForAlias(selectedClassIdsForAlias.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{c.name} ({c.code})</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Đã chọn: <b>{selectedClassIdsForAlias.length} lớp</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Viết Tắt Xuất Hiện Trên File Excel (*):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: ĐD26A,B hoặc D14A,B hoặc YS2A,B..."
                    value={customCombinedShortName}
                    onChange={(e) => setCustomCombinedShortName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-indigo-950 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedClassIdsForAlias.length > 0) {
                        const autoName = getCombinedClassShortName(selectedClassIdsForAlias, db);
                        setCustomCombinedShortName(autoName);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold whitespace-nowrap border border-indigo-200"
                    title="Tự động ghép tên viết tắt"
                  >
                    Gợi ý
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCombinedAliasModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-md"
                >
                  {editingCombinedAlias ? 'Lưu Thay Đổi' : 'Thêm Lớp Ghép'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingDept ? 'Chỉnh Sửa Bộ Môn & Phòng TH' : 'Thêm Bộ Môn Mới'}
            </h3>

            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Bộ Môn (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: BM-DUOC, BM-DD..."
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Bộ Môn (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa/Bộ môn Dược"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Danh Sách Phòng Thực Hành (*):
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeptPracticeRoomNames(prev => [...prev, `Phòng TH ${prev.length + 1} - ${deptName}`])}
                    className="flex items-center gap-1 text-xs text-purple-700 font-semibold hover:text-purple-800"
                  >
                    <Plus className="w-3 h-3" /> Thêm Phòng
                  </button>
                </div>
                {deptPracticeRoomNames.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic p-3 border border-dashed rounded-lg bg-slate-50 text-center">
                    Chưa có phòng thực hành nào. Nhấn "Thêm Phòng" để tạo.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {deptPracticeRoomNames.map((roomName, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={roomName}
                          onChange={(e) => {
                            const newNames = [...deptPracticeRoomNames];
                            newNames[idx] = e.target.value;
                            setDeptPracticeRoomNames(newNames);
                          }}
                          placeholder={`Phòng TH ${idx + 1}`}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-purple-900 font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDeptPracticeRoomNames(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-2">
                  * Số lượng phòng trong danh sách này sẽ là giới hạn phòng thực hành tối đa trong 1 buổi của bộ môn.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tối đa 3 phòng thực hành cùng lúc"
                  value={deptNote}
                  onChange={(e) => setDeptNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md"
                >
                  {editingDept ? 'Lưu Thay Đổi' : 'Thêm Bộ Môn'}
                </button>
              </div>
            </form>
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

export default RoomManagement;

