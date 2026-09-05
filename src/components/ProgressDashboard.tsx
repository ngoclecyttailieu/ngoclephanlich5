import React, { useState } from 'react';
import { BarChart3, Edit3, Check, X, AlertCircle, Sparkles, Filter, Search, ChevronRight, BookOpen } from 'lucide-react';
import { AppDatabase, ClassSubjectQuota } from '../types';
import { calculateAllQuotas, CalculatedQuota } from '../services/schedulerService';

interface ProgressDashboardProps {
  db: AppDatabase;
  onUpdateQuotaOverride: (override: ClassSubjectQuota, note?: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  db,
  onUpdateQuotaOverride,
}) => {
  const quotas = calculateAllQuotas(db);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFinished, setFilterFinished] = useState<'all' | 'learning' | 'finished'>('all');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLT, setEditLT] = useState<number>(0);
  const [editTH, setEditTH] = useState<number>(0);
  const [editLS, setEditLS] = useState<number>(0);
  const [confirmTarget, setConfirmTarget] = useState<CalculatedQuota | null>(null);
  const [overrideNote, setOverrideNote] = useState('');
  const [showLogsTarget, setShowLogsTarget] = useState<CalculatedQuota | null>(null);

  const filteredQuotas = quotas.filter(q => {
    if (selectedCohort !== 'all' && q.cohortName !== selectedCohort) return false;
    if (searchTerm) {
      const match = `${q.className} ${q.subjectName} ${q.subjectCode}`.toLowerCase().includes(searchTerm.toLowerCase());
      if (!match) return false;
    }
    if (filterFinished === 'finished' && !q.isFullyFinished) return false;
    if (filterFinished === 'learning' && q.isFullyFinished) return false;
    return true;
  });

  const totalClasses = db.classes.length;
  const totalSubjects = db.subjects.length;
  const completedCount = quotas.filter(q => q.isFullyFinished).length;
  const inProgressCount = quotas.filter(q => q.totalUsed > 0 && !q.isFullyFinished).length;

  const handleStartEdit = (q: CalculatedQuota) => {
    setEditingKey(`${q.classId}_${q.subjectId}`);
    setEditLT(q.remainingTheory);
    setEditTH(q.remainingPractice);
    setEditLS(q.remainingClinical);
  };

  const handleStartSave = (q: CalculatedQuota) => {
    setConfirmTarget(q);
    setOverrideNote('');
  };

  const handleConfirmSave = () => {
    if (!confirmTarget) return;
    onUpdateQuotaOverride({
      classId: confirmTarget.classId,
      subjectId: confirmTarget.subjectId,
      initialTheory: confirmTarget.initialTheory,
      initialPractice: confirmTarget.initialPractice,
      initialClinical: confirmTarget.initialClinical,
      usedTheory: confirmTarget.usedTheory,
      usedPractice: confirmTarget.usedPractice,
      usedClinical: confirmTarget.usedClinical,
      overrideRemainingTheory: editLT,
      overrideRemainingPractice: editTH,
      overrideRemainingClinical: editLS,
    }, overrideNote);
    setEditingKey(null);
    setConfirmTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tổng Số Lớp & Môn Học
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {totalClasses} Lớp • {totalSubjects} Môn
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tổng cộng: {quotas.length} học phần đang quản lý
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Đang Trong Tiến Độ Giảng Dạy
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {inProgressCount} Học Phần
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đang phân bổ các buổi LT/TH/LS
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Đã Hết Môn / Hoàn Thành
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {completedCount} Học Phần
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            Đã hoàn thành 100% quỹ tiết
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
            Quyền Điều Chỉnh Admin
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            Toàn Quyền (Override)
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Bấm nút sửa để can thiệp số tiết còn lại
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Cohort Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Khối:</span>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các khối</option>
              {db.cohorts.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Trạng thái:</span>
            <select
              value={filterFinished}
              onChange={(e) => setFilterFinished(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="learning">Đang giảng dạy</option>
              <option value="finished">Đã hết môn (100%)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Lớp hoặc Môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Quotas Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                <th className="px-3 py-3 font-bold uppercase tracking-wider">Lớp Học</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider">Môn Học</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Lý Thuyết (LT)</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Thực Hành (TH)</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Lâm Sàng (LS)</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Tổng Tiết (Dạy / Quỹ)</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Tiến Độ Hoàn Thành</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Trạng Thái</th>
                <th className="px-3 py-3 font-bold uppercase tracking-wider text-center">Admin Can Thiệp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotas.map((q) => {
                const isEditing = editingKey === `${q.classId}_${q.subjectId}`;

                return (
                  <tr key={`${q.classId}_${q.subjectId}`} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-3 font-bold text-slate-900">
                      <div>{q.className}</div>
                      <span className="text-[10px] text-slate-500 font-normal">Khối {q.cohortName}</span>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: q.colorBg }}
                        />
                        <span className="font-semibold text-slate-800">{q.subjectName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{q.subjectCode}</span>
                    </td>

                    {/* LT */}
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[10px] text-slate-400">Còn:</span>
                          <input
                            type="number"
                            value={editLT}
                            onChange={(e) => setEditLT(Number(e.target.value))}
                            className="w-12 bg-white border border-blue-400 rounded px-1 py-0.5 text-center text-xs font-bold"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-700">
                            {q.usedTheory} / {q.initialTheory}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Còn: <b className={q.remainingTheory === 0 && q.initialTheory > 0 ? 'text-emerald-600' : 'text-slate-800'}>{q.remainingTheory}t</b>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* TH */}
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[10px] text-slate-400">Còn:</span>
                          <input
                            type="number"
                            value={editTH}
                            onChange={(e) => setEditTH(Number(e.target.value))}
                            className="w-12 bg-white border border-blue-400 rounded px-1 py-0.5 text-center text-xs font-bold"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-purple-900 text-xs">
                            {q.initialPractice > 0 ? (
                              <div className="space-y-0.5">
                                <div className="text-[11px]">
                                  Tổ 1: <b className={q.remainingPracticeGroup1 === 0 ? 'text-emerald-600' : 'text-purple-900'}>{q.usedPracticeGroup1}/{q.initialPractice}t</b>
                                </div>
                                <div className="text-[11px]">
                                  Tổ 2: <b className={q.remainingPracticeGroup2 === 0 ? 'text-emerald-600' : 'text-purple-900'}>{q.usedPracticeGroup2}/{q.initialPractice}t</b>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">0 / 0t</span>
                            )}
                          </div>
                          {q.initialPractice > 0 && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {q.isPracticeFinished ? (
                                <span className="text-emerald-600 font-bold">Đủ 2 tổ (100%)</span>
                              ) : (
                                <span>Thiếu: <b className="text-slate-800">T1({q.remainingPracticeGroup1}t), T2({q.remainingPracticeGroup2}t)</b></span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* LS */}
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[10px] text-slate-400">Còn:</span>
                          <input
                            type="number"
                            value={editLS}
                            onChange={(e) => setEditLS(Number(e.target.value))}
                            className="w-12 bg-white border border-blue-400 rounded px-1 py-0.5 text-center text-xs font-bold"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-700">
                            {q.usedClinical} / {q.initialClinical}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Còn: <b className={q.remainingClinical === 0 && q.initialClinical > 0 ? 'text-emerald-600' : 'text-slate-800'}>{q.remainingClinical}t</b>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-3 py-3 text-center font-bold text-slate-900">
                      {q.totalUsed} / {q.totalInitial} tiết
                      <div className="text-[10px] text-slate-500 font-normal">
                        (Còn lại: {q.totalRemaining} tiết)
                      </div>
                    </td>

                    {/* Progress Bar */}
                    <td className="px-4 py-3 min-w-[150px]">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-700">{q.percentageCompleted}%</span>
                        <span className="text-slate-400 text-[10px]">{q.totalUsed}/{q.totalInitial}t</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            q.isFullyFinished
                              ? 'bg-emerald-500'
                              : q.percentageCompleted > 60
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, q.percentageCompleted)}%` }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      {q.isFullyFinished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3" />
                          HẾT MÔN
                        </span>
                      ) : q.totalUsed > 0 ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Đang giảng dạy
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Chưa bắt đầu
                        </span>
                      )}
                      {q.hasOverride && (
                        <>
                          <div className="text-[9px] text-purple-600 font-medium mt-0.5">
                            (Đã can thiệp)
                          </div>
                          <button onClick={() => setShowLogsTarget(q)} className="text-[10px] text-indigo-600 hover:text-indigo-800 underline mt-1 block w-full">
                            Xem nhật ký
                          </button>
                        </>
                      )}
                    </td>

                    {/* Admin Override Action */}
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartSave(q)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                            title="Lưu điều chỉnh"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(q)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 text-[11px] font-medium transition"
                          title="Điều chỉnh số tiết còn lại thủ công khi có chỉ đạo từ Nhà trường"
                        >
                          <Edit3 className="w-3 h-3" />
                          Can thiệp
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận lưu thay đổi</h3>
              <p className="text-sm text-slate-600 mb-4">
                Bạn đang điều chỉnh quỹ tiết môn <strong>{confirmTarget.subjectName}</strong> của lớp <strong>{confirmTarget.className}</strong>.
              </p>
              
              <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Hiện tại (Còn)</div>
                  <div className="text-xl font-bold text-slate-700">
                    {confirmTarget.remainingTheory + confirmTarget.remainingPractice + confirmTarget.remainingClinical}t
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400" />
                <div className="text-center">
                  <div className="text-xs text-amber-600 font-semibold mb-1">Điều chỉnh (Còn)</div>
                  <div className="text-xl font-bold text-amber-600">
                    {editLT + editTH + editLS}t
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Lý do điều chỉnh (Bắt buộc)</label>
                <textarea 
                  value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                  placeholder="Nhập lý do..."
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmTarget(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Hủy</button>
              <button 
                onClick={handleConfirmSave}
                disabled={!overrideNote.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Xác nhận & Lưu nhật ký
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Nhật ký: {showLogsTarget.subjectName} ({showLogsTarget.className})
              </h3>
              <button onClick={() => setShowLogsTarget(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const classProg = db.classProgresses?.find(p => p.classId === showLogsTarget.classId);
                const logs = (classProg?.progressLogs || []).filter(l => l.subjectId === showLogsTarget.subjectId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                if (logs.length === 0) return <div className="text-center text-slate-500 py-8">Chưa có nhật ký chỉnh sửa nào.</div>;
                
                return (
                  <div className="space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm relative">
                        <div className="absolute top-4 right-4 text-xs font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </div>
                        <div className="flex items-center gap-3 mb-2 mt-1">
                          <span className="font-bold text-slate-700">{log.oldValue} tiết</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-amber-600">{log.newValue} tiết</span>
                        </div>
                        {log.note && (
                          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            "{log.note}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
