import * as pdfjsLib from "pdfjs-dist";
import { ImportRecord, RecordCategory } from "../types";
import { categorizeAccount } from "./classifier";
import { generateRecordHash } from "./hashUtils";

// Configure pdfjs worker safely using jsdelivr for the exact pdfjs-dist version
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ParsedPdfResult {
  periodo?: string;
  records: Omit<ImportRecord, "id" | "import_job_id" | "empresa_id" | "status" | "conflito">[];
  rawText: string;
  totalExtracted: number;
}

export async function parseSeniorPdfFile(
  file: File,
  empresa_id: string
): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  let fullText = "";

  try {
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      const items = textContent.items as any[];
      const textItems = items.filter((item) => typeof item.str === "string" && item.str.length > 0);

      // Group items into lines by Y coordinate (vertical positioning) with 3.5px tolerance
      const lineMap = new Map<number, { x: number; text: string }[]>();

      for (const item of textItems) {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] || 0;
        const yRaw = transform[5] || 0;
        const yBucket = Math.round(yRaw / 3.5) * 3.5;

        if (!lineMap.has(yBucket)) {
          lineMap.set(yBucket, []);
        }
        lineMap.get(yBucket)!.push({ x, text: item.str });
      }

      // Sort Y buckets descending (top to bottom on PDF page)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const pageLines: string[] = [];

      for (const y of sortedY) {
        const lineItems = lineMap.get(y)!;
        // Sort items on the same line left-to-right by X coordinate
        lineItems.sort((a, b) => a.x - b.x);

        const lineString = lineItems.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
        if (lineString) {
          pageLines.push(lineString);
        }
      }

      fullText += pageLines.join("\n") + "\n";
    }
  } catch (err) {
    console.warn("PDF.js direct extraction error, falling back to text decoder:", err);
    try {
      const decoder = new TextDecoder("utf-8");
      fullText = decoder.decode(arrayBuffer);
    } catch {
      fullText = "";
    }
  }

  return parseSeniorTextContent(fullText, empresa_id);
}

export async function parseSeniorTextContent(
  fullText: string,
  empresa_id: string
): Promise<ParsedPdfResult> {
  // Check if PDF is a fuel consumption report ("Consumo de Combustíveis por Veículo")
  const isFuelConsumptionReport =
    fullText.includes("Consumo de Combustíveis por Veículo") ||
    fullText.includes("Qt.Combustível") ||
    fullText.includes("Hodôm./Horim.") ||
    (fullText.includes("Hodômetro Inicial:") && fullText.includes("GFV Versão"));

  if (isFuelConsumptionReport) {
    return parseFuelConsumptionTextContent(fullText, empresa_id);
  }

  // Format 1: Senior / SOFtran "Receitas/Despesas por Veículo" / Relatório de Contas
  const periodoMatch =
    fullText.match(/Período\s+de:\s*([\d\/\.\-]+(?:\s*at[ée]\s*[\d\/\.\-]+)?)/i) ||
    fullText.match(/(?:período|periodo|data\s+inicial|de|emissã[o0]):\s*([\d\/\.\-]+(?:\s*a\s*[\d\/\.\-]+)?)/i);
  const periodo = periodoMatch ? periodoMatch[1].trim() : `${new Date().toLocaleDateString("pt-BR")}`;

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawRecords: any[] = [];
  let currentVehicleCode = "";
  let currentFleet = "";
  let currentPlaca = "";
  let currentContaNumber = "";
  let currentContaName = "";
  let currentContaFull = "Lançamento Geral";

  const plateRegex = /\b([A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4})\b/i;
  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignore header and footer summary lines
    if (
      line.startsWith("Total ") ||
      line.startsWith("GFV Versão") ||
      line.startsWith("Receitas/Despesas") ||
      line.startsWith("Período de:") ||
      line.startsWith("Lançamento Hodômetro") ||
      line.includes("Total da Conta:") ||
      line.includes("Total de Receitas") ||
      line.includes("Total de Despesas") ||
      line.includes("Total Líquido:") ||
      line.includes("Total Geral") ||
      line.startsWith("SOFtran")
    ) {
      continue;
    }

    // Check for Veículo header line e.g., "Veículo: 0", "Veículo: 1 101 OOW9770", "Veículo: 17 HOA0893", "Veículo: 62 PARCEIRO AAA0000"
    if (line.match(/^Ve[íi]culo:/i)) {
      const vehicleText = line.replace(/^Ve[íi]culo:\s*/i, "").trim();
      const plateMatch = vehicleText.match(plateRegex);

      if (plateMatch) {
        currentPlaca = plateMatch[1].replace("-", "").toUpperCase();
      } else {
        const firstWord = vehicleText.split(/\s+/)[0];
        currentPlaca = firstWord ? `VEIC-${firstWord.padStart(2, "0")}` : "FROTA-GERAL";
      }

      const parts = vehicleText.split(/\s+/);
      currentVehicleCode = parts[0] || "";
      if (parts.length >= 3 && !parts[1].match(plateRegex)) {
        currentFleet = parts[1];
      } else {
        currentFleet = currentVehicleCode;
      }
      continue;
    }

    // Check for Conta header line e.g., "Conta: 106 Gasolina 06.02.001", "Conta: 104 Diesel S10 06.01.002"
    if (line.match(/^Conta:/i)) {
      const contaText = line.replace(/^Conta:\s*/i, "").trim();
      const contaMatch = contaText.match(/^(\d+)\s+(.*?)(?:\s+(\d{2}\.\d{2}\.\d{3}))?$/);

      if (contaMatch) {
        currentContaNumber = contaMatch[1];
        currentContaName = contaMatch[2].trim();
      } else {
        currentContaNumber = "";
        currentContaName = contaText;
      }

      currentContaFull = currentContaName
        ? `${currentContaName}${currentContaNumber ? ` (${currentContaNumber})` : ""}`
        : "Lançamento Geral";
      continue;
    }

    // Check for Date line starting with DD/MM/YYYY
    const dMatch = line.match(dateRegex);
    if (dMatch) {
      const dateBr = dMatch[1];
      const isoDate = convertBrDateToIso(dateBr);

      const afterDate = line.substring(dateBr.length).trim();

      // Extract all Brazilian currency/number formatted tokens e.g. 69,08 or 462,15 or 251.753,0 or 1,00
      const brNumberMatches = line.match(/\b\d{1,3}(?:\.\d{3})*,\d{1,2}\b/g) || [];

      let valor = 0;
      let quantidade = 1;
      let hodometro: number | undefined = undefined;

      if (brNumberMatches.length >= 2) {
        // Last number is Valor, second to last is Quantity
        valor = parseBrFloat(brNumberMatches[brNumberMatches.length - 1]);
        quantidade = parseBrFloat(brNumberMatches[brNumberMatches.length - 2]);

        // If there's a 3rd number, check if it's Hodômetro (e.g. 251.753,0)
        if (brNumberMatches.length >= 3) {
          const candidateKm = parseBrFloat(brNumberMatches[0]);
          if (candidateKm > 0) {
            hodometro = Math.round(candidateKm);
          }
        }
      } else if (brNumberMatches.length === 1) {
        valor = parseBrFloat(brNumberMatches[0]);
      }

      // Skip invalid or 0 value lines
      if (valor === 0) continue;

      // Extract Fornecedor and Document details from middle text
      let middleText = afterDate;
      brNumberMatches.forEach((numStr) => {
        middleText = middleText.replace(numStr, "");
      });
      middleText = middleText.replace(/\s+/g, " ").trim();

      // Look for document number (e.g., 13241, 110000408, SIC5119771, 76720)
      let documento = "";
      const docMatch = middleText.match(/\b(\d{5,10}|NF-?\d+|SIC\d+)\b/i);
      if (docMatch) {
        documento = docMatch[1];
      }

      // Extract supplier name by stripping known doc types / codes / numbers
      const textCleaned = middleText
        .replace(/\b(PÇS|Serv|Ext|Multas|Acerto|Via|SIC\d+)\b/gi, "")
        .replace(/\b\d+\b/g, "")
        .replace(/[-]/g, "")
        .trim();

      const fornecedor = textCleaned || "Fornecedor Não Especificado";

      // Categorize account using classifier
      const tipo_registro: RecordCategory = categorizeAccount(currentContaName, line);

      rawRecords.push({
        tipo_registro,
        placa: currentPlaca || "FROTA-GERAL",
        numero_frota: currentFleet || undefined,
        data: isoDate,
        conta: currentContaFull,
        descricao_conta: `${currentContaName} - ${fornecedor}${documento ? ` (Doc: ${documento})` : ""}`,
        quantidade: quantidade || 1,
        valor: valor || 0,
        hodometro,
        fornecedor,
        documento: documento || undefined,
        numero_controle: documento || undefined,
        observacoes: `Importado de relatório SOFTran/Senior - Período ${periodo}`,
      });
    }
  }

  // Calculate SHA-256 hashes for all parsed records
  const recordsWithHash = await Promise.all(
    rawRecords.map(async (r) => {
      const hash = await generateRecordHash({
        empresa_id,
        placa: r.placa,
        conta: r.conta,
        data: r.data,
        valor: r.valor,
        quantidade: r.quantidade,
        fornecedor: r.fornecedor,
        documento: r.documento,
        hodometro: r.hodometro,
      });

      return {
        ...r,
        hash_registro: hash,
      };
    })
  );

  return {
    periodo,
    records: recordsWithHash,
    rawText: fullText,
    totalExtracted: recordsWithHash.length,
  };
}

export async function parseFuelConsumptionTextContent(
  fullText: string,
  empresa_id: string
): Promise<ParsedPdfResult> {
  // Extract Period e.g. "Período de: 01/07/2026 até 31/07/2026;"
  const periodoMatch =
    fullText.match(/Período\s+de:\s*([\d\/\.\-]+(?:\s*at[ée]\s*[\d\/\.\-]+)?)/i) ||
    fullText.match(/(?:período|periodo):\s*([\d\/\.\-]+(?:\s*a\s*[\d\/\.\-]+)?)/i);
  const periodo = periodoMatch ? periodoMatch[1].replace(";", "").trim() : `${new Date().toLocaleDateString("pt-BR")}`;

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawRecords: any[] = [];
  let currentFleet = "";
  let currentPlaca = "";
  let currentVehicleModel = "";

  const plateRegex = /\b([A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4}|[A-Z]{3}\s+[0-9][A-Z0-9][0-9]{2})\b/i;
  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignore headers, totals, footers
    if (
      line.startsWith("Total por ") ||
      line.startsWith("Total ") ||
      line.startsWith("TOTAL GERAL") ||
      line.startsWith("GFV Versão") ||
      line.startsWith("Consumo de Combustíveis") ||
      line.startsWith("Período de:") ||
      line.startsWith("Abastecimento Fornecedor") ||
      line.startsWith("SOFtran")
    ) {
      continue;
    }

    // Vehicle header e.g. "Veículo: 1 OOW9770 Hodômetro Inicial: 251.541,000 VW/8.160 DRC 4x2 CAMIONETE 3/4"
    if (line.match(/^Ve[íi]culo:/i)) {
      const vehicleText = line.replace(/^Ve[íi]culo:\s*/i, "").trim();

      // Extract plate
      const plateMatch = vehicleText.match(plateRegex);
      if (plateMatch) {
        currentPlaca = plateMatch[1].replace(/[\s-]/g, "").toUpperCase();
      } else {
        const firstWord = vehicleText.split(/\s+/)[0];
        currentPlaca = firstWord ? `VEIC-${firstWord.padStart(2, "0")}` : "FROTA-GERAL";
      }

      // Extract fleet/code
      const parts = vehicleText.split(/\s+/);
      currentFleet = parts[0] || "";

      // Extract vehicle model (after Hodômetro Inicial or after plate)
      const hodometroIdx = vehicleText.indexOf("Hodômetro Inicial:");
      if (hodometroIdx !== -1) {
        const afterHod = vehicleText.substring(hodometroIdx);
        currentVehicleModel = afterHod.replace(/^Hod[ôo]metro\s+Inicial:\s*[\d\.\,]+/i, "").trim();
      } else {
        currentVehicleModel = vehicleText;
      }
      continue;
    }

    // Date line starting with DD/MM/YYYY
    const dMatch = line.match(dateRegex);
    if (dMatch) {
      const dateBr = dMatch[1];
      const isoDate = convertBrDateToIso(dateBr);

      const afterDate = line.substring(dateBr.length).trim();

      // Find all BR float tokens e.g. 72,731 or 251.753,000 or 512,02 or 7,040 or 2,415
      const brNumberMatches = line.match(/\b\d{1,3}(?:\.\d{3})*,\d{1,3}\b/g) || [];

      // Extract document number (typically 5 to 10 digits e.g. 1100004085)
      let documento = "";
      const docMatch = afterDate.match(/\b(\d{7,10})\b/);
      if (docMatch) {
        documento = docMatch[1];
      }

      // Extract supplier name by stripping date, doc number, float numbers, sequence numbers
      let textCleaned = afterDate;
      if (documento) {
        textCleaned = textCleaned.replace(documento, "");
      }
      brNumberMatches.forEach((numStr) => {
        textCleaned = textCleaned.replace(numStr, "");
      });

      // Remove standalone single/double digit numbers (sequence numbers e.g. 4, 3, 11)
      textCleaned = textCleaned
        .replace(/\b\d{1,2}\b/g, "")
        .replace(/[-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const fornecedor = textCleaned || "Posto / Fornecedor Não Especificado";

      // Parse numbers
      const parsedFloats = brNumberMatches.map(parseBrFloat);

      let quantidade = 0;
      let hodometro: number | undefined = undefined;
      let valor = 0;
      let pLitro = 0;

      if (parsedFloats.length >= 2) {
        // Find if any pair of numbers satisfy: Math.abs(val - qty * pLitro) < 0.15
        let foundMatch = false;
        for (let qIdx = 0; qIdx < parsedFloats.length; qIdx++) {
          for (let pIdx = 0; pIdx < parsedFloats.length; pIdx++) {
            if (qIdx === pIdx) continue;
            const qCand = parsedFloats[qIdx];
            const pCand = parsedFloats[pIdx];

            if (qCand > 0 && pCand > 0 && pCand < 25) {
              const calcVal = qCand * pCand;
              const vCand = parsedFloats.find((v, idx) => idx !== qIdx && idx !== pIdx && Math.abs(v - calcVal) < 0.15);
              if (vCand !== undefined) {
                quantidade = qCand;
                pLitro = pCand;
                valor = vCand;
                foundMatch = true;
                break;
              }
            }
          }
          if (foundMatch) break;
        }

        // Fallback if math match wasn't found directly:
        if (!foundMatch) {
          const largeHod = parsedFloats.find((f) => f > 1000);
          if (largeHod) hodometro = Math.round(largeHod);

          const nonHod = parsedFloats.filter((f) => f !== largeHod);
          if (nonHod.length >= 2) {
            valor = nonHod[nonHod.length - 2] || nonHod[0];
            quantidade = nonHod[0];
          } else if (nonHod.length === 1) {
            valor = nonHod[0];
          }
        } else {
          // Also check for Hodômetro among floats (usually > 1000)
          const candidateHod = parsedFloats.find((f) => f > 1000);
          if (candidateHod) {
            hodometro = Math.round(candidateHod);
          }
        }
      } else if (parsedFloats.length === 1) {
        valor = parsedFloats[0];
      }

      if (valor === 0 && quantidade === 0) continue;

      // Categorize account
      const categoryText = `${currentVehicleModel} ${fornecedor} ${line}`;
      const tipo_registro: RecordCategory = categorizeAccount("Combustível", categoryText);

      const contaFull = "Consumo de Combustível";
      const obsInfo = [
        currentVehicleModel ? `Veículo: ${currentVehicleModel}` : "",
        pLitro > 0 ? `P/Litro: R$ ${pLitro.toFixed(3)}` : "",
        "Relatório GFV - Consumo por Veículo",
      ].filter(Boolean).join(" | ");

      rawRecords.push({
        tipo_registro,
        placa: currentPlaca || "FROTA-GERAL",
        numero_frota: currentFleet || undefined,
        data: isoDate,
        conta: contaFull,
        descricao_conta: `Abastecimento - ${fornecedor}${documento ? ` (Doc: ${documento})` : ""}`,
        quantidade: quantidade || 1,
        valor: valor || 0,
        hodometro,
        fornecedor,
        documento: documento || undefined,
        numero_controle: documento || undefined,
        observacoes: obsInfo,
      });
    }
  }

  // Calculate SHA-256 hashes for all parsed records
  const recordsWithHash = await Promise.all(
    rawRecords.map(async (r) => {
      const hash = await generateRecordHash({
        empresa_id,
        placa: r.placa,
        conta: r.conta,
        data: r.data,
        valor: r.valor,
        quantidade: r.quantidade,
        fornecedor: r.fornecedor,
        documento: r.documento,
        hodometro: r.hodometro,
      });

      return {
        ...r,
        hash_registro: hash,
      };
    })
  );

  return {
    periodo,
    records: recordsWithHash,
    rawText: fullText,
    totalExtracted: recordsWithHash.length,
  };
}

function parseBrFloat(strVal: string): number {
  if (!strVal) return 0;
  if (strVal.includes(",")) {
    const clean = strVal.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  }
  return parseFloat(strVal) || 0;
}

function convertBrDateToIso(brDate: string): string {
  const parts = brDate.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}
