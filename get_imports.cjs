const fs = require('fs');
const content = fs.readFileSync('src/modules/company/pages/AdminDashboard.tsx', 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(0, 10).join('\n'));
