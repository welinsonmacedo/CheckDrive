const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                        <div>
                          <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                            Observação Principal / Memorando
                          </label>`;

const replacement = `                        {resolveSubStatus === "resolved" && (
                          <div>
                            <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                              Tipo de Manutenção *
                            </label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="resolveType"
                                  value="corretiva"
                                  checked={resolveType === "corretiva"}
                                  onChange={(e) => setResolveType("corretiva")}
                                  className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-semibold text-zinc-800">Corretiva</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="resolveType"
                                  value="preventiva"
                                  checked={resolveType === "preventiva"}
                                  onChange={(e) => setResolveType("preventiva")}
                                  className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-semibold text-zinc-800">Preventiva</span>
                              </label>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                            Observação Principal / Memorando
                          </label>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Added UI for resolveType');
