import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AppDatabase, 
  CohortBlock, 
  StudentClass, 
  Teacher, 
  Subject, 
  TeachingAssignment, 
  SessionSchedule, 
  ClassSubjectQuota, 
  WeekConfig 
} from './types';
import { loadDatabase, getInitialDatabase, saveDatabase, restoreDefaultDatabase } from './services/storage';
import { detectConflicts } from './services/schedulerService';

import { Header } from './components/Header';
import { CohortTabs } from './components/CohortTabs';
import { TimetableGrid } from './components/TimetableGrid';
import { ProgressDashboard } from './components/ProgressDashboard';
import { ClassManagement } from './components/ClassManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { SubjectManagement } from './components/SubjectManagement';
import { AssignmentManagement } from './components/AssignmentManagement';
import { RoomManagement } from './components/RoomManagement';
import { ExamManagement } from './components/ExamManagement';
import { CurriculumManagement } from './components/CurriculumManagement';
import { ScheduleModal } from './components/ScheduleModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { WeekManagerModal } from './components/WeekManagerModal';
import { AutoSchedulerModal } from './components/AutoSchedulerModal';
import { TemplateImportModal } from './components/TemplateImportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { ConflictAlertBanner } from './components/ConflictAlertBanner';
import { UserGuideModal } from './components/UserGuideModal';
import { ScheduleDiffSyncModal } from './components/ScheduleDiffSyncModal';

export function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<'timetable' | 'progress' | 'classes' | 'teachers' | 'subjects' | 'assignments' | 'rooms' | 'exams'>('timetable');
  
  // Undo / Redo History Stacks
  const [historyPast, setHistoryPast] = useState<AppDatabase[]>([]);
  const [historyFuture, setHistoryFuture] = useState<AppDatabase[]>([]);
  const [historyToast, setHistoryToast] = useState<{ message: string; type: 'undo' | 'redo' } | null>(null);

  // Active Cohort & Active Week
  const [activeCohortId, setActiveCohortId] = useState<string>(() => {
    return db.cohorts[0]?.id || 'cohort_cd3';
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(3);
  const [dismissConflicts, setDismissConflicts] = useState<boolean>(false);

  // Modals state
  const [scheduleModalParams, setScheduleModalParams] = useState<{
    isOpen: boolean;
    classId: string;
    dayOfWeek: number;
    session: 'morning' | 'afternoon';
    existingSchedule?: SessionSchedule;
  }>({
    isOpen: false,
    classId: '',
    dayOfWeek: 2,
    session: 'morning',
  });

  const [isAutoSchedulerOpen, setIsAutoSchedulerOpen] = useState(false);
  const [isExcelExportOpen, setIsExcelExportOpen] = useState(false);
  const [isTemplateImportOpen, setIsTemplateImportOpen] = useState(false);
  const [isWeekManagerOpen, setIsWeekManagerOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isDiffSyncOpen, setIsDiffSyncOpen] = useState(false);

  const handleApplyMasterSchedule = (updatedSchedules: SessionSchedule[], summaryMessage: string) => {
    updateDb(prev => ({
      ...prev,
      schedules: updatedSchedules,
    }));
    setHistoryToast({
      message: summaryMessage,
      type: 'redo',
    });
  };

  // Ensure activeCohortId exists
  useEffect(() => {
    if (!db.cohorts.some(c => c.id === activeCohortId)) {
      setActiveCohortId(db.cohorts[0]?.id || '');
    }
  }, [db.cohorts, activeCohortId]);

  // Persist DB on changes & record snapshot to undo stack
  const updateDb = (updater: (prev: AppDatabase) => AppDatabase) => {
    setDb(prev => {
      const next = updater(prev);
      saveDatabase(next);
      // Push snapshot to historyPast
      setHistoryPast(past => {
        const nextPast = [...past, JSON.parse(JSON.stringify(prev))];
        if (nextPast.length > 50) nextPast.shift(); // Store up to 50 previous states
        return nextPast;
      });
      setHistoryFuture([]); // Clear redo stack on new modification
      return next;
    });
  };

  const handleUndo = useCallback(() => {
    setHistoryPast(past => {
      if (past.length === 0) return past;
      const newPast = [...past];
      const previousDb = newPast.pop();
      if (!previousDb) return past;

      setDb(currentDb => {
        setHistoryFuture(future => [JSON.parse(JSON.stringify(currentDb)), ...future]);
        saveDatabase(previousDb);
        return previousDb;
      });

      setHistoryToast({
        message: '↩️ Đã hoàn tác thao tác trước đó!',
        type: 'undo',
      });
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture(future => {
      if (future.length === 0) return future;
      const newFuture = [...future];
      const nextDb = newFuture.shift();
      if (!nextDb) return future;

      setDb(currentDb => {
        setHistoryPast(past => [...past, JSON.parse(JSON.stringify(currentDb))]);
        saveDatabase(nextDb);
        return nextDb;
      });

      setHistoryToast({
        message: '↪️ Đã làm lại thao tác vừa hoàn tác!',
        type: 'redo',
      });
      return newFuture;
    });
  }, []);

  // Keyboard shortcut listener: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          if (!isInput) {
            e.preventDefault();
            handleUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Auto-dismiss toast
  useEffect(() => {
    if (historyToast) {
      const timer = setTimeout(() => {
        setHistoryToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [historyToast]);

  // Active Cohort Object
  const activeCohort = useMemo(() => {
    return db.cohorts.find(c => c.id === activeCohortId) || db.cohorts[0] || {
      id: 'cohort_default',
      name: 'Mặc định',
      order: 1,
    };
  }, [db.cohorts, activeCohortId]);

  // Conflicts detection
  const conflicts = useMemo(() => {
    return detectConflicts(db);
  }, [db]);

  // ----------------------------------------------------
  // Cohort Actions
  // ----------------------------------------------------
  const handleAddCohort = (name: string, description?: string) => {
    const newCohort: CohortBlock = {
      id: `cohort_${Date.now()}`,
      name,
      description,
      order: db.cohorts.length + 1,
    };
    updateDb(prev => ({
      ...prev,
      cohorts: [...prev.cohorts, newCohort],
    }));
    setActiveCohortId(newCohort.id);
  };

  const handleUpdateCohort = (id: string, name: string, description?: string) => {
    updateDb(prev => ({
      ...prev,
      cohorts: prev.cohorts.map(c => (c.id === id ? { ...c, name, description } : c)),
    }));
  };

  const handleDeleteCohort = (id: string) => {
    updateDb(prev => ({
      ...prev,
      cohorts: prev.cohorts.filter(c => c.id !== id),
    }));
  };

  const handleReorderCohorts = (reordered: CohortBlock[]) => {
    updateDb(prev => ({
      ...prev,
      cohorts: reordered,
    }));
  };

  // ----------------------------------------------------
  // Schedule Actions
  // ----------------------------------------------------
  const handleSaveSchedule = (schedule: SessionSchedule, combinedSchedules?: SessionSchedule[]) => {
    updateDb(prev => {
      let updatedSchedules = [...prev.schedules];
      const allToSave = [schedule, ...(combinedSchedules || [])];

      allToSave.forEach(item => {
        const existingIdx = updatedSchedules.findIndex(
          s => s.weekNumber === item.weekNumber &&
               s.dayOfWeek === item.dayOfWeek &&
               s.session === item.session &&
               s.classId === item.classId
        );

        if (existingIdx >= 0) {
          updatedSchedules[existingIdx] = item;
        } else {
          updatedSchedules.push(item);
        }
      });

      return {
        ...prev,
        schedules: updatedSchedules,
      };
    });
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    updateDb(prev => ({
      ...prev,
      schedules: prev.schedules.filter(s => s.id !== scheduleId),
    }));
  };

  // ----------------------------------------------------
  // Class CRUD
  // ----------------------------------------------------
  const handleAddClass = (newClass: Omit<StudentClass, 'id'>) => {
    const cls: StudentClass = {
      ...newClass,
      id: `cls_${Date.now()}`,
    };
    updateDb(prev => ({
      ...prev,
      classes: [...prev.classes, cls],
    }));
  };

  const handleUpdateClass = (updated: StudentClass) => {
    updateDb(prev => ({
      ...prev,
      classes: prev.classes.map(c => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteClass = (id: string) => {
    updateDb(prev => ({
      ...prev,
      classes: prev.classes.filter(c => c.id !== id),
      assignments: prev.assignments.filter(a => a.classId !== id),
      schedules: prev.schedules.filter(s => s.classId !== id),
    }));
  };

  // ----------------------------------------------------
  // Teacher CRUD
  // ----------------------------------------------------
  const handleAddTeacher = (newTeacher: Omit<Teacher, 'id'>) => {
    const t: Teacher = {
      ...newTeacher,
      id: `teacher_${Date.now()}`,
    };
    updateDb(prev => ({
      ...prev,
      teachers: [...prev.teachers, t],
    }));
  };

  const handleUpdateTeacher = (updated: Teacher) => {
    updateDb(prev => ({
      ...prev,
      teachers: prev.teachers.map(t => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleDeleteTeacher = (id: string) => {
    updateDb(prev => ({
      ...prev,
      teachers: prev.teachers.filter(t => t.id !== id),
    }));
  };

  // ----------------------------------------------------
  // Subject CRUD
  // ----------------------------------------------------
  const handleAddSubject = (newSubject: Omit<Subject, 'id'>) => {
    const sub: Subject = {
      ...newSubject,
      id: `sub_${Date.now()}`,
    };
    updateDb(prev => ({
      ...prev,
      subjects: [...prev.subjects, sub],
    }));
  };

  const handleUpdateSubject = (updated: Subject) => {
    updateDb(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleDeleteSubject = (id: string) => {
    updateDb(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s.id !== id),
      assignments: prev.assignments.filter(a => a.subjectId !== id),
    }));
  };

  // ----------------------------------------------------
  // Assignment Actions
  // ----------------------------------------------------
  const handleSaveAssignment = (asg: TeachingAssignment) => {
    updateDb(prev => {
      const idx = prev.assignments.findIndex(a => a.classId === asg.classId && a.subjectId === asg.subjectId);
      let updated = [...prev.assignments];
      if (idx >= 0) {
        updated[idx] = asg;
      } else {
        updated.push(asg);
      }
      return { ...prev, assignments: updated };
    });
  };

  const handleDeleteAssignment = (id: string) => {
    updateDb(prev => ({
      ...prev,
      assignments: prev.assignments.filter(a => a.id !== id),
    }));
  };

  // ----------------------------------------------------
  // Quota Override & Week Actions
  // ----------------------------------------------------
  const handleUpdateQuotaOverride = (override: ClassSubjectQuota, note?: string) => {
    updateDb(prev => {
      const list = (prev.quotas || []).filter(
        q => !(q.classId === override.classId && q.subjectId === override.subjectId)
      );

      // Append log if note is provided
      let newProgresses = prev.classProgresses || [];
      if (note) {
        const cls = prev.classes.find(c => c.id === override.classId);
        const curriculumId = cls?.curriculumId || 'unknown';
        const existingIdx = newProgresses.findIndex(p => p.classId === override.classId);
        
        const newLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          subjectId: override.subjectId,
          oldValue: override.initialTheory + override.initialPractice + override.initialClinical,
          newValue: (override.usedTheory + (override.overrideRemainingTheory || 0)) + 
                    (override.usedPractice + (override.overrideRemainingPractice || 0)) + 
                    (override.usedClinical + (override.overrideRemainingClinical || 0)),
          note: note,
        };

        const curProg = existingIdx >= 0 ? { ...newProgresses[existingIdx] } : {
          classId: override.classId,
          curriculumId: curriculumId,
          completedTheory: {}, completedPractice: {}, completedClinical: {},
          plannedSemester: 1, remainingOverrides: {}, progressLogs: []
        };

        curProg.progressLogs = [...(curProg.progressLogs || []), newLog];
        
        newProgresses = [...newProgresses];
        if (existingIdx >= 0) newProgresses[existingIdx] = curProg;
        else newProgresses.push(curProg);
      }

      return {
        ...prev,
        quotas: [...list, override],
        classProgresses: newProgresses,
      };
    });
  };

  const handleUpdateWeeks = (weeks: WeekConfig[]) => {
    updateDb(prev => ({
      ...prev,
      weeks,
    }));
  };

  const handleUpdateSchedules = (schedules: SessionSchedule[]) => {
    updateDb(prev => ({
      ...prev,
      schedules,
    }));
  };

  const handleApplyAutoSchedule = (newSchedules: SessionSchedule[], targetWeek: number) => {
    updateDb(prev => ({
      ...prev,
      schedules: newSchedules,
    }));
    setSelectedWeek(targetWeek);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      
      {/* Top Main Navigation Header */}
      <Header
        schoolName={db.schoolName || 'Trường Cao đẳng Y tế Thanh Hóa'}
        academicYear={db.academicYear || 'Năm học 2026 - 2027'}
        activeTab={activeTab}
        activeView={activeTab}
        onChangeTab={setActiveTab}
        onNavigateView={setActiveTab}
        selectedWeek={selectedWeek}
        onChangeWeek={setSelectedWeek}
        onSelectWeek={setSelectedWeek}
        weeks={db.weeks}
        conflictCount={conflicts.filter(c => c.weekNumber === selectedWeek).length}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoCount={historyPast.length}
        redoCount={historyFuture.length}
        onOpenWeekManager={() => setIsWeekManagerOpen(true)}
        onOpenAutoSchedule={() => setIsAutoSchedulerOpen(true)}
        onOpenExcelExport={() => setIsExcelExportOpen(true)}
        onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
        onOpenDiffSync={() => setIsDiffSyncOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

      {/* Cohort Sheet Tabs (Available on Timetable & Management) */}
      {activeTab === 'timetable' && (
        <CohortTabs
          cohorts={db.cohorts}
          activeCohortId={activeCohortId}
          classes={db.classes}
          onSelectCohort={setActiveCohortId}
          onAddCohort={handleAddCohort}
          onUpdateCohort={handleUpdateCohort}
          onDeleteCohort={handleDeleteCohort}
          onReorderCohorts={handleReorderCohorts}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Real-time Conflict Alert Banner */}
        {!dismissConflicts && (
          <ConflictAlertBanner
            conflicts={conflicts}
            selectedWeek={selectedWeek}
            onDismiss={() => setDismissConflicts(true)}
          />
        )}

        {/* Tab 1: Interactive Timetable Grid */}
        {activeTab === 'timetable' && (
          <TimetableGrid
            db={db}
            onUpdateDb={updateDb}
            activeCohort={activeCohort}
            selectedWeek={selectedWeek}
            conflicts={conflicts}
            onOpenScheduleModal={({ classId, dayOfWeek, session, existingSchedule }) => {
              setScheduleModalParams({
                isOpen: true,
                classId,
                dayOfWeek,
                session,
                existingSchedule,
              });
            }}
            onDeleteSchedule={handleDeleteSchedule}
            onAddClass={handleAddClass}
            onOpenAutoSchedule={() => setIsAutoSchedulerOpen(true)}
          />
        )}

        {/* Tab 2: Progress Dashboard (Auto-deduction & Overrides) */}
        {activeTab === 'progress' && (
          <ProgressDashboard
            db={db}
            onUpdateQuotaOverride={handleUpdateQuotaOverride}
          />
        )}

        {/* Tab 3: Classes Management */}
        {activeTab === 'classes' && (
          <ClassManagement
            db={db}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
          />
        )}

        {/* Tab 4: Teachers Management */}
        {activeTab === 'teachers' && (
          <TeacherManagement
            db={db}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
          />
        )}

        {/* Tab 5: Subjects Management (LT/TH/LS Quotas & Pastel Palette) */}
        {activeTab === 'subjects' && (
          <SubjectManagement
            db={db}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
          />
        )}

        {/* Tab 6: Assignments Management (Multi-Teacher per LT/TH/LS) */}
        {activeTab === 'assignments' && (
          <AssignmentManagement
            db={db}
            onSaveAssignment={handleSaveAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
          />
        )}

        {/* Tab 7: Room & Department Practice Management */}
        {activeTab === 'rooms' && (
          <RoomManagement
            db={db}
            onUpdateDb={updateDb}
            selectedWeek={selectedWeek}
          />
        )}

        {/* Tab 8: Exam Management */}
        {activeTab === 'exams' && (
          <ExamManagement
            db={db}
            onUpdateDb={updateDb}
          />
        )}

        {activeTab === 'curriculums' && (
          <CurriculumManagement
            db={db}
            onUpdateDb={updateDb}
          />
        )}
      </main>

      {/* Footer info banner */}
      <footer className="bg-slate-900 text-slate-400 py-4 px-6 text-center text-xs border-t border-slate-800 space-y-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Hệ Thống Phân Tiết & Thời Khóa Biểu • <b>Trường Cao đẳng Y tế Thanh Hóa</b> ({db.academicYear})</span>
          <span>•</span>
          <span className="text-slate-300 font-semibold">
            Bản quyền: <a href="mailto:ngoclecyt@gmail.com" className="text-sky-400 hover:text-sky-300 underline font-bold">ngoclecyt@gmail.com</a>
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Quy chuẩn phân phối tiết: Lý thuyết (LT) • Thực hành (TH / 1/2 lớp) • Lâm sàng bệnh viện (LS) • Quản lý Giảng đường & Phòng TH • Tự động trừ lùi & Xuất Excel
        </div>
      </footer>

      {/* Floating Bottom-Right Copyright Corner Badge */}
      <div className="fixed bottom-3 right-3 z-30 pointer-events-auto select-none print:hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-lg backdrop-blur-xs text-[11px] hover:border-sky-500/50 transition">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Tác giả / Bản quyền: <b className="text-sky-300 font-bold">ngoclecyt@gmail.com</b></span>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Schedule Session Modal */}
      {scheduleModalParams.isOpen && (
        <ScheduleModal
          isOpen={scheduleModalParams.isOpen}
          onClose={() => setScheduleModalParams(prev => ({ ...prev, isOpen: false }))}
          db={db}
          classId={scheduleModalParams.classId}
          dayOfWeek={scheduleModalParams.dayOfWeek}
          session={scheduleModalParams.session}
          selectedWeek={selectedWeek}
          existingSchedule={scheduleModalParams.existingSchedule}
          onSaveSchedule={handleSaveSchedule}
        />
      )}

      {/* 2. Auto Scheduler Modal (Phân Lịch Tự Động) */}
      {isAutoSchedulerOpen && (
        <AutoSchedulerModal
          isOpen={isAutoSchedulerOpen}
          onClose={() => setIsAutoSchedulerOpen(false)}
          db={db}
          selectedWeek={selectedWeek}
          activeCohortId={activeCohortId}
          onApplySchedules={handleApplyAutoSchedule}
        />
      )}

      {/* 3. Excel Export Modal */}
      {isExcelExportOpen && (
        <ExcelExportModal
          isOpen={isExcelExportOpen}
          onClose={() => setIsExcelExportOpen(false)}
          db={db}
          selectedWeek={selectedWeek}
        />
      )}

      {/* 4. Week Manager & Clone Modal */}
      {isWeekManagerOpen && (
        <WeekManagerModal
          isOpen={isWeekManagerOpen}
          onClose={() => setIsWeekManagerOpen(false)}
          db={db}
          selectedWeek={selectedWeek}
          onUpdateWeeks={handleUpdateWeeks}
          onUpdateSchedules={handleUpdateSchedules}
          onSelectWeek={setSelectedWeek}
        />
      )}

      {/* 5. Template & Import Modal */}
      {isTemplateImportOpen && (
        <TemplateImportModal
          isOpen={isTemplateImportOpen}
          onClose={() => setIsTemplateImportOpen(false)}
          db={db}
          onRefreshDatabase={() => setDb(getInitialDatabase())}
        />
      )}

      {/* 6. Backup & Restore Modal */}
      {isBackupRestoreOpen && (
        <BackupRestoreModal
          isOpen={isBackupRestoreOpen}
          onClose={() => setIsBackupRestoreOpen(false)}
          db={db}
          onRestoreDatabase={(restored) => {
            setDb(restored);
            saveDatabase(restored);
          }}
        />
      )}

      {/* 7. User Guide & Help Modal */}
      {isUserGuideOpen && (
        <UserGuideModal
          isOpen={isUserGuideOpen}
          onClose={() => setIsUserGuideOpen(false)}
          onOpenAutoSchedule={() => setIsAutoSchedulerOpen(true)}
          onOpenWeekManager={() => setIsWeekManagerOpen(true)}
          onOpenTemplateImport={() => setIsTemplateImportOpen(true)}
          onOpenDiffSync={() => setIsDiffSyncOpen(true)}
        />
      )}

      {/* 8. Schedule Diffing & Sync Modal (Smart TKB Coordinator) */}
      {isDiffSyncOpen && (
        <ScheduleDiffSyncModal
          isOpen={isDiffSyncOpen}
          onClose={() => setIsDiffSyncOpen(false)}
          db={db}
          currentWeek={selectedWeek}
          onApplyMasterSchedule={handleApplyMasterSchedule}
        />
      )}

      {/* Undo / Redo Toast Notification */}
      {historyToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 animate-bounce">
          <span className="text-sm font-bold">{historyToast.message}</span>
          <button
            onClick={() => setHistoryToast(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
