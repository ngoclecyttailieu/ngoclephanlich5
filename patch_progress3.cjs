const fs = require('fs');
let code = fs.readFileSync('src/components/ProgressDashboard.tsx', 'utf8');

const original = `{q.hasOverride && (
                        <div className="text-[9px] text-purple-600 font-medium mt-0.5">
                          (Đã can thiệp)
                        </div>
                        <button onClick={() => setShowLogsTarget(q)} className="text-[10px] text-indigo-600 hover:text-indigo-800 underline mt-1 block w-full">
                          Xem nhật ký
                        </button>
                        </div>
                      )}`;

const replacement = `{q.hasOverride && (
                        <>
                          <div className="text-[9px] text-purple-600 font-medium mt-0.5">
                            (Đã can thiệp)
                          </div>
                          <button onClick={() => setShowLogsTarget(q)} className="text-[10px] text-indigo-600 hover:text-indigo-800 underline mt-1 block w-full">
                            Xem nhật ký
                          </button>
                        </>
                      )}`;

code = code.replace(original, replacement);
fs.writeFileSync('src/components/ProgressDashboard.tsx', code);
