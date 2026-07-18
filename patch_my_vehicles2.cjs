const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove Edit and Status Toggle buttons block
const buttonsBlock = `                  <button onClick={() => { 
                    setFormType(currentItem.itemType); setItemForm({ ...currentItem, photo_front_url: currentItem.photo_front_url || "", photo_right_url: currentItem.photo_right_url || "", photo_left_url: currentItem.photo_left_url || "", photo_rear_url: currentItem.photo_rear_url || "", doc_crlv_url: currentItem.doc_crlv_url || "", doc_antt_url: currentItem.doc_antt_url || "", doc_insurance_url: currentItem.doc_insurance_url || "" }); setIsFormOpen(true);
                  }} className={\`\${currentItem.itemType === 'vehicle' ? 'flex-1' : 'w-full'} h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors\`}>
                    <Edit2 size={16}/> Editar
                  </button>
                  <button onClick={() => toggleStatus(currentItem.itemType === 'vehicle' ? "vehicles" : "trailers", currentItem.id, currentItem.active !== false)} className={\`w-12 h-12 flex items-center justify-center rounded-xl transition-colors \${currentItem.active !== false ? "bg-red-50 text-danger hover:bg-red-100" : "bg-green-50 text-success hover:bg-green-100"}\`} title={currentItem.active !== false ? "Desabilitar" : "Habilitar"}>
                    {currentItem.active !== false ? <X size={18}/> : <CheckCircle2 size={18}/>}
                  </button>`;

code = code.replace(buttonsBlock, '');

// Also remove the form
const formRegex = /\{isFormOpen && \([\s\S]*?\)\}/;
code = code.replace(formRegex, '');

fs.writeFileSync(file, code);
