const fs = require('fs');
let content = fs.readFileSync('src/modules/company/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  'checklist_submissions(\\n            status,\\n            details,\\n            created_at).eq("company_id", (user as any)?.company_id),',
  'checklist_submissions(\\n            status,\\n            details,\\n            created_at\\n          ),'
);

// We need to make sure the vehicles query has the eq on the outside
// It might already have it or we can just append it:
content = content.replace(
  'const { data: vehicles } = await supabase.from("vehicles").select(`',
  'const { data: vehicles } = await supabase.from("vehicles").select(`'
);

fs.writeFileSync('src/modules/company/pages/AdminDashboard.tsx', content);
