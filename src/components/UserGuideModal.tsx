import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Sparkles, 
  Calendar, 
  Upload, 
  FileSpreadsheet, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeftRight, 
  Layers, 
  Download, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAutoSchedule?: () => void;
  onOpenWeekManager?: () => void;
  onOpenTemplateImport?: () => void;
  onOpenDiffSync?: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAutoSchedule,
  onOpenWeekManager,
  onOpenTemplateImport,
  onOpenDiffSync,
}) => {
  if (!isOpen) return null;

  const [activeSection, setActiveSection] = useState<'auto_schedule' | 'week_manager' | 'file_sync' | 'shortcuts'>('auto_schedule');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/20 shadow-inner">
              <BookOpen className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Hướng Dẫn Sử Dụng &amp; Vận Hành Hệ Thống Thời Khóa Biểu
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Cẩm nang chi tiết các nút chức năng, phân lịch thông minh và quản lý lịch vạn niên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Đóng hướng dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('auto_schedule')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'auto_schedule'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Phân Lịch Tự Động &amp; Ấn Định</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('week_manager')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'week_manager'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. Tuần Học &amp; Lịch Vạn Niên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('file_sync')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'file_sync'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>3. Đối Chiếu File &amp; Cập Nhật TKB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('shortcuts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'shortcuts'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. Phím Tắt &amp; An Toàn Dữ Liệu</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          
          {/* SECTION 1: AUTO SCHEDULER */}
          {activeSection === 'auto_schedule' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-base text-blue-950 flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-blue-700" />
                  <span>Cách Sử Dụng Chức Năng Phân Lịch Tự Động</span>
                </h3>
                <p className="text-xs text-blue-800">
                  Nút <b>"Phân Lịch Tự Động"</b> màu xanh lam trên thanh công cụ cho phép bạn xếp lịch hàng loạt cho toàn khối hoặc từng lớp học theo 2 phương án thông minh.
                </p>
              </div>

              {/* Step by step guide */}
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>Lựa chọn Phương Án Phân Lịch:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5 pl-2">
                    <li><b>Phương án 1 (Phân lịch 1 môn học)</b>: Thích hợp khi xếp riêng từng môn Lý thuyết (3-4 tiết/buổi) hoặc môn Thực hành/Lâm sàng.</li>
                    <li><b>Phương án 2 (Phân cặp môn so le)</b>: Tự động ghép 2 môn vào 1 buổi (Ví dụ: 2 tiết Môn A + 2 tiết Môn B), đảo chéo ca học giữa 2 lớp/nhóm lớp.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                    <span>Tùy chỉnh "Số buổi muốn phân bổ cho mỗi lớp":</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Bạn có thể chọn số buổi mặc định (<b>1 buổi, 2 buổi, 3 buổi, 4 buổi/tuần</b>) hoặc gõ số buổi tùy ý. Hệ thống sẽ tự động sinh đúng số buổi tương ứng cho mỗi lớp trong tuần được chọn.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-amber-50/50 border-amber-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">3</span>
                    <span>Ấn định Ngày, Buổi &amp; Giảng đường cho từng lớp riêng (Linh động):</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Bấm vào nút <b>"Mở Bảng Ấn Định Chi Tiết Từng Lớp"</b> để:
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-2">
                    <li><b>Khóa cứng ngày học</b>: Ví dụ ấn định Lớp 28A chỉ học vào Thứ 2 và Thứ 4.</li>
                    <li><b>Khóa buổi học</b>: Chỉ định học Sáng hoặc chỉ Chiều cho lớp đơn/lớp ghép.</li>
                    <li><b>Số buổi riêng</b>: Thiết lập Lớp A học 2 buổi, Lớp B học 1 buổi linh hoạt.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/60 border-emerald-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">4</span>
                    <span>Cơ chế Tự Động Dàn Đều Lịch (Day Balancing):</span>
                  </div>
                  <p className="text-xs text-emerald-900">
                    Hệ thống tự động tính toán mật độ tải giữa các ngày Thứ 2 đến Thứ 7/CN. Lịch sẽ được dàn đều, <b>tuyệt đối không bị dồn cục nhiều buổi vào 1 ngày và không để ngày trống lịch</b>.
                  </p>
                </div>
              </div>

              {onOpenAutoSchedule && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAutoSchedule();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-sky-300" />
                    <span>Mở Bảng Phân Lịch Tự Động Ngay</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: WEEK MANAGER & PERPETUAL CALENDAR */}
          {activeSection === 'week_manager' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200 rounded-xl p-4">
                <h3 className="font-bold text-base text-indigo-950 flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-indigo-700" />
                  <span>Quản Lý Tuần Học &amp; Tự Động Đồng Bộ Lịch Vạn Niên</span>
                </h3>
                <p className="text-xs text-indigo-800">
                  Nút <b>"Cấu hình Tuần (icon bánh răng)"</b> bên cạnh bộ chọn tuần giúp bạn quản lý ngày tháng chuẩn xác cho cả năm học.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Mặc Định Thứ 2 Đến Thứ 7
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Theo chuẩn quy chế đào tạo, mỗi tuần học mặc định bắt đầu từ <b>Thứ 2</b> và kết thúc vào <b>Thứ 7</b> (khoảng thời gian 6 ngày làm việc).
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Tùy Chọn Mở Rộng Đến Chủ Nhật
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nếu trường có lớp học thêm hoặc thi vào Chủ Nhật, bạn chỉ cần tích vào ô <b>"Bao gồm cả Chủ Nhật (Thứ 2 - CN)"</b> trong bảng cấu hình tuần.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-700" />
                  <span>Tự Động Tính &amp; Trộn Lịch Vạn Niên Cả Năm (1 Click):</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn chỉ cần chọn <b>Ngày bắt đầu của Tuần 1</b> (ví dụ: 10/08/2026), bấm nút <b>"Tự Động Tính &amp; Đồng Bộ Lịch Vạn Niên Cả Năm"</b>. Hệ thống sẽ tự động tính chính xác từng ngày tháng cho toàn bộ 45 tuần học của năm, không cần nhập thủ công từng tuần!
                </p>
              </div>

              {onOpenWeekManager && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWeekManager();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-sky-300" />
                    <span>Mở Bảng Quản Lý Tuần Ngay</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: FILE DIFF & SYNC */}
          {activeSection === 'file_sync' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-bold text-base text-emerald-950 flex items-center gap-2 mb-1">
                  <Upload className="w-5 h-5 text-emerald-700" />
                  <span>Đối Chiếu &amp; Cập Nhật Tệp Thời Khóa Biểu (File Diffing &amp; Sync)</span>
                </h3>
                <p className="text-xs text-emerald-800">
                  Quy trình tiếp nhận và xử lý tệp lịch trình người dùng đã chỉnh sửa thủ công (Excel, CSV, văn bản).
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Phân tích &amp; Đối chiếu (Diffing):</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Hệ thống tự động so sánh dữ liệu mới tải lên với bản TKB hiện hành, đánh dấu rõ: <b className="text-emerald-700">Thêm mới (Added)</b>, <b className="text-amber-700">Sửa đổi (Modified)</b> hoặc <b className="text-rose-700">Đã xóa (Removed)</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Kiểm tra Xung đột Toàn vẹn (Conflict Check):</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Tự động kiểm tra trùng giờ giảng viên, trùng phòng giảng đường hoặc trùng ca học của lớp đơn/lớp ghép và đưa ra cảnh báo kèm gợi ý khắc phục.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Cập nhật Trạng thái (Master Schedule):</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Khi xác nhận, hệ thống lưu bản mới thành Master Schedule chuẩn và cập nhật trực tiếp vào Thời Khóa Biểu của toàn trường.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap justify-end gap-2">
                {onOpenTemplateImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTemplateImport();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer border border-slate-200"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Mẫu Nhập Excel</span>
                  </button>
                )}

                {onOpenDiffSync && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDiffSync();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Mở Bảng Đối Chiếu &amp; Cập Nhật TKB (Diff &amp; Sync)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: SHORTCUTS & DATA SAFETY */}
          {activeSection === 'shortcuts' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-700" />
                  <span>Phím Tắt Hoàn Tác (Undo / Redo) &amp; An Toàn Dữ Liệu</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mọi thao tác chỉnh sửa thời khóa biểu đều được ghi lại lịch sử. Bạn có thể nhanh chóng quay lại hoặc làm lại bất cứ lúc nào:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1">Hoàn tác (Undo):</div>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-indigo-700">
                      Ctrl + Z
                    </kbd>
                    <span className="text-slate-500 ml-2">hoặc nút "Quay lại" trên Header</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1">Làm lại (Redo):</div>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-indigo-700">
                      Ctrl + Y
                    </kbd>
                    <span className="text-slate-500 ml-2">hoặc Ctrl + Shift + Z</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
                <h4 className="font-bold text-xs text-blue-950 uppercase flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-700" />
                  Sao Lưu &amp; Phục Hồi Dữ Liệu
                </h4>
                <p className="text-xs text-blue-900">
                  Nút <b>"Sao lưu &amp; Phục hồi"</b> trên góc trên cùng bên phải cho phép bạn tải về bản sao lưu toàn bộ dữ liệu TKB (file JSON an toàn) và phục hồi bất cứ khi nào cần.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Hệ thống Quản lý Thời khóa biểu - Trường Cao đẳng Y tế Thanh Hóa
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
          >
            Đã Hiểu &amp; Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
