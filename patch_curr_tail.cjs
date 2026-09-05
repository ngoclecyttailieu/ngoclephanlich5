const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const startStr = "{/* Override Confirm Modal */}";
const endStr = "<ConfirmModal\n        isOpen={!!deleteMajorTarget}";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
  fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
  console.log("Successfully patched tail");
} else {
  console.error("Could not find start or end index");
}
