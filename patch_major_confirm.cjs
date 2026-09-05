const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const oldDelete = `  const handleDeleteMajor = (id: string) => {
    if (!window.confirm('Xóa ngành đào tạo này?')) return;
    onUpdateDb(prev => ({ ...prev, majors: (prev.majors || []).filter(m => m.id !== id) }));
  };`;
  
const newDelete = `  const handleDeleteMajor = (id: string) => {
    if (!window.confirm('Bạn có CHẮC CHẮN muốn xóa ngành đào tạo này không? Tất cả các Chương trình đào tạo thuộc ngành này cũng có thể bị ảnh hưởng.')) return;
    onUpdateDb(prev => ({ ...prev, majors: (prev.majors || []).filter(m => m.id !== id) }));
  };`;

code = code.replace(oldDelete, newDelete);
fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
