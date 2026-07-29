const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  'Nenhuma pendência identificada (Total no DB: {issues.length}).',
  'Nenhuma pendência crítica identificada.'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
