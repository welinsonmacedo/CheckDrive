const fs = require('fs');
const file = 'src/modules/company/components/FuelTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetTable = '<div className="overflow-x-auto">\n          <table';
const newTable = `
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {loading ? (
            <div className="text-center text-xs text-text-muted italic py-10">Carregando...</div>
          ) : submissions.length > 0 ? (
            submissions.map((sub: any) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-app-border flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">{new Date(sub.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{sub.vehicles?.plate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-black text-text-main">{sub.profiles?.full_name || "Desconhecido"}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-text-muted">KM: <strong className="text-text-main font-bold">{sub.odometer || "-"}</strong></span>
                  <button
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setDetailsModalOpen(true);
                    }}
                    className="text-xs font-black uppercase text-indigo-600 tracking-wider hover:text-indigo-800 transition"
                  >
                    Ver Check-list
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-text-muted italic py-10">Nenhum abastecimento encontrado.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table`;

code = code.replace(targetTable, newTable);
fs.writeFileSync(file, code);
console.log('FuelTab updated');
