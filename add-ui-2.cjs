const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

const newContent = `
            {/* 1.5 REPORT TYPE: PENDING BY PLATE */}
            {activeReport === "pending_by_plate" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full max-w-sm relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por placa..."
                      value={pendingByPlateSearchTerm}
                      onChange={(e) => setPendingByPlateSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50/50 text-gray-500 font-bold text-[10px] uppercase tracking-wider print:bg-white print:text-black">
                        <tr>
                          <th className="px-5 py-4 border-b border-gray-200">Placa</th>
                          <th className="px-5 py-4 border-b border-gray-200">Quantidade de Defeitos</th>
                          <th className="px-5 py-4 border-b border-gray-200">Defeitos / Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 print:divide-black">
                        {pendingByPlateData
                          .filter((group) =>
                            group.plate.toLowerCase().includes(pendingByPlateSearchTerm.toLowerCase())
                          )
                          .map((group, idx) => (
                            <tr
                              key={group.plate}
                              className="hover:bg-gray-50/50 transition-colors print:break-inside-avoid"
                            >
                              <td className="px-5 py-4 font-bold text-gray-900 align-top">
                                {group.plate}
                              </td>
                              <td className="px-5 py-4 font-medium text-gray-600 align-top">
                                {group.count}
                              </td>
                              <td className="px-5 py-4 align-top">
                                <ul className="space-y-2 list-disc pl-4 text-xs text-gray-600">
                                  {group.issues.map((issue: any) => (
                                    <li key={issue.id}>
                                      <strong className="text-gray-900">{issue.item_title}</strong>: {issue.notes || "Sem observações"}
                                      <span className="block text-[10px] text-gray-400 mt-0.5">
                                        Reportado em: {new Date(issue.created_at).toLocaleDateString("pt-BR")}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        {pendingByPlateData.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-5 py-12 text-center text-gray-400 font-medium bg-gray-50/50"
                            >
                              Nenhum defeito pendente encontrado no período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
`;

content = content.replace(
  '{/* 1. REPORT TYPE: DEFECTS */}',
  newContent + '\n            {/* 1. REPORT TYPE: DEFECTS */}'
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated UI part 2.");
