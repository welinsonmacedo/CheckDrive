const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

const printBtn = `
          {activeReport === "pending_by_plate" && (
            <button
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-2 h-9 px-4 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-indigo-100/50"
            >
              <Printer size={15} /> Imprimir Relatório
            </button>
          )}
`;

content = content.replace(
  '{activeReport === "defects" ? (',
  printBtn + '\n          {activeReport === "defects" ? ('
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated print button logic.");
