const fs = require('fs');
let file = 'src/components/admin/ReportsTab.tsx';

let content = fs.readFileSync(file, 'utf8');

// Header
content = content.replace(
  '<th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">\n                            KM Fim\n                          </th>',
  '<th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">\n                            KM Fim\n                          </th>\n                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">\n                            KM Rodado\n                          </th>'
);

// Body
content = content.replace(
  '<td className="px-5 py-4 text-xs font-mono font-bold text-gray-600">\n                                {sch.end_check?.odometer\n                                  ? `${sch.end_check.odometer.toLocaleString("pt-BR")} km`\n                                  : "-"}\n                              </td>',
  '<td className="px-5 py-4 text-xs font-mono font-bold text-gray-600">\n                                {sch.end_check?.odometer\n                                  ? `${sch.end_check.odometer.toLocaleString("pt-BR")} km`\n                                  : "-"}\n                              </td>\n                              <td className="px-5 py-4 text-xs font-mono font-bold text-indigo-600">\n                                {sch.start_check?.odometer && sch.end_check?.odometer && sch.end_check.odometer >= sch.start_check.odometer\n                                  ? `${(sch.end_check.odometer - sch.start_check.odometer).toLocaleString("pt-BR")} km`\n                                  : "-"}\n                              </td>'
);

content = content.replace(
  'colSpan={6}',
  'colSpan={7}'
);

fs.writeFileSync(file, content);
console.log("KM Rodado added to admin.");
