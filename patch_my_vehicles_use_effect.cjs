const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{\n    fetchData\(\);\n  \}, \[\]\);/,
  "useEffect(() => {\n    if (user?.company_id) fetchData();\n  }, [user?.company_id]);"
);

fs.writeFileSync(file, code);
