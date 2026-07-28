const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

code = code.replace(
  /<th className="px-6 py-4 font-medium">Valores<\/th>/,
  '<th className="px-6 py-4 font-medium">Status</th>\n                    <th className="px-6 py-4 font-medium">Valores</th>'
);
code = code.replace(
  /colSpan=\{5\}/,
  'colSpan={6}'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
