import fs from 'fs';
const file = 'src/modules/company/components/VehiclesTab.tsx';
const content = fs.readFileSync(file, 'utf8');
console.log(content.match(/vehicle\.(\w+)/g));
