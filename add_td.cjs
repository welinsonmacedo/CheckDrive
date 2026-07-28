const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

const statusTd = `
                        </td>
                        <td className="px-6 py-4">
                          <span className={\`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider \${
                            inf.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }\`}>
                            {inf.status === "paid" ? "Paga" : "Pendente"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-zinc-900">
`;

code = code.replace(
  /<\/td>\n\s*<td className="px-6 py-4">\n\s*<div className="text-sm font-bold text-zinc-900">\n\s*\{new Intl\.NumberFormat\(/,
  statusTd + '                            {new Intl.NumberFormat('
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
