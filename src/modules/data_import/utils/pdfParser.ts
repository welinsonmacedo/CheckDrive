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
      
      // Group items into lines by Y coordinate (vertical positioning) with ~3.5px tolerance
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
  // Extract Period if available
  const periodoMatch = fullText.match(/(?:período|periodo|data\s+inicial|de|emissã[o0]):\s*([\d\/\.\-]+(?:\s*a\s*[\d\/\.\-]+)?)/i);
  const periodo = periodoMatch ? periodoMatch[1].trim() : `${new Date().toLocaleDateString("pt-BR")}`;

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Find first license plate in the entire document as a global document fallback
  const globalPlacaMatch = fullText.match(/\b([A-Z]{3}-?\d[A-Z0-9]\d{2})\b/i);
  const globalFallbackPlate = globalPlacaMatch ? globalPlacaMatch[1].toUpperCase().replace("-", "") : "GERAL";

  let rawRecords: any[] = [];
  let currentVehicle = "";
  let currentFleet = "";

  const placaRegex = /\b([A-Z]{3}-?\d[A-Z0-9]\d{2})\b/i;
  const frotaRegex = /(?:frota|veículo|veiculo|unid\.?|cód\.?\s*veíc):\s*([A-Z0-9\-]+)/i;
  // Dates: DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, DD-MM-YYYY
  const dateRegex = /\b(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

  // PASS 1: Line by line standard report parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for vehicle/fleet header in line
    const frotaMatch = line.match(frotaRegex);
    if (frotaMatch) {
      currentFleet = frotaMatch[1].trim();
    }
    const placaMatch = line.match(placaRegex);
    if (placaMatch) {
      currentVehicle = placaMatch[1].toUpperCase().replace("-", "");
    }

    // Look for lines containing date + numerical amounts
    const dMatch = line.match(dateRegex);
    if (dMatch) {
      const recordDateStr = dMatch[1];
      const isoDate = convertToIsoDate(recordDateStr);

      // Extract numbers (monetary/quantity)
      // Brazilian currency format e.g. 1.250,50 or 50,00 or standard 1250.50
      const brMoneyMatches = line.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g) || [];
      const stdMoneyMatches = line.match(/\b\d+\.\d{2}\b/g) || [];

      let valor = 0;
      let quantidade = 1;

      if (brMoneyMatches.length > 0) {
        valor = parseBrFloat(brMoneyMatches[brMoneyMatches.length - 1]);
        if (brMoneyMatches.length > 1) {
          quantidade = parseBrFloat(brMoneyMatches[0]);
        }
      } else if (stdMoneyMatches.length > 0) {
        valor = parseFloat(stdMoneyMatches[stdMoneyMatches.length - 1]) || 0;
        if (stdMoneyMatches.length > 1) {
          quantidade = parseFloat(stdMoneyMatches[0]) || 1;
        }
      }

      // If no monetary format match, try extracting any standalone positive number at end of line
      if (valor === 0) {
        const numMatches = line.match(/\b\d+(?:[\.,]\d+)?\b/g) || [];
        const candidateNums = numMatches
          .map((n) => parseBrFloat(n))
          .filter((n) => n > 0 && n < 1000000);
        if (candidateNums.length > 0) {
          valor = candidateNums[candidateNums.length - 1];
        }
      }

      // Skip lines that have date but 0 value and no description
      if (valor === 0 && !line.toLowerCase().match(/(diesel|pedag|multa|seguro|peça|óleo|mecanic)/)) {
        continue;
      }

      // Extract Odometer / Hodômetro if present (5-7 digits)
      const kmMatch = line.match(/\b(\d{4,7})\s*(?:km|hodômetro|hodometro)?\b/i);
      const hodometro = kmMatch ? parseInt(kmMatch[1], 10) : undefined;

      // Extract Account / Descrição
      let conta = "Lançamento Geral";
      let descricao = line;

      if (line.toLowerCase().includes("diesel")) {
        conta = "Combustível - Diesel";
      } else if (line.toLowerCase().includes("gasolina")) {
        conta = "Combustível - Gasolina";
      } else if (line.toLowerCase().includes("pedag") || line.toLowerCase().includes("pedág")) {
        conta = "Pedágio";
      } else if (line.toLowerCase().includes("multa")) {
        conta = "Multas de Trânsito";
      } else if (line.toLowerCase().includes("seguro")) {
        conta = "Seguros de Frota";
      } else if (line.toLowerCase().includes("peça") || line.toLowerCase().includes("peca")) {
        conta = "Peças e Reposição";
      } else if (line.toLowerCase().includes("óleo") || line.toLowerCase().includes("oleo") || line.toLowerCase().includes("lubrific")) {
        conta = "Lubrificantes";
      } else if (line.toLowerCase().includes("pneu") || line.toLowerCase().includes("recapagem")) {
        conta = "Pneus";
      } else if (line.toLowerCase().includes("mecanic") || line.toLowerCase().includes("serviço") || line.toLowerCase().includes("manuten")) {
        conta = "Serviços Mecânicos / Manutenção";
      }

      // Extract document number
      const docMatch = line.match(/(?:doc|nf|nfe|ctr|nº|n°|controle)\s*:?\s*([a-z0-9\-]+)/i);
      const documento = docMatch ? docMatch[1] : undefined;

      // Extract supplier
      const fornecedorMatch = line.match(/(?:fornecedor|posto|oficina|empresa|estab):\s*([^,-]+)/i);
      const fornecedor = fornecedorMatch ? fornecedorMatch[1].trim() : undefined;

      // Plate priority: line plate > current section plate > global doc plate > "GERAL"
      const linePlateMatch = line.match(placaRegex);
      const placa = linePlateMatch
        ? linePlateMatch[1].toUpperCase().replace("-", "")
        : currentVehicle || globalFallbackPlate;

      const tipo_registro: RecordCategory = categorizeAccount(conta, descricao);

      rawRecords.push({
        tipo_registro,
        placa,
        numero_frota: currentFleet || undefined,
        data: isoDate,
        conta,
        descricao_conta: descricao,
        quantidade: quantidade || 1,
        valor: valor || 0,
        hodometro,
        fornecedor,
        documento,
        numero_controle: documento,
        observacoes: `Importado de relatório PDF - ${periodo}`,
      });
    }
  }

  // PASS 2: If Pass 1 yielded 0 records, try secondary permissive extraction
  if (rawRecords.length === 0) {
    for (const line of lines) {
      const dMatch = line.match(dateRegex);
      if (!dMatch) continue;

      // Find any positive numbers in the line
      const numbers = (line.match(/\b\d+(?:[\.,]\d+)?\b/g) || [])
        .map((s) => parseBrFloat(s))
        .filter((val) => val > 0 && val < 500000);

      if (numbers.length === 0) continue;

      const recordDateStr = dMatch[1];
      const isoDate = convertToIsoDate(recordDateStr);
      const valor = numbers[numbers.length - 1];
      const quantidade = numbers.length > 1 ? numbers[0] : 1;

      const linePlateMatch = line.match(placaRegex);
      const placa = linePlateMatch
        ? linePlateMatch[1].toUpperCase().replace("-", "")
        : globalFallbackPlate;

      const conta = "Lançamento Geral";
      const tipo_registro = categorizeAccount(conta, line);

      rawRecords.push({
        tipo_registro,
        placa,
        data: isoDate,
        conta,
        descricao_conta: line,
        quantidade: quantidade || 1,
        valor: valor || 0,
        observacoes: `Importado de relatório PDF - ${periodo}`,
      });
    }
  }

  // Calculate SHA-256 hashes for all extracted records
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
  // If format is 1.250,50 replace . with empty and , with .
  if (strVal.includes(",")) {
    const clean = strVal.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  }
  return parseFloat(strVal) || 0;
}

function convertToIsoDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const brMatch = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (brMatch) {
    let [, day, month, year] = brMatch;
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return dateStr;
  }

  return new Date().toISOString().split("T")[0];
}
