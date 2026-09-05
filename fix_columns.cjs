const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const oldRowStr = `<td className="p-3 text-sm font-semibold text-slate-700">{sub?.name || '---'}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.theoryPeriods}</td>`;
                                    
const newRowStr = `<td className="p-3 text-sm text-slate-600 font-medium">{sub?.code || '---'}</td>
                                    <td className="p-3 text-sm font-semibold text-slate-700">{sub?.name || '---'}</td>
                                    <td className="p-3 text-sm text-center font-bold text-slate-700">{sub?.credits || 0}</td>
                                    <td className="p-3 text-sm text-center text-slate-600">{item.theoryPeriods}</td>`;

code = code.replace(oldRowStr, newRowStr);

// Also need to adjust colspan for empty state
code = code.replace('colSpan={7}', 'colSpan={9}');

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
