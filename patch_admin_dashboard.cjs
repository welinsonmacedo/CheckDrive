const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add import
code = code.replace(
  'import InsurancesTab from "@/src/modules/company/components/InsurancesTab";',
  'import InsurancesTab from "@/src/modules/company/components/InsurancesTab";\nimport MyVehicles from "@/src/modules/driver/pages/MyVehicles";'
);

// Add to navItems
const navItemTarget = `{
      id: "tracking",
      icon: Navigation,
      label: "Monitoramento",
      color: "from-emerald-500 to-teal-500",
    },`;
const navItemReplacement = `{
      id: "tracking",
      icon: Navigation,
      label: "Monitoramento",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "my_vehicles",
      icon: Truck,
      label: "Meus Veículos",
      color: "from-teal-500 to-green-500",
    },`;

code = code.replace(navItemTarget, navItemReplacement);

// Add component to render block
const renderTarget = `{activeTab === "vehicles" && <VehiclesTab />}`;
const renderReplacement = `{activeTab === "vehicles" && <VehiclesTab />}\n              {activeTab === "my_vehicles" && <MyVehicles />}`;

code = code.replace(renderTarget, renderReplacement);

fs.writeFileSync(file, code);
