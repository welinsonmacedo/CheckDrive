import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { ImportRecord, RecordCategory } from "../types";
import { categorizeAccount } from "./classifier";
import { generateRecordHash } from "./hashUtils";
import { AccountMappingService, AccountMapping } from "../services/accountMappingService";

// Configure pdfjs worker safely using jsdelivr for the exact pdfjs-dist version
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ParsedPdfResult {
  periodo?: string;
  records: Omit<ImportRecord, "id" | "import_job_id" | "empresa_id" | "status" | "conflito">[];
  rawText: string;
  totalExtracted: number;
  extractedMonths?: string[];
}

const PT_MONTHS_MAP: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  março: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

/**
 * Normalizes text line by repairing spaces artificially introduced by PDF.js text layer.
 * Examples:
 * "15 / 07 / 2024" -> "15/07/2024"
 * "15 / Jul / 2024" -> "15/07/2024"
 * "251 . 753 , 000" -> "251.753,000"
 * "R $ 1 . 500 , 00" -> "R$ 1500,00"
 */
export function cleanPdfLineText(rawLine: string): string {
  if (!rawLine) return "";
  let line = rawLine;

  // 1. Repair date fragments with spaces around slashes/hyphens: "15 / 07 / 2024" or "15 / 07 / 24"
  line = line.replace(/(\b\d{1,2})\s*[\/\.-]\s*(\d{1,2})\s*[\/\.-]\s*(\d{2,4}\b)/g, "$1/$2/$3");

  // 2. Repair date fragments with Portuguese month names/abbreviations: "15 / Jan / 2024" or "15 / JUL / 24"
  line = line.replace(
    /(\b\d{1,2})\s*[\/\.-]\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*[\/\.-]\s*(\d{2,4}\b)/gi,
    (_match, d, mName, y) => {
      const mNum = PT_MONTHS_MAP[mName.toLowerCase()] || "01";
      return `${d}/${mNum}/${y}`;
    }
  );

  // 3. Repair short date fragments: "15 / 07"
  line = line.replace(/(\b\d{1,2})\s*\/\s*(\d{1,2}\b)/g, "$1/$2");

  // 4. Repair numbers with spaces around thousand dots and decimal commas: "251 . 753 , 00" -> "251.753,00"
  line = line.replace(/(\d+)\s*\.\s*(\d{3})\s*,\s*(\d{1,3})/g, "$1.$2,$3");
  line = line.replace(/(\d+)\s*,\s*(\d{1,3})/g, "$1,$2");

  // 5. Repair currency symbols: "R $ 450,00" -> "R$ 450,00"
  line = line.replace(/R\s*\$\s*/gi, "R$ ");

  return line.replace(/\s+/g, " ").trim();
}

/**
 * Attempts to extract an ISO date ("YYYY-MM-DD") and original matched string from a text line.
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - DD/MM/YY, DD-MM-YY
 * - YYYY-MM-DD, YYYY/MM/DD
 * - DD/Jan/YYYY, 15/JUL/2024, etc.
 * - DD/MM (if defaultYear is available)
 */
export function extractDateFromLine(
  line: string,
  defaultYear?: string,
  defaultMonth?: string
): { isoDate: string; rawDateStr: string; matchIndex: number; matchLength: number } | null {
  const cleaned = cleanPdfLineText(line);

  // 1. Check for full 3-part date with 4 or 2 digit year: "15/07/2024", "15-07-2024", "15.07.2024", "15/07/24"
  const fullDateMatch = cleaned.match(/(?:^|\s)(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s|$|,|;)/);
  if (fullDateMatch) {
    const rawMatch = fullDateMatch[0].trim();
    const d = fullDateMatch[1].padStart(2, "0");
    const m = fullDateMatch[2].padStart(2, "0");
    let y = fullDateMatch[3];
    if (y.length === 2) {
      y = Number(y) < 50 ? `20${y}` : `19${y}`;
    }

    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      const isoDate = `${y}-${m}-${d}`;
      const matchIndex = cleaned.indexOf(rawMatch);
      return { isoDate, rawDateStr: rawMatch, matchIndex, matchLength: rawMatch.length };
    }
  }

  // 2. Check for YYYY-MM-DD or YYYY/MM/DD format
  const isoMatch = cleaned.match(/(?:^|\s)(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:\s|$|,|;)/);
  if (isoMatch) {
    const rawMatch = isoMatch[0].trim();
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      const isoDate = `${y}-${m}-${d}`;
      const matchIndex = cleaned.indexOf(rawMatch);
      return { isoDate, rawDateStr: rawMatch, matchIndex, matchLength: rawMatch.length };
    }
  }

  // 3. Check for textual month: "15/Jul/2024", "15-JUL-2024", "15 Julho 2024"
  const textMonthMatch = cleaned.match(
    /(?:^|\s)(\d{1,2})[\/\.\s-]+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[\/\.\s-]+(\d{2,4})(?:\s|$|,|;)/i
  );
  if (textMonthMatch) {
    const rawMatch = textMonthMatch[0].trim();
    const d = textMonthMatch[1].padStart(2, "0");
    const mKey = textMonthMatch[2].toLowerCase();
    const m = PT_MONTHS_MAP[mKey] || "01";
    let y = textMonthMatch[3];
    if (y.length === 2) {
      y = Number(y) < 50 ? `20${y}` : `19${y}`;
    }
    const isoDate = `${y}-${m}-${d}`;
    const matchIndex = cleaned.indexOf(rawMatch);
    return { isoDate, rawDateStr: rawMatch, matchIndex, matchLength: rawMatch.length };
  }

  // 4. Check for DD/MM when defaultYear is known from report headers
  if (defaultYear && /^\d{4}$/.test(defaultYear)) {
    const dayMonthMatch = cleaned.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$|,|;)/);
    if (dayMonthMatch) {
      const rawMatch = dayMonthMatch[0].trim();
      const d = dayMonthMatch[1].padStart(2, "0");
      const m = dayMonthMatch[2].padStart(2, "0");
      if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
        const isoDate = `${defaultYear}-${m}-${d}`;
        const matchIndex = cleaned.indexOf(rawMatch);
        return { isoDate, rawDateStr: rawMatch, matchIndex, matchLength: rawMatch.length };
      }
    }
  }

  // 5. Check for Competence/Month headers: "Mês 07/2024" or "Competência: 07/2024" or "Jul/2024"
  const compMatch = cleaned.match(/(?:compet[êe]ncia|m[êe]s|per[íi]odo|ref|exerc[íi]cio)?:?\s*(\d{1,2})\/(\d{4})/i);
  if (compMatch) {
    const m = compMatch[1].padStart(2, "0");
    const y = compMatch[2];
    if (Number(m) >= 1 && Number(m) <= 12) {
      const d = "01";
      const isoDate = `${y}-${m}-${d}`;
      return { isoDate, rawDateStr: compMatch[0].trim(), matchIndex: 0, matchLength: compMatch[0].length };
    }
  }

  return null;
}

/**
 * Universal File Parser: Accepts PDF, XLSX, XLS, CSV, TXT
 */
export async function parseSeniorPdfFile(
  file: File,
  empresa_id: string
): Promise<ParsedPdfResult> {
  const fileName = file.name.toLowerCase();

  // Route Excel files (.xlsx, .xls)
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
    return parseSpreadsheetFile(file, empresa_id);
  }

  const arrayBuffer = await file.arrayBuffer();
  let fullText = "";

  try {
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      const items = textContent.items as any[];
      const textItems = items.filter((item) => typeof item.str === "string" && item.str.length > 0);

      // Group items into lines by Y coordinate (vertical positioning) with 4.0px tolerance
      const lineMap = new Map<number, { x: number; text: string }[]>();

      for (const item of textItems) {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] || 0;
        const yRaw = transform[5] || 0;
        const yBucket = Math.round(yRaw / 4.0) * 4.0;

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

        const rawLine = lineItems.map((item) => item.text).join(" ");
        const cleanedLine = cleanPdfLineText(rawLine);
        if (cleanedLine) {
          pageLines.push(cleanedLine);
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
  // Load custom account mappings (De-Para)
  let customMappings: AccountMapping[] = [];
  try {
    customMappings = await AccountMappingService.getAccountMappings(empresa_id);
  } catch (e) {
    console.warn("Could not load account mappings in pdfParser:", e);
  }

  // Check if PDF is a fuel consumption report ("Consumo de Combustíveis por Veículo")
  const isFuelConsumptionReport =
    fullText.includes("Consumo de Combustíveis por Veículo") ||
    fullText.includes("Qt.Combustível") ||
    fullText.includes("Hodôm./Horim.") ||
    (fullText.includes("Hodômetro Inicial:") && fullText.includes("GFV Versão"));

  if (isFuelConsumptionReport) {
    return parseFuelConsumptionTextContent(fullText, empresa_id, customMappings);
  }

  // Format 1: Senior / SOFtran "Receitas/Despesas por Veículo" / Relatório de Contas
  const periodoMatch =
    fullText.match(/Período\s+de:\s*([\d\/\.\-]+(?:\s*at[ée]\s*[\d\/\.\-]+)?)/i) ||
    fullText.match(/(?:período|periodo|data\s+inicial|de|emissã[o0]):\s*([\d\/\.\-]+(?:\s*a\s*[\d\/\.\-]+)?)/i);
  const filePeriodo = periodoMatch ? periodoMatch[1].trim() : `${new Date().toLocaleDateString("pt-BR")}`;

  // Extract base year from period if available (e.g. 2024 or 2025)
  let detectedBaseYear = "";
  const yearInPeriod = filePeriodo.match(/\b(20\d{2})\b/);
  if (yearInPeriod) {
    detectedBaseYear = yearInPeriod[1];
  }

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => cleanPdfLineText(l))
    .filter((l) => l.length > 0);

  const rawRecords: any[] = [];
  let currentVehicleCode = "";
  let currentFleet = "";
  let currentPlaca = "";
  let currentContaNumber = "";
  let currentContaName = "";
  let currentContaFull = "Lançamento Geral";
  let currentSectionYear = detectedBaseYear || String(new Date().getFullYear());
  let currentSectionMonth = "";

  const plateRegex = /\b([A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4}|[A-Z]{3}\s+[0-9][A-Z0-9][0-9]{2})\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section year / month change in headers (e.g. "Período de: 01/02/2024 a 28/02/2024" or "Competência: 03/2024")
    const sectionPerMatch = line.match(/(?:per[íi]odo|compet[êe]ncia|exerc[íi]cio|m[êe]s)\s*(?:de:?)?\s*(\d{1,2})[\/\.-](\d{4})/i);
    if (sectionPerMatch) {
      currentSectionMonth = sectionPerMatch[1].padStart(2, "0");
      currentSectionYear = sectionPerMatch[2];
    } else {
      const yearMatch = line.match(/\b(20\d{2})\b/);
      if (yearMatch && (line.includes("Período") || line.includes("Exercício") || line.includes("Ano"))) {
        currentSectionYear = yearMatch[1];
      }
    }

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
        currentPlaca = plateMatch[1].replace(/[\s-]/g, "").toUpperCase();
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

      // Apply smart de-para lookup for account code e.g. 104 -> Diesel S10, 106 -> Gasolina
      if (customMappings.length > 0) {
        const matched = AccountMappingService.findMatchingMapping(
          currentContaNumber || currentContaName,
          customMappings
        );
        if (matched && matched.target_name) {
          currentContaName = matched.target_name;
        }
      }

      currentContaFull = currentContaName
        ? `${currentContaName}${currentContaNumber ? ` (${currentContaNumber})` : ""}`
        : "Lançamento Geral";
      continue;
    }

    // Match date anywhere in the line
    const extractedDate = extractDateFromLine(line, currentSectionYear, currentSectionMonth);
    if (extractedDate) {
      const isoDate = extractedDate.isoDate;
      const rawDateStr = extractedDate.rawDateStr;

      const dateIdx = line.indexOf(rawDateStr);
      const afterDate = dateIdx >= 0 ? line.substring(dateIdx + rawDateStr.length).trim() : line;

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

      // Categorize account using classifier with account number, name, and line
      const tipo_registro: RecordCategory = categorizeAccount(
        currentContaName,
        line,
        customMappings,
        currentContaNumber
      );

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
        observacoes: `Importado de relatório SOFTran/Senior`,
      });
    }
  }

  // Calculate distinct extracted months
  const distinctMonths = Array.from(
    new Set(rawRecords.map((r) => r.data.substring(0, 7)))
  ).sort();

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
    periodo: distinctMonths.length > 1 ? `${distinctMonths[0]} até ${distinctMonths[distinctMonths.length - 1]}` : filePeriodo,
    records: recordsWithHash,
    rawText: fullText,
    totalExtracted: recordsWithHash.length,
    extractedMonths: distinctMonths,
  };
}

export async function parseFuelConsumptionTextContent(
  fullText: string,
  empresa_id: string,
  providedMappings?: AccountMapping[]
): Promise<ParsedPdfResult> {
  let customMappings = providedMappings || [];
  if (!customMappings || customMappings.length === 0) {
    try {
      customMappings = await AccountMappingService.getAccountMappings(empresa_id);
    } catch (e) {
      // ignore
    }
  }

  // Extract Period e.g. "Período de: 01/07/2026 até 31/07/2026;"
  const periodoMatch =
    fullText.match(/Período\s+de:\s*([\d\/\.\-]+(?:\s*at[ée]\s*[\d\/\.\-]+)?)/i) ||
    fullText.match(/(?:período|periodo):\s*([\d\/\.\-]+(?:\s*a\s*[\d\/\.\-]+)?)/i);
  const filePeriodo = periodoMatch ? periodoMatch[1].replace(";", "").trim() : `${new Date().toLocaleDateString("pt-BR")}`;

  let detectedBaseYear = "";
  const yearInPeriod = filePeriodo.match(/\b(20\d{2})\b/);
  if (yearInPeriod) {
    detectedBaseYear = yearInPeriod[1];
  }

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => cleanPdfLineText(l))
    .filter((l) => l.length > 0);

  const rawRecords: any[] = [];
  let currentFleet = "";
  let currentPlaca = "";
  let currentVehicleModel = "";
  let currentSectionYear = detectedBaseYear || String(new Date().getFullYear());
  let currentSectionMonth = "";

  const plateRegex = /\b([A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4}|[A-Z]{3}\s+[0-9][A-Z0-9][0-9]{2})\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section year / month change
    const sectionPerMatch = line.match(/(?:per[íi]odo|compet[êe]ncia|m[êe]s)\s*(?:de:?)?\s*(\d{1,2})[\/\.-](\d{4})/i);
    if (sectionPerMatch) {
      currentSectionMonth = sectionPerMatch[1].padStart(2, "0");
      currentSectionYear = sectionPerMatch[2];
    } else {
      const yearMatch = line.match(/\b(20\d{2})\b/);
      if (yearMatch && (line.includes("Período") || line.includes("Exercício") || line.includes("Ano"))) {
        currentSectionYear = yearMatch[1];
      }
    }

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

    // Date extraction
    const extractedDate = extractDateFromLine(line, currentSectionYear, currentSectionMonth);
    if (extractedDate) {
      const isoDate = extractedDate.isoDate;
      const rawDateStr = extractedDate.rawDateStr;

      const dateIdx = line.indexOf(rawDateStr);
      const afterDate = dateIdx >= 0 ? line.substring(dateIdx + rawDateStr.length).trim() : line;

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
      let pLitro: number | undefined = undefined;
      let kmRodado: number | undefined = undefined;
      let mediaKmL: number | undefined = undefined;
      let precoPorKm: number | undefined = undefined;

      // Standard GFV Consumo por Veículo report format has 7 floats in exact order:
      // [0] Qt.Combustível (Liters)
      // [1] Hodôm./Horim. (Odometer)
      // [2] Km/Horas (Km driven)
      // [3] Média (Km/L)
      // [4] Valor (Total R$)
      // [5] P/Litro (R$/L)
      // [6] P/Km (R$/Km)
      if (parsedFloats.length >= 7) {
        const candidateQt = parsedFloats[0];
        const candidateHod = parsedFloats[1];
        const candidateKm = parsedFloats[2];
        const candidateMedia = parsedFloats[3];
        const candidateVal = parsedFloats[4];
        const candidatePLitro = parsedFloats[5];
        const candidatePKm = parsedFloats[6];

        // Check if math holds for standard positional layout:
        // Qt * P/Litro ≈ Valor OR Qt * Média ≈ Km
        const valMathMatches = candidateQt > 0 && Math.abs(candidateQt * candidatePLitro - candidateVal) < 2.0;
        const kmMathMatches = candidateQt > 0 && Math.abs(candidateQt * candidateMedia - candidateKm) < 2.0;

        if (valMathMatches || kmMathMatches || candidateHod > 1000) {
          quantidade = candidateQt;
          hodometro = Math.round(candidateHod);
          kmRodado = candidateKm;
          mediaKmL = candidateMedia;
          valor = candidateVal;
          pLitro = candidatePLitro;
          precoPorKm = candidatePKm;
        }
      }

      // Fallback if positional layout wasn't matched (e.g. fewer than 7 floats)
      if (valor === 0 && quantidade === 0 && parsedFloats.length >= 2) {
        // Find hodometro (> 1000)
        const hodCand = parsedFloats.find((f) => f > 1000);
        if (hodCand) hodometro = Math.round(hodCand);

        const remaining = parsedFloats.filter((f) => f !== hodCand);

        // Try finding (quantidade, pLitro, valor) where valor = quantidade * pLitro and pLitro is between 2.0 and 20.0
        let foundFinancial = false;
        for (let qI = 0; qI < remaining.length; qI++) {
          for (let pI = 0; pI < remaining.length; pI++) {
            if (qI === pI) continue;
            const q = remaining[qI];
            const p = remaining[pI];

            if (q > 0 && p >= 2.0 && p <= 20.0) {
              const calcV = q * p;
              const vMatch = remaining.find((v, vI) => vI !== qI && vI !== pI && Math.abs(v - calcV) < 1.0);
              if (vMatch !== undefined) {
                quantidade = q;
                pLitro = p;
                valor = vMatch;
                foundFinancial = true;
                break;
              }
            }
          }
          if (foundFinancial) break;
        }

        // Try finding (kmRodado, mediaKmL) among remaining floats where kmRodado = quantidade * mediaKmL
        if (quantidade > 0) {
          for (let kmI = 0; kmI < remaining.length; kmI++) {
            const km = remaining[kmI];
            if (km >= 0 && km !== valor && km !== quantidade) {
              const expectedM = km / quantidade;
              const mMatch = remaining.find((m, mI) => mI !== kmI && Math.abs(m - expectedM) < 0.25);
              if (mMatch !== undefined && mMatch <= 30) {
                kmRodado = km;
                mediaKmL = mMatch;
                break;
              }
            }
          }
        }

        // Basic fallback for remaining
        if (valor === 0 && remaining.length > 0) {
          valor = remaining[remaining.length - 1];
          if (quantidade === 0) quantidade = remaining[0] || 1;
        }
      } else if (parsedFloats.length === 1) {
        valor = parsedFloats[0];
      }

      if (valor === 0 && quantidade === 0) continue;

      // Ensure fallbacks for derived fields if missing
      if ((pLitro === undefined || pLitro === 0) && quantidade > 0 && valor > 0) {
        pLitro = valor / quantidade;
      }
      if ((mediaKmL === undefined || mediaKmL === 0) && kmRodado !== undefined && kmRodado > 0 && quantidade > 0) {
        mediaKmL = kmRodado / quantidade;
      }
      if ((precoPorKm === undefined || precoPorKm === 0) && kmRodado !== undefined && kmRodado > 0 && valor > 0) {
        precoPorKm = valor / kmRodado;
      }

      // Categorize account
      const categoryText = `${currentVehicleModel} ${fornecedor} ${line}`;
      const tipo_registro: RecordCategory = categorizeAccount("Combustível", categoryText, customMappings);

      const contaFull = "Consumo de Combustível";
      const obsInfo = [
        currentVehicleModel ? `Veículo: ${currentVehicleModel}` : "",
        pLitro && pLitro > 0 ? `P/Litro: R$ ${pLitro.toFixed(3)}` : "",
        mediaKmL && mediaKmL > 0 ? `Média: ${mediaKmL.toFixed(2)} Km/L` : "",
        kmRodado && kmRodado > 0 ? `Km Rodados: ${kmRodado.toFixed(0)} km` : "",
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
        preco_litro: pLitro ? Number(pLitro.toFixed(3)) : undefined,
        media_km_l: mediaKmL ? Number(mediaKmL.toFixed(2)) : undefined,
        km_rodado: kmRodado ? Number(kmRodado.toFixed(1)) : undefined,
        preco_por_km: precoPorKm ? Number(precoPorKm.toFixed(3)) : undefined,
        fornecedor,
        documento: documento || undefined,
        numero_controle: documento || undefined,
        observacoes: obsInfo,
      });
    }
  }

  // Calculate distinct extracted months
  const distinctMonths = Array.from(
    new Set(rawRecords.map((r) => r.data.substring(0, 7)))
  ).sort();

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
    periodo: distinctMonths.length > 1 ? `${distinctMonths[0]} até ${distinctMonths[distinctMonths.length - 1]}` : filePeriodo,
    records: recordsWithHash,
    rawText: fullText,
    totalExtracted: recordsWithHash.length,
    extractedMonths: distinctMonths,
  };
}

/**
 * Spreadsheet parser (.xlsx, .xls, .csv)
 */
export async function parseSpreadsheetFile(
  file: File,
  empresa_id: string
): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

  let customMappings: AccountMapping[] = [];
  try {
    customMappings = await AccountMappingService.getAccountMappings(empresa_id);
  } catch (e) {
    // ignore
  }

  const rawRecords: any[] = [];
  const plateRegex = /\b([A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4}|[A-Z]{3}\s+[0-9][A-Z0-9][0-9]{2})\b/i;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (!rows || rows.length === 0) continue;

    // Identify header row
    let headerRowIdx = -1;
    let colIndices: Record<string, number> = {};

    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const rowStr = row.map((c) => String(c || "").toLowerCase()).join(" ");
      if (
        rowStr.includes("data") ||
        rowStr.includes("dt.") ||
        rowStr.includes("valor") ||
        rowStr.includes("placa") ||
        rowStr.includes("veiculo") ||
        rowStr.includes("conta")
      ) {
        headerRowIdx = r;
        row.forEach((cellVal, cIdx) => {
          const col = String(cellVal || "").toLowerCase().trim();
          if (col.includes("data") || col.includes("dt.") || col.includes("emissao") || col.includes("movto") || col.includes("periodo") || col.includes("competencia")) {
            colIndices["data"] = cIdx;
          } else if (col.includes("placa")) {
            colIndices["placa"] = cIdx;
          } else if (col.includes("veiculo") || col.includes("veículo") || col.includes("frota")) {
            colIndices["veiculo"] = cIdx;
          } else if (col.includes("conta") || col.includes("despesa") || col.includes("historico") || col.includes("histórico")) {
            colIndices["conta"] = cIdx;
          } else if (col.includes("valor") || col.includes("vlr") || col.includes("total") || col.includes("liquido") || col.includes("líquido")) {
            colIndices["valor"] = cIdx;
          } else if (col.includes("qtd") || col.includes("quantidade") || col.includes("litros") || col.includes("volume")) {
            colIndices["quantidade"] = cIdx;
          } else if (col.includes("fornecedor") || col.includes("posto") || col.includes("estabelecimento") || col.includes("razao") || col.includes("razão")) {
            colIndices["fornecedor"] = cIdx;
          } else if (col.includes("doc") || col.includes("documento") || col.includes("nota") || col.includes("nf")) {
            colIndices["documento"] = cIdx;
          } else if (col.includes("hodometro") || col.includes("hodômetro") || col.includes("km")) {
            colIndices["hodometro"] = cIdx;
          }
        });
        break;
      }
    }

    const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawDate = colIndices["data"] !== undefined ? row[colIndices["data"]] : row[0];
      const rawPlaca = colIndices["placa"] !== undefined ? row[colIndices["placa"]] : colIndices["veiculo"] !== undefined ? row[colIndices["veiculo"]] : row[1];
      const rawConta = colIndices["conta"] !== undefined ? row[colIndices["conta"]] : row[2];
      const rawValor = colIndices["valor"] !== undefined ? row[colIndices["valor"]] : row[row.length - 1];
      const rawQtd = colIndices["quantidade"] !== undefined ? row[colIndices["quantidade"]] : 1;
      const rawForn = colIndices["fornecedor"] !== undefined ? row[colIndices["fornecedor"]] : "";
      const rawDoc = colIndices["documento"] !== undefined ? row[colIndices["documento"]] : "";
      const rawHod = colIndices["hodometro"] !== undefined ? row[colIndices["hodometro"]] : undefined;

      // Extract date
      let isoDate = "";
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, "0");
        const d = String(rawDate.getDate()).padStart(2, "0");
        isoDate = `${y}-${m}-${d}`;
      } else if (typeof rawDate === "number" && rawDate > 25000 && rawDate < 70000) {
        const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getUTCDate()).padStart(2, "0");
        isoDate = `${y}-${m}-${d}`;
      } else {
        const dateExt = extractDateFromLine(String(rawDate || ""));
        if (dateExt) {
          isoDate = dateExt.isoDate;
        }
      }

      if (!isoDate) continue;

      // Parse valor
      let valor = 0;
      if (typeof rawValor === "number") {
        valor = rawValor;
      } else {
        valor = parseBrFloat(String(rawValor || "0"));
      }

      if (valor === 0) continue;

      // Extract plate
      let placaStr = String(rawPlaca || "").trim().toUpperCase();
      const pMatch = placaStr.match(plateRegex);
      if (pMatch) {
        placaStr = pMatch[1].replace(/[\s-]/g, "");
      } else if (!placaStr || placaStr.length < 3) {
        placaStr = "FROTA-GERAL";
      }

      const contaStr = String(rawConta || "Despesa Geral").trim();
      const fornStr = String(rawForn || "Fornecedor").trim();
      const docStr = String(rawDoc || "").trim();
      const qtdNum = typeof rawQtd === "number" ? rawQtd : parseBrFloat(String(rawQtd || "1")) || 1;
      const hodNum = typeof rawHod === "number" ? Math.round(rawHod) : rawHod ? Math.round(parseBrFloat(String(rawHod))) : undefined;

      const tipo_registro: RecordCategory = categorizeAccount(contaStr, `${contaStr} ${fornStr}`, customMappings);

      rawRecords.push({
        tipo_registro,
        placa: placaStr,
        numero_frota: undefined,
        data: isoDate,
        conta: contaStr,
        descricao_conta: `${contaStr} - ${fornStr}${docStr ? ` (Doc: ${docStr})` : ""}`,
        quantidade: qtdNum,
        valor: valor,
        hodometro: hodNum,
        fornecedor: fornStr,
        documento: docStr || undefined,
        numero_controle: docStr || undefined,
        observacoes: `Importado de planilha ${file.name}`,
      });
    }
  }

  const distinctMonths = Array.from(
    new Set(rawRecords.map((r) => r.data.substring(0, 7)))
  ).sort();

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
    periodo: distinctMonths.length > 1 ? `${distinctMonths[0]} até ${distinctMonths[distinctMonths.length - 1]}` : distinctMonths[0] || "Atual",
    records: recordsWithHash,
    rawText: `Planilha com ${recordsWithHash.length} registros`,
    totalExtracted: recordsWithHash.length,
    extractedMonths: distinctMonths,
  };
}

function parseBrFloat(strVal: string): number {
  if (!strVal) return 0;
  if (typeof strVal === "number") return strVal;
  const s = String(strVal).trim().replace(/R\$\s*/gi, "").replace(/[$]/g, "");
  if (s.includes(",") && s.includes(".")) {
    // Check if dot is thousand separator or decimal
    if (s.indexOf(".") < s.indexOf(",")) {
      // 1.234,56
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    } else {
      // 1,234.56
      return parseFloat(s.replace(/,/g, "")) || 0;
    }
  }
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s) || 0;
}

export function convertBrDateToIso(brDate: string): string {
  if (!brDate) return new Date().toISOString().split("T")[0];
  const dateExt = extractDateFromLine(brDate);
  if (dateExt) return dateExt.isoDate;

  const clean = brDate.trim().replace(/[\.\-]/g, "/");
  const parts = clean.split("/").filter(Boolean);

  if (parts.length === 3) {
    // Format YYYY/MM/DD
    if (/^\d{4}$/.test(parts[0])) {
      const y = parts[0];
      const m = parts[1].padStart(2, "0");
      const d = parts[2].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    // Format DD/MM/YYYY or DD/MM/YY
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) {
      y = Number(y) < 50 ? `20${y}` : `19${y}`;
    }
    if (y.length === 4) {
      return `${y}-${m}-${d}`;
    }
  }
  return new Date().toISOString().split("T")[0];
}

