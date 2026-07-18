const fs = require('fs');
const file = 'src/modules/driver/routes/DriverRoutes.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import DriverLayout from '../layouts/DriverLayout';",
  "import DriverLayout from '../layouts/DriverLayout';\nimport MyVehicles from '../pages/MyVehicles';"
);

code = code.replace(
  `<Route path="home" element={<DriverHome />} />`,
  `<Route path="home" element={<DriverHome />} />\n        <Route path="vehicles" element={<MyVehicles />} />`
);

fs.writeFileSync(file, code);
