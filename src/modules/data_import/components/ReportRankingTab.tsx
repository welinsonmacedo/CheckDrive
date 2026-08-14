import React, { useState, useMemo } from "react";
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
  Filter,
  RotateCcw,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { ImportRecord } from "../types";
import {
  calculateVehicleStats,
  calculateSupplierStats,
  VehicleReportStat,
  formatCurrency,
  getRecordImportType,
} from "../utils/vehicleStatsUtils";
import { parseRecordMonthYear, matchesPeriod, MONTH_NAMES_PT } from "../utils/dateUtils";

interface Props {
  records: ImportRecord[];
  onSelectVehicle: (key: string) => void;
}

export default function ReportRankingTab({
  records,
  onSelectVehicle,
}: Props) {
  // Independent Filter States for Ranking Tab
  const [rankingPeriod, setRankingPeriod] = useState<string>("0");
  const [rankingCustomMonth, setRankingCustomMonth] = useState<string>("");
  const [rankingCategory, setRankingCategory] = useState<string>("Todas");
  const [rankingImportType, setRankingImportType] = useState<string>("Todas");
  const [rankingMode, setRankingMode] = useState<
    "maiores_custos" | "menores_custos" | "maiores_litros" | "fornecedores"
  >("maiores_custos");
  const [searchFilter, setSearchFilter] = useState("");

  // Extract available months and categories
  const { monthsByYear, allCategories } = useMemo(() => {
    const monthsSet = new Set<string>();
    const catsSet = new Set<string>();
    records.forEach((r) => {
      if (r.tipo_registro) catsSet.add(r.tipo_registro);
      const parsed = parseRecordMonthYear(r.data);
      if (parsed) {
        monthsSet.add(`${parsed.month}/${parsed.year}`);
      }
    });

    const mByY: Record<string, string[]> = {};
    Array.from(monthsSet).forEach((my) => {
      const [, y] = my.split("/");
      if (!mByY[y]) mByY[y] = [];
      mByY[y].push(my);
    });

    Object.keys(mByY).forEach((y) => {
      mByY[y].sort((a, b) => {
        const [mA] = a.split("/");
        const [mB] = b.split("/");
        return Number(mA) - Number(mB);
      });
    });

    return {
      monthsByYear: mByY,
      allCategories: ["Todas", ...Array.from(catsSet).sort()],
    };
  }, [records]);

  // Filter records specifically for this ranking tab
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Tipo de importacao
      if (rankingImportType !== "Todas") {
        const imp = getRecordImportType(r);
        if (rankingImportType === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (rankingImportType === "receitas_despesas" && imp !== "receitas_despesas") return false;
      }

      // 2. Categoria
      if (rankingCategory !== "Todas" && r.tipo_registro !== rankingCategory) {
        return false;
      }

      // 3. Periodo
      if (!matchesPeriod(r.data, rankingPeriod, rankingCustomMonth)) {
        return false;
      }

      return true;
    });
  }, [records, rankingImportType, rankingCategory, rankingPeriod, rankingCustomMonth]);

  const isFiltered =
    rankingPeriod !== "0" ||
    rankingCategory !== "Todas" ||
    rankingImportType !== "Todas" ||
    searchFilter.trim() !== "";

  const handleResetFilters = () => {
    setRankingPeriod("0");
    setRankingCustomMonth("");
    setRankingCategory("Todas");
    setRankingImportType("Todas");
    setSearchFilter("");
  };

  // Compute Vehicle & Supplier Stats based on filtered records
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords);
  }, [filteredRecords]);

  const supplierStats = useMemo(() => {
    return calculateSupplierStats(filteredRecords);
  }, [filteredRecords]);

  const topLitersVehicles = useMemo(() => {
    return [...vehicleStats.allVehicles]
      .filter((v) => v.totalLiters > 0)
      .sort((a, b) => b.totalLiters - a.totalLiters)
      .slice(0, 10);
  }, [vehicleStats]);

  const displayedVehicles = useMemo(() => {
    if (rankingMode === "maiores_custos") return vehicleStats.top10Highest;
    if (rankingMode === "menores_custos") return vehicleStats.top10Lowest;
    return topLitersVehicles;
  }, [rankingMode, vehicleStats, topLitersVehicles]);

  const filteredVehicles = useMemo(() => {
    return displayedVehicles.filter((v) => {
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase().trim();
      return (
        v.placa.toLowerCase().includes(term) ||
        (v.numero_frota || "").toLowerCase().includes(term)
      );
    });
  }, [displayedVehicles, searchFilter]);

  const topSuppliers = useMemo(() => {
    const list = [...supplierStats.allSuppliers].sort((a, b) => b.totalCost - a.totalCost);
    if (!searchFilter.trim()) return list.slice(0, 10);
    const term = searchFilter.toLowerCase().trim();
    return list.filter((s) => s.name.toLowerCase().includes(term)).slice(0, 10);
  }, [supplierStats, searchFilter]);

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
              Filtro individual desta aba para identificar quais veículos e fornecedores concentram os maiores custos (SOFtran), litragens (GFV) e médias.
            </p>
          </div>
        </div>
      </div>

      {/* Individual Filter Toolbar for Ranking */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Filtros Individuais da Aba Ranking</span>
            {isFiltered && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800">
                Filtros Ativos ({filteredRecords.length} de {records.length} registros)
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Período / Mês */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Período / Mês
            </label>
            <select
              value={rankingPeriod}
              onChange={(e) => setRankingPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <optgroup label="Períodos Relativos">
                <option value="0">Todo o Histórico</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Este Ano (365d)</option>
              </optgroup>

              {Object.entries(monthsByYear).map(([year, monthList]) => (
                <optgroup key={year} label={`Ano ${year}`}>
                  <option value={`y:${year}`}>Ano Completo de {year}</option>
                  {monthList.map((my) => {
                    const [m] = my.split("/");
                    const monthName = MONTH_NAMES_PT[m] || m;
                    return (
                      <option key={my} value={`m:${my}`}>
                        Mês {my} ({monthName})
                      </option>
                    );
                  })}
                </optgroup>
              ))}

              <optgroup label="Personalizado">
                <option value="custom">Selecionar Mês no Calendário</option>
              </optgroup>
            </select>

            {rankingPeriod === "custom" && (
              <input
                type="month"
                value={rankingCustomMonth}
                onChange={(e) => setRankingCustomMonth(e.target.value)}
                className="mt-1.5 w-full px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              />
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Categoria / Conta
            </label>
            <select
              value={rankingCategory}
              onChange={(e) => setRankingCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Importação */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Tipo de Importação
            </label>
            <select
              value={rankingImportType}
              onChange={(e) => setRankingImportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Todas">Todas as Importações</option>
              <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
              <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
            </select>
          </div>

          {/* Busca Textual */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Buscar {rankingMode === "fornecedores" ? "Fornecedor" : "Placa / Frota"}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  rankingMode === "fornecedores"
                    ? "Nome do fornecedor ou posto..."
                    : "Ex: ABC1D23 ou 104"
                }
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-100">
          <span className="text-xs font-bold text-zinc-500 mr-1">Classificação:</span>
          <button
            onClick={() => setRankingMode("maiores_custos")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rankingMode === "maiores_custos"
                ? "bg-rose-600 text-white shadow-xs font-black"
                : "text-zinc-600 hover:text-zinc-900 bg-zinc-100"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Top 10 Maiores Custos (SOFtran)
          </button>
          <button
            onClick={() => setRankingMode("menores_custos")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rankingMode === "menores_custos"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "text-zinc-600 hover:text-zinc-900 bg-zinc-100"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Top 10 Mais Econômicos
          </button>
          <button
            onClick={() => setRankingMode("maiores_litros")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rankingMode === "maiores_litros"
                ? "bg-amber-600 text-white shadow-xs font-black"
                : "text-zinc-600 hover:text-zinc-900 bg-zinc-100"
            }`}
          >
            <Fuel className="w-3.5 h-3.5" /> Top 10 Maior Consumo (GFV)
          </button>
          <button
            onClick={() => setRankingMode("fornecedores")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rankingMode === "fornecedores"
                ? "bg-indigo-600 text-white shadow-xs font-black"
                : "text-zinc-600 hover:text-zinc-900 bg-zinc-100"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Top Fornecedores / Postos
          </button>
        </div>
      </div>

      {rankingMode === "fornecedores" ? (
        /* Top Suppliers Table and Chart */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Top 10 Fornecedores por Valor Total (com Rótulos)
            </h4>
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSuppliers.map((s) => ({
                    name: s.name.length > 18 ? s.name.substring(0, 18) + "..." : s.name,
                    valor: s.totalCost,
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 60, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: "bold" }} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), "Total SOFtran"]} />
                  <Bar dataKey="valor" fill="#4f46e5" radius={[0, 8, 8, 0]}>
                    <LabelList
                      dataKey="valor"
                      position="right"
                      formatter={(v: any) =>
                        Number(v) >= 1000 ? `R$ ${(Number(v) / 1000).toFixed(1)}k` : `R$ ${Number(v).toFixed(0)}`
                      }
                      style={{ fill: "#312e81", fontSize: 10, fontWeight: 900 }}
                    />
                  </Bar>
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
                  {topSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-400 font-semibold">
                        Nenhum fornecedor encontrado no período.
                      </td>
                    </tr>
                  ) : (
                    topSuppliers.map((s, idx) => (
                      <tr key={s.key} className="hover:bg-zinc-50">
                        <td className="p-3 font-bold text-zinc-400">#{idx + 1}</td>
                        <td className="p-3 font-bold text-zinc-900">{s.name}</td>
                        <td className="p-3 text-center text-zinc-700">{s.count}</td>
                        <td className="p-3 text-right font-black text-indigo-700">{formatCurrency(s.totalCost)}</td>
                      </tr>
                    ))
                  )}
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
              Comparativo Gráfico dos Veículos em Destaque (com Rótulos)
            </h4>
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredVehicles.map((v) => ({
                    placa: v.placa,
                    valor: rankingMode === "maiores_litros" ? v.totalLiters : v.totalCost,
                  }))}
                  margin={{ top: 25, right: 15, left: -5, bottom: 5 }}
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
                      rankingMode === "maiores_litros" ? "Litros (GFV)" : "Custo Total (SOFtran)",
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
                  >
                    <LabelList
                      dataKey="valor"
                      position="top"
                      formatter={(v: any) =>
                        rankingMode === "maiores_litros"
                          ? Number(v) >= 1000
                            ? `${(Number(v) / 1000).toFixed(1)}k L`
                            : `${Number(v).toFixed(0)} L`
                          : Number(v) >= 1000
                          ? `R$ ${(Number(v) / 1000).toFixed(1)}k`
                          : `R$ ${Number(v).toFixed(0)}`
                      }
                      style={{ fill: "#1e293b", fontSize: 10, fontWeight: 900 }}
                    />
                  </Bar>
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
