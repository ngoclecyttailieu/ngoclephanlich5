import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Layers, 
  Check, 
  X, 
  Settings, 
  MoveUp, 
  MoveDown,
  AlertTriangle,
  FolderPlus
} from 'lucide-react';
import { CohortBlock, StudentClass } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface CohortTabsProps {
  cohorts: CohortBlock[];
  activeCohortId: string;
  classes?: StudentClass[];
  onSelectCohort: (cohortId: string) => void;
  onAddCohort: (name: string, description?: string) => void;
  onUpdateCohort: (id: string, name: string, description?: string) => void;
  onDeleteCohort: (id: string) => void;
  onReorderCohorts: (reordered: CohortBlock[]) => void;
}

export const CohortTabs: React.FC<CohortTabsProps> = ({
  cohorts,
  activeCohortId,
  classes = [],
  onSelectCohort,
  onAddCohort,
  onUpdateCohort,
  onDeleteCohort,
  onReorderCohorts,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteCohortTarget, setDeleteCohortTarget] = useState<CohortBlock | null>(null);

  // Full Cohort Management Modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalEditingCohort, setModalEditingCohort] = useState<CohortBlock | null>(null);
  const [modalCohortName, setModalCohortName] = useState('');
  const [modalCohortDesc, setModalCohortDesc] = useState('');
  const [modalIsAdding, setModalIsAdding] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleStartInlineEdit = (cohort: CohortBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditingId(cohort.id);
    setEditName(cohort.name);
  };

  const handleSaveInlineEdit = (cohortId: string) => {
    if (editName.trim()) {
      onUpdateCohort(cohortId, editName.trim());
    }
    setIsEditingId(null);
  };

  const handleSaveInlineNew = () => {
    if (newName.trim()) {
      onAddCohort(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...cohorts];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    const reordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
    onReorderCohorts(reordered);
    setDraggedIndex(null);
  };

  const moveCohort = (index: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cohorts.length) return;
    const updated = [...cohorts];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const reordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
    onReorderCohorts(reordered);
  };

  const handleSafeDeleteCohort = (cohort: CohortBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (cohorts.length <= 1) {
      alert('Hệ thống cần giữ lại ít nhất 1 Khối học!');
      return;
    }
    setDeleteCohortTarget(cohort);
  };

  // Manage Modal handlers
  const handleOpenAddInModal = () => {
    setModalEditingCohort(null);
    setModalCohortName('');
    setModalCohortDesc('');
    setModalIsAdding(true);
  };

  const handleOpenEditInModal = (cohort: CohortBlock) => {
    setModalEditingCohort(cohort);
    setModalCohortName(cohort.name);
    setModalCohortDesc(cohort.description || '');
    setModalIsAdding(false);
  };

  const handleSaveInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCohortName.trim()) return;

    if (modalEditingCohort) {
      onUpdateCohort(modalEditingCohort.id, modalCohortName.trim(), modalCohortDesc.trim());
      setModalEditingCohort(null);
    } else {
      onAddCohort(modalCohortName.trim(), modalCohortDesc.trim());
      setModalIsAdding(false);
    }
    setModalCohortName('');
    setModalCohortDesc('');
  };

  return (
    <>
      <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center gap-2 border-b border-slate-700 select-none shadow-inner">
        
        {/* Left Label & Management Button */}
        <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-slate-700 shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Khối / Sheet Tab:</span>
          </div>

          <button
            onClick={() => setIsManageModalOpen(true)}
            className="p-1 rounded bg-slate-700/80 hover:bg-blue-600 text-slate-300 hover:text-white transition cursor-pointer"
            title="Quản lý toàn bộ Khối / Sheet Tab (Thêm, Sửa, Xóa, Sắp xếp)"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        {/* Scroll Left */}
        <button
          onClick={() => scroll('left')}
          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition shrink-0"
          title="Cuộn sang trái"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Tabs list container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1"
        >
          {cohorts.map((cohort, index) => {
            const isActive = cohort.id === activeCohortId;
            const isEditing = isEditingId === cohort.id;
            const classCount = classes.filter(c => c.cohortId === cohort.id).length;

            if (isEditing) {
              return (
                <div
                  key={cohort.id}
                  className="flex items-center bg-slate-900 px-2 py-1 rounded-md border border-blue-500 gap-1 shrink-0 shadow-xs"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-24 bg-slate-800 text-white px-2 py-0.5 text-xs font-bold rounded border border-slate-600 outline-none focus:border-blue-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineEdit(cohort.id);
                      if (e.key === 'Escape') setIsEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveInlineEdit(cohort.id)}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                    title="Lưu tên mới"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingId(null)}
                    className="p-1 text-rose-400 hover:text-rose-300"
                    title="Hủy"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={cohort.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onClick={() => onSelectCohort(cohort.id)}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition shrink-0 border select-none ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-600'
                }`}
                title={`Khối: ${cohort.name} (${classCount} lớp) - Nhấp đúp để đổi tên nhanh`}
                onDoubleClick={(e) => handleStartInlineEdit(cohort, e)}
              >
                <span className="truncate max-w-[130px]">{cohort.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {classCount}
                </span>

                {/* Action Buttons on Hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 bg-black/30 rounded px-1 py-0.5">
                  {/* Move Left */}
                  {index > 0 && (
                    <button
                      onClick={(e) => moveCohort(index, 'left', e)}
                      className="p-0.5 hover:text-sky-300"
                      title="Chuyển sang trái"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}

                  {/* Move Right */}
                  {index < cohorts.length - 1 && (
                    <button
                      onClick={(e) => moveCohort(index, 'right', e)}
                      className="p-0.5 hover:text-sky-300"
                      title="Chuyển sang phải"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {/* Rename */}
                  <button
                    onClick={(e) => handleStartInlineEdit(cohort, e)}
                    className="p-0.5 hover:text-amber-300"
                    title="Đổi tên Khối"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  {cohorts.length > 1 && (
                    <button
                      onClick={(e) => handleSafeDeleteCohort(cohort, e)}
                      className="p-0.5 hover:text-rose-300"
                      title="Xóa Khối"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Cohort Input or Button */}
          {isAdding ? (
            <div className="flex items-center bg-slate-900 px-2 py-1 rounded-md border border-blue-500 gap-1 shrink-0">
              <input
                type="text"
                placeholder="Tên khối (e.g. CĐ4, TC2)..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-28 bg-slate-800 text-white px-2 py-0.5 text-xs rounded border border-slate-600 outline-none focus:border-blue-400 font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveInlineNew();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
              />
              <button
                onClick={handleSaveInlineNew}
                className="p-1 text-emerald-400 hover:text-emerald-300"
                title="Lưu khối mới"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-rose-400 hover:text-rose-300"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-semibold transition shrink-0 border border-dashed border-slate-500 hover:border-slate-300 cursor-pointer shadow-xs"
              title="Thêm Khối học mới (Sheet tab)"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Thêm Khối</span>
            </button>
          )}
        </div>

        {/* Scroll Right */}
        <button
          onClick={() => scroll('right')}
          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition shrink-0"
          title="Cuộn sang phải"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* FULL COHORT MANAGEMENT MODAL */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Quản Lý Danh Sách Khối / Sheet Tab
                  </h3>
                  <p className="text-xs text-slate-500">
                    Toàn quyền thêm mới, đổi tên, xóa và sắp xếp thứ tự hiển thị của các Khối học.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add / Edit Form in Modal */}
            {(modalIsAdding || modalEditingCohort) ? (
              <form onSubmit={handleSaveInModal} className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase">
                  {modalEditingCohort ? `Chỉnh sửa Khối: ${modalEditingCohort.name}` : 'Thêm Khối Mới'}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Khối (*):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: CĐ3, CĐ2, GĐ, TC..."
                      value={modalCohortName}
                      onChange={(e) => setModalCohortName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô tả / Ghi chú:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Khối Cao đẳng năm 3"
                      value={modalCohortDesc}
                      onChange={(e) => setModalCohortDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalIsAdding(false);
                      setModalEditingCohort(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs"
                  >
                    {modalEditingCohort ? 'Cập Nhật Khối' : 'Lưu Khối Mới'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleOpenAddInModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Khối Mới</span>
                </button>
              </div>
            )}

            {/* Cohorts Table List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Tên Khối (Sheet Tab)</th>
                    <th className="p-3">Số Lớp Trực Thuộc</th>
                    <th className="p-3">Mô Tả</th>
                    <th className="p-3 text-center w-24">Thứ Tự</th>
                    <th className="p-3 text-right w-24">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cohorts.map((cohort, idx) => {
                    const assignedClasses = classes.filter(c => c.cohortId === cohort.id);
                    return (
                      <tr key={cohort.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {cohort.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {assignedClasses.length} lớp
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 italic">
                          {cohort.description || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => moveCohort(idx, 'left')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-100"
                              title="Lên trên"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === cohorts.length - 1}
                              onClick={() => moveCohort(idx, 'right')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-100"
                              title="Xuống dưới"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditInModal(cohort)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                              title="Sửa Khối"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {cohorts.length > 1 && (
                              <button
                                onClick={() => handleSafeDeleteCohort(cohort)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Xóa Khối"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCohortTarget}
        title="Xác Nhận Xóa Khối Học"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Khối"
        message={
          deleteCohortTarget ? (
            <div>
              <p>Bạn có chắc chắn muốn xóa Khối <b className="text-rose-700">"{deleteCohortTarget.name}"</b>?</p>
              {classes.filter(c => c.cohortId === deleteCohortTarget.id).length > 0 && (
                <p className="mt-1 text-slate-500">
                  Khối này đang có {classes.filter(c => c.cohortId === deleteCohortTarget.id).length} lớp học.
                </p>
              )}
            </div>
          ) : ''
        }
        onConfirm={() => {
          if (deleteCohortTarget) {
            onDeleteCohort(deleteCohortTarget.id);
            setDeleteCohortTarget(null);
          }
        }}
        onClose={() => setDeleteCohortTarget(null)}
      />
    </>
  );
};
