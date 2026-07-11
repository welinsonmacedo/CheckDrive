const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `ADD COLUMN IF NOT EXISTS resolution_comments JSONB;\`}`;
const replacement = `ADD COLUMN IF NOT EXISTS resolution_comments JSONB,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('corretiva', 'preventiva'));\`}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed SQL snippet');
