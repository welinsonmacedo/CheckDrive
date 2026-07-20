const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/d\.cost/g, 'd.resolution_value');
code = code.replace(/curr\.cost/g, 'curr.resolution_value');
code = code.replace(/v\.cost/g, 'v.resolution_value');

fs.writeFileSync(file, code);
console.log('Fixed cost field');
