const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /\(v\.vehicles\?\.plate\?\.toLowerCase\(\)\.includes/g,
  '(v.vehicles?.plate?.toLowerCase()?.includes'
);
code = code.replace(
  /\(v\.trailers\?\.plate\?\.toLowerCase\(\)\.includes/g,
  '(v.trailers?.plate?.toLowerCase()?.includes'
);
code = code.replace(
  /\(v\.item_title\?\.toLowerCase\(\)\.includes/g,
  '(v.item_title?.toLowerCase()?.includes'
);
code = code.replace(
  /\(v\.resolution_notes\?\.toLowerCase\(\)\.includes/g,
  '(v.resolution_notes?.toLowerCase()?.includes'
);

fs.writeFileSync(file, code);
console.log('Fixed optional chaining in filter');
