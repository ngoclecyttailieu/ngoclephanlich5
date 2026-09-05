const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const replacement = `
                              {activeCurriculum.items.map(item => {
                                const sub = subjects.find(s => s.id === item.subjectId);
                                const q = quotas.find(q => q.classId === selectedClassId && q.subjectId === item.subjectId);
                                
                                const totalPlan = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
                                const actualLT = q?.usedTheory || 0;
                                const actualTH = q?.usedPractice || 0;
                                const actualLS = q?.usedClinical || 0;
                                const totalActual = actualLT + actualTH + actualLS;
                                
                                const remaining = q ? q.totalRemaining : totalPlan;
                                const isOverridden = q?.hasOverride || false;
                                
                                const percent = q ? q.percentageCompleted : 0;
                                
                                let status = 'not_started';
                                if (q?.isFullyFinished) status = 'completed';
                                else if (totalActual > 0) status = 'in_progress';

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
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100 font-bold text-amber-600 bg-amber-50/20 relative group">
                                        <div className="flex flex-col items-center">
                                          <span>{remaining}t</span>
                                          {isOverridden && <span className="text-[9px] text-amber-700">(Đã can thiệp)</span>}
                                        </div>
                                    </td>
                                    
                                    <td className="p-2 text-sm border-l border-slate-100 min-w-[120px]">
                                      <div className="flex items-center justify-between text-[10px] font-semibold mb-1 text-slate-600">
                                        <span>{percent}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                          className={\`h-full rounded-full transition-all \${status === 'completed' ? 'bg-emerald-500' : percent > 60 ? 'bg-blue-500' : 'bg-amber-500'}\`} 
                                          style={{ width: \`\${percent}%\` }}
                                        />
                                      </div>
                                    </td>
                                    
                                    <td className="p-2 text-sm text-center border-l border-slate-100">
                                      {status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                          <Check className="w-3 h-3" /> Hoàn thành
                                        </span>
                                      ) : status === 'in_progress' ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                                          Đang học
                                        </span>
                                      ) : (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
                                          Chưa học
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
`;

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('{activeCurriculum.items.map(item => {'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</tr>')) + 3; // up to the end of map

if (startIdx >= 0 && endIdx >= 0) {
  lines.splice(startIdx, endIdx - startIdx, replacement);
  fs.writeFileSync('src/components/CurriculumManagement.tsx', lines.join('\n'));
} else {
  console.error("Could not find replacement range");
}
