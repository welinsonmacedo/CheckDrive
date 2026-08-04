/**
 * Generates SHA-256 hash for record duplicate detection according to spec:
 * Empresa, Placa, Conta, Data, Valor, Quantidade, Fornecedor, Documento, Hodômetro
 */
export async function generateRecordHash(params: {
  empresa_id: string;
  placa: string;
  conta: string;
  data: string;
  valor: number;
  quantidade: number;
  fornecedor?: string;
  documento?: string;
  hodometro?: number;
}): Promise<string> {
  const normalized = [
    (params.empresa_id || "").trim().toLowerCase(),
    (params.placa || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    (params.conta || "").trim().toLowerCase(),
    (params.data || "").trim(),
    Number(params.valor || 0).toFixed(2),
    Number(params.quantidade || 0).toFixed(3),
    (params.fornecedor || "").trim().toLowerCase(),
    (params.documento || "").trim().toLowerCase(),
    Number(params.hodometro || 0).toString(),
  ].join("|");

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
