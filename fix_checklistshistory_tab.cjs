const fs = require('fs');
const file = 'src/modules/company/components/ChecklistsHistoryTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTable = '<div className="overflow-x-auto">\n          <table';
const newTable = `
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {loading ? (
            <div className="text-center text-xs text-text-muted italic py-10">Carregando...</div>
          ) : filtered.length > 0 ? (
            filtered.map((sub: any) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-app-border flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-black text-text-main block">{sub.profiles?.full_name}</span>
                    <span className="text-xs font-bold text-text-muted mt-0.5 block">
                      {new Date(sub.details?.adjusted_date || sub.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {sub.vehicles?.plate}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {sub.type === "start" ? "Início de Viagem" : sub.type === "end" ? "Fim de Viagem" : sub.type === "fuel" || sub.type === "Abastecimento" ? "Abastecimento" : sub.type === "yard" ? "Pátio" : sub.type}
                  </span>
                  {sub.details?.is_edited && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest">
                      Editado
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-gray-100">
                  <button onClick={() => onViewDetails(sub)} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors">
                    Detalhes
                  </button>
                  {currentUser?.role === "admin" && (
                    <button onClick={() => handleDelete(sub.id)} className="px-2 py-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-text-muted italic py-10">Nenhum checklist encontrado.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table`;

code = code.replace(targetTable, newTable);
fs.writeFileSync(file, code);
console.log('ChecklistsHistoryTab updated');
