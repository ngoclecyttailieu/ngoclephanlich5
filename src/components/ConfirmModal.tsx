import React from 'react';
import { AlertTriangle, Trash2, RefreshCw, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  icon?: 'trash' | 'alert' | 'refresh' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác Nhận Xóa',
  cancelText = 'Hủy Bỏ',
  confirmVariant = 'danger',
  icon = 'trash',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (icon) {
      case 'trash':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'warning':
      case 'alert':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'refresh':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <RefreshCw className="w-6 h-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmBtnClass = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 focus:ring-rose-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200 focus:ring-amber-500';
      case 'primary':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 focus:ring-blue-500';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              {getIcon()}
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
                <div className="mt-2 text-xs text-slate-600 leading-relaxed">{message}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${getConfirmBtnClass()}`}
          >
            {confirmVariant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
            {confirmVariant === 'refresh' && <RefreshCw className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
