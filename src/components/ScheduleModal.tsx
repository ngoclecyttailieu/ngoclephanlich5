import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Clock, MapPin, User, BookOpen, Sparkles, Building2, FlaskConical, Stethoscope } from 'lucide-react';
import { AppDatabase, PeriodDetail, PracticeClassType, PeriodType, SessionSchedule, Subject, Teacher } from '../types';
import { calculateAllQuotas, cleanLectureHallCode } from '../services/schedulerService';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  classId: string;
  dayOfWeek: number;
  session: 'morning' | 'afternoon';
  selectedWeek: number;
  existingSchedule?: SessionSchedule;
  onSaveSchedule: (schedule: SessionSchedule, combinedSchedules?: SessionSchedule[]) => void;
}

const COMMON_HOSPITALS = [
  'BVĐK Tỉnh Thanh Hóa',
  'BV Phụ sản Tỉnh Thanh Hóa',
  'BV Nhi Tỉnh Thanh Hóa',
  'BV Ung bướu Thanh Hóa',
  'BV Đa khoa Thành phố Thanh Hóa',
  'BV Y học Cổ truyền Thanh Hóa',
  'BV Phục hồi Chức năng Thanh Hóa',
  'BV Da liễu Thanh Hóa',
  'BV Phổi Thanh Hóa',
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  db,
  classId,
  dayOfWeek,
  session,
  selectedWeek,
  existingSchedule,
  onSaveSchedule,
}) => {
  if (!isOpen) return null;

  const currentClass = db.classes.find(c => c.id === classId);
  const quotas = calculateAllQuotas(db);

  // Filter quotas for this specific class
  const classQuotas = quotas.filter(q => q.classId === classId);

  // Find concurrent schedules in the same slot to detect occupied halls and practice usage
  const concurrentSchedules = db.schedules.filter(
    s => s.weekNumber === selectedWeek && s.dayOfWeek === dayOfWeek && s.session === session && s.classId !== classId
  );

  const occupiedHallsMap = new Map<string, string>(); // hallCode -> className
  concurrentSchedules.forEach(s => {
    const clsName = db.classes.find(c => c.id === s.classId)?.name || s.classId;
    s.periods.forEach(p => {
      if (p.periodType === 'LT') {
        const code = cleanLectureHallCode(p.roomOrHospital);
        if (code) occupiedHallsMap.set(code.toLowerCase(), clsName);
      }
    });
  });

  // Calculate department practice room usage in this slot
  const deptPracticeUsage = new Map<string, { count: number; classNames: string[] }>();
  concurrentSchedules.forEach(s => {
    const clsName = db.classes.find(c => c.id === s.classId)?.name || s.classId;
    s.periods.forEach(p => {
      if (p.periodType === 'TH') {
        const sub = db.subjects.find(item => item.id === p.subjectId);
        if (sub?.departmentId) {
          const entry = deptPracticeUsage.get(sub.departmentId) || { count: 0, classNames: [] };
          if (!entry.classNames.includes(clsName)) {
            entry.count += 1;
            entry.classNames.push(clsName);
          }
          deptPracticeUsage.set(sub.departmentId, entry);
        }
      }
    });
  });

  const [periods, setPeriods] = useState<PeriodDetail[]>(() => {
    if (existingSchedule && existingSchedule.periods.length > 0) {
      return JSON.parse(JSON.stringify(existingSchedule.periods));
    }
    // Default 1 period item with 4 periods
    const firstSubjectId = classQuotas.length > 0 ? classQuotas[0].subjectId : (db.subjects[0]?.id || '');
    const defaultHall = (db.lectureHalls && db.lectureHalls.length > 0) ? db.lectureHalls[0].code : '101';
    return [
      {
        subjectId: firstSubjectId,
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 4,
        teacherIds: [],
        roomOrHospital: defaultHall,
        lessonTitle: '',
      },
    ];
  });

  const [showAllTeachers, setShowAllTeachers] = useState<boolean>(false);

  // Combined classes state (Lớp ghép: 2 hoặc 3 lớp học chung)
  const [combinedClassIds, setCombinedClassIds] = useState<string[]>(() => {
    if (existingSchedule?.combinedClassIds && existingSchedule.combinedClassIds.length > 0) {
      return existingSchedule.combinedClassIds.filter(id => id !== classId);
    }
    return [];
  });

  // Calculate assigned teachers helper
  const getAssignedTeachers = (subjectId: string, pType: PeriodType): string[] => {
    const asg = db.assignments.find(a => a.classId === classId && a.subjectId === subjectId);
    if (!asg) return [];
    if (pType === 'LT') return asg.theoryTeacherIds || [];
    if (pType === 'TH') return asg.practiceTeacherIds || [];
    if (pType === 'LS') return asg.clinicalTeacherIds || [];
    return [];
  };

  // Ensure default teacher selected if none
  useEffect(() => {
    setPeriods(prev =>
      prev.map(p => {
        if (p.teacherIds.length === 0) {
          const assigned = getAssignedTeachers(p.subjectId, p.periodType);
          return {
            ...p,
            teacherIds: assigned.length > 0 ? assigned : (db.teachers[0] ? [db.teachers[0].id] : []),
          };
        }
        return p;
      })
    );
  }, []);

  const totalPeriodsCount = periods.reduce((sum, p) => sum + Number(p.periodsCount || 0), 0);

  const dayLabels: { [key: number]: string } = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
  };

  const handleAddSecondSubject = () => {
    if (periods.length >= 2) return;
    const remaining = Math.max(1, 4 - (periods[0]?.periodsCount || 2));
    
    const allowedSubjects = db.subjects.filter(sub => classQuotas.some(q => q.subjectId === sub.id));
    const nextSub = allowedSubjects.find(s => s.id !== periods[0]?.subjectId) || allowedSubjects[0] || db.subjects[0];

    
    // adjust first period to 2 if it was 4
    setPeriods(prev => [
      { ...prev[0], periodsCount: Math.min(prev[0].periodsCount, 2) },
      {
        subjectId: nextSub ? nextSub.id : '',
        periodType: 'LT',
        practiceType: 'full',
        periodsCount: 2,
        teacherIds: nextSub ? getAssignedTeachers(nextSub.id, 'LT') : [],
        roomOrHospital: prev[0].roomOrHospital || 'P.201 Giảng đường A',
        lessonTitle: '',
      },
    ]);
  };

  const handleRemovePeriod = (index: number) => {
    if (periods.length <= 1) return;
    setPeriods(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 1) {
        next[0].periodsCount = 4; // default to 4 if only 1 subject
      }
      return next;
    });
  };

  const handlePeriodChange = (index: number, field: keyof PeriodDetail, value: any) => {
    setPeriods(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // Auto update teachers if subject or periodType changed
      if (field === 'subjectId' || field === 'periodType') {
        const assigned = getAssignedTeachers(
          field === 'subjectId' ? value : current.subjectId,
          field === 'periodType' ? value : current.periodType
        );
        if (assigned.length > 0) {
          current.teacherIds = assigned;
        }

        // Suggest room if clinical
        if ((field === 'periodType' && value === 'LS') || (field === 'subjectId' && current.periodType === 'LS')) {
          current.roomOrHospital = 'BV Đa khoa Tỉnh Thanh Hóa';
        }
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleToggleTeacher = (pIndex: number, teacherId: string) => {
    setPeriods(prev => {
      const updated = [...prev];
      const current = { ...updated[pIndex] };
      const exists = current.teacherIds.includes(teacherId);
      if (exists) {
        current.teacherIds = current.teacherIds.filter(id => id !== teacherId);
      } else {
        current.teacherIds = [...current.teacherIds, teacherId];
      }
      updated[pIndex] = current;
      return updated;
    });
  };

  const handleSave = () => {
    const isCombined = combinedClassIds.length > 0;
    const allCombinedClassIds = isCombined ? [classId, ...combinedClassIds] : [classId];

    // Check if ALL classes have the scheduled subjects in their curriculum
    for (const classIdToCheck of allCombinedClassIds) {
      const cls = db.classes.find(c => c.id === classIdToCheck);
      if (cls && cls.curriculumId) {
        const curriculum = db.curriculums?.find(c => c.id === cls.curriculumId);
        if (curriculum) {
          for (const p of periods) {
            const hasSubject = curriculum.items.some(item => item.subjectId === p.subjectId);
            if (!hasSubject) {
              const sub = db.subjects.find(s => s.id === p.subjectId);
              alert(`Cảnh báo không được xếp tiếp:\nMôn học "${sub?.name}" KHÔNG CÓ trong Chương trình đào tạo của lớp ${cls.name}!\n\nVui lòng lựa chọn môn học khác phù hợp, hoặc bỏ chọn lớp ghép này.`);
              return;
            }
          }
        } else {
            alert(`Cảnh báo: Lớp ${cls.name} có mã CTĐT nhưng không tìm thấy CTĐT. Vui lòng kiểm tra lại!`);
            return;
        }
      } else {
          alert(`Cảnh báo không được xếp tiếp:\nLớp ${cls?.name} chưa được gán Chương trình đào tạo!\nVui lòng vào tab Chương trình Đào tạo để gán.`);
          return;
      }
    }

    const sharedGroupId = existingSchedule?.combinedGroupId || (isCombined ? `grp_${selectedWeek}_${dayOfWeek}_${session}_${Date.now()}` : undefined);
    const allCombinedClassIdsFinal = isCombined ? [classId, ...combinedClassIds] : undefined;

    const newSchedule: SessionSchedule = {
      id: existingSchedule?.id || `sch_${selectedWeek}_${classId}_${dayOfWeek}_${session}_${Math.random().toString(36).substring(2, 7)}`,
      weekNumber: selectedWeek,
      academicYear: db.academicYear,
      classId,
      dayOfWeek,
      session,
      periods,
      combinedGroupId: sharedGroupId,
      combinedClassIds: allCombinedClassIdsFinal,
      updatedAt: new Date().toISOString(),
    };

    const additionalSchedules: SessionSchedule[] = [];
    if (isCombined && allCombinedClassIdsFinal) {
      combinedClassIds.forEach(otherClassId => {
        const existingOther = db.schedules.find(
          s => s.weekNumber === selectedWeek && s.dayOfWeek === dayOfWeek && s.session === session && s.classId === otherClassId
        );
        additionalSchedules.push({
          id: existingOther?.id || `sch_${selectedWeek}_${otherClassId}_${dayOfWeek}_${session}_${Math.random().toString(36).substring(2, 7)}`,
          weekNumber: selectedWeek,
          academicYear: db.academicYear,
          classId: otherClassId,
          dayOfWeek,
          session,
          periods: JSON.parse(JSON.stringify(periods)),
          combinedGroupId: sharedGroupId,
          combinedClassIds: allCombinedClassIdsFinal,
          updatedAt: new Date().toISOString(),
        });
      });
    }

    onSaveSchedule(newSchedule, additionalSchedules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Phân Lịch Giảng Dạy Smart • Toàn Quyền Admin
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
              <span>Lớp: {currentClass?.name}</span>
              <span className="text-sky-300">•</span>
              <span>{dayLabels[dayOfWeek]} ({session === 'morning' ? 'Sáng' : 'Chiều'})</span>
              <span className="text-sky-300">•</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-700 text-sky-100 font-medium">
                Tuần {selectedWeek}
              </span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Quick Quotas Summary for this Class */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Quỹ tiết hiện tại của Lớp {currentClass?.name}:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {classQuotas.map(q => (
                <div
                  key={q.subjectId}
                  className={`p-2 rounded-lg border text-[11px] ${
                    q.isFullyFinished
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold truncate" title={q.subjectName}>
                    {q.subjectName}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    LT: <b className={q.remainingTheory === 0 ? 'text-emerald-700' : 'text-slate-800'}>{q.remainingTheory}t</b> | 
                    TH: <b className={q.remainingPractice === 0 ? 'text-emerald-700' : 'text-slate-800'}>{q.remainingPractice}t</b> | 
                    LS: <b className={q.remainingClinical === 0 ? 'text-emerald-700' : 'text-slate-800'}>{q.remainingClinical}t</b>
                  </div>
                  {q.isFullyFinished && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-200 text-emerald-900">
                      ĐÃ HẾT MÔN
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Sắp xếp theo LỚP GHÉP (2 hoặc 3 lớp học chung 1 môn, cùng giảng đường) */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-600 text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    Sắp Xếp Học Ghép Lớp (Lớp Ghép)
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Chọn 1, 2 hoặc 3 lớp cùng học chung một môn, cùng giảng đường và cùng buổi này.
                  </p>
                </div>
              </div>
              {combinedClassIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                  Đang ghép {combinedClassIds.length + 1} lớp
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
              {db.classes
                .filter(c => c.id !== classId)
                .map(c => {
                  const isChecked = combinedClassIds.includes(c.id);
                  const cohortName = db.cohorts.find(ch => ch.id === c.cohortId)?.name || '';

                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setCombinedClassIds(prev =>
                          isChecked ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-700 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-bold">{c.name}</div>
                        <div className={`text-[10px] truncate ${isChecked ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {cohortName ? `Khối ${cohortName}` : c.faculty}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                        isChecked ? 'bg-white text-indigo-600 border-white' : 'border-slate-300 bg-slate-50'
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {classQuotas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-amber-900">Lớp chưa được phân Chương trình đào tạo</h3>
              <p className="text-xs text-amber-800">
                Lớp này hiện chưa có môn học nào được phân trong Chương trình đào tạo. <br />
                Theo quy định, lớp chỉ được phân lịch học những môn có trong chương trình đào tạo. <br />
                Vui lòng vào tab <b>Chương trình Đào tạo</b> để gán môn học cho lớp (hoặc sửa Khóa/Ngành của lớp để tự động áp dụng CTĐT).
              </p>
            </div>
          ) : (
            <>
              {/* Periods Configuration List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Danh Sách Môn Học Trong Buổi ({periods.length} môn)</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      totalPeriodsCount > 4 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Tổng: {totalPeriodsCount} / 4 tiết tối đa
                    </span>
                  </h3>

                  {periods.length === 1 && (
                    <button
                      onClick={handleAddSecondSubject}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Xếp Thêm Môn Thứ 2 Trong Buổi
                    </button>
                  )}
                </div>

                {periods.map((p, idx) => {
                  const currentSub = db.subjects.find(s => s.id === p.subjectId);
                  const subQuota = classQuotas.find(q => q.subjectId === p.subjectId);

                  const assignedForThisType = getAssignedTeachers(p.subjectId, p.periodType);

                  return (
                    <div
                      key={idx}
                      className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 relative"
                    >
                      {periods.length > 1 && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-indigo-900 uppercase">
                            Môn học {idx + 1} ({p.periodsCount} tiết)
                          </span>
                          <button
                            onClick={() => handleRemovePeriod(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-medium flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa môn này
                          </button>
                        </div>
                      )}

                      {/* Subject & Type Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Select Subject */}
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            1. Chọn Môn Học:
                          </label>
                          <select
                            value={p.subjectId}
                            onChange={(e) => handlePeriodChange(idx, 'subjectId', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            {db.subjects
                              .filter(sub => classQuotas.some(q => q.subjectId === sub.id))
                              .map(sub => {
                              const q = classQuotas.find(item => item.subjectId === sub.id);
                              return (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} (Còn {q?.totalRemaining || 0} tiết)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Select Period Type: LT / TH / LS */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            2. Hình Thức Dạy:
                          </label>
                          <select
                            value={p.periodType}
                            onChange={(e) => handlePeriodChange(idx, 'periodType', e.target.value as PeriodType)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="LT">Lý thuyết (LT)</option>
                            <option value="TH">Thực hành (TH)</option>
                            <option value="LS">Lâm sàng (LS)</option>
                          </select>
                        </div>

                        {/* Select Number of Periods */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            3. Số Tiết (1 - 4):
                          </label>
                          <select
                            value={p.periodsCount}
                            onChange={(e) => handlePeriodChange(idx, 'periodsCount', Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value={1}>1 Tiết</option>
                            <option value={2}>2 Tiết</option>
                            <option value={3}>3 Tiết</option>
                            <option value={4}>4 Tiết</option>
                          </select>
                        </div>
                      </div>

                      {/* Practice Class Option if TH */}
                      {p.periodType === 'TH' && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-purple-900">
                              ⚙️ Quy cách phân tổ thực hành (Mỗi tổ học đủ {subQuota?.initialPractice || currentSub?.practicePeriods || 0} tiết):
                            </label>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-200 text-purple-900">
                              Đã học: Tổ 1 ({subQuota?.usedPracticeGroup1 || 0}t) • Tổ 2 ({subQuota?.usedPracticeGroup2 || 0}t)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-purple-950 bg-white/80 p-2 rounded-lg border border-purple-200 cursor-pointer hover:bg-white transition">
                              <input
                                type="radio"
                                name={`prac_${idx}`}
                                checked={p.practiceType === 'half'}
                                onChange={() => handlePeriodChange(idx, 'practiceType', 'half')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span>1/2 lớp (<b>TT {currentSub?.shortName || currentSub?.name} 1/2</b>)</span>
                            </label>

                            <label className="flex items-center gap-1.5 text-xs font-medium text-purple-950 bg-white/80 p-2 rounded-lg border border-purple-200 cursor-pointer hover:bg-white transition">
                              <input
                                type="radio"
                                name={`prac_${idx}`}
                                checked={p.practiceType === 'group1'}
                                onChange={() => handlePeriodChange(idx, 'practiceType', 'group1')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span>Tổ 1 (Còn <b>{subQuota?.remainingPracticeGroup1 || 0}t</b>)</span>
                            </label>

                            <label className="flex items-center gap-1.5 text-xs font-medium text-purple-950 bg-white/80 p-2 rounded-lg border border-purple-200 cursor-pointer hover:bg-white transition">
                              <input
                                type="radio"
                                name={`prac_${idx}`}
                                checked={p.practiceType === 'group2'}
                                onChange={() => handlePeriodChange(idx, 'practiceType', 'group2')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span>Tổ 2 (Còn <b>{subQuota?.remainingPracticeGroup2 || 0}t</b>)</span>
                            </label>

                            <label className="flex items-center gap-1.5 text-xs font-medium text-purple-950 bg-white/80 p-2 rounded-lg border border-purple-200 cursor-pointer hover:bg-white transition">
                              <input
                                type="radio"
                                name={`prac_${idx}`}
                                checked={p.practiceType === 'full'}
                                onChange={() => handlePeriodChange(idx, 'practiceType', 'full')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span>Cả lớp (<b>TT {currentSub?.shortName || currentSub?.name}</b>)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Clinical info note if LS */}
                      {p.periodType === 'LS' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>
                              Buổi Lâm sàng hiển thị tinh gọn trên TKB: <b>LS {currentSub?.shortName || currentSub?.name}</b>
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                            Còn lại: {subQuota?.remainingClinical || 0} tiết
                          </span>
                        </div>
                      )}

                      {/* Teachers Selection (Supports Multi-Teacher Assignment) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>Giảng Viên Phụ Trách (Chọn 1 hoặc nhiều):</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAllTeachers(!showAllTeachers)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            {showAllTeachers ? 'Chỉ hiện GV đã phân công' : 'Hiện tất cả GV trong trường'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                          {(showAllTeachers ? db.teachers : (assignedForThisType.length > 0 ? db.teachers.filter(t => assignedForThisType.includes(t.id)) : db.teachers)).map(t => {
                            const isSelected = p.teacherIds.includes(t.id);
                            const isAssigned = assignedForThisType.includes(t.id);

                            return (
                              <button
                                type="button"
                                key={t.id}
                                onClick={() => handleToggleTeacher(idx, t.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 border ${
                                  isSelected
                                    ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-sky-200" />}
                                <span>{t.name}</span>
                                {isAssigned && (
                                  <span className="text-[10px] opacity-75 font-normal">
                                    ({isAssigned ? 'Phân công' : ''})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Room / Location / Practice Department and Lesson Title */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Location Selection based on Period Type */}
                        <div>
                          {p.periodType === 'LT' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Giảng Đường Lý Thuyết:</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">Chỉ hiển thị số GĐ</span>
                              </label>
                              <select
                                value={cleanLectureHallCode(p.roomOrHospital) || p.roomOrHospital || ''}
                                onChange={(e) => handlePeriodChange(idx, 'roomOrHospital', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              >
                                <option value="">-- Chọn Giảng đường --</option>
                                {(db.lectureHalls || []).map(hall => {
                                  const isOccupiedBy = occupiedHallsMap.get(hall.code.toLowerCase());
                                  return (
                                    <option key={hall.id} value={hall.code}>
                                      Giảng đường {hall.code} ({hall.building} - {hall.capacity} chỗ) {isOccupiedBy ? `⚠️ [ĐANG DÙNG: ${isOccupiedBy}]` : '✅ [TRỐNG]'}
                                    </option>
                                  );
                                })}
                              </select>
                              {p.roomOrHospital && occupiedHallsMap.get(cleanLectureHallCode(p.roomOrHospital).toLowerCase()) && (
                                <div className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>Giảng đường {cleanLectureHallCode(p.roomOrHospital)} đang được xếp cho {occupiedHallsMap.get(cleanLectureHallCode(p.roomOrHospital).toLowerCase())}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {p.periodType === 'TH' && (
                            <div>
                              <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                                <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                                <span>Phòng Thực Hành Bộ Môn:</span>
                              </label>
                              {(() => {
                                const dept = (db.departments || []).find(d => d.id === currentSub?.departmentId);
                                const usage = dept ? deptPracticeUsage.get(dept.id) : undefined;
                                const usedCount = usage ? usage.count : 0;
                                const limit = dept ? dept.practiceRoomCount : 2;
                                const isOver = usedCount >= limit;

                                return (
                                  <div className={`p-2.5 rounded-lg border text-xs ${isOver ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{dept ? dept.name : 'Bộ môn chuyên ngành'}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOver ? 'bg-amber-200 text-amber-900' : 'bg-purple-200 text-purple-800'}`}>
                                        Đã dùng {usedCount}/{limit} phòng TH
                                      </span>
                                    </div>
                                    <div className="text-[11px] mt-1 text-slate-600">
                                      {isOver ? (
                                        <span className="text-amber-800 font-semibold">⚠️ Buổi này đã đạt/vượt giới hạn phòng thực hành của Bộ môn ({usage?.classNames.join(', ')})</span>
                                      ) : (
                                        <span>✅ Còn {limit - usedCount} phòng thực hành trống trong buổi này. TKB tự động ghi "TT {currentSub?.name} {p.practiceType === 'half' ? '1/2' : ''}"</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {p.periodType === 'LS' && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bệnh Viện / Cơ Sở Thực Tập:</span>
                              </label>
                              <input
                                type="text"
                                list={`hospitals_list_${idx}`}
                                value={p.roomOrHospital || ''}
                                onChange={(e) => handlePeriodChange(idx, 'roomOrHospital', e.target.value)}
                                placeholder="Chọn hoặc nhập tên bệnh viện"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                              <datalist id={`hospitals_list_${idx}`}>
                                {COMMON_HOSPITALS.map(h => (
                                  <option key={h} value={h} />
                                ))}
                              </datalist>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            <span>Tên Bài Học / Chuyên Đề (Tùy chọn):</span>
                          </label>
                          <input
                            type="text"
                            value={p.lessonTitle || ''}
                            onChange={(e) => handlePeriodChange(idx, 'lessonTitle', e.target.value)}
                            placeholder="Ví dụ: Đại cương Dược lý học lâm sàng"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Overload Error Banner if > 4 periods */}
              {totalPeriodsCount > 4 && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <b>Cảnh báo vượt số tiết:</b> Tổng số tiết trong một buổi là <b>{totalPeriodsCount} tiết</b> (Quy định tối đa 4 tiết/buổi). Bạn vẫn có thể lưu nếu là trường hợp đặc biệt do Nhà trường chỉ đạo.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            * Sau khi lưu, hệ thống tự động trừ lùi quỹ tiết của môn học tương ứng.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              Hủy Bỏ
            </button>

            <button
              onClick={handleSave}
              disabled={classQuotas.length === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 ${
                classQuotas.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800 text-white hover:shadow-lg cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Lưu Lịch Học Buổi Này
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
