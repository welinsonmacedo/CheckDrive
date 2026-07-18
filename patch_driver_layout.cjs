const fs = require('fs');
const file = 'src/modules/driver/layouts/DriverLayout.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell } from 'lucide-react';",
  "import { Home, Trophy, AlertTriangle, User as UserIcon, Droplets, Bell, Truck } from 'lucide-react';"
);

const newLink = `          </Link>

          <Link
            to="/driver/vehicles"
            className={\`flex flex-col items-center gap-1 transition-colors \${
              location.pathname.includes('/driver/vehicles') ? 'text-primary' : 'text-zinc-400'
            }\`}
          >
            <Truck size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Veículos
            </span>
          </Link>`;

code = code.replace("          </Link>", newLink);

fs.writeFileSync(file, code);
