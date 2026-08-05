import { RecordCategory } from "../types";
import { AccountMapping } from "../services/accountMappingService";

/**
 * Normalizes text by converting to lowercase and stripping accents for comparison.
 */
function normalizeString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function categorizeAccount(
  accountName: string,
  accountDescription?: string,
  customMappings?: AccountMapping[],
  accountNumber?: string
): RecordCategory {
  const cleanAccNum = (accountNumber || "").trim().toLowerCase();

  // 1. Direct match by exact account code in customMappings / default mappings
  if (cleanAccNum && customMappings && customMappings.length > 0) {
    const directMatch = customMappings.find(
      (m) => m.active && m.code.trim().toLowerCase() === cleanAccNum
    );
    if (directMatch && directMatch.category) {
      return directMatch.category as RecordCategory;
    }
  }

  // 2. Extract code number if present in accountName e.g., "104 Diesel S10" or "Conta 106"
  if (!cleanAccNum && accountName && customMappings && customMappings.length > 0) {
    const numMatch = accountName.match(/\b(\d{2,5})\b/);
    if (numMatch) {
      const codeCandidate = numMatch[1].toLowerCase();
      const directMatch = customMappings.find(
        (m) => m.active && m.code.trim().toLowerCase() === codeCandidate
      );
      if (directMatch && directMatch.category) {
        return directMatch.category as RecordCategory;
      }
    }
  }

  const combined = `${cleanAccNum ? `${cleanAccNum} ` : ""}${accountName || ""} ${accountDescription || ""}`.toLowerCase();
  const normCombined = normalizeString(combined);

  // 3. Search customMappings by code pattern, target_name or keywords
  if (customMappings && customMappings.length > 0) {
    for (const m of customMappings) {
      if (!m.active) continue;
      const mCode = m.code.trim().toLowerCase();
      const normTarget = normalizeString(m.target_name);

      if (mCode) {
        const codeRegex = new RegExp(`(?:^|\\b|\\s|\\()${mCode}(?:$|\\b|\\s|\\))`, "i");
        if (codeRegex.test(combined)) {
          return m.category as RecordCategory;
        }
      }

      if (normTarget && normTarget.length >= 3 && normCombined.includes(normTarget)) {
        return m.category as RecordCategory;
      }

      if (m.keywords && m.keywords.some((kw) => kw && normCombined.includes(normalizeString(kw)))) {
        return m.category as RecordCategory;
      }
    }
  }

  // 4. Fallback Keyword rules (without misleading hardcoded code numbers)
  if (
    normCombined.includes("gasolina adm") ||
    normCombined.includes("gasolina admin") ||
    normCombined.includes("gas. adm")
  ) {
    return "Gasolina Administrativo";
  }

  if (normCombined.includes("gasolina")) {
    return "Gasolina";
  }

  if (
    normCombined.includes("diesel ter") ||
    normCombined.includes("diesel terceiro") ||
    normCombined.includes("diesel terc")
  ) {
    return "Diesel Terceiro";
  }

  if (
    normCombined.includes("diesel") ||
    normCombined.includes("s10") ||
    normCombined.includes("s500")
  ) {
    return "Diesel";
  }

  if (normCombined.includes("arla estoque") || normCombined.includes("estoque arla")) {
    return "Arla Estoque";
  }

  if (normCombined.includes("arla") || normCombined.includes("arla32")) {
    return "Arla";
  }

  if (
    normCombined.includes("lubrific") ||
    normCombined.includes("oleo motor") ||
    normCombined.includes("óleo motor") ||
    normCombined.includes("graxa") ||
    normCombined.includes("aditivo")
  ) {
    return "Lubrificantes";
  }

  if (
    normCombined.includes("pedag") ||
    normCombined.includes("pedág") ||
    normCombined.includes("passagens") ||
    normCombined.includes("sem parar") ||
    normCombined.includes("conectcar") ||
    normCombined.includes("cgmp")
  ) {
    return "Pedágio";
  }

  if (
    normCombined.includes("multa") ||
    normCombined.includes("infracao") ||
    normCombined.includes("infração") ||
    normCombined.includes("detran")
  ) {
    return "Multa";
  }

  if (
    normCombined.includes("seguro") ||
    normCombined.includes("apolice") ||
    normCombined.includes("apólice") ||
    normCombined.includes("sinistro")
  ) {
    return "Seguro";
  }

  if (
    normCombined.includes("borracharia") ||
    normCombined.includes("vulcanizacao") ||
    normCombined.includes("pneu")
  ) {
    if (normCombined.includes("recap")) return "Recapagem";
    if (normCombined.includes("novo") || normCombined.includes("aquisicao")) return "Pneus Novos";
    return "Pneus";
  }

  if (
    normCombined.includes("freio") ||
    normCombined.includes("disco") ||
    normCombined.includes("pastilha") ||
    normCombined.includes("cubo")
  ) {
    return "Freios";
  }

  if (
    normCombined.includes("eletrica") ||
    normCombined.includes("elétrica") ||
    normCombined.includes("bateria") ||
    normCombined.includes("lampada")
  ) {
    return "Elétrica";
  }

  if (
    normCombined.includes("lava-jato") ||
    normCombined.includes("lavagem") ||
    normCombined.includes("descontaminacao")
  ) {
    return "Lava-jato";
  }

  if (
    normCombined.includes("rastread") ||
    normCombined.includes("telemetria") ||
    normCombined.includes("omnilink") ||
    normCombined.includes("sascar")
  ) {
    return "Rastreamento";
  }

  if (
    normCombined.includes("mecanica") ||
    normCombined.includes("mecânica") ||
    normCombined.includes("manutencao") ||
    normCombined.includes("manutenção") ||
    normCombined.includes("servico") ||
    normCombined.includes("serviço") ||
    normCombined.includes("oficina")
  ) {
    return "Manutenção";
  }

  if (
    normCombined.includes("peca") ||
    normCombined.includes("peça") ||
    normCombined.includes("filtro") ||
    normCombined.includes("carroceria") ||
    normCombined.includes("parafuso") ||
    normCombined.includes("cabine") ||
    normCombined.includes("amortecedor") ||
    normCombined.includes("cambio") ||
    normCombined.includes("câmbio") ||
    normCombined.includes("diferencial") ||
    normCombined.includes("embreagem") ||
    normCombined.includes("escapamento") ||
    normCombined.includes("motor") ||
    normCombined.includes("parabrisa") ||
    normCombined.includes("valvula") ||
    normCombined.includes("válvula")
  ) {
    return "Peças";
  }

  return "Outros";
}

