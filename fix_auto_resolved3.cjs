const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const isAutoResolved = !d.resolved_by || notesStr.includes("automaticamente pelo check list") || notesStr.includes("automaticamente");',
  'const isAutoResolved = !d.resolved_by || d.resolver?.role === "driver" || notesStr.includes("automaticamente pelo check list") || notesStr.includes("automaticamente");'
);

fs.writeFileSync(file, code);
console.log('Fixed auto resolved filter 3');
