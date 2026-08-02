import React from "react";
import { Calendar, Building2, Truck, User, Filter, RotateCcw, Search, CheckCircle } from "lucide-react";

export interface GlobalReportFilters {
  startDate: string;
  endDate: string;
  branchId: string;
  vehicleId: string;
  driverId: string;
  status: string;
  searchTerm: string;
}

interface ReportsFiltersProps {
  filters: GlobalReportFilters;
  onFilterChange: (key: keyof GlobalReportFilters, value: string) => void;
  onReset: () => void;
  branches: any[];
  vehicles: any[];
  drivers: any[];
  showStatusFilter?: boolean;
  showVehicleFilter?: boolean;
  showDriverFilter?: boolean;
  showBranchFilter?: boolean;
  showSearchInput?: boolean;
  statusOptions?: { value: string; label: string }[];
  searchPlaceholder?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function ReportsFilters({
  filters,
  onFilterChange,
  onReset,
  branches = [],
  vehicles = [],
  drivers = [],
  showStatusFilter = true,
  showVehicleFilter = true,
  showDriverFilter = true,
  showBranchFilter = true,
  showSearchInput = true,
  statusOptions = [
    { value: "all", label: "Todos os Status" },
    { value: "pending", label: "Pendente" },
    { value: "waiting", label: "Aguardando Oficina" },
    { value: "resolved", label: "Resolvido" },
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Inativo" },
  ],
  searchPlaceholder = "Buscar por código, placa, item ou nome...",
  loading = false,
  onRefresh,
}: ReportsFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3.5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-wider">
          <Filter size={15} className="text-indigo-600" />
          <span>Filtros do Relatório</span>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="h-8 px-3 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5"
            >
              <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Atualizando..." : "Atualizar Dados"}</span>
            </button>
          )}
          <button
            onClick={onReset}
            className="h-8 px-3 text-[11px] font-extrabold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <span>Limpar Filtros</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Data Inicial */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-gray-400" /> De
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Data Final */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-gray-400" /> Até
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filial */}
        {showBranchFilter && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Building2 size={11} className="text-gray-400" /> Filial
            </label>
            <select
              value={filters.branchId}
              onChange={(e) => onFilterChange("branchId", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="all">Todas as Filiais</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Veículo */}
        {showVehicleFilter && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Truck size={11} className="text-gray-400" /> Veículo
            </label>
            <select
              value={filters.vehicleId}
              onChange={(e) => onFilterChange("vehicleId", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="all">Todos os Veículos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} {v.model ? `- ${v.model}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Motorista */}
        {showDriverFilter && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <User size={11} className="text-gray-400" /> Motorista
            </label>
            <select
              value={filters.driverId}
              onChange={(e) => onFilterChange("driverId", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="all">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        {showStatusFilter && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <CheckCircle size={11} className="text-gray-400" /> Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showSearchInput && (
        <div className="relative pt-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => onFilterChange("searchTerm", e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50/30 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      )}
    </div>
  );
}
