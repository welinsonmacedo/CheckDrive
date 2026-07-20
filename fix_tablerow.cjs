const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<th className="px-5 py-4 border-b border-gray-200 text-center">Resolvido Por</th>',
  '<th className="px-5 py-4 border-b border-gray-200">Descrição do Defeito</th>\\n                          <th className="px-5 py-4 border-b border-gray-200 text-center">Resolvido Por</th>'
);

code = code.replace(
  '<th className="px-5 py-4 border-b border-gray-200 text-center">Observação</th>',
  '<th className="px-5 py-4 border-b border-gray-200 text-center">Observação da Resolução</th>'
);

const tdReplaceTarget = '<td className="px-5 py-4 text-center text-xs font-bold text-gray-600">\\n                                {v.resolver?.full_name || "Sistema"}\\n                              </td>';

code = code.replace(
  tdReplaceTarget,
  '<td className="px-5 py-4 text-xs font-medium text-gray-600 whitespace-normal min-w-[200px] max-w-xs">\\n                                {v.description || "-"}\\n                              </td>\\n                              <td className="px-5 py-4 text-center text-xs font-bold text-gray-600">\\n                                {v.resolver?.full_name || "Sistema"}\\n                              </td>'
);

fs.writeFileSync(file, code);
