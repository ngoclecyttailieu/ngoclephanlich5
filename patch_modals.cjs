const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const handleConfirmOverride = `  const confirmOverrideRemaining = () => {
    if (!confirmOverrideTarget || !selectedClassId || !activeCurriculum) return;
    
    onUpdateDb(prev => {
      const progresses = prev.classProgresses || [];
      const existingIdx = progresses.findIndex(p => p.classId === selectedClassId);
      
      const newLog = {
        id: \`log-\${Date.now()}\`,
        timestamp: new Date().toISOString(),
        subjectId: confirmOverrideTarget.subjectId,
        oldValue: confirmOverrideTarget.oldValue,
        newValue: confirmOverrideTarget.newValue,
        note: confirmOverrideTarget.note
      };
      
      let curProg = existingIdx >= 0 ? { ...progresses[existingIdx] } : {
        classId: selectedClassId, curriculumId: activeCurriculum.id, completedTheory: {}, completedPractice: {}, completedClinical: {}, plannedSemester: 1, remainingOverrides: {}, progressLogs: []
      };
      
      curProg.remainingOverrides = { ...curProg.remainingOverrides, [confirmOverrideTarget.subjectId]: confirmOverrideTarget.newValue };
      curProg.progressLogs = [...(curProg.progressLogs || []), newLog];
      
      const newProgresses = [...progresses];
      if (existingIdx >= 0) newProgresses[existingIdx] = curProg;
      else newProgresses.push(curProg);
      
      return { ...prev, classProgresses: newProgresses };
    });
    
    setConfirmOverrideTarget(null);
    setEditingRemainingId(null);
  };
`;

code = code.replace("// Handlers for Curriculums", handleConfirmOverride + "\n  // Handlers for Curriculums");


const confirmModalsJSX = `
      {/* Override Confirm Modal */}
      {confirmOverrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận điều chỉnh tiến độ</h3>
              <p className="text-sm text-slate-600 mb-4">
                Bạn đang điều chỉnh số tiết còn lại của môn <strong>{confirmOverrideTarget.subjectName}</strong>:
              </p>
              <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Hiện tại</div>
                  <div className="text-xl font-bold text-slate-700">{confirmOverrideTarget.oldValue}</div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400" />
                <div className="text-center">
                  <div className="text-xs text-amber-600 font-semibold mb-1">Điều chỉnh</div>
                  <div className="text-xl font-bold text-amber-600">{confirmOverrideTarget.newValue}</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Lý do điều chỉnh (Bắt buộc)</label>
                <textarea 
                  value={confirmOverrideTarget.note}
                  onChange={e => setConfirmOverrideTarget({...confirmOverrideTarget, note: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                  placeholder="Nhập lý do..."
                />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmOverrideTarget(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Hủy</button>
              <button 
                onClick={confirmOverrideRemaining}
                disabled={!confirmOverrideTarget.note.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Xác nhận & Lưu nhật ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Logs Modal */}
      {showLogsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Nhật ký chỉnh sửa: {showLogsTarget.subjectName}
              </h3>
              <button onClick={() => setShowLogsTarget(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const classProg = db.classProgresses?.find(p => p.classId === selectedClassId);
                const logs = (classProg?.progressLogs || []).filter(l => l.subjectId === showLogsTarget.subjectId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                if (logs.length === 0) return <div className="text-center text-slate-500 py-8">Chưa có nhật ký chỉnh sửa nào.</div>;
                
                return (
                  <div className="space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm relative">
                        <div className="text-xs text-slate-500 mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-semibold">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">{log.oldValue} ➔ {log.newValue}</span>
                        </div>
                        <div className="text-sm text-slate-700">
                          <span className="font-bold text-slate-800">Lý do: </span> {log.note || 'Không có ghi chú'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
`;

code = code.replace("      <ConfirmModal\n        isOpen={!!deleteMajorTarget}", confirmModalsJSX + "\n      <ConfirmModal\n        isOpen={!!deleteMajorTarget}");

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
