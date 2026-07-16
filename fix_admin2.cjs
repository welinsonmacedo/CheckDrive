const fs = require('fs');
let content = fs.readFileSync('src/modules/company/pages/AdminDashboard.tsx', 'utf8');

const regex = /checklist_submissions\([\s\S]*?created_at\)\.eq\("company_id", \(user as any\)\?\.company_id\),/m;

content = content.replace(regex, 'checklist_submissions(\\n            status,\\n            details,\\n            created_at\\n          ),');

content = content.replace(
  '        .limit(5);',
  '        .eq("company_id", (user as any)?.company_id)\\n        .limit(5);'
);

fs.writeFileSync('src/modules/company/pages/AdminDashboard.tsx', content);
