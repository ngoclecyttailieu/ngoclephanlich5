const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

// The file was messed up by string replacement of '\n' and regex.
// Let's split by '\n' and just find where the actual code ends.
const lines = code.split('\n');
const eofIndex = lines.findIndex(l => l.includes('return newSchedules;}\\n'));
if (eofIndex !== -1) {
  // It means we have the literal string `return newSchedules;}\n      const hasOverride`
  const splitLine = lines[eofIndex].split('\\n');
  lines[eofIndex] = splitLine[0];
  // Remove everything after eofIndex
  lines.splice(eofIndex + 1);
  code = lines.join('\n');
}

// Now we need to fix the duplicate declarations from line 203 to 248.
// Because the regex /const hasOverride = !!\([\s\S]*?totalRemaining,/g replaced something inside the calculateAllQuotas function.
fs.writeFileSync('src/services/schedulerService.ts.fixed', code);
