const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /v\.plate\?\.toLowerCase\(\)\.includes/g,
  'v.plate?.toLowerCase()?.includes'
);

fs.writeFileSync(file, code);
console.log('Fixed fleet_age filter');
