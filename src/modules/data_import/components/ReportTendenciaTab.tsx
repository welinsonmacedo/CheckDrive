import React, { useState, useMemo } from "react";
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
import { parseRecordMonthYear, MONTH_NAMES_PT } from "../utils/dateUtils";
import { getRecordFinancialValue, formatCurrency } from "../utils/vehicleStatsUtils";

interface Props {
  records: ImportRecord[];
  tipoImportacaoFilter: string;
  categoryFilter: string;
  placaFilter: string;
  fornecedorFilter: string;
  onResetFilters?: () => void;
}

export default function ReportTendenciaTab({
  records,
  tipoImportacaoFilter,
  categoryFilter,
  placaFilter,
  fornecedorFilter,
  onResetFilters,
}: Props) {
  // Local trend controls
  const [trendTimeframe, setTrendTimeframe] = useState<string>("all"); // "all", "12m", "6m", "year_2026", etc.
  const [metricMode, setMetricMode] = useState<"valor" | "litros" | "preco_medio" | "lancamentos">("valor");
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [sortBy, setSortBy] = useState<"chrono" | "valor_desc" | "variation_desc">("chrono");

  // Available years from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    records.forEach((r) => {
      const parsed = parseRecordMonthYear(r.data || (r as any).criado_em || (r as any).created_at);
      if (parsed) yearsSet.add(parsed.year);
    });
    const curr = String(new Date().getFullYear());
    yearsSet.add(curr);
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [records]);

  // Filter records considering non-period filters (category, type, placa, supplier)
  const baseFilteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (categoryFilter !== "Todas" && r.tipo_registro !== categoryFilter) return false;
      if (tipoImportacaoFilter !== "Todas") {
        const isGFV = r.conta?.toLowerCase().includes("gfv") ||
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

  // Aggregate monthly data
  const monthlyData = useMemo(() => {
    const map: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        monthName: string;
        year: number;
        monthNum: number;
        totalValor: number;
        totalLiters: number;
        totalKm: number;
        count: number;
        categories: Record<string, number>;
      }
    > = {};

    baseFilteredRecords.forEach((r) => {
      const parsed = parseRecordMonthYear(r.data || (r as any).criado_em || (r as any).created_at);
      if (!parsed) return;

      const key = `${parsed.year}-${parsed.month}`;
      const label = `${parsed.month}/${parsed.year}`;
      const mName = MONTH_NAMES_PT[parsed.month] || parsed.month;
      const yNum = Number(parsed.year);
      const mNum = Number(parsed.month);

      if (!map[key]) {
        map[key] = {
          monthKey: key,
          monthLabel: label,
          monthName: mName,
          year: yNum,
          monthNum: mNum,
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
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });

    // Apply Timeframe filter
    if (trendTimeframe === "12m") {
      list = list.slice(-12);
    } else if (trendTimeframe === "6m") {
      list = list.slice(-6);
    } else if (trendTimeframe.startsWith("year_")) {
      const targetYear = Number(trendTimeframe.replace("year_", ""));
      list = list.filter((m) => m.year === targetYear);
    }

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
      const cpkMensal = item.totalKm > 0 ? item.totalValor / item.totalKm : 0;
      const sharePct = totalPeriodCost > 0 ? (item.totalValor / totalPeriodCost) * 100 : 0;

      return {
        ...item,
        variationPct,
        variationVal,
        precoMedioLitro,
        cpkMensal,
        sharePct,
      };
    });
  }, [baseFilteredRecords, tipoImportacaoFilter, trendTimeframe]);

  // Overall KPIs
  const totalGeralPeriodo = useMemo(
    () => monthlyData.reduce((acc, m) => acc + m.totalValor, 0),
    [monthlyData]
  );
  const totalLitrosPeriodo = useMemo(
    () => monthlyData.reduce((acc, m) => acc + m.totalLiters, 0),
    [monthlyData]
  );
  const totalLancamentosPeriodo = useMemo(
    () => monthlyData.reduce((acc, m) => acc + m.count, 0),
    [monthlyData]
  );
  const mediaMensal = useMemo(
    () => (monthlyData.length > 0 ? totalGeralPeriodo / monthlyData.length : 0),
    [totalGeralPeriodo, monthlyData]
  );

  const highestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.totalValor - a.totalValor)[0];
  }, [monthlyData]);

  const lowestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => a.totalValor - b.totalValor)[0];
  }, [monthlyData]);

  const lastMonth = monthlyData[monthlyData.length - 1] || null;

  // Sorted list for table
  const sortedTableData = useMemo(() => {
    const list = [...monthlyData];
    if (sortBy === "valor_desc") {
      list.sort((a, b) => b.totalValor - a.totalValor);
    } else if (sortBy === "variation_desc") {
      list.sort((a, b) => b.variationPct - a.variationPct);
    }
    return list;
  }, [monthlyData, sortBy]);

  // Determine chart values based on metricMode
  const chartData = useMemo(() => {
    return monthlyData.map((m) => ({
      name: m.monthLabel,
      valor: m.totalValor,
      litros: m.totalLiters,
      preco_medio: Number(m.precoMedioLitro.toFixed(3)),
      lancamentos: m.count,
      displayVal:
        metricMode === "valor"
          ? m.totalValor
          : metricMode === "litros"
          ? m.totalLiters
          : metricMode === "preco_medio"
          ? m.precoMedioLitro
          : m.count,
    }));
  }, [monthlyData, metricMode]);

  return (
    <div className="space-y-6">
      {/* Top Trend Controls Bar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-zinc-900 text-base">
                Análise de Tendência & Evolução Temporal
              </h3>
              <p className="text-xs text-zinc-500">
                Acompanhe a curva de crescimento de custos, litragens e médias mês a mês.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTrendTimeframe("all")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "all"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todo Histórico
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("12m")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "12m"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 12m
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe("6m")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  trendTimeframe === "6m"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Últimos 6m
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setTrendTimeframe(`year_${yr}`)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    trendTimeframe === `year_${yr}`
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Filters / Metrics & Chart Switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Metric Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-600">Visualizar Métrica:</span>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 text-xs font-bold">
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
                onClick={() => setMetricMode("lancamentos")}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "lancamentos"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Qtd Lançamentos
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
                title="Gráfico de Área"
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

      {monthlyData.length === 0 ? (
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
                <span className="text-xs font-extrabold uppercase tracking-wider">Mês de Maior Custo</span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-lg font-black text-zinc-900">
                {highestMonth ? highestMonth.monthLabel : "-"}
              </p>
              <p className="text-xs font-bold text-rose-600 mt-0.5">
                {highestMonth ? formatCurrency(highestMonth.totalValor) : "R$ 0,00"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {highestMonth ? `${highestMonth.count} lançamentos • ${highestMonth.sharePct.toFixed(1)}% do período` : ""}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Mês Mais Econômico</span>
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-zinc-900">
                {lowestMonth ? lowestMonth.monthLabel : "-"}
              </p>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                {lowestMonth ? formatCurrency(lowestMonth.totalValor) : "R$ 0,00"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {lowestMonth ? `${lowestMonth.count} lançamentos • ${lowestMonth.sharePct.toFixed(1)}% do período` : ""}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Média Mensal</span>
                <Calculator className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-lg font-black text-blue-900">{formatCurrency(mediaMensal)}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Calculada em {monthlyData.length} mês(es) analisados
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Variação Último Mês</span>
                {lastMonth && lastMonth.variationPct >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-rose-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p
                className={`text-lg font-black ${
                  lastMonth && lastMonth.variationPct >= 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {lastMonth
                  ? `${lastMonth.variationPct >= 0 ? "+" : ""}${lastMonth.variationPct.toFixed(1)}%`
                  : "0.0%"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {lastMonth && lastMonth.variationVal !== 0
                  ? `${lastMonth.variationVal >= 0 ? "+" : ""}${formatCurrency(lastMonth.variationVal)} vs mês anterior`
                  : "Comparado ao mês anterior"}
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
                  {metricMode === "lancamentos" && "Evolução da Quantidade de Lançamentos"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Visualização contínua mês a mês no período ({monthlyData.length} meses)
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor"
                          ? `R$ ${(val / 1000).toFixed(0)}k`
                          : metricMode === "preco_medio"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="displayVal"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTrend)"
                    />
                  </AreaChart>
                ) : chartType === "line" ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor"
                          ? `R$ ${(val / 1000).toFixed(0)}k`
                          : metricMode === "preco_medio"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayVal"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#7c3aed" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) =>
                        metricMode === "valor"
                          ? `R$ ${(val / 1000).toFixed(0)}k`
                          : metricMode === "preco_medio"
                          ? `R$ ${val.toFixed(2)}`
                          : val.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        metricMode === "valor"
                          ? formatCurrency(Number(value))
                          : metricMode === "preco_medio"
                          ? `R$ ${Number(value).toFixed(3)} / L`
                          : metricMode === "litros"
                          ? `${Number(value).toLocaleString("pt-BR")} L`
                          : `${Number(value)} registros`,
                        metricMode === "valor"
                          ? "Custo Total"
                          : metricMode === "litros"
                          ? "Volume"
                          : metricMode === "preco_medio"
                          ? "Preço Médio"
                          : "Lançamentos",
                      ]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Bar dataKey="displayVal" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Evolution Detailed Table */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">Tabela de Evolução Mensal</h3>
                <p className="text-xs text-zinc-500">
                  Valores consolidados mês a mês com taxa de crescimento e preço médio.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                <span>Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="chrono">Cronológica (Mês a Mês)</option>
                  <option value="valor_desc">Maior Custo Primeiro</option>
                  <option value="variation_desc">Maior Crescimento %</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                    <th className="p-3">Mês / Ano</th>
                    <th className="p-3 text-center">Lançamentos</th>
                    <th className="p-3 text-center">Consumo (Litros)</th>
                    <th className="p-3 text-center">Preço Médio (R$/L)</th>
                    <th className="p-3 text-right">Custo Total (R$)</th>
                    <th className="p-3 text-center">Participação (%)</th>
                    <th className="p-3 text-right">Variação vs Mês Anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {sortedTableData.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3 font-bold text-zinc-900">
                        {m.monthLabel} <span className="text-[11px] text-zinc-400 font-normal">({m.monthName})</span>
                      </td>
                      <td className="p-3 text-center text-zinc-700 font-semibold">{m.count}</td>
                      <td className="p-3 text-center text-amber-900 font-bold">
                        {m.totalLiters > 0
                          ? `${m.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L`
                          : "-"}
                      </td>
                      <td className="p-3 text-center text-emerald-800 font-bold">
                        {m.precoMedioLitro > 0 ? `R$ ${m.precoMedioLitro.toFixed(3)}` : "-"}
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
                    <td className="p-3 uppercase text-[10px] tracking-wider">Total do Período:</td>
                    <td className="p-3 text-center font-bold">{totalLancamentosPeriodo}</td>
                    <td className="p-3 text-center text-amber-950 font-bold">
                      {totalLitrosPeriodo > 0
                        ? `${totalLitrosPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L`
                        : "-"}
                    </td>
                    <td className="p-3 text-center text-emerald-950 font-bold">
                      {totalLitrosPeriodo > 0 ? `R$ ${(totalGeralPeriodo / totalLitrosPeriodo).toFixed(3)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-black text-purple-900 text-sm">
                      {formatCurrency(totalGeralPeriodo)}
                    </td>
                    <td className="p-3 text-center">100%</td>
                    <td className="p-3 text-right text-zinc-500 font-normal text-[11px]">
                      Média: {formatCurrency(mediaMensal)}/mês
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
