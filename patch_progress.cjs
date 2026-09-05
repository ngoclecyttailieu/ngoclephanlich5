const fs = require('fs');
let code = fs.readFileSync('src/components/ProgressDashboard.tsx', 'utf8');

// 1. Update imports
code = code.replace(
  "import { BarChart3, Edit3, Check, X, AlertCircle, Sparkles, Filter, Search } from 'lucide-react';",
  "import { BarChart3, Edit3, Check, X, AlertCircle, Sparkles, Filter, Search, ChevronRight, BookOpen } from 'lucide-react';"
);

// 2. Update props
code = code.replace(
  "onUpdateQuotaOverride: (override: ClassSubjectQuota) => void;",
  "onUpdateQuotaOverride: (override: ClassSubjectQuota, note?: string) => void;"
);

// 3. Update state
code = code.replace(
  "const [editLS, setEditLS] = useState<number>(0);",
  "const [editLS, setEditLS] = useState<number>(0);\n  const [confirmTarget, setConfirmTarget] = useState<CalculatedQuota | null>(null);\n  const [overrideNote, setOverrideNote] = useState('');\n  const [showLogsTarget, setShowLogsTarget] = useState<CalculatedQuota | null>(null);"
);

// 4. Update handleSaveOverride
code = code.replace(
  "const handleSaveOverride = (q: CalculatedQuota) => {\n    onUpdateQuotaOverride({\n      classId: q.classId,\n      subjectId: q.subjectId,\n      initialTheory: q.initialTheory,\n      initialPractice: q.initialPractice,\n      initialClinical: q.initialClinical,\n      usedTheory: q.usedTheory,\n      usedPractice: q.usedPractice,\n      usedClinical: q.usedClinical,\n      overrideRemainingTheory: editLT,\n      overrideRemainingPractice: editTH,\n      overrideRemainingClinical: editLS,\n    });\n    setEditingKey(null);\n  };",
  `const handleStartSave = (q: CalculatedQuota) => {
    setConfirmTarget(q);
    setOverrideNote('');
  };

  const handleConfirmSave = () => {
    if (!confirmTarget) return;
    onUpdateQuotaOverride({
      classId: confirmTarget.classId,
      subjectId: confirmTarget.subjectId,
      initialTheory: confirmTarget.initialTheory,
      initialPractice: confirmTarget.initialPractice,
      initialClinical: confirmTarget.initialClinical,
      usedTheory: confirmTarget.usedTheory,
      usedPractice: confirmTarget.usedPractice,
      usedClinical: confirmTarget.usedClinical,
      overrideRemainingTheory: editLT,
      overrideRemainingPractice: editTH,
      overrideRemainingClinical: editLS,
    }, overrideNote);
    setEditingKey(null);
    setConfirmTarget(null);
  };`
);

// 5. Update the button to use handleStartSave
code = code.replace(
  "onClick={() => handleSaveOverride(q)}",
  "onClick={() => handleStartSave(q)}"
);

// 6. Add button to view logs next to "(Đã can thiệp thủ công)"
code = code.replace(
  "(Đã can thiệp thủ công)",
  "(Đã can thiệp)\n                        </div>\n                        <button onClick={() => setShowLogsTarget(q)} className=\"text-[10px] text-indigo-600 hover:text-indigo-800 underline mt-1 block w-full\">\n                          Xem nhật ký\n                        </button>"
);

fs.writeFileSync('src/components/ProgressDashboard.tsx', code);
