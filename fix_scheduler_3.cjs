const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const regex = /\\n\s*const hasOverride = !!\([\s\S]*/;
code = code.replace(regex, '');

fs.writeFileSync('src/services/schedulerService.ts', code);
