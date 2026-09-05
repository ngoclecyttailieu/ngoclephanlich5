const fs = require('fs');
let code = fs.readFileSync('src/components/AutoSchedulerModal.tsx', 'utf8');

const regex = /import React, { useState, useMemo, useEffect } from 'react';/;
code = code.replace(regex, `import React, { useState, useMemo, useEffect } from 'react';`);

fs.writeFileSync('src/components/AutoSchedulerModal.tsx', code);
