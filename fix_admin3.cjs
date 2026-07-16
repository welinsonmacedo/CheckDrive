const fs = require('fs');
let content = fs.readFileSync('src/modules/company/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(/\\\\n/g, '\n');

fs.writeFileSync('src/modules/company/pages/AdminDashboard.tsx', content);
