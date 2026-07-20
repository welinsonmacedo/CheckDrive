const fs = require('fs');
console.log(fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8').includes('Descrição do Defeito</th>\\n'));
