import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const exportVehiclesToExcel = (items: any[], fileNamePrefix: string = "Catalogo_de_Veiculos") => {
  const data = items.map((item) => ({
    "Tipo": item.itemType === "trailer" ? "Reboque" : "Veículo",
    "Placa": item.plate?.toUpperCase() || "-",
    "Modelo": item.model || "-",
    "Chassi": item.chassi?.toUpperCase() || "-",
    "Renavam": item.renavam || "-",
    "Ano Fabricação": item.manufacture_year || "-",
    "Ano Modelo": item.model_year || "-",
    "Combustível": item.fuel_type || "-",
    "Cor": item.color || "-",
    "ANTT": item.antt || "-",
    "Número CRV": item.crv_number || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 14 }, // Tipo
    { wch: 12 }, // Placa
    { wch: 22 }, // Modelo
    { wch: 24 }, // Chassi
    { wch: 16 }, // Renavam
    { wch: 15 }, // Ano Fab
    { wch: 14 }, // Ano Mod
    { wch: 15 }, // Combustivel
    { wch: 12 }, // Cor
    { wch: 14 }, // ANTT
    { wch: 14 }, // CRV
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veículos");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${fileNamePrefix}_${today}.xlsx`);
};

export const exportVehiclesToPDF = (items: any[], title: string = "CATÁLOGO DE VEÍCULOS E REBOQUES") => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const todayStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Data de Emissão: ${todayStr} | Total de Registros: ${items.length}`, 14, 22);

  const tableColumn = [
    "Tipo",
    "Placa",
    "Modelo",
    "Chassi",
    "Renavam",
    "Ano Fab/Mod",
    "Combustível",
    "Cor",
    "ANTT",
  ];

  const tableRows = items.map((item) => [
    item.itemType === "trailer" ? "Reboque" : "Veículo",
    item.plate?.toUpperCase() || "-",
    item.model || "-",
    item.chassi?.toUpperCase() || "-",
    item.renavam || "-",
    `${item.manufacture_year || "-"}/${item.model_year || "-"}`,
    item.fuel_type || "-",
    item.color || "-",
    item.antt || "-",
  ]);

  (doc as any).autoTable({
    startY: 27,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  const today = new Date().toISOString().split("T")[0];
  doc.save(`Catalogo_Veiculos_${today}.pdf`);
};
