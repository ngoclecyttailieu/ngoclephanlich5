const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

code = code.replace(/totalInitial,/g, "totalInitial: effectiveTotalInitial,");
fs.writeFileSync('src/services/schedulerService.ts', code);
