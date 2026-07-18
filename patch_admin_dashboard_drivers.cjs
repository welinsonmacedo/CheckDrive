const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add import
code = code.replace(
  'import MyVehicles from "@/src/modules/driver/pages/MyVehicles";',
  'import MyVehicles from "@/src/modules/driver/pages/MyVehicles";\nimport MyDrivers from "@/src/modules/driver/pages/MyDrivers";'
);

// Add to navItems (next to my_vehicles)
const navItemTarget = `{
      id: "my_vehicles",
      icon: Truck,
      label: "Meus Veículos",
      color: "from-teal-500 to-green-500",
    },`;
const navItemReplacement = `{
      id: "my_vehicles",
      icon: Truck,
      label: "Meus Veículos",
      color: "from-teal-500 to-green-500",
    },
    {
      id: "my_drivers",
      icon: Users,
      label: "Meus Motoristas",
      color: "from-amber-500 to-yellow-500",
    },`;

code = code.replace(navItemTarget, navItemReplacement);

// Add component to render block
const renderTarget = `{activeTab === "my_vehicles" && <MyVehicles />}`;
const renderReplacement = `{activeTab === "my_vehicles" && <MyVehicles />}\n              {activeTab === "my_drivers" && <MyDrivers />}`;

code = code.replace(renderTarget, renderReplacement);

fs.writeFileSync(file, code);
