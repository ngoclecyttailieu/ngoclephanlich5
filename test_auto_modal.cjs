const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const match = code.match(/const \[selectedSubjectId, setSelectedSubjectId\] = useState<string>\(.*?([^]*?)const \[selectedPeriodType/);
if (match) {
    console.log("Found subject select state");
} else {
    console.log("Not found subject select state");
}
