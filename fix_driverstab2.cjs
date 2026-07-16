const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/DriversTab.tsx', 'utf8');
content = content.replace(
  'cnhNumber: "",\\n        cnhCategory: "",\\n        cnhExpirationDate: "",\\n        cnhFirstDate: "",\\n        photoUrl: "",\\n        docCnhUrl: "",',
  ''
);

fs.writeFileSync('src/modules/company/components/DriversTab.tsx', content);
