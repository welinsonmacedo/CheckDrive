import React, { useState } from "react";
import {
  Truck,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { VehicleReportStat, formatCurrency } from "../utils/vehicleStatsUtils";

interface Props {
  vehicleStats: {
    allVehicles: VehicleReportStat[];
  };
  onSelectVehicle: (key: string) => void;
}

export default function ReportVeiculoTab({
  vehicleStats,
  onSelectVehicle,
}: Props) {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleSortOrder, setVehicleSortOrder] = useState<"cost_desc" | "liters_desc" | "trips_desc" | "plate_asc" | "cpk_asc">("cost_desc");

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
              <Truck className="w-3.5 h-3.5" /> Análise Individualizada
            </div>
            <h3 className="text-2xl font-black tracking-tight">Tabela Veículo a Veículo</h3>
            <p className="text-blue-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Consolidado de cada veículo da frota com soma de despesas, viagens, abastecimentos, médias e CPK.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por placa ou frota..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                <th className="p-3.5 text-center">Viagens / Lançamentos</th>
                <th className="p-3.5 text-center">Consumo Total</th>
                <th className="p-3.5 text-center">Km Rodado (GFV)</th>
                <th className="p-3.5 text-center">Média (Km/L)</th>
                <th className="p-3.5 text-right">Custo Despesas (R$)</th>
                <th className="p-3.5 text-right">CPK (R$/Km)</th>
                <th className="p-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {sortedVehiclesList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400 font-semibold">
                    Nenhum veículo encontrado para a busca.
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
                      <td className="p-3.5 text-right font-black text-slate-900">{formatCurrency(v.costDespesas)}</td>
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
