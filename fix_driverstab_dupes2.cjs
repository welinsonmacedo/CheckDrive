const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/DriversTab.tsx', 'utf8');

const regex = /isAuthUser: true,[\s]*cnhNumber: "",[\s]*cnhCategory: "",[\s]*cnhExpirationDate: "",[\s]*cnhFirstDate: "",[\s]*photoUrl: "",[\s]*docCnhUrl: "",/g;
content = content.replace(regex, 'isAuthUser: true,');

fs.writeFileSync('src/modules/company/components/DriversTab.tsx', content);
