const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

// 1. Add tab button
const newTab = `
            <button
              onClick={() => setActiveReport("pending_by_plate")}
              className={\`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 \${
                activeReport === "pending_by_plate"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }\`}
            >
              <AlertTriangle size={14} className="stroke-[2.2]" />
              <span>Pendentes por Placa</span>
            </button>
`;
content = content.replace(
  '<span>Inspeção de Defeitos</span>\n            </button>',
  '<span>Inspeção de Defeitos</span>\n            </button>' + newTab
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated UI part 1.");
