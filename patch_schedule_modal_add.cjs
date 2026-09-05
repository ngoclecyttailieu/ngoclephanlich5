const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleModal.tsx', 'utf8');

const regex = /const nextSub = db\.subjects\.find\(s => s\.id !== periods\[0\]\?\.subjectId\) \|\| db\.subjects\[0\];/;
const replace = `
    const allowedSubjects = db.subjects.filter(sub => classQuotas.some(q => q.subjectId === sub.id));
    const nextSub = allowedSubjects.find(s => s.id !== periods[0]?.subjectId) || allowedSubjects[0] || db.subjects[0];
`;

code = code.replace(regex, replace);

fs.writeFileSync('src/components/ScheduleModal.tsx', code);
