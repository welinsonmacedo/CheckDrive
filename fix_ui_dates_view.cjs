const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                  {issue.resolution_type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {issue.resolution_type}
                                    </span>
                                  )}
                                </div>`;

const replacement = `                                  {issue.resolution_type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {issue.resolution_type}
                                    </span>
                                  )}
                                  {(issue.maintenance_start_date || issue.maintenance_end_date) && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">
                                      {issue.maintenance_start_date ? new Date(issue.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'} 
                                      {' a '} 
                                      {issue.maintenance_end_date ? new Date(issue.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'}
                                    </span>
                                  )}
                                </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed UI dates view');
