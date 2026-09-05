const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleModal.tsx', 'utf8');

const regex = /const firstSubjectId = db\.subjects\[0\]\?\.id \|\| '';/;
const replace = `const firstSubjectId = classQuotas.length > 0 ? classQuotas[0].subjectId : (db.subjects[0]?.id || '');`;

code = code.replace(regex, replace);

fs.writeFileSync('src/components/ScheduleModal.tsx', code);
