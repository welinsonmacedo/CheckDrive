const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<th className="px-5 py-4 border-b border-gray-200">Descrição do Defeito</th>\n                          <th className="px-5 py-4 border-b border-gray-200">Descrição do Defeito</th>',
  '<th className="px-5 py-4 border-b border-gray-200">Descrição do Defeito</th>'
);

code = code.replace(
  /<td className="px-5 py-4 text-xs font-medium text-gray-600 whitespace-normal min-w-\[200px\] max-w-xs\">\s*\{v\.description \|\| "-"\}\s*<\/td>\s*<td className="px-5 py-4 text-xs font-medium text-gray-600 whitespace-normal min-w-\[200px\] max-w-xs\">\s*\{v\.description \|\| "-"\}\s*<\/td>/g,
  '<td className="px-5 py-4 text-xs font-medium text-gray-600 whitespace-normal min-w-[200px] max-w-xs">\n                                {v.description || "-"}\n                              </td>'
);

fs.writeFileSync(file, code);
