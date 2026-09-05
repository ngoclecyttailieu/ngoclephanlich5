const fs = require('fs');
let code = fs.readFileSync('src/components/SubjectManagement.tsx', 'utf8');

// 1. Add state
code = code.replace(
  "const [clinicalPeriods, setClinicalPeriods] = useState<number>(0);",
  "const [clinicalPeriods, setClinicalPeriods] = useState<number>(0);\n  const [testPeriods, setTestPeriods] = useState<number>(0);"
);

// 2. Add to totalPeriods calculation
code = code.replace(
  "const totalPeriods = theoryPeriods + practicePeriods + clinicalPeriods;",
  "const totalPeriods = theoryPeriods + practicePeriods + clinicalPeriods + testPeriods;"
);

// 3. Reset state
code = code.replace(
  "setClinicalPeriods(0);",
  "setClinicalPeriods(0);\n    setTestPeriods(0);"
);

// 4. Update state from selected subject
code = code.replace(
  "setClinicalPeriods(s.clinicalPeriods);",
  "setClinicalPeriods(s.clinicalPeriods);\n    setTestPeriods(s.testPeriods || 0);"
);

// 5. Add to onAdd / onUpdate
code = code.replace(
  "clinicalPeriods,\n        totalPeriods",
  "clinicalPeriods,\n        testPeriods,\n        totalPeriods"
);
code = code.replace(
  "clinicalPeriods,\n        totalPeriods",
  "clinicalPeriods,\n        testPeriods,\n        totalPeriods"
);

// 6. UI for inputs
const clinicalInput = `<div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số tiết Lâm sàng</label>
                <input
                  type="number"
                  min="0"
                  value={clinicalPeriods}
                  onChange={(e) => setClinicalPeriods(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>`;

const testInput = `<div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số tiết Kiểm tra</label>
                <input
                  type="number"
                  min="0"
                  value={testPeriods}
                  onChange={(e) => setTestPeriods(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>`;

code = code.replace(clinicalInput, clinicalInput + '\n' + testInput);

// 7. UI for table header
code = code.replace(
  `<th className="p-3 border-b border-slate-200 font-semibold w-20 text-center text-rose-800 bg-rose-50/50">LS</th>`,
  `<th className="p-3 border-b border-slate-200 font-semibold w-20 text-center text-rose-800 bg-rose-50/50">LS</th>
                      <th className="p-3 border-b border-slate-200 font-semibold w-20 text-center text-amber-800 bg-amber-50/50">KT</th>`
);

// 8. UI for table row
code = code.replace(
  `<td className="p-3 text-sm text-center font-bold text-rose-700 bg-rose-50/20">
                      {s.clinicalPeriods}t
                    </td>`,
  `<td className="p-3 text-sm text-center font-bold text-rose-700 bg-rose-50/20">
                      {s.clinicalPeriods}t
                    </td>
                    <td className="p-3 text-sm text-center font-bold text-amber-700 bg-amber-50/20">
                      {s.testPeriods || 0}t
                    </td>`
);

fs.writeFileSync('src/components/SubjectManagement.tsx', code);
