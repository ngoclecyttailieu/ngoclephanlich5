const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// 1. Add import XLSX and FileUp, FileDown icons
code = code.replace(
  "import { Plus, Edit2, Trash2, BookOpen, Layers, Check, X, Search, ChevronRight } from 'lucide-react';",
  "import { Plus, Edit2, Trash2, BookOpen, Layers, Check, X, Search, ChevronRight, FileUp, FileDown } from 'lucide-react';\nimport * as XLSX from 'xlsx';"
);

// 2. Add testPeriods to state
code = code.replace(
  "const [itemClinical, setItemClinical] = useState<number>(0);",
  "const [itemClinical, setItemClinical] = useState<number>(0);\n  const [itemTest, setItemTest] = useState<number>(0);"
);

// 3. Update handleSubjectSelect
code = code.replace(
  "setItemClinical(sub.clinicalPeriods);",
  "setItemClinical(sub.clinicalPeriods);\n      setItemTest(sub.testPeriods || 0);"
);

// 4. Update handleSaveItem
code = code.replace(
  "practicePeriods: itemPractice, clinicalPeriods: itemClinical } : i)",
  "practicePeriods: itemPractice, clinicalPeriods: itemClinical, testPeriods: itemTest } : i)"
);
code = code.replace(
  "practicePeriods: itemPractice, clinicalPeriods: itemClinical }]",
  "practicePeriods: itemPractice, clinicalPeriods: itemClinical, testPeriods: itemTest }]"
);
code = code.replace(
  "setItemClinical(0);",
  "setItemClinical(0); setItemTest(0);"
);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
