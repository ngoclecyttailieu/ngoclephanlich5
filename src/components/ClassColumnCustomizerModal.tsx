import React, { useState } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Palette, 
  Plus, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Grid, 
  MoveHorizontal 
} from 'lucide-react';
import { AppDatabase, CohortBlock, StudentClass } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface ClassColumnCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
  activeCohort: CohortBlock;
  onUpdateDb: (updater: (prev: AppDatabase) => AppDatabase) => void;
  onOpenAddClass: () => void;
}

export const CLASS_PALETTE_COLORS = [
  { name: 'Xanh Slate (Mặc định)', bg: '#1E293B', text: '#FFFFFF', border: '#334155' },
  { name: 'Xanh Navy Đậm', bg: '#0F172A', text: '#FFFFFF', border: '#1E293B' },
  { name: 'Xanh Đại Dương', bg: '#1E3A8A', text: '#FFFFFF', border: '#1D4ED8' },
  { name: 'Xanh Biển Nhạt', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  { name: 'Xanh Ngọc Lục Bảo', bg: '#065F46', text: '#FFFFFF', border: '#047857' },
  { name: 'Xanh Ngọc Nhạt', bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  { name: 'Tím Hoàng Gia', bg: '#5B21B6', text: '#FFFFFF', border: '#6D28D9' },
  { name: 'Tím Pastel', bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
  { name: 'Hổ Phách / Cam Đậm', bg: '#9A3412', text: '#FFFFFF', border: '#C2410C' },
  { name: 'Vàng Cam Nhạt', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  { name: 'Hồng Đậm', bg: '#9D174D', text: '#FFFFFF', border: '#BE185D' },
  { name: 'Hồng Phấn Nhạt', bg: '#FCE7F3', text: '#9D174D', border: '#F9A8D4' },
  { name: 'Xám Hiện Đại', bg: '#334155', text: '#FFFFFF', border: '#475569' },
  { name: 'Xám Sáng', bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
];

export const ClassColumnCustomizerModal: React.FC<ClassColumnCustomizerModalProps> = ({
  isOpen,
  onClose,
  db,
  activeCohort,
  onUpdateDb,
  onOpenAddClass,
}) => {
  if (!isOpen) return null;

  const rawClasses = db.classes.filter(c => c.cohortId === activeCohort.id);
  const timetableStyles = db.timetableStyles || {};
  const customOrder = timetableStyles.classOrder?.[activeCohort.id] || [];
  const hiddenClassIds = new Set(timetableStyles.hiddenClassIds || []);

  // Sort classes by custom order
  const sortedClasses = [...rawClasses].sort((a, b) => {
    const idxA = customOrder.indexOf(a.id);
    const idxB = customOrder.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const [activeColorPickerClassId, setActiveColorPickerClassId] = useState<string | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<StudentClass | null>(null);

  // 1. Move Class Up/Down in order
  const handleMoveClass = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedClasses.length) return;

    const newClasses = [...sortedClasses];
    const temp = newClasses[index];
    newClasses[index] = newClasses[targetIndex];
    newClasses[targetIndex] = temp;

    const newOrderIds = newClasses.map(c => c.id);

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        classOrder: {
          ...(prev.timetableStyles?.classOrder || {}),
          [activeCohort.id]: newOrderIds,
        },
      },
    }));
  };

  // 2. Toggle Class Visibility (Bớt / Ẩn cột)
  const handleToggleHide = (classId: string) => {
    const isHidden = hiddenClassIds.has(classId);
    let nextHidden: string[];
    if (isHidden) {
      nextHidden = (timetableStyles.hiddenClassIds || []).filter(id => id !== classId);
    } else {
      nextHidden = [...(timetableStyles.hiddenClassIds || []), classId];
    }

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        hiddenClassIds: nextHidden,
      },
    }));
  };

  const handleShowAll = () => {
    const cohortClassIds = new Set(rawClasses.map(c => c.id));
    const nextHidden = (timetableStyles.hiddenClassIds || []).filter(id => !cohortClassIds.has(id));

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        hiddenClassIds: nextHidden,
      },
    }));
  };

  // 3. Change Class Color
  const handleSetClassColor = (classId: string, colorHex: string) => {
    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        classColors: {
          ...(prev.timetableStyles?.classColors || {}),
          [classId]: colorHex,
        },
      },
    }));
    setActiveColorPickerClassId(null);
  };

  const handleResetClassColor = (classId: string) => {
    onUpdateDb(prev => {
      const currentColors = { ...(prev.timetableStyles?.classColors || {}) };
      delete currentColors[classId];
      return {
        ...prev,
        timetableStyles: {
          ...(prev.timetableStyles || {}),
          classColors: currentColors,
        },
      };
    });
  };

  // 4. Auto-group combined classes adjacent to each other
  const handleAutoGroupCombinedClasses = () => {
    // Look for schedules in this cohort that have combinedClassIds
    const cohortClassIds = new Set(rawClasses.map(c => c.id));
    const combinedPairs: string[][] = [];

    db.schedules.forEach(s => {
      if (s.combinedClassIds && s.combinedClassIds.length > 1) {
        const inCohort = s.combinedClassIds.filter(id => cohortClassIds.has(id));
        if (inCohort.length > 1) {
          // check if already grouped
          const existingGroup = combinedPairs.find(group => 
            group.some(id => inCohort.includes(id))
          );
          if (existingGroup) {
            inCohort.forEach(id => {
              if (!existingGroup.includes(id)) existingGroup.push(id);
            });
          } else {
            combinedPairs.push([...inCohort]);
          }
        }
      }
    });

    if (combinedPairs.length === 0) {
      alert('Không tìm thấy lịch học ghép nào trong khối này để tự động nhóm. Bạn có thể sắp xếp thủ công bằng các nút mũi tên Lên/Xuống.');
      return;
    }

    // Build new order: place grouped classes together, then remaining classes
    const orderedIds: string[] = [];
    const addedIds = new Set<string>();

    combinedPairs.forEach(group => {
      group.forEach(id => {
        if (!addedIds.has(id)) {
          orderedIds.push(id);
          addedIds.add(id);
        }
      });
    });

    sortedClasses.forEach(c => {
      if (!addedIds.has(c.id)) {
        orderedIds.push(c.id);
        addedIds.add(c.id);
      }
    });

    onUpdateDb(prev => ({
      ...prev,
      timetableStyles: {
        ...(prev.timetableStyles || {}),
        classOrder: {
          ...(prev.timetableStyles?.classOrder || {}),
          [activeCohort.id]: orderedIds,
        },
      },
    }));
  };

  // 5. Delete class permanently
  const handleDeleteClass = (cls: StudentClass) => {
    setDeleteClassTarget(cls);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tùy Chỉnh Cột Lớp Học - Khối {activeCohort.name}
              </h3>
              <p className="text-xs text-slate-500">
                Thêm, bớt, ẩn/hiện, đổi màu và sắp xếp vị trí các cột lớp học trên thời khóa biểu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddClass}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Lớp Mới</span>
            </button>

            <button
              type="button"
              onClick={handleAutoGroupCombinedClasses}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition flex items-center gap-1.5"
              title="Tự động xếp các lớp hay học ghép cạnh nhau để bảng TKB tự động gộp ô"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>⚡ Xếp Lớp Ghép Liền Kề</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hiddenClassIds.size > 0 && (
              <button
                type="button"
                onClick={handleShowAll}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium transition flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Hiện tất cả ({rawClasses.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onUpdateDb(prev => ({
                  ...prev,
                  timetableStyles: {
                    ...(prev.timetableStyles || {}),
                    classOrder: {
                      ...(prev.timetableStyles?.classOrder || {}),
                      [activeCohort.id]: [],
                    },
                    classColors: {},
                  },
                }));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-medium transition flex items-center gap-1"
              title="Khôi phục thứ tự ban đầu và màu sắc mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Mặc định</span>
            </button>
          </div>
        </div>

        {/* Main List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {sortedClasses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">Chưa có lớp học nào trong khối {activeCohort.name}.</p>
              <button
                type="button"
                onClick={onOpenAddClass}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                + Thêm Lớp Ngay
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {sortedClasses.map((cls, idx) => {
                const isHidden = hiddenClassIds.has(cls.id);
                const customBg = timetableStyles.classColors?.[cls.id];
                const isFirst = idx === 0;
                const isLast = idx === sortedClasses.length - 1;

                return (
                  <div
                    key={cls.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition ${
                      isHidden ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Left: Position & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Position Index Badge */}
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* Color Preview Pill */}
                      <div
                        style={{ backgroundColor: customBg || '#1E293B' }}
                        className="w-4 h-8 rounded-md shrink-0 shadow-2xs border border-black/10"
                        title={customBg ? `Màu tùy chỉnh: ${customBg}` : 'Màu mặc định'}
                      />

                      {/* Class Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {cls.name}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-semibold">
                            {cls.code}
                          </span>
                          {isHidden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              Đang ẩn
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cls.faculty || 'Chưa phân khoa'} • {cls.studentCount || 0} sinh viên
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Reorder Buttons (Up / Down) */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveClass(idx, 'up')}
                          className={`p-1.5 rounded-md transition ${
                            isFirst
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-white hover:shadow-xs'
                          }`}
                          title="Di chuyển cột sang trái / lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveClass(idx, 'down')}
                          className={`p-1.5 rounded-md transition ${
                            isLast
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-white hover:shadow-xs'
                          }`}
                          title="Di chuyển cột sang phải / xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Color Picker Toggle */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveColorPickerClassId(
                              activeColorPickerClassId === cls.id ? null : cls.id
                            )
                          }
                          className={`p-1.5 rounded-lg border transition flex items-center gap-1 ${
                            activeColorPickerClassId === cls.id
                              ? 'bg-purple-100 border-purple-300 text-purple-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Chọn màu sắc cho cột lớp này"
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>

                        {/* Color Picker Popover */}
                        {activeColorPickerClassId === cls.id && (
                          <div className="absolute right-0 top-full mt-1.5 p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-30 w-56 animate-in fade-in zoom-in-95">
                            <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                              <span>Chọn màu cột Lớp:</span>
                              {customBg && (
                                <button
                                  type="button"
                                  onClick={() => handleResetClassColor(cls.id)}
                                  className="text-[10px] text-blue-600 hover:underline"
                                >
                                  Mặc định
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                              {CLASS_PALETTE_COLORS.map(c => {
                                const isSelected = customBg === c.bg;
                                return (
                                  <button
                                    type="button"
                                    key={c.bg}
                                    onClick={() => handleSetClassColor(cls.id, c.bg)}
                                    title={c.name}
                                    style={{ backgroundColor: c.bg, borderColor: c.border }}
                                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition ${
                                      isSelected ? 'ring-2 ring-purple-600 ring-offset-1 scale-110' : 'hover:scale-105'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hide / Show Toggle (Bớt / Ẩn cột) */}
                      <button
                        type="button"
                        onClick={() => handleToggleHide(cls.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          isHidden
                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={isHidden ? 'Hiển thị lại cột này trên TKB' : 'Ẩn bớt cột này khỏi TKB'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete Class */}
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(cls)}
                        className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
                        title="Xóa lớp học này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Guide Card */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-sky-900 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Mẹo xếp lịch học ghép tự động trộn ô:</div>
              <p className="text-sky-800 text-[11px] leading-relaxed">
                Khi các lớp cùng một môn học ghép (ví dụ <b>CĐĐD 26A</b> và <b>CĐĐD 26B</b>), hãy đặt 2 cột này nằm <b>liền kề nhau</b> (bằng nút Lên/Xuống hoặc bấm nút <b>⚡ Xếp Lớp Ghép Liền Kề</b>). Hệ thống sẽ tự động trộn 2 ô lại thành 1 ô rộng duy nhất trên bảng phân lịch!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
          >
            Đóng & Lưu Cấu Hình
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteClassTarget}
        title="Xác Nhận Xóa Lớp Học"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Vĩnh Viễn"
        message={
          deleteClassTarget ? (
            <div>
              <p>Bạn có chắc muốn xóa lớp <b className="text-rose-700">"{deleteClassTarget.name}"</b> khỏi hệ thống?</p>
              <p className="mt-1 text-slate-500">Tất cả lịch giảng dạy và phân công của lớp này cũng sẽ bị xóa bỏ.</p>
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteClassTarget) {
            onUpdateDb(prev => ({
              ...prev,
              classes: prev.classes.filter(c => c.id !== deleteClassTarget.id),
              schedules: prev.schedules.filter(s => s.classId !== deleteClassTarget.id),
              assignments: prev.assignments.filter(a => a.classId !== deleteClassTarget.id),
            }));
            setDeleteClassTarget(null);
          }
        }}
        onClose={() => setDeleteClassTarget(null)}
      />
    </div>
  );
};
