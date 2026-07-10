const fs = require('fs');

const uiReplacement = `
            {/* 6. REPORT TYPE: SCHEDULES */}
            {activeReport === "schedules" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full max-w-sm relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por motorista ou placa..."
                      value={schedulesSearchTerm}
                      onChange={(e) => setSchedulesSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
`;

const mapReplacement = `
                        {schedulesData.length === 0 ? (
`;

const mapFixed = `
                        {schedulesData.filter((sch: any) => {
                            const term = schedulesSearchTerm.toLowerCase();
                            const driver = (sch.profiles?.full_name || "").toLowerCase();
                            const plate = (sch.vehicles?.plate || "").toLowerCase();
                            return driver.includes(term) || plate.includes(term);
                          }).length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                              >
                                Nenhuma escala encontrada
                              </td>
                            </tr>
                          ) : (
                            schedulesData
                              .filter((sch: any) => {
                                const term = schedulesSearchTerm.toLowerCase();
                                const driver = (sch.profiles?.full_name || "").toLowerCase();
                                const plate = (sch.vehicles?.plate || "").toLowerCase();
                                return driver.includes(term) || plate.includes(term);
                              })
                              .map((sch: any) => (
`;

const file1 = 'src/modules/company/components/ReportsTab.tsx';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace(
  /\{\/\* 6\. REPORT TYPE: SCHEDULES \*\/\}[\s\S]*?<div className="bg-white rounded-2xl border border-gray-200\/80 shadow-sm overflow-hidden flex flex-col">/,
  uiReplacement
);

content1 = content1.replace(
  /\{schedulesData\.length === 0 \? \([\s\S]*?schedulesData\.map\(\(sch: any\) => \(/,
  mapFixed
);

fs.writeFileSync(file1, content1);

const file2 = 'src/components/admin/ReportsTab.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  /\{\/\* 6\. REPORT TYPE: SCHEDULES \*\/\}[\s\S]*?<div className="bg-white rounded-2xl border border-gray-200\/80 shadow-sm overflow-hidden flex flex-col">/,
  uiReplacement
);

content2 = content2.replace(
  /\{schedulesData\.length === 0 \? \([\s\S]*?schedulesData\.map\(\(sch: any\) => \(/,
  mapFixed
);

fs.writeFileSync(file2, content2);
console.log("Schedules UI updated.");
