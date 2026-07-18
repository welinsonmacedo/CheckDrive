const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Deduplicate render
code = code.replace(
  '{activeTab === "my_drivers" && <MyDrivers />}\n              {activeTab === "my_drivers" && <MyDrivers />}',
  '{activeTab === "my_drivers" && <MyDrivers />}'
);

// Deduplicate navItem
const duplicateNav = `{
      id: "my_drivers",
      icon: Users,
      label: "Meus Motoristas",
      color: "from-amber-500 to-yellow-500",
    },
    {
      id: "my_drivers",
      icon: Users,
      label: "Meus Motoristas",
      color: "from-amber-500 to-yellow-500",
    },`;
const singleNav = `{
      id: "my_drivers",
      icon: Users,
      label: "Meus Motoristas",
      color: "from-amber-500 to-yellow-500",
    },`;
code = code.replace(duplicateNav, singleNav);

fs.writeFileSync(file, code);
