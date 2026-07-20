const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTable = '<div className="overflow-x-auto">\n              <table';
const newTable = `
            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
              {filteredIssues.map((issue) => {
                const imageUrl = issue.photo_url ? supabase.storage.from("checklist-photos").getPublicUrl(issue.photo_url).data.publicUrl : null;
                const isSelected = selectedRows.includes(issue.id);
                
                return (
                  <div key={issue.id} className={\`bg-white rounded-xl border p-4 flex flex-col gap-3 shadow-sm transition-colors \${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-app-border'}\`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-start">
                        {(activeTab === "pending" || activeTab === "waiting") && user?.role === "admin" && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRows((prev) => [...prev, issue.id]);
                              else setSelectedRows((prev) => prev.filter((id) => id !== issue.id));
                            }}
                            className="rounded border-gray-300 text-primary mt-1"
                          />
                        )}
                        <div>
                          <div className="font-bold text-zinc-900">{issue.vehicles?.plate || issue.trailers?.plate || "Sem Placa"}</div>
                          <div className="text-xs text-zinc-500">{issue.profiles?.full_name || "N/A"}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-zinc-900 font-medium">{new Date(issue.created_at).toLocaleDateString()}</div>
                        <div className="text-zinc-500">{new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3">
                      <div className="text-sm font-bold text-zinc-900">{issue.item_title}</div>
                      {issue.description && <div className="text-xs text-zinc-600 mt-1">{issue.description}</div>}
                      
                      {issue.status === "waiting" && issue.resolution_notes && (
                        <div className="mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                          <div className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">Comentário / Tratativa:</div>
                          <div className="text-xs text-amber-900/80 italic">{issue.resolution_notes}</div>
                        </div>
                      )}

                      {issue.status === "resolved" && (
                        <div className="mt-2 bg-green-50 p-2 rounded-lg border border-green-100 text-xs">
                          <div className="font-bold text-green-700">Resolvido: {new Date(issue.resolved_at!).toLocaleDateString()}</div>
                          {issue.resolution_value && <div className="text-green-800 font-medium">Custo: R$ {Number(issue.resolution_value).toFixed(2)}</div>}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                      <div>
                        {imageUrl ? (
                          <button onClick={() => setPhotoModalUrl(imageUrl)} className="text-xs text-blue-600 font-bold flex items-center gap-1">
                            📷 Ver Foto
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">Sem foto</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {activeTab === "resolved" ? (
                          <>
                            <button onClick={() => setPrintIssue(issue)} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => { setSelectedIssue(issue); setResolutionModalOpen(true); }} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-lg">
                              Detalhes
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setSelectedIssue(issue); setResolutionModalOpen(true); }} className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg">
                            Analisar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table`;

code = code.replace(targetTable, newTable);
fs.writeFileSync(file, code);
console.log('MaintenanceTab updated');
