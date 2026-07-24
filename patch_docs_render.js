import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                  <div className="flex flex-wrap gap-2">
                    {vehicle.doc_crlv_url && (
                      <a href={((vehicle.doc_crlv_url)?.startsWith('http') ? (vehicle.doc_crlv_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_crlv_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 CRLV</a>
                    )}
                    {vehicle.doc_antt_url && (
                      <a href={((vehicle.doc_antt_url)?.startsWith('http') ? (vehicle.doc_antt_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_antt_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 ANTT</a>
                    )}
                    {vehicle.doc_insurance_url && (
                      <a href={((vehicle.doc_insurance_url)?.startsWith('http') ? (vehicle.doc_insurance_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_insurance_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 Apólice Seguro</a>
                    )}
                    {!vehicle.doc_crlv_url && !vehicle.doc_antt_url && !vehicle.doc_insurance_url && (
                      <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                    )}`;

const replaceStr = `                  <div className="flex flex-wrap gap-2">
                    {vehicle.doc_crlv_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_crlv_url)?.startsWith('http') ? (vehicle.doc_crlv_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_crlv_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 CRLV</button>
                    )}
                    {vehicle.doc_antt_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_antt_url)?.startsWith('http') ? (vehicle.doc_antt_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_antt_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 ANTT</button>
                    )}
                    {vehicle.doc_insurance_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_insurance_url)?.startsWith('http') ? (vehicle.doc_insurance_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_insurance_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 Apólice Seguro</button>
                    )}
                    {!vehicle.doc_crlv_url && !vehicle.doc_antt_url && !vehicle.doc_insurance_url && (
                      <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                    )}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched docs render.");
} else {
  console.log("Could not find target string.");
}
