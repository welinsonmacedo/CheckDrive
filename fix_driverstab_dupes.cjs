const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/DriversTab.tsx', 'utf8');

content = content.replace(
  'isAuthUser: true,\\n        cnhNumber: "",\\n        cnhCategory: "",\\n        cnhExpirationDate: "",\\n        cnhFirstDate: "",\\n        photoUrl: "",\\n        docCnhUrl: "",',
  'isAuthUser: true'
);

fs.writeFileSync('src/modules/company/components/DriversTab.tsx', content);
