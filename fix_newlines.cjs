const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/AveragesTab.tsx', 'utf8');
content = content.replace(/\\n                    <th className="py-3 px-4 text-left">Rota<\/th>\\n/g, '\n                    <th className="py-3 px-4 text-left">Rota</th>\n');
fs.writeFileSync('src/modules/company/components/AveragesTab.tsx', content);
