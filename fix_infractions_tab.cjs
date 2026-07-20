const fs = require('fs');
const file = 'src/modules/company/components/InfractionsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTable = '<div className="overflow-x-auto">\n              <table';
const newTable = `
            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
              {filteredInfractions.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">Nenhuma infração encontrada.</div>
              ) : (
                filteredInfractions.map((inf: any) => (
                  <div key={inf.id} className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                          {inf.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">{inf.profiles?.full_name}</div>
                          <div className="text-xs text-zinc-500">{inf.vehicles?.plate || "Sem veículo"}</div>
                        </div>
                      </div>
                      <span className={\`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider \${
                        inf.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }\`}>
                        {inf.status === "paid" ? "Paga" : "Pendente"}
                      </span>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 text-sm">
                      <div className="font-medium text-zinc-900">{inf.infraction_code}</div>
                      <div className="text-xs text-zinc-600 mt-1 line-clamp-2" title={inf.description}>{inf.description}</div>
                      <div className="text-xs text-zinc-500 mt-2 font-mono">
                        {new Date(inf.infraction_date).toLocaleDateString("pt-BR")} às {inf.infraction_time}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-medium">
                      <div className="text-zinc-500">Valor Bruto: <span className="text-zinc-900 font-bold">R$ {Number(inf.amount).toFixed(2)}</span></div>
                      <div className="text-red-600">Desconto: <span className="font-bold">R$ {Number(inf.discount_amount || inf.amount).toFixed(2)}</span></div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                      <button onClick={() => setViewInfraction(inf)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver Detalhes">
                        <Eye size={18} />
                      </button>
                      {inf.attachment_url && (
                        <button onClick={() => setAttachmentUrl(inf.attachment_url)} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver Anexo">
                          <Paperclip size={18} />
                        </button>
                      )}
                      <button onClick={() => handlePrint(inf)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Imprimir Recibo">
                        <Printer size={18} />
                      </button>
                      <button onClick={() => setEditingInfraction(inf)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(inf.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table`;

code = code.replace(targetTable, newTable);
fs.writeFileSync(file, code);
console.log('InfractionsTab updated');
