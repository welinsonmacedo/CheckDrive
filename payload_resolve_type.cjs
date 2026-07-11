const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/resolution_notes: resolveNotes,/g, 'resolution_notes: resolveNotes,\n                resolution_type: resolveType || null,');

fs.writeFileSync(file, content);
console.log('Added resolution_type to payload');
