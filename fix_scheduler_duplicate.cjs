const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const regex = /percentageCompleted,\s*isTheoryFinished,\s*isPracticeFinished,\s*isClinicalFinished,\s*isFullyFinished,\s*/;
code = code.replace(regex, `isTheoryFinished,
        isPracticeFinished,
        isClinicalFinished,
        `);

fs.writeFileSync('src/services/schedulerService.ts', code);
