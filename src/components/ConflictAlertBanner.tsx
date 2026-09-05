import React from 'react';
import { AlertTriangle, X, ChevronRight, User, MapPin, Layers } from 'lucide-react';
import { ScheduleConflict } from '../types';

interface ConflictAlertBannerProps {
  conflicts: ScheduleConflict[];
  selectedWeek: number;
  onDismiss: () => void;
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({
  conflicts,
  selectedWeek,
  onDismiss,
}) => {
  const currentWeekConflicts = conflicts.filter(c => c.weekNumber === selectedWeek);

  if (currentWeekConflicts.length === 0) return null;

  const dayLabels: { [key: number]: string } = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN'
  };

  return (
    <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-4 rounded-r-xl shadow-xs animate-in fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Cảnh Báo Xung Đột Lịch Tuần {selectedWeek} ({currentWeekConflicts.length} cảnh báo)
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Phát hiện trùng giảng viên hoặc trùng phòng giảng dạy giữa các lớp trong cùng một buổi:
            </p>

            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-2">
              {currentWeekConflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 border border-rose-200 rounded-lg p-2 text-xs text-rose-950 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[11px] shrink-0">
                      {dayLabels[c.dayOfWeek]} ({c.session === 'morning' ? 'Sáng' : 'Chiều'})
                    </span>
                    <span className="font-medium text-slate-800">{c.message}</span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-semibold uppercase shrink-0">
                    {c.type === 'TEACHER_CONFLICT' ? 'Trùng GV' : c.type === 'ROOM_CONFLICT' ? 'Trùng Phòng' : 'Vượt tiết'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-700 p-1 transition"
          title="Đóng cảnh báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
