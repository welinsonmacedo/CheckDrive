import React, { useState, useMemo } from "react";
import {
  Truck,
  Search,
  ArrowUpDown,
  Filter,
  RotateCcw,
  Calendar,
  Layers,
  Fuel,
  DollarSign,
} from "lucide-react";
import { ImportRecord } from "../types";
import {
  calculateVehicleStats,
  VehicleReportStat,
  formatCurrency,
  getRecordImportType,
} from "../utils/vehicleStatsUtils";
import { parseRecordMonthYear, matchesPeriod, MONTH_NAMES_PT } from "../utils/dateUtils";

import { AccountMapping } from "../services/accountMappingService";

interface Props {
  records: ImportRecord[];
  onSelectVehicle: (key: string) => void;
  accountMappings?: AccountMapping[];
}

export default function ReportVeiculoTab({
  records,
  onSelectVehicle,
  accountMappings = [],
}: Props) {
  // Independent Filter State for Vehicle-by-Vehicle Tab
  const [vehiclePeriod, setVehiclePeriod] = useState<string>("0");
  const [vehicleCustomMonth, setVehicleCustomMonth] = useState<string>("");
  const [vehicleCategory, setVehicleCategory] = useState<string>("Todas");
  const [vehicleImportType, setVehicleImportType] = useState<string>("Todas");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleSortOrder, setVehicleSortOrder] = useState<
    "cost_desc" | "liters_desc" | "trips_desc" | "plate_asc" | "cpk_asc"
  >("cost_desc");

  // Extract available months and categories
  const { monthsByYear, allCategories } = useMemo(() => {
    const monthsSet = new Set<string>();
    const catsSet = new Set<string>();
    records.forEach((r) => {
      if (r.tipo_registro) catsSet.add(r.tipo_registro);
      const parsed = parseRecordMonthYear(r);
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

  // Filter records specifically for this Vehicle tab
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Tipo de importacao
      if (vehicleImportType !== "Todas") {
        const imp = getRecordImportType(r);
        if (vehicleImportType === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (vehicleImportType === "receitas_despesas" && imp !== "receitas_despesas") return false;
      }

      // 2. Categoria
      if (vehicleCategory !== "Todas" && r.tipo_registro !== vehicleCategory) {
        return false;
      }

      // 3. Periodo
      if (!matchesPeriod(r, vehiclePeriod, vehicleCustomMonth)) {
        return false;
      }

      return true;
    });
  }, [records, vehicleImportType, vehicleCategory, vehiclePeriod, vehicleCustomMonth]);

  const isFiltered =
    vehiclePeriod !== "0" ||
    vehicleCategory !== "Todas" ||
    vehicleImportType !== "Todas" ||
    vehicleSearch.trim() !== "";

  const handleResetFilters = () => {
    setVehiclePeriod("0");
    setVehicleCustomMonth("");
    setVehicleCategory("Todas");
    setVehicleImportType("Todas");
    setVehicleSearch("");
    setVehicleSortOrder("cost_desc");
  };

  // Compute Vehicle Stats based on filtered records
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords, accountMappings);
  }, [filteredRecords, accountMappings]);

  const filteredVehiclesList = vehicleStats.allVehicles.filter((v) => {
    if (!vehicleSearch.trim()) return true;
    const term = vehicleSearch.toLowerCase().trim();
    const matchPlate = v.placa.toLowerCase().includes(term);
    const matchFrota = (v.numero_frota || "").toLowerCase().includes(term);
    return matchPlate || matchFrota;
  });

  const sortedVehiclesList = [...filteredVehiclesList].sort((a, b) => {
    if (vehicleSortOrder === "cost_desc") {
      return b.totalCost - a.totalCost;
    } else if (vehicleSortOrder === "liters_desc") {
      return b.totalLiters - a.totalLiters;
    } else if (vehicleSortOrder === "trips_desc") {
      return b.viagensCount - a.viagensCount;
    } else if (vehicleSortOrder === "plate_asc") {
      return a.placa.localeCompare(b.placa);
    } else if (vehicleSortOrder === "cpk_asc") {
      if (a.cpk === 0 && b.cpk > 0) return 1;
      if (b.cpk === 0 && a.cpk > 0) return -1;
      return a.cpk - b.cpk;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Truck className="w-3.5 h-3.5" /> Análise Individualizada com Filtro Próprio
            </div>
            <h3 className="text-2xl font-black tracking-tight">Tabela Veículo a Veículo</h3>
            <p className="text-blue-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Consolidado de cada veículo da frota com filtro individual de período, categoria e fonte de importação.
            </p>
          </div>
        </div>
      </div>

      {/* Individual Filter Toolbar for Vehicle Tab */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtros Individuais da Aba Veículos</span>
            {isFiltered && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
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
              value={vehiclePeriod}
              onChange={(e) => setVehiclePeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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

            {vehiclePeriod === "custom" && (
              <input
                type="month"
                value={vehicleCustomMonth}
                onChange={(e) => setVehicleCustomMonth(e.target.value)}
                className="mt-1.5 w-full px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-300 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Categoria / Conta
            </label>
            <select
              value={vehicleCategory}
              onChange={(e) => setVehicleCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              value={vehicleImportType}
              onChange={(e) => setVehicleImportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Todas">Todas as Importações</option>
              <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
              <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
            </select>
          </div>

          {/* Busca por Placa ou Frota */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Buscar Placa / Frota
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: ABC1D23 ou 104"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-zinc-900">
              Total de Veículos Listados: {sortedVehiclesList.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
            <ArrowUpDown className="w-4 h-4 text-zinc-400" />
            <span>Ordenar por:</span>
            <select
              value={vehicleSortOrder}
              onChange={(e) => setVehicleSortOrder(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
            >
              <option value="cost_desc">Maior Custo Total (R$)</option>
              <option value="liters_desc">Maior Consumo (Litros)</option>
              <option value="trips_desc">Mais Viagens / Lançamentos</option>
              <option value="plate_asc">Ordem Alfabética (Placa)</option>
              <option value="cpk_asc">Menor CPK (Mais Econômico)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 uppercase tracking-wider text-[10px] font-extrabold">
                <th className="p-3.5 text-center">#</th>
                <th className="p-3.5">Placa</th>
                <th className="p-3.5">Frota</th>
                <th className="p-3.5 text-center">Lançamentos</th>
                <th className="p-3.5 text-center">Consumo (GFV L)</th>
                <th className="p-3.5 text-center">Km Rodado (GFV)</th>
                <th className="p-3.5 text-center">Média (Km/L)</th>
                <th className="p-3.5 text-right">Despesas (SOFtran)</th>
                <th className="p-3.5 text-right">Custo Total (SOFtran)</th>
                <th className="p-3.5 text-right">CPK (R$/Km)</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {sortedVehiclesList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-zinc-400 font-semibold">
                    Nenhum veículo encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedVehiclesList.map((v, idx) => {
                  const mediaKmL =
                    v.totalLiters > 0 && v.kmRodadoCombustivel > 0
                      ? v.kmRodadoCombustivel / v.totalLiters
                      : 0;

                  return (
                    <tr key={v.key} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3.5 text-center font-bold text-zinc-400">#{idx + 1}</td>
                      <td className="p-3.5 font-extrabold text-zinc-900">{v.placa}</td>
                      <td className="p-3.5 font-semibold text-zinc-600">{v.numero_frota || "-"}</td>
                      <td className="p-3.5 text-center text-zinc-700">{v.viagensCount}</td>
                      <td className="p-3.5 text-center text-amber-900 font-bold">
                        {v.totalLiters > 0
                          ? `${v.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L`
                          : "-"}
                      </td>
                      <td className="p-3.5 text-center text-blue-900 font-bold">
                        {v.kmRodadoCombustivel > 0
                          ? `${v.kmRodadoCombustivel.toLocaleString("pt-BR")} km`
                          : "-"}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">
                        {mediaKmL > 0 ? `${mediaKmL.toFixed(2)} km/L` : "-"}
                      </td>
                      <td className="p-3.5 text-right font-bold text-zinc-700">{formatCurrency(v.costDespesas)}</td>
                      <td className="p-3.5 text-right font-black text-slate-900">{formatCurrency(v.totalCost)}</td>
                      <td className="p-3.5 text-right font-black text-purple-700">
                        {v.cpk > 0 ? `R$ ${v.cpk.toFixed(3)}` : "-"}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onSelectVehicle(v.key)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ver Viagens
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
