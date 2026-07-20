const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace('mappedData = groupResolvedIssues(mappedData);', '// mappedData = groupResolvedIssues(mappedData);');

fs.writeFileSync(file, code);
