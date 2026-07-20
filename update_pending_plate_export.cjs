const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetExport = '  const exportPendingByPlateToExcel = () => {';
const nextExport = '  const fetchResolvedIssuesReport = async () => {';

let start2 = code.indexOf(targetExport);
let end2 = code.indexOf(nextExport, start2);

if (start2 !== -1 && end2 !== -1) {
  const newExport = `  const exportPendingByPlateToExcel = async () => {
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
  };\n\n`;
  code = code.substring(0, start2) + newExport + code.substring(end2);
  fs.writeFileSync(file, code);
  console.log('Successfully updated exportPendingByPlateToExcel');
} else {
  console.log('Failed to find start2 or end2', start2, end2);
}
