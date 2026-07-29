const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  'const getPriorityBadge = (priority?: string) => {',
  `const getPriorityBadge = (priority?: string) => {
    const p = (priority || "").toLowerCase().trim();
    if (p === "baixa" || p === "leve") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1 border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>Leve</span>;
    if (p === "média" || p === "media" || p === "médio" || p === "medio") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 border border-amber-200"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]"></div>Médio</span>;
    if (p === "alta" || p === "crítico" || p === "critico") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1 border border-red-200"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)] animate-pulse"></div>Crítico</span>;
    return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 flex items-center gap-1 border border-zinc-200"><div className="w-2 h-2 rounded-full bg-zinc-400"></div>Padrão</span>;
  // `
);

// We should also replace the rest of the old function.
const fnBodyRegex = /if \(priority === "Baixa"\).*?return null;\n  \};/s;
code = code.replace(fnBodyRegex, '};');

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
