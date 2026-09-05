const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleModal.tsx', 'utf8');

const regexDropdown = /\{db\.subjects\.map\(sub => \{\s*const q = classQuotas\.find\(item => item\.subjectId === sub\.id\);\s*return \(\s*<option key=\{sub\.id\} value=\{sub\.id\}>\s*\{sub\.name\} \(Còn \{q\?\.totalRemaining \|\| 0\} tiết\)\s*<\/option>\s*\);\s*\}\)\}/;

const replaceDropdown = `{db.subjects
                          .filter(sub => classQuotas.some(q => q.subjectId === sub.id))
                          .map(sub => {
                          const q = classQuotas.find(item => item.subjectId === sub.id);
                          return (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} (Còn {q?.totalRemaining || 0} tiết)
                            </option>
                          );
                        })}`;

code = code.replace(regexDropdown, replaceDropdown);

fs.writeFileSync('src/components/ScheduleModal.tsx', code);
