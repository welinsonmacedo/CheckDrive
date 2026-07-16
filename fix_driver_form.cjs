const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/DriversTab.tsx', 'utf8');
content = content.replace(
  'setUserForm({\\n      id: "",\\n      fullName: "",\\n      email: "",\\n      cpf: "",\\n      role: "driver",\\n      password: "",\\n      driverType: "Interno/Pátio",\\n      participatesInRanking: true,\\n      modalityIds: [],\\n      scoreProfileId: "",\\n      isAuthUser: true,\\n    });',
  'setUserForm({\\n      id: "",\\n      fullName: "",\\n      email: "",\\n      cpf: "",\\n      cnhNumber: "",\\n      cnhCategory: "",\\n      cnhExpirationDate: "",\\n      cnhFirstDate: "",\\n      photoUrl: "",\\n      docCnhUrl: "",\\n      role: "driver",\\n      password: "",\\n      driverType: "Interno/Pátio",\\n      participatesInRanking: true,\\n      modalityIds: [],\\n      scoreProfileId: "",\\n      isAuthUser: true,\\n    });'
);
fs.writeFileSync('src/modules/company/components/DriversTab.tsx', content);
