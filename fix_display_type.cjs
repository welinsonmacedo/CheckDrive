const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                                  <CheckCircle size={14} />
                                  Resolvido
                                </div>`;

const replacement = `                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                                    <CheckCircle size={14} />
                                    Resolvido
                                  </div>
                                  {issue.resolution_type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {issue.resolution_type}
                                    </span>
                                  )}
                                </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed display type');
