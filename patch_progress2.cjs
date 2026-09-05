const fs = require('fs');
let code = fs.readFileSync('src/components/ProgressDashboard.tsx', 'utf8');

const modalJsx = `

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
`;

code = code.replace("    </div>\n  );\n};\n", modalJsx);

fs.writeFileSync('src/components/ProgressDashboard.tsx', code);
