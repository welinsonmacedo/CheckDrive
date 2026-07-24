import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                  <div className="col-span-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Seguradora</span>
                    <span className="text-xs font-semibold text-slate-700">{insuranceName || (vehicle.insurance_id ? 'Vínculo Ativo' : 'Não informado')}</span>
                  </div>`;
                  
const replaceStr = `                  <div className="col-span-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Seguradora</span>
                    <span className="text-xs font-semibold text-slate-700">{insurance?.name || (vehicle.insurance_id ? 'Vínculo Ativo' : 'Não informado')}</span>
                    {insurance && (
                      <div className="mt-2 space-y-1">
                        {insurance.claims_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Sinistro:</span> {insurance.claims_phone}
                          </div>
                        )}
                        {insurance.support_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Assistência:</span> {insurance.support_phone}
                          </div>
                        )}
                        {insurance.broker_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Corretor:</span> {insurance.broker_phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched insurance render.");
} else {
  console.log("Could not find target string.");
}
