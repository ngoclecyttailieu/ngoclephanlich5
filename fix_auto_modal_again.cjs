const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const regexToRemove = /^\s*\/\/\s*Effect to handle selection validity\s*useEffect\(\(\) => \{[\s\S]*?db\.subjects\]\);\s*/;
code = code.replace(regexToRemove, '');

const effectCode = `
  // Effect to handle selection validity
  useEffect(() => {
    if (selectedSubjectId && !allowedSubjectIds.has(selectedSubjectId)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setSelectedSubjectId(firstAllowed);
    }
    if (pairedSubject1Id && !allowedSubjectIds.has(pairedSubject1Id)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setPairedSubject1Id(firstAllowed);
    }
    if (pairedSubject2Id && !allowedSubjectIds.has(pairedSubject2Id)) {
      const firstAllowed = db.subjects.find(s => allowedSubjectIds.has(s.id))?.id;
      if (firstAllowed) setPairedSubject2Id(firstAllowed);
    }
  }, [allowedSubjectIds, selectedSubjectId, pairedSubject1Id, pairedSubject2Id, db.subjects]);
`;

const insertIndexRegex = /const \[selectedCohortIds, setSelectedCohortIds\] = useState<string\[\]>\(\(\) => \{/;

code = code.replace(insertIndexRegex, effectCode + '\n$&');

fs.writeFileSync('src/components/AutoSchedulerModal.tsx', code);
