const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

// The injected code is between line 119 and 162
code = code.replace(/const handleExportWord = \(\) => \{[\s\S]*?\};[\s\S]*?`;/g, '');

const wordExport = `
  const handleExportWord = () => {
    if (!selectedCurriculumId) return;
    const activeCurr = curriculums.find(c => c.id === selectedCurriculumId);
    if (!activeCurr) return;

    let html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CTDT</title></head><body>";
    html += "<h2 style='text-align: center;'>CHƯƠNG TRÌNH ĐÀO TẠO: " + activeCurr.name + "</h2>";
    html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    html += "<tr><th>Mã môn học (MĐ)</th><th>Tên môn học</th><th>TC</th><th>Tổng số tiết</th><th>Lý thuyết</th><th>Thực hành</th><th>Lâm sàng</th><th>Kiểm tra</th></tr>";

    activeCurr.items.forEach(item => {
      const sub = subjects.find(s => s.id === item.subjectId);
      const total = item.theoryPeriods + item.practicePeriods + item.clinicalPeriods + (item.testPeriods || 0);
      html += "<tr>" +
        "<td>" + (sub?.code || '') + "</td>" +
        "<td>" + (sub?.name || '') + "</td>" +
        "<td style='text-align: center;'>" + (sub?.credits || 0) + "</td>" +
        "<td style='text-align: center;'>" + total + "</td>" +
        "<td style='text-align: center;'>" + item.theoryPeriods + "</td>" +
        "<td style='text-align: center;'>" + item.practicePeriods + "</td>" +
        "<td style='text-align: center;'>" + item.clinicalPeriods + "</td>" +
        "<td style='text-align: center;'>" + (item.testPeriods || 0) + "</td>" +
      "</tr>";
    });

    html += "</table></body></html>";

    const blob = new Blob(['\\ufeff', html], {
      type: 'application/msword'
    });
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const link = document.createElement('a');
    link.href = url;
    link.download = "CTDT_" + activeCurr.name.replace(/\\s+/g, '_') + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
`;

code = code.replace("const handleExportExcel = () => {", wordExport + "\n  const handleExportExcel = () => {");

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
