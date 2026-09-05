const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

const wordExport = `
  const handleExportWord = () => {
    if (!selectedCurriculumId) return;
    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
    if (!activeCurr) return;

    let html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CTDT</title></head><body>";
    html += \`<h2 style="text-align: center;">CHƯƠNG TRÌNH ĐÀO TẠO: \${activeCurr.name}</h2>\`;
    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr><th>Mã môn học (MĐ)</th><th>Tên môn học</th><th>TC</th><th>Tổng số tiết</th><th>Lý thuyết</th><th>Thực hành</th><th>Lâm sàng</th><th>Kiểm tra</th></tr>";

    activeCurr.items.forEach(item => {
      const sub = subjects.find(s => s.id === item.subjectId);
      const total = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
      html += \`<tr>
        <td>\${sub?.code || ''}</td>
        <td>\${sub?.name || ''}</td>
        <td style="text-align: center;">\${sub?.credits || 0}</td>
        <td style="text-align: center;">\${total}</td>
        <td style="text-align: center;">\${item.theoryPeriods}</td>
        <td style="text-align: center;">\${item.practicePeriods}</td>
        <td style="text-align: center;">\${item.clinicalPeriods}</td>
        <td style="text-align: center;">\${item.testPeriods || 0}</td>
      </tr>\`;
    });

    html += "</table></body></html>";

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`CTDT_\${activeCurr.name.replace(/\\s+/g, '_')}.doc\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
\`;`;

code = code.replace("const handleExportExcel = () => {", wordExport.replace("`;", "") + "\n  const handleExportExcel = () => {");

const oldButtons = `<div className="flex gap-2">
                            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Excel
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer">
                              <FileUp className="w-4 h-4" /> Nhập Excel
                              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                            </label>
                          </div>`;

const newButtons = `<div className="flex gap-2">
                            <button onClick={handleExportWord} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Word
                            </button>
                            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Excel
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer" title="Hỗ trợ file Excel (.xlsx, .xls)">
                              <FileUp className="w-4 h-4" /> Nhập Excel
                              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                            </label>
                          </div>`;

code = code.replace(oldButtons, newButtons);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
