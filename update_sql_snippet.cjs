const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `ADD COLUMN IF NOT EXISTS resolution_comments JSONB,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('corretiva', 'preventiva'));\`}`;

const replacement = `ADD COLUMN IF NOT EXISTS resolution_comments JSONB,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('corretiva', 'preventiva')),
ADD COLUMN IF NOT EXISTS maintenance_start_date DATE,
ADD COLUMN IF NOT EXISTS maintenance_end_date DATE;\`}`;

content = content.replace(target, replacement);

const targetCatch = `          err.message.includes("Could not find the 'resolution_type' column") ||
          err.message.includes('column "resolution_type" of relation "checklist_issues" does not exist') ||
          err.message.includes(
            'column "resolution_nf" of relation "checklist_issues" does not exist',
          ))
      ) {`;

const replaceCatch = `          err.message.includes("Could not find the 'resolution_type' column") ||
          err.message.includes('column "resolution_type" of relation "checklist_issues" does not exist') ||
          err.message.includes("Could not find the 'maintenance_start_date' column") ||
          err.message.includes('column "maintenance_start_date" of relation "checklist_issues" does not exist') ||
          err.message.includes(
            'column "resolution_nf" of relation "checklist_issues" does not exist',
          ))
      ) {`;

content = content.replace(targetCatch, replaceCatch);

fs.writeFileSync(file, content);
console.log('Updated SQL snippet');
