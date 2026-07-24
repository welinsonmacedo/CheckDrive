import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">ANTT</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.antt || 'Não informado'}</span>
                  </div>`;
                  
const replaceStr = `                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">ANTT</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.antt || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Último KM (Checklist)</span>
                    <span className="text-xs font-semibold text-slate-700 font-mono">
                      {submissions[0]?.odometer ? Number(submissions[0].odometer).toLocaleString("pt-BR") : 'Não informado'}
                    </span>
                  </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched last km.");
} else {
  console.log("Could not find target string.");
}
