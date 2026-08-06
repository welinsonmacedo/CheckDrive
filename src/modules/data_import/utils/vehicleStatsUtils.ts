import { ImportRecord } from "../types";

export interface VehicleReportStat {
  key: string;
  placa: string;
  numero_frota?: string;
  viagensCount: number;
  totalCost: number;
  costDespesas: number;
  costCombustivel: number;
  kmRodadoCombustivel: number;
  cpk: number;
  cpkTotal: number;
  totalLiters: number;
  categories: Record<string, { count: number; valor: number; liters: number }>;
  items: ImportRecord[];
}

export function getRecordImportType(r: ImportRecord): "combustivel_gfv" | "receitas_despesas" {
  // A record is ONLY combustivel_gfv if it was produced by the GFV "Consumo de Combustível" PDF parser
  const isGfvConta = r.conta === "Consumo de Combustível";
  const isGfvObs = Boolean(
    r.observacoes &&
      (r.observacoes.includes("GFV") ||
        r.observacoes.includes("Consumo por Veículo") ||
        r.observacoes.includes("Relatório GFV"))
  );
  const isGfvFields = r.preco_litro !== undefined || r.media_km_l !== undefined;

  if (isGfvConta || isGfvObs || isGfvFields) {
    return "combustivel_gfv";
  }

  // All other records (including Diesel, Gasolina, Arla from SOFtran) are receitas_despesas!
  return "receitas_despesas";
}

/**
 * Returns the effective financial value of a record for reporting.
 * For GFV records ("Consumo de Combustível"), financial value is 0 to avoid
 * double-counting with SOFtran ("Receitas e Despesas"), as GFV is used ONLY for Km Rodado.
 */
export function getRecordFinancialValue(r: ImportRecord, allowGfvFallback: boolean = false): number {
  if (getRecordImportType(r) === "combustivel_gfv") {
    return allowGfvFallback ? Number(r.valor) || 0 : 0;
  }
  return Number(r.valor) || 0;
}

export function getImportTypeLabel(type: "combustivel_gfv" | "receitas_despesas" | string): string {
  if (type === "combustivel_gfv") return "Consumo de Combustível (GFV - Telemetria/Km)";
  if (type === "receitas_despesas") return "Receitas e Despesas (SOFtran - Custos)";
  return type;
}

export function calculateVehicleStats(records: ImportRecord[]) {
  const map: Record<string, VehicleReportStat> = {};

  records.forEach((r) => {
    const rawPlacaDisplay = r.placa?.trim().toUpperCase() || "SEM PLACA";
    const rawPlacaClean = rawPlacaDisplay.replace(/[\s-]/g, "");
    const frota = r.numero_frota?.trim() || "";

    // Key vehicle by clean plate if available so GFV (telemetry/km) and SOFtran (expenses/costs) match!
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
        cpk: 0,
        cpkTotal: 0,
        totalLiters: 0,
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
    const val = Number(r.valor) || 0;
    const qty = Number(r.quantidade) || 0;
    map[key].items.push(r);

    const impType = getRecordImportType(r);
    if (impType === "combustivel_gfv") {
      map[key].costCombustivel += val;
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
    } else {
      map[key].costDespesas += val;
      map[key].totalCost += val; // ONLY SOFtran (receitas_despesas) records contribute to financial total cost!
    }

    // Categories Breakdown
    const cat = r.tipo_registro || "Outros";
    if (!map[key].categories[cat]) {
      map[key].categories[cat] = { count: 0, valor: 0, liters: 0 };
    }
    map[key].categories[cat].count += 1;
    // Only add financial value to category if it's SOFtran (receitas_despesas)
    if (impType !== "combustivel_gfv") {
      map[key].categories[cat].valor += val;
    }
    map[key].categories[cat].liters += qty;
  });

  Object.values(map).forEach((v) => {
    // If no SOFtran records exist for this vehicle (costDespesas === 0), but GFV records exist,
    // use GFV cost as fallback so total cost isn't 0 when ONLY GFV was imported
    if (v.totalCost === 0 && v.costCombustivel > 0) {
      v.totalCost = v.costCombustivel;
    }

    if (v.kmRodadoCombustivel > 0) {
      v.cpk = v.totalCost / v.kmRodadoCombustivel;
      v.cpkTotal = v.totalCost / v.kmRodadoCombustivel;
    } else {
      v.cpk = 0;
      v.cpkTotal = 0;
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
