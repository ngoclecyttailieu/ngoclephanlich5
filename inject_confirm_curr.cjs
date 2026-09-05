const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// Import ConfirmModal
if (!code.includes("import { ConfirmModal }")) {
  code = code.replace(
    "import { AppDatabase",
    "import { ConfirmModal } from './ConfirmModal';\nimport { AppDatabase"
  );
}

// Add state for ConfirmModal
if (!code.includes("deleteMajorTarget")) {
  code = code.replace(
    "const [majorName, setMajorName] = useState('');",
    "const [majorName, setMajorName] = useState('');\n  const [deleteMajorTarget, setDeleteMajorTarget] = useState<Major | null>(null);\n  const [deleteCurriculumTarget, setDeleteCurriculumTarget] = useState<Curriculum | null>(null);\n  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null);"
  );
}

// Update handleDeleteMajor to just set target
const oldDeleteMajor = `const handleDeleteMajor = (id: string) => {
    if (!window.confirm('Bạn có CHẮC CHẮN muốn xóa ngành đào tạo này không? Tất cả các Chương trình đào tạo thuộc ngành này cũng có thể bị ảnh hưởng.')) return;
    onUpdateDb(prev => ({ ...prev, majors: (prev.majors || []).filter(m => m.id !== id) }));
  };`;

const newDeleteMajor = `const handleDeleteMajor = (id: string) => {
    const major = majors.find(m => m.id === id);
    if (major) setDeleteMajorTarget(major);
  };
  const confirmDeleteMajor = () => {
    if (!deleteMajorTarget) return;
    onUpdateDb(prev => ({ ...prev, majors: (prev.majors || []).filter(m => m.id !== deleteMajorTarget.id) }));
    setDeleteMajorTarget(null);
  };`;

code = code.replace(oldDeleteMajor, newDeleteMajor);

// We need to also patch the handleDeleteCurriculum
const oldDeleteCurr = `const handleDeleteCurriculum = (id: string) => {
    if (!window.confirm('Xóa CTĐT này?')) return;
    onUpdateDb(prev => ({ ...prev, curriculums: (prev.curriculums || []).filter(c => c.id !== id) }));
  };`;
const newDeleteCurr = `const handleDeleteCurriculum = (id: string) => {
    const curr = curriculums.find(c => c.id === id);
    if (curr) setDeleteCurriculumTarget(curr);
  };
  const confirmDeleteCurriculum = () => {
    if (!deleteCurriculumTarget) return;
    onUpdateDb(prev => ({ ...prev, curriculums: (prev.curriculums || []).filter(c => c.id !== deleteCurriculumTarget.id) }));
    setDeleteCurriculumTarget(null);
  };`;

code = code.replace(oldDeleteCurr, newDeleteCurr);

// And handleDeleteItem
const oldDeleteItem = `const handleDeleteItem = (itemId: string) => {
    onUpdateDb(prev => ({
      ...prev,
      curriculums: (prev.curriculums || []).map(c => c.id === selectedCurriculumId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c)
    }));
  };`;
const newDeleteItem = `const handleDeleteItem = (itemId: string) => {
    setDeleteItemTarget(itemId);
  };
  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return;
    onUpdateDb(prev => ({
      ...prev,
      curriculums: (prev.curriculums || []).map(c => c.id === selectedCurriculumId ? { ...c, items: c.items.filter(i => i.id !== deleteItemTarget) } : c)
    }));
    setDeleteItemTarget(null);
  };`;

code = code.replace(oldDeleteItem, newDeleteItem);

// Append ConfirmModals to the JSX return
const confirmModalsJSX = `
      <ConfirmModal
        isOpen={!!deleteMajorTarget}
        title="Xóa Ngành Đào Tạo"
        message={
          <>
            Bạn có CHẮC CHẮN muốn xóa ngành <strong>{deleteMajorTarget?.name}</strong> không? 
            <br/><br/>
            Tất cả các Chương trình đào tạo thuộc ngành này cũng có thể bị ảnh hưởng.
          </>
        }
        icon="alert"
        confirmVariant="danger"
        confirmText="Xóa Ngành"
        onConfirm={confirmDeleteMajor}
        onClose={() => setDeleteMajorTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteCurriculumTarget}
        title="Xóa Chương Trình Đào Tạo"
        message={<>Xóa chương trình đào tạo <strong>{deleteCurriculumTarget?.name}</strong>?</>}
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa CTĐT"
        onConfirm={confirmDeleteCurriculum}
        onClose={() => setDeleteCurriculumTarget(null)}
      />
      <ConfirmModal
        isOpen={!!deleteItemTarget}
        title="Xóa Môn Học"
        message="Bạn có chắc chắn muốn xóa môn học này khỏi CTĐT?"
        icon="trash"
        confirmVariant="danger"
        confirmText="Xóa Môn Học"
        onConfirm={confirmDeleteItem}
        onClose={() => setDeleteItemTarget(null)}
      />
    </div>
  );
};
`;

code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};\s*$/m, "</div>\n        </div>\n      </div>\n" + confirmModalsJSX);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
