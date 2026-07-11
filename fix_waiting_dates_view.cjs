const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                  {issue.resolution_notes}
                                </div>`;

const replacement = `                                  {issue.resolution_notes}
                                </div>
                                {(issue.maintenance_start_date || issue.maintenance_end_date) && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200 bg-amber-100 text-amber-800">
                                      {issue.maintenance_start_date ? new Date(issue.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'} 
                                      {' a '} 
                                      {issue.maintenance_end_date ? new Date(issue.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'}
                                    </span>
                                  </div>
                                )}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed waiting dates view');
