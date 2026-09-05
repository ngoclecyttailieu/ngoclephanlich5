const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const effectCode = `  // Effect to handle selection validity
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
  }, [allowedSubjectIds, selectedSubjectId, pairedSubject1Id, pairedSubject2Id, db.subjects]);`;

code = code.replace(effectCode, '');

// insert it before the first useMemo
const targetIndex = code.indexOf('const selectedSubjectsDetails = useMemo(() => {');
code = code.substring(0, targetIndex) + effectCode + '\n\n  ' + code.substring(targetIndex);

fs.writeFileSync('src/components/AutoSchedulerModal.tsx', code);
