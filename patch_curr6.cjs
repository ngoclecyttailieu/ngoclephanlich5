const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const regex = /<td className="p-2 text-sm text-center border-l border-slate-100 text-blue-900 bg-blue-50\/20">\{item\.theoryPeriods\}<\/td>\s*<td className="p-2 text-sm text-center text-blue-900 bg-blue-50\/20">\{item\.practicePeriods\}<\/td>\s*<td className="p-2 text-sm text-center text-blue-900 bg-blue-50\/20">\{item\.clinicalPeriods\}<\/td>\s*<td className="p-2 text-sm text-center font-bold text-blue-700 bg-blue-100\/40">\{totalPlan\}<\/td>/g;

const replace = `<td className="p-2 text-sm text-center border-l border-slate-100 text-blue-900 bg-blue-50/20">{q ? q.initialTheory : item.theoryPeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{q ? q.initialPractice : item.practicePeriods}</td>
                                    <td className="p-2 text-sm text-center text-blue-900 bg-blue-50/20">{q ? q.initialClinical : item.clinicalPeriods}</td>
                                    <td className="p-2 text-sm text-center font-bold text-blue-700 bg-blue-100/40">{totalPlan}</td>`;

code = code.replace(regex, replace);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
