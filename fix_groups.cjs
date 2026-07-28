const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  'if (issue.status === "pending") {',
  'if (issue.status?.toLowerCase().trim() === "pending") {'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
