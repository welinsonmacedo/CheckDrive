import { ImportRecord } from "../types";

export interface VehicleReportStat {
  key: string;
  placa: string;
  numero_frota?: string;
  viagensCount: number;
  totalCost: number; // Custo Total 100% SOFtran
  costDespesas: number; // Manutenção / Peças / Despesas 100% SOFtran
  costCombustivel: number; // Custo Combustível em R$ 100% SOFtran
  kmRodadoCombustivel: number; // KM Rodado 100% GFV
  totalLiters: number; // Litros de Combustível 100% GFV
  cpk: number; // CPK Total = Custo Total SOFtran / Km GFV
  cpkTotal: number;
  cpkCombustivel: number; // Custo Combustível SOFtran / Km GFV
  cpkDespesas: number; // Custo Despesas SOFtran / Km GFV
  mediaKmL: number; // Km GFV / Litros GFV
  gfvRecordsCount: number;
  softranRecordsCount: number;
  categories: Record<string, { count: number; valor: number; liters: number }>;
  items: ImportRecord[];
}

export function isFuelCategory(category?: string, conta?: string): boolean {
  const catLower = (category || "").toLowerCase();
  const contaLower = (conta || "").toLowerCase();
  return (
    catLower.includes("combust") ||
    catLower.includes("diesel") ||
    catLower.includes("gasolina") ||
    catLower.includes("arla") ||
    contaLower.includes("diesel") ||
    contaLower.includes("gasolina") ||
    contaLower.includes("arla") ||
    contaLower.includes("combust")
  );
}

export function getRecordImportType(r: ImportRecord): "combustivel_gfv" | "receitas_despesas" {
  // A record is ONLY combustivel_gfv if it was produced by the GFV "Consumo de Combustível" PDF parser
  const isGfvConta =
    r.conta === "Consumo de Combustível" ||
    (r.conta && r.conta.toLowerCase().includes("consumo de combustível"));
  const isGfvObs = Boolean(
    r.observacoes &&
      (r.observacoes.includes("GFV") ||
        r.observacoes.includes("Consumo por Veículo") ||
        r.observacoes.includes("Relatório GFV"))
  );
  const isGfvFields =
    (r.preco_litro !== undefined && r.preco_litro > 0) ||
    (r.media_km_l !== undefined && r.media_km_l > 0) ||
    (r.km_rodado !== undefined && r.km_rodado > 0 && r.hodometro !== undefined);

  if (isGfvConta || isGfvObs || isGfvFields) {
    return "combustivel_gfv";
  }

  // All other records (including Diesel, Gasolina, Arla from SOFtran) are receitas_despesas!
  return "receitas_despesas";
}

/**
 * Returns the effective financial value of a record for reporting.
 * A importação GFV é usada nos relatórios SOMENTE para Km e Litros de combustível.
 * TODOS os valores financeiros (R$) vêm 100% da importação SOFtran.
 */
export function getRecordFinancialValue(r: ImportRecord, _allowGfvFallback: boolean = false): number {
  if (getRecordImportType(r) === "combustivel_gfv") {
    return 0; // GFV nunca gera custos financeiros no relatório
  }
  return Number(r.valor) || 0;
}

export function getImportTypeLabel(type: "combustivel_gfv" | "receitas_despesas" | string): string {
  if (type === "combustivel_gfv") return "Consumo de Combustível (GFV - Telemetria/Km/Litros)";
  if (type === "receitas_despesas") return "Receitas e Despesas (SOFtran - Custos Financeiros)";
  return type;
}

export function calculateVehicleStats(records: ImportRecord[]) {
  const map: Record<string, VehicleReportStat> = {};

  records.forEach((r) => {
    const rawPlacaDisplay = r.placa?.trim().toUpperCase() || "SEM PLACA";
    const rawPlacaClean = rawPlacaDisplay.replace(/[\s-]/g, "");
    const frota = r.numero_frota?.trim() || "";

    // Key vehicle by clean plate if available so GFV (telemetry/km/litros) and SOFtran (expenses/costs) match!
    const isRealPlate = Boolean(rawPlacaClean && rawPlacaClean !== "SEMPLACA" && rawPlacaClean !== "FROTAGERAL");
    const key = isRealPlate ? rawPlacaClean : frota ? `FROTA-${frota}` : "SEM-PLACA";

    if (!map[key]) {
      map[key] = {
        key,
        placa: rawPlacaDisplay,
        numero_frota: frota,
        viagensCount: 0,
        totalCost: 0,
        costDespesas: 0,
        costCombustivel: 0,
        kmRodadoCombustivel: 0,
        totalLiters: 0,
        cpk: 0,
        cpkTotal: 0,
        cpkCombustivel: 0,
        cpkDespesas: 0,
        mediaKmL: 0,
        gfvRecordsCount: 0,
        softranRecordsCount: 0,
        categories: {},
        items: [],
      };
    } else {
      // Update display values if current record has a more specific frota or plate
      if (!map[key].numero_frota && frota) {
        map[key].numero_frota = frota;
      }
      if (map[key].placa === "SEM PLACA" && rawPlacaDisplay !== "SEM PLACA") {
        map[key].placa = rawPlacaDisplay;
      }
    }

    map[key].viagensCount += 1;
    map[key].items.push(r);

    const impType = getRecordImportType(r);
    const qty = Number(r.quantidade) || 0;
    const val = Number(r.valor) || 0;

    if (impType === "combustivel_gfv") {
      map[key].gfvRecordsCount += 1;
      // GFV fornece EXCLUSIVAMENTE Litros e Km
      map[key].totalLiters += qty;

      let rKm = 0;
      if (typeof r.km_rodado === "number" && !isNaN(r.km_rodado) && r.km_rodado > 0) {
        rKm = r.km_rodado;
      } else if (r.quantidade && r.media_km_l && r.quantidade > 0 && r.media_km_l > 0) {
        rKm = r.quantidade * r.media_km_l;
      } else if (r.observacoes) {
        const obsKmMatch = r.observacoes.match(/Km\s+Rodados?:\s*([\d\.\,]+)/i);
        if (obsKmMatch) {
          rKm = parseFloat(obsKmMatch[1].replace(/\./g, "").replace(",", "."));
        }
      }
      map[key].kmRodadoCombustivel += rKm;
      // Não adiciona nenhum custo financeiro a partir do GFV!
    } else {
      // SOFtran (receitas_despesas): fornece 100% dos Custos Financeiros
      map[key].softranRecordsCount += 1;
      map[key].totalCost += val;

      if (isFuelCategory(r.tipo_registro, r.conta)) {
        map[key].costCombustivel += val;
      } else {
        map[key].costDespesas += val;
      }

      // Discriminativo de categorias financeiras (apenas SOFtran)
      const cat = r.tipo_registro || "Outros";
      if (!map[key].categories[cat]) {
        map[key].categories[cat] = { count: 0, valor: 0, liters: 0 };
      }
      map[key].categories[cat].count += 1;
      map[key].categories[cat].valor += val;
      map[key].categories[cat].liters += qty;
    }
  });

  Object.values(map).forEach((v) => {
    // Se não houver litragem informada no GFV para este veículo, verifica se há litros no SOFtran
    if (v.totalLiters === 0) {
      let softranFuelQty = 0;
      Object.entries(v.categories).forEach(([catName, catData]) => {
        if (isFuelCategory(catName)) {
          softranFuelQty += catData.liters;
        }
      });
      if (softranFuelQty > 0) {
        v.totalLiters = softranFuelQty;
      }
    }

    // CPK (Custo por KM): Custo Total SOFtran ÷ Km Rodado GFV
    if (v.kmRodadoCombustivel > 0) {
      v.cpk = v.totalCost / v.kmRodadoCombustivel;
      v.cpkTotal = v.totalCost / v.kmRodadoCombustivel;
      v.cpkCombustivel = v.costCombustivel / v.kmRodadoCombustivel;
      v.cpkDespesas = v.costDespesas / v.kmRodadoCombustivel;
    } else {
      v.cpk = 0;
      v.cpkTotal = 0;
      v.cpkCombustivel = 0;
      v.cpkDespesas = 0;
    }

    // Média de Consumo (Km/L): Km GFV ÷ Litros GFV
    if (v.totalLiters > 0 && v.kmRodadoCombustivel > 0) {
      v.mediaKmL = v.kmRodadoCombustivel / v.totalLiters;
    } else {
      v.mediaKmL = 0;
    }
  });

  const allVehicles = Object.values(map);

  const top10Highest = [...allVehicles]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  const top10Lowest = [...allVehicles]
    .filter((v) => v.totalCost > 0)
    .sort((a, b) => a.totalCost - b.totalCost)
    .slice(0, 10);

  const topCPK = [...allVehicles]
    .filter((v) => v.kmRodadoCombustivel > 0 || v.totalCost > 0)
    .sort((a, b) => b.cpk - a.cpk);

  return {
    allVehicles,
    top10Highest,
    top10Lowest,
    topCPK,
  };
}

export function formatCurrency(val: number): string {
  return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function calculateSupplierStats(records: ImportRecord[], _tipoImportacaoFilter: string = "Todas") {
  const map: Record<string, { key: string; name: string; totalCost: number; totalLiters: number; count: number }> = {};
  records.forEach((r) => {
    const rawName = r.fornecedor?.trim() || "Não Informado";
    const key = rawName.toUpperCase();
    if (!map[key]) {
      map[key] = { key, name: rawName, totalCost: 0, totalLiters: 0, count: 0 };
    }
    map[key].count += 1;
    const impType = getRecordImportType(r);
    if (impType === "combustivel_gfv") {
      map[key].totalLiters += Number(r.quantidade) || 0;
    } else {
      map[key].totalCost += Number(r.valor) || 0;
      map[key].totalLiters += Number(r.quantidade) || 0;
    }
  });
  return {
    allSuppliers: Object.values(map),
  };
}

