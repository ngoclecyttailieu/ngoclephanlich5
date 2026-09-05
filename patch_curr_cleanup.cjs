const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// Remove calculateActualProgress
code = code.replace(/const calculateActualProgress = \([\s\S]*?\n  };\n/g, "");

// Remove confirmOverrideTarget modal
code = code.replace(/\{confirmOverrideTarget && \([\s\S]*?\}\)/g, "");

// Remove showLogsTarget modal
code = code.replace(/\{showLogsTarget && \([\s\S]*?\}\)/g, "");

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
