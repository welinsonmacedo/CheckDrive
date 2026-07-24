import fs from 'fs';
const file = 'src/modules/company/components/FuelTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetImport = `import { Edit2, Save, X, History, Clock } from 'lucide-react';`;
const replacementImport = `import { Edit2, Save, X, History, Clock, Filter, Search } from 'lucide-react';`;

content = content.replace(targetImport, replacementImport);

// we also need useMemo
const reactImport = `import React, { useState, useEffect } from "react";`;
const reactReplacement = `import React, { useState, useEffect, useMemo } from "react";`;
content = content.replace(reactImport, reactReplacement);

const targetState = `  const [historySub, setHistorySub] = useState<any>(null);`;
const replacementState = `  const [historySub, setHistorySub] = useState<any>(null);

  const [filterPlate, setFilterPlate] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const plate = sub.vehicles?.plate || "";
      const driver = sub.profiles?.full_name || sub.driver_profiles?.full_name || "";
      const date = new Date(sub.created_at);
      
      const matchesPlate = plate.toLowerCase().includes(filterPlate.toLowerCase());
      const matchesDriver = driver.toLowerCase().includes(filterDriver.toLowerCase());
      
      let matchesStart = true;
      let matchesEnd = true;
      if (filterStartDate) {
        const start = new Date(filterStartDate + 'T00:00:00');
        matchesStart = date >= start;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate + 'T23:59:59');
        matchesEnd = date <= end;
      }

      return matchesPlate && matchesDriver && matchesStart && matchesEnd;
    });
  }, [submissions, filterPlate, filterDriver, filterStartDate, filterEndDate]);
`;

content = content.replace(targetState, replacementState);

// Replace `submissions.map` with `filteredSubmissions.map` and `submissions.length` with `filteredSubmissions.length`

const targetRender = `      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Histórico de Abastecimentos
          </span>
        </div>`;
const replacementRender = `      <div className="bento-card p-5 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-primary" />
            <span className="text-sm font-black text-text-main uppercase tracking-wider">Filtros</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Placa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value)}
                placeholder="Buscar placa..."
                className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Motorista</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                placeholder="Buscar motorista..."
                className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data Início</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data Fim</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border flex justify-between items-center">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Histórico de Abastecimentos ({filteredSubmissions.length})
          </span>
        </div>`;

content = content.replace(targetRender, replacementRender);

content = content.replace(/submissions\.length > 0 \?/g, "filteredSubmissions.length > 0 ?");
content = content.replace(/submissions\.map\(/g, "filteredSubmissions.map(");

fs.writeFileSync(file, content);
console.log("Updated FuelTab.tsx with filters.");
