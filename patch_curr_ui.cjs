const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');

code = code.replace(
  '<div className="flex items-center justify-between">\n                          <h3 className="font-bold text-slate-800 text-lg">Danh sách môn học: {activeCurr.name}</h3>\n                        </div>',
  `<div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-lg">Danh sách môn học: {activeCurr.name}</h3>
                          <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition">
                              <FileDown className="w-4 h-4" /> Xuất Excel
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition cursor-pointer">
                              <FileUp className="w-4 h-4" /> Nhập Excel
                              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                            </label>
                          </div>
                        </div>`
);

fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
