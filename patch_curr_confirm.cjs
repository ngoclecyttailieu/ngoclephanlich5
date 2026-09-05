const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const oldDeleteCurr = `const handleDeleteCurriculum = (id: string) => {
    if (!window.confirm('Xóa chương trình này?')) return;
    onUpdateDb(prev => ({ ...prev, curriculums: (prev.curriculums || []).filter(c => c.id !== id) }));
    if (selectedCurriculumId === id) setSelectedCurriculumId('');
  };`;

const newDeleteCurr = `const handleDeleteCurriculum = (id: string) => {
    const curr = curriculums.find(c => c.id === id);
    if (curr) setDeleteCurriculumTarget(curr);
  };
  const confirmDeleteCurriculum = () => {
    if (!deleteCurriculumTarget) return;
    onUpdateDb(prev => ({ ...prev, curriculums: (prev.curriculums || []).filter(c => c.id !== deleteCurriculumTarget.id) }));
    if (selectedCurriculumId === deleteCurriculumTarget.id) setSelectedCurriculumId('');
    setDeleteCurriculumTarget(null);
  };`;

code = code.replace(oldDeleteCurr, newDeleteCurr);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
