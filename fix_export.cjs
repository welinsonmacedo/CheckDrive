const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const exportFunc = `
  const exportResolvedIssuesToExcel = () => {
    if (!resolvedIssuesData || resolvedIssuesData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const exportData = resolvedIssuesData.map((d) => ({
      "Data de Resolução": d.resolved_at ? new Date(d.resolved_at).toLocaleString('pt-BR') : "-",
      "Placa": d.vehicles?.plate || d.trailers?.plate || "-",
      "Item Resolvido": d.item_title,
      "Descrição": d.description || "-",
      "Resolvido Por": d.resolver?.full_name || "Sistema",
      "Observações": d.resolution_notes || "-",
      "Custo (R$)": d.resolution_value ? Number(d.resolution_value).toFixed(2) : "0.00"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendencias_Resolvidas");
    
    const wscols = [
      {wch: 20}, // Data
      {wch: 12}, // Placa
      {wch: 30}, // Item
      {wch: 40}, // Descricao
      {wch: 25}, // Resolvido Por
      {wch: 40}, // Observacoes
      {wch: 15}  // Custo
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, \`Pendencias_Resolvidas_\${new Date().toISOString().slice(0, 10)}.xlsx\`);
  };
`;

code = code.replace(
  'const exportPendingByPlateToExcel = () => {',
  exportFunc + '\n  const exportPendingByPlateToExcel = () => {'
);

const buttonsHtml = `
          {activeReport === "resolved_issues" && (
            <>
              <button
                onClick={exportResolvedIssuesToExcel}
                className="flex items-center gap-2 h-9 px-4 bg-green-50 border border-green-100 hover:bg-green-100 text-green-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-green-100/50"
              >
                <FileText size={15} /> Exportar Excel
              </button>
              <button
                onClick={() => {
                  setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 h-9 px-4 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-indigo-100/50"
              >
                <Printer size={15} /> Imprimir Relatório
              </button>
            </>
          )}
`;

code = code.replace(
  '{activeReport === "pending_by_plate" && (',
  buttonsHtml + '\n          {activeReport === "pending_by_plate" && ('
);

fs.writeFileSync(file, code);
console.log('Added export logic');
