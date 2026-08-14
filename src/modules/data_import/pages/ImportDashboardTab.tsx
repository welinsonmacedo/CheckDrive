import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Database,
  Copy,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Calculator,
  Navigation,
  Truck,
  DollarSign,
  Filter,
  Fuel,
  RotateCcw,
  Search,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { ImportJob, ImportRecord } from "../types";
import { ImportService } from "../services/importService";
import { AccountMapping, AccountMappingService } from "../services/accountMappingService";
import { calculateVehicleStats, formatCurrency, getRecordImportType } from "../utils/vehicleStatsUtils";
import { parseRecordMonthYear, matchesPeriod, MONTH_NAMES_PT } from "../utils/dateUtils";

interface Props {
  companyId: string;
  onNavigateToWizard: () => void;
}

export default function ImportDashboardTab({ companyId, onNavigateToWizard }: Props) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);

  // Individual Filters for Dashboard
  const [dashJobId, setDashJobId] = useState<string>("all");
  const [dashPeriod, setDashPeriod] = useState<string>("0");
  const [dashCustomMonth, setDashCustomMonth] = useState<string>("" );
  const [dashImportType, setDashImportType] = useState<string>("Todas");
  const [dashCategory, setDashCategory] = useState<string>("Todas");
  const [dashPlaca, setDashPlaca] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, recsData, mappingsData] = await Promise.all([
        ImportService.getImportJobs(companyId),
        ImportService.getImportRecords(companyId),
        AccountMappingService.getAccountMappings(companyId),
      ]);
      setJobs(jobsData);
      setRecords(recsData);
      setAccountMappings(mappingsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPdfs = jobs.length;
  const totalDuplicates = jobs.reduce((sum, j) => sum + (j.duplicados || 0), 0);
  const totalConflicts = jobs.reduce((sum, j) => sum + (j.conflitos || 0), 0);
  const lastJob = jobs.length > 0 ? jobs[0] : null;

  // Available months and categories from records
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

  // Filtered records for Dashboard calculations
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 0. Lote de Importação
      if (dashJobId && dashJobId !== "all") {
        if (r.import_job_id !== dashJobId) return false;
      }

      // 1. Tipo de importacao
      if (dashImportType !== "Todas") {
        const imp = getRecordImportType(r);
        if (dashImportType === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (dashImportType === "receitas_despesas" && imp !== "receitas_despesas") return false;
      }

      // 2. Categoria
      if (dashCategory !== "Todas" && r.tipo_registro !== dashCategory) {
        return false;
      }

      // 3. Periodo
      if (!matchesPeriod(r, dashPeriod, dashCustomMonth)) {
        return false;
      }

      // 4. Placa / Frota
      if (dashPlaca.trim()) {
        const p = dashPlaca.toLowerCase().trim();
        const placa = (r.placa || "").toLowerCase();
        const frota = (r.numero_frota || "").toLowerCase();
        if (!placa.includes(p) && !frota.includes(p)) return false;
      }

      return true;
    });
  }, [records, dashJobId, dashImportType, dashCategory, dashPeriod, dashCustomMonth, dashPlaca]);

  const isFiltered =
    dashJobId !== "all" ||
    dashPeriod !== "0" ||
    dashImportType !== "Todas" ||
    dashCategory !== "Todas" ||
    dashPlaca.trim() !== "";

  const handleResetFilters = () => {
    setDashJobId("all");
    setDashPeriod("0");
    setDashCustomMonth("");
    setDashImportType("Todas");
    setDashCategory("Todas");
    setDashPlaca("");
  };

  // CPK Calculations across filtered records
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords, accountMappings);
  }, [filteredRecords, accountMappings]);

  const totalKmRodadoCombustivel = useMemo(() => {
    return vehicleStats.allVehicles.reduce((sum, v) => sum + v.kmRodadoCombustivel, 0);
  }, [vehicleStats]);

  const totalCostDespesas = useMemo(() => {
    return vehicleStats.allVehicles.reduce((sum, v) => sum + v.totalCost, 0);
  }, [vehicleStats]);

  const totalLitersCombustivel = useMemo(() => {
    return vehicleStats.allVehicles.reduce((sum, v) => sum + v.totalLiters, 0);
  }, [vehicleStats]);

  const fleetCPK = totalKmRodadoCombustivel > 0 ? totalCostDespesas / totalKmRodadoCombustivel : 0;

  // Chart data: Monthly imports (from filtered records)
  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, { count: number; valor: number; litros: number }> = {};
    filteredRecords.forEach((r) => {
      const parsed = parseRecordMonthYear(r);
      const monthKey = parsed ? `${parsed.month}/${parsed.year}` : "Atual";
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { count: 0, valor: 0, litros: 0 };
      }
      monthlyMap[monthKey].count += 1;
      const imp = getRecordImportType(r);
      if (imp !== "combustivel_gfv") {
        monthlyMap[monthKey].valor += Number(r.valor) || 0;
      }
      monthlyMap[monthKey].litros += Number(r.quantidade) || 0;
    });

    const sorted = Object.keys(monthlyMap)
      .sort((a, b) => {
        const [mA, yA] = a.split("/");
        const [mB, yB] = b.split("/");
        if (yA && yB) {
          if (yA !== yB) return Number(yA) - Number(yB);
          return Number(mA) - Number(mB);
        }
        return a.localeCompare(b);
      })
      .map((k) => ({
        month: k,
        count: monthlyMap[k].count,
        valor: monthlyMap[k].valor,
        litros: monthlyMap[k].litros,
      }));

    if (sorted.length === 0 && records.length === 0) {
      return [
        { month: "Jan/26", count: 140, valor: 45000, litros: 8000 },
        { month: "Fev/26", count: 210, valor: 68000, litros: 12000 },
        { month: "Mar/26", count: 320, valor: 94000, litros: 16500 },
        { month: "Abr/26", count: 280, valor: 82000, litros: 14200 },
      ];
    }
    return sorted;
  }, [filteredRecords, records]);

  // Chart data: By Category
  const categoryChartData = useMemo(() => {
    const categoryMap: Record<string, { count: number; valor: number }> = {};
    filteredRecords.forEach((r) => {
      const cat = r.tipo_registro || "Outros";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, valor: 0 };
      categoryMap[cat].count += 1;
      if (getRecordImportType(r) !== "combustivel_gfv") {
        categoryMap[cat].valor += Number(r.valor) || 0;
      }
    });

    const totalCount = filteredRecords.length || 1;
    const list = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat].count,
      valor: categoryMap[cat].valor,
      percent: ((categoryMap[cat].count / totalCount) * 100).toFixed(1),
    }));

    if (list.length === 0 && records.length === 0) {
      return [
        { name: "Combustível", value: 45, valor: 65000, percent: "45.0" },
        { name: "Pedágio", value: 25, valor: 12000, percent: "25.0" },
        { name: "Manutenção", value: 15, valor: 28000, percent: "15.0" },
        { name: "Peças", value: 10, valor: 15000, percent: "10.0" },
        { name: "Outros", value: 5, valor: 5000, percent: "5.0" },
      ];
    }
    return list.sort((a, b) => b.value - a.value);
  }, [filteredRecords, records]);

  const COLORS = [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#14b8a6",
    "#6366f1",
  ];

  const exportExcelDashboard = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Mês;Volume Lançamentos;Custo Total SOFtran (R$);Litros GFV\n";
    monthlyChartData.forEach((row) => {
      csvContent += `"${row.month}";${row.count};${row.valor || 0};${row.litros || 0}\n`;
    });
    csvContent += "\nCategoria;Quantidade Lançamentos;Percentual (%);Valor SOFtran (R$)\n";
    categoryChartData.forEach((row) => {
      csvContent += `"${row.name}";${row.value};${row.percent || 0}%;${row.valor || 0}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_metricas_importacao_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-bold text-zinc-600">Carregando métricas e histórico de importações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" /> Dashboard & Estatísticas de Importação
            </div>
            <h2 className="text-2xl font-black tracking-tight">Painel de Métricas & Indicadores</h2>
            <p className="text-blue-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Visão consolidada com filtros dedicados e rótulos de dados em todos os gráficos. Custos extraídos 100% do SOFtran e Km/Litros do GFV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportExcelDashboard}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
              title="Exportar Métricas para CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportar CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
              title="Imprimir Dashboard"
            >
              <Printer className="w-4 h-4 text-zinc-300" /> Imprimir
            </button>
            <button
              onClick={onNavigateToWizard}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Nova Importação
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Filter Toolbar for Dashboard */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtros Individuais do Dashboard</span>
            {isFiltered && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800">
                Filtros Ativos ({filteredRecords.length} de {records.length} registros)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtros
              </button>
            )}

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60">
              <button
                type="button"
                onClick={() => setDashImportType("Todas")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dashImportType === "Todas"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setDashImportType("combustivel_gfv")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  dashImportType === "combustivel_gfv"
                    ? "bg-amber-600 text-white shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Fuel className="w-3 h-3" /> GFV
              </button>
              <button
                type="button"
                onClick={() => setDashImportType("receitas_despesas")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  dashImportType === "receitas_despesas"
                    ? "bg-indigo-600 text-white shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <FileSpreadsheet className="w-3 h-3" /> SOFtran
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Lote / Arquivo */}
          {jobs.length > 0 && (
            <div>
              <label className="block text-[11px] font-extrabold text-zinc-600 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-600" />
                Lote / Arquivo
              </label>
              <select
                value={dashJobId}
                onChange={(e) => setDashJobId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200 text-xs font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">★ Todos os Lotes ({totalPdfs})</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nome_arquivo} ({j.total_registros || 0} reg)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Período / Mês */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1 flex items-center justify-between">
              <span>Período / Mês</span>
              {dashPeriod.startsWith("m:") && (
                <span className="text-[10px] text-blue-600 font-bold">Mês Específico</span>
              )}
            </label>
            <select
              value={dashPeriod}
              onChange={(e) => setDashPeriod(e.target.value)}
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

            {dashPeriod === "custom" && (
              <input
                type="month"
                value={dashCustomMonth}
                onChange={(e) => setDashCustomMonth(e.target.value)}
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
              value={dashCategory}
              onChange={(e) => setDashCategory(e.target.value)}
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
              value={dashImportType}
              onChange={(e) => setDashImportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Todas">Todas as Importações</option>
              <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
              <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
            </select>
          </div>

          {/* Placa / Frota Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Placa / Frota
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: ABC1D23 ou 104"
                value={dashPlaca}
                onChange={(e) => setDashPlaca(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Lançamentos Filtrados */}
        <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Lançamentos</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {filteredRecords.length.toLocaleString("pt-BR")}
          </div>
          <div className="text-[10px] text-zinc-400 font-semibold truncate">
            {isFiltered ? `De ${records.length} no total` : "Total importado"}
          </div>
        </div>

        {/* Custo Total SOFtran */}
        <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Custos SOFtran</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 truncate" title={formatCurrency(totalCostDespesas)}>
            {formatCurrency(totalCostDespesas)}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-bold truncate">
            100% Despesas SOFtran
          </div>
        </div>

        {/* Km Rodado GFV */}
        <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Km Rodado (GFV)</span>
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-900 truncate">
            {totalKmRodadoCombustivel > 0 ? `${totalKmRodadoCombustivel.toLocaleString("pt-BR")} km` : "0 km"}
          </div>
          <div className="text-[10px] text-blue-600/80 font-bold truncate">
            100% Telemetria GFV
          </div>
        </div>

        {/* Litros de Combustível GFV */}
        <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Volume (GFV)</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 truncate">
            {totalLitersCombustivel > 0 ? `${totalLitersCombustivel.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` : "0 L"}
          </div>
          <div className="text-[10px] text-amber-600/80 font-bold truncate">
            Consumo Telemetria
          </div>
        </div>

        {/* Média de Consumo Km/L */}
        <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Média Km/L</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">
            {totalLitersCombustivel > 0 && totalKmRodadoCombustivel > 0
              ? `${(totalKmRodadoCombustivel / totalLitersCombustivel).toFixed(2)} km/L`
              : "-"}
          </div>
          <div className="text-[10px] text-indigo-600/80 font-bold truncate">
            Km GFV ÷ Litros GFV
          </div>
        </div>

        {/* CPK da Frota */}
        <div className="bg-purple-50 p-4 rounded-3xl border border-purple-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">CPK Frota</span>
            <Calculator className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-xl font-black text-purple-950">
            {fleetCPK > 0 ? `R$ ${fleetCPK.toFixed(3)}/km` : "Sem Km"}
          </div>
          <div className="text-[10px] text-purple-800 font-semibold truncate" title={`Custo SOFtran ÷ Km GFV`}>
            Custo SOFtran ÷ Km GFV
          </div>
        </div>
      </div>

      {/* Charts Section with Explicit Data Labels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Volume de Lançamentos Importados (com Rótulos)
              </h3>
              <p className="text-xs text-zinc-500">
                Histórico mensal filtrado com quantidade e valores detalhados
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
              Total: {filteredRecords.length} lançamentos
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 25, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString("pt-BR"), "Lançamentos"]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Registros">
                  {/* RÓTULO DE DADOS NO GRÁFICO */}
                  <LabelList
                    dataKey="count"
                    position="top"
                    formatter={(v: any) => Number(v).toLocaleString("pt-BR")}
                    style={{ fill: "#1e293b", fontSize: 11, fontWeight: 900 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart with Explicit Data Labels */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" /> Distribuição por Categoria (com Rótulos)
            </h3>
            <p className="text-xs text-zinc-500">Divisão percentual e quantitativa dos lançamentos</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${percent || 0}%)`}
                  labelLine={true}
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} lançamentos (${item?.payload?.percent || 0}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 max-h-28 overflow-y-auto">
            {categoryChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-zinc-600 truncate">{item.name}</span>
                <span className="font-bold text-zinc-900 ml-auto shrink-0">{item.value} ({item.percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CPK Dashboard Section / Resumo de Custo por Quilômetro */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" /> Custo por Quilômetro (CPK) por Veículo
            </h3>
            <p className="text-xs text-zinc-500">
              Calculado combinando o Km Rodado (Importação de Combustível GFV) e os Custos de Veículos (Importação de Receitas e Despesas SOFtran)
            </p>
          </div>
          <span className="text-xs font-extrabold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 self-start sm:self-auto">
            {vehicleStats.topCPK.length} veículo(s) com CPK calculado
          </span>
        </div>

        {vehicleStats.topCPK.length === 0 ? (
          <div className="p-6 text-center bg-zinc-50 rounded-2xl border border-zinc-200/80">
            <p className="text-xs font-bold text-zinc-600">Nenhum CPK disponível no momento com os filtros aplicados.</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Para visualizar o CPK, certifique-se de ter dados importados de 'Consumo de Combustível (GFV)' para obter o Km e de 'Receitas e Despesas (SOFtran)' para os Custos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicleStats.topCPK.slice(0, 6).map((v) => (
              <div key={v.key} className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 hover:border-purple-300 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-zinc-200/70 text-zinc-800 rounded-lg">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-sm font-black text-zinc-900">{v.placa}</strong>
                      {v.numero_frota && (
                        <span className="text-[10px] text-zinc-500 ml-1.5 font-bold">
                          Frota {v.numero_frota}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200">
                    R$ {v.cpk.toFixed(3)}/km
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 font-semibold block">Km Rodado (GFV)</span>
                    <strong className="text-zinc-900 font-black">
                      {v.kmRodadoCombustivel ? `${v.kmRodadoCombustivel.toLocaleString("pt-BR")} km` : "N/I"}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 font-semibold block">Custo (SOFtran)</span>
                    <strong className="text-emerald-700 font-black">
                      {formatCurrency(v.totalCost)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
