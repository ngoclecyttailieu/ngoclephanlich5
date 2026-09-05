const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const oldHeader = `<tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-3 border-b border-slate-200 font-bold">Môn học</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Lý thuyết</th>`;

const newHeader = `<tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-3 border-b border-slate-200 font-bold w-24">Mã (MĐ)</th>
                                <th className="p-3 border-b border-slate-200 font-bold">Môn học</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center w-16">TC</th>
                                <th className="p-3 border-b border-slate-200 font-bold text-center">Lý thuyết</th>`;

code = code.replace(oldHeader, newHeader);

const oldRow = `<td className="p-3 text-sm font-semibold text-slate-800">{sub?.name || '---'}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.theoryPeriods}</td>`;

const newRow = `<td className="p-3 text-sm text-slate-600 font-medium">{sub?.code || '---'}</td>
                                    <td className="p-3 text-sm font-semibold text-slate-800">{sub?.name || '---'}</td>
                                    <td className="p-3 text-sm text-center font-bold text-slate-700">{sub?.credits || 0}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.theoryPeriods}</td>`;

code = code.replace(oldRow, newRow);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
