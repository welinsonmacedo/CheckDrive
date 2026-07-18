const fs = require('fs');
const file = 'src/modules/driver/pages/MyDrivers.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{\n    fetchUsers\(\);\n  \}, \[\]\);/,
  "useEffect(() => {\n    if (user?.company_id) fetchUsers();\n  }, [user?.company_id]);"
);

fs.writeFileSync(file, code);
