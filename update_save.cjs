const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

code = code.replace(
  /address: formData\.address \|\| null,/,
  'address: formData.address || null,\n        status: formData.status || "pending",'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
