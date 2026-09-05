const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const original = `                                const totalPlan = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
                                const actualLT = q?.usedTheory || 0;`;

const replacement = `                                const totalPlan = q ? q.totalInitial : (item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0));
                                const actualLT = q?.usedTheory || 0;`;

code = code.replace(original, replacement);
fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
