import { RecordCategory } from "../types";

export function categorizeAccount(accountName: string, accountDescription?: string): RecordCategory {
  const combined = `${accountName || ""} ${accountDescription || ""}`.toLowerCase();

  if (combined.includes("gasolina adm") || combined.includes("gasolina admin") || combined.includes("gasolina ad") || combined.includes("gas. adm")) {
    return "Gasolina Administrativo";
  }

  if (combined.includes("gasolina") || combined.includes("gas. comum") || combined.includes("gas. adit") || combined.includes("gasolina comum")) {
    return "Gasolina";
  }

  if (combined.includes("diesel ter") || combined.includes("diesel terceiro") || combined.includes("diesel terc")) {
    return "Diesel Terceiro";
  }

  if (combined.includes("diesel") || combined.includes("s10") || combined.includes("s500")) {
    return "Diesel";
  }

  if (combined.includes("arla estoque") || combined.includes("estoque arla") || combined.includes("arla est")) {
    return "Arla Estoque";
  }

  if (combined.includes("estoque") || combined.includes("estq")) {
    return "Estoque";
  }

  if (combined.includes("arla") || combined.includes("arla32") || combined.includes("arla 32")) {
    return "Arla";
  }

  if (combined.includes("freio") || combined.includes("freios") || combined.includes("pastilha") || combined.includes("disco de freio") || combined.includes("lona de freio")) {
    return "Freios";
  }

  if (combined.includes("eletrica") || combined.includes("elétrica") || combined.includes("bateria") || combined.includes("alternador") || combined.includes("lampada") || combined.includes("lâmpada") || combined.includes("chicote")) {
    return "Elétrica";
  }

  if (
    combined.includes("lava-jato") ||
    combined.includes("lavajato") ||
    combined.includes("lavagem") ||
    combined.includes("ducha") ||
    combined.includes("higieniza")
  ) {
    return "Lava-jato";
  }

  if (combined.includes("recapagem") || combined.includes("recap") || combined.includes("vulcanização")) {
    return "Recapagem";
  }

  if (combined.includes("pneu novo") || combined.includes("pneus novos") || combined.includes("pneu n")) {
    return "Pneus Novos";
  }

  if (
    combined.includes("rastream") ||
    combined.includes("rastreador") ||
    combined.includes("telemetria") ||
    combined.includes("sascar") ||
    combined.includes("omnilink") ||
    combined.includes("autotrac") ||
    combined.includes("cobli")
  ) {
    return "Rastreamento";
  }

  if (
    combined.includes("gasolina") ||
    combined.includes("etanol") ||
    combined.includes("combust") ||
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
