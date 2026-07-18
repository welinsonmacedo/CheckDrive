const fs = require('fs');
const file = 'src/modules/company/components/DriversTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change modal width
code = code.replace(
  'max-w-2xl bg-white rounded-2xl shadow-2xl p-8',
  'max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-4 sm:p-8'
);

// Fix inner grids
code = code.replace(/className="grid grid-cols-2 gap-4"/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap-4"');
code = code.replace(/className="grid grid-cols-2 gap-3 mt-2"/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"');

fs.writeFileSync(file, code);
