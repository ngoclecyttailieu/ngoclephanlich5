const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const regex = /return newSchedules;\s*}\s*\\n\s*const hasOverride[\s\S]*/;
code = code.replace(regex, 'return newSchedules;\n}');
// Or maybe I just truncate the string manually
const index = code.lastIndexOf('return newSchedules;}');
if (index !== -1) {
    code = code.substring(0, index + 'return newSchedules;}'.length);
}
fs.writeFileSync('src/services/schedulerService.ts', code);
