import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Fuel,
  DollarSign,
  Layers,
  BarChart3,
  LineChart as LineChartIcon,
  RotateCcw,
  Sparkles,
  Clock,
  Filter,
  Gauge,
  Info,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ImportRecord } from "../types";
import {
  parseRecordFullDate,
  ParsedRecordDate,
  MONTH_NAMES_PT,
  MONTH_SHORT_PT,
} from "../utils/dateUtils";
import { getRecordFinancialValue, formatCurrency } from "../utils/vehicleStatsUtils";

interface Props {
  records: ImportRecord[];
  tipoImportacaoFilter: string;
  categoryFilter: string;
  placaFilter: string;
  fornecedorFilter: string;
  onResetFilters?: () => void;
}

export type GranularityMode = "mensal" | "semanal" | "quinzenal" | "diario";

export default function ReportTendenciaTab({
  records,
  tipoImportacaoFilter,
  categoryFilter,
  placaFilter,
  fornecedorFilter,
  onResetFilters,
}: Props) {
  // Granularity selector
  const [granularity, setGranularity] = useState<GranularityMode>("mensal");
  const [hasUserChangedGranularity, setHasUserChangedGranularity] = useState<boolean>(false);

  // Timeframe & metric controls
  const [trendTimeframe, setTrendTimeframe] = useState<string>("all"); // "all", "12m", "6m", "3m", "30d", "year_2026", "month_2026-07"
  const [metricMode, setMetricMode] = useState<"valor" | "litros" | "preco_medio" | "cpk" | "lancamentos" | "ticket_medio">("valor");
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [sortBy, setSortBy] = useState<"chrono" | "valor_desc" | "variation_desc" | "volume_desc">("chrono");

  // Available distinct months & years from records
  const { availableYears, availableMonths, distinctMonthCount } = useMemo(() => {
    const yearsSet = new Set<string>();
    const monthsMap = new Map<string, { yearMonth: string; label: string; name: string }>();

    records.forEach((r) => {
      const rawDate =
        r.data ||
        (r as any).data_registro ||
        (r as any).data_abastecimento ||
        (r as any).data_emissao ||
        (r as any).data_movimento ||
        (r as any).data_importacao ||
        (r as any).criado_em ||
        (r as any).created_at;
      const parsed = parseRecordFullDate(rawDate);
      if (parsed) {
        yearsSet.add(parsed.year);
        if (!monthsMap.has(parsed.yearMonth)) {
          monthsMap.set(parsed.yearMonth, {
            yearMonth: parsed.yearMonth,
            label: parsed.monthYear,
            name: `${parsed.monthName} / ${parsed.year}`,
          });
        }
      }
    });

    const curr = String(new Date().getFullYear());
    yearsSet.add(curr);

    const sortedYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    const sortedMonths = Array.from(monthsMap.values()).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    return {
      availableYears: sortedYears,
      availableMonths: sortedMonths,
      distinctMonthCount: monthsMap.size,
    };
  }, [records]);

  // Auto-adjust default granularity if only 1 month exists in records and user hasn't manually chosen yet
  useEffect(() => {
    if (!hasUserChangedGranularity) {
      if (distinctMonthCount === 1) {
        // If data is from a single month, default to daily view so chart has 20-31 data points instead of 1 bar!
        setGranularity("diario");
      } else if (distinctMonthCount > 1) {
        setGranularity("mensal");
      }
    }
  }, [distinctMonthCount, hasUserChangedGranularity]);

  // Filter records considering non-period filters (category, type, placa, supplier)
  const baseFilteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (categoryFilter !== "Todas" && r.tipo_registro !== categoryFilter) return false;
      if (tipoImportacaoFilter !== "Todas") {
        const isGFV =
          r.conta?.toLowerCase().includes("gfv") ||
          r.descricao_conta?.toLowerCase().includes("combustivel") ||
          r.tipo_registro === "Combustível" ||
          r.tipo_registro === "Diesel" ||
          r.tipo_registro === "Gasolina" ||
          r.tipo_registro === "Arla";
        if (tipoImportacaoFilter === "combustivel_gfv" && !isGFV) return false;
        if (tipoImportacaoFilter === "receitas_despesas" && isGFV) return false;
      }
      if (placaFilter.trim()) {
        const p = placaFilter.toLowerCase().trim();
        const rP = (r.placa || "").toLowerCase();
        const rF = (r.numero_frota || "").toLowerCase();
        if (!rP.includes(p) && !rF.includes(p)) return false;
      }
      if (fornecedorFilter.trim()) {
        const f = fornecedorFilter.toLowerCase().trim();
        const rF = (r.fornecedor || "").toLowerCase();
        if (!rF.includes(f)) return false;
      }
      return true;
    });
  }, [records, categoryFilter, tipoImportacaoFilter, placaFilter, fornecedorFilter]);

  // Filter records by timeframe
  const timeframeFilteredRecords = useMemo(() => {
    if (trendTimeframe === "all") return baseFilteredRecords;

    const now = new Date().getTime();

    return baseFilteredRecords.filter((r) => {
      const rawDate =
        r.data ||
        (r as any).data_registro ||
        (r as any).data_abastecimento ||
        (r as any).data_emissao ||
        (r as any).data_movimento ||
        (r as any).data_importacao ||
        (r as any).criado_em ||
        (r as any).created_at;
      const parsed = parseRecordFullDate(rawDate);
      if (!parsed) return true;

      if (trendTimeframe.startsWith("year_")) {
        const targetYear = trendTimeframe.replace("year_", "");
        return parsed.year === targetYear;
      }

      if (trendTimeframe.startsWith("month_")) {
        const targetYearMonth = trendTimeframe.replace("month_", "");
        return parsed.yearMonth === targetYearMonth;
      }

      if (trendTimeframe === "30d") {
        const diffDays = (now - parsed.timestamp) / (1000 * 3600 * 24);
        return diffDays <= 35 && diffDays >= -2;
      }

      if (trendTimeframe === "3m") {
        const diffDays = (now - parsed.timestamp) / (1000 * 3600 * 24);
        return diffDays <= 95 && diffDays >= -2;
      }

      if (trendTimeframe === "6m") {
        const diffDays = (now - parsed.timestamp) / (1000 * 3600 * 24);
        return diffDays <= 185 && diffDays >= -2;
      }

      if (trendTimeframe === "12m") {
        const diffDays = (now - parsed.timestamp) / (1000 * 3600 * 24);
        return diffDays <= 370 && diffDays >= -2;
      }

      return true;
    });
  }, [baseFilteredRecords, trendTimeframe]);

  // Aggregate trend data based on selected granularity (Mensal, Semanal, Quinzenal, Diário)
  const trendData = useMemo(() => {
    interface TrendBucket {
      key: string;
      label: string;
      fullName: string;
      sortKey: number | string;
      totalValor: number;
      totalLiters: number;
      totalKm: number;
      count: number;
      categories: Record<string, number>;
    }

    const map: Record<string, TrendBucket> = {};

    timeframeFilteredRecords.forEach((r) => {
      const rawDate =
        r.data ||
        (r as any).data_registro ||
        (r as any).data_abastecimento ||
        (r as any).data_emissao ||
        (r as any).data_movimento ||
        (r as any).data_importacao ||
        (r as any).criado_em ||
        (r as any).created_at;
      const parsed = parseRecordFullDate(rawDate);
      if (!parsed) return;

      let key = "";
      let label = "";
      let fullName = "";
      let sortKey: number | string = 0;

      if (granularity === "diario") {
        key = parsed.isoDate;
        label = parsed.formattedDayMonth;
        fullName = `${parsed.formattedBr} (${parsed.monthName})`;
        sortKey = parsed.timestamp;
      } else if (granularity === "semanal") {
        key = parsed.weekKey;
        label = parsed.weekLabel;
        fullName = `Semana ${parsed.weekNum} de ${parsed.year}`;
        sortKey = Number(parsed.year) * 100 + parsed.weekNum;
      } else if (granularity === "quinzenal") {
        key = parsed.quinzenaKey;
        label = parsed.quinzenaLabel;
        fullName = `${parsed.quinzenaLabel} (${parsed.year})`;
        const qNum = parsed.quinzenaKey.endsWith("Q1") ? 1 : 2;
        sortKey = Number(parsed.year) * 1000 + Number(parsed.month) * 10 + qNum;
      } else {
        // Mensal (default)
        key = parsed.yearMonth;
        label = parsed.monthYear;
        fullName = `${parsed.monthName} / ${parsed.year}`;
        sortKey = Number(parsed.year) * 100 + Number(parsed.month);
      }

      if (!map[key]) {
        map[key] = {
          key,
          label,
          fullName,
          sortKey,
          totalValor: 0,
          totalLiters: 0,
          totalKm: 0,
          count: 0,
          categories: {},
        };
      }

      const val = getRecordFinancialValue(r, tipoImportacaoFilter === "combustivel_gfv");
      const liters = Number(r.quantidade) || 0;
      const km = Number(r.km_rodado) || 0;
      const cat = r.tipo_registro || "Outros";

      map[key].totalValor += val;
      map[key].totalLiters += liters;
      map[key].totalKm += km;
      map[key].count += 1;
      map[key].categories[cat] = (map[key].categories[cat] || 0) + val;
    });

    let list = Object.values(map).sort((a, b) => {
      if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
        return a.sortKey - b.sortKey;
      }
      return String(a.sortKey).localeCompare(String(b.sortKey));
    });

    // Compute variations and derived metrics
    const totalPeriodCost = list.reduce((sum, m) => sum + m.totalValor, 0);

    return list.map((item, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : null;
      let variationPct = 0;
      let variationVal = 0;
      if (prev && prev.totalValor > 0) {
        variationVal = item.totalValor - prev.totalValor;
        variationPct = (variationVal / prev.totalValor) * 100;
      }
      const precoMedioLitro = item.totalLiters > 0 ? item.totalValor / item.totalLiters : 0;
      const cpk = item.totalKm > 0 ? item.totalValor / item.totalKm : 0;
      const ticketMedio = item.count > 0 ? item.totalValor / item.count : 0;
      const sharePct = totalPeriodCost > 0 ? (item.totalValor / totalPeriodCost) * 100 : 0;

      return {
        ...item,
        variationPct,
        variationVal,
        precoMedioLitro,
        cpk,
        ticketMedio,
        sharePct,
      };
    });
  }, [timeframeFilteredRecords, granularity, tipoImportacaoFilter]);

  // Overall KPIs
  const totalGeralPeriodo = useMemo(
    () => trendData.reduce((acc, m) => acc + m.totalValor, 0),
    [trendData]
  );
  const totalLitrosPeriodo = useMemo(
    () => trendData.reduce((acc, m) => acc + m.totalLiters, 0),
    [trendData]
  );
  const totalLancamentosPeriodo = useMemo(
    () => trendData.reduce((acc, m) => acc + m.count, 0),
    [trendData]
  );
  const totalKmPeriodo = useMemo(
    () => trendData.reduce((acc, m) => acc + m.totalKm, 0),
    [trendData]
  );
  const mediaPeriodo = useMemo(
    () => (trendData.length > 0 ? totalGeralPeriodo / trendData.length : 0),
    [totalGeralPeriodo, trendData]
  );

  const highestPeriod = useMemo(() => {
    if (trendData.length === 0) return null;
    return [...trendData].sort((a, b) => b.totalValor - a.totalValor)[0];
  }, [trendData]);

  const lowestPeriod = useMemo(() => {
    if (trendData.length === 0) return null;
    return [...trendData].sort((a, b) => a.totalValor - b.totalValor)[0];
  }, [trendData]);

  const lastPeriod = trendData[trendData.length - 1] || null;

  // Sorted list for table
  const sortedTableData = useMemo(() => {
    const list = [...trendData];
    if (sortBy === "valor_desc") {
      list.sort((a, b) => b.totalValor - a.totalValor);
    } else if (sortBy === "variation_desc") {
      list.sort((a, b) => b.variationPct - a.variationPct);
    } else if (sortBy === "volume_desc") {
      list.sort((a, b) => b.totalLiters - a.totalLiters);
    }
    return list;
  }, [trendData, sortBy]);

  // Determine chart values based on metricMode
  const chartData = useMemo(() => {
    return trendData.map((m) => ({
      name: m.label,
      fullName: m.fullName,
      valor: m.totalValor,
      litros: m.totalLiters,
      preco_medio: Number(m.precoMedioLitro.toFixed(3)),
      cpk: Number(m.cpk.toFixed(3)),
      lancamentos: m.count,
      ticket_medio: Number(m.ticketMedio.toFixed(2)),
      displayVal:
        metricMode === "valor"
          ? m.totalValor
          : metricMode === "litros"
          ? m.totalLiters
          : metricMode === "preco_medio"
          ? m.precoMedioLitro
          : metricMode === "cpk"
          ? m.cpk
          : metricMode === "ticket_medio"
          ? m.ticketMedio
          : m.count,
    }));
  }, [trendData, metricMode]);

  const granularityName =
    granularity === "diario"
      ? "Dia"
      : granularity === "semanal"
      ? "Semana"
      : granularity === "quinzenal"
      ? "Quinzena"
      : "Mês";

  return (
    <div className="space-y-6">
      {/* Single Month Smart Hint Banner */}
      {distinctMonthCount === 1 && (
        <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-purple-900 shadow-xs no-print">
          <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-purple-950">
              📊 Base de dados com 1 mês de lançamentos ({availableMonths[0]?.name || "Período Único"}).
            </p>
            <p className="text-purple-700 leading-relaxed">
              O gráfico está exibindo automaticamente a <strong className="text-purple-950">evolução diária (dia a dia)</strong> de custos e abastecimentos ao longo do mês ({trendData.length} dias com dados). Você também pode alternar para visualização <strong>Semanal</strong>, <strong>Quinzenal</strong> ou <strong>Mensal</strong> nos botões abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Top Trend Controls Bar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        {/* Row 1: Header + Granularity Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-900 text-base">
                Análise de Tendência & Evolução Temporal
              </h3>
              <p className="text-xs text-zinc-500">
                Acompanhe o comportamento financeiro e operacional da frota ao longo do tempo.
              </p>
            </div>
          </div>

          {/* Granularity Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200/70 text-xs font-bold self-start lg:self-auto">
            <span className="text-[11px] font-extrabold text-zinc-500 px-2 uppercase tracking-wider">
              Agrupar por:
            </span>
            <button
              type="button"
              onClick={() => {
                setGranularity("mensal");
                setHasUserChangedGranularity(true);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === "mensal"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Mensal (Mês a Mês)
            </button>
            <button
              type="button"
              onClick={() => {
                setGranularity("quinzenal");
                setHasUserChangedGranularity(true);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === "quinzenal"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Quinzenal
            </button>
            <button
              type="button"
              onClick={() => {
                setGranularity("semanal");
                setHasUserChangedGranularity(true);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === "semanal"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Semanal
            </button>
            <button
              type="button"
              onClick={() => {
                setGranularity("diario");
                setHasUserChangedGranularity(true);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                granularity === "diario"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Dia a Dia (Diário)
            </button>
          </div>
        </div>

        {/* Row 2: Timeframe & Months Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" /> Período Temporal:
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTrendTimeframe("all")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "all"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todo Histórico
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("12m")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "12m"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 12m
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("6m")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "6m"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 6m
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("3m")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "3m"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 90d
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("30d")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "30d"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 30d
              </button>
            </div>
          </div>

          {/* Month / Year Specific Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500">Filtrar Mês/Ano:</span>
            <select
              value={trendTimeframe}
              onChange={(e) => setTrendTimeframe(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-bold focus:outline-none cursor-pointer hover:bg-zinc-100"
            >
              <option value="all">Todos os Meses ({availableMonths.length})</option>
              <optgroup label="Por Mês Específico">
                {availableMonths.map((m) => (
                  <option key={m.yearMonth} value={`month_${m.yearMonth}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Por Ano">
                {availableYears.map((yr) => (
                  <option key={yr} value={`year_${yr}`}>
                    Ano {yr}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Row 3: Metric Mode & Chart Type Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Metric Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-600">Visualizar Métrica:</span>
            <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMetricMode("valor")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "valor"
                    ? "bg-white text-purple-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Custo Total (R$)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("litros")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "litros"
                    ? "bg-white text-amber-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Fuel className="w-3.5 h-3.5 text-amber-600" /> Volume (Litros)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("preco_medio")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "preco_medio"
                    ? "bg-white text-emerald-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Preço Médio (R$/L)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("cpk")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "cpk"
                    ? "bg-white text-cyan-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-cyan-600" /> CPK (R$/Km)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("lancamentos")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "lancamentos"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Qtd Lançamentos
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("ticket_medio")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "ticket_medio"
                    ? "bg-white text-indigo-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Ticket Médio (R$)
              </button>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-600">Tipo de Gráfico:</span>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  chartType === "area" ? "bg-white text-purple-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
                title="Gráfico de Área Suave"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  chartType === "line" ? "bg-white text-purple-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
                title="Gráfico de Linha"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  chartType === "bar" ? "bg-white text-purple-700 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
                title="Gráfico de Barras"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {trendData.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <TrendingUp size={32} />
          </div>
          <h3 className="text-lg font-black text-zinc-900">
            Nenhum dado encontrado para o período ou filtros selecionados
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Verifique se os arquivos de lançamentos possuem datas válidas ou remova os filtros de placa/fornecedor aplicados.
          </p>
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-4 h-4" /> Redefinir Todos os Filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Trend KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {granularityName} de Maior Custo
                </span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-lg font-black text-zinc-900">
                {highestPeriod ? highestPeriod.label : "-"}
              </p>
              <p className="text-xs font-bold text-rose-600 mt-0.5">
                {highestPeriod ? formatCurrency(highestPeriod.totalValor) : "R$ 0,00"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {highestPeriod ? `${highestPeriod.count} lançamentos • ${highestPeriod.sharePct.toFixed(1)}% do total` : ""}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {granularityName} Mais Econômico
                </span>
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-zinc-900">
                {lowestPeriod ? lowestPeriod.label : "-"}
              </p>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                {lowestPeriod ? formatCurrency(lowestPeriod.totalValor) : "R$ 0,00"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {lowestPeriod ? `${lowestPeriod.count} lançamentos • ${lowestPeriod.sharePct.toFixed(1)}% do total` : ""}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Média por {granularityName}
                </span>
                <Calculator className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-lg font-black text-blue-900">{formatCurrency(mediaPeriodo)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Calculada em {trendData.length} ponto(s) analisados ({granularity})
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Variação vs {granularityName} Anterior
                </span>
                {lastPeriod && lastPeriod.variationPct >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-rose-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p
                className={`text-lg font-black ${
                  lastPeriod && lastPeriod.variationPct >= 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {lastPeriod
                  ? `${lastPeriod.variationPct >= 0 ? "+" : ""}${lastPeriod.variationPct.toFixed(1)}%`
                  : "0.0%"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {lastPeriod && lastPeriod.variationVal !== 0
                  ? `${lastPeriod.variationVal >= 0 ? "+" : ""}${formatCurrency(lastPeriod.variationVal)} vs anterior`
                  : "Comparado ao período anterior"}
              </p>
            </div>
          </div>

          {/* Main Visual Trend Chart */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  {metricMode === "valor" && "Evolução Temporal de Custos (R$)"}
                  {metricMode === "litros" && "Evolução de Consumo de Combustível (Litros)"}
                  {metricMode === "preco_medio" && "Evolução do Preço Médio por Litro (R$/L)"}
                  {metricMode === "cpk" && "Evolução do Custo por Km (R$/Km)"}
                  {metricMode === "lancamentos" && "Evolução da Quantidade de Lançamentos"}
                  {metricMode === "ticket_medio" && "Evolução do Ticket Médio por Lançamento (R$)"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Visualização {granularity} contínua com {trendData.length} pontos temporais no período
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      interval={chartData.length > 20 ? "preserveStartEnd" : 0}
                      angle={chartData.length > 12 ? -25 : 0}
                      textAnchor={chartData.length > 12 ? "end" : "middle"}
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? val >= 1000
                            ? `R$ ${(val / 1000).toFixed(0)}k`
                            : `R$ ${val.toFixed(0)}`
                          : metricMode === "preco_medio" || metricMode === "cpk"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "cpk"
                          ? `R$ ${Number(value).toFixed(3)} / Km`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : metricMode === "cpk"
                          ? "Custo por Km"
                          : metricMode === "ticket_medio"
                          ? "Ticket Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items && items[0] ? (items[0].payload as any) : null;
                        return item?.fullName ? `${item.fullName}` : `${granularityName}: ${label}`;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="displayVal"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTrend)"
                      dot={chartData.length <= 31 ? { r: 3, fill: "#8b5cf6" } : false}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                ) : chartType === "line" ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      interval={chartData.length > 20 ? "preserveStartEnd" : 0}
                      angle={chartData.length > 12 ? -25 : 0}
                      textAnchor={chartData.length > 12 ? "end" : "middle"}
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? val >= 1000
                            ? `R$ ${(val / 1000).toFixed(0)}k`
                            : `R$ ${val.toFixed(0)}`
                          : metricMode === "preco_medio" || metricMode === "cpk"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "cpk"
                          ? `R$ ${Number(value).toFixed(3)} / Km`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : metricMode === "cpk"
                          ? "Custo por Km"
                          : metricMode === "ticket_medio"
                          ? "Ticket Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items && items[0] ? (items[0].payload as any) : null;
                        return item?.fullName ? `${item.fullName}` : `${granularityName}: ${label}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayVal"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={chartData.length <= 31 ? { r: 4, fill: "#7c3aed" } : false}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      interval={chartData.length > 20 ? "preserveStartEnd" : 0}
                      angle={chartData.length > 12 ? -25 : 0}
                      textAnchor={chartData.length > 12 ? "end" : "middle"}
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? val >= 1000
                            ? `R$ ${(val / 1000).toFixed(0)}k`
                            : `R$ ${val.toFixed(0)}`
                          : metricMode === "preco_medio" || metricMode === "cpk"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor" || metricMode === "ticket_medio"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "cpk"
                          ? `R$ ${Number(value).toFixed(3)} / Km`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : metricMode === "cpk"
                          ? "Custo por Km"
                          : metricMode === "ticket_medio"
                          ? "Ticket Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items && items[0] ? (items[0].payload as any) : null;
                        return item?.fullName ? `${item.fullName}` : `${granularityName}: ${label}`;
                      }}
                    />
                    <Bar dataKey="displayVal" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temporal Evolution Detailed Table */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">
                  Tabela Detalhada de Evolução ({granularity})
                </h3>
                <p className="text-xs text-zinc-500">
                  Valores consolidados por {granularityName.toLowerCase()} com taxa de crescimento, consumo e médias.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                <span>Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold focus:outline-none cursor-pointer hover:bg-zinc-200/60"
                >
                  <option value="chrono">Cronológica (Mais antigo ao mais recente)</option>
                  <option value="valor_desc">Maior Custo Primeiro</option>
                  <option value="volume_desc">Maior Volume (Litros)</option>
                  <option value="variation_desc">Maior Crescimento %</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                    <th className="p-3">{granularityName} / Período</th>
                    <th className="p-3 text-center">Lançamentos</th>
                    <th className="p-3 text-center">Consumo (Litros)</th>
                    <th className="p-3 text-center">Preço Médio (R$/L)</th>
                    <th className="p-3 text-center">CPK (R$/Km)</th>
                    <th className="p-3 text-right">Custo Total (R$)</th>
                    <th className="p-3 text-center">Participação (%)</th>
                    <th className="p-3 text-right">Variação vs Anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {sortedTableData.map((m) => (
                    <tr key={m.key} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3 font-bold text-zinc-900">
                        {m.label}{" "}
                        <span className="text-[11px] text-zinc-400 font-normal">({m.fullName})</span>
                      </td>
                      <td className="p-3 text-center text-zinc-700 font-semibold">{m.count}</td>
                      <td className="p-3 text-center text-amber-900 font-bold">
                        {m.totalLiters > 0
                          ? `${m.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`
                          : "-"}
                      </td>
                      <td className="p-3 text-center text-emerald-800 font-bold">
                        {m.precoMedioLitro > 0 ? `R$ ${m.precoMedioLitro.toFixed(3)}` : "-"}
                      </td>
                      <td className="p-3 text-center text-cyan-800 font-bold">
                        {m.cpk > 0 ? `R$ ${m.cpk.toFixed(3)}` : "-"}
                      </td>
                      <td className="p-3 text-right font-black text-purple-700">{formatCurrency(m.totalValor)}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 font-bold text-zinc-700 text-[11px]">
                          {m.sharePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            m.variationPct > 0
                              ? "bg-rose-100 text-rose-800"
                              : m.variationPct < 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {m.variationPct > 0 ? `+${m.variationPct.toFixed(1)}%` : `${m.variationPct.toFixed(1)}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 border-t-2 border-zinc-300 font-black text-zinc-900">
                    <td className="p-3 uppercase text-[10px] tracking-wider">Total Consolidado:</td>
                    <td className="p-3 text-center font-bold">{totalLancamentosPeriodo}</td>
                    <td className="p-3 text-center text-amber-950 font-bold">
                      {totalLitrosPeriodo > 0
                        ? `${totalLitrosPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L`
                        : "-"}
                    </td>
                    <td className="p-3 text-center text-emerald-950 font-bold">
                      {totalLitrosPeriodo > 0 ? `R$ ${(totalGeralPeriodo / totalLitrosPeriodo).toFixed(3)}` : "-"}
                    </td>
                    <td className="p-3 text-center text-cyan-950 font-bold">
                      {totalKmPeriodo > 0 ? `R$ ${(totalGeralPeriodo / totalKmPeriodo).toFixed(3)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-black text-purple-900 text-sm">
                      {formatCurrency(totalGeralPeriodo)}
                    </td>
                    <td className="p-3 text-center">100%</td>
                    <td className="p-3 text-right text-zinc-500 font-normal text-[11px]">
                      Média: {formatCurrency(mediaPeriodo)}/{granularityName.toLowerCase()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
