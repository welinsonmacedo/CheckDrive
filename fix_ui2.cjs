const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/AveragesTab.tsx', 'utf8');
const regex = /<th className="py-3 px-4 text-left">Motorista<\/th>\s*<th className="py-3 px-4 text-left">Km Inicial \/ Final<\/th>/;
content = content.replace(
  regex,
  '<th className="py-3 px-4 text-left">Motorista</th>\\n                    <th className="py-3 px-4 text-left">Rota</th>\\n                    <th className="py-3 px-4 text-left">Km Inicial / Final</th>'
);

fs.writeFileSync('src/modules/company/components/AveragesTab.tsx', content);
