const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

// Remove the Plus buttons block
const targetButtons = `<div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { setFormType("vehicle"); setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", renavam: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" }); setIsFormOpen(true); }} className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm">
              <Plus size={14}/> Veículo
            </button>
            <button onClick={() => { setFormType("trailer"); setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", renavam: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" }); setIsFormOpen(true); }} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm">
              <Plus size={14}/> Reboque
            </button>
          </div>`;

code = code.replace(targetButtons, '');

fs.writeFileSync(file, code);
