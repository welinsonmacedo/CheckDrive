import React, { useState } from "react";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Fuel,
  DollarSign,
  Truck,
  Building2,
  PieChart as PieChartIcon,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { VehicleReportStat, formatCurrency } from "../utils/vehicleStatsUtils";

interface Props {
  vehicleStats: {
    top10Highest: VehicleReportStat[];
    top10Lowest: VehicleReportStat[];
    topCPK: VehicleReportStat[];
    allVehicles: VehicleReportStat[];
  };
  supplierStats: {
    allSuppliers: {
      key: string;
      name: string;
      totalCost: number;
      totalLiters: number;
      count: number;
    }[];
  };
  onSelectVehicle: (key: string) => void;
}

export default function ReportRankingTab({
  vehicleStats,
  supplierStats,
  onSelectVehicle,
}: Props) {
  const [rankingMode, setRankingMode] = useState<"maiores_custos" | "menores_custos" | "maiores_litros" | "fornecedores">("maiores_custos");
  const [searchFilter, setSearchFilter] = useState("");

  const topLitersVehicles = [...vehicleStats.allVehicles]
    .filter((v) => v.totalLiters > 0)
    .sort((a, b) => b.totalLiters - a.totalLiters)
    .slice(0, 10);

  const displayedVehicles =
    rankingMode === "maiores_custos"
      ? vehicleStats.top10Highest
      : rankingMode === "menores_custos"
      ? vehicleStats.top10Lowest
      : topLitersVehicles;

  const filteredVehicles = displayedVehicles.filter((v) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase().trim();
    return (
      v.placa.toLowerCase().includes(term) ||
      (v.numero_frota || "").toLowerCase().includes(term)
    );
  });

  const topSuppliers = [...supplierStats.allSuppliers]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Ranking Header Card */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-900 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
              <Award className="w-3.5 h-3.5" /> Quadro de Líderes & Extremos Operacionais
            </div>
            <h3 className="text-2xl font-black tracking-tight">Ranking de Veículos & Fornecedores</h3>
            <p className="text-rose-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Descubra quais veículos e fornecedores concentram os maiores custos, litragens e médias de consumo da sua operação.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200/60 text-xs font-bold">
            <button
              onClick={() => setRankingMode("maiores_custos")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                rankingMode === "maiores_custos"
                  ? "bg-rose-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Top 10 Maiores Custos
            </button>
            <button
              onClick={() => setRankingMode("menores_custos")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                rankingMode === "menores_custos"
                  ? "bg-emerald-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <TrendingDown className="w-4 h-4" /> Top 10 Mais Econômicos
            </button>
            <button
              onClick={() => setRankingMode("maiores_litros")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                rankingMode === "maiores_litros"
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Fuel className="w-4 h-4" /> Top 10 Maior Consumo (L)
            </button>
            <button
              onClick={() => setRankingMode("fornecedores")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                rankingMode === "fornecedores"
                  ? "bg-indigo-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Building2 className="w-4 h-4" /> Top Fornecedores / Postos
            </button>
          </div>

          {rankingMode !== "fornecedores" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filtrar por placa..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
        </div>
      </div>

      {rankingMode === "fornecedores" ? (
        /* Top Suppliers Table and Chart */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Top 10 Fornecedores por Valor Total (R$)
            </h4>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSuppliers.map((s) => ({
                    name: s.name.length > 15 ? s.name.substring(0, 15) + "..." : s.name,
                    valor: s.totalCost,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Total"]} />
                  <Bar dataKey="valor" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 text-base">Tabela de Fornecedores</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] font-extrabold">
                    <th className="p-3">#</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3 text-center">Lançamentos</th>
                    <th className="p-3 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {topSuppliers.map((s, idx) => (
                    <tr key={s.key} className="hover:bg-zinc-50">
                      <td className="p-3 font-bold text-zinc-400">#{idx + 1}</td>
                      <td className="p-3 font-bold text-zinc-900">{s.name}</td>
                      <td className="p-3 text-center text-zinc-700">{s.count}</td>
                      <td className="p-3 text-right font-black text-indigo-700">{formatCurrency(s.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Top Vehicles Chart and Table */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-rose-600" />
              Comparativo Gráfico dos Veículos em Destaque
            </h4>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredVehicles.map((v) => ({
                    placa: v.placa,
                    valor: rankingMode === "maiores_litros" ? v.totalLiters : v.totalCost,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="placa" tick={{ fontSize: 11, fontWeight: "bold" }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      rankingMode === "maiores_litros" ? `${v} L` : `R$ ${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      rankingMode === "maiores_litros" ? `${Number(v).toLocaleString("pt-BR")} L` : formatCurrency(Number(v)),
                      rankingMode === "maiores_litros" ? "Litros" : "Custo Total",
                    ]}
                  />
                  <Bar
                    dataKey="valor"
                    fill={
                      rankingMode === "maiores_custos"
                        ? "#e11d48"
                        : rankingMode === "menores_custos"
                        ? "#059669"
                        : "#d97706"
                    }
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 text-base">Tabela de Classificação dos Veículos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 uppercase text-[10px] font-extrabold">
                    <th className="p-3 text-center">Posição</th>
                    <th className="p-3">Placa</th>
                    <th className="p-3">Frota</th>
                    <th className="p-3 text-center">Lançamentos / Viagens</th>
                    <th className="p-3 text-center">Consumo Total</th>
                    <th className="p-3 text-center">Km Rodado (GFV)</th>
                    <th className="p-3 text-center">Média (Km/L)</th>
                    <th className="p-3 text-right">Custo Total (R$)</th>
                    <th className="p-3 text-right">CPK (R$/Km)</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-400 font-semibold">
                        Nenhum veículo encontrado para esta classificação.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v, idx) => {
                      const mediaKmL =
                        v.totalLiters > 0 && v.kmRodadoCombustivel > 0
                          ? v.kmRodadoCombustivel / v.totalLiters
                          : 0;

                      return (
                        <tr key={v.key} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-3 text-center font-extrabold text-zinc-500">#{idx + 1}</td>
                          <td className="p-3 font-extrabold text-zinc-900">{v.placa}</td>
                          <td className="p-3 text-zinc-600">{v.numero_frota || "-"}</td>
                          <td className="p-3 text-center text-zinc-700">{v.viagensCount}</td>
                          <td className="p-3 text-center text-amber-900 font-bold">
                            {v.totalLiters > 0 ? `${v.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` : "-"}
                          </td>
                          <td className="p-3 text-center text-blue-900 font-bold">
                            {v.kmRodadoCombustivel > 0 ? `${v.kmRodadoCombustivel.toLocaleString("pt-BR")} km` : "-"}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {mediaKmL > 0 ? `${mediaKmL.toFixed(2)} km/L` : "-"}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">{formatCurrency(v.totalCost)}</td>
                          <td className="p-3 text-right font-black text-purple-700">
                            {v.cpk > 0 ? `R$ ${v.cpk.toFixed(3)}` : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onSelectVehicle(v.key)}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
