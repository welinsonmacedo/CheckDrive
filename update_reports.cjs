const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add "resolved_issues" to the activeReport state type
code = code.replace(
  '"defects" | "pending_by_plate" | "mileage" | "history" | "purchases" | "schedules" | "fleet_age"',
  '"defects" | "pending_by_plate" | "mileage" | "history" | "purchases" | "schedules" | "fleet_age" | "resolved_issues"'
);

// 2. Add State for resolvedIssuesData and loading state if needed
code = code.replace(
  'const [fleetAgeData, setFleetAgeData] = useState<any[]>([]);',
  'const [fleetAgeData, setFleetAgeData] = useState<any[]>([]);\n  const [resolvedIssuesData, setResolvedIssuesData] = useState<any[]>([]);\n  const [resolvedSearchTerm, setResolvedSearchTerm] = useState("");'
);

// 3. Add fetchResolvedIssuesReport
const fetchResolvedFunc = `
  const fetchResolvedIssuesReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("checklist_issues").select("*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name), resolver:profiles!checklist_issues_resolved_by_fkey(full_name)")
        .eq("company_id", user?.company_id)
        .gte("created_at", \`\${startDate}T00:00:00Z\`)
        .lte("created_at", \`\${endDate}T23:59:59Z\`);
      if (error) throw error;
      let mappedData = data.map((d) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }
        return { ...d, status };
      });
      
      const resolvedData = mappedData.filter(d => d.status === "resolved");
      setResolvedIssuesData(groupResolvedIssues(resolvedData));
    } catch (error) {
      console.error("Error fetching resolved issues report", error);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(
  'const fetchFleetAgeReport = async () => {',
  `${fetchResolvedFunc}\n\n  const fetchFleetAgeReport = async () => {`
);

// 4. Update useEffect to call fetchResolvedIssuesReport
code = code.replace(
  'else if (activeReport === "fleet_age") fetchFleetAgeReport();',
  'else if (activeReport === "fleet_age") fetchFleetAgeReport();\n                else if (activeReport === "resolved_issues") fetchResolvedIssuesReport();'
);

// 5. Update Excel export for resolved_issues
code = code.replace(
  'activeReport === "fleet_age"',
  'activeReport === "fleet_age" || activeReport === "resolved_issues"'
);

const excelLogic = `
    } else if (activeReport === "resolved_issues") {
      worksheet = XLSX.utils.json_to_sheet(
        resolvedIssuesData.map((d) => ({
          "Data de Resolução": d.resolved_at ? format(parseISO(d.resolved_at), "dd/MM/yyyy HH:mm") : "-",
          "Placa": d.vehicles?.plate || d.trailers?.plate || "-",
          "Item Resolvido": d.item_title,
          "Descrição": d.description || "-",
          "Resolvido Por": d.resolver?.full_name || "Sistema",
          "Observações": d.resolution_notes || "-",
          "Custo (R$)": d.cost ? d.cost.toFixed(2) : "0.00"
        }))
      );
      fileName = \`relatorio_pendencias_resolvidas_\${format(new Date(), "dd-MM-yyyy")}.xlsx\`;
`;
code = code.replace(
  '    } else if (activeReport === "fleet_age") {',
  `${excelLogic}    } else if (activeReport === "fleet_age") {`
);

// 6. Update title for printing
code = code.replace(
  '{activeReport === "fleet_age" && "Idade da Frota"}',
  '{activeReport === "fleet_age" && "Idade da Frota"}\n                {activeReport === "resolved_issues" && "Pendências Resolvidas"}'
);

// 7. Add Button for resolved_issues
const buttonHtml = `
            <button
              onClick={() => setActiveReport("resolved_issues")}
              className={\`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 \${
                activeReport === "resolved_issues"
                  ? "bg-white text-emerald-600 shadow-sm border border-emerald-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }\`}
            >
              <CheckCircle2 size={14} className="stroke-[2.2]" />
              <span>Pendências Resolvidas</span>
            </button>
`;
code = code.replace(
  '<button\n              onClick={() => setActiveReport("pending_by_plate")}',
  `${buttonHtml}\n            <button\n              onClick={() => setActiveReport("pending_by_plate")}`
);

// 8. Add Table for resolved_issues
const tableHtml = `
            {activeReport === "resolved_issues" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full max-w-sm relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por placa, item ou observação..."
                      value={resolvedSearchTerm}
                      onChange={(e) => setResolvedSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total de Pendências Resolvidas</span>
                    <span className="text-3xl font-black text-gray-900">{resolvedIssuesData.length}</span>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-600/80 tracking-widest mb-1">Custo Total (Estimado)</span>
                    <span className="text-3xl font-black text-emerald-700">
                      <span className="text-sm font-bold opacity-70 mr-1">R$</span>
                      {resolvedIssuesData.reduce((acc, curr) => acc + (curr.cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-indigo-600/80 tracking-widest mb-1">Veículos com Reparos</span>
                    <span className="text-3xl font-black text-indigo-700">
                      {new Set(resolvedIssuesData.map((d) => d.vehicles?.plate || d.trailers?.plate)).size}
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                      <thead className="bg-gray-50/50 text-gray-500 font-bold text-[10px] uppercase tracking-wider print:bg-white print:text-black">
                        <tr>
                          <th className="px-5 py-4 border-b border-gray-200">Data Resolução</th>
                          <th className="px-5 py-4 border-b border-gray-200">Placa</th>
                          <th className="px-5 py-4 border-b border-gray-200">Item(s) Resolvido(s)</th>
                          <th className="px-5 py-4 border-b border-gray-200 text-center">Resolvido Por</th>
                          <th className="px-5 py-4 border-b border-gray-200 text-center">Observação</th>
                          <th className="px-5 py-4 border-b border-gray-200 text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 print:divide-black">
                        {resolvedIssuesData
                          .filter(v => 
                            (v.vehicles?.plate?.toLowerCase().includes(resolvedSearchTerm.toLowerCase())) ||
                            (v.trailers?.plate?.toLowerCase().includes(resolvedSearchTerm.toLowerCase())) ||
                            (v.item_title?.toLowerCase().includes(resolvedSearchTerm.toLowerCase())) ||
                            (v.resolution_notes?.toLowerCase().includes(resolvedSearchTerm.toLowerCase()))
                          )
                          .sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime())
                          .map((v, i) => (
                            <tr key={v.id || i} className="hover:bg-gray-50/50 transition-colors print:break-inside-avoid">
                              <td className="px-5 py-4 font-medium text-gray-600 text-xs">
                                {v.resolved_at ? format(parseISO(v.resolved_at), "dd/MM/yyyy HH:mm") : "-"}
                              </td>
                              <td className="px-5 py-4 font-black text-indigo-600 uppercase">
                                {v.vehicles?.plate || v.trailers?.plate || "-"}
                              </td>
                              <td className="px-5 py-4 text-xs font-semibold text-gray-800 whitespace-normal min-w-[200px]">
                                {v.item_title}
                              </td>
                              <td className="px-5 py-4 text-center text-xs font-bold text-gray-600">
                                {v.resolver?.full_name || "Sistema"}
                              </td>
                              <td className="px-5 py-4 text-center text-xs font-medium text-gray-500 whitespace-normal min-w-[200px] truncate max-w-xs">
                                {v.resolution_notes || "-"}
                              </td>
                              <td className="px-5 py-4 text-right text-xs font-black text-emerald-600">
                                R$ {(v.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        }
                        {resolvedIssuesData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-sm font-bold text-gray-500">
                              Nenhuma pendência resolvida encontrada no período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
`;

code = code.replace(
  '{activeReport === "fleet_age" && (',
  `${tableHtml}\n            {activeReport === "fleet_age" && (`
);

fs.writeFileSync(file, code);
console.log('Done replacing');
