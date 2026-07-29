const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  /const getPriorityBorder = \(priority: string\) => \{[\s\S]*?  \};\n\n/,
  ''
);

code = code.replace(
  /\$\{getPriorityBorder\(issue\.priority\)\}/g,
  ''
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
