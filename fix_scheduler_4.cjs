const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const regex = /result\.push\(\{\n/;
code = code.replace(regex, `result.push({
        percentageCompleted,
        isTheoryFinished,
        isPracticeFinished,
        isClinicalFinished,
        isFullyFinished,
`);

fs.writeFileSync('src/services/schedulerService.ts', code);
