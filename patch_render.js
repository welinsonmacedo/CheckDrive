import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `              {/* Grid split for Issues and Submissions */}`;
const replacementStr = `              {/* Alerts Block */}
              {alerts.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500 mt-[-2px] animate-pulse" />
                      Próximos Alertas
                    </h3>
                    <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                      {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col hover:border-orange-200 transition-all shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 mb-3 truncate" title={alert.title}>
                          {alert.title}
                        </h4>
                        
                        <div className="mt-auto flex flex-col gap-2">
                          {alert.trigger_type === "km" && (
                            <div className="flex flex-col text-[10px] text-slate-500 space-y-1">
                              <div className="flex justify-between items-center">
                                <span>Última Execução/KM:</span>
                                <span className="font-mono font-medium text-slate-700">
                                  {Number(alert.last_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Intervalo:</span>
                                <span className="font-mono font-medium text-slate-700">
                                  a cada {Number(alert.interval_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded-lg text-orange-700 mt-1">
                                <span className="font-bold">Aviso próximo de:</span>
                                <span className="font-mono font-black">
                                  {Number(alert.last_km + alert.interval_km - alert.warning_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          )}
                          {alert.trigger_type === "date" && (
                            <div className="flex flex-col text-[10px] text-slate-500 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Data Alvo/Vencimento:</span>
                                <span className="font-mono font-black text-orange-600">
                                  {alert.trigger_date.split("-").reverse().join("/")}
                                </span>
                              </div>
                              {alert.warning_days && (
                                <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded-lg text-orange-700 mt-1">
                                  <span className="font-bold">Avisar com antecedência de:</span>
                                  <span className="font-mono">
                                    {alert.warning_days} dias
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid split for Issues and Submissions */}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched render.");
} else {
  console.log("Could not find target string.");
}
