const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);

code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);
code = code.replace(
  '.eq("company_id", companyId)',
  '.eq("company_id", (user as any)?.company_id)'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
