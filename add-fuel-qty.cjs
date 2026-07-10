const fs = require('fs');

const file1 = 'src/modules/company/components/ReportsTab.tsx';
let content1 = fs.readFileSync(file1, 'utf8');

const replacement = `                                  sch.fuel_check ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest w-fit">
                                        <CheckCircle2 size={12} />
                                        Realizado
                                      </span>
                                      {sch.fuel_check.details && (
                                        <span className="text-[10px] text-gray-500 font-medium">
                                          Qtd: {(() => {
                                            const details = sch.fuel_check.details;
                                            let liters = 0;
                                            if (details?.itemValues && details?.itemTitles) {
                                              const entry = Object.entries(details.itemTitles).find(([_, title]) => {
                                                const t = String(title).toLowerCase();
                                                return t.includes('litro') || t.includes('quantidade') || t.includes('lts');
                                              });
                                              if (entry) {
                                                liters = parseFloat(String(details.itemValues[entry[0]]).replace(',','.'));
                                              }
                                            } else if (details?.manual_liters !== undefined && details?.manual_liters !== null) {
                                              liters = parseFloat(String(details.manual_liters).replace(',', '.'));
                                            } else if (details?.adjusted_liters !== undefined && details?.adjusted_liters !== null && details.adjusted_liters !== '') {
                                              liters = parseFloat(String(details.adjusted_liters).replace(',', '.'));
                                            }
                                            return liters && !isNaN(liters) ? \`\${liters.toLocaleString('pt-BR')} L\` : "-";
                                          })()}
                                        </span>
                                      )}
                                    </div>
                                  )`;

content1 = content1.replace(
  `                                  sch.fuel_check ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                                      <CheckCircle2 size={12} />
                                      Realizado
                                    </span>
                                  )`,
  replacement
);

fs.writeFileSync(file1, content1);

console.log("Fuel quantity added.");
