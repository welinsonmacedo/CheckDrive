const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the return block
const returnIndex = code.indexOf('  return (');
if (returnIndex !== -1) {
    const newRender = `  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Veículos</h2>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
          <input 
            type="text" 
            placeholder="Filtrar placa ou modelo..." 
            className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-80 border border-app-border" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-text-muted font-bold text-xs bg-app-bg rounded-2xl border border-app-border">
          Nenhum veículo ou reboque encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div key={item.id} className="bento-card p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4">
                <div className="aspect-video w-full rounded-2xl bg-slate-100 border border-app-border overflow-hidden flex items-center justify-center shrink-0">
                  {item.photo_front_url ? (
                    <img src={supabase.storage.from("vehicle-docs").getPublicUrl(item.photo_front_url).data.publicUrl} alt="Veículo" className="w-full h-full object-cover"/>
                  ) : (
                    <div className="text-center p-6 text-slate-400 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-200 rounded-full mb-2 flex items-center justify-center">
                        <span className="opacity-50 font-bold text-xs">FOTO</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight truncate">
                      {item.plate}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 shrink-0">
                      {item.itemType === 'vehicle' ? 'Veículo' : 'Reboque'}
                    </span>
                  </div>
                  
                  {item.itemType === 'vehicle' && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-app-border">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Modelo</span>
                        <span className="text-[10px] font-bold text-text-main truncate block" title={item.model}>{item.model || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cor</span>
                        <span className="text-[10px] font-bold text-text-main">{item.color || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ano Mod/Fab</span>
                        <span className="text-[10px] font-bold text-text-main">{item.model_year || '-'}/{item.manufacture_year || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Renavam</span>
                        <span className="text-[10px] font-bold text-text-main">{item.renavam || '-'}</span>
                      </div>
                    </div>
                  )}
                  {item.itemType === 'vehicle' && (
                    <div className="mt-6 pt-4 border-t border-app-border">
                      <button onClick={() => setSelectedVehicle(item)} className="w-full h-10 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <Eye size={16}/> Ver Tudo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          type={types.find((t) => t.id === selectedVehicle.type)}
          model={models.find((m) => m.id === selectedVehicle.model)}
          modality={modalities.find((m) => m.id === selectedVehicle.modality_id)}
          insurance={insurances.find((i) => i.id === selectedVehicle.insurance_id)}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
`;
    code = code.substring(0, returnIndex) + newRender;
    fs.writeFileSync(file, code);
}
