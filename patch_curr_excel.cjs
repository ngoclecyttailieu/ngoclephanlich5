const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const excelHandlers = `
  const handleExportExcel = () => {
    if (!selectedCurriculumId) return;
    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
    if (!activeCurr) return;

    const exportData = activeCurr.items.map(item => {
      const sub = subjects.find(s => s.id === item.subjectId);
      return {
        'Mã môn học (MĐ)': sub?.code || '',
        'Tên môn học': sub?.name || '',
        'TC': sub?.credits || 0,
        'Tổng số tiết': item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0),
        'Lý thuyết': item.theoryPeriods,
        'Thực hành': item.practicePeriods,
        'Lâm sàng': item.clinicalPeriods,
        'Kiểm tra': item.testPeriods || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CTDT');
    XLSX.writeFile(workbook, \`CTDT_\${activeCurr.name.replace(/\\s+/g, '_')}.xlsx\`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCurriculumId) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        onUpdateDb(prev => {
          const prevSubjects = [...(prev.subjects || [])];
          const newItems: CurriculumItem[] = [];

          data.forEach(row => {
            const code = row['Mã môn học (MĐ)']?.toString().trim() || row['Mã môn học']?.toString().trim();
            const name = row['Tên môn học']?.toString().trim();
            const credits = Number(row['TC']) || 0;
            const theory = Number(row['Lý thuyết']) || 0;
            const practice = Number(row['Thực hành']) || 0;
            const clinical = Number(row['Lâm sàng']) || 0;
            const test = Number(row['Kiểm tra']) || 0;

            if (!code || !name) return;

            let sub = prevSubjects.find(s => s.code === code);
            if (!sub) {
              sub = {
                id: \`sub-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
                code,
                name,
                credits,
                theoryPeriods: theory,
                practicePeriods: practice,
                clinicalPeriods: clinical,
                testPeriods: test,
                totalPeriods: theory + practice + clinical + test,
                colorBg: '#f3f4f6',
                colorText: '#1f2937',
                colorBorder: '#d1d5db'
              };
              prevSubjects.push(sub);
            }

            newItems.push({
              id: \`item-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
              subjectId: sub.id,
              theoryPeriods: theory,
              practicePeriods: practice,
              clinicalPeriods: clinical,
              testPeriods: test
            });
          });

          const prevCurrs = prev.curriculums || [];
          return {
            ...prev,
            subjects: prevSubjects,
            curriculums: prevCurrs.map(c => 
              c.id === selectedCurriculumId 
                ? { ...c, items: [...c.items, ...newItems] } 
                : c
            )
          };
        });
        
        alert('Nhập dữ liệu thành công!');
      } catch (error) {
        console.error(error);
        alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };
`;

code = code.replace(
  "// Progress Handlers",
  excelHandlers + "\n  // Progress Handlers"
);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
