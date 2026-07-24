import fs from 'fs';
const content = fs.readFileSync('src/modules/company/components/FuelTab.tsx', 'utf8');
console.log(content.length);
