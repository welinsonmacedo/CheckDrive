const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const tablePortion = code.substring(code.indexOf('<th className="px-5 py-4 border-b border-gray-200">Data Resolução</th>'), code.indexOf('<th className="px-5 py-4 border-b border-gray-200 text-right">Custo</th>'));
console.log(tablePortion);
