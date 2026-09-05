const fs = require('fs');
let code = fs.readFileSync('src/components/CurriculumManagement.tsx', 'utf8');
code = code.replace(
  `                      ) : (
                        <div className="flex items-center justify-between mb-4">`,
  `                      ) : (
                        <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">`
);

code = code.replace(
  `                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>`,
  `                            </tbody>
                          </table>
                        </div>
                        </div>
                      )}
                    </div>`
);
fs.writeFileSync('src/components/CurriculumManagement.tsx', code);
