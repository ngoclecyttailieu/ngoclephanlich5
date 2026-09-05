const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const oldState = `  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null);`;
const newState = `  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null);
  
  // Progress Manual Edit State
  const [editingRemainingId, setEditingRemainingId] = useState<string | null>(null);
  const [editingRemainingValue, setEditingRemainingValue] = useState<number | ''>('');
  const [confirmOverrideTarget, setConfirmOverrideTarget] = useState<{subjectId: string, subjectName: string, oldValue: number, newValue: number, note: string} | null>(null);
  const [showLogsTarget, setShowLogsTarget] = useState<{subjectId: string, subjectName: string} | null>(null);`;

code = code.replace(oldState, newState);
fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
