const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert imports for exceljs and file-saver
code = code.replace(
  'import * as XLSX from "xlsx";',
  'import * as XLSX from "xlsx";\nimport ExcelJS from "exceljs";\nimport { saveAs } from "file-saver";'
);

const oldExportFunc = `const exportResolvedIssuesToExcel = () => {
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

    XLSX.writeFile(workbook, \`Pendencias_Resolvidas_\${new Date().toISOString().split('T')[0]}.xlsx\`);
  };`;

const newExportFunc = `const exportResolvedIssuesToExcel = async () => {
    if (!resolvedIssuesData || resolvedIssuesData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    try {
      // 1. Buscar dados da empresa e logo
      let company = null;
      if (user?.company_id) {
        const { data } = await supabase.from("companies").select("*").eq("id", user.company_id).single();
        company = data;
      }
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Pendencias_Resolvidas');

      // 2. Tentar baixar a logo da empresa para colocar no excel (se tiver URL)
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

      // 3. Tentar baixar a logo do sistema
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

      // Adicionando um espaço para o cabeçalho (linhas 1 a 4)
      worksheet.mergeCells('A1:G4');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = (company?.name ? company.name.toUpperCase() : "EMPRESA") + " - RELATÓRIO DE PENDÊNCIAS RESOLVIDAS";
      headerCell.font = { size: 16, bold: true };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Inserir as imagens no cabeçalho
      if (logoImageId !== null) {
        worksheet.addImage(logoImageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 100, height: 60 }
        });
      }
      if (systemLogoId !== null) {
        worksheet.addImage(systemLogoId, {
          tl: { col: 6, row: 0 },
          ext: { width: 100, height: 60 }
        });
      }

      // Linha 5 em branco (margem)

      // Colunas e Dados (Linha 6 em diante)
      worksheet.getRow(6).values = [
        "Data de Resolução", "Placa", "Item Resolvido", "Descrição", "Resolvido Por", "Observações", "Custo (R$)"
      ];
      worksheet.getRow(6).font = { bold: true };
      worksheet.getRow(6).fill = {
        type: 'pattern',
        pattern:'solid',
        fgColor:{argb:'FFF3F4F6'}
      };

      resolvedIssuesData.forEach((d) => {
        worksheet.addRow([
          d.resolved_at ? new Date(d.resolved_at).toLocaleString('pt-BR') : "-",
          d.vehicles?.plate || d.trailers?.plate || "-",
          d.item_title,
          d.description || "-",
          d.resolver?.full_name || "Sistema",
          d.resolution_notes || "-",
          d.resolution_value ? Number(d.resolution_value).toFixed(2) : "0.00"
        ]);
      });

      worksheet.columns = [
        { width: 20 }, { width: 12 }, { width: 30 }, { width: 40 }, { width: 25 }, { width: 40 }, { width: 15 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, \`Pendencias_Resolvidas_\${new Date().toISOString().split('T')[0]}.xlsx\`);

    } catch (err) {
      console.error("Erro ao exportar excel", err);
      alert("Erro ao exportar excel. Verifique o console.");
    }
  };`;

// Also replace the button onClick to make it await properly if it was not, but it's an async arrow function, so onClick={exportResolvedIssuesToExcel} is fine.
let newCode = code.replace(oldExportFunc, newExportFunc);

if (newCode === code) {
  console.log('Failed to replace exportResolvedIssuesToExcel');
  // fallback search
  const idx = code.indexOf('const exportResolvedIssuesToExcel');
  if (idx > -1) {
    const endIdx = code.indexOf('};', idx);
    newCode = code.substring(0, idx) + newExportFunc + code.substring(endIdx + 2);
  }
}

fs.writeFileSync(file, newCode);
console.log('Updated exportResolvedIssuesToExcel');
