import { AppDatabase, SessionSchedule, StudentClass, Subject, Teacher, LectureHall, Department, PeriodDetail } from '../types';
import { calculateAllQuotas, cleanLectureHallCode, formatSubjectDisplayName } from './schedulerService';

export type SchedulingMode = 'single_subject' | 'paired_subjects';

export type PairedAlternatingMode = 
  | 'cross_swap'       // So le chéo 2 lớp/nhóm (Lớp A: Môn 1->Môn 2; Lớp B: Môn 2->Môn 1 trong cùng 1 buổi)
  | 'parallel_same'    // Cùng thứ tự (Cả 2 lớp đều học Môn 1->Môn 2)
  | 'alternate_days';  // So le theo ngày (Buổi 1: A[1->2], B[2->1]; Buổi 2: A[2->1], B[1->2])

export type PairedRoomMode = 
  | 'students_move'    // Sinh viên chuyển phòng (GV đứng cố định tại phòng giảng đường)
  | 'teachers_move'    // Sinh viên ngồi cố định tại 1 phòng (GV đổi phòng cho nhau)
  | 'same_room';       // Học chung 1 phòng

export interface SubjectSlotConfig {
  subjectId: string;
  periodType: 'LT' | 'TH' | 'LS';
  practiceType: 'full' | 'half' | 'group1' | 'group2';
  periodsCount: number; // Thường là 2 tiết
  lessonTitle?: string;
  teacherSelectionMode: 'assignment' | 'department' | 'manual' | 'unassigned';
  manualTeacherIds: string[];
  hallSelectionMode: 'all_balanced' | 'specific';
  specificHallCodes: string[];
}

export interface ClassPairingUnit {
  id: string;
  isCombined: boolean;
  classIds: string[];
  displayName: string;
}

export interface ClassPairingItem {
  id: string;
  unitA: ClassPairingUnit;
  unitB: ClassPairingUnit;
  sessionsPerWeek?: number; // Số buổi muốn phân cho cặp lớp này trong tuần (tùy chọn, mặc định theo cấu hình chung)
  weeklyPeriodsS1?: number; // Tổng số tiết Môn 1 trong tuần cho cặp này
  weeklyPeriodsS2?: number; // Tổng số tiết Môn 2 trong tuần cho cặp này
}

export interface PairedScheduleConfig {
  subject1: SubjectSlotConfig;
  subject2: SubjectSlotConfig;
  alternatingMode: PairedAlternatingMode;
  roomMode: PairedRoomMode;
  pairs: ClassPairingItem[];
  sessionsPerClassCount?: number; // Số buổi cần phân cho mỗi lớp/cặp lớp trong tuần (1, 2, 3, 4, 5...)
  weeklyPeriodsSubject1?: number; // Tổng số tiết môn 1 cần phân trong tuần cho mỗi lớp
  weeklyPeriodsSubject2?: number; // Tổng số tiết môn 2 cần phân trong tuần cho mỗi lớp
}

export interface UnitScheduleOverride {
  unitId: string; // ID của lớp hoặc ID của nhóm lớp ghép
  pinnedDays?: number[]; // Các ngày ấn định riêng cho lớp/nhóm này (ví dụ [2, 4] -> chỉ Thứ 2 và Thứ 4)
  pinnedSessions?: Array<'morning' | 'afternoon'>; // Ấn định buổi Sáng hoặc Chiều
  sessionsCount?: number; // Số buổi muốn phân bổ riêng cho lớp/nhóm này trong tuần
  preferredHall?: string; // Giảng đường ấn định riêng (nếu có)
  preferredTeacherIds?: string[]; // GV ấn định riêng (nếu có)
}

export interface AutoScheduleConfig {
  mode?: SchedulingMode; // 'single_subject' (mặc định) | 'paired_subjects'
  
  // Single subject settings
  subjectId: string;
  periodType: 'LT' | 'TH' | 'LS';
  practiceType: 'full' | 'half' | 'group1' | 'group2';
  periodsPerSession: number;
  classIds: string[];
  isCombinedMode: boolean; // Ghép lớp (học chung 1 phòng, 1 GV)
  combinedGroups?: Array<{ id: string; name: string; classIds: string[] }>;

  // Paired subjects settings
  pairedConfig?: PairedScheduleConfig;

  // General constraints
  weekNumber: number; // Tuần phân lịch
  targetWeeks?: number[]; // Nếu phân nhiều tuần
  allowedDays: number[]; // [2, 3, 4, 5, 6, 7]
  allowedSessions: Array<'morning' | 'afternoon'>;
  teacherSelectionMode: 'assignment' | 'department' | 'manual' | 'unassigned';
  manualTeacherIds: string[];
  hallSelectionMode: 'all_balanced' | 'specific';
  specificHallCodes: string[];
  avoidExistingOccupiedSlots: boolean;
  avoidTeacherConflicts: boolean;
  avoidHallConflicts: boolean;
  sessionsPerClassCount: number; // Số buổi muốn phân cho mỗi lớp/nhóm lớp
  applyMode?: 'smart_merge' | 'empty_only' | 'replace_target_week';
  ignoreTeachers?: boolean; // Nếu bật: bỏ qua hoàn toàn ràng buộc và không gán GV
  unitOverrides?: Record<string, UnitScheduleOverride>; // Tùy chỉnh ấn định ngày/buổi/số buổi cho từng lớp/lớp ghép
}

export interface PreviewPeriodDetail {
  subjectId: string;
  subjectName: string;
  periodType: 'LT' | 'TH' | 'LS';
  practiceType: 'full' | 'half' | 'group1' | 'group2';
  periodsCount: number;
  teacherIds: string[];
  teacherNames: string[];
  roomOrHospital: string;
  lessonTitle: string;
  orderInSession: number; // 1 = Tiết đầu (ví dụ tiết 1-2), 2 = Tiết sau (ví dụ tiết 3-4)
}

export interface PreviewScheduleItem {
  tempId: string;
  selected: boolean;
  weekNumber: number;
  dayOfWeek: number;
  session: 'morning' | 'afternoon';
  classId: string;
  className: string;
  isCombined: boolean;
  combinedClassIds?: string[];
  combinedClassName?: string;
  
  // Single subject default fields
  subjectId: string;
  subjectName: string;
  periodType: 'LT' | 'TH' | 'LS';
  practiceType: 'full' | 'half' | 'group1' | 'group2';
  periodsCount: number;
  teacherIds: string[];
  teacherNames: string[];
  roomOrHospital: string;
  lessonTitle: string;

  // Multi-period / Paired subjects fields
  isPaired?: boolean;
  periods?: PreviewPeriodDetail[];
  pairPartnerClassName?: string;

  warning?: string;
}

export interface AutoScheduleResult {
  previewItems: PreviewScheduleItem[];
  hallUsageSummary: { [hallCode: string]: number };
  totalSessionsGenerated: number;
  unassignedClasses: string[];
  warnings: string[];
}

/**
 * Core Auto-Scheduling Algorithm: Dispatches to Single or Paired Subject Engine
 */
export function generateAutoSubjectSchedule(
  db: AppDatabase,
  config: AutoScheduleConfig
): AutoScheduleResult {
  if (config.mode === 'paired_subjects' && config.pairedConfig) {
    return generateAutoPairedSchedule(db, config);
  }
  return generateSingleSubjectSchedule(db, config);
}

/**
 * Single Subject Auto-Scheduler
 */
function generateSingleSubjectSchedule(
  db: AppDatabase,
  config: AutoScheduleConfig
): AutoScheduleResult {
  const subject = db.subjects.find(s => s.id === config.subjectId);
  if (!subject) {
    return {
      previewItems: [],
      hallUsageSummary: {},
      totalSessionsGenerated: 0,
      unassignedClasses: [],
      warnings: ['Không tìm thấy môn học đã chọn!'],
    };
  }

  const dept = db.departments?.find(d => d.id === subject.departmentId);
  const activeHalls: LectureHall[] = (db.lectureHalls || []).filter(h => h.isActive !== false);

  // Map teachers & classes
  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  // Determine available Lecture Halls to balance
  let availableHalls = [...activeHalls];
  if (config.hallSelectionMode === 'specific' && config.specificHallCodes.length > 0) {
    const codeSet = new Set(config.specificHallCodes.map(c => c.toLowerCase()));
    availableHalls = activeHalls.filter(h => codeSet.has(h.code.toLowerCase()));
  }
  if (availableHalls.length === 0) {
    availableHalls = activeHalls.length > 0 ? activeHalls : [
      { id: 'hall_101', code: '101', name: '101', building: 'Khu Nhà A', capacity: 60, isActive: true },
      { id: 'hall_102', code: '102', name: '102', building: 'Khu Nhà A', capacity: 60, isActive: true },
      { id: 'hall_201', code: '201', name: '201', building: 'Khu Nhà A', capacity: 60, isActive: true },
      { id: 'hall_tm', code: 'Phòng TM', name: 'Phòng TM', building: 'Khu Nhà B', capacity: 60, isActive: true },
    ];
  }

  // Track existing occupied slots across all current schedules
  const existingClassSlots = new Set<string>(); // `${slotKey}_${classId}`
  const existingTeacherSlots = new Map<string, Set<string>>(); // slotKey => Set of teacherIds
  const existingHallSlots = new Map<string, Set<string>>(); // slotKey => Set of lowercase hallCodes
  const existingDeptPracticeCount = new Map<string, number>(); // slotKey => count of TH rooms in that slot

  db.schedules.forEach(sch => {
    const slotKey = `${sch.weekNumber}_${sch.dayOfWeek}_${sch.session}`;
    existingClassSlots.add(`${slotKey}_${sch.classId}`);

    sch.periods.forEach(p => {
      // Teachers
      const busyTeachers = existingTeacherSlots.get(slotKey) || new Set<string>();
      p.teacherIds.forEach(tId => busyTeachers.add(tId));
      existingTeacherSlots.set(slotKey, busyTeachers);

      // Halls
      if (p.periodType === 'LT') {
        const cleanHall = cleanLectureHallCode(p.roomOrHospital).toLowerCase();
        if (cleanHall) {
          const busyHalls = existingHallSlots.get(slotKey) || new Set<string>();
          busyHalls.add(cleanHall);
          existingHallSlots.set(slotKey, busyHalls);
        }
      }

      // Dept TH
      if (p.periodType === 'TH') {
        const sub = db.subjects.find(s => s.id === p.subjectId);
        if (sub?.departmentId && sub.departmentId === subject.departmentId) {
          const count = existingDeptPracticeCount.get(slotKey) || 0;
          existingDeptPracticeCount.set(slotKey, count + 1);
        }
      }
    });
  });

  // Track new allocations during this run
  const newClassSlots = new Set<string>();
  const newTeacherSlots = new Map<string, Set<string>>();
  const newHallSlots = new Map<string, Set<string>>();
  const newDeptPracticeCount = new Map<string, number>();
  const hallUsageCounter: { [hallCode: string]: number } = {};
  availableHalls.forEach(h => {
    hallUsageCounter[h.code] = 0;
  });

  // Prepare Groups to Schedule (either single classes or combined groups)
  interface SchedulingUnit {
    unitId: string;
    displayName: string;
    isCombined: boolean;
    classIds: string[];
    preferredTeachers: string[];
  }

  const schedulingUnits: SchedulingUnit[] = [];

  if (config.isCombinedMode && config.periodType === 'LT') {
    const aliases = db.combinedClassAliases || (db as any).combinedAliases || [];
    const handledClassIds = new Set<string>();

    // 1. Check custom groups passed in config
    if (config.combinedGroups && config.combinedGroups.length > 0) {
      config.combinedGroups.forEach(grp => {
        const validIds = grp.classIds.filter(id => config.classIds.includes(id));
        if (validIds.length > 0) {
          validIds.forEach(id => handledClassIds.add(id));
          const names = validIds.map(id => classMap.get(id)?.name || id).join(' + ');
          schedulingUnits.push({
            unitId: grp.id || `comb_${validIds.join('_')}`,
            displayName: grp.name || names,
            isCombined: validIds.length > 1,
            classIds: validIds,
            preferredTeachers: getTeachersForClassList(db, validIds, subject.id, config.teacherSelectionMode, config.manualTeacherIds, config.periodType),
          });
        }
      });
    }

    // 2. Check existing saved CombinedClassAliases
    aliases.forEach(alias => {
      const matchingIds = alias.classIds.filter(id => config.classIds.includes(id) && !handledClassIds.has(id));
      if (matchingIds.length > 1) {
        matchingIds.forEach(id => handledClassIds.add(id));
        schedulingUnits.push({
          unitId: alias.id,
          displayName: alias.alias || alias.shortName || matchingIds.map(id => classMap.get(id)?.name || id).join(' + '),
          isCombined: true,
          classIds: matchingIds,
          preferredTeachers: getTeachersForClassList(db, matchingIds, subject.id, config.teacherSelectionMode, config.manualTeacherIds, config.periodType),
        });
      }
    });

    // 2b. Auto-group remaining unhandled classes by cohort into combined pairs (e.g. 28A+28B -> 28AB)
    const remainingClassesByCohort = new Map<string, StudentClass[]>();
    config.classIds.forEach(cId => {
      if (!handledClassIds.has(cId)) {
        const cls = classMap.get(cId);
        if (cls) {
          const list = remainingClassesByCohort.get(cls.cohortId) || [];
          list.push(cls);
          remainingClassesByCohort.set(cls.cohortId, list);
        }
      }
    });

    remainingClassesByCohort.forEach((classesInCoh) => {
      classesInCoh.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
      for (let i = 0; i < classesInCoh.length; i += 2) {
        if (i + 1 < classesInCoh.length) {
          const c1 = classesInCoh[i];
          const c2 = classesInCoh[i + 1];
          handledClassIds.add(c1.id);
          handledClassIds.add(c2.id);
          const comboName = generateClassCombinationDisplayName([c1, c2]);
          schedulingUnits.push({
            unitId: `combo_${c1.id}_${c2.id}`,
            displayName: comboName,
            isCombined: true,
            classIds: [c1.id, c2.id],
            preferredTeachers: getTeachersForClassList(db, [c1.id, c2.id], subject.id, config.teacherSelectionMode, config.manualTeacherIds, config.periodType),
          });
        }
      }
    });

    // 3. Remaining uncombined classes
    config.classIds.forEach(cId => {
      if (!handledClassIds.has(cId)) {
        const cls = classMap.get(cId);
        if (cls) {
          schedulingUnits.push({
            unitId: `single_${cId}`,
            displayName: cls.name,
            isCombined: false,
            classIds: [cId],
            preferredTeachers: getTeachersForClassList(db, [cId], subject.id, config.teacherSelectionMode, config.manualTeacherIds, config.periodType),
          });
        }
      }
    });
  } else {
    // Single class units
    config.classIds.forEach(cId => {
      const cls = classMap.get(cId);
      if (cls) {
        schedulingUnits.push({
          unitId: `single_${cId}`,
          displayName: cls.name,
          isCombined: false,
          classIds: [cId],
          preferredTeachers: getTeachersForClassList(db, [cId], subject.id, config.teacherSelectionMode, config.manualTeacherIds, config.periodType),
        });
      }
    });
  }

  // Weeks to schedule
  const targetWeeks = config.targetWeeks && config.targetWeeks.length > 0
    ? config.targetWeeks
    : [config.weekNumber];

  const previewItems: PreviewScheduleItem[] = [];
  const unassignedClasses: string[] = [];
  const warnings: string[] = [];

  // Helper to pick the least used available hall for balanced distribution
  const pickBestBalancedHall = (slotKey: string): LectureHall | null => {
    const existingBusy = existingHallSlots.get(slotKey) || new Set<string>();
    const newBusy = newHallSlots.get(slotKey) || new Set<string>();

    const freeHalls = availableHalls.filter(h => {
      const code = h.code.toLowerCase();
      return !existingBusy.has(code) && !newBusy.has(code);
    });

    if (freeHalls.length === 0) return null;

    freeHalls.sort((a, b) => {
      const usageA = hallUsageCounter[a.code] || 0;
      const usageB = hallUsageCounter[b.code] || 0;
      return usageA - usageB;
    });

    return freeHalls[0];
  };

  // Helper to get room string for TH/LS
  const getPracticeRoomString = (slotKey: string): string => {
    if (config.periodType === 'LS') {
      return 'BV Đa khoa Tỉnh Thanh Hóa';
    }
    if (dept && dept.practiceRoomNames && dept.practiceRoomNames.length > 0) {
      const usedCount = (existingDeptPracticeCount.get(slotKey) || 0) + (newDeptPracticeCount.get(slotKey) || 0);
      const roomIndex = usedCount % dept.practiceRoomNames.length;
      return dept.practiceRoomNames[roomIndex];
    }
    return `Phòng TH ${dept?.name || subject.name}`;
  };

  // Main Scheduling Loop across Units and Weeks
  targetWeeks.forEach(weekNum => {
    // Dynamic load tracker per day in this week to balance classes evenly across Monday-Saturday
    const dayLoadMap = new Map<number, number>();
    config.allowedDays.forEach(d => {
      // Calculate initial load from existing database schedules
      let existingCount = 0;
      db.schedules.forEach(sch => {
        if (sch.weekNumber === weekNum && sch.dayOfWeek === d) {
          existingCount++;
        }
      });
      dayLoadMap.set(d, existingCount);
    });

    schedulingUnits.forEach((unit, unitIndex) => {
      let sessionsAssigned = 0;

      // Check unit-specific overrides (for single class or combined group)
      const override = config.unitOverrides?.[unit.unitId] || 
        (unit.classIds.length === 1 ? config.unitOverrides?.[unit.classIds[0]] : undefined);

      const sessionsNeeded = override?.sessionsCount !== undefined && override.sessionsCount > 0
        ? override.sessionsCount
        : (config.sessionsPerClassCount || 1);

      const effectiveAllowedDays = override?.pinnedDays && override.pinnedDays.length > 0
        ? override.pinnedDays
        : config.allowedDays;

      const effectiveAllowedSessions = override?.pinnedSessions && override.pinnedSessions.length > 0
        ? override.pinnedSessions
        : config.allowedSessions;

      const preferredHallCode = override?.preferredHall;

      // Track days already assigned to this unit in the current week to spread sessions
      const assignedDaysForUnit = new Set<number>();

      // Multi-pass search strategy:
      // Pass 1: Strict allocation (prefer distinct days with spacing, no conflicts)
      // Pass 2: Allow same day if multiple sessions needed and distinct days not enough
      // Pass 3: Relaxed hall fallback
      // Pass 4: Maximum relaxed allocation
      const searchPasses = [
        { allowHallFallback: false, allowTeacherFallback: false, relaxClassConflict: false, requireDistinctDays: true },
        { allowHallFallback: false, allowTeacherFallback: false, relaxClassConflict: false, requireDistinctDays: false },
        { allowHallFallback: true, allowTeacherFallback: true, relaxClassConflict: false, requireDistinctDays: false },
        { allowHallFallback: true, allowTeacherFallback: true, relaxClassConflict: true, requireDistinctDays: false },
      ];

      for (const pass of searchPasses) {
        if (sessionsAssigned >= sessionsNeeded) break;

        // Build candidate days:
        // If unit has pinned days, use them directly in priority.
        // Otherwise, sort allowed days by:
        // 1. Lowest current day load (to balance Mon-Sat)
        // 2. Unit index offset round-robin (to distribute start days)
        // 3. Spacing bonus (prefer days further apart from already assigned days for this unit)
        const candidateDays = [...effectiveAllowedDays].sort((a, b) => {
          if (override?.pinnedDays && override.pinnedDays.length > 0) {
            return 0; // Keep explicit pinned order
          }
          const loadA = dayLoadMap.get(a) || 0;
          const loadB = dayLoadMap.get(b) || 0;

          // Day spacing heuristic for multi-session units
          let spacingBonusA = 0;
          let spacingBonusB = 0;
          assignedDaysForUnit.forEach(prevDay => {
            const distA = Math.abs(a - prevDay);
            const distB = Math.abs(b - prevDay);
            if (distA <= 1) spacingBonusA += 2; // Penalty for adjacent/same day
            if (distB <= 1) spacingBonusB += 2;
          });

          const totalScoreA = loadA + spacingBonusA + ((a + unitIndex) % effectiveAllowedDays.length) * 0.1;
          const totalScoreB = loadB + spacingBonusB + ((b + unitIndex) % effectiveAllowedDays.length) * 0.1;

          return totalScoreA - totalScoreB;
        });

        for (const day of candidateDays) {
          if (sessionsAssigned >= sessionsNeeded) break;

          // If pass requires distinct days, skip if day already assigned to this unit
          if (pass.requireDistinctDays && assignedDaysForUnit.has(day) && effectiveAllowedDays.length > assignedDaysForUnit.size) {
            continue;
          }

          for (const session of effectiveAllowedSessions) {
            if (sessionsAssigned >= sessionsNeeded) break;

            const slotKey = `${weekNum}_${day}_${session}`;

            if (config.avoidExistingOccupiedSlots && !pass.relaxClassConflict) {
              const hasClassConflict = unit.classIds.some(
                cId => existingClassSlots.has(`${slotKey}_${cId}`) || newClassSlots.has(`${slotKey}_${cId}`)
              );
              if (hasClassConflict) continue;
            } else {
              // Always avoid scheduling the same class twice in the same new batch slot
              const hasNewBatchConflict = unit.classIds.some(cId => newClassSlots.has(`${slotKey}_${cId}`));
              if (hasNewBatchConflict) continue;
            }

            let chosenTeachers = override?.preferredTeacherIds && override.preferredTeacherIds.length > 0
              ? [...override.preferredTeacherIds]
              : [...unit.preferredTeachers];

            if (config.ignoreTeachers || config.teacherSelectionMode === 'unassigned') {
              chosenTeachers = [];
            }

            if (!config.ignoreTeachers && config.avoidTeacherConflicts && chosenTeachers.length > 0 && !pass.allowTeacherFallback) {
              const existingBusyTeachers = existingTeacherSlots.get(slotKey) || new Set<string>();
              const newBusyTeachers = newTeacherSlots.get(slotKey) || new Set<string>();

              const isTeacherBusy = chosenTeachers.some(
                tId => existingBusyTeachers.has(tId) || newBusyTeachers.has(tId)
              );
              if (isTeacherBusy) {
                if (config.teacherSelectionMode === 'department' && dept) {
                  const deptTeachers = db.teachers.filter(t => t.faculty.includes(dept.name) || t.specialty.includes(dept.code));
                  const freeDeptTeacher = deptTeachers.find(
                    t => !existingBusyTeachers.has(t.id) && !newBusyTeachers.has(t.id)
                  );
                  if (freeDeptTeacher) {
                    chosenTeachers = [freeDeptTeacher.id];
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              }
            }

            let assignedRoom = '';
            if (config.periodType === 'LT') {
              if (preferredHallCode) {
                const existingHallsInSlot = existingHallSlots.get(slotKey) || new Set<string>();
                const newHallsInSlot = newHallSlots.get(slotKey) || new Set<string>();
                const isPreferredBusy = existingHallsInSlot.has(preferredHallCode.toLowerCase()) || newHallsInSlot.has(preferredHallCode.toLowerCase());
                if (!isPreferredBusy || pass.allowHallFallback) {
                  assignedRoom = preferredHallCode;
                }
              }

              if (!assignedRoom) {
                const bestHall = pickBestBalancedHall(slotKey);
                if (!bestHall) {
                  if (config.avoidHallConflicts && !pass.allowHallFallback) {
                    continue;
                  } else {
                    assignedRoom = availableHalls[0]?.code || '101';
                  }
                } else {
                  assignedRoom = bestHall.code;
                }
              }
            } else if (config.periodType === 'TH') {
              if (dept) {
                const currentUsed = (existingDeptPracticeCount.get(slotKey) || 0) + (newDeptPracticeCount.get(slotKey) || 0);
                if (currentUsed >= dept.practiceRoomCount && !pass.allowHallFallback) {
                  continue;
                }
              }
              assignedRoom = getPracticeRoomString(slotKey);
            } else {
              assignedRoom = 'BV Đa khoa Tỉnh Thanh Hóa';
            }

            // Record slot reservation
            unit.classIds.forEach(cId => newClassSlots.add(`${slotKey}_${cId}`));

            const busyT = newTeacherSlots.get(slotKey) || new Set<string>();
            chosenTeachers.forEach(tId => busyT.add(tId));
            newTeacherSlots.set(slotKey, busyT);

            if (config.periodType === 'LT' && assignedRoom) {
              const busyH = newHallSlots.get(slotKey) || new Set<string>();
              busyH.add(assignedRoom.toLowerCase());
              newHallSlots.set(slotKey, busyH);
              hallUsageCounter[assignedRoom] = (hallUsageCounter[assignedRoom] || 0) + 1;
            } else if (config.periodType === 'TH') {
              const curDeptCount = newDeptPracticeCount.get(slotKey) || 0;
              newDeptPracticeCount.set(slotKey, curDeptCount + 1);
            }

            // Update day load tracker
            dayLoadMap.set(day, (dayLoadMap.get(day) || 0) + 1);
            assignedDaysForUnit.add(day);

            const primaryClassId = unit.classIds[0];
            const primaryClass = classMap.get(primaryClassId);
            const teacherNames = chosenTeachers.length > 0
              ? chosenTeachers.map(tId => teacherMap.get(tId)?.name || 'Chưa phân công')
              : ['Chưa gán GV'];

            const previewItem: PreviewScheduleItem = {
              tempId: `prev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              selected: true,
              weekNumber: weekNum,
              dayOfWeek: day,
              session,
              classId: primaryClassId,
              className: primaryClass?.name || primaryClassId,
              isCombined: unit.isCombined,
              combinedClassIds: unit.isCombined ? unit.classIds : undefined,
              combinedClassName: unit.isCombined ? unit.displayName : undefined,
              subjectId: subject.id,
              subjectName: subject.name,
              periodType: config.periodType,
              practiceType: config.practiceType || 'full',
              periodsCount: config.periodsPerSession || 4,
              teacherIds: chosenTeachers,
              teacherNames: teacherNames.length > 0 ? teacherNames : ['Chưa chọn GV'],
              roomOrHospital: assignedRoom,
              lessonTitle: config.periodType === 'LT' ? `Lý thuyết ${subject.name}` : `Thực hành ${subject.name}`,
              isPaired: false,
            };

            previewItems.push(previewItem);
            sessionsAssigned++;
          }
        }
      }

      if (sessionsAssigned < sessionsNeeded) {
        unassignedClasses.push(unit.displayName);
        warnings.push(`Lớp/Nhóm ${unit.displayName} chưa phân đủ ${sessionsNeeded} buổi do hết slot trống hoặc trùng lịch.`);
      }
    });
  });

  return {
    previewItems,
    hallUsageSummary: hallUsageCounter,
    totalSessionsGenerated: previewItems.length,
    unassignedClasses,
    warnings,
  };
}

/**
 * Paired Subjects Auto-Scheduler
 * Supports Alternating / Cross-Swapping two subjects between two single classes or combined groups in the same session
 */
function generateAutoPairedSchedule(
  db: AppDatabase,
  config: AutoScheduleConfig
): AutoScheduleResult {
  const pairedCfg = config.pairedConfig;
  if (!pairedCfg) {
    return {
      previewItems: [],
      hallUsageSummary: {},
      totalSessionsGenerated: 0,
      unassignedClasses: [],
      warnings: ['Chưa cấu hình cặp môn học!'],
    };
  }

  const s1 = db.subjects.find(s => s.id === pairedCfg.subject1.subjectId);
  const s2 = db.subjects.find(s => s.id === pairedCfg.subject2.subjectId);

  if (!s1 || !s2) {
    return {
      previewItems: [],
      hallUsageSummary: {},
      totalSessionsGenerated: 0,
      unassignedClasses: [],
      warnings: ['Không tìm thấy 1 trong 2 môn học thuộc cặp môn!'],
    };
  }

  const activeHalls: LectureHall[] = (db.lectureHalls || []).filter(h => h.isActive !== false);
  const teacherMap = new Map<string, Teacher>();
  db.teachers.forEach(t => teacherMap.set(t.id, t));

  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  // Determine available halls
  let availableHalls = [...activeHalls];
  if (config.hallSelectionMode === 'specific' && config.specificHallCodes.length > 0) {
    const codeSet = new Set(config.specificHallCodes.map(c => c.toLowerCase()));
    const filtered = activeHalls.filter(h => codeSet.has(h.code.toLowerCase()));
    if (filtered.length > 0) {
      availableHalls = filtered;
    }
  }

  // Ensure we have at least 2 distinct halls for paired cross scheduling fallback
  if (availableHalls.length < 2) {
    if (activeHalls.length >= 2) {
      availableHalls = activeHalls;
    } else {
      availableHalls = [
        { id: 'hall_101', code: '101', name: 'GĐ 101', building: 'Khu Nhà A', capacity: 60, isActive: true },
        { id: 'hall_102', code: '102', name: 'GĐ 102', building: 'Khu Nhà A', capacity: 60, isActive: true },
        { id: 'hall_201', code: '201', name: 'GĐ 201', building: 'Khu Nhà A', capacity: 60, isActive: true },
        { id: 'hall_tm', code: 'Phòng TM', name: 'Phòng TM', building: 'Khu Nhà B', capacity: 60, isActive: true },
      ];
    }
  }

  const targetWeeks = config.targetWeeks && config.targetWeeks.length > 0
    ? config.targetWeeks
    : [config.weekNumber];
  const targetWeekSet = new Set(targetWeeks);

  // Track existing occupied slots
  // If replacing target week, do not consider existing schedules in target weeks as conflicts
  const isReplacingTargetWeek = config.applyMode === 'replace_target_week';

  const existingClassSlots = new Set<string>();
  const existingTeacherSlots = new Map<string, Set<string>>();
  const existingHallSlots = new Map<string, Set<string>>();

  db.schedules.forEach(sch => {
    if (isReplacingTargetWeek && targetWeekSet.has(sch.weekNumber)) {
      return; // Skip existing schedules in the target week being replaced
    }

    const slotKey = `${sch.weekNumber}_${sch.dayOfWeek}_${sch.session}`;
    existingClassSlots.add(`${slotKey}_${sch.classId}`);

    sch.periods.forEach(p => {
      const busyTeachers = existingTeacherSlots.get(slotKey) || new Set<string>();
      p.teacherIds.forEach(tId => busyTeachers.add(tId));
      existingTeacherSlots.set(slotKey, busyTeachers);

      if (p.periodType === 'LT') {
        const cleanHall = cleanLectureHallCode(p.roomOrHospital).toLowerCase();
        if (cleanHall) {
          const busyHalls = existingHallSlots.get(slotKey) || new Set<string>();
          busyHalls.add(cleanHall);
          existingHallSlots.set(slotKey, busyHalls);
        }
      }
    });
  });

  const newClassSlots = new Set<string>();
  const newTeacherSlots = new Map<string, Set<string>>();
  const newHallSlots = new Map<string, Set<string>>();
  const hallUsageCounter: { [hallCode: string]: number } = {};
  availableHalls.forEach(h => {
    hallUsageCounter[h.code] = 0;
  });

  // Pick 2 balanced halls with fallback if fewer than 2 are totally empty in this slot
  const pickTwoBalancedHalls = (slotKey: string, allowFallback = false): [LectureHall, LectureHall] | null => {
    const existingBusy = existingHallSlots.get(slotKey) || new Set<string>();
    const newBusy = newHallSlots.get(slotKey) || new Set<string>();

    const freeHalls = availableHalls.filter(h => {
      const code = h.code.toLowerCase();
      return !existingBusy.has(code) && !newBusy.has(code);
    });

    if (freeHalls.length >= 2) {
      freeHalls.sort((a, b) => (hallUsageCounter[a.code] || 0) - (hallUsageCounter[b.code] || 0));
      return [freeHalls[0], freeHalls[1]];
    }

    if (allowFallback) {
      // If at least 1 is free, pick it and the least-used other hall
      if (freeHalls.length === 1) {
        const otherHalls = availableHalls.filter(h => h.code !== freeHalls[0].code);
        otherHalls.sort((a, b) => (hallUsageCounter[a.code] || 0) - (hallUsageCounter[b.code] || 0));
        return [freeHalls[0], otherHalls[0] || availableHalls[0]];
      }
      // If none are totally free, sort all available halls by overall usage
      const sorted = [...availableHalls].sort((a, b) => (hallUsageCounter[a.code] || 0) - (hallUsageCounter[b.code] || 0));
      if (sorted.length >= 2) {
        return [sorted[0], sorted[1]];
      }
      return [sorted[0] || availableHalls[0], availableHalls[1] || availableHalls[0]];
    }

    return null;
  };

  const previewItems: PreviewScheduleItem[] = [];
  const unassignedClasses: string[] = [];
  const warnings: string[] = [];

  const rawPairs = pairedCfg.pairs || [];
  if (rawPairs.length === 0) {
    return {
      previewItems: [],
      hallUsageSummary: {},
      totalSessionsGenerated: 0,
      unassignedClasses: [],
      warnings: ['Không có cặp lớp nào được chọn để phân lịch!'],
    };
  }

  // Sanitize pairs: check for identical classIds between unitA and unitB (e.g. self-paired independent units)
  const pairsToSchedule: ClassPairingItem[] = [];
  rawPairs.forEach(p => {
    const aIds = new Set(p.unitA.classIds);
    const bIds = new Set(p.unitB.classIds);
    const hasOverlap = [...aIds].some(id => bIds.has(id));

    if (hasOverlap && p.unitA.displayName === p.unitB.displayName) {
      // It is an independent single unit scheduled alone
      pairsToSchedule.push({
        id: p.id,
        unitA: p.unitA,
        unitB: {
          id: `${p.unitA.id}_none`,
          isCombined: false,
          classIds: [],
          displayName: '',
        },
      });
    } else {
      pairsToSchedule.push(p);
    }
  });

  targetWeeks.forEach(weekNum => {
    // Dynamic load tracker per day in this week for paired scheduling
    const dayLoadMap = new Map<number, number>();
    config.allowedDays.forEach(d => {
      let existingCount = 0;
      db.schedules.forEach(sch => {
        if (sch.weekNumber === weekNum && sch.dayOfWeek === d) {
          existingCount++;
        }
      });
      dayLoadMap.set(d, existingCount);
    });

    pairsToSchedule.forEach((pair, pairIndex) => {
      const unitA = pair.unitA;
      const unitB = pair.unitB;
      const isIndependentUnit = unitB.classIds.length === 0;

      let sessionsAssigned = 0;
      
      // Check unit override for this pair or unitA / unitB
      const pairOverride = config.unitOverrides?.[pair.id] || 
        config.unitOverrides?.[unitA.id] || 
        (unitB.id ? config.unitOverrides?.[unitB.id] : undefined);

      // Determine sessions needed: check override first, then pair-specific, then pairedCfg, then config
      let sessionsNeeded = pairOverride?.sessionsCount || pair.sessionsPerWeek || pairedCfg.sessionsPerClassCount || config.sessionsPerClassCount || 1;
      if (!pairOverride?.sessionsCount && !pair.sessionsPerWeek && pairedCfg.weeklyPeriodsSubject1 && pairedCfg.subject1.periodsCount > 0) {
        const calculatedFromS1 = Math.ceil(pairedCfg.weeklyPeriodsSubject1 / pairedCfg.subject1.periodsCount);
        sessionsNeeded = Math.max(sessionsNeeded, calculatedFromS1);
      }

      const effectiveAllowedDays = pairOverride?.pinnedDays && pairOverride.pinnedDays.length > 0
        ? pairOverride.pinnedDays
        : config.allowedDays;

      const effectiveAllowedSessions = pairOverride?.pinnedSessions && pairOverride.pinnedSessions.length > 0
        ? pairOverride.pinnedSessions
        : config.allowedSessions;

      // Track days already assigned to this pair to spread sessions across different days if possible
      const assignedDaysForPair = new Set<number>();

      // Pass 1: Strict allocation (no conflicts, prioritize distinct days)
      // Pass 2: Strict allocation (allow multiple sessions on same day if needed)
      // Pass 3: Relaxed allocation (with fallback teachers and halls)
      // Pass 4: Maximum relaxed allocation (allow class conflict fallback)
      const searchPasses = [
        { allowHallFallback: false, allowTeacherFallback: false, relaxClassConflict: false, requireDistinctDays: true },
        { allowHallFallback: false, allowTeacherFallback: false, relaxClassConflict: false, requireDistinctDays: false },
        { allowHallFallback: true, allowTeacherFallback: true, relaxClassConflict: false, requireDistinctDays: false },
        { allowHallFallback: true, allowTeacherFallback: true, relaxClassConflict: true, requireDistinctDays: false },
      ];

      for (const pass of searchPasses) {
        if (sessionsAssigned >= sessionsNeeded) break;

        // Sort candidate days by load and rotation offset
        const candidateDays = [...effectiveAllowedDays].sort((a, b) => {
          if (pairOverride?.pinnedDays && pairOverride.pinnedDays.length > 0) {
            return 0; // Respect explicit pinned order
          }
          const loadA = dayLoadMap.get(a) || 0;
          const loadB = dayLoadMap.get(b) || 0;

          let spacingBonusA = 0;
          let spacingBonusB = 0;
          assignedDaysForPair.forEach(prevDay => {
            if (Math.abs(a - prevDay) <= 1) spacingBonusA += 2;
            if (Math.abs(b - prevDay) <= 1) spacingBonusB += 2;
          });

          const totalScoreA = loadA + spacingBonusA + ((a + pairIndex) % effectiveAllowedDays.length) * 0.1;
          const totalScoreB = loadB + spacingBonusB + ((b + pairIndex) % effectiveAllowedDays.length) * 0.1;

          return totalScoreA - totalScoreB;
        });

        for (const day of candidateDays) {
          if (sessionsAssigned >= sessionsNeeded) break;

          // If pass requires distinct days, skip if this day already has a session for this pair
          if (pass.requireDistinctDays && assignedDaysForPair.has(day) && effectiveAllowedDays.length > assignedDaysForPair.size) {
            continue;
          }

          for (const session of effectiveAllowedSessions) {
            if (sessionsAssigned >= sessionsNeeded) break;

            const slotKey = `${weekNum}_${day}_${session}`;

            // Check class availability for all classes in unitA and unitB
            const allClassIds = isIndependentUnit
              ? [...unitA.classIds]
              : [...unitA.classIds, ...unitB.classIds];

            if (config.avoidExistingOccupiedSlots && !pass.relaxClassConflict) {
              const hasConflict = allClassIds.some(
                cId => existingClassSlots.has(`${slotKey}_${cId}`) || newClassSlots.has(`${slotKey}_${cId}`)
              );
              if (hasConflict) continue;
            } else {
              // Always avoid scheduling the same class twice within this new batch
              const hasNewBatchConflict = allClassIds.some(cId => newClassSlots.has(`${slotKey}_${cId}`));
              if (hasNewBatchConflict) continue;
            }

            // Pick teachers for Subject 1 & Subject 2
            let teachersS1 = config.ignoreTeachers || pairedCfg.subject1.teacherSelectionMode === 'unassigned'
              ? []
              : getTeachersForClassList(
                  db,
                  unitA.classIds,
                  s1.id,
                  pairedCfg.subject1.teacherSelectionMode,
                  pairedCfg.subject1.manualTeacherIds,
                  pairedCfg.subject1.periodType
                );
            let teachersS2 = config.ignoreTeachers || pairedCfg.subject2.teacherSelectionMode === 'unassigned'
              ? []
              : getTeachersForClassList(
                  db,
                  isIndependentUnit ? unitA.classIds : unitB.classIds,
                  s2.id,
                  pairedCfg.subject2.teacherSelectionMode,
                  pairedCfg.subject2.manualTeacherIds,
                  pairedCfg.subject2.periodType
                );

            // Ensure Subject 1 and Subject 2 do NOT get the exact same teacher when cross-swapping
            if (!isIndependentUnit && teachersS1.length > 0 && teachersS2.length > 0) {
              const shareSameTeacher = teachersS1.some(tId => teachersS2.includes(tId));
              if (shareSameTeacher) {
                // Try to find a distinct teacher for Subject 2
                const otherTeachersS2 = db.teachers.filter(
                  t => !teachersS1.includes(t.id) &&
                       ((s2.departmentId && t.faculty?.toLowerCase().includes(s2.departmentId.toLowerCase())) || true)
                );
                if (otherTeachersS2.length > 0) {
                  teachersS2 = [otherTeachersS2[0].id];
                }
              }
            }

            // Check teacher conflicts (only if not ignoring teachers and there are assigned teachers)
            if (!config.ignoreTeachers && config.avoidTeacherConflicts && (teachersS1.length > 0 || teachersS2.length > 0)) {
              const existingBusyTeachers = existingTeacherSlots.get(slotKey) || new Set<string>();
              const newBusyTeachers = newTeacherSlots.get(slotKey) || new Set<string>();

              const isT1Busy = teachersS1.length > 0 && teachersS1.some(tId => existingBusyTeachers.has(tId) || newBusyTeachers.has(tId));
              let isT2Busy = teachersS2.length > 0 && teachersS2.some(tId => existingBusyTeachers.has(tId) || newBusyTeachers.has(tId));

              if (isT1Busy || isT2Busy) {
                if (pass.allowTeacherFallback) {
                  // Try to find substitute teachers who are free in this slot
                  if (isT1Busy) {
                    const freeT1 = db.teachers.find(t => !existingBusyTeachers.has(t.id) && !newBusyTeachers.has(t.id) && !teachersS2.includes(t.id));
                    if (freeT1) teachersS1 = [freeT1.id];
                  }
                  if (isT2Busy) {
                    const freeT2 = db.teachers.find(t => !existingBusyTeachers.has(t.id) && !newBusyTeachers.has(t.id) && !teachersS1.includes(t.id));
                    if (freeT2) teachersS2 = [freeT2.id];
                  }
                  // Re-check
                  const stillT1Busy = teachersS1.length > 0 && teachersS1.some(tId => existingBusyTeachers.has(tId) || newBusyTeachers.has(tId));
                  const stillT2Busy = teachersS2.length > 0 && teachersS2.some(tId => existingBusyTeachers.has(tId) || newBusyTeachers.has(tId));
                  if (stillT1Busy || stillT2Busy) continue;
                } else {
                  continue;
                }
              }
            }

            // Pick lecture halls
            if (isIndependentUnit) {
              // Only 1 hall needed
              const existingBusyHalls = existingHallSlots.get(slotKey) || new Set<string>();
              const newBusyHalls = newHallSlots.get(slotKey) || new Set<string>();
              const freeSingle = availableHalls.filter(h => !existingBusyHalls.has(h.code.toLowerCase()) && !newBusyHalls.has(h.code.toLowerCase()));
              const hallObj = freeSingle[0] || availableHalls[0];
              const hallCode = hallObj.code;

              const pCount1 = pairedCfg.subject1.periodsCount || 2;
              const pCount2 = pairedCfg.subject2.periodsCount || 2;
              const t1Names = teachersS1.length > 0 ? teachersS1.map(tId => teacherMap.get(tId)?.name || 'Chưa chọn GV') : ['Chưa gán GV'];
              const t2Names = teachersS2.length > 0 ? teachersS2.map(tId => teacherMap.get(tId)?.name || 'Chưa chọn GV') : ['Chưa gán GV'];

              const sessionTag = sessionsNeeded > 1 ? ` (Buổi ${sessionsAssigned + 1})` : '';

              const periodsUnitA: PreviewPeriodDetail[] = [
                {
                  subjectId: s1.id,
                  subjectName: s1.name,
                  periodType: pairedCfg.subject1.periodType,
                  practiceType: pairedCfg.subject1.practiceType,
                  periodsCount: pCount1,
                  teacherIds: teachersS1,
                  teacherNames: t1Names,
                  roomOrHospital: hallCode,
                  lessonTitle: pairedCfg.subject1.lessonTitle 
                    ? `${pairedCfg.subject1.lessonTitle}${sessionTag}`
                    : `Lý thuyết ${s1.name}${sessionTag} (Tiết 1-${pCount1})`,
                  orderInSession: 1,
                },
                {
                  subjectId: s2.id,
                  subjectName: s2.name,
                  periodType: pairedCfg.subject2.periodType,
                  practiceType: pairedCfg.subject2.practiceType,
                  periodsCount: pCount2,
                  teacherIds: teachersS2,
                  teacherNames: t2Names,
                  roomOrHospital: hallCode,
                  lessonTitle: pairedCfg.subject2.lessonTitle 
                    ? `${pairedCfg.subject2.lessonTitle}${sessionTag}`
                    : `Lý thuyết ${s2.name}${sessionTag} (Tiết ${pCount1 + 1}-${pCount1 + pCount2})`,
                  orderInSession: 2,
                },
              ];

              // Reserve slots
              unitA.classIds.forEach(cId => newClassSlots.add(`${slotKey}_${cId}`));
              const busyT = newTeacherSlots.get(slotKey) || new Set<string>();
              teachersS1.forEach(tId => busyT.add(tId));
              teachersS2.forEach(tId => busyT.add(tId));
              newTeacherSlots.set(slotKey, busyT);

              const busyH = newHallSlots.get(slotKey) || new Set<string>();
              busyH.add(hallCode.toLowerCase());
              newHallSlots.set(slotKey, busyH);
              hallUsageCounter[hallCode] = (hallUsageCounter[hallCode] || 0) + 1;

              const primaryClassIdA = unitA.classIds[0];
              const primaryClassA = classMap.get(primaryClassIdA);
              const previewItemA: PreviewScheduleItem = {
                tempId: `prev_pairA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                selected: true,
                weekNumber: weekNum,
                dayOfWeek: day,
                session,
                classId: primaryClassIdA,
                className: primaryClassA?.name || primaryClassIdA,
                isCombined: unitA.isCombined,
                combinedClassIds: unitA.isCombined ? unitA.classIds : undefined,
                combinedClassName: unitA.isCombined ? unitA.displayName : undefined,
                subjectId: s1.id,
                subjectName: `${s1.name} + ${s2.name}`,
                periodType: 'LT',
                practiceType: 'full',
                periodsCount: pCount1 + pCount2,
                teacherIds: [...teachersS1, ...teachersS2],
                teacherNames: [...t1Names, ...t2Names],
                roomOrHospital: hallCode,
                lessonTitle: `[Cặp môn] ${periodsUnitA[0].subjectName} (${periodsUnitA[0].periodsCount}t) ➔ ${periodsUnitA[1].subjectName} (${periodsUnitA[1].periodsCount}t)${sessionsNeeded > 1 ? ` [Buổi ${sessionsAssigned + 1}/${sessionsNeeded}]` : ''}`,
                isPaired: true,
                periods: periodsUnitA,
              };

              previewItems.push(previewItemA);
              assignedDaysForPair.add(day);
              sessionsAssigned++;
              continue;
            }

            // Paired cross swap allocation: need 2 halls
            const pairHalls = pickTwoBalancedHalls(slotKey, pass.allowHallFallback);
            if (!pairHalls) {
              if (config.avoidHallConflicts && !pass.allowHallFallback) {
                continue;
              }
            }

            const hall1 = pairHalls ? pairHalls[0].code : availableHalls[0]?.code || '101';
            const hall2 = pairHalls ? pairHalls[1].code : (availableHalls[1]?.code || '102');

            let aStartsSub1 = true;
            if (pairedCfg.alternatingMode === 'cross_swap') {
              aStartsSub1 = true;
            } else if (pairedCfg.alternatingMode === 'parallel_same') {
              aStartsSub1 = true;
            } else if (pairedCfg.alternatingMode === 'alternate_days') {
              aStartsSub1 = (sessionsAssigned % 2 === 0);
            }

            let roomA_p1 = hall1;
            let roomA_p2 = pairedCfg.roomMode === 'students_move' ? hall2 : hall1;
            let roomB_p1 = hall2;
            let roomB_p2 = pairedCfg.roomMode === 'students_move' ? hall1 : hall2;

            const pCount1 = pairedCfg.subject1.periodsCount || 2;
            const pCount2 = pairedCfg.subject2.periodsCount || 2;

            const t1Names = teachersS1.length > 0 ? teachersS1.map(tId => teacherMap.get(tId)?.name || 'Chưa chọn GV') : ['Chưa gán GV'];
            const t2Names = teachersS2.length > 0 ? teachersS2.map(tId => teacherMap.get(tId)?.name || 'Chưa chọn GV') : ['Chưa gán GV'];

            const sessionTag = sessionsNeeded > 1 ? ` (Buổi ${sessionsAssigned + 1})` : '';

            // Build Periods for Unit A
            const periodsUnitA: PreviewPeriodDetail[] = aStartsSub1
              ? [
                  {
                    subjectId: s1.id,
                    subjectName: s1.name,
                    periodType: pairedCfg.subject1.periodType,
                    practiceType: pairedCfg.subject1.practiceType,
                    periodsCount: pCount1,
                    teacherIds: teachersS1,
                    teacherNames: t1Names,
                    roomOrHospital: roomA_p1,
                    lessonTitle: pairedCfg.subject1.lessonTitle
                      ? `${pairedCfg.subject1.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s1.name}${sessionTag} (Tiết 1-${pCount1})`,
                    orderInSession: 1,
                  },
                  {
                    subjectId: s2.id,
                    subjectName: s2.name,
                    periodType: pairedCfg.subject2.periodType,
                    practiceType: pairedCfg.subject2.practiceType,
                    periodsCount: pCount2,
                    teacherIds: teachersS2,
                    teacherNames: t2Names,
                    roomOrHospital: roomA_p2,
                    lessonTitle: pairedCfg.subject2.lessonTitle
                      ? `${pairedCfg.subject2.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s2.name}${sessionTag} (Tiết ${pCount1 + 1}-${pCount1 + pCount2})`,
                    orderInSession: 2,
                  },
                ]
              : [
                  {
                    subjectId: s2.id,
                    subjectName: s2.name,
                    periodType: pairedCfg.subject2.periodType,
                    practiceType: pairedCfg.subject2.practiceType,
                    periodsCount: pCount2,
                    teacherIds: teachersS2,
                    teacherNames: t2Names,
                    roomOrHospital: roomA_p1,
                    lessonTitle: pairedCfg.subject2.lessonTitle
                      ? `${pairedCfg.subject2.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s2.name}${sessionTag} (Tiết 1-${pCount2})`,
                    orderInSession: 1,
                  },
                  {
                    subjectId: s1.id,
                    subjectName: s1.name,
                    periodType: pairedCfg.subject1.periodType,
                    practiceType: pairedCfg.subject1.practiceType,
                    periodsCount: pCount1,
                    teacherIds: teachersS1,
                    teacherNames: t1Names,
                    roomOrHospital: roomA_p2,
                    lessonTitle: pairedCfg.subject1.lessonTitle
                      ? `${pairedCfg.subject1.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s1.name}${sessionTag} (Tiết ${pCount2 + 1}-${pCount1 + pCount2})`,
                    orderInSession: 2,
                  },
                ];

            // Build Periods for Unit B
            const bStartsSub1 = (pairedCfg.alternatingMode === 'cross_swap') ? !aStartsSub1 : aStartsSub1;
            const periodsUnitB: PreviewPeriodDetail[] = bStartsSub1
              ? [
                  {
                    subjectId: s1.id,
                    subjectName: s1.name,
                    periodType: pairedCfg.subject1.periodType,
                    practiceType: pairedCfg.subject1.practiceType,
                    periodsCount: pCount1,
                    teacherIds: teachersS1,
                    teacherNames: t1Names,
                    roomOrHospital: roomB_p1,
                    lessonTitle: pairedCfg.subject1.lessonTitle
                      ? `${pairedCfg.subject1.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s1.name}${sessionTag} (Tiết 1-${pCount1})`,
                    orderInSession: 1,
                  },
                  {
                    subjectId: s2.id,
                    subjectName: s2.name,
                    periodType: pairedCfg.subject2.periodType,
                    practiceType: pairedCfg.subject2.practiceType,
                    periodsCount: pCount2,
                    teacherIds: teachersS2,
                    teacherNames: t2Names,
                    roomOrHospital: roomB_p2,
                    lessonTitle: pairedCfg.subject2.lessonTitle
                      ? `${pairedCfg.subject2.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s2.name}${sessionTag} (Tiết ${pCount1 + 1}-${pCount1 + pCount2})`,
                    orderInSession: 2,
                  },
                ]
              : [
                  {
                    subjectId: s2.id,
                    subjectName: s2.name,
                    periodType: pairedCfg.subject2.periodType,
                    practiceType: pairedCfg.subject2.practiceType,
                    periodsCount: pCount2,
                    teacherIds: teachersS2,
                    teacherNames: t2Names,
                    roomOrHospital: roomB_p1,
                    lessonTitle: pairedCfg.subject2.lessonTitle
                      ? `${pairedCfg.subject2.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s2.name}${sessionTag} (Tiết 1-${pCount2})`,
                    orderInSession: 1,
                  },
                  {
                    subjectId: s1.id,
                    subjectName: s1.name,
                    periodType: pairedCfg.subject1.periodType,
                    practiceType: pairedCfg.subject1.practiceType,
                    periodsCount: pCount1,
                    teacherIds: teachersS1,
                    teacherNames: t1Names,
                    roomOrHospital: roomB_p2,
                    lessonTitle: pairedCfg.subject1.lessonTitle
                      ? `${pairedCfg.subject1.lessonTitle}${sessionTag}`
                      : `Lý thuyết ${s1.name}${sessionTag} (Tiết ${pCount2 + 1}-${pCount1 + pCount2})`,
                    orderInSession: 2,
                  },
                ];

            // Reserve slots
            unitA.classIds.forEach(cId => newClassSlots.add(`${slotKey}_${cId}`));
            unitB.classIds.forEach(cId => newClassSlots.add(`${slotKey}_${cId}`));

            const busyT = newTeacherSlots.get(slotKey) || new Set<string>();
            teachersS1.forEach(tId => busyT.add(tId));
            teachersS2.forEach(tId => busyT.add(tId));
            newTeacherSlots.set(slotKey, busyT);

            const busyH = newHallSlots.get(slotKey) || new Set<string>();
            busyH.add(hall1.toLowerCase());
            busyH.add(hall2.toLowerCase());
            newHallSlots.set(slotKey, busyH);

            hallUsageCounter[hall1] = (hallUsageCounter[hall1] || 0) + 1;
            hallUsageCounter[hall2] = (hallUsageCounter[hall2] || 0) + 1;

            // Create Preview Item for Unit A
            const primaryClassIdA = unitA.classIds[0];
            const primaryClassA = classMap.get(primaryClassIdA);
            const previewItemA: PreviewScheduleItem = {
              tempId: `prev_pairA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              selected: true,
              weekNumber: weekNum,
              dayOfWeek: day,
              session,
              classId: primaryClassIdA,
              className: primaryClassA?.name || primaryClassIdA,
              isCombined: unitA.isCombined,
              combinedClassIds: unitA.isCombined ? unitA.classIds : undefined,
              combinedClassName: unitA.isCombined ? unitA.displayName : undefined,
              subjectId: s1.id,
              subjectName: `${s1.name} + ${s2.name}`,
              periodType: 'LT',
              practiceType: 'full',
              periodsCount: pCount1 + pCount2,
              teacherIds: [...teachersS1, ...teachersS2],
              teacherNames: [...t1Names, ...t2Names],
              roomOrHospital: `${roomA_p1} / ${roomA_p2}`,
              lessonTitle: `[Cặp môn so le] ${periodsUnitA[0].subjectName} (${periodsUnitA[0].periodsCount}t) ➔ ${periodsUnitA[1].subjectName} (${periodsUnitA[1].periodsCount}t)${sessionsNeeded > 1 ? ` [Buổi ${sessionsAssigned + 1}/${sessionsNeeded}]` : ''}`,
              isPaired: true,
              periods: periodsUnitA,
              pairPartnerClassName: unitB.displayName,
            };

            // Create Preview Item for Unit B
            const primaryClassIdB = unitB.classIds[0];
            const primaryClassB = classMap.get(primaryClassIdB);
            const previewItemB: PreviewScheduleItem = {
              tempId: `prev_pairB_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              selected: true,
              weekNumber: weekNum,
              dayOfWeek: day,
              session,
              classId: primaryClassIdB,
              className: primaryClassB?.name || primaryClassIdB,
              isCombined: unitB.isCombined,
              combinedClassIds: unitB.isCombined ? unitB.classIds : undefined,
              combinedClassName: unitB.isCombined ? unitB.displayName : undefined,
              subjectId: s2.id,
              subjectName: `${s2.name} + ${s1.name}`,
              periodType: 'LT',
              practiceType: 'full',
              periodsCount: pCount1 + pCount2,
              teacherIds: [...teachersS2, ...teachersS1],
              teacherNames: [...t2Names, ...t1Names],
              roomOrHospital: `${roomB_p1} / ${roomB_p2}`,
              lessonTitle: `[Cặp môn so le] ${periodsUnitB[0].subjectName} (${periodsUnitB[0].periodsCount}t) ➔ ${periodsUnitB[1].subjectName} (${periodsUnitB[1].periodsCount}t)${sessionsNeeded > 1 ? ` [Buổi ${sessionsAssigned + 1}/${sessionsNeeded}]` : ''}`,
              isPaired: true,
              periods: periodsUnitB,
              pairPartnerClassName: unitA.displayName,
            };

            previewItems.push(previewItemA);
            previewItems.push(previewItemB);
            assignedDaysForPair.add(day);
            sessionsAssigned++;
          }
        }
      }

      if (sessionsAssigned < sessionsNeeded) {
        const pairLabel = isIndependentUnit ? unitA.displayName : `${unitA.displayName} ⇄ ${unitB.displayName}`;
        unassignedClasses.push(pairLabel);
        warnings.push(`Cặp lớp (${pairLabel}) chưa xếp đủ ${sessionsNeeded} buổi do toàn bộ ${config.allowedDays.length * config.allowedSessions.length} khung giờ đều bị trùng lịch của các lớp hoặc giảng viên. Hãy mở rộng ngày học/buổi học hoặc chọn chế độ 'Xóa tuần & thay mới'.`);
      }
    });
  });

  return {
    previewItems,
    hallUsageSummary: hallUsageCounter,
    totalSessionsGenerated: previewItems.length,
    unassignedClasses,
    warnings,
  };
}

/**
 * Helper to auto-generate pairing list from a list of class IDs or combined groups
 */
export function generateClassCombinationDisplayName(classes: StudentClass[]): string {
  if (classes.length === 0) return '';
  if (classes.length === 1) return classes[0].name;

  // Check if they share common prefix/name pattern (e.g. CĐĐD 28A and CĐĐD 28B -> 28AB or ĐD28AB)
  const shortNames = classes.map(c => c.shortName || c.name);
  const names = classes.map(c => c.name);

  // Try extracting letter suffixes like 28A, 28B => 28AB
  const regSuffix = /^(.*?)([A-Za-z0-9]+)$/;
  const match0 = names[0].match(regSuffix);
  const match1 = names[1]?.match(regSuffix);

  if (match0 && match1 && names.length === 2) {
    const prefix0 = match0[1].trim();
    const prefix1 = match1[1].trim();
    if (prefix0 === prefix1) {
      // e.g. "CĐĐD 28" + "A" & "B" => "28AB" or "CĐĐD 28AB"
      const s0 = match0[2];
      const s1 = match1[2];
      // extract short prefix like "28" or "ĐD28"
      const numMatch = prefix0.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        return `${num}${s0}${s1}`;
      }
      return `${prefix0} ${s0}${s1}`;
    }
  }

  // Fallback to joining short names with '+'
  return shortNames.join(' + ');
}

/**
 * Returns all available pairing units (both combined groups and single classes) for selection
 */
export function getAllAvailablePairingUnits(
  db: AppDatabase,
  selectedClassIds?: string[]
): { combinedUnits: ClassPairingUnit[]; singleUnits: ClassPairingUnit[] } {
  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  const targetClassIds = selectedClassIds && selectedClassIds.length > 0
    ? selectedClassIds
    : db.classes.map(c => c.id);

  const targetClassSet = new Set(targetClassIds);
  const combinedUnits: ClassPairingUnit[] = [];
  const singleUnits: ClassPairingUnit[] = [];
  const registeredCombinedKey = new Set<string>();

  // 1. Load from db.combinedClassAliases
  const aliases = db.combinedClassAliases || (db as any).combinedAliases || [];
  aliases.forEach(alias => {
    const validIds = alias.classIds.filter(id => classMap.has(id));
    if (validIds.length > 1) {
      const key = [...validIds].sort().join('_');
      registeredCombinedKey.add(key);
      combinedUnits.push({
        id: alias.id,
        isCombined: true,
        classIds: validIds,
        displayName: alias.alias || alias.shortName || validIds.map(id => classMap.get(id)?.name || id).join(' + '),
      });
    }
  });

  // 2. Generate standard auto-combined units by cohort (e.g. 28A+28B -> 28AB, 28C+28D -> 28CD)
  const cohortMap = new Map<string, StudentClass[]>();
  db.classes.forEach(cls => {
    const list = cohortMap.get(cls.cohortId) || [];
    list.push(cls);
    cohortMap.set(cls.cohortId, list);
  });

  cohortMap.forEach((classesInCohort) => {
    // Sort classes naturally
    const sorted = [...classesInCohort].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    for (let i = 0; i < sorted.length; i += 2) {
      if (i + 1 < sorted.length) {
        const c1 = sorted[i];
        const c2 = sorted[i + 1];
        const key = [c1.id, c2.id].sort().join('_');
        if (!registeredCombinedKey.has(key)) {
          registeredCombinedKey.add(key);
          const comboName = generateClassCombinationDisplayName([c1, c2]);
          combinedUnits.push({
            id: `combo_${c1.id}_${c2.id}`,
            isCombined: true,
            classIds: [c1.id, c2.id],
            displayName: comboName,
          });
        }
      }
    }
  });

  // 3. Load all single classes
  db.classes.forEach(cls => {
    singleUnits.push({
      id: `single_${cls.id}`,
      isCombined: false,
      classIds: [cls.id],
      displayName: cls.name,
    });
  });

  return { combinedUnits, singleUnits };
}

/**
 * Intelligent generator that pairs combined classes (e.g. 28AB ⇄ 28CD, 29AB ⇄ 29CD)
 */
export function generateAutoPairsForCombinedClasses(
  db: AppDatabase,
  selectedClassIds: string[]
): ClassPairingItem[] {
  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  const targetSet = new Set(selectedClassIds.length > 0 ? selectedClassIds : db.classes.map(c => c.id));
  const classesToProcess = db.classes.filter(c => targetSet.has(c.id));

  // Group classes by cohort
  const cohortMap = new Map<string, StudentClass[]>();
  classesToProcess.forEach(cls => {
    const list = cohortMap.get(cls.cohortId) || [];
    list.push(cls);
    cohortMap.set(cls.cohortId, list);
  });

  const aliases = db.combinedClassAliases || (db as any).combinedAliases || [];
  const pairs: ClassPairingItem[] = [];

  cohortMap.forEach((classesInCohort, cohortId) => {
    // Check if we have pre-defined aliases in this cohort
    const cohortClassIds = new Set(classesInCohort.map(c => c.id));
    const cohortAliases = aliases.filter(a => 
      a.classIds.length > 1 && a.classIds.every(id => cohortClassIds.has(id))
    );

    const usedClassIds = new Set<string>();
    const cohortCombinedUnits: ClassPairingUnit[] = [];

    // First use existing saved aliases
    cohortAliases.forEach(alias => {
      if (alias.classIds.every(id => !usedClassIds.has(id))) {
        alias.classIds.forEach(id => usedClassIds.add(id));
        cohortCombinedUnits.push({
          id: alias.id,
          isCombined: true,
          classIds: alias.classIds,
          displayName: alias.alias || alias.shortName || alias.classIds.map(id => classMap.get(id)?.name || id).join(' + '),
        });
      }
    });

    // For remaining uncombined classes in this cohort, pair them in twos to form combined groups (e.g. 28A+28B -> 28AB, 28C+28D -> 28CD)
    const remainingClasses = classesInCohort
      .filter(c => !usedClassIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));

    for (let i = 0; i < remainingClasses.length; i += 2) {
      if (i + 1 < remainingClasses.length) {
        const c1 = remainingClasses[i];
        const c2 = remainingClasses[i + 1];
        usedClassIds.add(c1.id);
        usedClassIds.add(c2.id);
        const comboName = generateClassCombinationDisplayName([c1, c2]);
        cohortCombinedUnits.push({
          id: `combo_${c1.id}_${c2.id}`,
          isCombined: true,
          classIds: [c1.id, c2.id],
          displayName: comboName,
        });
      } else {
        // Single remaining class in this cohort
        const c1 = remainingClasses[i];
        usedClassIds.add(c1.id);
        cohortCombinedUnits.push({
          id: `single_${c1.id}`,
          isCombined: false,
          classIds: [c1.id],
          displayName: c1.name,
        });
      }
    }

    // Now pair the combined units in pairs: (Unit 0 ⇄ Unit 1 -> e.g. 28AB ⇄ 28CD)
    for (let i = 0; i < cohortCombinedUnits.length; i += 2) {
      if (i + 1 < cohortCombinedUnits.length) {
        pairs.push({
          id: `pair_combined_${cohortCombinedUnits[i].id}_${cohortCombinedUnits[i + 1].id}`,
          unitA: cohortCombinedUnits[i],
          unitB: cohortCombinedUnits[i + 1],
        });
      } else {
        // Unpaired combined unit: handle as independent unit (unitB has empty classIds to prevent self-conflict)
        pairs.push({
          id: `pair_combined_${cohortCombinedUnits[i].id}_self`,
          unitA: cohortCombinedUnits[i],
          unitB: {
            id: `${cohortCombinedUnits[i].id}_independent`,
            isCombined: false,
            classIds: [],
            displayName: `${cohortCombinedUnits[i].displayName} (Độc lập - 1 phòng)`,
          },
        });
      }
    }
  });

  return pairs;
}

export function generateAutoPairsFromUnits(
  db: AppDatabase,
  selectedClassIds: string[],
  isCombinedMode: boolean,
  pairingStrategy: 'combined' | 'single' | 'auto' = 'auto'
): ClassPairingItem[] {
  if (pairingStrategy === 'combined' || (isCombinedMode && pairingStrategy === 'auto')) {
    return generateAutoPairsForCombinedClasses(db, selectedClassIds);
  }

  const classMap = new Map<string, StudentClass>();
  db.classes.forEach(c => classMap.set(c.id, c));

  const units: ClassPairingUnit[] = [];

  selectedClassIds.forEach(cId => {
    const cls = classMap.get(cId);
    if (cls) {
      units.push({
        id: `single_${cId}`,
        isCombined: false,
        classIds: [cId],
        displayName: cls.name,
      });
    }
  });

  // Pair consecutive single units (0 with 1, 2 with 3...)
  const pairs: ClassPairingItem[] = [];
  for (let i = 0; i < units.length; i += 2) {
    if (i + 1 < units.length) {
      pairs.push({
        id: `pair_${units[i].id}_${units[i + 1].id}`,
        unitA: units[i],
        unitB: units[i + 1],
      });
    } else {
      // Odd unit: keep as independent without duplicating classId
      pairs.push({
        id: `pair_${units[i].id}_self`,
        unitA: units[i],
        unitB: {
          id: `${units[i].id}_independent`,
          isCombined: false,
          classIds: [],
          displayName: `${units[i].displayName} (Độc lập - 1 phòng)`,
        },
      });
    }
  }

  return pairs;
}

/**
 * Helper to retrieve assigned or default teachers for a list of classes
 */
function getTeachersForClassList(
  db: AppDatabase,
  classIds: string[],
  subjectId: string,
  mode: 'assignment' | 'department' | 'manual' | 'unassigned',
  manualTeacherIds: string[],
  periodType: 'LT' | 'TH' | 'LS'
): string[] {
  // If mode is 'unassigned', do not assign any teacher
  if (mode === 'unassigned') {
    return [];
  }

  if (mode === 'manual' && manualTeacherIds && manualTeacherIds.length > 0) {
    return manualTeacherIds;
  }

  // 1. Look in Teaching Assignments for the classes
  for (const cId of classIds) {
    const asg = db.assignments.find(a => a.classId === cId && a.subjectId === subjectId);
    if (asg) {
      if (periodType === 'LT' && asg.theoryTeacherIds.length > 0) {
        return asg.theoryTeacherIds;
      }
      if (periodType === 'TH' && asg.practiceTeacherIds.length > 0) {
        return asg.practiceTeacherIds;
      }
      if (periodType === 'LS' && asg.clinicalTeacherIds.length > 0) {
        return asg.clinicalTeacherIds;
      }
    }
  }

  // 2. Look by Subject's Department / Faculty
  const subject = db.subjects.find(s => s.id === subjectId);
  if (subject) {
    if (subject.departmentId) {
      const dept = db.departments?.find(d => d.id === subject.departmentId);
      if (dept) {
        const deptTeachers = db.teachers.filter(
          t => (t.faculty && (t.faculty.toLowerCase().includes(dept.name.toLowerCase()) || dept.name.toLowerCase().includes(t.faculty.toLowerCase()))) ||
               (t.specialty && (t.specialty.toLowerCase().includes(dept.code.toLowerCase()) || dept.code.toLowerCase().includes(t.specialty.toLowerCase())))
        );
        if (deptTeachers.length > 0) {
          return [deptTeachers[0].id];
        }
      }
    }

    // Match by faculty containing subject name keywords
    const subWords = subject.name.toLowerCase().split(' ').filter(w => w.length > 2);
    const matchingTeachers = db.teachers.filter(t => {
      const fac = (t.faculty || '').toLowerCase();
      const spec = (t.specialty || '').toLowerCase();
      return subWords.some(w => fac.includes(w) || spec.includes(w));
    });
    if (matchingTeachers.length > 0) {
      return [matchingTeachers[0].id];
    }
  }

  // 3. Fallback to first teacher in DB
  return db.teachers[0] ? [db.teachers[0].id] : [];
}

export type ApplyScheduleMode = 'smart_merge' | 'empty_only' | 'replace_target_week';

/**
 * Converts selected preview items into official SessionSchedule objects ready to be saved in db.schedules
 */
export function applyPreviewToDatabaseSchedules(
  db: AppDatabase,
  previewItems: PreviewScheduleItem[],
  applyMode: ApplyScheduleMode = 'smart_merge',
  targetWeekNum?: number
): SessionSchedule[] {
  const selectedItems = previewItems.filter(item => item.selected);
  if (selectedItems.length === 0) return db.schedules;

  let newSchedules: SessionSchedule[] = [];

  if (applyMode === 'replace_target_week' && targetWeekNum) {
    // Retain schedules of all other weeks, clear the target week
    newSchedules = db.schedules.filter(s => s.weekNumber !== targetWeekNum);
  } else {
    newSchedules = [...db.schedules];
  }

  selectedItems.forEach(item => {
    // If it's a combined class, we create the schedule for each class in the combined group
    const targetClassIds = item.isCombined && item.combinedClassIds && item.combinedClassIds.length > 0
      ? item.combinedClassIds
      : [item.classId];

    const groupUniqueId = item.isCombined ? `grp_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : undefined;

    // Determine the periods to apply
    let periodsToApply: PeriodDetail[] = [];
    if (item.isPaired && item.periods && item.periods.length > 0) {
      periodsToApply = item.periods.map(p => ({
        subjectId: p.subjectId,
        periodType: p.periodType,
        practiceType: p.practiceType,
        periodsCount: p.periodsCount,
        teacherIds: p.teacherIds,
        roomOrHospital: p.roomOrHospital,
        lessonTitle: p.lessonTitle,
      }));
    } else {
      periodsToApply = [
        {
          subjectId: item.subjectId,
          periodType: item.periodType,
          practiceType: item.practiceType,
          periodsCount: item.periodsCount,
          teacherIds: item.teacherIds,
          roomOrHospital: item.roomOrHospital,
          lessonTitle: item.lessonTitle,
        },
      ];
    }

    targetClassIds.forEach(cId => {
      // Check if schedule exists for this class in this slot
      const existingIdx = newSchedules.findIndex(
        s => s.weekNumber === item.weekNumber &&
             s.dayOfWeek === item.dayOfWeek &&
             s.session === item.session &&
             s.classId === cId
      );

      // If mode is 'empty_only' and slot is already occupied, skip
      if (applyMode === 'empty_only' && existingIdx >= 0 && newSchedules[existingIdx].periods.length > 0) {
        return;
      }

      const newScheduleObj: SessionSchedule = {
        id: `sch_auto_${item.weekNumber}_${cId}_${item.dayOfWeek}_${item.session}_${Math.random().toString(36).substring(2, 7)}`,
        weekNumber: item.weekNumber,
        academicYear: db.academicYear || '2026-2027',
        classId: cId,
        dayOfWeek: item.dayOfWeek,
        session: item.session,
        periods: periodsToApply,
        combinedGroupId: groupUniqueId,
        combinedClassIds: item.isCombined ? targetClassIds : undefined,
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        newSchedules[existingIdx] = newScheduleObj;
      } else {
        newSchedules.push(newScheduleObj);
      }
    });
  });

  return newSchedules;
}
