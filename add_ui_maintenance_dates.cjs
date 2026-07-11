const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                <span className="text-sm font-semibold text-zinc-800">Preventiva</span>
                              </label>
                            </div>
                          </div>
                        )}`;

const replacement = `                                <span className="text-sm font-semibold text-zinc-800">Preventiva</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {(resolveSubStatus === "resolved" || resolveSubStatus === "waiting") && (
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                                Data Início Manutenção
                              </label>
                              <input
                                type="date"
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveStartDate}
                                onChange={(e) => setResolveStartDate(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                                Data Fim Manutenção
                              </label>
                              <input
                                type="date"
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveEndDate}
                                onChange={(e) => setResolveEndDate(e.target.value)}
                              />
                            </div>
                          </div>
                        )}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Added UI for maintenance dates');
