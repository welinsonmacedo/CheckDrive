import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ImportRecord } from "../types";
import { VehicleReportStat, getRecordFinancialValue, getRecordImportType } from "./vehicleStatsUtils";

export type { VehicleReportStat };

export interface ReportExportFilterOptions {
  companyName?: string;
  periodLabel: string;
  categoryFilter: string;
  tipoImportacaoFilter: string;
  agruparPor: string;
  metrica: string;
  tipoGrafico: string;
  fornecedorFilter?: string;
  placaFilter?: string;
}

export interface AggregatedReportRow {
  name: string;
  count: number;
  totalQty: number;
  valorTotal: number;
  mediaValor: number;
  percent: number;
}

export interface ExportReportData {
  filters: ReportExportFilterOptions;
  overallMetrics: {
    totalValorGeral: number;
    totalQtyGeral: number;
    totalRegistrosCount: number;
    mediaValorGeral: number;
  };
  aggregatedData: AggregatedReportRow[];
  vehicleStats: {
    top10Highest?: VehicleReportStat[];
    top10Lowest?: VehicleReportStat[];
    topCPK?: VehicleReportStat[];
    allVehicles?: VehicleReportStat[];
  };
  tableFilteredRecords: ImportRecord[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
};

const formatNumber = (val: number, decimals: number = 2) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
};

/**
 * EXPORTAÇÃO EXCEL PROFISSIONAL (.XLSX)
 */
export async function exportReportToExcel(data: ExportReportData) {
  const { filters, overallMetrics, aggregatedData, vehicleStats, tableFilteredRecords } = data;
  const company = filters.companyName || "CHECKDRIVE GESTÃO DE FROTAS";
  const emissionDate = new Date().toLocaleString("pt-BR");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = company;
  workbook.created = new Date();

  // ==========================================
  // ABA 1: RESUMO EXECUTIVO & TOP 10 VEÍCULOS
  // ==========================================
  const wsExec = workbook.addWorksheet("Resumo Executivo & Top 10");

  // BANNER DE TÍTULO
  wsExec.mergeCells("A1:H2");
  const titleCell = wsExec.getCell("A1");
  titleCell.value = `${company.toUpperCase()} - RELATÓRIO EXECUTIVO DE CUSTOS E FROTAS`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } }; // Slate 900
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // METADADOS / FILTROS
  wsExec.getCell("A4").value = `Emissão: ${emissionDate}`;
  wsExec.getCell("A4").font = { italic: true, size: 9, color: { argb: "64748B" } };

  wsExec.getCell("A5").value = `Período: ${filters.periodLabel} | Categoria: ${filters.categoryFilter} | Tipo Importação: ${filters.tipoImportacaoFilter} | Agrupamento: ${filters.agruparPor.toUpperCase()}`;
  wsExec.getCell("A5").font = { bold: true, size: 10, color: { argb: "1E293B" } };

  // SEÇÃO: MÉTRICAS GERAIS (KPIs)
  let currentRow = 7;
  wsExec.mergeCells(`A${currentRow}:H${currentRow}`);
  const kpiHeaderCell = wsExec.getCell(`A${currentRow}`);
  kpiHeaderCell.value = "1. RESUMO DAS MÉTRICAS GERAIS DO PERÍODO";
  kpiHeaderCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  kpiHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
  kpiHeaderCell.alignment = { vertical: "middle", horizontal: "left" };

  currentRow++;
  const kpiLabels = [
    "Custo Total (R$)",
    "Volume / Consumo Total (L/Qtd)",
    "Total de Viagens / Lançamentos",
    "Ticket Médio por Lançamento (R$)",
  ];
  const kpiValues = [
    overallMetrics.totalValorGeral,
    overallMetrics.totalQtyGeral,
    overallMetrics.totalRegistrosCount,
    overallMetrics.mediaValorGeral,
  ];

  // Draw KPI blocks
  wsExec.getRow(currentRow).values = [
    kpiLabels[0],
    "",
    kpiLabels[1],
    "",
    kpiLabels[2],
    "",
    kpiLabels[3],
    "",
  ];
  wsExec.getRow(currentRow).font = { size: 9, bold: true, color: { argb: "475569" } };
  wsExec.getRow(currentRow).alignment = { horizontal: "center" };

  currentRow++;
  const valRow = wsExec.getRow(currentRow);
  valRow.height = 24;

  wsExec.getCell(`A${currentRow}`).value = kpiValues[0];
  wsExec.getCell(`A${currentRow}`).numFmt = 'R$ #,##0.00';

  wsExec.getCell(`C${currentRow}`).value = kpiValues[1];
  wsExec.getCell(`C${currentRow}`).numFmt = '#,##0.00';

  wsExec.getCell(`E${currentRow}`).value = kpiValues[2];
  wsExec.getCell(`E${currentRow}`).numFmt = '#,##0';

  wsExec.getCell(`G${currentRow}`).value = kpiValues[3];
  wsExec.getCell(`G${currentRow}`).numFmt = 'R$ #,##0.00';

  [1, 3, 5, 7].forEach((colIdx) => {
    const colLetter = String.fromCharCode(64 + colIdx);
    const nextCol = String.fromCharCode(64 + colIdx + 1);
    wsExec.mergeCells(`${colLetter}${currentRow - 1}:${nextCol}${currentRow - 1}`);
    wsExec.mergeCells(`${colLetter}${currentRow}:${nextCol}${currentRow}`);
    const cell = wsExec.getCell(`${colLetter}${currentRow}`);
    cell.font = { name: "Arial", size: 12, bold: true, color: { argb: "0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "CBD5E1" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      bottom: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } },
    };
  });

  // SEÇÃO 2: TOP 10 VEÍCULOS COM MAIOR CUSTO
  currentRow += 3;
  wsExec.mergeCells(`A${currentRow}:H${currentRow}`);
  const topHighHeader = wsExec.getCell(`A${currentRow}`);
  topHighHeader.value = "2. TOP 10 VEÍCULOS COM MAIOR CUSTO (RANKING DE MAIOR IMPACTO FINANCEIRO)";
  topHighHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  topHighHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "9F1239" } }; // Rose 800
  topHighHeader.alignment = { vertical: "middle", horizontal: "left" };

  currentRow++;
  const vehicleHeaders = [
    "Posição",
    "Placa",
    "Frota",
    "Qtd Viagens (Abastecimentos)",
    "Consumo Total (Litros)",
    "Custo Total (R$)",
    "Média por Viagem (R$)",
    "Detalhamento por Categoria (Top Custos)",
  ];

  const headerRowHigh = wsExec.getRow(currentRow);
  headerRowHigh.values = vehicleHeaders;
  headerRowHigh.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  headerRowHigh.height = 22;
  headerRowHigh.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BE123C" } }; // Rose 700
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "9F1239" } },
      bottom: { style: "medium", color: { argb: "881337" } },
      left: { style: "thin", color: { argb: "E2E8F0" } },
      right: { style: "thin", color: { argb: "E2E8F0" } },
    };
  });

  (vehicleStats?.top10Highest || []).forEach((v, idx) => {
    currentRow++;
    const avgCost = v.viagensCount > 0 ? v.totalCost / v.viagensCount : 0;
    const catDesc = Object.entries(v.categories)
      .map(([cName, cVal]) => `${cName}: R$ ${formatNumber(cVal.valor, 2)}`)
      .join(" | ");

    const row = wsExec.getRow(currentRow);
    row.values = [
      `#${idx + 1}`,
      v.placa,
      v.numero_frota || "-",
      v.viagensCount,
      v.totalLiters,
      v.totalCost,
      avgCost,
      catDesc,
    ];

    // Format styles
    wsExec.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`B${currentRow}`).font = { bold: true };
    wsExec.getCell(`B${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`C${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`D${currentRow}`).numFmt = '#,##0';
    wsExec.getCell(`E${currentRow}`).numFmt = '#,##0.00';
    wsExec.getCell(`F${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`F${currentRow}`).font = { bold: true, color: { argb: "9F1239" } };
    wsExec.getCell(`G${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`H${currentRow}`).font = { size: 9, color: { argb: "334155" } };

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F2" } };
      });
    }
  });

  // SEÇÃO 3: TOP 10 VEÍCULOS COM MENOR CUSTO
  currentRow += 3;
  wsExec.mergeCells(`A${currentRow}:H${currentRow}`);
  const topLowHeader = wsExec.getCell(`A${currentRow}`);
  topLowHeader.value = "3. TOP 10 VEÍCULOS COM MENOR CUSTO (EFICIÊNCIA & MENOR DESPESA REGISTRADA)";
  topLowHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  topLowHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "065F46" } }; // Emerald 800
  topLowHeader.alignment = { vertical: "middle", horizontal: "left" };

  currentRow++;
  const headerRowLow = wsExec.getRow(currentRow);
  headerRowLow.values = vehicleHeaders;
  headerRowLow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  headerRowLow.height = 22;
  headerRowLow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "047857" } }; // Emerald 700
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "065F46" } },
      bottom: { style: "medium", color: { argb: "064E3B" } },
      left: { style: "thin", color: { argb: "E2E8F0" } },
      right: { style: "thin", color: { argb: "E2E8F0" } },
    };
  });

  (vehicleStats?.top10Lowest || []).forEach((v, idx) => {
    currentRow++;
    const avgCost = v.viagensCount > 0 ? v.totalCost / v.viagensCount : 0;
    const catDesc = Object.entries(v.categories)
      .map(([cName, cVal]) => `${cName}: R$ ${formatNumber(cVal.valor, 2)}`)
      .join(" | ");

    const row = wsExec.getRow(currentRow);
    row.values = [
      `#${idx + 1}`,
      v.placa,
      v.numero_frota || "-",
      v.viagensCount,
      v.totalLiters,
      v.totalCost,
      avgCost,
      catDesc,
    ];

    wsExec.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`B${currentRow}`).font = { bold: true };
    wsExec.getCell(`B${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`C${currentRow}`).alignment = { horizontal: "center" };
    wsExec.getCell(`D${currentRow}`).numFmt = '#,##0';
    wsExec.getCell(`E${currentRow}`).numFmt = '#,##0.00';
    wsExec.getCell(`F${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`F${currentRow}`).font = { bold: true, color: { argb: "047857" } };
    wsExec.getCell(`G${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`H${currentRow}`).font = { size: 9, color: { argb: "334155" } };

    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0FDF4" } };
      });
    }
  });

  // SEÇÃO 4: RESUMO AGRUPADO
  currentRow += 3;
  wsExec.mergeCells(`A${currentRow}:F${currentRow}`);
  const groupHeader = wsExec.getCell(`A${currentRow}`);
  groupHeader.value = `4. RESUMO AGRUPADO POR: ${filters.agruparPor.toUpperCase()}`;
  groupHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFF" } };
  groupHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3730A3" } }; // Indigo 800
  groupHeader.alignment = { vertical: "middle", horizontal: "left" };

  currentRow++;
  const groupHeaders = [
    `Agrupamento (${filters.agruparPor})`,
    "Qtd Lançamentos",
    "Soma Volume / Litros",
    "Valor Total (R$)",
    "Média Valor (R$)",
    "% do Custo Total",
  ];
  const headerRowGroup = wsExec.getRow(currentRow);
  headerRowGroup.values = groupHeaders;
  headerRowGroup.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  headerRowGroup.height = 22;
  headerRowGroup.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338CA" } }; // Indigo 700
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  (aggregatedData || []).forEach((g, idx) => {
    currentRow++;
    const row = wsExec.getRow(currentRow);
    row.values = [
      g.name,
      g.count,
      g.totalQty,
      g.valorTotal,
      g.mediaValor,
      g.percent / 100, // Excel percent format
    ];

    wsExec.getCell(`A${currentRow}`).font = { bold: true };
    wsExec.getCell(`B${currentRow}`).numFmt = '#,##0';
    wsExec.getCell(`C${currentRow}`).numFmt = '#,##0.00';
    wsExec.getCell(`D${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`D${currentRow}`).font = { bold: true, color: { argb: "1E1B4B" } };
    wsExec.getCell(`E${currentRow}`).numFmt = 'R$ #,##0.00';
    wsExec.getCell(`F${currentRow}`).numFmt = '0.0%';

    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };
      });
    }
  });

  // TOTAL ROW PARA O AGRUPADO
  currentRow++;
  const totalRowAgrup = wsExec.getRow(currentRow);
  totalRowAgrup.values = [
    "TOTAL GERAL",
    overallMetrics.totalRegistrosCount,
    overallMetrics.totalQtyGeral,
    overallMetrics.totalValorGeral,
    overallMetrics.mediaValorGeral,
    1.0,
  ];
  totalRowAgrup.font = { name: "Arial", size: 10, bold: true, color: { argb: "0F172A" } };
  wsExec.getCell(`B${currentRow}`).numFmt = '#,##0';
  wsExec.getCell(`C${currentRow}`).numFmt = '#,##0.00';
  wsExec.getCell(`D${currentRow}`).numFmt = 'R$ #,##0.00';
  wsExec.getCell(`E${currentRow}`).numFmt = 'R$ #,##0.00';
  wsExec.getCell(`F${currentRow}`).numFmt = '0.0%';

  totalRowAgrup.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };
    c.border = {
      top: { style: "thin", color: { argb: "64748B" } },
      bottom: { style: "double", color: { argb: "0F172A" } },
    };
  });

  // Adjust Column Widths for Worksheet 1
  wsExec.columns = [
    { width: 14 }, // A: Posição / Agrup
    { width: 18 }, // B: Placa / Qtd
    { width: 16 }, // C: Frota / Volume
    { width: 28 }, // D: Qtd Viagens / Total
    { width: 24 }, // E: Consumo Litros
    { width: 22 }, // F: Custo Total
    { width: 22 }, // G: Média / Viagem
    { width: 45 }, // H: Detalhamento Categorias
  ];

  // ==========================================
  // ABA 2: DETALHAMENTO DOS LANÇAMENTOS
  // ==========================================
  const wsDetail = workbook.addWorksheet("Lançamentos Detalhados");

  wsDetail.mergeCells("A1:K2");
  const detailTitle = wsDetail.getCell("A1");
  detailTitle.value = `${company.toUpperCase()} - RELATÓRIO ITEMIZADO DE LANÇAMENTOS DETALHADOS`;
  detailTitle.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFF" } };
  detailTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F172A" } };
  detailTitle.alignment = { vertical: "middle", horizontal: "center" };

  wsDetail.getCell("A4").value = `Total de Lançamentos Exibidos: ${(tableFilteredRecords || []).length} registros`;
  wsDetail.getCell("A4").font = { italic: true, size: 9, color: { argb: "475569" } };

  const detailHeaders = [
    "Data",
    "Tipo Importação",
    "Categoria",
    "Placa",
    "Frota",
    "Conta",
    "Descrição da Conta",
    "Fornecedor / Posto",
    "Litros / Qtd",
    "Valor Total (R$)",
    "Status",
  ];

  const detailHeaderRow = wsDetail.getRow(5);
  detailHeaderRow.values = detailHeaders;
  detailHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
  detailHeaderRow.height = 22;
  detailHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "0F172A" } },
      bottom: { style: "medium", color: { argb: "020617" } },
    };
  });

  (tableFilteredRecords || []).forEach((r, idx) => {
    const rowNum = idx + 6;
    const isGFV = r.import_job_id?.includes("combustivel") || r.tipo_registro === "Combustível" || r.quantidade > 0;
    const impTypeStr = isGFV ? "GFV (Combustível)" : "SOFtran (Despesas)";

    const row = wsDetail.getRow(rowNum);
    row.values = [
      r.data || "-",
      impTypeStr,
      r.tipo_registro || "-",
      r.placa || "-",
      r.numero_frota || "-",
      r.conta || "-",
      r.descricao_conta || "-",
      r.fornecedor || "-",
      Number(r.quantidade || 0),
      getRecordFinancialValue(r, data.filters.tipoImportacaoFilter === "combustivel_gfv"),
      (r.status || "APROVADO").toUpperCase(),
    ];

    wsDetail.getCell(`A${rowNum}`).alignment = { horizontal: "center" };
    wsDetail.getCell(`B${rowNum}`).alignment = { horizontal: "center" };
    wsDetail.getCell(`C${rowNum}`).font = { bold: true, color: { argb: "1D4ED8" } };
    wsDetail.getCell(`D${rowNum}`).font = { bold: true };
    wsDetail.getCell(`D${rowNum}`).alignment = { horizontal: "center" };
    wsDetail.getCell(`E${rowNum}`).alignment = { horizontal: "center" };
    wsDetail.getCell(`I${rowNum}`).numFmt = '#,##0.00';
    wsDetail.getCell(`J${rowNum}`).numFmt = 'R$ #,##0.00';
    wsDetail.getCell(`J${rowNum}`).font = { bold: true };
    wsDetail.getCell(`K${rowNum}`).alignment = { horizontal: "center" };

    if (idx % 2 === 1) {
      row.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
      });
    }
  });

  // Freeze Header Row
  wsDetail.views = [{ state: "frozen", ySplit: 5 }];

  // Auto Column Widths for Worksheet 2
  wsDetail.columns = [
    { width: 14 }, // Data
    { width: 22 }, // Tipo
    { width: 22 }, // Categoria
    { width: 14 }, // Placa
    { width: 12 }, // Frota
    { width: 18 }, // Conta
    { width: 32 }, // Descrição
    { width: 28 }, // Fornecedor
    { width: 16 }, // Qtd
    { width: 18 }, // Valor
    { width: 14 }, // Status
  ];

  // WRITE AND SAVE FILE
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const fileName = `Relatorio_Frotas_Custos_${filters.agruparPor}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}

/**
 * EXPORTAÇÃO PDF PROFISSIONAL (.PDF)
 */
export function exportReportToPDF(data: ExportReportData) {
  const { filters, overallMetrics, aggregatedData, vehicleStats, tableFilteredRecords } = data;
  const company = filters.companyName || "CHECKDRIVE GESTÃO DE FROTAS";
  const emissionDate = new Date().toLocaleString("pt-BR");

  // Landscape A4 orientation (297mm x 210mm)
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. HEADER BANNER (Slate 900)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(company.toUpperCase(), 14, 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(147, 197, 253); // Blue 300
  doc.text("RELATÓRIO EXECUTIVO DE ANÁLISE DE CUSTOS & FROTAS", 14, 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Emissão: ${emissionDate}`, pageWidth - 14, 17, { align: "right" });

  // 2. FILTERS BADGES BAR
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(14, 29, pageWidth - 28, 12, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 29, pageWidth - 28, 12, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const filterText = `Período: ${filters.periodLabel}   |   Categoria: ${filters.categoryFilter}   |   Tipo: ${filters.tipoImportacaoFilter}   |   Agrupamento: ${filters.agruparPor.toUpperCase()}`;
  doc.text(filterText, 18, 36.5);

  // 3. EXECUTIVE KPI CARDS
  const cardY = 44;
  const cardW = (pageWidth - 28 - 9) / 4;
  const cardH = 18;

  const kpis = [
    { label: "CUSTO TOTAL ACUMULADO", val: formatCurrency(overallMetrics.totalValorGeral), color: [15, 23, 42], bg: [248, 250, 252] },
    { label: "VOLUME / CONSUMO TOTAL", val: `${formatNumber(overallMetrics.totalQtyGeral)} L`, color: [180, 83, 9], bg: [254, 243, 199] },
    { label: "TOTAL DE VIAGENS / LANÇAMENTOS", val: `${overallMetrics.totalRegistrosCount} viagens`, color: [67, 56, 202], bg: [238, 242, 255] },
    { label: "TICKET MÉDIO POR VIAGEM", val: formatCurrency(overallMetrics.mediaValorGeral), color: [4, 120, 87], bg: [236, 253, 245] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = 14 + idx * (cardW + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "S");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 5, cardY + 6);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, cardX + 5, cardY + 14);
  });

  let currentY = 67;

  // 4. TOP 10 MAIOR CUSTO TABLE
  const top10HighList = vehicleStats?.top10Highest || [];
  if (top10HighList.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(159, 18, 57); // Rose 800
    doc.text("RANKING: TOP 10 VEÍCULOS DE MAIOR CUSTO", 14, currentY);

    const highColumns = [
      "#",
      "Placa",
      "Frota",
      "Qtd Viagens",
      "Consumo (L)",
      "Custo Total (R$)",
      "Média / Viagem (R$)",
      "Categorias de Custo",
    ];

    const highRows = top10HighList.map((v, i) => {
      const avg = v.viagensCount > 0 ? v.totalCost / v.viagensCount : 0;
      const catDesc = Object.entries(v.categories || {})
        .map(([cName, cVal]) => `${cName}: ${formatCurrency(cVal.valor)}`)
        .join(" | ");

      return [
        `#${i + 1}`,
        v.placa,
        v.numero_frota || "-",
        `${v.viagensCount} viagens`,
        formatNumber(v.totalLiters, 1),
        formatCurrency(v.totalCost),
        formatCurrency(avg),
        catDesc,
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [highColumns],
      body: highRows,
      theme: "grid",
      headStyles: {
        fillColor: [190, 18, 60], // Rose 700
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242],
      },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", cellWidth: 10 },
        1: { halign: "center", fontStyle: "bold", cellWidth: 22 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "right", cellWidth: 24 },
        5: { halign: "right", fontStyle: "bold", textColor: [159, 18, 57], cellWidth: 32 },
        6: { halign: "right", cellWidth: 28 },
        7: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. TOP 10 MENOR CUSTO TABLE
  const top10LowList = vehicleStats?.top10Lowest || [];
  if (top10LowList.length > 0) {
    if (currentY + 45 > pageHeight) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 70); // Emerald 800
    doc.text("RANKING: TOP 10 VEÍCULOS DE MENOR CUSTO", 14, currentY);

    const lowColumns = [
      "#",
      "Placa",
      "Frota",
      "Qtd Viagens",
      "Consumo (L)",
      "Custo Total (R$)",
      "Média / Viagem (R$)",
      "Categorias de Custo",
    ];

    const lowRows = top10LowList.map((v, i) => {
      const avg = v.viagensCount > 0 ? v.totalCost / v.viagensCount : 0;
      const catDesc = Object.entries(v.categories || {})
        .map(([cName, cVal]) => `${cName}: ${formatCurrency(cVal.valor)}`)
        .join(" | ");

      return [
        `#${i + 1}`,
        v.placa,
        v.numero_frota || "-",
        `${v.viagensCount} viagens`,
        formatNumber(v.totalLiters, 1),
        formatCurrency(v.totalCost),
        formatCurrency(avg),
        catDesc,
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [lowColumns],
      body: lowRows,
      theme: "grid",
      headStyles: {
        fillColor: [4, 120, 87], // Emerald 700
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", cellWidth: 10 },
        1: { halign: "center", fontStyle: "bold", cellWidth: 22 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "right", cellWidth: 24 },
        5: { halign: "right", fontStyle: "bold", textColor: [4, 120, 87], cellWidth: 32 },
        6: { halign: "right", cellWidth: 28 },
        7: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. AGRUPADO TABLE
  const aggList = aggregatedData || [];
  if (aggList.length > 0) {
    if (currentY + 45 > pageHeight) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 48, 163); // Indigo 800
    doc.text(`RESUMO AGRUPADO POR: ${filters.agruparPor.toUpperCase()}`, 14, currentY);

    const groupColumns = [
      `Agrupamento (${filters.agruparPor})`,
      "Qtd Lançamentos",
      "Soma Volume / Litros",
      "Valor Total (R$)",
      "Média Valor (R$)",
      "% do Custo Total",
    ];

    const groupRows = aggList.map((g) => [
      g.name,
      g.count,
      formatNumber(g.totalQty, 2),
      formatCurrency(g.valorTotal),
      formatCurrency(g.mediaValor),
      `${g.percent.toFixed(1)}%`,
    ]);

    // Total Row
    groupRows.push([
      "TOTAL GERAL",
      overallMetrics.totalRegistrosCount,
      formatNumber(overallMetrics.totalQtyGeral, 2),
      formatCurrency(overallMetrics.totalValorGeral),
      formatCurrency(overallMetrics.mediaValorGeral),
      "100.0%",
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [groupColumns],
      body: groupRows,
      theme: "grid",
      headStyles: {
        fillColor: [67, 56, 202], // Indigo 700
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [238, 242, 255],
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold", textColor: [30, 27, 75] },
        4: { halign: "right" },
        5: { halign: "center", fontStyle: "bold" },
      },
      didParseCell: (dataCell) => {
        if (dataCell.row.index === groupRows.length - 1) {
          dataCell.cell.styles.fontStyle = "bold";
          dataCell.cell.styles.fillColor = [226, 232, 240];
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 7. DETALHAMENTO DE LANÇAMENTOS (ITEMIZED TABLE)
  const detailList = tableFilteredRecords || [];
  if (detailList.length > 0) {
    if (currentY + 45 > pageHeight) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`LANÇAMENTOS DETALHADOS (${detailList.length} REGISTROS)`, 14, currentY);

    const detailColumns = [
      "Data",
      "Tipo",
      "Categoria",
      "Placa",
      "Frota",
      "Descrição / Conta",
      "Fornecedor",
      "Qtd/Litros",
      "Valor (R$)",
    ];

    // Show up to 300 records in PDF to keep file size performant
    const detailRows = detailList.slice(0, 300).map((r) => {
      const isGFV = r.import_job_id?.includes("combustivel") || r.quantidade > 0;
      return [
        r.data || "-",
        isGFV ? "GFV" : "SOFtran",
        r.tipo_registro || "-",
        r.placa || "-",
        r.numero_frota || "-",
        r.descricao_conta || r.conta || "-",
        r.fornecedor || "-",
        Number(r.quantidade || 0) > 0 ? formatNumber(Number(r.quantidade), 1) : "-",
        formatCurrency(getRecordFinancialValue(r, data.filters.tipoImportacaoFilter === "combustivel_gfv")),
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [detailColumns],
      body: detailRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },
        1: { halign: "center", cellWidth: 16 },
        2: { fontStyle: "bold", textColor: [29, 78, 216], cellWidth: 26 },
        3: { halign: "center", fontStyle: "bold", cellWidth: 20 },
        4: { halign: "center", cellWidth: 16 },
        5: { cellWidth: "auto" },
        6: { cellWidth: 35 },
        7: { halign: "right", cellWidth: 20 },
        8: { halign: "right", fontStyle: "bold", cellWidth: 26 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // FOOTER PAGINATION ON ALL PAGES
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.text(`${company} - Relatório de Gestão Integrada de Frotas e Importações`, 14, pageHeight - 6);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }

  const pdfFileName = `Relatorio_Frotas_Custos_${filters.agruparPor}_${new Date().toISOString().substring(0, 10)}.pdf`;
  doc.save(pdfFileName);
}
