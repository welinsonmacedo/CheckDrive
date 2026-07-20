const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const newLines = [...lines.slice(0, 708), ...lines.slice(1412)];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed lines');
