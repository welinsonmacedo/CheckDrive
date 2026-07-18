const fs = require('fs');
const file = 'src/modules/company/components/VehiclesTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/className="grid grid-cols-2 md:grid-cols-4 gap-4"/g, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"');
code = code.replace(/className="grid grid-cols-2 sm:grid-cols-3 gap-6/g, 'className="grid grid-cols-1 sm:grid-cols-3 gap-6');
code = code.replace(/className="grid grid-cols-2 sm:grid-cols-4 gap-3/g, 'className="grid grid-cols-1 sm:grid-cols-4 gap-3');

fs.writeFileSync(file, code);
