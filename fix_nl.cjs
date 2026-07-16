const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/AveragesTab.tsx', 'utf8');
content = content.replace(/\\n/g, '\n');
fs.writeFileSync('src/modules/company/components/AveragesTab.tsx', content);
