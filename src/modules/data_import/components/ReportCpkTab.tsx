import React, { useState, useMemo } from "react";
import {
  Calculator,
  Search,
  Filter,
  ArrowUpDown,
  BarChart3,
  RotateCcw,
  Fuel,
  DollarSign,
  Truck,
  TrendingDown,
  TrendingUp,
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
  VehicleReportStat,
  formatCurrency,
  getRecordImportType,
} from "../utils/vehicleStatsUtils";
import { parseRecordMonthYear, matchesPeriod, MONTH_NAMES_PT } from "../utils/dateUtils";

interface Props {
  records: ImportRecord[];
  onSelectVehicle: (key: string) => void;
}

export default function ReportCpkTab({
  records,
  onSelectVehicle,
}: Props) {
  // Independent Filter State for CPK Tab
  const [cpkPeriod, setCpkPeriod] = useState<string>("0");
  const [cpkCustomMonth, setCpkCustomMonth] = useState<string>("");
  const [cpkCategory, setCpkCategory] = useState<string>("Todas");
  const [cpkImportType, setCpkImportType] = useState<string>("Todas");
  const [cpkSearch, setCpkSearch] = useState("");
  const [cpkFilterRange, setCpkFilterRange] = useState<
    "todos" | "economicos" | "medios" | "elevados" | "sem_km"
  >("todos");
  const [cpkSortOrder, setCpkSortOrder] = useState<
    "cpk_asc" | "cpk_desc" | "cost_desc" | "km_desc"
  >("cpk_asc");

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

  // Filter records specifically for this CPK tab
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Tipo de importacao
      if (cpkImportType !== "Todas") {
        const imp = getRecordImportType(r);
        if (cpkImportType === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (cpkImportType === "receitas_despesas" && imp !== "receitas_despesas") return false;
      }

      // 2. Categoria
      if (cpkCategory !== "Todas" && r.tipo_registro !== cpkCategory) {
        return false;
      }

      // 3. Periodo
      if (!matchesPeriod(r.data, cpkPeriod, cpkCustomMonth)) {
        return false;
      }

      return true;
    });
  }, [records, cpkImportType, cpkCategory, cpkPeriod, cpkCustomMonth]);

  const isFiltered =
    cpkPeriod !== "0" ||
    cpkCategory !== "Todas" ||
    cpkImportType !== "Todas" ||
    cpkSearch.trim() !== "" ||
    cpkFilterRange !== "todos";

  const handleResetFilters = () => {
    setCpkPeriod("0");
    setCpkCustomMonth("");
    setCpkCategory("Todas");
    setCpkImportType("Todas");
    setCpkSearch("");
    setCpkFilterRange("todos");
    setCpkSortOrder("cpk_asc");
  };

  // Compute Vehicle Stats based on filtered records
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords);
  }, [filteredRecords]);

  const vehiclesWithKm = vehicleStats.allVehicles.filter((v) => v.kmRodadoCombustivel > 0);
  const totalFleetKm = vehicleStats.allVehicles.reduce((acc, v) => acc + (v.kmRodadoCombustivel || 0), 0);
  const totalFleetCost = vehicleStats.allVehicles.reduce((acc, v) => acc + (v.totalCost || 0), 0);
  const avgFleetCpk = totalFleetKm > 0 ? totalFleetCost / totalFleetKm : 0;

  const validCpkVehicles = [...vehiclesWithKm].filter((v) => v.cpk > 0);
  const bestCpkVehicle = [...validCpkVehicles].sort((a, b) => a.cpk - b.cpk)[0];
  const worstCpkVehicle = [...validCpkVehicles].sort((a, b) => b.cpk - a.cpk)[0];

  // Filtering table results
  const filteredCpkVehicles = vehicleStats.allVehicles.filter((v) => {
    if (cpkSearch.trim()) {
      const term = cpkSearch.toLowerCase().trim();
      const matchPlate = v.placa.toLowerCase().includes(term);
      const matchFrota = (v.numero_frota || "").toLowerCase().includes(term);
      if (!matchPlate && !matchFrota) return false;
    }

    if (cpkFilterRange === "economicos") {
      return v.cpk > 0 && v.cpk <= 2.0;
    } else if (cpkFilterRange === "medios") {
      return v.cpk > 2.0 && v.cpk <= 4.0;
    } else if (cpkFilterRange === "elevados") {
      return v.cpk > 4.0;
    } else if (cpkFilterRange === "sem_km") {
      return v.kmRodadoCombustivel === 0;
    }

    return true;
  });

  const sortedCpkVehicles = [...filteredCpkVehicles].sort((a, b) => {
    if (cpkSortOrder === "cpk_asc") {
      if (a.cpk === 0 && b.cpk > 0) return 1;
      if (b.cpk === 0 && a.cpk > 0) return -1;
      return a.cpk - b.cpk;
    } else if (cpkSortOrder === "cpk_desc") {
      return b.cpk - a.cpk;
    } else if (cpkSortOrder === "cost_desc") {
      return b.totalCost - a.totalCost;
    } else if (cpkSortOrder === "km_desc") {
      return b.kmRodadoCombustivel - a.kmRodadoCombustivel;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header CPK Concept Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-400/30">
              <Calculator className="w-3.5 h-3.5 text-purple-300" /> Indicador de Desempenho Operacional (R$/Km)
            </div>
            <h3 className="text-2xl font-black tracking-tight">Relatório Especializado de CPK</h3>
            <p className="text-purple-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              O <strong>CPK (Custo por Quilômetro Rodado)</strong> mede o custo operacional de cada veículo com filtro individual. É obtido dividindo o <strong>Custo Total das Despesas (SOFtran)</strong> pelos <strong>Quilômetros Rodados (GFV/Telemetria)</strong>.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300">Fórmula de Cálculo</p>
            <p className="text-sm font-black text-amber-300">CPK = Custo SOFtran (R$) ÷ Km GFV</p>
            <p className="text-[10px] text-slate-300">Custos SOFtran &bull; Km GFV</p>
          </div>
        </div>
      </div>

      {/* Individual Filter Toolbar for CPK */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>Filtros Individuais da Aba CPK</span>
            {isFiltered && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800">
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
              value={cpkPeriod}
              onChange={(e) => setCpkPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
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

            {cpkPeriod === "custom" && (
              <input
                type="month"
                value={cpkCustomMonth}
                onChange={(e) => setCpkCustomMonth(e.target.value)}
                className="mt-1.5 w-full px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-300 text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Categoria / Conta
            </label>
            <select
              value={cpkCategory}
              onChange={(e) => setCpkCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
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
              value={cpkImportType}
              onChange={(e) => setCpkImportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Todas">Todas as Importações</option>
              <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
              <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
            </select>
          </div>

          {/* Busca por Placa / Frota */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Buscar Placa / Frota
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: ABC1D23 ou 104"
                value={cpkSearch}
                onChange={(e) => setCpkSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CPK Fleet KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-purple-900 text-white p-4 rounded-2xl shadow-sm border border-purple-800">
          <p className="text-[10px] font-extrabold uppercase text-purple-300">CPK Médio da Frota</p>
          <p className="text-xl font-black mt-1 text-purple-200">
            {avgFleetCpk > 0 ? `R$ ${avgFleetCpk.toFixed(3)}/km` : "Sem Km"}
          </p>
          <p className="text-[10px] text-purple-300/80 mt-1">Custo SOFtran ÷ Km GFV</p>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-emerald-700">Mais Econômico (Menor CPK)</p>
          <p className="text-base font-black mt-1 text-emerald-900 truncate">
            {bestCpkVehicle ? `${bestCpkVehicle.placa} (R$ ${bestCpkVehicle.cpk.toFixed(3)})` : "-"}
          </p>
          <p className="text-[10px] text-emerald-600 mt-1">Melhor eficiência no período</p>
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-rose-700">Maior Custo por Km</p>
          <p className="text-base font-black mt-1 text-rose-900 truncate">
            {worstCpkVehicle ? `${worstCpkVehicle.placa} (R$ ${worstCpkVehicle.cpk.toFixed(3)})` : "-"}
          </p>
          <p className="text-[10px] text-rose-600 mt-1">Ponto de atenção operacional</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500">Frota Km Rodado Total</p>
          <p className="text-base font-black mt-1 text-blue-900">
            {totalFleetKm ? `${totalFleetKm.toLocaleString("pt-BR")} km` : "0 km"}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">100% GFV (Telemetria)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500">Custo Total Despesas</p>
          <p className="text-base font-black mt-1 text-slate-900">{formatCurrency(totalFleetCost)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">100% SOFtran (Custos)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500">Veículos com CPK</p>
          <p className="text-base font-black mt-1 text-indigo-900">
            {vehiclesWithKm.length} / {vehicleStats.allVehicles.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">Com Km de telemetria</p>
        </div>
      </div>

      {/* CPK Chart Comparison View with Data Labels */}
      {validCpkVehicles.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" /> Comparativo Visual de CPK por Veículo (com Rótulos)
              </h3>
              <p className="text-xs text-zinc-500">Veículos com barras menores apresentam maior eficiência econômica (R$/Km).</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Média Frota: R$ {avgFleetCpk.toFixed(3)}/km
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...validCpkVehicles]
                  .sort((a, b) => a.cpk - b.cpk)
                  .slice(0, 15)
                  .map((v) => ({
                    placa: v.placa,
                    cpk: Number(v.cpk.toFixed(3)),
                    cost: v.totalCost,
                    km: v.kmRodadoCombustivel,
                  }))}
                margin={{ top: 25, right: 15, left: -5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="placa" tick={{ fontSize: 11, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 11 }} unit=" R$" />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(3)} / km`, "CPK"]}
                  labelFormatter={(label) => `Veículo Placa: ${label}`}
                />
                <Bar dataKey="cpk" fill="#7c3aed" radius={[8, 8, 0, 0]}>
                  {/* RÓTULO DE DADOS NO GRÁFICO CPK */}
                  <LabelList
                    dataKey="cpk"
                    position="top"
                    formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`}
                    style={{ fill: "#4c1d95", fontSize: 10, fontWeight: 900 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CPK Matrix Table Section */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        {/* Search, Filter & Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Range */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
              <Filter className="w-4 h-4 text-purple-600" />
              <span>Faixa CPK:</span>
              <select
                value={cpkFilterRange}
                onChange={(e) => setCpkFilterRange(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Veículos</option>
                <option value="economicos">Econômicos (&le; R$ 2,00/km)</option>
                <option value="medios">Médios (R$ 2,00 - R$ 4,00/km)</option>
                <option value="elevados">Elevados (&gt; R$ 4,00/km)</option>
                <option value="sem_km">Sem Km Registrado</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
              <ArrowUpDown className="w-4 h-4 text-zinc-400" />
              <span>Ordenar:</span>
              <select
                value={cpkSortOrder}
                onChange={(e) => setCpkSortOrder(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
              >
                <option value="cpk_asc">Menor CPK (Mais Econômico)</option>
                <option value="cpk_desc">Maior CPK (Maior Custo/Km)</option>
                <option value="cost_desc">Maior Custo Total (R$)</option>
                <option value="km_desc">Maior Km Rodado</option>
              </select>
            </div>
          </div>
        </div>

        {/* CPK Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-purple-950 text-purple-200 border-b border-purple-900 uppercase tracking-wider text-[10px] font-extrabold">
                <th className="p-3.5">Placa</th>
                <th className="p-3.5">Frota</th>
                <th className="p-3.5 text-center">Viagens / Lançamentos</th>
                <th className="p-3.5 text-center">Consumo Total</th>
                <th className="p-3.5 text-center">Km Rodado (GFV)</th>
                <th className="p-3.5 text-center">Média (Km/L)</th>
                <th className="p-3.5 text-right">Custo Total (SOFtran)</th>
                <th className="p-3.5 text-right">CPK Calculado</th>
                <th className="p-3.5 text-center">Classificação</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {sortedCpkVehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400 font-semibold">
                    Nenhum veículo encontrado com os filtros de CPK aplicados.
                  </td>
                </tr>
              ) : (
                sortedCpkVehicles.map((v) => {
                  const mediaKmL =
                    v.totalLiters > 0 && v.kmRodadoCombustivel > 0
                      ? v.kmRodadoCombustivel / v.totalLiters
                      : 0;

                  return (
                    <tr key={v.key} className="hover:bg-purple-50/40 transition-colors">
                      <td className="p-3.5 font-extrabold text-zinc-900">{v.placa}</td>
                      <td className="p-3.5 text-zinc-600">{v.numero_frota || "-"}</td>
                      <td className="p-3.5 text-center text-zinc-700">{v.viagensCount}</td>
                      <td className="p-3.5 text-center text-amber-900 font-bold">
                        {v.totalLiters > 0 ? `${v.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` : "-"}
                      </td>
                      <td className="p-3.5 text-center text-blue-900 font-bold">
                        {v.kmRodadoCombustivel > 0 ? `${v.kmRodadoCombustivel.toLocaleString("pt-BR")} km` : "-"}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">
                        {mediaKmL > 0 ? `${mediaKmL.toFixed(2)} km/L` : "-"}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        {formatCurrency(v.totalCost)}
                      </td>
                      <td className="p-3.5 text-right">
                        {v.cpk > 0 ? (
                          <span
                            className={`font-black px-2.5 py-1 rounded-lg text-xs ${
                              v.cpk <= 2.0
                                ? "bg-emerald-100 text-emerald-800"
                                : v.cpk <= 4.0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            R$ {v.cpk.toFixed(3)}/km
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">Sem Km</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {v.cpk > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.cpk <= 2.0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : v.cpk <= 4.0
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {v.cpk <= 2.0 ? "Econômico" : v.cpk <= 4.0 ? "Médio" : "Elevado"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Pendente de Km</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onSelectVehicle(v.key)}
                          className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Detalhes
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
  );
}
