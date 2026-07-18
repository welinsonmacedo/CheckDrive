const fs = require('fs');

const routeFile = 'src/modules/driver/routes/DriverRoutes.tsx';
let rCode = fs.readFileSync(routeFile, 'utf8');
rCode = rCode.replace(/import MyVehicles from '\.\.\/pages\/MyVehicles';\\n/, '');
rCode = rCode.replace(/<Route path="vehicles" element=\{<MyVehicles \/>\} \/>\\n\s*/, '');
fs.writeFileSync(routeFile, rCode);

const layoutFile = 'src/modules/driver/layouts/DriverLayout.tsx';
let lCode = fs.readFileSync(layoutFile, 'utf8');
lCode = lCode.replace(/import \{ Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell, Truck \} from 'lucide-react';/, "import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell } from 'lucide-react';");

const targetLink = /<Link\s+to="\/driver\/vehicles"[\s\S]*?<\/Link>/;
lCode = lCode.replace(targetLink, '');
fs.writeFileSync(layoutFile, lCode);
