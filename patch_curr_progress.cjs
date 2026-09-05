const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// Add filter state
if (!code.includes("const [progressFilter, setProgressFilter] = useState<'all'")) {
    code = code.replace(
      "const [selectedClassId, setSelectedClassId] = useState<string>('');",
      "const [selectedClassId, setSelectedClassId] = useState<string>('');\n  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');"
    );
}

// Replace the table headers and logic
const oldTableStart = `<div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[800px]">`;
const oldTableEnd = `{activeCurriculum.items.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-slate-500">Chương trình này chưa có môn học nào.</td></tr>}
                            </tbody>
                          </table>
                        </div>`;

const tableRegex = /<div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">[\s\S]*?<\/table>\s*<\/div>/;

const newTable = `<div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-800">Tiến độ các môn học</h4>
                          <select 
                            value={progressFilter} 
                            onChange={e => setProgressFilter(e.target.value as any)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none"
                          >
                            <option value="all">Tất cả môn học</option>
                            <option value="completed">Đã hoàn thành</option>
                            <option value="in_progress">Đang học</option>
                            <option value="not_started">Chưa học</option>
                          </select>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-3 border-b border-slate-200 font-bold sticky left-0 bg-slate-50 z-10 w-48 shadow-[1px_0_0_0_#e2e8f0]" rowSpan={2}>Môn học</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-blue-50/50 border-l" colSpan={4}>Kế hoạch (CTĐT)</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-emerald-50/50 border-l" colSpan={4}>Đã xếp (Thực tế)</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-amber-50/50 border-l" rowSpan={2}>Còn lại</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-purple-50/50 border-l w-32" rowSpan={2}>Tiến độ</th>
                                <th className="p-2 border-b border-slate-200 font-bold text-center bg-slate-50 border-l" rowSpan={2}>Trạng thái</th>
                              </tr>
                              <tr className="bg-slate-100 text-[10px] text-slate-500 font-semibold text-center uppercase tracking-wider">
                                <th className="p-1 border-b border-l border-slate-200 bg-blue-50">LT</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50">TH</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50">LS</th>
                                <th className="p-1 border-b border-slate-200 bg-blue-50 font-bold text-blue-700">Tổng</th>
                                <th className="p-1 border-b border-l border-slate-200 bg-emerald-50">LT</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50">TH</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50">LS</th>
                                <th className="p-1 border-b border-slate-200 bg-emerald-50 font-bold text-emerald-700">Tổng</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {activeCurriculum.items.map(item => {
                                const sub = subjects.find(s => s.id === item.subjectId);
                                const actualLT = calculateActualProgress(item.subjectId, 'LT');
                                const actualTH = calculateActualProgress(item.subjectId, 'TH');
                                const actualLS = calculateActualProgress(item.subjectId, 'LS');
                                
                                const totalPlan = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
                                const totalActual = actualLT + actualTH + actualLS;
                                const remaining = Math.max(0, totalPlan - totalActual);
                                const percent = totalPlan > 0 ? Math.min(100, Math.round((totalActual / totalPlan) * 100)) : 0;
                                
                                let status = 'not_started';
                                if (totalActual > 0 && totalActual < totalPlan) status = 'in_progress';
                                else if (totalActual >= totalPlan && totalPlan > 0) status = 'completed';

                                if (progressFilter !== 'all' && progressFilter !== status) return null;

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-2 text-sm font-semibold text-slate-800 sticky left-0 bg-white shadow-[1px_0_0_0_#e2e8f0] truncate" title={sub?.name}>{sub?.name || '---'}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 text-blue-900 bg-blue-50/20">{item.theoryPeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{item.practicePeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{item.clinicalPeriods}</td>
                                    <td className="p-2 text-sm text-center font-bold text-blue-700 bg-blue-100/40">{totalPlan}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 text-emerald-700 bg-emerald-50/20">{actualLT}</td>
                                    <td className="p-2 text-sm text-center text-emerald-700 bg-emerald-50/20">{actualTH}</td>
                                    <td className="p-2 text-sm text-center text-emerald-700 bg-emerald-50/20">{actualLS}</td>
                                    <td className="p-2 text-sm text-center font-bold text-emerald-700 bg-emerald-100/40">{totalActual}</td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 font-bold text-amber-600 bg-amber-50/20">{remaining}</td>
                                    
                                    <td className="p-2 border-l border-slate-100 bg-purple-50/10 align-middle">
                                      <div className="flex flex-col items-center gap-1 w-full px-2">
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                          <div className={\`h-full rounded-full \${percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-indigo-500' : 'bg-slate-300'}\`} style={{ width: \`\${percent}%\` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600">{percent}%</span>
                                      </div>
                                    </td>
                                    
                                    <td className="p-2 text-center border-l border-slate-100">
                                      {status === 'completed' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><Check className="w-3 h-3 mr-0.5" /> Hoàn thành</span>}
                                      {status === 'in_progress' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200"><Layers className="w-3 h-3 mr-0.5" /> Đang học</span>}
                                      {status === 'not_started' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Chưa học</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                              {activeCurriculum.items.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-slate-500">Chương trình này chưa có môn học nào.</td></tr>}
                            </tbody>
                          </table>
                        </div>`;

code = code.replace(tableRegex, newTable);
fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
