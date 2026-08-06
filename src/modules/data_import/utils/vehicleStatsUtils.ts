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
  if (
    r.conta === "Consumo de Combustível" ||
    (r.observacoes && (r.observacoes.includes("GFV") || r.observacoes.includes("Consumo por Veículo"))) ||
    r.preco_litro !== undefined ||
    r.media_km_l !== undefined ||
    (r.km_rodado !== undefined && r.km_rodado > 0) ||
    ["Combustível", "Gasolina", "Gasolina Administrativo", "Diesel", "Diesel Terceiro", "Arla", "Arla Estoque"].includes(r.tipo_registro)
  ) {
    return "combustivel_gfv";
  }
  return "receitas_despesas";
}

export function getImportTypeLabel(type: "combustivel_gfv" | "receitas_despesas" | string): string {
  if (type === "combustivel_gfv") return "Consumo de Combustível (GFV)";
  if (type === "receitas_despesas") return "Receitas e Despesas (SOFtran)";
  return type;
}

export function calculateVehicleStats(records: ImportRecord[]) {
  const map: Record<string, VehicleReportStat> = {};

  records.forEach((r) => {
    const rawPlaca = r.placa?.trim().toUpperCase() || "SEM PLACA";
    const frota = r.numero_frota?.trim() || "";
    const key = frota ? `${rawPlaca} (Frota ${frota})` : rawPlaca;

    if (!map[key]) {
      map[key] = {
        key,
        placa: rawPlaca,
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
    }

    map[key].viagensCount += 1;
    const val = Number(r.valor) || 0;
    const qty = Number(r.quantidade) || 0;
    map[key].totalCost += val;
    map[key].totalLiters += qty;
    map[key].items.push(r);

    const impType = getRecordImportType(r);
    if (impType === "combustivel_gfv") {
      map[key].costCombustivel += val;
      let rKm = 0;
      if (typeof r.km_rodado === "number" && r.km_rodado > 0) {
        rKm = r.km_rodado;
      } else if (r.quantidade && r.media_km_l && r.quantidade > 0 && r.media_km_l > 0) {
        rKm = r.quantidade * r.media_km_l;
      }
      map[key].kmRodadoCombustivel += rKm;
    } else {
      map[key].costDespesas += val;
    }

    const cat = r.tipo_registro || "Outros";
    if (!map[key].categories[cat]) {
      map[key].categories[cat] = { count: 0, valor: 0, liters: 0 };
    }
    map[key].categories[cat].count += 1;
    map[key].categories[cat].valor += val;
    map[key].categories[cat].liters += qty;
  });

  Object.values(map).forEach((v) => {
    if (v.kmRodadoCombustivel > 0) {
      // CPK Principal: Custo de Receita/Despesa (SOFtran) ÷ Km Rodado do Combustível (GFV)
      // Se costDespesas for 0 mas houver totalCost, podemos usar totalCost / kmRodadoCombustivel
      v.cpk = v.costDespesas > 0 ? v.costDespesas / v.kmRodadoCombustivel : v.totalCost / v.kmRodadoCombustivel;
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
    .filter((v) => v.kmRodadoCombustivel > 0 || v.costDespesas > 0)
    .sort((a, b) => b.cpk - a.cpk);

  return {
    allVehicles,
    top10Highest,
    top10Lowest,
    topCPK,
  };
}
