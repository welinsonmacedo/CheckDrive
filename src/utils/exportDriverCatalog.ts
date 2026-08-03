import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const exportDriversToExcel = (
  drivers: any[],
  branches: any[] = [],
  fileNamePrefix: string = "Relatorio_Motoristas"
) => {
  const data = drivers.map((driver) => {
    const branchObj = branches.find((b) => b.id === driver.branch_id);
    const branchName = branchObj ? branchObj.name : driver.branch_name || "-";

    return {
      "Nome Completo": driver.full_name || "-",
      "E-mail": driver.email || "-",
      "CPF": driver.cpf || "-",
      "CNH": driver.cnh_number || "-",
      "Categoria CNH": driver.cnh_category || "-",
      "Validade CNH": driver.cnh_expiration_date
        ? new Date(driver.cnh_expiration_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "-",
      "1ª Habilitação": driver.cnh_first_date
        ? new Date(driver.cnh_first_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "-",
      "Tipo de Motorista": driver.driver_type || "Interno/Pátio",
      "Filial Atribuída": branchName,
      "Perfil de Pontuação": driver.score_profiles?.name || "-",
      "Participa do Ranking": driver.participates_in_ranking !== false ? "Sim" : "Não",
      "Status": driver.active !== false ? "Ativo" : "Inativo",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 28 }, // Nome
    { wch: 28 }, // Email
    { wch: 16 }, // CPF
    { wch: 16 }, // CNH
    { wch: 14 }, // Categoria
    { wch: 14 }, // Validade
    { wch: 14 }, // 1a Habilitacao
    { wch: 18 }, // Tipo
    { wch: 22 }, // Filial
    { wch: 20 }, // Perfil
    { wch: 20 }, // Ranking
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Motoristas");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${fileNamePrefix}_${today}.xlsx`);
};

export const exportDriversToPDF = (
  drivers: any[],
  branches: any[] = [],
  title: string = "RELAÇÃO DE MOTORISTAS"
) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const todayStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Data de Emissão: ${todayStr} | Total de Motoristas: ${drivers.length}`, 14, 22);

  const tableColumn = [
    "Nome Completo",
    "CPF",
    "CNH / Cat.",
    "Validade CNH",
    "Tipo Motorista",
    "Filial",
    "Status",
  ];

  const tableRows = drivers.map((driver) => {
    const branchObj = branches.find((b) => b.id === driver.branch_id);
    const branchName = branchObj ? branchObj.name : driver.branch_name || "-";
    const cnhInfo = driver.cnh_number
      ? `${driver.cnh_number}${driver.cnh_category ? ` (${driver.cnh_category})` : ""}`
      : "-";

    return [
      driver.full_name || "-",
      driver.cpf || "-",
      cnhInfo,
      driver.cnh_expiration_date
        ? new Date(driver.cnh_expiration_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : "-",
      driver.driver_type || "Interno/Pátio",
      branchName,
      driver.active !== false ? "Ativo" : "Inativo",
    ];
  });

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
    margin: { top: 27, left: 14, right: 14 },
  });

  const today = new Date().toISOString().split("T")[0];
  doc.save(`Relatorio_Motoristas_${today}.pdf`);
};
