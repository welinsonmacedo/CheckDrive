import React, { useState } from "react";
import {
  Calculator,
  Search,
  Filter,
  ArrowUpDown,
  BarChart3,
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
    allVehicles: VehicleReportStat[];
  };
  onSelectVehicle: (key: string) => void;
}

export default function ReportCpkTab({
  vehicleStats,
  onSelectVehicle,
}: Props) {
  const [cpkSearch, setCpkSearch] = useState("");
  const [cpkFilterRange, setCpkFilterRange] = useState<"todos" | "economicos" | "medios" | "elevados" | "sem_km">("todos");
  const [cpkSortOrder, setCpkSortOrder] = useState<"cpk_asc" | "cpk_desc" | "cost_desc" | "km_desc">("cpk_asc");

  const vehiclesWithKm = vehicleStats.allVehicles.filter((v) => v.kmRodadoCombustivel > 0);
  const totalFleetKm = vehicleStats.allVehicles.reduce((acc, v) => acc + (v.kmRodadoCombustivel || 0), 0);
  const totalFleetCost = vehicleStats.allVehicles.reduce((acc, v) => acc + (v.totalCost || 0), 0);
  const avgFleetCpk = totalFleetKm > 0 ? totalFleetCost / totalFleetKm : 0;

  const validCpkVehicles = [...vehiclesWithKm].filter((v) => v.cpk > 0);
  const bestCpkVehicle = [...validCpkVehicles].sort((a, b) => a.cpk - b.cpk)[0];
  const worstCpkVehicle = [...validCpkVehicles].sort((a, b) => b.cpk - a.cpk)[0];

  // Filtering
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
              O <strong>CPK (Custo por Quilômetro Rodado)</strong> mede o custo operacional de cada veículo. É obtido dividindo o <strong>Custo Total das despesas</strong> pelo <strong>Quilômetro Rodado (GFV/Telemetria)</strong>.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300">Fórmula de Cálculo</p>
            <p className="text-sm font-black text-amber-300">CPK = Custo Total (R$) ÷ Km Rodado</p>
            <p className="text-[10px] text-slate-300">Cruzamento GFV x SOFtran</p>
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
          <p className="text-[10px] text-purple-300/80 mt-1">Geral de todos os veículos</p>
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
          <p className="text-[10px] text-zinc-400 mt-1">Registrado via GFV</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500">Custo Total Avaliado</p>
          <p className="text-base font-black mt-1 text-slate-900">{formatCurrency(totalFleetCost)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">SOFtran + GFV</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs">
          <p className="text-[10px] font-extrabold uppercase text-zinc-500">Veículos com CPK</p>
          <p className="text-base font-black mt-1 text-indigo-900">
            {vehiclesWithKm.length} / {vehicleStats.allVehicles.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">Com Km de telemetria</p>
        </div>
      </div>

      {/* CPK Chart Comparison View */}
      {validCpkVehicles.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" /> Comparativo Visual de CPK por Veículo (R$/Km)
              </h3>
              <p className="text-xs text-zinc-500">Veículos com barras menores apresentam maior eficiência econômica.</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Média Frota: R$ {avgFleetCpk.toFixed(3)}/km
            </span>
          </div>

          <div className="h-72 w-full pt-2">
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
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="placa" tick={{ fontSize: 11, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 11 }} unit=" R$" />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(3)} / km`, "CPK"]}
                  labelFormatter={(label) => `Veículo Placa: ${label}`}
                />
                <Bar dataKey="cpk" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CPK Matrix Table Section */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        {/* Search, Filter & Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar placa ou frota..."
              value={cpkSearch}
              onChange={(e) => setCpkSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

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
                <th className="p-3.5 text-center">#</th>
                <th className="p-3.5">Placa</th>
                <th className="p-3.5">Frota</th>
                <th className="p-3.5 text-center">Km Rodado (GFV)</th>
                <th className="p-3.5 text-center">Consumo (L)</th>
                <th className="p-3.5 text-center">Média (Km/L)</th>
                <th className="p-3.5 text-right">Custo Despesas (R$)</th>
                <th className="p-3.5 text-right">CPK Total (R$/Km)</th>
                <th className="p-3.5 text-center">Status CPK</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {sortedCpkVehicles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400 font-semibold">
                    Nenhum veículo encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedCpkVehicles.map((v, idx) => {
                  const mediaKmL = v.totalLiters > 0 && v.kmRodadoCombustivel > 0
                    ? v.kmRodadoCombustivel / v.totalLiters
                    : 0;

                  let cpkBadge = { label: "Sem Km", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };
                  if (v.cpk > 0) {
                    if (v.cpk <= 2.0) {
                      cpkBadge = { label: "Econômico", cls: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" };
                    } else if (v.cpk <= 4.0) {
                      cpkBadge = { label: "Média Operacional", cls: "bg-amber-100 text-amber-800 border-amber-300 font-bold" };
                    } else {
                      cpkBadge = { label: "Custo Elevado", cls: "bg-rose-100 text-rose-800 border-rose-300 font-bold" };
                    }
                  }

                  return (
                    <tr key={v.key} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3.5 text-center font-bold text-zinc-400">#{idx + 1}</td>
                      <td className="p-3.5 font-extrabold text-zinc-900">{v.placa}</td>
                      <td className="p-3.5 font-semibold text-zinc-600">{v.numero_frota || "-"}</td>
                      <td className="p-3.5 text-center text-blue-900 font-bold">
                        {v.kmRodadoCombustivel > 0 ? `${v.kmRodadoCombustivel.toLocaleString("pt-BR")} km` : "-"}
                      </td>
                      <td className="p-3.5 text-center text-amber-900 font-bold">
                        {v.totalLiters > 0 ? `${v.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` : "-"}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">
                        {mediaKmL > 0 ? `${mediaKmL.toFixed(2)} km/L` : "-"}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">{formatCurrency(v.totalCost)}</td>
                      <td className="p-3.5 text-right font-black text-purple-700 text-sm">
                        {v.cpk > 0 ? `R$ ${v.cpk.toFixed(3)}` : "-"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] border ${cpkBadge.cls}`}>
                          {cpkBadge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onSelectVehicle(v.key)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
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
