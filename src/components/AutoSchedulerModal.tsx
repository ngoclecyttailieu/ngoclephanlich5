import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Layers, 
  Building2, 
  UserCheck, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Download, 
  Sliders, 
  Users, 
  FlaskConical,
  Sun,
  Moon,
  ChevronRight,
  Info,
  Copy,
  Save,
  FolderOpen,
  Filter,
  Check,
  Search,
  ArrowLeftRight,
  Split,
  Shuffle,
  GraduationCap,
  Pencil as Edit,
  HelpCircle,
  Zap,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  UserX
} from 'lucide-react';
import { 
  AppDatabase, 
  Subject, 
  StudentClass, 
  Teacher, 
  LectureHall, 
  Department, 
  PeriodType, 
  PracticeClassType,
  SessionSchedule
} from '../types';
import { 
  AutoScheduleConfig, 
  UnitScheduleOverride,
  PreviewScheduleItem, 
  AutoScheduleResult, 
  ApplyScheduleMode,
  SchedulingMode,
  PairedAlternatingMode,
  PairedRoomMode,
  SubjectSlotConfig,
  ClassPairingItem,
  ClassPairingUnit,
  generateAutoSubjectSchedule, 
  generateAutoPairsFromUnits,
  generateAutoPairsForCombinedClasses,
  getAllAvailablePairingUnits,
  generateClassCombinationDisplayName,
  applyPreviewToDatabaseSchedules 
} from '../services/autoScheduleService';
import { ConfirmModal } from './ConfirmModal';

interface AutoSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  selectedWeek: number;
  activeCohortId?: string;
  onApplySchedule?: (newSchedules: SessionSchedule[], targetWeek: number) => void;
  onApplySchedules?: (newSchedules: SessionSchedule[], targetWeek: number) => void;
}

interface SavedPreset {
  id: string;
  name: string;
  mode: SchedulingMode;
  subjectId: string;
  pairedSubject1Id?: string;
  pairedSubject2Id?: string;
  periodType: PeriodType;
  periodsPerSession: number;
  isCombinedMode: boolean;
  hallSelectionMode: 'all_balanced' | 'specific';
  specificHallCodes: string[];
  createdAt: string;
}

export const AutoSchedulerModal: React.FC<AutoSchedulerModalProps> = ({
  isOpen,
  onClose,
  db,
  selectedWeek,
  activeCohortId,
  onApplySchedule,
  onApplySchedules,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<'config' | 'preview'>('config');

  // --- MODE SWITCHER: 1 Single Subject vs. Paired Subjects ---
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('single_subject');

  // --- Step 1: Single Subject Config Form States ---
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => db.subjects[0]?.id || '');
  const [periodType, setPeriodType] = useState<PeriodType>('LT');
  const [practiceType, setPracticeType] = useState<PracticeClassType>('full');
  const [periodsPerSession, setPeriodsPerSession] = useState<number>(4);
  const [defaultLessonTitle, setDefaultLessonTitle] = useState<string>('');
  const [sessionsPerClassCount, setSessionsPerClassCount] = useState<number>(1);

  // Scope: Cohorts and Classes
const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>(() => {
    if (activeCohortId) return [activeCohortId];
    return db.cohorts.map(c => c.id);
  });
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    if (activeCohortId) {
      return db.classes.filter(c => c.cohortId === activeCohortId).map(c => c.id);
    }
    return db.classes.map(c => c.id);
  });

  const allowedSubjectIds = useMemo(() => {
    if (selectedClassIds.length === 0) return new Set(db.subjects.map(s => s.id));
    
    const ids = new Set<string>();
    let hasCurriculum = false;

    selectedClassIds.forEach(classId => {
      const cls = db.classes.find(c => c.id === classId);
      if (cls && cls.curriculumId) {
        const curriculum = db.curriculums?.find(c => c.id === cls.curriculumId);
        if (curriculum) {
          hasCurriculum = true;
          curriculum.items.forEach(item => {
            ids.add(item.subjectId);
          });
        }
      }
    });

    if (!hasCurriculum) {
      return new Set(db.subjects.map(s => s.id));
    }
    return ids;
  }, [selectedClassIds, db.classes, db.curriculums, db.subjects]);
  // Effect to handle selection validity
  // (Moved below state declarations to avoid ReferenceError)





  // Combined mode
  const [isCombinedMode, setIsCombinedMode] = useState<boolean>(true);

  // Teacher allocation
  const [ignoreTeacherMode, setIgnoreTeacherMode] = useState<boolean>(false);
  const [teacherSelectionMode, setTeacherSelectionMode] = useState<'assignment' | 'department' | 'manual' | 'unassigned'>('assignment');
  const [manualTeacherIds, setManualTeacherIds] = useState<string[]>(() => db.teachers[0] ? [db.teachers[0].id] : []);

  // Hall allocation
  const [hallSelectionMode, setHallSelectionMode] = useState<'all_balanced' | 'specific'>('all_balanced');
  const [specificHallCodes, setSpecificHallCodes] = useState<string[]>([]);
  const [customRoomInput, setCustomRoomInput] = useState<string>('');

  // Time & Weeks
  const [targetWeekNum, setTargetWeekNum] = useState<number>(selectedWeek || 1);
  const [allowedDays, setAllowedDays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [allowedSessions, setAllowedSessions] = useState<Array<'morning' | 'afternoon'>>(['morning', 'afternoon']);

  // Conflict Avoidance
  const [avoidExistingOccupiedSlots, setAvoidExistingOccupiedSlots] = useState<boolean>(true);
  const [avoidTeacherConflicts, setAvoidTeacherConflicts] = useState<boolean>(true);
  const [avoidHallConflicts, setAvoidHallConflicts] = useState<boolean>(true);

  // Apply Mode
  const [applyMode, setApplyMode] = useState<ApplyScheduleMode>('smart_merge');

  // --- Step 1: Paired Subjects Config Form States ---
  const [pairedSubject1Id, setPairedSubject1Id] = useState<string>(() => db.subjects[0]?.id || '');
  const [pairedSubject2Id, setPairedSubject2Id] = useState<string>(() => db.subjects[1]?.id || db.subjects[0]?.id || '');

  // Effect to handle selection validity
  useEffect(() => {
    if (selectedSubjectId && !allowedSubjectIds.has(selectedSubjectId)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setSelectedSubjectId(firstAllowed);
    }
    if (pairedSubject1Id && !allowedSubjectIds.has(pairedSubject1Id)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setPairedSubject1Id(firstAllowed);
    }
    if (pairedSubject2Id && !allowedSubjectIds.has(pairedSubject2Id)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setPairedSubject2Id(firstAllowed);
    }
  }, [allowedSubjectIds, selectedSubjectId, pairedSubject1Id, pairedSubject2Id, db.subjects]);
  const [pairedS1Periods, setPairedS1Periods] = useState<number>(2);
  const [pairedS2Periods, setPairedS2Periods] = useState<number>(2);
  const [pairedS1Type, setPairedS1Type] = useState<PeriodType>('LT');
  const [pairedS2Type, setPairedS2Type] = useState<PeriodType>('LT');
  const [pairedS1Title, setPairedS1Title] = useState<string>('');
  const [pairedS2Title, setPairedS2Title] = useState<string>('');
  
  const [pairedS1TeacherMode, setPairedS1TeacherMode] = useState<'assignment' | 'department' | 'manual' | 'unassigned'>('assignment');
  const [pairedS1ManualTeachers, setPairedS1ManualTeachers] = useState<string[]>(() => db.teachers[0] ? [db.teachers[0].id] : []);
  
  const [pairedS2TeacherMode, setPairedS2TeacherMode] = useState<'assignment' | 'department' | 'manual' | 'unassigned'>('assignment');
  const [pairedS2ManualTeachers, setPairedS2ManualTeachers] = useState<string[]>(() => db.teachers[1] ? [db.teachers[1].id] : (db.teachers[0] ? [db.teachers[0].id] : []));

  const [pairedAlternatingMode, setPairedAlternatingMode] = useState<PairedAlternatingMode>('cross_swap');
  const [pairedRoomMode, setPairedRoomMode] = useState<PairedRoomMode>('students_move');

  // Paired Sessions & Periods Quota Settings
  const [pairedSessionsPerClassCount, setPairedSessionsPerClassCount] = useState<number>(1);
  const [pairedQuotaMode, setPairedQuotaMode] = useState<'by_sessions' | 'by_weekly_periods'>('by_sessions');
  const [pairedWeeklyPeriodsS1, setPairedWeeklyPeriodsS1] = useState<number>(2);
  const [pairedWeeklyPeriodsS2, setPairedWeeklyPeriodsS2] = useState<number>(2);

  // Pairing Unit Strategy: 'combined' (e.g. 28AB ⇄ 28CD) or 'single' (e.g. 28A ⇄ 28B)
  const [pairingUnitStrategy, setPairingUnitStrategy] = useState<'combined' | 'single'>('combined');

  // Custom Pairs List
  const [customPairs, setCustomPairs] = useState<ClassPairingItem[]>([]);

  // Combined Pair Builder Modal State
  const [isCombinedPairBuilderOpen, setIsCombinedPairBuilderOpen] = useState<boolean>(false);
  const [builderCohortId, setBuilderCohortId] = useState<string>(() => db.cohorts[0]?.id || '');
  const [builderGroupAName, setBuilderGroupAName] = useState<string>('');
  const [builderGroupAClassIds, setBuilderGroupAClassIds] = useState<string[]>([]);
  const [builderGroupBName, setBuilderGroupBName] = useState<string>('');
  const [builderGroupBClassIds, setBuilderGroupBClassIds] = useState<string[]>([]);

  // Unit Editor Modal State (to tweak member classes for any Unit in a pair)
  const [editingUnitModalState, setEditingUnitModalState] = useState<{
    pairId: string;
    whichUnit: 'unitA' | 'unitB';
    name: string;
    classIds: string[];
  } | null>(null);

  // --- Presets / Templates in LocalStorage ---
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      const p = localStorage.getItem('auto_scheduler_presets');
      return p ? JSON.parse(p) : [];
    } catch {
      return [];
    }
  });
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [showSavePresetInput, setShowSavePresetInput] = useState<boolean>(false);
  const [showGuideSection, setShowGuideSection] = useState<boolean>(true);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);

  // --- Step 2: Preview Results State ---
  const [previewResult, setPreviewResult] = useState<AutoScheduleResult | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewScheduleItem[]>([]);
  const [previewSearchTerm, setPreviewSearchTerm] = useState<string>('');

  // Current Subjects Detail
  const selectedSubject = useMemo(() => {
    return db.subjects.find(s => s.id === selectedSubjectId) || db.subjects[0];
  }, [db.subjects, selectedSubjectId]);

  const pairedSubject1 = useMemo(() => {
    return db.subjects.find(s => s.id === pairedSubject1Id) || db.subjects[0];
  }, [db.subjects, pairedSubject1Id]);

  const pairedSubject2 = useMemo(() => {
    return db.subjects.find(s => s.id === pairedSubject2Id) || db.subjects[1] || db.subjects[0];
  }, [db.subjects, pairedSubject2Id]);

  const activeLectureHalls = useMemo(() => {
    return (db.lectureHalls || []).filter(h => h.isActive !== false);
  }, [db.lectureHalls]);

  const [unitOverrides, setUnitOverrides] = useState<Record<string, UnitScheduleOverride>>({});
  const [showUnitOverridesTable, setShowUnitOverridesTable] = useState<boolean>(false);

  const handleUpdateUnitOverride = (unitId: string, updates: Partial<UnitScheduleOverride>) => {
    setUnitOverrides(prev => {
      const existing = prev[unitId] || { unitId };
      return {
        ...prev,
        [unitId]: { ...existing, ...updates },
      };
    });
  };

  const handleTogglePinnedDayForUnit = (unitId: string, day: number) => {
    setUnitOverrides(prev => {
      const existing = prev[unitId] || { unitId, pinnedDays: [] };
      const currentDays = existing.pinnedDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      return {
        ...prev,
        [unitId]: { ...existing, pinnedDays: newDays },
      };
    });
  };

  const handleTogglePinnedSessionForUnit = (unitId: string, session: 'morning' | 'afternoon') => {
    setUnitOverrides(prev => {
      const existing = prev[unitId] || { unitId, pinnedSessions: [] };
      const currentSessions = existing.pinnedSessions || [];
      const newSessions = currentSessions.includes(session)
        ? currentSessions.filter(s => s !== session)
        : [...currentSessions, session];
      return {
        ...prev,
        [unitId]: { ...existing, pinnedSessions: newSessions },
      };
    });
  };

  const handleClearUnitOverride = (unitId: string) => {
    setUnitOverrides(prev => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
  };

  // Filter classes by selected cohorts
  const availableClassesInCohorts = useMemo(() => {
    if (selectedCohortIds.length === 0) return [];
    return db.classes.filter(c => selectedCohortIds.includes(c.cohortId));
  }, [db.classes, selectedCohortIds]);

  // Available Pairing Units (both combined groups and single classes)
  const availablePairingUnits = useMemo(() => {
    return getAllAvailablePairingUnits(db, selectedClassIds);
  }, [db, selectedClassIds]);

  // Auto-generate pairs when class selection, combined mode, or strategy changes if requested
  useEffect(() => {
    if (selectedClassIds.length > 0) {
      const initialPairs = generateAutoPairsFromUnits(db, selectedClassIds, isCombinedMode, pairingUnitStrategy);
      setCustomPairs(initialPairs);
    } else {
      setCustomPairs([]);
    }
  }, [selectedClassIds, isCombinedMode, pairingUnitStrategy, db]);

  // Update default lesson title when single subject changes
  useEffect(() => {
    if (selectedSubject) {
      const typeLabel = periodType === 'LT' ? 'Lý thuyết' : periodType === 'TH' ? 'Thực hành' : 'Lâm sàng';
      setDefaultLessonTitle(`${typeLabel} ${selectedSubject.name}`);
    }
  }, [selectedSubject, periodType]);

  // Update default titles for paired subjects
  useEffect(() => {
    if (pairedSubject1) {
      setPairedS1Title(`Lý thuyết ${pairedSubject1.name} (Tiết 1-2)`);
    }
  }, [pairedSubject1]);

  useEffect(() => {
    if (pairedSubject2) {
      setPairedS2Title(`Lý thuyết ${pairedSubject2.name} (Tiết 3-4)`);
    }
  }, [pairedSubject2]);

  // Handle cohort toggle
  const toggleCohort = (cohortId: string) => {
    let nextCohortIds: string[];
    if (selectedCohortIds.includes(cohortId)) {
      nextCohortIds = selectedCohortIds.filter(id => id !== cohortId);
    } else {
      nextCohortIds = [...selectedCohortIds, cohortId];
    }
    setSelectedCohortIds(nextCohortIds);

    const newAvailableClassIds = db.classes.filter(c => nextCohortIds.includes(c.cohortId)).map(c => c.id);
    setSelectedClassIds(newAvailableClassIds);
  };

  const toggleClass = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(prev => prev.filter(id => id !== classId));
    } else {
      setSelectedClassIds(prev => [...prev, classId]);
    }
  };

  const handleSelectAllClasses = () => {
    setSelectedClassIds(availableClassesInCohorts.map(c => c.id));
  };

  const handleDeselectAllClasses = () => {
    setSelectedClassIds([]);
  };

  const handleSuggestClasses = () => {
    const suggestedIds: string[] = [];
    const classProgresses = db.classProgresses || [];
    const curriculums = db.curriculums || [];

    availableClassesInCohorts.forEach(cls => {
      if (!cls.curriculumId) return;
      const curr = curriculums.find(c => c.id === cls.curriculumId);
      if (!curr) return;
      const progress = classProgresses.find(p => p.classId === cls.id);

      const checkSubjectProgress = (subId: string, pType: PeriodType) => {
        const item = curr.items.find(i => i.subjectId === subId);
        if (!item) return false;
        
        // Calculate actual
        let actual = 0;
        db.schedules.forEach(sched => {
          if (sched.classId === cls.id) {
            sched.periods.forEach(p => {
              if (p.subjectId === subId && p.periodType === pType) actual++;
            });
          }
        });

        const goal = pType === 'LT' ? progress?.completedTheory?.[subId] :
                     pType === 'TH' ? progress?.completedPractice?.[subId] :
                     progress?.completedClinical?.[subId];
                     
        const target = goal || (pType === 'LT' ? item.theoryPeriods : pType === 'TH' ? item.practicePeriods : item.clinicalPeriods);
        return actual < target;
      };

      if (schedulingMode === 'single_subject') {
        if (selectedSubjectId && checkSubjectProgress(selectedSubjectId, periodType)) {
          suggestedIds.push(cls.id);
        }
      } else {
        if (pairedSubject1Id && checkSubjectProgress(pairedSubject1Id, 'LT') || 
            pairedSubject2Id && checkSubjectProgress(pairedSubject2Id, 'LT')) {
          suggestedIds.push(cls.id);
        }
      }
    });
    
    if (suggestedIds.length > 0) {
      setSelectedClassIds(suggestedIds);
      alert(`Đã tự động chọn ${suggestedIds.length} lớp chưa hoàn thành mục tiêu chương trình đào tạo của môn học này.`);
    } else {
      alert('Tất cả các lớp trong khối được chọn đều đã đạt mục tiêu hoặc không có trong CTĐT của môn này.');
    }
  };

  const toggleDay = (day: number) => {
    if (allowedDays.includes(day)) {
      if (allowedDays.length > 1) {
        setAllowedDays(prev => prev.filter(d => d !== day));
      }
    } else {
      setAllowedDays(prev => [...prev, day].sort());
    }
  };

  const toggleSession = (sess: 'morning' | 'afternoon') => {
    if (allowedSessions.includes(sess)) {
      if (allowedSessions.length > 1) {
        setAllowedSessions(prev => prev.filter(s => s !== sess));
      }
    } else {
      setAllowedSessions(prev => [...prev, sess]);
    }
  };

  const toggleHallCode = (code: string) => {
    if (specificHallCodes.includes(code)) {
      setSpecificHallCodes(prev => prev.filter(c => c !== code));
    } else {
      setSpecificHallCodes(prev => [...prev, code]);
    }
  };

  // Pair management functions
  const handleAutoRePair = (strategy: 'combined' | 'single' = pairingUnitStrategy) => {
    const freshPairs = generateAutoPairsFromUnits(db, selectedClassIds, isCombinedMode, strategy);
    setCustomPairs(freshPairs);
  };

  const handleAutoRePairCombined = () => {
    setPairingUnitStrategy('combined');
    const freshPairs = generateAutoPairsFromUnits(db, selectedClassIds, true, 'combined');
    setCustomPairs(freshPairs);
  };

  const handleAutoRePairSingle = () => {
    setPairingUnitStrategy('single');
    const freshPairs = generateAutoPairsFromUnits(db, selectedClassIds, false, 'single');
    setCustomPairs(freshPairs);
  };

  const handleSwapPairUnits = (pairId: string) => {
    setCustomPairs(prev => prev.map(p => {
      if (p.id !== pairId) return p;
      return {
        ...p,
        unitA: p.unitB,
        unitB: p.unitA,
      };
    }));
  };

  const handleDeletePair = (pairId: string) => {
    setCustomPairs(prev => prev.filter(p => p.id !== pairId));
  };

  const handleAddCustomPair = () => {
    if (availableClassesInCohorts.length === 0) return;
    const clsA = availableClassesInCohorts[0];
    const clsB = availableClassesInCohorts[1] || availableClassesInCohorts[0];

    const newPair: ClassPairingItem = {
      id: `pair_custom_${Date.now()}`,
      unitA: {
        id: `single_${clsA.id}`,
        isCombined: false,
        classIds: [clsA.id],
        displayName: clsA.name,
      },
      unitB: {
        id: `single_${clsB.id}`,
        isCombined: false,
        classIds: [clsB.id],
        displayName: clsB.name,
      },
    };
    setCustomPairs(prev => [...prev, newPair]);
  };

  const handleSelectPairUnit = (pairId: string, whichUnit: 'unitA' | 'unitB', unitKey: string) => {
    const allUnits = [...availablePairingUnits.combinedUnits, ...availablePairingUnits.singleUnits];
    const targetUnit = allUnits.find(u => u.id === unitKey || (u.isCombined === false && u.classIds[0] === unitKey));

    if (targetUnit) {
      setCustomPairs(prev => prev.map(p => {
        if (p.id !== pairId) return p;
        return {
          ...p,
          [whichUnit]: {
            ...targetUnit,
          },
        };
      }));
    } else {
      // Fallback single class
      const cls = db.classes.find(c => c.id === unitKey);
      if (cls) {
        setCustomPairs(prev => prev.map(p => {
          if (p.id !== pairId) return p;
          return {
            ...p,
            [whichUnit]: {
              id: `single_${cls.id}`,
              isCombined: false,
              classIds: [cls.id],
              displayName: cls.name,
            },
          };
        }));
      }
    }
  };

  // Open Combined Pair Builder
  const handleOpenCombinedBuilder = () => {
    const defaultCohortId = selectedCohortIds[0] || db.cohorts[0]?.id || '';
    setBuilderCohortId(defaultCohortId);

    const classesInCoh = db.classes.filter(c => c.cohortId === defaultCohortId);
    if (classesInCoh.length >= 4) {
      // Default suggest 28A+28B and 28C+28D
      const cA1 = classesInCoh[0];
      const cA2 = classesInCoh[1];
      const cB1 = classesInCoh[2];
      const cB2 = classesInCoh[3];

      setBuilderGroupAClassIds([cA1.id, cA2.id]);
      setBuilderGroupAName(generateClassCombinationDisplayName([cA1, cA2]));
      setBuilderGroupBClassIds([cB1.id, cB2.id]);
      setBuilderGroupBName(generateClassCombinationDisplayName([cB1, cB2]));
    } else if (classesInCoh.length >= 2) {
      const cA1 = classesInCoh[0];
      const cA2 = classesInCoh[1];
      setBuilderGroupAClassIds([cA1.id]);
      setBuilderGroupAName(cA1.name);
      setBuilderGroupBClassIds([cA2.id]);
      setBuilderGroupBName(cA2.name);
    } else {
      setBuilderGroupAClassIds([]);
      setBuilderGroupAName('');
      setBuilderGroupBClassIds([]);
      setBuilderGroupBName('');
    }

    setIsCombinedPairBuilderOpen(true);
  };

  // Save new combined pair from builder
  const handleSaveCombinedPairFromBuilder = () => {
    if (builderGroupAClassIds.length === 0 || builderGroupBClassIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp cho mỗi nhóm (Nhóm A và Nhóm B)!');
      return;
    }

    const classMap = new Map<string, StudentClass>();
    db.classes.forEach(c => classMap.set(c.id, c));

    const unitAClasses = builderGroupAClassIds.map(id => classMap.get(id)).filter(Boolean) as StudentClass[];
    const unitBClasses = builderGroupBClassIds.map(id => classMap.get(id)).filter(Boolean) as StudentClass[];

    const finalNameA = builderGroupAName.trim() || generateClassCombinationDisplayName(unitAClasses) || 'Nhóm A';
    const finalNameB = builderGroupBName.trim() || generateClassCombinationDisplayName(unitBClasses) || 'Nhóm B';

    const newPair: ClassPairingItem = {
      id: `pair_custom_combined_${Date.now()}`,
      unitA: {
        id: `custom_combined_A_${Date.now()}`,
        isCombined: builderGroupAClassIds.length > 1,
        classIds: builderGroupAClassIds,
        displayName: finalNameA,
      },
      unitB: {
        id: `custom_combined_B_${Date.now()}`,
        isCombined: builderGroupBClassIds.length > 1,
        classIds: builderGroupBClassIds,
        displayName: finalNameB,
      },
    };

    setCustomPairs(prev => [...prev, newPair]);
    setIsCombinedPairBuilderOpen(false);
  };

  // Quick unit editor save
  const handleSaveEditedUnit = () => {
    if (!editingUnitModalState) return;
    if (editingUnitModalState.classIds.length === 0) {
      alert('Đơn vị phải chứa ít nhất 1 lớp!');
      return;
    }

    const { pairId, whichUnit, name, classIds } = editingUnitModalState;
    const classMap = new Map<string, StudentClass>();
    db.classes.forEach(c => classMap.set(c.id, c));

    const classes = classIds.map(id => classMap.get(id)).filter(Boolean) as StudentClass[];
    const finalDisplayName = name.trim() || generateClassCombinationDisplayName(classes);

    setCustomPairs(prev => prev.map(p => {
      if (p.id !== pairId) return p;
      return {
        ...p,
        [whichUnit]: {
          id: `edited_${Date.now()}`,
          isCombined: classIds.length > 1,
          classIds: classIds,
          displayName: finalDisplayName,
        },
      };
    }));

    setEditingUnitModalState(null);
  };

  const handleUpdatePairSessions = (pairId: string, sessions: number) => {
    setCustomPairs(prev => prev.map(p => {
      if (p.id !== pairId) return p;
      return {
        ...p,
        sessionsPerWeek: sessions,
      };
    }));
  };

  const handleApplySessionsToAllPairs = (sessions: number) => {
    setCustomPairs(prev => prev.map(p => ({
      ...p,
      sessionsPerWeek: sessions,
    })));
  };

  // Preset save & load
  const handleSaveCurrentPreset = () => {
    if (!presetNameInput.trim()) {
      alert('Vui lòng nhập tên cho Mẫu cấu hình này!');
      return;
    }
    const newPreset: SavedPreset = {
      id: `preset_${Date.now()}`,
      name: presetNameInput.trim(),
      mode: schedulingMode,
      subjectId: selectedSubjectId,
      pairedSubject1Id,
      pairedSubject2Id,
      periodType,
      periodsPerSession: schedulingMode === 'paired_subjects' ? (pairedS1Periods + pairedS2Periods) : periodsPerSession,
      isCombinedMode,
      hallSelectionMode,
      specificHallCodes,
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    localStorage.setItem('auto_scheduler_presets', JSON.stringify(updated));
    setPresetNameInput('');
    setShowSavePresetInput(false);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    setSchedulingMode(preset.mode || 'single_subject');
    if (preset.subjectId && db.subjects.some(s => s.id === preset.subjectId)) {
      setSelectedSubjectId(preset.subjectId);
    }
    if (preset.pairedSubject1Id && db.subjects.some(s => s.id === preset.pairedSubject1Id)) {
      setPairedSubject1Id(preset.pairedSubject1Id);
    }
    if (preset.pairedSubject2Id && db.subjects.some(s => s.id === preset.pairedSubject2Id)) {
      setPairedSubject2Id(preset.pairedSubject2Id);
    }
    setPeriodType(preset.periodType || 'LT');
    setPeriodsPerSession(preset.periodsPerSession || 4);
    setIsCombinedMode(preset.isCombinedMode !== undefined ? preset.isCombinedMode : true);
    setHallSelectionMode(preset.hallSelectionMode || 'all_balanced');
    setSpecificHallCodes(preset.specificHallCodes || []);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('auto_scheduler_presets', JSON.stringify(updated));
  };

  // Pre-flight Realtime Diagnostic for Paired and Single Scheduling
  const preflightDiagnostics = useMemo(() => {
    const issues: {
      type: 'error' | 'warning' | 'info';
      title: string;
      message: string;
      actionText?: string;
      action?: () => void;
    }[] = [];

    const availableHallsCount = hallSelectionMode === 'all_balanced'
      ? activeLectureHalls.length
      : specificHallCodes.length;

    if (schedulingMode === 'paired_subjects') {
      // 1. Check lecture halls count (paired requires at least 2 distinct lecture halls)
      if (availableHallsCount < 2) {
        issues.push({
          type: 'error',
          title: 'Thiếu Giảng Đường cho Lớp Ghép / Cặp So Le',
          message: `Cặp so le (ví dụ 28AB ⇄ 28CD) cần tối thiểu 2 Giảng đường khác nhau hoạt động đồng thời. Bạn đang chỉ chọn ${availableHallsCount} phòng.`,
          actionText: '⚡ Dùng Tất Cả Giảng Đường',
          action: () => {
            setHallSelectionMode('all_balanced');
          }
        });
      }

      // 2. Check Teacher conflicts if manual mode
      if (pairedS1TeacherMode === 'manual' && pairedS2TeacherMode === 'manual') {
        const t1 = pairedS1ManualTeachers[0];
        const t2 = pairedS2ManualTeachers[0];
        if (t1 && t2 && t1 === t2) {
          issues.push({
            type: 'warning',
            title: 'Trùng Giảng Viên ở 2 Môn Trong Cùng 1 Buổi',
            message: `Bạn đang chỉ định cùng 1 Giảng viên cho cả 2 môn. Vì 2 môn diễn ra đồng thời nên GV không thể đứng 2 lớp cùng lúc.`,
            actionText: '⚡ Tách 2 GV Riêng',
            action: () => {
              const otherTeacher = db.teachers.find(t => t.id !== t1);
              if (otherTeacher) {
                setPairedS2ManualTeachers([otherTeacher.id]);
              }
            }
          });
        }
      }

      // 3. Check slots capacity vs number of pairs
      const totalPairsCount = customPairs.length;
      const totalSessionsNeeded = customPairs.reduce((acc, p) => acc + (p.sessionsPerWeek || pairedSessionsPerClassCount), 0);
      const availableTimeSlots = allowedDays.length * allowedSessions.length;

      if (availableTimeSlots < totalSessionsNeeded) {
        issues.push({
          type: 'warning',
          title: 'Khung Giờ Mở Quá Ít So Với Số Buổi Cần Xếp Của Các Cặp',
          message: `Cần xếp tổng cộng ${totalSessionsNeeded} buổi cho ${totalPairsCount} cặp lớp, nhưng hiện tại chỉ mở ${availableTimeSlots} khung giờ (${allowedDays.map(d => `T${d}`).join(', ')} - ${allowedSessions.join(', ')}).`,
          actionText: '⚡ Mở Rộng Thứ 2-7 & Cả 2 Buổi',
          action: () => {
            setAllowedDays([2, 3, 4, 5, 6, 7]);
            setAllowedSessions(['morning', 'afternoon']);
          }
        });
      }
    } else {
      if (availableHallsCount < 1) {
        issues.push({
          type: 'error',
          title: 'Chưa Chọn Giảng Đường',
          message: 'Vui lòng chọn ít nhất 1 giảng đường để xếp lịch môn học.',
          actionText: '⚡ Chọn Tất Cả Giảng Đường',
          action: () => setHallSelectionMode('all_balanced')
        });
      }
    }

    return issues;
  }, [
    schedulingMode,
    hallSelectionMode,
    activeLectureHalls.length,
    specificHallCodes.length,
    pairedS1TeacherMode,
    pairedS2TeacherMode,
    pairedS1ManualTeachers,
    pairedS2ManualTeachers,
    customPairs.length,
    sessionsPerClassCount,
    allowedDays,
    allowedSessions,
    db.teachers
  ]);

  // One-Click Auto-Optimizer
  const handleAutoOptimizeSettings = () => {
    setHallSelectionMode('all_balanced');
    setAllowedDays([2, 3, 4, 5, 6, 7]);
    setAllowedSessions(['morning', 'afternoon']);
    setAvoidExistingOccupiedSlots(true);
    setAvoidTeacherConflicts(true);
    setAvoidHallConflicts(true);

    if (pairedS1TeacherMode === 'manual' && pairedS2TeacherMode === 'manual') {
      const t1 = pairedS1ManualTeachers[0] || db.teachers[0]?.id;
      const t2 = db.teachers.find(t => t.id !== t1)?.id || db.teachers[1]?.id;
      if (t1) setPairedS1ManualTeachers([t1]);
      if (t2) setPairedS2ManualTeachers([t2]);
    }

    setOptimizeMessage('✅ Đã tối ưu hóa thông số: Cân bằng tất cả giảng đường, mở đầy đủ Thứ 2-7 Sáng/Chiều và phân tách 2 GV riêng biệt!');
    setTimeout(() => setOptimizeMessage(null), 6000);
  };

  // Run Auto-Scheduling Engine
  const handleExecuteAutoSchedule = () => {
    if (schedulingMode === 'single_subject') {
      if (!selectedSubject) {
        alert('Vui lòng chọn một môn học!');
        return;
      }
      if (selectedClassIds.length === 0) {
        alert('Vui lòng chọn ít nhất một lớp học để phân lịch!');
        return;
      }

      // Check curriculum constraint for single subject
      const missingClasses = selectedClassIds.filter(classId => {
        const cls = db.classes.find(c => c.id === classId);
        if (!cls || !cls.curriculumId) return true;
        const curr = db.curriculums?.find(c => c.id === cls.curriculumId);
        if (!curr) return true;
        return !curr.items.some(item => item.subjectId === selectedSubject.id);
      });

      if (missingClasses.length > 0) {
        const classNames = missingClasses.map(id => db.classes.find(c => c.id === id)?.name || id).join(', ');
        alert(`Cảnh báo không được xếp tiếp:\nMôn học "${selectedSubject.name}" không có trong CTĐT của (các) lớp: ${classNames}.\nVui lòng lựa chọn môn học khác phù hợp với CTĐT của lớp.`);
        return;
      }

      const config: AutoScheduleConfig = {
        mode: 'single_subject',
        subjectId: selectedSubject.id,
        periodType,
        practiceType,
        periodsPerSession: Number(periodsPerSession) || 4,
        classIds: selectedClassIds,
        isCombinedMode,
        weekNumber: targetWeekNum,
        allowedDays,
        allowedSessions,
        teacherSelectionMode: ignoreTeacherMode ? 'unassigned' : teacherSelectionMode,
        manualTeacherIds: ignoreTeacherMode || teacherSelectionMode === 'unassigned' ? [] : manualTeacherIds,
        hallSelectionMode,
        specificHallCodes: customRoomInput.trim() ? [customRoomInput.trim(), ...specificHallCodes] : specificHallCodes,
        avoidExistingOccupiedSlots,
        avoidTeacherConflicts: ignoreTeacherMode || teacherSelectionMode === 'unassigned' ? false : avoidTeacherConflicts,
        avoidHallConflicts,
        sessionsPerClassCount,
        ignoreTeachers: ignoreTeacherMode || teacherSelectionMode === 'unassigned',
        unitOverrides: Object.keys(unitOverrides).length > 0 ? unitOverrides : undefined,
      };

      const result = generateAutoSubjectSchedule(db, config);
      
      if (defaultLessonTitle.trim()) {
        result.previewItems = result.previewItems.map(item => ({
          ...item,
          lessonTitle: defaultLessonTitle.trim(),
        }));
      }

      setPreviewResult(result);
      setPreviewItems(result.previewItems);
      setCurrentStep('preview');
    } else {
      // Paired Subjects Mode
      if (!pairedSubject1 || !pairedSubject2) {
        alert('Vui lòng chọn đủ 2 môn học trong cặp!');
        return;
      }
      if (pairedSubject1.id === pairedSubject2.id) {
        alert('Vui lòng chọn 2 môn học khác nhau trong cặp môn!');
        return;
      }
      if (customPairs.length === 0) {
        alert('Vui lòng tạo ít nhất 1 cặp lớp để phân lịch!');
        return;
      }

      // Check curriculum constraint for paired subjects
      const missingIds = new Set<string>();
      customPairs.forEach(pair => {
        [pair.class1Id, pair.class2Id].forEach(classId => {
            const cls = db.classes.find(c => c.id === classId);
            if (!cls || !cls.curriculumId) { missingIds.add(classId); return; }
            const curr = db.curriculums?.find(c => c.id === cls.curriculumId);
            if (!curr) { missingIds.add(classId); return; }
            if (!curr.items.some(item => item.subjectId === pairedSubject1.id)) missingIds.add(classId);
            if (!curr.items.some(item => item.subjectId === pairedSubject2.id)) missingIds.add(classId);
        });
      });
      if (missingIds.size > 0) {
        const classNames = Array.from(missingIds).map(id => db.classes.find(c => c.id === id)?.name || id).join(', ');
        alert(`Cảnh báo không được xếp tiếp:\nMột trong hai môn "${pairedSubject1.name}" hoặc "${pairedSubject2.name}" không có trong CTĐT của (các) lớp: ${classNames}.\nVui lòng lựa chọn cặp môn học khác phù hợp với CTĐT của lớp.`);
        return;
      }

      const isIgnored = ignoreTeacherMode || (pairedS1TeacherMode === 'unassigned' && pairedS2TeacherMode === 'unassigned');

      const config: AutoScheduleConfig = {
        mode: 'paired_subjects',
        subjectId: pairedSubject1.id,
        periodType: 'LT',
        practiceType: 'full',
        periodsPerSession: pairedS1Periods + pairedS2Periods,
        classIds: selectedClassIds,
        isCombinedMode,
        weekNumber: targetWeekNum,
        allowedDays,
        allowedSessions,
        teacherSelectionMode: isIgnored ? 'unassigned' : 'assignment',
        manualTeacherIds: [],
        hallSelectionMode,
        specificHallCodes: customRoomInput.trim() ? [customRoomInput.trim(), ...specificHallCodes] : specificHallCodes,
        avoidExistingOccupiedSlots,
        avoidTeacherConflicts: isIgnored ? false : avoidTeacherConflicts,
        avoidHallConflicts,
        sessionsPerClassCount: pairedSessionsPerClassCount,
        ignoreTeachers: isIgnored,
        unitOverrides: Object.keys(unitOverrides).length > 0 ? unitOverrides : undefined,
        pairedConfig: {
          subject1: {
            subjectId: pairedSubject1.id,
            periodType: pairedS1Type,
            practiceType: 'full',
            periodsCount: pairedS1Periods,
            lessonTitle: pairedS1Title,
            teacherSelectionMode: ignoreTeacherMode ? 'unassigned' : pairedS1TeacherMode,
            manualTeacherIds: ignoreTeacherMode || pairedS1TeacherMode === 'unassigned' ? [] : pairedS1ManualTeachers,
            hallSelectionMode,
            specificHallCodes,
          },
          subject2: {
            subjectId: pairedSubject2.id,
            periodType: pairedS2Type,
            practiceType: 'full',
            periodsCount: pairedS2Periods,
            lessonTitle: pairedS2Title,
            teacherSelectionMode: ignoreTeacherMode ? 'unassigned' : pairedS2TeacherMode,
            manualTeacherIds: ignoreTeacherMode || pairedS2TeacherMode === 'unassigned' ? [] : pairedS2ManualTeachers,
            hallSelectionMode,
            specificHallCodes,
          },
          alternatingMode: pairedAlternatingMode,
          roomMode: pairedRoomMode,
          pairs: customPairs,
          sessionsPerClassCount: pairedSessionsPerClassCount,
          weeklyPeriodsSubject1: pairedWeeklyPeriodsS1,
          weeklyPeriodsSubject2: pairedWeeklyPeriodsS2,
        },
      };

      const result = generateAutoSubjectSchedule(db, config);

      setPreviewResult(result);
      setPreviewItems(result.previewItems);
      setCurrentStep('preview');
    }
  };

  // Step 2: Preview item modifications
  const togglePreviewItemSelection = (tempId: string) => {
    setPreviewItems(prev => prev.map(item => item.tempId === tempId ? { ...item, selected: !item.selected } : item));
  };

  const toggleSelectAllPreview = (select: boolean) => {
    setPreviewItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleDeletePreviewItem = (tempId: string) => {
    setPreviewItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleDuplicatePreviewItem = (item: PreviewScheduleItem) => {
    const duplicated: PreviewScheduleItem = {
      ...item,
      tempId: `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lessonTitle: `${item.lessonTitle} (Bản sao)`,
    };
    setPreviewItems(prev => [duplicated, ...prev]);
  };

  const handleUpdatePreviewItemField = (tempId: string, field: keyof PreviewScheduleItem, value: any) => {
    setPreviewItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleUpdatePreviewItemRoom = (tempId: string, value: string, periodIndex?: number) => {
    setPreviewItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      
      if (item.isPaired && item.periods) {
        if (periodIndex !== undefined) {
          const newPeriods = [...item.periods];
          newPeriods[periodIndex] = { ...newPeriods[periodIndex], roomOrHospital: value };
          const newRoomStr = newPeriods.map(p => p.roomOrHospital).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
          return { ...item, periods: newPeriods, roomOrHospital: newRoomStr };
        } else {
           const newPeriods = item.periods.map(p => ({ ...p, roomOrHospital: value }));
           return { ...item, periods: newPeriods, roomOrHospital: value };
        }
      } else {
        return { ...item, roomOrHospital: value };
      }
    }));
  };

  const handleAddCustomPreviewItem = () => {
    if (db.classes.length === 0 || !selectedSubject) return;
    const firstClass = db.classes[0];
    const defaultHall = activeLectureHalls[0]?.code || '101';
    const defaultTeacher = db.teachers[0] ? [db.teachers[0].id] : [];
    const defaultTeacherName = db.teachers[0]?.name || 'Chưa phân công';

    const newItem: PreviewScheduleItem = {
      tempId: `manual_${Date.now()}`,
      selected: true,
      weekNumber: targetWeekNum,
      dayOfWeek: 2,
      session: 'morning',
      classId: firstClass.id,
      className: firstClass.name,
      isCombined: false,
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      periodType,
      practiceType,
      periodsCount: periodsPerSession,
      teacherIds: defaultTeacher,
      teacherNames: [defaultTeacherName],
      roomOrHospital: periodType === 'LT' ? defaultHall : (customRoomInput || 'Phòng TH Bộ môn'),
      lessonTitle: defaultLessonTitle || `${periodType === 'LT' ? 'Lý thuyết' : 'Thực hành'} ${selectedSubject.name}`,
    };

    setPreviewItems(prev => [newItem, ...prev]);
  };

  const getAvailableHallsForSlot = (weekNumber: number, dayOfWeek: number, session: 'morning' | 'afternoon', excludeTempId?: string) => {
    const occupiedInDb = db.schedules
      .filter(s => s.weekNumber === weekNumber && s.dayOfWeek === dayOfWeek && s.session === session)
      .map(s => s.periods.map(p => p.roomOrHospital))
      .flat();

    const occupiedInPreview = previewItems
      .filter(item => item.selected && item.weekNumber === weekNumber && item.dayOfWeek === dayOfWeek && item.session === session && item.tempId !== excludeTempId)
      .map(item => {
        if (item.isPaired && item.periods) {
           return item.periods.map(p => p.roomOrHospital);
        }
        return [item.roomOrHospital];
      })
      .flat();

    const allOccupied = new Set([...occupiedInDb, ...occupiedInPreview]);
    return activeLectureHalls.filter(hall => !allOccupied.has(hall.code));
  };

  // Real-time conflict check across preview items
  const checkItemConflicts = (item: PreviewScheduleItem) => {
    const conflicts: string[] = [];
    
    // Check duplicate teachers in the same slot within preview
    if (item.teacherIds && item.teacherIds.length > 0) {
      const duplicateTeacher = previewItems.find(
        other => other.tempId !== item.tempId &&
                 other.selected &&
                 other.weekNumber === item.weekNumber &&
                 other.dayOfWeek === item.dayOfWeek &&
                 other.session === item.session &&
                 other.teacherIds.some(tId => item.teacherIds.includes(tId))
      );
      if (duplicateTeacher) {
        conflicts.push(`Trùng GV: ${duplicateTeacher.teacherNames.join(', ')} với lớp ${duplicateTeacher.className}`);
      }
    }

    return conflicts;
  };

  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState(false);

  // Confirm and Apply to Real Timetable Database
  const handleConfirmAndApply = () => {
    const selectedList = previewItems.filter(i => i.selected);
    if (selectedList.length === 0) {
      alert('Chưa có buổi học nào được chọn để áp dụng!');
      return;
    }

    setIsConfirmApplyOpen(true);
  };

  const executeApplySchedule = () => {
    const selectedList = previewItems.filter(i => i.selected);
    const updatedSchedules = applyPreviewToDatabaseSchedules(db, previewItems, applyMode, targetWeekNum);
    
    if (onApplySchedules) {
      onApplySchedules(updatedSchedules, targetWeekNum);
    } else if (onApplySchedule) {
      onApplySchedule(updatedSchedules, targetWeekNum);
    }

    alert(`✅ Đã áp dụng thành công ${selectedList.length} buổi học vào Thời Khóa Biểu Tuần ${targetWeekNum}!`);
    onClose();
  };

  // Filtered Preview items for table search
  const filteredPreviewItems = useMemo(() => {
    if (!previewSearchTerm.trim()) return previewItems;
    const term = previewSearchTerm.toLowerCase();
    return previewItems.filter(
      item => (item.className && item.className.toLowerCase().includes(term)) ||
              (item.combinedClassName && item.combinedClassName.toLowerCase().includes(term)) ||
              (item.subjectName && item.subjectName.toLowerCase().includes(term)) ||
              (item.roomOrHospital && item.roomOrHospital.toLowerCase().includes(term)) ||
              (item.teacherNames && item.teacherNames.some(t => t.toLowerCase().includes(term))) ||
              (item.lessonTitle && item.lessonTitle.toLowerCase().includes(term))
    );
  }, [previewItems, previewSearchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/30 text-sky-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Trợ Lý Phân Lịch Tự Động Thông Minh</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">
                  Tối Ưu & Cân Bằng Giảng Đường
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Phân bổ lịch học tự động cho 1 môn hoặc <b>Cặp 2 môn so le</b> chéo trong cùng buổi cho Lớp đơn & Lớp ghép
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Navigation Pill */}
            <div className="hidden sm:flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                className={`px-3 py-1 rounded-lg transition ${
                  currentStep === 'config' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-200 hover:text-white'
                }`}
              >
                1. Cấu Hình & Tiêu Chí
              </button>
              <button
                type="button"
                onClick={() => previewItems.length > 0 && setCurrentStep('preview')}
                disabled={previewItems.length === 0}
                className={`px-3 py-1 rounded-lg transition ${
                  currentStep === 'preview' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-200 hover:text-white disabled:opacity-40'
                }`}
              >
                2. Xem & Chỉnh Sửa Trực Tiếp ({previewItems.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
          
          {/* STEP 1: CONFIGURATION FORM */}
          {currentStep === 'config' && (
            <div className="space-y-5">
              
              {/* PRESETS BAR */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <FolderOpen className="w-4 h-4 text-indigo-600" />
                  <span>Mẫu Cấu Hình Đã Lưu:</span>
                  {savedPresets.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 ml-2">
                      {savedPresets.map(preset => (
                        <div
                          key={preset.id}
                          onClick={() => handleLoadPreset(preset)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold cursor-pointer transition"
                          title={`Tải mẫu: ${preset.name} (${preset.createdAt})`}
                        >
                          <span>{preset.name}</span>
                          <button
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                            title="Xóa mẫu này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 font-normal italic">Chưa có mẫu nào được lưu</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoOptimizeSettings}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs transition cursor-pointer"
                    title="Tự động thiết lập cấu hình tối ưu để không bị cảnh báo thiếu slot hay giảng đường"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>⚡ Tối Ưu Hóa Cấu Hình</span>
                  </button>

                  {showSavePresetInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Tên mẫu cấu hình..."
                        value={presetNameInput}
                        onChange={(e) => setPresetNameInput(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-36 font-semibold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCurrentPreset();
                          if (e.key === 'Escape') setShowSavePresetInput(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveCurrentPreset}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSavePresetInput(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSavePresetInput(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-600" />
                      <span>Lưu Mẫu</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUCCESS TOAST FOR OPTIMIZER */}
              {optimizeMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs transition animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{optimizeMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptimizeMessage(null)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* DETAILED USER GUIDANCE ACCORDION */}
              <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 rounded-2xl border border-indigo-200/80 shadow-xs overflow-hidden">
                <div 
                  onClick={() => setShowGuideSection(!showGuideSection)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-indigo-100/40 transition select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                        <span>HƯỚNG DẪN THAO TÁC XẾP LỊCH LỚP GHÉP & CẶP MÔN SO LE TRÁNH CẢNH BÁO</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-900">
                          {showGuideSection ? 'Thu gọn' : 'Xem chi tiết'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Quy trình chuẩn giúp hệ thống xếp tự động 100% không gặp lỗi thiếu slot hay thiếu giảng đường.
                      </p>
                    </div>
                  </div>

                  <div className="text-indigo-700">
                    {showGuideSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {showGuideSection && (
                  <div className="p-4 pt-2 border-t border-indigo-100 bg-white/70 space-y-3 text-xs text-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Step 1 Guideline */}
                      <div className="p-3 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-blue-900 font-black">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                          <span>Cặp 2 Môn & Giảng Viên</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <b>2 Môn khác nhau:</b> Ví dụ Môn A (2 tiết) + Môn B (2 tiết) = 4 tiết/buổi.<br/>
                          • <b>2 Giảng viên riêng:</b> Khuyên dùng 2 GV khác nhau để đổi chéo phòng giữa buổi mượt mà mà không trùng giờ.
                        </p>
                      </div>

                      {/* Step 2 Guideline */}
                      <div className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-indigo-900 font-black">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                          <span>Cặp Lớp So Le (28AB ⇄ 28CD)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • Bấm nút <b>"Lớp Ghép (28AB ⇄ 28CD)"</b> để hệ thống tự ghép theo khóa.<br/>
                          • Nhóm A (28A+28B) và Nhóm B (28C+28D) sẽ học luân phiên 2 môn tại 2 phòng riêng biệt.
                        </p>
                      </div>

                      {/* Step 3 Guideline */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-black">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                          <span>Tránh Thiếu Slot / Giảng Đường</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <b>Giảng đường:</b> Chọn <i>"Cân bằng tải tất cả Giảng đường"</i> (cần ≥ 2 phòng).<br/>
                          • <b>Thời gian:</b> Chọn Thứ 2 ➔ Thứ 7 và cả 2 buổi Sáng/Chiều.<br/>
                          • Hoặc bấm <b>"⚡ Tối Ưu Hóa Cấu Hình"</b> để tự động cấu hình chuẩn nhất.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* REALTIME PRE-FLIGHT DIAGNOSTICS & WARNINGS */}
              {preflightDiagnostics.length > 0 && (
                <div className="space-y-2">
                  {preflightDiagnostics.map((diag, dIdx) => (
                    <div
                      key={dIdx}
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs ${
                        diag.type === 'error'
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {diag.type === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-black uppercase tracking-wide">
                            {diag.title}
                          </div>
                          <div className="text-[11px] font-medium leading-relaxed mt-0.5">
                            {diag.message}
                          </div>
                        </div>
                      </div>

                      {diag.action && diag.actionText && (
                        <button
                          type="button"
                          onClick={diag.action}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-xs transition cursor-pointer ${
                            diag.type === 'error'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                          }`}
                        >
                          {diag.actionText}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TEACHER-AGNOSTIC MODE QUICK SWITCH BANNER */}
              <div className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                ignoreTeacherMode 
                  ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-400 ring-2 ring-amber-300 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${ignoreTeacherMode ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">
                        Chế Độ Phân Lịch Không Cần Quan Tâm Giáo Viên Giảng Dạy
                      </h4>
                      {ignoreTeacherMode ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wide animate-pulse">
                          ⚡ ĐANG BẬT - TỰ ĐỘNG BỎ QUA XUNG ĐỘT GV
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Đang tắt (Có gán GV)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                      Xếp lịch tự động mà <b>không cần chỉ định giáo viên</b> nào giảng dạy. Hệ thống sẽ để trống giảng viên và <b>hoàn toàn bỏ qua ràng buộc/cảnh báo trùng lịch giáo viên</b>, giúp phân bổ lịch cho các Lớp vào Giảng đường trống nhanh chóng và thành công 100%. (Bạn có thể gán GV sau).
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 sm:self-center">
                  <input
                    type="checkbox"
                    checked={ignoreTeacherMode}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setIgnoreTeacherMode(enabled);
                      if (enabled) {
                        setTeacherSelectionMode('unassigned');
                        setPairedS1TeacherMode('unassigned');
                        setPairedS2TeacherMode('unassigned');
                        setAvoidTeacherConflicts(false);
                      } else {
                        setTeacherSelectionMode('assignment');
                        setPairedS1TeacherMode('assignment');
                        setPairedS2TeacherMode('assignment');
                        setAvoidTeacherConflicts(true);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 shadow-inner"></div>
                </label>
              </div>

              {/* MODE SELECTOR: 1 Single Subject vs. Paired Subjects */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-1 rounded-2xl shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setSchedulingMode('single_subject')}
                    className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2.5 cursor-pointer ${
                      schedulingMode === 'single_subject'
                        ? 'bg-white text-slate-900 shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 ${schedulingMode === 'single_subject' ? 'text-blue-700' : 'text-blue-200'}`} />
                    <span>PHƯƠNG ÁN 1: PHÂN LỊCH 1 MÔN HỌC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSchedulingMode('paired_subjects')}
                    className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2.5 cursor-pointer ${
                      schedulingMode === 'paired_subjects'
                        ? 'bg-white text-slate-900 shadow-md ring-2 ring-amber-400'
                        : 'text-amber-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ArrowLeftRight className={`w-4 h-4 ${schedulingMode === 'paired_subjects' ? 'text-amber-600' : 'text-amber-300'}`} />
                    <span>PHƯƠNG ÁN 2: PHÂN THEO CẶP MÔN SO LE (MỚI)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wide">
                      HOT
                    </span>
                  </button>
                </div>
              </div>

              {/* MODE 1: SINGLE SUBJECT FORM */}
              {schedulingMode === 'single_subject' && (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-700" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        1. Chọn Môn Học & Số Tiết & Phân Công Giáo Viên
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Select Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Môn học cần phân lịch (*):
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {db.subjects.filter(s => allowedSubjectIds.has(s.id)).map(s => {
                          const dept = db.departments?.find(d => d.id === s.departmentId);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.code ? `[${s.code}] ` : ''}{s.name} ({s.credits || 0} tín chỉ - {s.totalPeriods || 0} tiết) {dept ? ` - BM: ${dept.code}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Period Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Hình thức giảng dạy:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPeriodType('LT')}
                          className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            periodType === 'LT'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Lý thuyết (LT)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPeriodType('TH')}
                          className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            periodType === 'TH'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Thực hành (TH)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPeriodType('LS')}
                          className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            periodType === 'LS'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Lâm sàng (LS)
                        </button>
                      </div>
                    </div>

                    {/* Periods Per Session */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số tiết mỗi buổi học:
                      </label>
                      <div className="flex items-center gap-2">
                        {[3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPeriodsPerSession(num)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              periodsPerSession === num
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {num} tiết
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={periodsPerSession}
                          onChange={(e) => setPeriodsPerSession(Number(e.target.value))}
                          className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-bold text-center text-slate-900 outline-none"
                          title="Số tiết tùy chỉnh"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Teacher Allocation in Single Subject Mode */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Phân công Giảng viên giảng dạy:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={teacherSelectionMode}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTeacherSelectionMode(val);
                          if (val === 'unassigned') {
                            setAvoidTeacherConflicts(false);
                          }
                        }}
                        className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 ${
                          teacherSelectionMode === 'unassigned'
                            ? 'border-amber-400 text-amber-900 bg-amber-50/50'
                            : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                        }`}
                      >
                        <option value="assignment">Tự động theo Phân công Giảng dạy của Lớp</option>
                        <option value="department">Tự động phân giảng viên thuộc Bộ Môn / Khoa</option>
                        <option value="manual">Chỉ định Giảng viên cụ thể...</option>
                        <option value="unassigned">⚡ Không chỉ định giáo viên (Để trống GV & Bỏ qua xung đột GV)</option>
                      </select>

                      {teacherSelectionMode === 'manual' && (
                        <select
                          value={manualTeacherIds[0] || ''}
                          onChange={(e) => setManualTeacherIds([e.target.value])}
                          className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {db.teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.faculty})</option>
                          ))}
                        </select>
                      )}

                      {teacherSelectionMode === 'unassigned' && (
                        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 font-semibold">
                          <UserX className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Lịch sẽ được xếp mà không gán giáo viên (Bỏ qua hoàn toàn xung đột GV).</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tiêu đề bài học mặc định:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bài 1: Đại cương Dược lý..."
                        value={defaultLessonTitle}
                        onChange={(e) => setDefaultLessonTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Số buổi muốn phân bổ cho mỗi lớp (Mặc định):
                        </label>
                        <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {sessionsPerClassCount} buổi / tuần
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSessionsPerClassCount(num)}
                            className={`flex-1 min-w-[65px] py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              sessionsPerClassCount === num
                                ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {num} buổi
                          </button>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={sessionsPerClassCount}
                            onChange={(e) => setSessionsPerClassCount(Math.max(1, Number(e.target.value)))}
                            className="w-14 bg-white border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs font-bold text-center text-slate-900 outline-none"
                            title="Nhập số buổi tùy ý"
                          />
                          <span className="text-[11px] text-slate-500 font-semibold">buổi/tuần</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Custom Pinning & Session Overrides for Individual Classes / Combined Units */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            Ấn định Buổi, Ngày &amp; Số buổi riêng cho từng lớp (Lựa chọn linh động):
                          </span>
                          {Object.keys(unitOverrides).length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              Đã ấn định {Object.keys(unitOverrides).length} lớp/nhóm
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tùy chỉnh số buổi riêng, khóa cứng ngày học (Thứ 2 - Thứ 7/CN), buổi học (Sáng/Chiều) hoặc phòng cho từng lớp đơn/lớp ghép.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowUnitOverridesTable(!showUnitOverridesTable)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          showUnitOverridesTable
                            ? 'bg-indigo-700 text-white shadow-2xs'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{showUnitOverridesTable ? 'Ẩn Bảng Ấn Định Chi Tiết' : 'Mở Bảng Ấn Định Chi Tiết Từng Lớp'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUnitOverridesTable ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Auto Spacing & Load Balancing Badge */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <b>Thuật toán tự động dàn đều lịch (Day Balancing)</b>: Tự động phân bổ đều các ngày trong tuần, tránh tình trạng ngày thì dồn quá nhiều buổi, ngày thì trống lịch.
                      </span>
                    </div>

                    {/* Collapsible Overrides Table */}
                    {showUnitOverridesTable && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 pb-2">
                          <span className="font-bold">Danh sách {selectedClassIds.length} lớp đang chọn phân lịch:</span>
                          {Object.keys(unitOverrides).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setUnitOverrides({})}
                              className="text-rose-600 hover:text-rose-800 font-bold text-[11px] underline cursor-pointer"
                            >
                              Xóa tất cả ấn định (Về mặc định)
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                          {selectedClassIds.map(clsId => {
                            const cls = db.classes.find(c => c.id === clsId);
                            if (!cls) return null;
                            const coh = db.cohorts.find(ch => ch.id === cls.cohortId);
                            const ovr = unitOverrides[clsId] || {};
                            const unitSessions = ovr.sessionsCount !== undefined ? ovr.sessionsCount : sessionsPerClassCount;
                            const pinnedDays = ovr.pinnedDays || [];
                            const pinnedSessions = ovr.pinnedSessions || [];
                            const preferredHall = ovr.preferredHall || '';

                            const hasAnyOverride = ovr.sessionsCount !== undefined || pinnedDays.length > 0 || pinnedSessions.length > 0 || !!preferredHall;

                            return (
                              <div
                                key={clsId}
                                className={`p-2.5 rounded-lg border transition ${
                                  hasAnyOverride
                                    ? 'bg-white border-indigo-300 shadow-2xs'
                                    : 'bg-white/80 border-slate-200'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs text-slate-900">{cls.name}</span>
                                    {coh && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                        {coh.name}
                                      </span>
                                    )}
                                    {hasAnyOverride && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                                        Đã tùy biến
                                      </span>
                                    )}
                                  </div>

                                  {hasAnyOverride && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearUnitOverride(clsId)}
                                      className="text-[10px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                      title="Khôi phục lớp này về thiết lập chung"
                                    >
                                      Đặt lại mặc định
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                  {/* Sessions Count */}
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-600 block">
                                      Số buổi trong tuần:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4].map(num => (
                                        <button
                                          key={num}
                                          type="button"
                                          onClick={() => handleUpdateUnitOverride(clsId, { sessionsCount: num })}
                                          className={`flex-1 py-1 rounded text-[11px] font-black transition cursor-pointer ${
                                            unitSessions === num
                                              ? 'bg-indigo-700 text-white shadow-2xs'
                                              : 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200'
                                          }`}
                                        >
                                          {num}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Pinned Days */}
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-600 block">
                                      Ấn định ngày học (Khóa thứ):
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {[2, 3, 4, 5, 6, 7].map(d => {
                                        const isPinned = pinnedDays.includes(d);
                                        return (
                                          <button
                                            key={d}
                                            type="button"
                                            onClick={() => handleTogglePinnedDayForUnit(clsId, d)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                              isPinned
                                                ? 'bg-blue-700 text-white shadow-2xs'
                                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                            }`}
                                            title={`Khóa học vào Thứ ${d}`}
                                          >
                                            T{d}
                                          </button>
                                        );
                                      })}
                                      {pinnedDays.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateUnitOverride(clsId, { pinnedDays: [] })}
                                          className="text-[10px] text-slate-400 hover:text-slate-700 font-bold ml-0.5"
                                          title="Xóa khóa ngày"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pinned Sessions */}
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-600 block">
                                      Ấn định buổi học:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePinnedSessionForUnit(clsId, 'morning')}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                          pinnedSessions.includes('morning')
                                            ? 'bg-amber-600 text-white shadow-2xs'
                                            : 'bg-white text-slate-700 hover:bg-amber-50 border border-slate-200'
                                        }`}
                                      >
                                        Sáng
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePinnedSessionForUnit(clsId, 'afternoon')}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                          pinnedSessions.includes('afternoon')
                                            ? 'bg-indigo-600 text-white shadow-2xs'
                                            : 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200'
                                        }`}
                                      >
                                        Chiều
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: PAIRED SUBJECTS FORM */}
              {schedulingMode === 'paired_subjects' && (
                <div className="space-y-4">
                  {/* Paired Subjects Selection Cards */}
                  <div className="bg-white rounded-xl p-5 border-2 border-indigo-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-indigo-700" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                            1. Cấu Hình Cặp 2 Môn Dạy Trong Cùng 1 Buổi
                          </h3>
                          <p className="text-xs text-slate-500">
                            Hệ thống sẽ ghép 2 môn học này vào cùng 1 buổi ({pairedS1Periods} tiết Môn A + {pairedS2Periods} tiết Môn B = {pairedS1Periods + pairedS2Periods} tiết)
                          </p>
                        </div>
                      </div>

                      <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                        Tổng số tiết: <span className="text-indigo-700 font-black">{pairedS1Periods + pairedS2Periods} tiết / buổi</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Subject 1 Card */}
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Môn Thứ Nhất (Môn A)
                          </span>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {pairedS1Periods} tiết
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Chọn môn học A:
                          </label>
                          <select
                            value={pairedSubject1Id}
                            onChange={(e) => setPairedSubject1Id(e.target.value)}
                            className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {db.subjects.filter(s => allowedSubjectIds.has(s.id)).map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code || 'Môn'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Số tiết Môn A:
                            </label>
                            <select
                              value={pairedS1Periods}
                              onChange={(e) => setPairedS1Periods(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              <option value={2}>2 tiết (Chuẩn nửa buổi)</option>
                              <option value={1}>1 tiết</option>
                              <option value={3}>3 tiết</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Hình thức Môn A:
                            </label>
                            <select
                              value={pairedS1Type}
                              onChange={(e) => setPairedS1Type(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              <option value="LT">Lý thuyết (LT)</option>
                              <option value="TH">Thực hành (TH)</option>
                              <option value="LS">Lâm sàng (LS)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Giảng viên Môn A:
                            </label>
                            {pairedS1TeacherMode === 'unassigned' && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                Chưa gán GV
                              </span>
                            )}
                          </div>
                          <select
                            value={pairedS1TeacherMode}
                            onChange={(e) => setPairedS1TeacherMode(e.target.value as any)}
                            className={`w-full border rounded px-2 py-1.5 text-xs font-semibold ${
                              pairedS1TeacherMode === 'unassigned' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="assignment">Tự động theo Phân công Giảng dạy của Lớp</option>
                            <option value="department">Tự động phân giảng viên thuộc Bộ Môn</option>
                            <option value="manual">Chỉ định Giảng viên cụ thể...</option>
                            <option value="unassigned">⚡ Không chỉ định giáo viên (Để trống GV & Bỏ qua xung đột GV)</option>
                          </select>
                          {pairedS1TeacherMode === 'manual' && (
                            <select
                              value={pairedS1ManualTeachers[0] || ''}
                              onChange={(e) => setPairedS1ManualTeachers([e.target.value])}
                              className="w-full mt-1 bg-white border border-blue-300 rounded px-2 py-1 text-xs font-semibold text-slate-900"
                            >
                              {db.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.faculty})</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Subject 2 Card */}
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Môn Thứ Hai (Môn B)
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {pairedS2Periods} tiết
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Chọn môn học B:
                          </label>
                          <select
                            value={pairedSubject2Id}
                            onChange={(e) => setPairedSubject2Id(e.target.value)}
                            className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {db.subjects.filter(s => allowedSubjectIds.has(s.id)).map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code || 'Môn'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Số tiết Môn B:
                            </label>
                            <select
                              value={pairedS2Periods}
                              onChange={(e) => setPairedS2Periods(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              <option value={2}>2 tiết (Chuẩn nửa buổi)</option>
                              <option value={1}>1 tiết</option>
                              <option value={3}>3 tiết</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Hình thức Môn B:
                            </label>
                            <select
                              value={pairedS2Type}
                              onChange={(e) => setPairedS2Type(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-800"
                            >
                              <option value="LT">Lý thuyết (LT)</option>
                              <option value="TH">Thực hành (TH)</option>
                              <option value="LS">Lâm sàng (LS)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Giảng viên Môn B:
                            </label>
                            {pairedS2TeacherMode === 'unassigned' && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                Chưa gán GV
                              </span>
                            )}
                          </div>
                          <select
                            value={pairedS2TeacherMode}
                            onChange={(e) => setPairedS2TeacherMode(e.target.value as any)}
                            className={`w-full border rounded px-2 py-1.5 text-xs font-semibold ${
                              pairedS2TeacherMode === 'unassigned' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="assignment">Tự động theo Phân công Giảng dạy của Lớp</option>
                            <option value="department">Tự động phân giảng viên thuộc Bộ Môn</option>
                            <option value="manual">Chỉ định Giảng viên cụ thể...</option>
                            <option value="unassigned">⚡ Không chỉ định giáo viên (Để trống GV & Bỏ qua xung đột GV)</option>
                          </select>
                          {pairedS2TeacherMode === 'manual' && (
                            <select
                              value={pairedS2ManualTeachers[0] || ''}
                              onChange={(e) => setPairedS2ManualTeachers([e.target.value])}
                              className="w-full mt-1 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-semibold text-slate-900"
                            >
                              {db.teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.faculty})</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. ĐỊNH MỨC SỐ TIẾT & SỐ BUỔI PHÂN TRONG TUẦN CHO MỖI LỚP / LỚP GHÉP */}
                  <div className="bg-white rounded-xl p-5 border-2 border-indigo-200 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-700" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <span>2. Định Mức Số Buổi &amp; Số Tiết Cần Phân Bổ Trong Tuần Cho Mỗi Lớp / Lớp Ghép</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                              {pairedSessionsPerClassCount} buổi / tuần ({pairedSessionsPerClassCount * (pairedS1Periods + pairedS2Periods)} tiết tổng)
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Cấu hình số buổi cần phân tự động cho mỗi lớp (đơn hoặc ghép) để xếp nhiều buổi học hơn trong tuần (ví dụ 2 buổi = 8 tiết, 3 buổi = 12 tiết)
                          </p>
                        </div>
                      </div>

                      {/* Quota Mode Switch */}
                      <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setPairedQuotaMode('by_sessions')}
                          className={`px-2.5 py-1 rounded transition cursor-pointer ${
                            pairedQuotaMode === 'by_sessions'
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Theo Số Buổi / Tuần
                        </button>
                        <button
                          type="button"
                          onClick={() => setPairedQuotaMode('by_weekly_periods')}
                          className={`px-2.5 py-1 rounded transition cursor-pointer ${
                            pairedQuotaMode === 'by_weekly_periods'
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Theo Tổng Số Tiết Môn / Tuần
                        </button>
                      </div>
                    </div>

                    {pairedQuotaMode === 'by_sessions' ? (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700">
                          Chọn số buổi cặp môn so le cần xếp cho mỗi lớp / cặp lớp trong tuần:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setPairedSessionsPerClassCount(num);
                                setPairedWeeklyPeriodsS1(num * pairedS1Periods);
                                setPairedWeeklyPeriodsS2(num * pairedS2Periods);
                                handleApplySessionsToAllPairs(num);
                              }}
                              className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                                pairedSessionsPerClassCount === num
                                  ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-black ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                              }`}
                            >
                              <div className="text-base font-black">{num} Buổi / Tuần</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                = {num * (pairedS1Periods + pairedS2Periods)} tiết tổng ({num * pairedS1Periods}t + {num * pairedS2Periods}t)
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                          <label className="block text-xs font-bold text-blue-900">
                            Số tiết Môn A ({pairedSubject1?.name}) cần học trong tuần:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={pairedS1Periods}
                              max={20}
                              step={pairedS1Periods}
                              value={pairedWeeklyPeriodsS1}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setPairedWeeklyPeriodsS1(val);
                                const sessions = Math.max(1, Math.ceil(val / Math.max(1, pairedS1Periods)));
                                setPairedSessionsPerClassCount(sessions);
                                setPairedWeeklyPeriodsS2(sessions * pairedS2Periods);
                                handleApplySessionsToAllPairs(sessions);
                              }}
                              className="w-24 bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-sm font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-600 font-bold">tiết / tuần</span>
                            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded font-bold ml-auto">
                              ➔ {Math.ceil(pairedWeeklyPeriodsS1 / Math.max(1, pairedS1Periods))} buổi ({pairedS1Periods}t/buổi)
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                          <label className="block text-xs font-bold text-emerald-900">
                            Số tiết Môn B ({pairedSubject2?.name}) cần học trong tuần:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={pairedS2Periods}
                              max={20}
                              step={pairedS2Periods}
                              value={pairedWeeklyPeriodsS2}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setPairedWeeklyPeriodsS2(val);
                                const sessions = Math.max(1, Math.ceil(val / Math.max(1, pairedS2Periods)));
                                setPairedSessionsPerClassCount(sessions);
                                setPairedWeeklyPeriodsS1(sessions * pairedS1Periods);
                                handleApplySessionsToAllPairs(sessions);
                              }}
                              className="w-24 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-sm font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-600 font-bold">tiết / tuần</span>
                            <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-bold ml-auto">
                              ➔ {Math.ceil(pairedWeeklyPeriodsS2 / Math.max(1, pairedS2Periods))} buổi ({pairedS2Periods}t/buổi)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Real-time Calculation & Quota Summary Box */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 font-medium">
                        <div>
                          Mỗi lớp (đơn/ghép) học: <strong className="text-indigo-700 font-black">{pairedSessionsPerClassCount} buổi / tuần</strong>
                        </div>
                        <div className="text-slate-300">|</div>
                        <div>
                          Môn A ({pairedSubject1?.name}): <strong className="text-blue-700 font-black">{pairedSessionsPerClassCount * pairedS1Periods} tiết/tuần</strong> ({pairedS1Periods}t × {pairedSessionsPerClassCount} buổi)
                        </div>
                        <div className="text-slate-300">|</div>
                        <div>
                          Môn B ({pairedSubject2?.name}): <strong className="text-emerald-700 font-black">{pairedSessionsPerClassCount * pairedS2Periods} tiết/tuần</strong> ({pairedS2Periods}t × {pairedSessionsPerClassCount} buổi)
                        </div>
                        <div className="text-slate-300">|</div>
                        <div>
                          Dự kiến phân: <strong className="text-amber-700 font-black">{customPairs.reduce((acc, p) => acc + (p.sessionsPerWeek || pairedSessionsPerClassCount), 0) * 2} lượt lịch</strong> ({customPairs.length} cặp × {pairedSessionsPerClassCount} buổi)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySessionsToAllPairs(pairedSessionsPerClassCount)}
                        className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition cursor-pointer shrink-0"
                        title="Đồng bộ số buổi này cho tất cả các cặp lớp bên dưới"
                      >
                        ⚡ Áp dụng {pairedSessionsPerClassCount} buổi cho tất cả {customPairs.length} cặp
                      </button>
                    </div>
                  </div>

                  {/* Alternating & Room Swap Rules */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Split className="w-4 h-4 text-indigo-700" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        3. Lựa Chọn &amp; Sắp Xếp Quy Tắc So Le Cặp Môn
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Alternating Mode */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Quy tắc đổi chéo / so le cặp môn:
                        </label>
                        <div className="space-y-2">
                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            pairedAlternatingMode === 'cross_swap'
                              ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="pairedAlternatingMode"
                              checked={pairedAlternatingMode === 'cross_swap'}
                              onChange={() => setPairedAlternatingMode('cross_swap')}
                              className="mt-0.5 text-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-black text-indigo-950 block">
                                🔄 So le chéo 2 lớp trong cùng 1 buổi (Khuyên dùng chuẩn sư phạm)
                              </span>
                              <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                                • <b>Lớp A:</b> Tiết đầu học <b>{pairedSubject1?.name}</b> ➔ Tiết sau học <b>{pairedSubject2?.name}</b><br/>
                                • <b>Lớp B:</b> Tiết đầu học <b>{pairedSubject2?.name}</b> ➔ Tiết sau học <b>{pairedSubject1?.name}</b><br/>
                                <i>(Cả 2 GV và 2 phòng học đều được vận hành liên tục không trùng lịch)</i>
                              </span>
                            </div>
                          </label>

                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            pairedAlternatingMode === 'parallel_same'
                              ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="pairedAlternatingMode"
                              checked={pairedAlternatingMode === 'parallel_same'}
                              onChange={() => setPairedAlternatingMode('parallel_same')}
                              className="mt-0.5 text-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-black text-slate-900 block">
                                ➡️ Cùng thứ tự tuần tự
                              </span>
                              <span className="text-[11px] text-slate-600 block mt-0.5">
                                Cả 2 lớp/nhóm đều học Môn A trước (tiết 1-2) rồi học Môn B sau (tiết 3-4).
                              </span>
                            </div>
                          </label>

                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            pairedAlternatingMode === 'alternate_days'
                              ? 'bg-indigo-50/90 border-indigo-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="pairedAlternatingMode"
                              checked={pairedAlternatingMode === 'alternate_days'}
                              onChange={() => setPairedAlternatingMode('alternate_days')}
                              className="mt-0.5 text-indigo-600"
                            />
                            <div>
                              <span className="text-xs font-black text-slate-900 block">
                                🔀 So le luân phiên xen kẽ theo ngày/tuần
                              </span>
                              <span className="text-[11px] text-slate-600 block mt-0.5">
                                Buổi 1 Lớp A học Môn A trước; Buổi 2 Lớp A học Môn B trước.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Room Swap Mode */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Cơ chế chuyển phòng học khi sang tiết môn thứ 2:
                        </label>
                        <div className="space-y-2">
                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            pairedRoomMode === 'students_move'
                              ? 'bg-blue-50/90 border-blue-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="pairedRoomMode"
                              checked={pairedRoomMode === 'students_move'}
                              onChange={() => setPairedRoomMode('students_move')}
                              className="mt-0.5 text-blue-600"
                            />
                            <div>
                              <span className="text-xs font-black text-blue-950 block">
                                🏫 Sinh viên đổi phòng (GV đứng cố định tại Giảng đường)
                              </span>
                              <span className="text-[11px] text-slate-600 block mt-0.5">
                                • Tiết 1-2: Lớp A ở GĐ 1, Lớp B ở GĐ 2<br/>
                                • Tiết 3-4: Lớp A chuyển sang GĐ 2, Lớp B chuyển sang GĐ 1.
                              </span>
                            </div>
                          </label>

                          <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            pairedRoomMode === 'teachers_move'
                              ? 'bg-blue-50/90 border-blue-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="pairedRoomMode"
                              checked={pairedRoomMode === 'teachers_move'}
                              onChange={() => setPairedRoomMode('teachers_move')}
                              className="mt-0.5 text-blue-600"
                            />
                            <div>
                              <span className="text-xs font-black text-blue-950 block">
                                👨‍🏫 Giảng viên đổi phòng (Lớp ngồi cố định tại 1 Giảng đường)
                              </span>
                              <span className="text-[11px] text-slate-600 block mt-0.5">
                                Lớp A ngồi trọn buổi tại GĐ 1, Lớp B ngồi trọn buổi tại GĐ 2. Hai giảng viên đổi phòng cho nhau giữa buổi.
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Pairing Management Panel */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-700" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <span>4. Cấu hình Cặp So Le (Lớp Ghép &amp; Lớp Đơn)</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black">
                              {customPairs.length} Cặp
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Lựa chọn so le theo cặp lớp ghép (ví dụ: <strong className="text-indigo-700">28AB ⇄ 28CD</strong>) hoặc cặp lớp đơn (ví dụ: <strong className="text-blue-700">28A ⇄ 28B</strong>)
                          </p>
                        </div>
                      </div>

                      {/* Strategy Selection & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Strategy Quick Switch */}
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={handleAutoRePairCombined}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              pairingUnitStrategy === 'combined'
                                ? 'bg-indigo-700 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                            title="Tự động ghép cặp theo lớp ghép (ví dụ: 28AB ⇄ 28CD)"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Lớp Ghép (28AB ⇄ 28CD)</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAutoRePairSingle}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              pairingUnitStrategy === 'single'
                                ? 'bg-indigo-700 text-white shadow-xs'
                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                            }`}
                            title="Tự động ghép cặp theo lớp đơn (ví dụ: 28A ⇄ 28B)"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Lớp Đơn (28A ⇄ 28B)</span>
                          </button>
                        </div>

                        {/* Custom Combined Pair Builder Button */}
                        <button
                          type="button"
                          onClick={handleOpenCombinedBuilder}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          title="Tạo cặp lớp ghép tùy biến (chọn các lớp cho Nhóm A và Nhóm B)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo Cặp Ghép (A ⇄ B)</span>
                        </button>

                        {/* Add General Pair Button */}
                        <button
                          type="button"
                          onClick={handleAddCustomPair}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Cặp Tùy Chọn</span>
                        </button>
                      </div>
                    </div>

                    {/* Explanatory banner */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-blue-50/80 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-indigo-950 space-y-1">
                        <div>
                          <strong>Quy tắc phân lịch so le lớp ghép:</strong> Trong cùng 1 buổi học, Nhóm A (ví dụ <span className="font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">28AB</span> = 28A + 28B) và Nhóm B (ví dụ <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">28CD</span> = 28C + 28D) sẽ học 2 môn ở 2 giảng đường khác nhau, sau đó đổi phòng/môn cho nhau ở nửa sau buổi học.
                        </div>
                      </div>
                    </div>

                    {/* Pairs Grid/List */}
                    {customPairs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-600">Chưa có cặp lớp nào được thiết lập.</p>
                        <p>Bấm nút <strong>"Lớp Ghép (28AB ⇄ 28CD)"</strong> để tự động ghép cặp theo lớp ghép hoặc <strong>"Tạo Cặp Ghép (A ⇄ B)"</strong> để tạo cặp tùy chọn.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 max-h-88 overflow-y-auto p-1">
                        {customPairs.map((pair, pIdx) => {
                          const unitA = pair.unitA;
                          const unitB = pair.unitB;
                          const isCombinedA = unitA.isCombined;
                          const isCombinedB = unitB.isCombined;

                          return (
                            <div
                              key={pair.id}
                              className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 flex flex-col gap-2.5 shadow-2xs hover:bg-slate-100/80 transition"
                            >
                              {/* Card Header */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-indigo-700 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                    {pIdx + 1}
                                  </span>
                                  <span className="text-xs font-black text-slate-800">
                                    Cặp So Le #{pIdx + 1}
                                  </span>
                                  {isCombinedA || isCombinedB ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      👥 Cặp Lớp Ghép ({unitA.displayName} ⇄ {unitB.displayName})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                      👤 Cặp Lớp Đơn ({unitA.displayName} ⇄ {unitB.displayName})
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeletePair(pair.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Xóa cặp này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Unit A and Unit B Selectors */}
                              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
                                {/* Unit A */}
                                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 space-y-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-blue-900 uppercase">
                                      {isCombinedA ? '👥 Đơn vị A (Lớp ghép):' : '👤 Đơn vị A (Lớp đơn):'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingUnitModalState({
                                        pairId: pair.id,
                                        whichUnit: 'unitA',
                                        name: unitA.displayName,
                                        classIds: [...unitA.classIds],
                                      })}
                                      className="text-[10px] font-bold text-blue-700 hover:underline inline-flex items-center gap-0.5"
                                      title="Tùy biến các lớp con trong nhóm A"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Sửa lớp</span>
                                    </button>
                                  </div>

                                  <select
                                    value={unitA.id.startsWith('single_') ? unitA.classIds[0] : unitA.id}
                                    onChange={(e) => handleSelectPairUnit(pair.id, 'unitA', e.target.value)}
                                    className="w-full bg-white border border-blue-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 outline-none truncate"
                                  >
                                    <optgroup label="👥 Nhóm Lớp Ghép (Combined Groups)">
                                      {availablePairingUnits.combinedUnits.map(cu => (
                                        <option key={cu.id} value={cu.id}>
                                          {cu.displayName} ({cu.classIds.length} lớp)
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="👤 Lớp Đơn (Single Classes)">
                                      {availablePairingUnits.singleUnits.map(su => (
                                        <option key={su.id} value={su.classIds[0]}>
                                          {su.displayName}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>

                                  <div className="text-[10px] text-blue-950 font-medium truncate">
                                    Bao gồm: {unitA.classIds.map(id => db.classes.find(c => c.id === id)?.name || id).join(', ')}
                                  </div>
                                </div>

                                {/* Swap Button */}
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSwapPairUnits(pair.id)}
                                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-xl transition shrink-0 border border-indigo-200 bg-white shadow-2xs cursor-pointer"
                                    title="Hoán đổi vị trí Đơn vị A ⇄ Đơn vị B"
                                  >
                                    <ArrowLeftRight className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Unit B */}
                                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-emerald-900 uppercase">
                                      {isCombinedB ? '👥 Đơn vị B (Lớp ghép):' : '👤 Đơn vị B (Lớp đơn):'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingUnitModalState({
                                        pairId: pair.id,
                                        whichUnit: 'unitB',
                                        name: unitB.displayName,
                                        classIds: [...unitB.classIds],
                                      })}
                                      className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                                      title="Tùy biến các lớp con trong nhóm B"
                                    >
                                      <Edit className="w-3 h-3" />
                                      <span>Sửa lớp</span>
                                    </button>
                                  </div>

                                  <select
                                    value={unitB.id.startsWith('single_') ? unitB.classIds[0] : unitB.id}
                                    onChange={(e) => handleSelectPairUnit(pair.id, 'unitB', e.target.value)}
                                    className="w-full bg-white border border-emerald-300 rounded px-2 py-1.5 text-xs font-bold text-slate-900 outline-none truncate"
                                  >
                                    <optgroup label="👥 Nhóm Lớp Ghép (Combined Groups)">
                                      {availablePairingUnits.combinedUnits.map(cu => (
                                        <option key={cu.id} value={cu.id}>
                                          {cu.displayName} ({cu.classIds.length} lớp)
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="👤 Lớp Đơn (Single Classes)">
                                      {availablePairingUnits.singleUnits.map(su => (
                                        <option key={su.id} value={su.classIds[0]}>
                                          {su.displayName}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>

                                  <div className="text-[10px] text-emerald-950 font-medium truncate">
                                    Bao gồm: {unitB.classIds.map(id => db.classes.find(c => c.id === id)?.name || id).join(', ')}
                                  </div>
                                </div>
                              </div>

                               {/* Sessions Quota for this specific pair */}
                              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px]">
                                <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                                  <span>Số buổi tuần cho cặp này:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-200/80 text-indigo-900 text-[10px] font-black">
                                    {pair.sessionsPerWeek || pairedSessionsPerClassCount} buổi
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4].map(num => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => handleUpdatePairSessions(pair.id, num)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                        (pair.sessionsPerWeek || pairedSessionsPerClassCount) === num
                                          ? 'bg-indigo-700 text-white shadow-2xs'
                                          : 'bg-white text-slate-700 hover:bg-indigo-100 border border-slate-200'
                                      }`}
                                    >
                                      {num} buổi
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Live Schedule Rotation Hint */}
                              <div className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-800 truncate">
                                  Tiết 1-2: <span className="text-blue-700 font-bold">{unitA.displayName}</span> ({pairedSubject1?.name || 'Môn 1'}) &amp; <span className="text-emerald-700 font-bold">{unitB.displayName}</span> ({pairedSubject2?.name || 'Môn 2'})
                                </span>
                                <span className="text-indigo-600 font-bold shrink-0">➔</span>
                                <span className="font-semibold text-slate-800 truncate">
                                  Tiết 3-4: <span className="text-blue-700 font-bold">{unitA.displayName}</span> ({pairedSubject2?.name || 'Môn 2'}) &amp; <span className="text-emerald-700 font-bold">{unitB.displayName}</span> ({pairedSubject1?.name || 'Môn 1'})
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: SCOPE & COMMON SETTINGS (Cohorts, Days, Sessions, Lecture Halls, Conflicts) */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sliders className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    {schedulingMode === 'paired_subjects' ? '5.' : '2.'} Phạm Vi Lớp &amp; Thời Gian &amp; Phân Bổ Giảng Đường
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Column 1: Classes & Cohorts selection */}
                  <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700">Khối lớp áp dụng:</span>
                        <span className="text-[11px] text-blue-700 font-semibold">{selectedCohortIds.length} khối</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {db.cohorts.map(coh => {
                          const isSelected = selectedCohortIds.includes(coh.id);
                          return (
                            <button
                              key={coh.id}
                              type="button"
                              onClick={() => toggleCohort(coh.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {coh.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700">
                          Danh sách lớp ({selectedClassIds.length}/{availableClassesInCohorts.length}):
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={handleSelectAllClasses}
                            className="text-blue-700 font-bold hover:underline"
                          >
                            Tất cả
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleDeselectAllClasses}
                            className="text-slate-500 font-bold hover:underline"
                          >
                            Bỏ chọn
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleSuggestClasses}
                            className="text-indigo-700 font-bold hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> Gợi ý (theo CTĐT)
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-1.5">
                        {availableClassesInCohorts.map(cls => {
                          const checked = selectedClassIds.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer transition ${
                                checked ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleClass(cls.id)}
                                className="w-3.5 h-3.5 text-blue-600 rounded"
                              />
                              <span className="truncate">{cls.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCombinedMode}
                          onChange={(e) => setIsCombinedMode(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Áp dụng chế độ Học Ghép Lớp (Lý thuyết)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Column 2: Lecture Halls Allocation */}
                  <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-4">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">
                        Phân bổ Giảng đường:
                      </span>
                      <div className="space-y-2">
                        <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition ${
                          hallSelectionMode === 'all_balanced' ? 'bg-emerald-50 border-emerald-400 text-emerald-950' : 'bg-white border-slate-200'
                        }`}>
                          <input
                            type="radio"
                            name="hallMode"
                            checked={hallSelectionMode === 'all_balanced'}
                            onChange={() => setHallSelectionMode('all_balanced')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold block">Tự động cân bằng tải tất cả Giảng đường</span>
                            <span className="text-[11px] text-slate-500">
                              Chia đều lịch vào các phòng {activeLectureHalls.map(h => h.code).join(', ')}
                            </span>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition ${
                          hallSelectionMode === 'specific' ? 'bg-emerald-50 border-emerald-400 text-emerald-950' : 'bg-white border-slate-200'
                        }`}>
                          <input
                            type="radio"
                            name="hallMode"
                            checked={hallSelectionMode === 'specific'}
                            onChange={() => setHallSelectionMode('specific')}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="text-xs font-bold block">Chỉ định nhóm Giảng đường ưu tiên</span>
                            <span className="text-[11px] text-slate-500">Chỉ xếp vào các phòng được tick bên dưới</span>
                          </div>
                        </label>
                      </div>

                      {hallSelectionMode === 'specific' && (
                        <div className="mt-2 flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          {activeLectureHalls.map(hall => {
                            const isPicked = specificHallCodes.includes(hall.code);
                            return (
                              <button
                                key={hall.id}
                                type="button"
                                onClick={() => toggleHallCode(hall.code)}
                                className={`px-2 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                  isPicked ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                {hall.code}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        Tuần áp dụng:
                      </span>
                      <select
                        value={targetWeekNum}
                        onChange={(e) => setTargetWeekNum(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {db.weeks.map(w => (
                          <option key={w.weekNumber} value={w.weekNumber}>
                            Tuần {w.weekNumber} ({w.startDate ? `${w.startDate} -> ${w.endDate}` : ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Column 3: Time & Days & Conflicts */}
                  <div className="space-y-3">
                    {/* Days of Week */}
                    <div>
                      <span className="font-bold text-slate-700 block mb-1 text-xs">Các ngày trong tuần được xếp:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[2, 3, 4, 5, 6, 7].map(d => {
                          const isPicked = allowedDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDay(d)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isPicked ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              Thứ {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sessions */}
                    <div>
                      <span className="font-bold text-slate-700 block mb-1 text-xs">Buổi học:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSession('morning')}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                            allowedSessions.includes('morning') ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          Sáng
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSession('afternoon')}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                            allowedSessions.includes('afternoon') ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          Chiều
                        </button>
                      </div>
                    </div>

                    {/* Conflict Rules */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="font-bold text-slate-700 block text-xs">Tránh xung đột & trùng lặp:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={avoidExistingOccupiedSlots}
                          onChange={(e) => setAvoidExistingOccupiedSlots(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span>Tránh buổi đã có môn khác của Lớp</span>
                      </label>
                      <label className={`flex items-center gap-1.5 text-xs font-semibold ${
                        ignoreTeacherMode || teacherSelectionMode === 'unassigned' || (pairedS1TeacherMode === 'unassigned' && pairedS2TeacherMode === 'unassigned')
                          ? 'opacity-60 cursor-not-allowed text-slate-400' 
                          : 'cursor-pointer text-slate-700'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={ignoreTeacherMode || teacherSelectionMode === 'unassigned' || (pairedS1TeacherMode === 'unassigned' && pairedS2TeacherMode === 'unassigned')}
                          checked={!ignoreTeacherMode && teacherSelectionMode !== 'unassigned' && !(pairedS1TeacherMode === 'unassigned' && pairedS2TeacherMode === 'unassigned') && avoidTeacherConflicts}
                          onChange={(e) => setAvoidTeacherConflicts(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span>
                          Tránh trùng lịch Giảng viên
                          {(ignoreTeacherMode || teacherSelectionMode === 'unassigned' || (pairedS1TeacherMode === 'unassigned' && pairedS2TeacherMode === 'unassigned')) && (
                            <b className="ml-1 text-amber-600 font-bold">(Đã tắt - Chế độ không quan tâm GV)</b>
                          )}
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={avoidHallConflicts}
                          onChange={(e) => setAvoidHallConflicts(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                        <span>Tránh trùng Giảng đường</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER STEP 1 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  onClick={handleExecuteAutoSchedule}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-sky-300" />
                  <span>
                    {schedulingMode === 'paired_subjects'
                      ? 'Tự Động Phân Lịch Cặp Môn So Le & Xem Mẫu'
                      : 'Bắt Đầu Tự Động Phân Lịch & Xem Mẫu'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: PREVIEW & LIVE EDITING TABLE */}
          {currentStep === 'preview' && (
            <div className="space-y-5">
              
              {/* Summary Stats Banner */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>
                        Kết Quả Phân Lịch Tự Động:{' '}
                        <b>
                          {schedulingMode === 'paired_subjects'
                            ? `Cặp môn [${pairedSubject1?.name} ⇄ ${pairedSubject2?.name}]`
                            : selectedSubject?.name}
                        </b>
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đã sinh <b>{previewItems.length} buổi học</b> trong <b>Tuần {targetWeekNum}</b>. Người phân lịch có thể trực tiếp chỉnh sửa bất kỳ dòng nào trước khi xác nhận lưu vào Thời Khóa Biểu.
                    </p>
                  </div>

                  {/* Hall Distribution Summary */}
                  {previewResult && Object.keys(previewResult.hallUsageSummary).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">Cân bằng Giảng đường:</span>
                      {Object.entries(previewResult.hallUsageSummary).map(([hCode, count]) => (
                        <span key={hCode} className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">
                          {hCode}: <b className="text-emerald-700">{count}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Application Mode Selector */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-blue-950">Chế độ ghi vào TKB:</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-bold ${
                      applyMode === 'smart_merge' ? 'bg-blue-700 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'smart_merge'}
                        onChange={() => setApplyMode('smart_merge')}
                        className="hidden"
                      />
                      <span>Ghi đè thông minh (Giữ nguyên các môn khác)</span>
                    </label>

                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-bold ${
                      applyMode === 'empty_only' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'empty_only'}
                        onChange={() => setApplyMode('empty_only')}
                        className="hidden"
                      />
                      <span>Chỉ điền vào ô còn trống</span>
                    </label>

                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-bold ${
                      applyMode === 'replace_target_week' ? 'bg-rose-700 text-white border-rose-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'replace_target_week'}
                        onChange={() => setApplyMode('replace_target_week')}
                        className="hidden"
                      />
                      <span>Xóa toàn bộ Tuần {targetWeekNum} & thay mới</span>
                    </label>
                  </div>
                </div>

                {/* Warnings if any */}
                {previewResult && previewResult.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black flex items-center gap-1.5 text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        Lưu ý & Khuyến nghị từ hệ thống:
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep('config')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition shadow-xs"
                      >
                        Quay lại Cấu Hình & Tối Ưu
                      </button>
                    </div>
                    {previewResult.warnings.map((w, idx) => (
                      <p key={idx} className="text-amber-900 leading-relaxed">• {w}</p>
                    ))}
                    <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200">
                      💡 Mẹo: Bạn có thể bấm nút <b>"+ Thêm Buổi Học Mới"</b> bên dưới để bổ sung thủ công dòng còn thiếu, hoặc quay lại Bước 1 bấm <b>"⚡ Tối Ưu Hóa Cấu Hình"</b> để mở rộng thời gian/giảng đường.
                    </p>
                  </div>
                )}
              </div>

              {/* Table Toolbar & Search */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-800">
                      Danh sách buổi học ({previewItems.filter(i => i.selected).length} / {previewItems.length} buổi được chọn):
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllPreview(true)}
                      className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllPreview(false)}
                      className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search in preview */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Tìm theo lớp, phòng, GV..."
                        value={previewSearchTerm}
                        onChange={(e) => setPreviewSearchTerm(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-44 font-semibold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomPreviewItem}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Buổi Học</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center">Chọn</th>
                        <th className="p-3 w-36">Thời Gian</th>
                        <th className="p-3 w-44">Lớp / Nhóm Lớp</th>
                        <th className="p-3">Môn & Bài Giảng / So Le</th>
                        <th className="p-3 w-16 text-center">Số Tiết</th>
                        <th className="p-3 w-48">Giảng Viên</th>
                        <th className="p-3 w-40">Giảng Đường / Phòng</th>
                        <th className="p-3 w-20 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                            Chưa có buổi học nào. Hãy bấm "Thêm Buổi Học" hoặc quay lại bước 1 để điều chỉnh thông số.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewItems.map((item) => {
                          const itemConflicts = checkItemConflicts(item);
                          const hasConflict = itemConflicts.length > 0;

                          return (
                            <tr
                              key={item.tempId}
                              className={`transition hover:bg-slate-50 ${
                                item.selected ? (hasConflict ? 'bg-rose-50/40' : 'bg-white') : 'bg-slate-50/60 opacity-60'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => togglePreviewItemSelection(item.tempId)}
                                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                />
                              </td>

                              {/* Time: Day & Session */}
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={item.dayOfWeek}
                                    onChange={(e) => handleUpdatePreviewItemField(item.tempId, 'dayOfWeek', Number(e.target.value))}
                                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                                  >
                                    {[2, 3, 4, 5, 6, 7].map(d => (
                                      <option key={d} value={d}>Thứ {d}</option>
                                    ))}
                                  </select>

                                  <select
                                    value={item.session}
                                    onChange={(e) => handleUpdatePreviewItemField(item.tempId, 'session', e.target.value as any)}
                                    className={`border rounded px-2 py-1 text-xs font-bold outline-none ${
                                      item.session === 'morning' ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                                    }`}
                                  >
                                    <option value="morning">Sáng</option>
                                    <option value="afternoon">Chiều</option>
                                  </select>
                                </div>
                              </td>

                              {/* Class / Combined Class */}
                              <td className="p-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="truncate">{item.isCombined ? item.combinedClassName : item.className}</span>
                                </div>
                                {item.isCombined && (
                                  <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 mt-0.5">
                                    Ghép {item.combinedClassIds?.length} lớp
                                  </span>
                                )}
                                {item.pairPartnerClassName && (
                                  <div className="text-[10px] text-amber-800 font-bold mt-0.5 flex items-center gap-1">
                                    <ArrowLeftRight className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>So le cùng: {item.pairPartnerClassName}</span>
                                  </div>
                                )}
                              </td>

                              {/* Lesson Title / Paired Details Input */}
                              <td className="p-3">
                                {item.isPaired && item.periods && item.periods.length >= 2 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                                        Tiết 1-{item.periods[0].periodsCount}: {item.periods[0].subjectName}
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                                        (GĐ {item.periods[0].roomOrHospital} - {item.periods[0].teacherNames.join(', ')})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                                        Tiết {item.periods[0].periodsCount + 1}-{item.periodsCount}: {item.periods[1].subjectName}
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                                        (GĐ {item.periods[1].roomOrHospital} - {item.periods[1].teacherNames.join(', ')})
                                      </span>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.lessonTitle}
                                      onChange={(e) => handleUpdatePreviewItemField(item.tempId, 'lessonTitle', e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-700 outline-none"
                                      placeholder="Ghi chú buổi học..."
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="text"
                                      value={item.lessonTitle}
                                      onChange={(e) => handleUpdatePreviewItemField(item.tempId, 'lessonTitle', e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                      placeholder="Nhập tên bài học / ghi chú..."
                                    />
                                  </div>
                                )}
                                {hasConflict && (
                                  <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-rose-700">
                                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                    <span>{itemConflicts.join('; ')}</span>
                                  </div>
                                )}
                              </td>

                              {/* Periods Count */}
                              <td className="p-3 text-center">
                                <span className="inline-block px-2 py-1 rounded bg-slate-100 font-bold text-slate-900 text-xs">
                                  {item.periodsCount} tiết
                                </span>
                              </td>

                              {/* Teacher Selector */}
                              <td className="p-3">
                                <div className="text-xs font-semibold text-slate-800">
                                  {item.teacherNames.join(', ')}
                                </div>
                              </td>

                              {/* Lecture Hall / Room */}
                              <td className="p-3">
                                {item.isPaired && item.periods && item.periods.length >= 2 ? (
                                  <div className="space-y-1">
                                    <input 
                                      type="text" 
                                      list={`available-halls-${item.tempId}`}
                                      value={item.periods[0].roomOrHospital}
                                      onChange={(e) => handleUpdatePreviewItemRoom(item.tempId, e.target.value, 0)}
                                      className="w-full bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-[11px] font-bold text-emerald-950 outline-none focus:border-emerald-500"
                                      placeholder="Phòng tiết 1"
                                      title="Chỉnh sửa phòng học tiết 1"
                                    />
                                    <input 
                                      type="text" 
                                      list={`available-halls-${item.tempId}`}
                                      value={item.periods[1].roomOrHospital}
                                      onChange={(e) => handleUpdatePreviewItemRoom(item.tempId, e.target.value, 1)}
                                      className="w-full bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-[11px] font-bold text-emerald-950 outline-none focus:border-emerald-500"
                                      placeholder="Phòng tiết 2"
                                      title="Chỉnh sửa phòng học tiết 2"
                                    />
                                  </div>
                                ) : (
                                  <input 
                                    type="text" 
                                    list={`available-halls-${item.tempId}`}
                                    value={item.roomOrHospital}
                                    onChange={(e) => handleUpdatePreviewItemRoom(item.tempId, e.target.value)}
                                    className="w-full min-w-[70px] bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 text-xs font-bold text-emerald-950 outline-none focus:border-emerald-500"
                                    placeholder="Phòng..."
                                    title="Chỉnh sửa phòng học"
                                  />
                                )}
                                <datalist id={`available-halls-${item.tempId}`}>
                                  {getAvailableHallsForSlot(item.weekNumber, item.dayOfWeek, item.session, item.tempId).map(hall => (
                                    <option key={hall.id} value={hall.code}>{hall.name}</option>
                                  ))}
                                </datalist>
                              </td>

                              {/* Action Buttons: Duplicate & Delete */}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicatePreviewItem(item)}
                                    className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Nhân bản buổi học này"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePreviewItem(item.tempId)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Xóa buổi này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ACTION FOOTER STEP 2 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('config')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Quay Lại Chỉnh Thông Số</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAndApply}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>
                      Áp Dụng {previewItems.filter(i => i.selected).length} Buổi Vào Thời Khóa Biểu
                    </span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmApplyOpen}
        onClose={() => setIsConfirmApplyOpen(false)}
        onConfirm={executeApplySchedule}
        title="Xác nhận Áp Dụng Lịch Tự Động"
        message={`Bạn có chắc chắn muốn áp dụng ${previewItems.filter(i => i.selected).length} buổi học đã được sinh tự động vào Thời Khóa Biểu Tuần ${targetWeekNum}? Hệ thống sẽ lưu vào dữ liệu và tự động cập nhật Lịch Giảng Đường & Quỹ Tiết.`}
        confirmText="Xác Nhận & Lưu Lịch"
        cancelText="Quay lại kiểm tra"
        type="info"
      />

      {/* COMBINED PAIR BUILDER MODAL */}
      {isCombinedPairBuilderOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-200" />
                <div>
                  <h3 className="text-base font-bold">Tạo Cặp Lớp Ghép So Le Tùy Chọn</h3>
                  <p className="text-xs text-indigo-200">Thiết lập cặp 2 nhóm lớp ghép (ví dụ: 28AB ⇄ 28CD) để học so le trong buổi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCombinedPairBuilderOpen(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Cohort Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Khối Lớp:
                </label>
                <select
                  value={builderCohortId}
                  onChange={(e) => {
                    const nextCohortId = e.target.value;
                    setBuilderCohortId(nextCohortId);
                    const classesInCoh = db.classes.filter(c => c.cohortId === nextCohortId);
                    if (classesInCoh.length >= 4) {
                      const cA1 = classesInCoh[0];
                      const cA2 = classesInCoh[1];
                      const cB1 = classesInCoh[2];
                      const cB2 = classesInCoh[3];
                      setBuilderGroupAClassIds([cA1.id, cA2.id]);
                      setBuilderGroupAName(generateClassCombinationDisplayName([cA1, cA2]));
                      setBuilderGroupBClassIds([cB1.id, cB2.id]);
                      setBuilderGroupBName(generateClassCombinationDisplayName([cB1, cB2]));
                    } else if (classesInCoh.length >= 2) {
                      setBuilderGroupAClassIds([classesInCoh[0].id]);
                      setBuilderGroupAName(classesInCoh[0].name);
                      setBuilderGroupBClassIds([classesInCoh[1].id]);
                      setBuilderGroupBName(classesInCoh[1].name);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  {db.cohorts.map(coh => (
                    <option key={coh.id} value={coh.id}>{coh.name}</option>
                  ))}
                </select>
              </div>

              {/* Quick Suggestion Pills */}
              {(() => {
                const classesInCoh = db.classes
                  .filter(c => c.cohortId === builderCohortId)
                  .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));

                if (classesInCoh.length < 4) return null;

                const suggestions: Array<{ label: string; aIds: string[]; aName: string; bIds: string[]; bName: string }> = [];
                for (let i = 0; i + 3 < classesInCoh.length; i += 4) {
                  const c1 = classesInCoh[i];
                  const c2 = classesInCoh[i + 1];
                  const c3 = classesInCoh[i + 2];
                  const c4 = classesInCoh[i + 3];
                  const nameA = generateClassCombinationDisplayName([c1, c2]);
                  const nameB = generateClassCombinationDisplayName([c3, c4]);
                  suggestions.push({
                    label: `${nameA} ⇄ ${nameB}`,
                    aIds: [c1.id, c2.id],
                    aName: nameA,
                    bIds: [c3.id, c4.id],
                    bName: nameB,
                  });
                }

                if (suggestions.length === 0) return null;

                return (
                  <div className="space-y-1.5 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-900 block text-[11px]">
                      ⚡ Gợi ý cặp lớp ghép nhanh trong khối:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setBuilderGroupAClassIds(sug.aIds);
                            setBuilderGroupAName(sug.aName);
                            setBuilderGroupBClassIds(sug.bIds);
                            setBuilderGroupBName(sug.bName);
                          }}
                          className="px-3 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-800 rounded-lg border border-indigo-200 font-bold text-xs transition shadow-2xs cursor-pointer"
                        >
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Group A & Group B Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group A */}
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 uppercase">👥 Nhóm Lớp Ghép A</span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {builderGroupAClassIds.length} lớp được chọn
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tên / Bí Danh Nhóm A:
                    </label>
                    <input
                      type="text"
                      value={builderGroupAName}
                      onChange={(e) => setBuilderGroupAName(e.target.value)}
                      placeholder="Ví dụ: 28AB hoặc CĐĐD 28A+B"
                      className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chọn các lớp thuộc Nhóm A:
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border border-blue-200">
                      {db.classes
                        .filter(c => c.cohortId === builderCohortId)
                        .map(cls => {
                          const isChecked = builderGroupAClassIds.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                                isChecked ? 'bg-blue-100/70 text-blue-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setBuilderGroupAClassIds(prev => prev.filter(id => id !== cls.id));
                                  } else {
                                    setBuilderGroupAClassIds(prev => [...prev, cls.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded"
                              />
                              <span className="truncate">{cls.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Group B */}
                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 uppercase">👥 Nhóm Lớp Ghép B</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {builderGroupBClassIds.length} lớp được chọn
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tên / Bí Danh Nhóm B:
                    </label>
                    <input
                      type="text"
                      value={builderGroupBName}
                      onChange={(e) => setBuilderGroupBName(e.target.value)}
                      placeholder="Ví dụ: 28CD hoặc CĐĐD 28C+D"
                      className="w-full bg-white border border-emerald-300 rounded px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chọn các lớp thuộc Nhóm B:
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded border border-emerald-200">
                      {db.classes
                        .filter(c => c.cohortId === builderCohortId)
                        .map(cls => {
                          const isChecked = builderGroupBClassIds.includes(cls.id);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                                isChecked ? 'bg-emerald-100/70 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setBuilderGroupBClassIds(prev => prev.filter(id => id !== cls.id));
                                  } else {
                                    setBuilderGroupBClassIds(prev => [...prev, cls.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-emerald-600 rounded"
                              />
                              <span className="truncate">{cls.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pair Preview */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-center">
                <span className="font-bold text-slate-700 text-xs">
                  Cặp So Le Dự Kiến Tạo: <span className="text-blue-700 font-extrabold">{builderGroupAName || 'Nhóm A'}</span> ⇄ <span className="text-emerald-700 font-extrabold">{builderGroupBName || 'Nhóm B'}</span>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCombinedPairBuilderOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 text-xs transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCombinedPairFromBuilder}
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Thêm Cặp Vào Danh Sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT UNIT MODAL */}
      {editingUnitModalState && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-200" />
                <h3 className="text-sm font-bold">Chỉnh Sửa Nhóm / Lớp Con</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnitModalState(null)}
                className="p-1 text-indigo-200 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên hiển thị của Nhóm:
                </label>
                <input
                  type="text"
                  value={editingUnitModalState.name}
                  onChange={(e) => setEditingUnitModalState({ ...editingUnitModalState, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Danh sách lớp thuộc nhóm ({editingUnitModalState.classIds.length} lớp):
                </label>
                <div className="max-h-56 overflow-y-auto space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                  {db.classes.map(cls => {
                    const isChecked = editingUnitModalState.classIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition ${
                          isChecked ? 'bg-indigo-100 text-indigo-950 font-bold' : 'hover:bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditingUnitModalState({
                                ...editingUnitModalState,
                                classIds: editingUnitModalState.classIds.filter(id => id !== cls.id),
                              });
                            } else {
                              setEditingUnitModalState({
                                ...editingUnitModalState,
                                classIds: [...editingUnitModalState.classIds, cls.id],
                              });
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className="truncate">{cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUnitModalState(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditedUnit}
                className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 font-bold text-xs text-white shadow-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
