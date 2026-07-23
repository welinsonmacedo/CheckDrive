const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

content = content.replace(
  `"resolved" | "waiting"`,
  `"resolved" | "waiting" | "waiting_nf"`
);

// We need to fix the update logic to handle `waiting_nf` by setting status to `resolved` and appending `[AGUARDANDO_NF] `
// Actually, it's safer to edit via edit_file to do this precisely.
