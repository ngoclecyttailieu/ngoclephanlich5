const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// 1. Fix Export to always have headers
const oldExport = `const exportData = activeCurr.items.map(item => {
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

    const worksheet = XLSX.utils.json_to_sheet(exportData);`;

const newExport = `let exportData = activeCurr.items.map(item => {
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

    if (exportData.length === 0) {
      exportData = [{
        'Mã môn học (MĐ)': 'MĐ 01',
        'Tên môn học': 'Giáo dục chính trị',
        'TC': 2,
        'Tổng số tiết': 30,
        'Lý thuyết': 15,
        'Thực hành': 15,
        'Lâm sàng': 0,
        'Kiểm tra': 0,
      }];
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);`;

code = code.replace(oldExport, newExport);

// 2. Add empty state template download
const oldEmpty = `<div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed min-h-[300px]">
                      Chọn một chương trình đào tạo để quản lý môn học
                    </div>`;

const newEmpty = `<div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed min-h-[300px]">
                      <p className="mb-4">Chọn một chương trình đào tạo để quản lý môn học</p>
                      <button onClick={() => {
                        const templateData = [{
                          'Mã môn học (MĐ)': 'MĐ 01',
                          'Tên môn học': 'Giáo dục chính trị',
                          'TC': 2,
                          'Tổng số tiết': 30,
                          'Lý thuyết': 15,
                          'Thực hành': 15,
                          'Lâm sàng': 0,
                          'Kiểm tra': 0,
                        }];
                        const worksheet = XLSX.utils.json_to_sheet(templateData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'CTDT');
                        XLSX.writeFile(workbook, 'CTDT_Mau.xlsx');
                      }} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold shadow-sm transition">
                        <FileDown className="w-4 h-4 text-emerald-600" />
                        Tải file mẫu Excel
                      </button>
                    </div>`;

code = code.replace(oldEmpty, newEmpty);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
