const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  'Acompanhamento de Manutenções (DEBUG: {issues.length} pendências)',
  'Acompanhamento de Manutenções'
);

code = code.replace(
  'Nenhuma pendência crítica identificada.',
  'Nenhuma pendência identificada (Total no DB: {issues.length}).'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
