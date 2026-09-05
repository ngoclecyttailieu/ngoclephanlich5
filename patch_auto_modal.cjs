const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const regexDropdown = /<select\s+value=\{selectedSubjectId\}[\s\S]*?\{db\.subjects\.map\(s => \{[\s\S]*?const dept = db\.departments\?\.find\(d => d\.id === s\.departmentId\);[\s\S]*?return \([\s\S]*?<option key=\{s\.id\} value=\{s\.id\}>[\s\S]*?\{s\.code \? \`\[\$\{s\.code\}\] \` : ''\}\{s\.name\} \(\{s\.credits \|\| 0\} tín chỉ - \{s\.totalPeriods \|\| 0\} tiết\) \{dept \? \` - BM: \$\{dept\.code\}\` : ''\}[\s\S]*?<\/option>[\s\S]*?\);[\s\S]*?\}\)\}[\s\S]*?<\/select>/;

// Let's first make sure we can find the location
if (regexDropdown.test(code)) {
    console.log("Found selectedSubjectId dropdown");
} else {
    console.log("Not found selectedSubjectId dropdown");
}
