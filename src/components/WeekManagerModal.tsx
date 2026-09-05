import React, { useState } from 'react';
import { X, Calendar, Plus, Trash2, Copy, Sparkles, Check, Clock, Settings, RefreshCw } from 'lucide-react';
import { AppDatabase, WeekConfig } from '../types';
import { cloneWeekSchedule, autoGenerateWeekSchedule } from '../services/schedulerService';
import { generatePerpetualWeeks } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface WeekManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  selectedWeek: number;
  onUpdateWeeks: (weeks: WeekConfig[]) => void;
  onUpdateSchedules: (schedules: any[]) => void;
  onSelectWeek: (weekNum: number) => void;
}

export const WeekManagerModal: React.FC<WeekManagerModalProps> = ({
  isOpen,
  onClose,
  db,
  selectedWeek,
  onUpdateWeeks,
  onUpdateSchedules,
  onSelectWeek,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'weeks' | 'clone' | 'auto'>('weeks');
  const [weeksList, setWeeksList] = useState<WeekConfig[]>(db.weeks);
  const [deleteWeekTarget, setDeleteWeekTarget] = useState<number | null>(null);

  // Perpetual calendar sync states
  const [week1StartDate, setWeek1StartDate] = useState<string>(
    db.weeks[0]?.startDate || '2026-08-10'
  );
  const [totalWeeksCount, setTotalWeeksCount] = useState<number>(
    db.weeks.length > 0 ? db.weeks.length : 45
  );
  const [includeSunday, setIncludeSunday] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Clone states
  const [sourceWeek, setSourceWeek] = useState<number>(selectedWeek);
  const [targetWeeksText, setTargetWeeksText] = useState<string>('4, 5, 6, 7, 8');
  const [overrideExisting, setOverrideExisting] = useState<boolean>(true);

  // Auto-generate states
  const [autoTargetWeek, setAutoTargetWeek] = useState<number>(selectedWeek);
  const [autoCohortId, setAutoCohortId] = useState<string>('all');

  const handleUpdateWeekDate = (wNum: number, field: 'startDate' | 'endDate', val: string) => {
    setWeeksList(prev =>
      prev.map(w => (w.weekNumber === wNum ? { ...w, [field]: val } : w))
    );
  };

  const handleAddWeek = () => {
    const nextNum = weeksList.length > 0 ? Math.max(...weeksList.map(w => w.weekNumber)) + 1 : 1;
    const lastWeek = weeksList[weeksList.length - 1];

    let newStart = '2026-09-01';
    let newEnd = '2026-09-06';

    const daysSpan = includeSunday ? 6 : 5; // Mặc định Thứ 2 đến Thứ 7 (+5 ngày)

    if (lastWeek && lastWeek.startDate) {
      const d = new Date(lastWeek.startDate);
      d.setDate(d.getDate() + 7);
      newStart = d.toISOString().split('T')[0];
      const dEnd = new Date(d);
      dEnd.setDate(d.getDate() + daysSpan);
      newEnd = dEnd.toISOString().split('T')[0];
    }

    const newWeek: WeekConfig = {
      weekNumber: nextNum,
      startDate: newStart,
      endDate: newEnd,
      note: `Tuần ${nextNum} (${includeSunday ? 'T2 - CN' : 'T2 - T7'})`,
    };

    const updated = [...weeksList, newWeek];
    setWeeksList(updated);
    onUpdateWeeks(updated);
  };

  const handleDeleteWeek = (wNum: number) => {
    if (weeksList.length <= 1) return;
    setDeleteWeekTarget(wNum);
  };

  const handleSaveWeeks = () => {
    onUpdateWeeks(weeksList);
    setSyncSuccessMsg('Đã lưu cấu hình ngày/tuần thành công!');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  // Perpetual calendar auto-synchronization
  const handleAutoSyncPerpetualCalendar = () => {
    if (!week1StartDate) {
      alert('Vui lòng chọn ngày bắt đầu của Tuần 1!');
      return;
    }
    const count = Number(totalWeeksCount) || 45;
    const generated = generatePerpetualWeeks(week1StartDate, count, includeSunday);
    setWeeksList(generated);
    onUpdateWeeks(generated);
    setSyncSuccessMsg(
      `✅ Đã tự động tính toán và đồng bộ ${count} tuần học theo lịch vạn niên (${includeSunday ? 'Thứ 2 đến Chủ Nhật' : 'Mặc định: Thứ 2 đến Thứ 7'}) bắt đầu từ ${week1StartDate}!`
    );
    setTimeout(() => setSyncSuccessMsg(null), 6000);
  };

  const handleExecuteClone = () => {
    const targets = targetWeeksText
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0 && n !== sourceWeek);

    if (targets.length === 0) {
      alert('Vui lòng nhập danh sách tuần đích hợp lệ (ví dụ: 4, 5, 6, 7).');
      return;
    }

    const newSchedules = cloneWeekSchedule(db, sourceWeek, targets, overrideExisting);
    onUpdateSchedules(newSchedules);
    alert(`Đã nhân bản thành công lịch học từ Tuần ${sourceWeek} sang các tuần: ${targets.join(', ')}!`);
    onClose();
  };

  const handleExecuteAutoGenerate = () => {
    const cohort = autoCohortId === 'all' ? undefined : autoCohortId;
    const newSchedules = autoGenerateWeekSchedule(db, autoTargetWeek, cohort);
    onUpdateSchedules(newSchedules);
    onSelectWeek(autoTargetWeek);
    alert(`Đã tự động sinh lịch học thông minh cho Tuần ${autoTargetWeek} dựa trên quỹ tiết và phân công giảng dạy!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Calendar className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Quản Lý Tuần Học &amp; Tự Động Đồng Bộ Lịch Vạn Niên
              </h2>
              <p className="text-xs text-sky-200">
                Mặc định Thứ 2 - Thứ 7 • Tùy chọn Chủ Nhật riêng • Tự động tính toán ngày cả năm học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('weeks')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'weeks'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            1. Cấu Hình Ngày &amp; Tuần Lịch Vạn Niên ({weeksList.length} tuần)
          </button>

          <button
            onClick={() => setActiveTab('clone')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'clone'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Copy className="w-4 h-4 text-indigo-600" />
            2. Nhân Bản Tuần Mẫu Sang Cả Năm
          </button>

          <button
            onClick={() => setActiveTab('auto')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'auto'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            3. Tự Động Sinh Lịch Theo Quỹ Tiết
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: WEEKS LIST & PERPETUAL CALENDAR GENERATOR */}
          {activeTab === 'weeks' && (
            <div className="space-y-4">
              {/* Sync Notification Banner */}
              {syncSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {/* PERPETUAL CALENDAR AUTO-GENERATOR BOX */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200 rounded-2xl p-4.5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <div className="flex items-center gap-2 text-blue-950 font-black text-xs uppercase tracking-wide">
                    <RefreshCw className="w-4 h-4 text-blue-700" />
                    <span>Tự Động Tính &amp; Đồng Bộ Lịch Vạn Niên Cả Năm Học (Từ Tuần 1)</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    Chuẩn Lịch Dương Lịch
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {/* Start Date of Week 1 */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      1. Ngày bắt đầu Tuần 1 (Thứ Hai):
                    </label>
                    <input
                      type="date"
                      value={week1StartDate}
                      onChange={(e) => setWeek1StartDate(e.target.value)}
                      className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">
                      * Chỉ cần chọn ngày này, hệ thống sẽ tự nhảy các tuần tiếp theo.
                    </div>
                  </div>

                  {/* Total Weeks in Academic Year */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      2. Tổng số tuần trong năm học:
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={54}
                      value={totalWeeksCount}
                      onChange={(e) => setTotalWeeksCount(Number(e.target.value))}
                      className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">
                      * Thường là 45 tuần (hoặc 35 - 52 tuần).
                    </div>
                  </div>

                  {/* Week Range Framework: Mon-Sat (Default) or Mon-Sun */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      3. Khung ngày trong 1 tuần:
                    </label>
                    <div className="space-y-1.5 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="radio"
                          name="weekFramework"
                          checked={!includeSunday}
                          onChange={() => setIncludeSunday(false)}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Thứ 2 đến Thứ 7 <span className="text-[11px] text-blue-700 font-semibold">(Mặc định)</span></span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                        <input
                          type="radio"
                          name="weekFramework"
                          checked={includeSunday}
                          onChange={() => setIncludeSunday(true)}
                          className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-indigo-900">Bao gồm cả Chủ Nhật (T2 - CN)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200/50">
                  <p className="text-[11px] text-slate-600 font-medium">
                    Nhấn nút dưới để tự động tính chính xác từng ngày theo dương lịch vạn niên cho toàn bộ năm học:
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoSyncPerpetualCalendar}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    🔄 Tự Động Tính &amp; Khớp Lịch Vạn Niên ({totalWeeksCount} Tuần)
                  </button>
                </div>
              </div>

              {/* MANUAL ADJUSTMENTS TOOLBAR */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Bảng danh sách chi tiết các tuần học ({weeksList.length} tuần):
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Bạn có thể chỉnh sửa thủ công từng ngày hoặc thêm/bớt tuần theo thực tế trường:
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddWeek}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Thêm 1 Tuần
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWeeks}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Lưu Bảng Tuần
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                      <th className="px-3 py-2.5 font-bold uppercase text-center w-20">Tuần Số</th>
                      <th className="px-3 py-2.5 font-bold uppercase">Từ Ngày (Thứ 2)</th>
                      <th className="px-3 py-2.5 font-bold uppercase">
                        Đến Ngày {includeSunday ? '(Chủ Nhật)' : '(Thứ 7)'}
                      </th>
                      <th className="px-3 py-2.5 font-bold uppercase">Ghi Chú</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center w-20">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {weeksList.map((w) => (
                      <tr key={w.weekNumber} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center font-black text-blue-700">
                          Tuần {w.weekNumber}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={w.startDate}
                            onChange={(e) => handleUpdateWeekDate(w.weekNumber, 'startDate', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={w.endDate}
                            onChange={(e) => handleUpdateWeekDate(w.weekNumber, 'endDate', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={w.note || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWeeksList(prev =>
                                prev.map(item => (item.weekNumber === w.weekNumber ? { ...item, note: val } : item))
                              );
                            }}
                            placeholder="Ghi chú tuần..."
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleDeleteWeek(w.weekNumber)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Xóa tuần"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CLONE SCHEDULE */}
          {activeTab === 'clone' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-indigo-600" />
                  <span>Cơ Chế Nhân Bản Tuần Mẫu (Batch Clone Engine)</span>
                </h3>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Tính năng cho phép bạn lấy lịch học đã xếp chuẩn mực ở một "Tuần Mẫu" (ví dụ: Tuần 3) để sao chép hàng loạt sang các tuần tiếp theo trong năm học. Sau khi nhân bản, Admin vẫn nắm toàn quyền sửa hoặc xóa bất kỳ ô nào!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Chọn Tuần Nguồn (Mẫu):
                  </label>
                  <select
                    value={sourceWeek}
                    onChange={(e) => setSourceWeek(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {weeksList.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Các Tuần Đích Cần Nhân Bản (Cách nhau bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={targetWeeksText}
                    onChange={(e) => setTargetWeeksText(e.target.value)}
                    placeholder="Ví dụ: 4, 5, 6, 7, 8, 9, 10..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    * Sẽ nhân bản sang tất cả các tuần được liệt kê.
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={overrideExisting}
                  onChange={(e) => setOverrideExisting(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ghi đè nếu tuần đích đã có lịch học trước đó</span>
              </label>

              <div className="pt-2">
                <button
                  onClick={handleExecuteClone}
                  className="px-6 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  🚀 THỰC HIỆN NHÂN BẢN LỊCH HỌC
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO GENERATE */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Động Cơ Tự Động Sinh Lịch Thông Minh (AI Scheduler)</span>
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Hệ thống tự động duyệt qua danh sách các môn học còn dư quỹ tiết của từng lớp, ghép nối với giảng viên đã được phân công và tự động xếp vào các buổi học không bị trùng lịch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sinh Lịch Cho Tuần Số:
                  </label>
                  <select
                    value={autoTargetWeek}
                    onChange={(e) => setAutoTargetWeek(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {weeksList.map(w => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Tuần {w.weekNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Áp Dụng Cho Khối:
                  </label>
                  <select
                    value={autoCohortId}
                    onChange={(e) => setAutoCohortId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="all">Tất cả các khối</option>
                    {db.cohorts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExecuteAutoGenerate}
                  className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  ⚡ TỰ ĐỘNG SINH LỊCH CHO TUẦN {autoTargetWeek}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteWeekTarget !== null}
        title="Xác Nhận Xóa Cấu Hình Tuần"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Tuần"
        message={
          <div>
            <p>Bạn có chắc muốn xóa cấu hình <b className="text-rose-700">Tuần {deleteWeekTarget}</b>?</p>
          </div>
        }
        onConfirm={() => {
          if (deleteWeekTarget !== null) {
            const updated = weeksList.filter(w => w.weekNumber !== deleteWeekTarget);
            setWeeksList(updated);
            onUpdateWeeks(updated);
            setDeleteWeekTarget(null);
          }
        }}
        onClose={() => setDeleteWeekTarget(null)}
      />
    </div>
  );
};
