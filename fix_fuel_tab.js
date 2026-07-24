import fs from 'fs';
const file = 'src/modules/company/components/FuelTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("user?.full_name || 'Usuário'", "user?.user_metadata?.full_name || user?.email || 'Usuário'");

fs.writeFileSync(file, content);
console.log("Fixed user full_name error.");
