import { RecordCategory } from "../types";

export function categorizeAccount(accountName: string, accountDescription?: string): RecordCategory {
  const combined = `${accountName || ""} ${accountDescription || ""}`.toLowerCase();

  if (
    combined.includes("diesel") ||
    combined.includes("gasolina") ||
    combined.includes("etanol") ||
    combined.includes("combust") ||
    combined.includes("arla") ||
    combined.includes("gnv") ||
    combined.includes("post")
  ) {
    return "Combustível";
  }

  if (
    combined.includes("pedag") ||
    combined.includes("pedág") ||
    combined.includes("sem parar") ||
    combined.includes("veloe") ||
    combined.includes("conectcar") ||
    combined.includes("move mais")
  ) {
    return "Pedágio";
  }

  if (
    combined.includes("multa") ||
    combined.includes("infração") ||
    combined.includes("infracao") ||
    combined.includes("autuação") ||
    combined.includes("autuacao") ||
    combined.includes("dtran") ||
    combined.includes("detran")
  ) {
    return "Multa";
  }

  if (
    combined.includes("seguro") ||
    combined.includes("apolice") ||
    combined.includes("apólice") ||
    combined.includes("sinistro") ||
    combined.includes("franquia")
  ) {
    return "Seguro";
  }

  if (
    combined.includes("lubrific") ||
    combined.includes("óleo") ||
    combined.includes("oleo") ||
    combined.includes("graxa") ||
    combined.includes("fluido")
  ) {
    return "Lubrificantes";
  }

  if (
    combined.includes("pneu") ||
    combined.includes("recapagem") ||
    combined.includes("vulcanização") ||
    combined.includes("alinhamento") ||
    combined.includes("balanceamento") ||
    combined.includes("câmara")
  ) {
    return "Pneus";
  }

  if (
    combined.includes("peça") ||
    combined.includes("peca") ||
    combined.includes("filtro") ||
    combined.includes("pastilha") ||
    combined.includes("disco") ||
    combined.includes("correia") ||
    combined.includes("bateria") ||
    combined.includes("amortecedor")
  ) {
    return "Peças";
  }

  if (
    combined.includes("mecanic") ||
    combined.includes("mecânic") ||
    combined.includes("manuten") ||
    combined.includes("serviço") ||
    combined.includes("servico") ||
    combined.includes("oficina") ||
    combined.includes("funilaria") ||
    combined.includes("elétrica") ||
    combined.includes("revisão")
  ) {
    return "Manutenção";
  }

  return "Outros";
}
