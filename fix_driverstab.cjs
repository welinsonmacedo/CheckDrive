const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/DriversTab.tsx', 'utf8');
content = content.replace(
  "modalityIds: [],",
  "modalityIds: [] as string[],"
);
fs.writeFileSync('src/modules/company/components/DriversTab.tsx', content);
