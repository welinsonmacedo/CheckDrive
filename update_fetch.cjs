const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  /supabase\.from\("checklist_items"\)\.select\("title"\)/g,
  'supabase.from("checklist_items").select("title, priority")'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
