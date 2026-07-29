const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

const statusInput = `
                  {/* Status */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Status da Infração
                    </label>
                    <select
                      value={formData.status || "pending"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Resolvida (Paga)</option>
                    </select>
                  </div>
`;

code = code.replace(
  /\{\/\* Endereço \*\/\}/,
  statusInput + '\n                  {/* Endereço */}'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
