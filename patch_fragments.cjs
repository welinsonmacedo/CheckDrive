const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `                user?.role === "admin" && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider"
                  >
                    <Trash2 size={14} />
                    Excluir ({selectedRows.length})
                  </button>
                  <button
                    onClick={handleBulkResolve}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors uppercase tracking-wider"
                  >
                    <Wrench size={14} />
                    Resolver Selecionadas ({selectedRows.length})
                  </button>
                )}`;

const replacement = `                user?.role === "admin" && (
                  <>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider"
                    >
                      <Trash2 size={14} />
                      Excluir ({selectedRows.length})
                    </button>
                    <button
                      onClick={handleBulkResolve}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors uppercase tracking-wider"
                    >
                      <Wrench size={14} />
                      Resolver Selecionadas ({selectedRows.length})
                    </button>
                  </>
                )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched fragments');
} else {
  console.log('target not found');
}
