const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        .update({
          status: "pending",
          resolution_notes: null,
          resolved_at: null,
          resolved_by: null,
        })`;

const replacement = `        .update({
          status: "pending",
          resolution_notes: null,
          resolution_type: null,
          resolved_at: null,
          resolved_by: null,
        })`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed revert modal');
