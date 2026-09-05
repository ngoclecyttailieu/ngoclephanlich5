const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const index = code.lastIndexOf('return newSchedules;}');
if (index !== -1) {
    code = code.substring(0, index + 'return newSchedules;}'.length) + '\n';
}
fs.writeFileSync('src/services/schedulerService.ts', code);
