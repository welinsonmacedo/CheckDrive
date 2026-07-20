const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetFunc1 = 'const fetchPendingByPlateReport = async () => {';
const nextFunc1 = 'const fetchResolvedIssuesReport = async () => {';

let start1 = code.indexOf(targetFunc1);
let end1 = code.indexOf(nextFunc1);

if (start1 !== -1 && end1 !== -1) {
  let funcCode = code.substring(start1, end1);
  funcCode = funcCode.replace(
    'const groupedArray = Object.keys(grouped).map(plate => ({\n        plate,\n        issues: grouped[plate],\n        count: grouped[plate].length\n      })).sort((a, b) => b.count - a.count);',
    'const groupedArray = Object.keys(grouped).map(plate => {\n        const issues = grouped[plate];\n        \n        const groupedIssues = {};\n        issues.forEach(iss => {\n          const key = `${iss.item_title}::${iss.description || ""}`;\n          if (!groupedIssues[key]) {\n             groupedIssues[key] = { ...iss, repeatCount: 1 };\n          } else {\n             groupedIssues[key].repeatCount += 1;\n          }\n        });\n        \n        return {\n          plate,\n          issues: Object.values(groupedIssues),\n          count: issues.length\n        };\n      }).sort((a, b) => b.count - a.count);'
  );
  code = code.substring(0, start1) + funcCode + code.substring(end1);
}

const targetExport = 'const exportPendingByPlateToExcel = () => {';
const nextExport = 'const exportDefectsToExcel = () => {';
let start2 = code.indexOf(targetExport);
let end2 = code.indexOf(nextExport);

if (start2 !== -1 && end2 !== -1) {
  const newExport = `const exportPendingByPlateToExcel = async () => {
    if (!pendingByPlateData || pendingByPlateData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    try {
      let company = null;
      if (user?.company_id) {
        const { data } = await supabase.from("companies").select("*").eq("id", user.company_id).single();
        company = data;
      }
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Pendencias_por_Placa');

      let logoImageId = null;
      if (company && company.logo_url) {
        try {
          const response = await fetch(company.logo_url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          logoImageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: company.logo_url.endsWith('.png') ? 'png' : 'jpeg',
          });
        } catch (e) {
          console.error("Failed to load company logo", e);
        }
      }

      let systemLogoId = null;
      try {
        const sysLogoUrl = 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg';
        const response = await fetch(sysLogoUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        systemLogoId = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'jpeg',
        });
      } catch (e) {
        console.error("Failed to load system logo", e);
      }

      worksheet.mergeCells('A1:G4');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = (company?.name ? company.name.toUpperCase() : "EMPRESA") + " - RELATÓRIO DE PENDÊNCIAS POR PLACA";
      headerCell.font = { size: 16, bold: true };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (logoImageId !== null) {
        worksheet.addImage(logoImageId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 60 } });
      }
      if (systemLogoId !== null) {
        worksheet.addImage(systemLogoId, { tl: { col: 6, row: 0 }, ext: { width: 100, height: 60 } });
      }

      worksheet.getRow(6).values = [
        "Placa", "Item com Defeito", "Descrição", "Qtd", "Motorista(1º Reg)", "Data do Registro(1º Reg)", "Status(Atual)"
      ];
      worksheet.getRow(6).font = { bold: true };
      worksheet.getRow(6).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFF3F4F6'} };

      pendingByPlateData.forEach(group => {
        group.issues.forEach((issue) => {
          worksheet.addRow([
            group.plate,
            issue.item_title,
            issue.description || "-",
            issue.repeatCount || 1,
            issue.profiles?.full_name || "Desconhecido",
            new Date(issue.created_at).toLocaleString('pt-BR'),
            issue.status === 'waiting' ? 'Aguardando Oficina' : 'Pendente'
          ]);
        });
      });

      worksheet.columns = [
        { width: 12 }, { width: 30 }, { width: 40 }, { width: 8 }, { width: 25 }, { width: 20 }, { width: 20 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, \`Pendentes_por_Placa_\${new Date().toISOString().split('T')[0]}.xlsx\`);

    } catch (err) {
      console.error("Erro ao exportar excel", err);
      alert("Erro ao exportar excel. Verifique o console.");
    }
  };\n\n  `;
  code = code.substring(0, start2) + newExport + code.substring(end2);
}

// Update the JSX
const targetJSX = '<strong className="text-gray-900">{issue.item_title}</strong>: {issue.description || "Sem observações"}';
const nextJSX = '<strong className="text-gray-900">{issue.item_title}</strong>: {issue.description || "Sem observações"}\n                                      {issue.repeatCount > 1 && (\n                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">\n                                          {issue.repeatCount}x\n                                        </span>\n                                      )}';

code = code.replace(targetJSX, nextJSX);

fs.writeFileSync(file, code);
console.log('Done');
