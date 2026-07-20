const fs = require('fs');
const file = 'src/modules/company/components/ClosingHistoryTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTable = '<div className="overflow-x-auto rounded-xl border border-app-border bg-white">\n                    <table';
const newTable = `
                  {/* Mobile View */}
                  <div className="grid grid-cols-1 gap-2 md:hidden">
                    {(closing.score_closing_items || []).map((item: any) => (
                      <div key={item.id} className="bg-white p-3 rounded-lg border border-app-border flex justify-between items-center shadow-sm">
                        <div>
                          <div className="text-xs font-bold text-text-main">{item.profiles?.full_name || "Desconhecido"}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{item.total_checklists} Checklists</div>
                        </div>
                        <div className="text-xs font-black text-text-main bg-gray-50 px-2 py-1 rounded">
                          {item.score} pts
                        </div>
                      </div>
                    ))}
                    {(!closing.score_closing_items || closing.score_closing_items.length === 0) && (
                      <div className="text-center text-xs text-text-muted py-4 bg-white rounded-lg border border-app-border">Nenhum motorista neste fechamento.</div>
                    )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-app-border bg-white">
                    <table`;

code = code.replace(targetTable, newTable);
fs.writeFileSync(file, code);
console.log('ClosingHistoryTab updated');
