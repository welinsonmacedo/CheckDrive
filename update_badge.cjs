const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

const newBadge = `
  const getPriorityBadge = (priority: string) => {
    return (
      <div className="flex items-center gap-2 ml-2">
        <div className="flex items-center gap-0.5 bg-zinc-800 p-0.5 rounded-full" title={priority === 'Critico' ? 'Prioridade Crítica' : priority === 'Medio' ? 'Prioridade Média' : priority === 'Leve' ? 'Prioridade Leve' : 'Prioridade Não Definida'}>
          <div className={\`w-2 h-2 rounded-full \${priority === 'Critico' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,1)]' : 'bg-zinc-600'}\`}></div>
          <div className={\`w-2 h-2 rounded-full \${priority === 'Medio' ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,1)]' : 'bg-zinc-600'}\`}></div>
          <div className={\`w-2 h-2 rounded-full \${priority === 'Leve' ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,1)]' : 'bg-zinc-600'}\`}></div>
        </div>
        {priority === 'Critico' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700">Crítico</span>}
        {priority === 'Medio' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-700">Médio</span>}
        {priority === 'Leve' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-green-100 text-green-700">Leve</span>}
      </div>
    );
  };
`;

code = code.replace(
  /const getPriorityBadge = \(priority: string\) => \{[\s\S]*?  \};\n/,
  newBadge
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
