import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Filter, 
  FileText,
  CalendarDays,
  Clock,
  BookOpen,
  MapPin,
  Users,
  AlertTriangle
} from 'lucide-react';
import { AppDatabase, SessionSchedule, PeriodDetail } from '../types';
import { formatDayOfWeek, formatSessionName } from '../services/scheduleDiffService';

interface ExamManagementProps {
  db: AppDatabase;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
}

export const ExamManagement: React.FC<ExamManagementProps> = ({ db, onUpdateDb }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  
  // Extract all exams from schedules
  const allExams = useMemo(() => {
    const exams: Array<{
      scheduleId: string;
      classId: string;
      className: string;
      cohortId: string;
      subjectId: string;
      subjectName: string;
      weekNumber: number;
      dayOfWeek: number;
      session: string;
      period: PeriodDetail;
      periodIndex: number;
    }> = [];

    db.schedules.forEach(schedule => {
      const cls = db.classes.find(c => c.id === schedule.classId);
      if (!cls) return;

      schedule.periods.forEach((period, pIdx) => {
        if (period.isExam) {
          const sub = db.subjects.find(s => s.id === period.subjectId);
          exams.push({
            scheduleId: schedule.id,
            classId: cls.id,
            className: cls.name,
            cohortId: cls.cohortId,
            subjectId: period.subjectId,
            subjectName: sub ? sub.name : period.subjectId,
            weekNumber: schedule.weekNumber,
            dayOfWeek: schedule.dayOfWeek,
            session: schedule.session,
            period,
            periodIndex: pIdx
          });
        }
      });
    });

    return exams.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.className.localeCompare(b.className);
    });
  }, [db.schedules, db.classes, db.subjects]);

  const filteredExams = useMemo(() => {
    return allExams.filter(exam => {
      const matchCohort = selectedCohort === 'all' || exam.cohortId === selectedCohort;
      const matchSearch = exam.className.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          exam.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCohort && matchSearch;
    });
  }, [allExams, selectedCohort, searchTerm]);

  const handleDeleteExam = (scheduleId: string, periodIndex: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) {
      onUpdateDb(prev => {
        const scheduleIdx = prev.schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIdx === -1) return prev;

        const newSchedules = [...prev.schedules];
        const schedule = { ...newSchedules[scheduleIdx] };
        schedule.periods = schedule.periods.filter((_, idx) => idx !== periodIndex);

        if (schedule.periods.length === 0) {
          // Xóa luôn schedule nếu không còn period nào
          newSchedules.splice(scheduleIdx, 1);
        } else {
          newSchedules[scheduleIdx] = schedule;
        }

        return {
          ...prev,
          schedules: newSchedules
        };
      });
    }
  };

  // State cho Add/Edit Modal (Đơn giản hóa: ta sẽ hiển thị ScheduleModal nhưng cần mode Exam)
  // Nhưng để tùy biến sâu cho Lịch thi (chọn Lần thi), ta nên làm Modal riêng ở đây.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<{ scheduleId: string, periodIndex: number } | null>(null);

  // Form State
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formPeriodType, setFormPeriodType] = useState<'LT'|'TH'|'LS'>('LT');
  const [formExamAttempt, setFormExamAttempt] = useState<number>(1);
  const [formWeek, setFormWeek] = useState<number>(1);
  const [formDay, setFormDay] = useState<number>(2);
  const [formSession, setFormSession] = useState<'morning'|'afternoon'>('morning');
  const [formRoom, setFormRoom] = useState('');
  const [customRoomMode, setCustomRoomMode] = useState(false);

  // Filter out which rooms are currently occupied for the selected time slot
  const occupiedRooms = useMemo(() => {
    const occupied = new Set<string>();
    db.schedules.forEach(schedule => {
      if (schedule.weekNumber === formWeek && schedule.dayOfWeek === formDay && schedule.session === formSession) {
        schedule.periods.forEach((p, idx) => {
          // If we are editing THIS exact period, don't mark its room as occupied by itself
          if (editingExam && editingExam.scheduleId === schedule.id && editingExam.periodIndex === idx) {
            return;
          }
          if (p.roomOrHospital) {
            occupied.add(p.roomOrHospital.toLowerCase().trim());
          }
        });
      }
    });
    return occupied;
  }, [db.schedules, formWeek, formDay, formSession, editingExam]);

  const openAddModal = () => {
    setEditingExam(null);
    setFormClassId(db.classes[0]?.id || '');
    setFormSubjectId(db.subjects[0]?.id || '');
    setFormPeriodType('LT');
    setFormExamAttempt(1);
    setFormWeek(db.selectedWeek || 1);
    setFormDay(2);
    setFormSession('morning');
    setFormRoom('');
    setCustomRoomMode(false);
    setIsModalOpen(true);
  };

  const handleSaveExam = () => {
    if (!formClassId || !formSubjectId) {
      alert('Vui lòng chọn lớp và môn thi');
      return;
    }

    const selectedClassObj = db.classes.find(c => c.id === formClassId);
    const selectedRoomObj = !customRoomMode ? db.lectureHalls.find(r => r.name === formRoom) : null;
    
    if (selectedClassObj && selectedRoomObj && selectedClassObj.studentCount > selectedRoomObj.capacity) {
      if (!window.confirm(`Cảnh báo: Sĩ số lớp (${selectedClassObj.studentCount} SV) vượt quá sức chứa của phòng ${selectedRoomObj.name} (${selectedRoomObj.capacity} SV).\n\nBạn có chắc chắn muốn tiếp tục xếp lịch?`)) {
        return;
      }
    }

    onUpdateDb(prev => {
      const newSchedules = [...prev.schedules];
      
      const newPeriod: PeriodDetail = {
        subjectId: formSubjectId,
        periodType: formPeriodType,
        practiceType: 'full',
        periodsCount: 4, // Lịch thi mặc định chiếm cả buổi
        teacherIds: [], // Giám thị sẽ có thể bổ sung sau
        roomOrHospital: formRoom,
        isExam: true,
        examAttempt: formExamAttempt,
        lessonTitle: `Thi ${formPeriodType} lần ${formExamAttempt}`
      };

      if (editingExam) {
        // Edit mode (assuming week/day/session didn't change for simplicity, 
        // if they did we'd have to move the period to a different schedule)
        const sIdx = newSchedules.findIndex(s => s.id === editingExam.scheduleId);
        if (sIdx !== -1) {
          const sch = { ...newSchedules[sIdx] };
          
          // Nếu đổi ngày/giờ thì phức tạp hơn: xóa period cũ, thêm period mới.
          // Để đơn giản ở đây chỉ thay đổi thông tin trong period nếu ngày/giờ/lớp ko đổi.
          if (sch.classId === formClassId && sch.weekNumber === formWeek && sch.dayOfWeek === formDay && sch.session === formSession) {
            sch.periods[editingExam.periodIndex] = newPeriod;
            newSchedules[sIdx] = sch;
          } else {
            // Delete old period
            sch.periods.splice(editingExam.periodIndex, 1);
            if (sch.periods.length === 0) newSchedules.splice(sIdx, 1);
            else newSchedules[sIdx] = sch;

            // Find or create new schedule
            const targetIdx = newSchedules.findIndex(s => 
              s.classId === formClassId && s.weekNumber === formWeek && 
              s.dayOfWeek === formDay && s.session === formSession
            );
            if (targetIdx !== -1) {
              newSchedules[targetIdx] = {
                ...newSchedules[targetIdx],
                periods: [...newSchedules[targetIdx].periods, newPeriod]
              };
            } else {
              newSchedules.push({
                id: `sch_exam_${Date.now()}`,
                weekNumber: formWeek,
                academicYear: prev.academicYear,
                classId: formClassId,
                dayOfWeek: formDay,
                session: formSession,
                periods: [newPeriod]
              });
            }
          }
        }
      } else {
        // Add mode
        const targetIdx = newSchedules.findIndex(s => 
          s.classId === formClassId && s.weekNumber === formWeek && 
          s.dayOfWeek === formDay && s.session === formSession
        );

        if (targetIdx !== -1) {
          newSchedules[targetIdx] = {
            ...newSchedules[targetIdx],
            periods: [...newSchedules[targetIdx].periods, newPeriod]
          };
        } else {
          newSchedules.push({
            id: `sch_exam_${Date.now()}`,
            weekNumber: formWeek,
            academicYear: prev.academicYear,
            classId: formClassId,
            dayOfWeek: formDay,
            session: formSession,
            periods: [newPeriod]
          });
        }
      }

      return {
        ...prev,
        schedules: newSchedules
      };
    });

    setIsModalOpen(false);
  };

  const openEditModal = (exam: typeof allExams[0]) => {
    setEditingExam({ scheduleId: exam.scheduleId, periodIndex: exam.periodIndex });
    setFormClassId(exam.classId);
    setFormSubjectId(exam.subjectId);
    setFormPeriodType(exam.period.periodType);
    setFormExamAttempt(exam.period.examAttempt || 1);
    setFormWeek(exam.weekNumber);
    setFormDay(exam.dayOfWeek);
    setFormSession(exam.session as 'morning'|'afternoon');
    const existingRoom = exam.period.roomOrHospital || '';
    setFormRoom(existingRoom);
    setCustomRoomMode(existingRoom !== '' && !db.lectureHalls.some(r => r.name === existingRoom));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Quản lý Lịch Thi
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Lịch thi kết thúc môn học được đồng bộ trực tiếp vào Thời khóa biểu của từng lớp
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm Lịch Thi Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Tìm theo tên lớp, tên môn..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="flex-1 md:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedCohort}
            onChange={e => setSelectedCohort(e.target.value)}
          >
            <option value="all">Tất cả các khối</option>
            {db.cohorts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Thống kê lịch thi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Tổng số lịch thi</div>
          <div className="text-2xl font-bold text-slate-800">{filteredExams.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Lý thuyết</div>
          <div className="text-2xl font-bold text-blue-600">{filteredExams.filter(e => e.period.periodType === 'LT').length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Thực hành</div>
          <div className="text-2xl font-bold text-emerald-600">{filteredExams.filter(e => e.period.periodType === 'TH').length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500 mb-1">Lâm sàng</div>
          <div className="text-2xl font-bold text-amber-600">{filteredExams.filter(e => e.period.periodType === 'LS').length}</div>
        </div>
      </div>

      {/* List of Exams */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Tuần / Thời gian</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Môn Thi</th>
                <th className="px-4 py-3">Hình thức</th>
                <th className="px-4 py-3">Phòng/GĐ</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExams.length > 0 ? (
                filteredExams.map((exam, idx) => (
                  <tr key={`${exam.scheduleId}_${exam.periodIndex}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                        Tuần {exam.weekNumber}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDayOfWeek(exam.dayOfWeek)} - {formatSessionName(exam.session as any)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {exam.className}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{exam.subjectName}</div>
                      <div className="text-xs text-slate-500">Lần thi: <span className="font-semibold text-indigo-600">{exam.period.examAttempt || 1}</span></div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        exam.period.periodType === 'LT' ? 'bg-blue-100 text-blue-700' :
                        exam.period.periodType === 'TH' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {exam.period.periodType === 'LT' ? 'Lý thuyết' : exam.period.periodType === 'TH' ? 'Thực hành' : 'Lâm sàng'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {exam.period.roomOrHospital ? (
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5" />
                          {exam.period.roomOrHospital}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Chưa xếp phòng</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(exam)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.scheduleId, exam.periodIndex)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    Chưa có lịch thi nào được xếp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingExam ? 'Chỉnh sửa Lịch Thi' : 'Thêm Lịch Thi Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Lớp & Môn */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp Học</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formClassId}
                    onChange={e => setFormClassId(e.target.value)}
                  >
                    {db.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Môn Thi</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formSubjectId}
                    onChange={e => setFormSubjectId(e.target.value)}
                  >
                    {db.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Hình thức & Lần thi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hình thức thi</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formPeriodType}
                    onChange={e => setFormPeriodType(e.target.value as any)}
                  >
                    <option value="LT">Lý thuyết</option>
                    <option value="TH">Thực hành</option>
                    <option value="LS">Lâm sàng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lần thi</label>
                  <input 
                    type="number"
                    min={1}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formExamAttempt}
                    onChange={e => setFormExamAttempt(Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              {/* Thời gian */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tuần</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formWeek}
                    onChange={e => setFormWeek(Number(e.target.value))}
                  >
                    {db.weeks.map(w => <option key={w.weekNumber} value={w.weekNumber}>Tuần {w.weekNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formDay}
                    onChange={e => setFormDay(Number(e.target.value))}
                  >
                    {[2,3,4,5,6,7,8].map(d => <option key={d} value={d}>{formatDayOfWeek(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ca (Sáng/Chiều)</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formSession}
                    onChange={e => setFormSession(e.target.value as any)}
                  >
                    <option value="morning">Sáng</option>
                    <option value="afternoon">Chiều</option>
                  </select>
                </div>
              </div>

              {/* Địa điểm */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Địa điểm (Phòng/GĐ/BV)</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={customRoomMode}
                      onChange={e => {
                        setCustomRoomMode(e.target.checked);
                        if (e.target.checked && db.lectureHalls.some(r => r.name === formRoom)) {
                          setFormRoom('');
                        }
                      }}
                    />
                    Nhập địa điểm ngoài
                  </label>
                </div>
                
                {customRoomMode ? (
                  <input 
                    type="text"
                    placeholder="Nhập bệnh viện hoặc địa điểm khác..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                  />
                ) : (
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formRoom}
                    onChange={e => setFormRoom(e.target.value)}
                  >
                    <option value="">-- Chọn phòng / giảng đường --</option>
                    <optgroup label="Phòng Lý Thuyết">
                      {db.lectureHalls.filter(r => r.type === 'LT' || !r.type).map(room => {
                        const isOccupied = occupiedRooms.has(room.name.toLowerCase().trim());
                        return (
                          <option key={room.id} value={room.name} disabled={isOccupied}>
                            {room.name} {isOccupied ? '(Đã có lịch)' : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Phòng Thực Hành">
                      {db.departments.flatMap(dept => {
                        const count = dept.practiceRoomCount || 0;
                        const names = dept.practiceRoomNames && dept.practiceRoomNames.length > 0 
                          ? dept.practiceRoomNames 
                          : Array.from({ length: count }).map((_, i) => `Phòng TH ${i + 1} - ${dept.name}`);
                          
                        return names.slice(0, count).map((roomName, i) => {
                          const isOccupied = occupiedRooms.has(roomName.toLowerCase().trim());
                          return (
                            <option key={`${dept.id}_${i}`} value={roomName} disabled={isOccupied}>
                              {roomName} {isOccupied ? '(Đã có lịch)' : ''}
                            </option>
                          );
                        });
                      })}
                    </optgroup>
                  </select>
                )}
                
                {/* Cảnh báo quá tải */}
                {!customRoomMode && formRoom && db.classes.find(c => c.id === formClassId) && db.lectureHalls.find(r => r.name === formRoom) && (
                  db.classes.find(c => c.id === formClassId)!.studentCount > db.lectureHalls.find(r => r.name === formRoom)!.capacity
                ) && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Cảnh báo: Sĩ số lớp ({db.classes.find(c => c.id === formClassId)?.studentCount} SV) đang lớn hơn sức chứa của phòng ({db.lectureHalls.find(r => r.name === formRoom)?.capacity} SV).
                    </p>
                  </div>
                )}

                {!customRoomMode && occupiedRooms.size > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    * Các phòng đã có lịch (lớp khác học/thi) sẽ bị mờ đi.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveExam}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                {editingExam ? 'Lưu Thay Đổi' : 'Thêm Lịch Thi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
