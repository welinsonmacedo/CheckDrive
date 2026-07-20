const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'resolver:profiles!checklist_issues_resolved_by_fkey(full_name)',
  'resolver:profiles!checklist_issues_resolved_by_fkey(full_name, role)'
);

fs.writeFileSync(file, code);
console.log('Fixed query select');
