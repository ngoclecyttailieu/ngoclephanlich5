const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

code = code.replace(
  "import { AppDatabase, Major, Curriculum, CurriculumItem, ClassProgress, Subject } from '../types';",
  "import { AppDatabase, Major, Curriculum, CurriculumItem, ClassProgress, Subject } from '../types';\nimport { calculateAllQuotas } from '../services/schedulerService';"
);

code = code.replace(
  "const subjects = db.subjects || [];",
  "const subjects = db.subjects || [];\n  const quotas = useMemo(() => calculateAllQuotas(db), [db]);"
);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
