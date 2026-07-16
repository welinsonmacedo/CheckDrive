const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/InventoryTab.tsx', 'utf8');

// 1. Add Data de Emissão in the NF Form Modal
const dateInput = `
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Data Emissão</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={nfForm.date}
                    onChange={(e) => setNfForm({...nfForm, date: e.target.value})}
                  />
                </div>
`;

content = content.replace(
  '<div className="md:col-span-2">\\n                  <label className="block text-xs font-bold text-zinc-700 mb-1">Chave de Acesso (NF-e)</label>',
  dateInput + '\n                <div className="md:col-span-2">\n                  <label className="block text-xs font-bold text-zinc-700 mb-1">Chave de Acesso (NF-e)</label>'
);

// 2. Add columns to the Transactions table
content = content.replace(
  '<th className="px-6 py-3">Fornecedor</th>',
  '<th className="px-6 py-3">Fornecedor</th>\n                    <th className="px-6 py-3">NF-e</th>'
);

content = content.replace(
  '<td className="px-6 py-3 text-xs text-zinc-600">{t.inventory_suppliers?.name || t.nf_number || \'-\'}</td>',
  `<td className="px-6 py-3 text-xs text-zinc-600">{t.inventory_suppliers?.name || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">
                        {t.nf_number ? <span className="font-bold text-zinc-800">NF: {t.nf_number}</span> : '-'}<br/>
                        {t.date ? <span className="text-[10px]">Emi: {new Date(t.date).toLocaleDateString('pt-BR')}</span> : ''}
                        {t.nf_key ? <div className="text-[9px] truncate max-w-[150px]" title={t.nf_key}>{t.nf_key}</div> : ''}
                      </td>`
);

// Let's also fix the number of columns in the empty state
content = content.replace(
  '<td colSpan={6} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>',
  '<td colSpan={7} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>'
);

fs.writeFileSync('src/modules/company/components/InventoryTab.tsx', content);
