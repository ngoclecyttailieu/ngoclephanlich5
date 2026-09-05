const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const regex = /const \[selectedClassIds, setSelectedClassIds\] = useState<string\[\]>\(\(\) => \{[\s\S]*?return db\.classes\.map\(c => c\.id\);\s*\}\);/;

const replace = `$&

  const allowedSubjectIds = useMemo(() => {
    if (selectedClassIds.length === 0) return new Set(db.subjects.map(s => s.id));
    
    const ids = new Set<string>();
    let hasCurriculum = false;

    selectedClassIds.forEach(classId => {
      const cls = db.classes.find(c => c.id === classId);
      if (cls && cls.curriculumId) {
        const curriculum = db.curriculums?.find(c => c.id === cls.curriculumId);
        if (curriculum) {
          hasCurriculum = true;
          curriculum.items.forEach(item => {
            ids.add(item.subjectId);
          });
        }
      }
    });

    if (!hasCurriculum) {
      return new Set(db.subjects.map(s => s.id));
    }
    return ids;
  }, [selectedClassIds, db.classes, db.curriculums, db.subjects]);`;

code = code.replace(regex, replace);

// Now update the dropdowns to filter by allowedSubjectIds
// 1. Single Subject
const selectSingle = /\{db\.subjects\.map\(s => \{\s*const dept = db\.departments\?\.find\(d => d\.id === s\.departmentId\);\s*return \([\s\S]*?<option key=\{s\.id\} value=\{s\.id\}>[\s\S]*?<\/option>\s*\);\s*\}\)\}/g;
const selectSingleReplace = `{db.subjects.filter(s => allowedSubjectIds.has(s.id)).map(s => {
                          const dept = db.departments?.find(d => d.id === s.departmentId);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.code ? \`[\${s.code}] \` : ''}{s.name} ({s.credits || 0} tín chỉ - {s.totalPeriods || 0} tiết) {dept ? \` - BM: \${dept.code}\` : ''}
                            </option>
                          );
                        })}`;

code = code.replace(selectSingle, selectSingleReplace);

// 2. Paired Subjects (2 dropdowns)
const selectPaired = /\{db\.subjects\.map\(s => \(\s*<option key=\{s\.id\} value=\{s\.id\}>\s*\{s\.name\} \(\{s\.code \|\| 'Môn'\}\)\s*<\/option>\s*\)\)\}/g;
const selectPairedReplace = `{db.subjects.filter(s => allowedSubjectIds.has(s.id)).map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code || 'Môn'})
                              </option>
                            ))}`;

code = code.replace(selectPaired, selectPairedReplace);

fs.writeFileSync('src/components/AutoSchedulerModal.tsx', code);
