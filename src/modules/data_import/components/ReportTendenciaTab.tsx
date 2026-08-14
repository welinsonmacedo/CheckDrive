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
  Building2,
  CheckCircle2,
  Search,
  Eye,
  Check,
  X,
  Award,
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
  LabelList,
} from "recharts";
import { ImportRecord } from "../types";
import {
  parseRecordFullDate,
  ParsedRecordDate,
  getRecordDateString,
  MONTH_NAMES_PT,
  MONTH_SHORT_PT,
  generateYearMonths,
  generateMonthDays,
  generateMonthQuinzena,
} from "../utils/dateUtils";
import { getRecordFinancialValue, formatCurrency, getRecordImportType, isFuelRecord } from "../utils/vehicleStatsUtils";
import { AccountMapping } from "../services/accountMappingService";

interface Props {
  records: ImportRecord[];
  tipoImportacaoFilter: string;
  categoryFilter: string;
  placaFilter: string;
  fornecedorFilter: string;
  onResetFilters?: () => void;
  accountMappings?: AccountMapping[];
}

export type GranularityMode = "mensal" | "semanal" | "quinzenal" | "diario";

const POSTO_COLORS = [
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#84cc16", // Lime
];

export default function ReportTendenciaTab({
  records,
  tipoImportacaoFilter,
  categoryFilter,
  placaFilter,
  fornecedorFilter,
  onResetFilters,
  accountMappings = [],
}: Props) {
  // Granularity selector
  const [granularity, setGranularity] = useState<GranularityMode>("mensal");
  const [hasUserChangedGranularity, setHasUserChangedGranularity] = useState<boolean>(false);

  // Timeframe & metric controls
  const [trendTimeframe, setTrendTimeframe] = useState<string>("all"); // "all", "12m", "6m", "3m", "30d", "year_2026", "month_2026-07"
  const [metricMode, setMetricMode] = useState<"valor" | "litros" | "preco_medio" | "cpk" | "lancamentos" | "ticket_medio">("valor");
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [sortBy, setSortBy] = useState<"chrono" | "valor_desc" | "variation_desc" | "volume_desc">("chrono");

  // Posto-specific controls for "preco_medio" mode
  const [selectedPostoViewMode, setSelectedPostoViewMode] = useState<"all_multi" | "media_only" | string>("all_multi");
  const [visiblePostoKeys, setVisiblePostoKeys] = useState<Set<string>>(new Set());
  const [postoSearchQuery, setPostoSearchQuery] = useState<string>("");
  const [postoSortBy, setPostoSortBy] = useState<"volume" | "preco_asc" | "preco_desc" | "valor" | "lancamentos" | "ticket_medio">("volume");

  // Sync sorting with the selected metric
  useEffect(() => {
    if (metricMode === "valor") setPostoSortBy("valor");
    else if (metricMode === "litros") setPostoSortBy("volume");
    else if (metricMode === "preco_medio") setPostoSortBy("preco_asc");
    else if (metricMode === "lancamentos") setPostoSortBy("lancamentos");
    else if (metricMode === "ticket_medio") setPostoSortBy("ticket_medio");
  }, [metricMode]);

  // Available distinct months & years from records
  const { availableYears, availableMonths, distinctMonthCount } = useMemo(() => {
    const yearsSet = new Set<string>();
    const monthsMap = new Map<string, { yearMonth: string; label: string; name: string }>();

    records.forEach((r) => {
      const rawDate = getRecordDateString(r);
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

  // Handler when user selects granularity
  const handleGranularityChange = (newGranularity: GranularityMode) => {
    setGranularity(newGranularity);
    setHasUserChangedGranularity(true);
    // If user clicked "mensal" (Mês a Mês) and timeframe was locked to a single month, expand timeframe to "all" (or the year)
    if (newGranularity === "mensal" && trendTimeframe.startsWith("month_")) {
      const year = trendTimeframe.replace("month_", "").split("-")[0];
      if (availableYears.includes(year)) {
        setTrendTimeframe(`year_${year}`);
      } else {
        setTrendTimeframe("all");
      }
    }
  };

  // Handler when user selects timeframe filter
  const handleTimeframeChange = (newTimeframe: string) => {
    setTrendTimeframe(newTimeframe);
    // If user selected a specific month, switch granularity to "diario" if it was "mensal" so daily curve is shown
    if (newTimeframe.startsWith("month_") && granularity === "mensal") {
      setGranularity("diario");
      setHasUserChangedGranularity(true);
    }
  };

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
        const imp = getRecordImportType(r);
        if (tipoImportacaoFilter === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (tipoImportacaoFilter === "receitas_despesas" && imp !== "receitas_despesas") return false;
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
      const rawDate = getRecordDateString(r);
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

  // Summary of all gas stations / suppliers in the filtered period
  const allPostosSummary = useMemo(() => {
    const postosMap: Record<
      string,
      {
        name: string;
        totalValor: number;
        totalLiters: number;
        count: number;
        minPreco: number;
        maxPreco: number;
      }
    > = {};

    timeframeFilteredRecords.forEach((r) => {
      const isFuel = isFuelRecord(r, accountMappings);
      if (!isFuel) return;

      const liters = Number(r.quantidade) || 0;
      const val = getRecordFinancialValue(r, tipoImportacaoFilter === "combustivel_gfv");
      if (liters <= 0 || val <= 0) return;

      const pName = (r.fornecedor || "").trim() || "Posto Não Identificado";
      const unitPrice = val / liters;

      if (!postosMap[pName]) {
        postosMap[pName] = {
          name: pName,
          totalValor: 0,
          totalLiters: 0,
          count: 0,
          minPreco: unitPrice,
          maxPreco: unitPrice,
        };
      }

      postosMap[pName].totalValor += val;
      postosMap[pName].totalLiters += liters;
      postosMap[pName].count += 1;
      if (unitPrice < postosMap[pName].minPreco) postosMap[pName].minPreco = unitPrice;
      if (unitPrice > postosMap[pName].maxPreco) postosMap[pName].maxPreco = unitPrice;
    });

    const totalLitrosFrota = Object.values(postosMap).reduce((acc, p) => acc + p.totalLiters, 0);
    const totalGastoFrota = Object.values(postosMap).reduce((acc, p) => acc + p.totalValor, 0);
    const mediaGeralFrota = totalLitrosFrota > 0 ? totalGastoFrota / totalLitrosFrota : 0;

    return Object.values(postosMap)
      .map((p, idx) => {
        const precoMedio = p.totalLiters > 0 ? p.totalValor / p.totalLiters : 0;
        const diffVsMedia = mediaGeralFrota > 0 ? ((precoMedio - mediaGeralFrota) / mediaGeralFrota) * 100 : 0;
        const sharePct = totalLitrosFrota > 0 ? (p.totalLiters / totalLitrosFrota) * 100 : 0;
        const key = `posto_${idx}`;
        const color = POSTO_COLORS[idx % POSTO_COLORS.length];

        return {
          ...p,
          key,
          color,
          precoMedio,
          diffVsMedia,
          sharePct,
        };
      })
      .sort((a, b) => b.totalLiters - a.totalLiters);
  }, [timeframeFilteredRecords, tipoImportacaoFilter]);

  // Top Postos for multi-line chart (top 6 by volume)
  const topPostos = useMemo(() => {
    return allPostosSummary.slice(0, 6);
  }, [allPostosSummary]);

  // Sync visible posto keys when top postos change
  useEffect(() => {
    if (topPostos.length > 0) {
      setVisiblePostoKeys(new Set(topPostos.map((p) => p.key)));
    }
  }, [topPostos]);

  // Toggle single posto visibility in chart
  const togglePostoVisibility = (postoKey: string) => {
    setVisiblePostoKeys((prev) => {
      const next = new Set(prev);
      if (next.has(postoKey)) {
        next.delete(postoKey);
      } else {
        next.add(postoKey);
      }
      return next;
    });
  };

  // Select all or isolate single posto
  const handleSelectAllPostos = () => {
    setSelectedPostoViewMode("all_multi");
    setVisiblePostoKeys(new Set(topPostos.map((p) => p.key)));
  };

  const handleSelectOnlyMedia = () => {
    setSelectedPostoViewMode("media_only");
    setVisiblePostoKeys(new Set());
  };

  const handleIsolatePosto = (postoKey: string) => {
    setSelectedPostoViewMode(postoKey);
    setVisiblePostoKeys(new Set([postoKey]));
  };

  // Filtered and sorted postos for table view
  const filteredPostosTable = useMemo(() => {
    let list = [...allPostosSummary];
    if (postoSearchQuery.trim()) {
      const q = postoSearchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (postoSortBy === "volume") {
      list.sort((a, b) => b.totalLiters - a.totalLiters);
    } else if (postoSortBy === "preco_asc") {
      list.sort((a, b) => a.precoMedio - b.precoMedio);
    } else if (postoSortBy === "preco_desc") {
      list.sort((a, b) => b.precoMedio - a.precoMedio);
    } else if (postoSortBy === "valor") {
      list.sort((a, b) => b.totalValor - a.totalValor);
    } else if (postoSortBy === "lancamentos") {
      list.sort((a, b) => b.count - a.count);
    } else if (postoSortBy === "ticket_medio") {
      list.sort((a, b) => (b.count > 0 ? b.totalValor / b.count : 0) - (a.count > 0 ? a.totalValor / a.count : 0));
    }
    return list;
  }, [allPostosSummary, postoSearchQuery, postoSortBy]);

  // Cheaper and most expensive postos (with at least 20L to avoid outlier micro-abastecimentos)
  const postoMaisBarato = useMemo(() => {
    const candidates = allPostosSummary.filter((p) => p.totalLiters >= 20);
    if (candidates.length === 0) return allPostosSummary[0] || null;
    return [...candidates].sort((a, b) => a.precoMedio - b.precoMedio)[0];
  }, [allPostosSummary]);

  const postoMaisCaro = useMemo(() => {
    const candidates = allPostosSummary.filter((p) => p.totalLiters >= 20);
    if (candidates.length === 0) return allPostosSummary[allPostosSummary.length - 1] || null;
    return [...candidates].sort((a, b) => b.precoMedio - a.precoMedio)[0];
  }, [allPostosSummary]);

  const postoMaiorVolume = useMemo(() => {
    return allPostosSummary[0] || null;
  }, [allPostosSummary]);

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
      postos: Record<string, { totalValor: number; totalLiters: number; count: number }>;
    }

    const map: Record<string, TrendBucket> = {};

    // 1. Pre-populate timeline slots so charts render continuous full series (never a single lonely point)
    if (granularity === "mensal") {
      let yearsToPopulate: string[] = [];
      if (trendTimeframe.startsWith("year_")) {
        yearsToPopulate = [trendTimeframe.replace("year_", "")];
      } else if (trendTimeframe.startsWith("month_")) {
        const ym = trendTimeframe.replace("month_", "");
        yearsToPopulate = [ym.split("-")[0]];
      } else if (availableYears.length > 0) {
        yearsToPopulate = [...availableYears];
      } else {
        yearsToPopulate = [String(new Date().getFullYear())];
      }

      yearsToPopulate.forEach((year) => {
        const monthSlots = generateYearMonths(year);
        monthSlots.forEach((slot) => {
          map[slot.key] = {
            key: slot.key,
            label: slot.label,
            fullName: slot.fullName,
            sortKey: slot.sortKey,
            totalValor: 0,
            totalLiters: 0,
            totalKm: 0,
            count: 0,
            categories: {},
            postos: {},
          };
        });
      });
    } else if (granularity === "diario") {
      let targetYearMonth = "";
      if (trendTimeframe.startsWith("month_")) {
        targetYearMonth = trendTimeframe.replace("month_", "");
      } else if (availableMonths.length > 0) {
        targetYearMonth = availableMonths[0].yearMonth;
      } else {
        const now = new Date();
        targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      }

      const [y, m] = targetYearMonth.split("-");
      const daySlots = generateMonthDays(y, m);
      daySlots.forEach((slot) => {
        map[slot.key] = {
          key: slot.key,
          label: slot.label,
          fullName: slot.fullName,
          sortKey: slot.sortKey,
          totalValor: 0,
          totalLiters: 0,
          totalKm: 0,
          count: 0,
          categories: {},
          postos: {},
        };
      });
    } else if (granularity === "quinzenal") {
      let yearsToPopulate = availableYears.length > 0 ? availableYears : [String(new Date().getFullYear())];
      if (trendTimeframe.startsWith("year_")) {
        yearsToPopulate = [trendTimeframe.replace("year_", "")];
      }
      yearsToPopulate.forEach((year) => {
        for (let m = 1; m <= 12; m++) {
          const monthStr = String(m).padStart(2, "0");
          const qSlots = generateMonthQuinzena(year, monthStr);
          qSlots.forEach((slot) => {
            map[slot.key] = {
              key: slot.key,
              label: slot.label,
              fullName: slot.fullName,
              sortKey: slot.sortKey,
              totalValor: 0,
              totalLiters: 0,
              totalKm: 0,
              count: 0,
              categories: {},
              postos: {},
            };
          });
        }
      });
    }

    // 2. Accumulate records into the corresponding bucket
    timeframeFilteredRecords.forEach((r) => {
      const rawDate = getRecordDateString(r);
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
          postos: {},
        };
      }

      const impType = getRecordImportType(r);
      const val = getRecordFinancialValue(r, tipoImportacaoFilter === "combustivel_gfv");
      const liters = Number(r.quantidade) || 0;
      
      let km = 0;
      if (typeof r.km_rodado === "number" && !isNaN(r.km_rodado) && r.km_rodado > 0) {
        km = r.km_rodado;
      } else if (r.quantidade && r.media_km_l && r.quantidade > 0 && r.media_km_l > 0) {
        km = r.quantidade * r.media_km_l;
      } else if (r.observacoes) {
        const obsKmMatch = r.observacoes.match(/Km\s+Rodados?:\s*([\d\.\,]+)/i);
        if (obsKmMatch) {
          km = parseFloat(obsKmMatch[1].replace(/\./g, "").replace(",", "."));
        }
      }

      const cat = r.tipo_registro || "Outros";

      map[key].totalValor += val;
      map[key].totalLiters += liters;
      map[key].totalKm += km;
      map[key].count += 1;
      if (impType !== "combustivel_gfv") {
        map[key].categories[cat] = (map[key].categories[cat] || 0) + val;
      }

      // Track postos per bucket
      const isFuel = isFuelRecord(r, accountMappings);
      if (isFuel && liters > 0 && val > 0) {
        const postoName = (r.fornecedor || "").trim() || "Posto Não Identificado";
        if (!map[key].postos[postoName]) {
          map[key].postos[postoName] = { totalValor: 0, totalLiters: 0, count: 0 };
        }
        map[key].postos[postoName].totalValor += val;
        map[key].postos[postoName].totalLiters += liters;
        map[key].postos[postoName].count += 1;
      }
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
  }, [timeframeFilteredRecords, granularity, tipoImportacaoFilter, availableYears, availableMonths, trendTimeframe]);

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
  const activePeriodsWithData = useMemo(
    () => trendData.filter((m) => m.totalValor > 0),
    [trendData]
  );
  const mediaPeriodo = useMemo(
    () => (activePeriodsWithData.length > 0 ? totalGeralPeriodo / activePeriodsWithData.length : totalGeralPeriodo),
    [totalGeralPeriodo, activePeriodsWithData]
  );

  const highestPeriod = useMemo(() => {
    if (activePeriodsWithData.length === 0) return trendData[0] || null;
    return [...activePeriodsWithData].sort((a, b) => b.totalValor - a.totalValor)[0];
  }, [activePeriodsWithData, trendData]);

  const lowestPeriod = useMemo(() => {
    if (activePeriodsWithData.length === 0) return trendData[0] || null;
    return [...activePeriodsWithData].sort((a, b) => a.totalValor - b.totalValor)[0];
  }, [activePeriodsWithData, trendData]);

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

  // Determine chart values based on metricMode and postos
  const chartData = useMemo(() => {
    return trendData.map((m) => {
      const item: any = {
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
        postosDetails: Object.entries(m.postos)
          .map(([pName, pData]) => ({
            name: pName,
            precoMedio: pData.totalLiters > 0 ? pData.totalValor / pData.totalLiters : 0,
            litros: pData.totalLiters,
            valor: pData.totalValor,
            count: pData.count,
          }))
          .sort((a, b) => b.litros - a.litros),
      };

      // Add each posto price key for line charts
      allPostosSummary.forEach((p) => {
        const pBucket = m.postos[p.name];
        if (pBucket && pBucket.totalLiters > 0) {
          item[p.key] = Number((pBucket.totalValor / pBucket.totalLiters).toFixed(3));
        } else {
          item[p.key] = null;
        }
      });

      return item;
    });
  }, [trendData, metricMode, allPostosSummary]);

  const granularityName =
    granularity === "diario"
      ? "Dia"
      : granularity === "semanal"
      ? "Semana"
      : granularity === "quinzenal"
      ? "Quinzena"
      : "Mês";

  const formatYAxisValue = (val: number, mode: string) => {
    if (mode === "valor" || mode === "ticket_medio") {
      return val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val.toFixed(0)}`;
    }
    if (mode === "preco_medio" || mode === "cpk") {
      return `R$ ${val.toFixed(2)}`;
    }
    return val.toLocaleString("pt-BR");
  };

  const formatTooltipValue = (value: any, mode: string): [string, string] => {
    const num = Number(value) || 0;
    if (mode === "valor") return [formatCurrency(num), "Custo Total"];
    if (mode === "ticket_medio") return [formatCurrency(num), "Ticket Médio"];
    if (mode === "preco_medio") return [`R$ ${num.toFixed(3)} / L`, "Preço Médio"];
    if (mode === "cpk") return [`R$ ${num.toFixed(3)} / Km`, "Custo por Km"];
    if (mode === "litros") return [`${num.toLocaleString("pt-BR")} L`, "Volume"];
    return [`${num} registros`, "Lançamentos"];
  };

  const formatLabelListValue = (val: any, mode: string) => {
    const num = Number(val) || 0;
    if (mode === "valor" || mode === "ticket_medio") {
      return num >= 1000 ? `R$ ${(num / 1000).toFixed(1)}k` : `R$ ${num.toFixed(0)}`;
    }
    if (mode === "preco_medio" || mode === "cpk") {
      return `R$ ${num.toFixed(2)}`;
    }
    if (mode === "litros") {
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k L` : `${num} L`;
    }
    return `${val}`;
  };

  return (
    <div className="space-y-6">
      {/* Single Month Smart Hint Banner when in Diario/Semanal */}
      {distinctMonthCount === 1 && granularity !== "mensal" && (
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

      {/* Single Month Alert when Granularity is Mensal */}
      {granularity === "mensal" && trendData.length === 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs no-print">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Visualização Mensal Selecionada: {trendData[0]?.fullName || "Mês"}
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Há apenas 1 mês no período filtrado (Total: {formatCurrency(trendData[0]?.totalValor || 0)}). Para ver o gráfico e a evolução detalhada dia a dia deste mês, selecione a visualização <strong>Dia a Dia</strong> ou <strong>Semanal</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleGranularityChange("diario")}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Ver Dia a Dia ({trendData[0]?.fullName})
            </button>
            {trendTimeframe !== "all" && (
              <button
                onClick={() => handleTimeframeChange("all")}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Ver Todos os Meses
              </button>
            )}
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
              onClick={() => handleGranularityChange("mensal")}
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
              onClick={() => handleGranularityChange("quinzenal")}
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
              onClick={() => handleGranularityChange("semanal")}
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
              onClick={() => handleGranularityChange("diario")}
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
                onClick={() => handleTimeframeChange("all")}
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
                onClick={() => handleTimeframeChange("12m")}
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
                onClick={() => handleTimeframeChange("6m")}
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
                onClick={() => handleTimeframeChange("3m")}
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
                onClick={() => handleTimeframeChange("30d")}
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
              onChange={(e) => handleTimeframeChange(e.target.value)}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  {metricMode === "preco_medio" && allPostosSummary.length > 0 && (
                    <span className="ml-1 text-emerald-700 font-semibold">
                      • {allPostosSummary.length} posto(s) identificado(s)
                    </span>
                  )}
                </p>
              </div>

              {/* Posto quick controls when in preco_medio mode */}
              {metricMode === "preco_medio" && allPostosSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={handleSelectAllPostos}
                    className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                      selectedPostoViewMode === "all_multi"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200/70"
                    }`}
                  >
                    ★ Média + Top Postos
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyMedia}
                    className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                      selectedPostoViewMode === "media_only"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200/70"
                    }`}
                  >
                    Apenas Média Geral
                  </button>
                  {allPostosSummary.length > 0 && (
                    <select
                      value={selectedPostoViewMode.startsWith("posto_") ? selectedPostoViewMode : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleIsolatePosto(e.target.value);
                        } else {
                          handleSelectAllPostos();
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold focus:outline-none cursor-pointer hover:bg-zinc-200/60 max-w-[180px] truncate"
                    >
                      <option value="">Focar em um Posto...</option>
                      {allPostosSummary.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name} (R$ {p.precoMedio.toFixed(2)}/L)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Postos Interactive Multi-line Legend / Toggles when in Preço Médio mode */}
            {metricMode === "preco_medio" && topPostos.length > 0 && (
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" /> Postos e Linhas no Gráfico:
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Clique no posto para exibir ou ocultar sua linha comparativa
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Média Geral Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 shrink-0" />
                    <span>Média Geral da Frota</span>
                  </div>

                  {/* Top Postos Toggles */}
                  {topPostos.map((p) => {
                    const isVisible = visiblePostoKeys.has(p.key) && selectedPostoViewMode !== "media_only";
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => togglePostoVisibility(p.key)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isVisible
                            ? "bg-white text-zinc-900 border-zinc-300 shadow-xs ring-1 ring-zinc-200"
                            : "bg-zinc-100/80 text-zinc-400 border-dashed border-zinc-200 line-through opacity-60 hover:opacity-100"
                        }`}
                        title={`Clique para ${isVisible ? "ocultar" : "exibir"} ${p.name}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="max-w-[150px] truncate">{p.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          (R$ {p.precoMedio.toFixed(2)})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" && metricMode !== "preco_medio" ? (
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
                      tickFormatter={(val) => formatYAxisValue(val, metricMode)}
                    />
                    <Tooltip
                      formatter={(value: any) => formatTooltipValue(value, metricMode)}
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
                      dot={chartData.length <= 31 ? { r: 4, fill: "#8b5cf6" } : false}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="displayVal"
                        position="top"
                        formatter={(val: any) => formatLabelListValue(val, metricMode)}
                        style={{ fill: "#4c1d95", fontSize: 10, fontWeight: 800 }}
                      />
                    </Area>
                  </AreaChart>
                ) : chartType === "line" || metricMode === "preco_medio" ? (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
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
                      domain={metricMode === "preco_medio" ? ["auto", "auto"] : [0, "auto"]}
                      tickFormatter={(val) => formatYAxisValue(val, metricMode)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const dataPoint = payload[0].payload;

                        if (metricMode === "preco_medio") {
                          return (
                            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xl space-y-3 min-w-[260px] max-w-sm text-xs">
                              <div className="border-b border-zinc-100 pb-2">
                                <p className="font-extrabold text-zinc-900 text-sm">
                                  {dataPoint.fullName || label}
                                </p>
                                <div className="flex items-center justify-between mt-1 text-zinc-600 font-semibold">
                                  <span>Média Geral da Frota:</span>
                                  <span className="text-blue-700 font-extrabold text-sm">
                                    {dataPoint.preco_medio > 0
                                      ? `R$ ${dataPoint.preco_medio.toFixed(3)} / L`
                                      : "Sem abastecimento"}
                                  </span>
                                </div>
                                {dataPoint.litros > 0 && (
                                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                    <span>Volume Total no Ponto:</span>
                                    <span>
                                      {dataPoint.litros.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L (
                                      {formatCurrency(dataPoint.valor)})
                                    </span>
                                  </div>
                                )}
                              </div>

                              {dataPoint.postosDetails && dataPoint.postosDetails.length > 0 ? (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                                    Postos que abasteceram ({dataPoint.postosDetails.length}):
                                  </p>
                                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {dataPoint.postosDetails.map((pDetail: any) => {
                                      const matchingPosto = allPostosSummary.find(
                                        (p) => p.name === pDetail.name
                                      );
                                      const pColor = matchingPosto ? matchingPosto.color : "#64748b";
                                      return (
                                        <div
                                          key={pDetail.name}
                                          className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-2"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full shrink-0"
                                              style={{ backgroundColor: pColor }}
                                            />
                                            <span className="font-bold text-zinc-800 truncate text-[11px]">
                                              {pDetail.name}
                                            </span>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="font-extrabold text-emerald-800 text-[11px]">
                                              R$ {pDetail.precoMedio.toFixed(3)}/L
                                            </div>
                                            <div className="text-[10px] text-zinc-400">
                                              {pDetail.litros.toFixed(1)} L • {pDetail.count} abast.
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-400 italic">
                                  Nenhum posto detalhado nesta data.
                                </p>
                              )}
                            </div>
                          );
                        }

                        // Standard tooltip for other metric modes
                        return (
                          <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-lg text-xs space-y-1">
                            <p className="font-bold text-zinc-900">{dataPoint.fullName || label}</p>
                            <p className="text-purple-700 font-extrabold">
                              {metricMode === "valor" || metricMode === "ticket_medio"
                                ? formatCurrency(Number(dataPoint.displayVal))
                                : metricMode === "cpk"
                                ? `R$ ${Number(dataPoint.displayVal).toFixed(3)} / Km`
                                : metricMode === "litros"
                                ? `${Number(dataPoint.displayVal).toLocaleString("pt-BR")} L`
                                : `${dataPoint.displayVal} registros`}
                            </p>
                          </div>
                        );
                      }}
                    />

                    {/* Main fleet average line */}
                    <Line
                      type="monotone"
                      dataKey={metricMode === "preco_medio" ? "preco_medio" : "displayVal"}
                      name="Média Geral da Frota"
                      stroke={metricMode === "preco_medio" ? "#2563eb" : "#7c3aed"}
                      strokeWidth={3.5}
                      dot={chartData.length <= 31 ? { r: 4, fill: metricMode === "preco_medio" ? "#2563eb" : "#7c3aed" } : false}
                      activeDot={{ r: 7 }}
                      connectNulls={true}
                    >
                      {metricMode !== "preco_medio" && (
                        <LabelList
                          dataKey="displayVal"
                          position="top"
                          formatter={(val: any) => formatLabelListValue(val, metricMode)}
                          style={{ fill: "#4c1d95", fontSize: 10, fontWeight: 800 }}
                        />
                      )}
                    </Line>

                    {/* Individual Posto Lines when in preco_medio mode */}
                    {metricMode === "preco_medio" &&
                      selectedPostoViewMode !== "media_only" &&
                      topPostos.map((p) => {
                        if (!visiblePostoKeys.has(p.key)) return null;
                        return (
                          <Line
                            key={p.key}
                            type="monotone"
                            dataKey={p.key}
                            name={p.name}
                            stroke={p.color}
                            strokeWidth={2}
                            dot={{ r: 3, fill: p.color }}
                            activeDot={{ r: 5 }}
                            connectNulls={true}
                          />
                        );
                      })}
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
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
                      tickFormatter={(val) => formatYAxisValue(val, metricMode)}
                    />
                    <Tooltip
                      formatter={(value: any) => formatTooltipValue(value, metricMode)}
                      labelFormatter={(label, items) => {
                        const item = items && items[0] ? (items[0].payload as any) : null;
                        return item?.fullName ? `${item.fullName}` : `${granularityName}: ${label}`;
                      }}
                    />
                    <Bar dataKey="displayVal" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList
                        dataKey="displayVal"
                        position="top"
                        formatter={(val: any) => formatLabelListValue(val, metricMode)}
                        style={{ fill: "#1e1b4b", fontSize: 10, fontWeight: 800 }}
                      />
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dedicated Gas Stations (Postos) Pricing & Performance Section */}
          {allPostosSummary.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Comparativo e Ranking por Posto / Fornecedor
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Análise detalhada de performance, volumes e custos praticados em cada posto/fornecedor.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar posto..."
                      value={postoSearchQuery}
                      onChange={(e) => setPostoSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40 sm:w-52"
                    />
                  </div>

                  <select
                    value={postoSortBy}
                    onChange={(e) => setPostoSortBy(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold focus:outline-none cursor-pointer hover:bg-zinc-200/60"
                  >
                    <option value="volume">Maior Volume (Litros)</option>
                    <option value="preco_asc">Menor Preço (Mais Barato)</option>
                    <option value="preco_desc">Maior Preço (Mais Caro)</option>
                    <option value="valor">Maior Gasto Total (R$)</option>
                    <option value="lancamentos">Mais Abastecimentos</option>
                    <option value="ticket_medio">Maior Ticket Médio</option>
                  </select>
                </div>
              </div>

              {/* Quick Summary Highlights for Gas Stations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cheaper Station */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Posto Mais Econômico
                    </span>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-black text-emerald-950 truncate" title={postoMaisBarato?.name}>
                    {postoMaisBarato ? postoMaisBarato.name : "-"}
                  </p>
                  <p className="text-lg font-black text-emerald-700">
                    {postoMaisBarato ? `R$ ${postoMaisBarato.precoMedio.toFixed(3)} / L` : "-"}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    {postoMaisBarato
                      ? `${postoMaisBarato.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L abastecidos • ${postoMaisBarato.diffVsMedia <= 0 ? `${Math.abs(postoMaisBarato.diffVsMedia).toFixed(1)}% abaixo da média` : ""}`
                      : ""}
                  </p>
                </div>

                {/* Most Expensive Station */}
                <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-rose-700">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Posto Mais Caro
                    </span>
                  </div>
                  <p className="text-sm font-black text-rose-950 truncate" title={postoMaisCaro?.name}>
                    {postoMaisCaro ? postoMaisCaro.name : "-"}
                  </p>
                  <p className="text-lg font-black text-rose-700">
                    {postoMaisCaro ? `R$ ${postoMaisCaro.precoMedio.toFixed(3)} / L` : "-"}
                  </p>
                  <p className="text-[11px] text-rose-800 font-medium">
                    {postoMaisCaro
                      ? `${postoMaisCaro.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L abastecidos • ${postoMaisCaro.diffVsMedia >= 0 ? `+${postoMaisCaro.diffVsMedia.toFixed(1)}% acima da média` : ""}`
                      : ""}
                  </p>
                </div>

                {/* Top Volume Station */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5" /> Maior Volume
                    </span>
                  </div>
                  <p className="text-sm font-black text-amber-950 truncate" title={postoMaiorVolume?.name}>
                    {postoMaiorVolume ? postoMaiorVolume.name : "-"}
                  </p>
                  <p className="text-lg font-black text-amber-800">
                    {postoMaiorVolume
                      ? `${postoMaiorVolume.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`
                      : "-"}
                  </p>
                  <p className="text-[11px] text-amber-900 font-medium">
                    {postoMaiorVolume
                      ? `${postoMaiorVolume.sharePct.toFixed(1)}% do volume total • R$ ${postoMaiorVolume.precoMedio.toFixed(3)}/L`
                      : ""}
                  </p>
                </div>

                {/* Fleet Weighted Average */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5" /> Média Ponderada da Frota
                    </span>
                  </div>
                  <p className="text-sm font-black text-blue-950">
                    {allPostosSummary.length} Postos no Período
                  </p>
                  <p className="text-lg font-black text-blue-700">
                    {totalLitrosPeriodo > 0
                      ? `R$ ${(totalGeralPeriodo / totalLitrosPeriodo).toFixed(3)} / L`
                      : "-"}
                  </p>
                  <p className="text-[11px] text-blue-800 font-medium">
                    Total de {totalLitrosPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L consumidos
                  </p>
                </div>
              </div>

              {/* Detailed Postos Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                      <th className="p-3">Posto / Fornecedor</th>
                      <th className="p-3 text-center">Preço Médio (R$/L)</th>
                      <th className="p-3 text-center">vs Média Geral</th>
                      <th className="p-3 text-center">Faixa Praticada (Mín / Máx)</th>
                      <th className="p-3 text-center">Volume (Litros)</th>
                      <th className="p-3 text-center">Participação (%)</th>
                      <th className="p-3 text-right">Gasto Total (R$)</th>
                      <th className="p-3 text-center">Abastecimentos</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {filteredPostosTable.map((p) => {
                      const isHighlighted = selectedPostoViewMode === p.key;
                      const isVisible = visiblePostoKeys.has(p.key);
                      return (
                        <tr
                          key={p.key}
                          className={`hover:bg-zinc-50 transition-colors ${
                            isHighlighted ? "bg-emerald-50/50" : ""
                          }`}
                        >
                          <td className="p-3 font-bold text-zinc-900">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="truncate max-w-xs">{p.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-extrabold text-emerald-800 text-sm">
                            R$ {p.precoMedio.toFixed(3)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
                                p.diffVsMedia < 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.diffVsMedia > 0
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {p.diffVsMedia > 0 ? `+${p.diffVsMedia.toFixed(1)}%` : `${p.diffVsMedia.toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="p-3 text-center text-zinc-600 font-mono text-[11px]">
                            R$ {p.minPreco.toFixed(2)} - R$ {p.maxPreco.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-bold text-amber-900">
                            {p.totalLiters.toLocaleString("pt-BR", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}{" "}
                            L
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 font-bold text-zinc-700 text-[11px]">
                              {p.sharePct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-purple-700">
                            {formatCurrency(p.totalValor)}
                          </td>
                          <td className="p-3 text-center text-zinc-700 font-semibold">{p.count}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPostoViewMode === p.key) {
                                  handleSelectAllPostos();
                                } else {
                                  handleIsolatePosto(p.key);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                isHighlighted
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                              }`}
                              title="Destacar a curva deste posto no gráfico de evolução"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {isHighlighted ? "Destacado" : "Ver no Gráfico"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
