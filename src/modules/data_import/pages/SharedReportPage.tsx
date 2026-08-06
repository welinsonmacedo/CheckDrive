import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { calculateVehicleStats } from "../utils/vehicleStatsUtils";
import {
  FileSpreadsheet,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Truck,
  Fuel,
  Building2,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  FileText,
  DollarSign,
  Hash,
  Calculator,
  RefreshCw,
  Globe,
  SlidersHorizontal,
  Flame,
  Award,
  Navigation,
  Info,
  X,
  Eye,
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
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  LabelList,
} from "recharts";
import { ImportRecord, RecordCategory } from "../types";
import { SharedReportService, SharedReportConfig } from "../services/sharedReportService";
import { ImportService } from "../services/importService";
import { exportReportToExcel, exportReportToPDF } from "../utils/exportReportUtils";
import { getRecordImportType, getImportTypeLabel } from "./ImportReportsTab";

const CATEGORIES: (RecordCategory | "Todas")[] = [
  "Todas",
  "Combustível",
  "Gasolina",
  "Gasolina Administrativo",
  "Diesel",
  "Diesel Terceiro",
  "Arla",
  "Arla Estoque",
  "Estoque",
  "Lava-jato",
  "Pneus Novos",
  "Recapagem",
  "Pneus",
  "Rastreamento",
  "Freios",
  "Elétrica",
  "Pedágio",
  "Multa",
  "Seguro",
  "Manutenção",
  "Lubrificantes",
  "Peças",
  "Outros",
];

const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
  "#84cc16",
  "#d97706",
];

const MONTH_NAMES_PT: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

function parseRecordMonthYear(dateStr?: string): { month: string; year: string } | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (s.includes("-")) {
    const parts = s.split("-");
    if (parts.length >= 2) {
      if (parts[0].length === 4) {
        return { year: parts[0], month: parts[1].padStart(2, "0") };
      } else if (parts[2]?.length === 4) {
        return { year: parts[2], month: parts[1].padStart(2, "0") };
      }
    }
  }
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      return { year: parts[2], month: parts[1].padStart(2, "0") };
    } else if (parts.length === 2) {
      return { year: parts[1], month: parts[0].padStart(2, "0") };
    }
  }
  return null;
}

export default function SharedReportPage() {
  const { shareId: paramShareId } = useParams<{ shareId: string }>();

  // Extract shareId reliably from route param or location path/hash
  const shareId = useMemo(() => {
    if (paramShareId) return paramShareId;
    const fullLoc = window.location.pathname + window.location.hash + window.location.search;
    const match = fullLoc.match(/relatorio-compartilhado\/([^/?#]+)/);
    return match ? match[1] : "";
  }, [paramShareId]);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SharedReportConfig | null>(null);

  // Authentication PIN state
  const [inputPin, setInputPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");

  // Superior Filters State (locked if allow_filters is false)
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [tipoImportacaoFilter, setTipoImportacaoFilter] = useState<string>("Todas");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("0");
  const [customMonth, setCustomMonth] = useState<string>("");
  const [placaFilter, setPlacaFilter] = useState<string>("");
  const [fornecedorFilter, setFornecedorFilter] = useState<string>("");
  const [agruparPor, setAgruparPor] = useState<"categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status">("categoria");
  const [metrica, setMetrica] = useState<"soma_valor" | "quantidade" | "media_valor" | "soma_quantidade">("soma_valor");
  const [tipoGrafico, setTipoGrafico] = useState<"bar" | "pie" | "line" | "area" | "table">("bar");

  // Internal Interactive Views (ALWAYS fully interactive for the reader)
  const [topVehiclesTab, setTopVehiclesTab] = useState<"maior" | "menor" | "lado_a_lado">("lado_a_lado");
  const [detalhadoTab, setDetalhadoTab] = useState<"categoria" | "placa" | "fornecedor" | "detalhado">("categoria");
  const [tableSearch, setTableSearch] = useState<string>("");

  // Modals & Expanders State
  const [selectedVehicleDetailKey, setSelectedVehicleDetailKey] = useState<string | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<ImportRecord | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});
  const [expandedFornecedores, setExpandedFornecedores] = useState<Record<string, boolean>>({});

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    if (shareId) {
      loadSharedReport(shareId);
    } else {
      setLoading(false);
    }
  }, [shareId]);

  const loadSharedReport = async (id: string) => {
    setLoading(true);
    try {
      const data = await SharedReportService.getSharedReport(id);
      if (data) {
        // Fallback: If records_snapshot is empty or missing, fetch from ImportService
        if ((!data.records_snapshot || data.records_snapshot.length === 0) && data.company_id) {
          try {
            const fallbackRecords = await ImportService.getImportRecords(data.company_id);
            if (fallbackRecords && fallbackRecords.length > 0) {
              data.records_snapshot = fallbackRecords;
            }
          } catch (e) {
            console.warn("Fallback records fetch error:", e);
          }
        }

        setReport(data);
        // Load initial filters
        if (data.filters) {
          if (data.filters.categoryFilter) setCategoryFilter(data.filters.categoryFilter);
          if (data.filters.tipoImportacaoFilter) setTipoImportacaoFilter(data.filters.tipoImportacaoFilter);
          if (data.filters.selectedPeriod) setSelectedPeriod(data.filters.selectedPeriod);
          if (data.filters.customMonth) setCustomMonth(data.filters.customMonth);
          if (data.filters.placaFilter) setPlacaFilter(data.filters.placaFilter);
          if (data.filters.fornecedorFilter) setFornecedorFilter(data.filters.fornecedorFilter);
          if (data.filters.agruparPor) setAgruparPor(data.filters.agruparPor as any);
          if (data.filters.metrica) setMetrica(data.filters.metrica as any);
          if (data.filters.tipoGrafico) setTipoGrafico(data.filters.tipoGrafico as any);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar relatório compartilhado:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    if (inputPin.trim() === report.access_code.trim()) {
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("Código de acesso incorreto. Tente novamente.");
    }
  };

  const records: ImportRecord[] = useMemo(() => {
    return report?.records_snapshot || [];
  }, [report]);

  // Extract available months from records + standard recent months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    records.forEach((r) => {
      const parsed = parseRecordMonthYear(r.data);
      if (parsed) {
        monthsSet.add(`${parsed.month}/${parsed.year}`);
      }
    });

    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 1; y--) {
      for (let m = 12; m >= 1; m--) {
        const mStr = String(m).padStart(2, "0");
        monthsSet.add(`${mStr}/${y}`);
      }
    }

    return Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split("/");
      const [mB, yB] = b.split("/");
      if (yA !== yB) return Number(yB) - Number(yA);
      return Number(mB) - Number(mA);
    });
  }, [records]);

  const monthsByYear = useMemo(() => {
    const map: Record<string, string[]> = {};
    availableMonths.forEach((m) => {
      const [month, year] = m.split("/");
      if (!map[year]) map[year] = [];
      map[year].push(m);
    });
    return map;
  }, [availableMonths]);

  // Period label
  const getPeriodLabel = () => {
    if (selectedPeriod === "custom") {
      if (!customMonth) return "Mês Selecionado";
      const [y, m] = customMonth.split("-");
      const name = MONTH_NAMES_PT[m] || m;
      return `Mês ${m}/${y} (${name})`;
    }
    if (selectedPeriod.startsWith("m:")) {
      const my = selectedPeriod.substring(2);
      const [m, y] = my.split("/");
      const name = MONTH_NAMES_PT[m] || m;
      return `Mês ${my} (${name})`;
    }
    const days = Number(selectedPeriod);
    if (days === 0) return "Todo o Histórico";
    if (days === 365) return "Este Ano (365d)";
    return `Últimos ${days} dias`;
  };

  // Filter records based on superior filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Tipo Importação
      if (tipoImportacaoFilter !== "Todas") {
        const type = getRecordImportType(r);
        if (type !== tipoImportacaoFilter) return false;
      }
      // 2. Categoria
      if (categoryFilter !== "Todas") {
        if (r.tipo_registro !== categoryFilter) return false;
      }
      // 3. Placa
      if (placaFilter) {
        if (!r.placa || !r.placa.toUpperCase().includes(placaFilter.toUpperCase())) return false;
      }
      // 4. Fornecedor
      if (fornecedorFilter) {
        if (!r.fornecedor || !r.fornecedor.toLowerCase().includes(fornecedorFilter.toLowerCase())) return false;
      }
      // 5. Período / Mês
      if (selectedPeriod !== "0" && r.data) {
        if (selectedPeriod === "custom" && customMonth) {
          const [cYear, cMonth] = customMonth.split("-");
          const parsed = parseRecordMonthYear(r.data);
          if (!parsed || parsed.month !== cMonth || parsed.year !== cYear) return false;
        } else if (selectedPeriod.startsWith("m:")) {
          const monthYearStr = selectedPeriod.substring(2); // e.g. "01/2026"
          const [targetMonth, targetYear] = monthYearStr.split("/");
          const parsed = parseRecordMonthYear(r.data);
          if (parsed) {
            if (parsed.month !== targetMonth || parsed.year !== targetYear) return false;
          } else {
            const recordDate = r.data.trim();
            if (recordDate.includes("-")) {
              const parts = recordDate.split("-");
              if (parts.length >= 2) {
                const ym = parts[0].length === 4 ? `${parts[1].padStart(2, "0")}/${parts[0]}` : `${parts[1].padStart(2, "0")}/${parts[2]}`;
                if (ym !== monthYearStr) return false;
              }
            } else if (recordDate.includes("/")) {
              const parts = recordDate.split("/");
              if (parts.length === 3) {
                const ym = `${parts[1].padStart(2, "0")}/${parts[2]}`;
                if (ym !== monthYearStr) return false;
              }
            }
          }
        } else {
          const days = parseInt(selectedPeriod);
          if (!isNaN(days) && days > 0) {
            const recordDate = new Date(r.data);
            if (!isNaN(recordDate.getTime())) {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              if (recordDate < cutoff) return false;
            }
          }
        }
      }
      return true;
    });
  }, [records, categoryFilter, tipoImportacaoFilter, placaFilter, fornecedorFilter, selectedPeriod, customMonth]);

  // Overall metrics
  const totalValorGeral = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
  }, [filteredRecords]);

  const totalQtyGeral = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0);
  }, [filteredRecords]);

  const totalRegistrosCount = filteredRecords.length;

  const mediaValorGeral = useMemo(() => {
    return totalRegistrosCount > 0 ? totalValorGeral / totalRegistrosCount : 0;
  }, [totalValorGeral, totalRegistrosCount]);

  // Aggregated data for Chart
  const aggregatedData = useMemo(() => {
    const groups: Record<string, { count: number; valorTotal: number; totalQty: number }> = {};

    filteredRecords.forEach((r) => {
      let key = "Outros";
      if (agruparPor === "categoria") key = r.tipo_registro || "Sem Categoria";
      else if (agruparPor === "tipo_importacao") key = getImportTypeLabel(getRecordImportType(r));
      else if (agruparPor === "placa") key = r.placa ? `${r.placa.toUpperCase()}${r.numero_frota ? ` (${r.numero_frota})` : ""}` : "Sem Placa";
      else if (agruparPor === "fornecedor") key = r.fornecedor ? r.fornecedor.trim() : "Sem Fornecedor";
      else if (agruparPor === "status") key = r.status ? r.status.toUpperCase() : "DESCONHECIDO";

      if (!groups[key]) {
        groups[key] = { count: 0, valorTotal: 0, totalQty: 0 };
      }
      groups[key].count += 1;
      groups[key].valorTotal += Number(r.valor) || 0;
      groups[key].totalQty += Number(r.quantidade) || 0;
    });

    return Object.entries(groups)
      .map(([name, stat]) => {
        let val = stat.valorTotal;
        if (metrica === "quantidade") val = stat.count;
        else if (metrica === "soma_quantidade") val = stat.totalQty;
        else if (metrica === "media_valor") val = stat.count > 0 ? stat.valorTotal / stat.count : 0;

        const percent = totalValorGeral > 0 ? ((stat.valorTotal / totalValorGeral) * 100).toFixed(1) : "0";

        return {
          name,
          value: Number(val.toFixed(2)),
          count: stat.count,
          valorTotal: stat.valorTotal,
          totalQty: stat.totalQty,
          mediaValor: stat.count > 0 ? stat.valorTotal / stat.count : 0,
          percent: Number(percent),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords, agruparPor, metrica, totalValorGeral]);

  // Vehicle Stats for Top 10 Highest, Lowest & CPK Reports
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords);
  }, [filteredRecords]);

  // Selected vehicle detail
  const selectedVehicleDetail = useMemo(() => {
    if (!selectedVehicleDetailKey) return null;
    return vehicleStats.allVehicles.find((v) => v.key === selectedVehicleDetailKey) || null;
  }, [selectedVehicleDetailKey, vehicleStats]);

  // Categories Breakdown for interactive detail view
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; valorTotal: number; totalQty: number; count: number; items: ImportRecord[] }> = {};

    filteredRecords.forEach((r) => {
      const cat = r.tipo_registro || "Outros";
      if (!map[cat]) {
        map[cat] = { name: cat, valorTotal: 0, totalQty: 0, count: 0, items: [] };
      }
      map[cat].valorTotal += Number(r.valor) || 0;
      map[cat].totalQty += Number(r.quantidade) || 0;
      map[cat].count += 1;
      map[cat].items.push(r);
    });

    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [filteredRecords]);

  // Suppliers Breakdown
  const supplierBreakdown = useMemo(() => {
    const map: Record<string, { name: string; valorTotal: number; count: number; items: ImportRecord[] }> = {};

    filteredRecords.forEach((r) => {
      const sup = r.fornecedor?.trim() || "Não Informado";
      if (!map[sup]) {
        map[sup] = { name: sup, valorTotal: 0, count: 0, items: [] };
      }
      map[sup].valorTotal += Number(r.valor) || 0;
      map[sup].count += 1;
      map[sup].items.push(r);
    });

    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [filteredRecords]);

  // Table records search
  const tableFilteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return filteredRecords;
    const term = tableSearch.toLowerCase().trim();
    return filteredRecords.filter(
      (r) =>
        r.placa?.toLowerCase().includes(term) ||
        r.tipo_registro?.toLowerCase().includes(term) ||
        r.fornecedor?.toLowerCase().includes(term) ||
        r.descricao_conta?.toLowerCase().includes(term) ||
        r.numero_frota?.toLowerCase().includes(term)
    );
  }, [filteredRecords, tableSearch]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportReportToExcel({
        filters: {
          companyName: report?.title ? `CheckDrive - ${report.title}` : undefined,
          periodLabel: getPeriodLabel(),
          categoryFilter,
          tipoImportacaoFilter,
          agruparPor,
          metrica,
          tipoGrafico,
          fornecedorFilter,
          placaFilter,
        },
        overallMetrics: {
          totalValorGeral,
          totalQtyGeral,
          totalRegistrosCount,
          mediaValorGeral,
        },
        aggregatedData,
        vehicleStats,
        tableFilteredRecords,
      });
    } catch (e: any) {
      alert("Erro ao exportar Excel: " + (e?.message || e));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportReportToPDF({
        filters: {
          companyName: report?.title ? `CheckDrive - ${report.title}` : undefined,
          periodLabel: getPeriodLabel(),
          categoryFilter,
          tipoImportacaoFilter,
          agruparPor,
          metrica,
          tipoGrafico,
          fornecedorFilter,
          placaFilter,
        },
        overallMetrics: {
          totalValorGeral,
          totalQtyGeral,
          totalRegistrosCount,
          mediaValorGeral,
        },
        aggregatedData,
        vehicleStats,
        tableFilteredRecords,
      });
    } catch (e: any) {
      alert("Erro ao exportar PDF: " + (e?.message || e));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  // Helper to render individual vehicle card in Top 10 lists
  const renderVehicleCard = (vehicle: typeof vehicleStats.top10Highest[0], rank: number, isHighCost: boolean) => {
    const avgCostPerTrip = vehicle.viagensCount > 0 ? vehicle.totalCost / vehicle.viagensCount : 0;
    const categoriesList = Object.entries(vehicle.categories)
      .map(([catName, catData]) => ({
        name: catName,
        valor: catData.valor,
        count: catData.count,
        percent: vehicle.totalCost > 0 ? (catData.valor / vehicle.totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    const rankBadgeBg =
      rank === 1
        ? "bg-amber-400 text-amber-950 border-amber-300 font-black shadow-xs"
        : rank === 2
        ? "bg-slate-300 text-slate-900 border-slate-200 font-black"
        : rank === 3
        ? "bg-amber-700 text-amber-100 border-amber-600 font-black"
        : "bg-zinc-100 text-zinc-700 border-zinc-200 font-bold";

    return (
      <div
        key={vehicle.key}
        className={`p-4 rounded-2xl border transition-all ${
          isHighCost
            ? "bg-gradient-to-br from-rose-50/40 via-white to-amber-50/20 border-rose-200/80 hover:border-rose-300 hover:shadow-sm"
            : "bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/20 border-emerald-200/80 hover:border-emerald-300 hover:shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs border ${rankBadgeBg}`}>
              #{rank}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-zinc-900 text-sm tracking-wide">{vehicle.placa}</h4>
                {vehicle.numero_frota && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Frota {vehicle.numero_frota}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-500 font-medium">
                <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <Navigation className="w-3 h-3 text-indigo-600" />
                  {vehicle.viagensCount} {vehicle.viagensCount === 1 ? "lançamento" : "lançamentos"}
                </span>
                {vehicle.totalLiters > 0 && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    <Fuel className="w-3 h-3 text-amber-600" />
                    {vehicle.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-1">
            <div>
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Custo Total</p>
              <p className={`text-base font-black ${isHighCost ? "text-rose-700" : "text-emerald-700"}`}>
                {formatCurrency(vehicle.totalCost)}
              </p>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
              Média: {formatCurrency(avgCostPerTrip)} / lançamento
            </p>
          </div>
        </div>

        {/* Cost Breakdown Description */}
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-extrabold text-zinc-700 flex items-center justify-between">
            <span>Distribuição por Categoria:</span>
            <span className="text-[10px] text-zinc-400 font-semibold">{categoriesList.length} categoria(s)</span>
          </p>

          {/* Visual Progress Bar */}
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden flex">
            {categoriesList.map((cat, idx) => (
              <div
                key={cat.name}
                style={{ width: `${cat.percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                title={`${cat.name}: ${formatCurrency(cat.valor)} (${cat.percent.toFixed(1)}%)`}
              />
            ))}
          </div>

          {/* Categories Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categoriesList.map((cat, idx) => (
              <div
                key={cat.name}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] bg-zinc-50 border border-zinc-200/80"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="font-semibold text-zinc-700">{cat.name}:</span>
                <span className="font-black text-zinc-900">{formatCurrency(cat.valor)}</span>
                <span className="text-[9px] text-zinc-400 font-bold">({cat.percent.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-medium">
            {vehicle.items.length} registro(s) associado(s)
          </span>
          <button
            onClick={() => setSelectedVehicleDetailKey(vehicle.key)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver Detalhes / Lançamentos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-300">Carregando relatório compartilhado...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">Link Indisponível ou Não Encontrado</h2>
          <p className="text-xs text-slate-400">
            O relatório que você está tentando acessar não existe ou o link de compartilhamento expirou.
          </p>
        </div>
      </div>
    );
  }

  // Security Unlock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto border border-amber-400/30 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Acesso Protegido por PIN
            </div>
            <h2 className="text-xl font-black tracking-tight">{report.title}</h2>
            <p className="text-xs text-slate-300">
              CheckDrive • Criado em {new Date(report.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyPin} className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Digite o Código de Acesso (PIN)</label>
              <p className="text-[11px] text-slate-500">Informe o código fornecido pela pessoa que compartilhou este link.</p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={inputPin}
                  onChange={(e) => {
                    setInputPin(e.target.value);
                    setPinError("");
                  }}
                  placeholder="DIGITE O CÓDIGO"
                  className="w-full text-center text-2xl font-black tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-indigo-600 focus:outline-none uppercase bg-slate-50 text-slate-900"
                />
                <Key className="w-5 h-5 absolute right-4 top-4 text-slate-400 pointer-events-none" />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl text-center border border-red-200">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" /> Desbloquear e Visualizar Relatório
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Superior filters lock state
  const filtersDisabled = report.allow_filters === false;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Relatório Autenticado por PIN
              </span>

              {filtersDisabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-400/30">
                  <Lock className="w-3.5 h-3.5" /> Visão Congelada (Filtros Superiores Bloqueados)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                  <Unlock className="w-3.5 h-3.5" /> Filtros Superiores Interativos
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{report.title}</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Gerado via CheckDrive • {getPeriodLabel()} • {totalRegistrosCount} registros localizados • Interatividade completa na página
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExportingExcel ? "Gerando..." : "Exportar Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isExportingPDF ? "Gerando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Superior Filter Control Bar (Locked ONLY if allow_filters is false) */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-900 text-sm">Filtros Superiores do Relatório</h3>
            {filtersDisabled && (
              <span className="text-[11px] text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md font-bold border border-purple-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Fixado pelo Emissor ao Gerar
              </span>
            )}
          </div>
        </div>

        <fieldset disabled={filtersDisabled} className={filtersDisabled ? "opacity-75 pointer-events-none" : ""}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Categoria */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Categoria</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Origem/Tipo */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Origem do Dado</label>
              <select
                value={tipoImportacaoFilter}
                onChange={(e) => setTipoImportacaoFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="Todas">Todas as Origens</option>
                <option value="combustivel_gfv">Consumo Combustível (GFV)</option>
                <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
              </select>
            </div>

            {/* Período / Mês */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Período / Mês</span>
                {selectedPeriod.startsWith("m:") && (
                  <span className="text-[10px] text-blue-600 font-bold">Por Mês</span>
                )}
              </label>
              <div className="space-y-1">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <optgroup label="Períodos Relativos">
                    <option value="0">Todo o Histórico</option>
                    <option value="30">Últimos 30 Dias</option>
                    <option value="60">Últimos 60 Dias</option>
                    <option value="90">Últimos 90 Dias</option>
                    <option value="365">Este Ano (365 Dias)</option>
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
                    <option value="custom">Selecionar Mês Específico (Seletor)</option>
                  </optgroup>
                </select>

                {selectedPeriod === "custom" && (
                  <input
                    type="month"
                    value={customMonth}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                  />
                )}
              </div>
            </div>

            {/* Agrupar por */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Agrupar Por</label>
              <select
                value={agruparPor}
                onChange={(e) => setAgruparPor(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="categoria">Categoria</option>
                <option value="tipo_importacao">Tipo de Importação</option>
                <option value="placa">Placa do Veículo</option>
                <option value="fornecedor">Fornecedor / Posto</option>
                <option value="status">Status do Registro</option>
              </select>
            </div>

            {/* Métrica */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Métrica do Gráfico</label>
              <select
                value={metrica}
                onChange={(e) => setMetrica(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="soma_valor">Soma do Valor (R$)</option>
                <option value="quantidade">Qtd de Lançamentos</option>
                <option value="soma_quantidade">Soma Unidades/Litros</option>
                <option value="media_valor">Média de Valor (R$)</option>
              </select>
            </div>

            {/* Tipo do Gráfico */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Tipo de Visualização</label>
              <select
                value={tipoGrafico}
                onChange={(e) => setTipoGrafico(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="bar">Gráfico de Barras</option>
                <option value="pie">Gráfico de Pizza</option>
                <option value="line">Gráfico de Linha</option>
                <option value="area">Gráfico de Área</option>
              </select>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Valor Total das Despesas</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(totalValorGeral)}</h4>
          <p className="text-[11px] text-slate-500 mt-1">Soma de todos os lançamentos ativos</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Qtd Registros Importados</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Hash className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-2">{totalRegistrosCount}</h4>
          <p className="text-[11px] text-slate-500 mt-1">Total de registros no relatório</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Soma Unidades / Litros</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-2">
            {totalQtyGeral.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">Volume total consumido / comprado</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Valor Médio por Lançamento</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(mediaValorGeral)}</h4>
          <p className="text-[11px] text-slate-500 mt-1">Custo médio por registro</p>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Análise Visual Agrupada ({agruparPor.toUpperCase()})</h3>
            <p className="text-xs text-slate-500">Visualização gráfica dos indicadores do relatório.</p>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          {aggregatedData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          ) : tipoGrafico === "pie" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregatedData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {aggregatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [val, "Métrica"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : tipoGrafico === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : tipoGrafico === "area" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TOP 10 VEÍCULOS (MAIORES E MENORES GASTOS) */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900 text-lg">Ranking de Veículos (Top 10)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise comparativa dos 10 veículos com maiores e 10 veículos com menores gastos.
            </p>
          </div>

          {/* Tab Switcher for Top 10 */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-2xl border border-zinc-200 shrink-0">
            <button
              onClick={() => setTopVehiclesTab("lado_a_lado")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                topVehiclesTab === "lado_a_lado"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              📊 Lado a Lado
            </button>
            <button
              onClick={() => setTopVehiclesTab("maior")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                topVehiclesTab === "maior"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> 10 Maiores Gastos
            </button>
            <button
              onClick={() => setTopVehiclesTab("menor")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                topVehiclesTab === "menor"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Award className="w-3.5 h-3.5" /> 10 Menores Gastos
            </button>
          </div>
        </div>

        {/* TOP 10 CONTENT */}
        {vehicleStats.allVehicles.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            Nenhum veículo identificado para os filtros selecionados.
          </div>
        ) : topVehiclesTab === "lado_a_lado" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 10 Maiores Gastos Column */}
            <div className="space-y-3">
              <div className="p-3.5 bg-gradient-to-r from-rose-500 to-amber-600 rounded-2xl text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-200" />
                  <div>
                    <h4 className="font-black text-sm">10 Veículos com MAIORES Gastos</h4>
                    <p className="text-[11px] text-rose-100">Top despesas no período selecionado</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-white/20 px-2.5 py-1 rounded-xl">
                  {vehicleStats.top10Highest.length} veículos
                </span>
              </div>

              <div className="space-y-3">
                {vehicleStats.top10Highest.map((v, idx) => renderVehicleCard(v, idx + 1, true))}
              </div>
            </div>

            {/* 10 Menores Gastos Column */}
            <div className="space-y-3">
              <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-200" />
                  <div>
                    <h4 className="font-black text-sm">10 Veículos com MENORES Gastos</h4>
                    <p className="text-[11px] text-emerald-100">Top veículos econômicos com despesas</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-white/20 px-2.5 py-1 rounded-xl">
                  {vehicleStats.top10Lowest.length} veículos
                </span>
              </div>

              <div className="space-y-3">
                {vehicleStats.top10Lowest.map((v, idx) => renderVehicleCard(v, idx + 1, false))}
              </div>
            </div>
          </div>
        ) : topVehiclesTab === "maior" ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-gradient-to-r from-rose-500 to-amber-600 rounded-2xl text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-200" />
                <h4 className="font-black text-sm">Top 10 Veículos com MAIORES Gastos</h4>
              </div>
              <span className="text-xs font-bold text-rose-100">Ordenado por Custo Total Descrecente</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicleStats.top10Highest.map((v, idx) => renderVehicleCard(v, idx + 1, true))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-200" />
                <h4 className="font-black text-sm">Top 10 Veículos com MENORES Gastos</h4>
              </div>
              <span className="text-xs font-bold text-emerald-100">Ordenado por Custo Total Crescente</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicleStats.top10Lowest.map((v, idx) => renderVehicleCard(v, idx + 1, false))}
            </div>
          </div>
        )}
      </div>

      {/* DETALHAMENTO INTERATIVO DOS REGISTROS */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-slate-900 text-base">Detalhamento Interativo dos Registros</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha como deseja explorar os dados: agrupado por Categoria, por Veículo, por Fornecedor ou Lançamento a Lançamento.
            </p>
          </div>

          {/* Detalhado View Mode Switcher */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-2xl border border-zinc-200 shrink-0">
            <button
              onClick={() => setDetalhadoTab("categoria")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                detalhadoTab === "categoria"
                  ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              📂 Por Categoria
            </button>
            <button
              onClick={() => setDetalhadoTab("placa")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                detalhadoTab === "placa"
                  ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              🚛 Por Veículo
            </button>
            <button
              onClick={() => setDetalhadoTab("fornecedor")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                detalhadoTab === "fornecedor"
                  ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              🏪 Por Fornecedor
            </button>
            <button
              onClick={() => setDetalhadoTab("detalhado")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                detalhadoTab === "detalhado"
                  ? "bg-white text-blue-600 shadow-xs border border-zinc-200/80"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              📋 Lançamentos Individuais
            </button>
          </div>
        </div>

        {/* DETALHAMENTO: POR CATEGORIA */}
        {detalhadoTab === "categoria" && (
          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400 p-4 text-center">Nenhuma categoria encontrada.</p>
            ) : (
              categoryBreakdown.map((cat) => {
                const isOpen = expandedCategories[cat.name];
                const percent = totalValorGeral > 0 ? (cat.valorTotal / totalValorGeral) * 100 : 0;
                const media = cat.count > 0 ? cat.valorTotal / cat.count : 0;

                return (
                  <div key={cat.name} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() =>
                        setExpandedCategories((prev) => ({ ...prev, [cat.name]: !prev[cat.name] }))
                      }
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm">{cat.name}</h4>
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                              {cat.count} lançamento(s)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Representa {percent.toFixed(1)}% do total do relatório • Média de {formatCurrency(media)} por registro
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Categoria</p>
                          <p className="text-base font-black text-slate-900">{formatCurrency(cat.valorTotal)}</p>
                        </div>
                        <button className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable items inside category */}
                    {isOpen && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <th className="p-2.5">Data</th>
                                <th className="p-2.5">Placa</th>
                                <th className="p-2.5">Descrição</th>
                                <th className="p-2.5 text-right">Qtd</th>
                                <th className="p-2.5 text-right">Valor</th>
                                <th className="p-2.5">Fornecedor</th>
                                <th className="p-2.5 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cat.items.map((r, i) => (
                                <tr key={r.id || i} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-medium">{r.data || "-"}</td>
                                  <td className="p-2.5 font-bold font-mono text-slate-900">{r.placa || "-"}</td>
                                  <td className="p-2.5 text-slate-600">{r.descricao_conta || r.conta || "-"}</td>
                                  <td className="p-2.5 text-right">{Number(r.quantidade || 0).toFixed(2)}</td>
                                  <td className="p-2.5 text-right font-black">{formatCurrency(Number(r.valor || 0))}</td>
                                  <td className="p-2.5 text-slate-600">{r.fornecedor || "-"}</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => setSelectedRecordDetail(r)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DETALHAMENTO: POR VEÍCULO */}
        {detalhadoTab === "placa" && (
          <div className="space-y-3">
            {vehicleStats.allVehicles.length === 0 ? (
              <p className="text-xs text-zinc-400 p-4 text-center">Nenhum veículo encontrado.</p>
            ) : (
              vehicleStats.allVehicles.map((v) => {
                const isOpen = expandedVehicles[v.key];
                const avg = v.viagensCount > 0 ? v.totalCost / v.viagensCount : 0;

                return (
                  <div key={v.key} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() =>
                        setExpandedVehicles((prev) => ({ ...prev, [v.key]: !prev[v.key] }))
                      }
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm tracking-wide">{v.placa}</h4>
                            {v.numero_frota && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                Frota {v.numero_frota}
                              </span>
                            )}
                            <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                              {v.viagensCount} lançamento(s)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Volume: {v.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L • Média de {formatCurrency(avg)} / registro
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Custo Total</p>
                          <p className="text-base font-black text-slate-900">{formatCurrency(v.totalCost)}</p>
                        </div>
                        <button className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <th className="p-2.5">Data</th>
                                <th className="p-2.5">Categoria</th>
                                <th className="p-2.5">Descrição</th>
                                <th className="p-2.5 text-right">Qtd</th>
                                <th className="p-2.5 text-right">Valor</th>
                                <th className="p-2.5">Fornecedor</th>
                                <th className="p-2.5 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {v.items.map((r, i) => (
                                <tr key={r.id || i} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-medium">{r.data || "-"}</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                                      {r.tipo_registro}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-600">{r.descricao_conta || r.conta || "-"}</td>
                                  <td className="p-2.5 text-right">{Number(r.quantidade || 0).toFixed(2)}</td>
                                  <td className="p-2.5 text-right font-black">{formatCurrency(Number(r.valor || 0))}</td>
                                  <td className="p-2.5 text-slate-600">{r.fornecedor || "-"}</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => setSelectedRecordDetail(r)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DETALHAMENTO: POR FORNECEDOR */}
        {detalhadoTab === "fornecedor" && (
          <div className="space-y-3">
            {supplierBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400 p-4 text-center">Nenhum fornecedor encontrado.</p>
            ) : (
              supplierBreakdown.map((s) => {
                const isOpen = expandedFornecedores[s.name];

                return (
                  <div key={s.name} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() =>
                        setExpandedFornecedores((prev) => ({ ...prev, [s.name]: !prev[s.name] }))
                      }
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{s.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{s.count} registro(s) vinculado(s)</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Faturado</p>
                          <p className="text-base font-black text-slate-900">{formatCurrency(s.valorTotal)}</p>
                        </div>
                        <button className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <th className="p-2.5">Data</th>
                                <th className="p-2.5">Categoria</th>
                                <th className="p-2.5">Placa</th>
                                <th className="p-2.5">Descrição</th>
                                <th className="p-2.5 text-right">Qtd</th>
                                <th className="p-2.5 text-right">Valor</th>
                                <th className="p-2.5 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {s.items.map((r, i) => (
                                <tr key={r.id || i} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-medium">{r.data || "-"}</td>
                                  <td className="p-2.5 font-bold">{r.tipo_registro}</td>
                                  <td className="p-2.5 font-mono font-bold">{r.placa || "-"}</td>
                                  <td className="p-2.5 text-slate-600">{r.descricao_conta || r.conta || "-"}</td>
                                  <td className="p-2.5 text-right">{Number(r.quantidade || 0).toFixed(2)}</td>
                                  <td className="p-2.5 text-right font-black">{formatCurrency(Number(r.valor || 0))}</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => setSelectedRecordDetail(r)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DETALHAMENTO: LANÇAMENTOS INDIVIDUAIS (TABELA COMPLETA) */}
        {detalhadoTab === "detalhado" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Mostrando {tableFilteredRecords.length} de {filteredRecords.length} lançamentos
              </span>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por placa, categoria, fornecedor..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3 rounded-l-xl">Data</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Placa / Frota</th>
                    <th className="p-3">Conta / Descrição</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Valor (R$)</th>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3 text-center rounded-r-xl">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableFilteredRecords.slice(0, 150).map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium text-slate-700">{r.data || "-"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {r.tipo_registro}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {r.placa || "-"} {r.numero_frota ? `(${r.numero_frota})` : ""}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{r.descricao_conta || r.conta || "-"}</td>
                      <td className="p-3 text-right font-medium text-slate-700">{Number(r.quantidade || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(Number(r.valor || 0))}</td>
                      <td className="p-3 text-slate-600 truncate max-w-xs">{r.fornecedor || "-"}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedRecordDetail(r)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tableFilteredRecords.length > 150 && (
                <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-100">
                  Exibindo os primeiros 150 de {tableFilteredRecords.length} registros.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* VEHICLE DETAIL MODAL */}
      {selectedVehicleDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{selectedVehicleDetail.placa}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedVehicleDetail.numero_frota ? `Frota ${selectedVehicleDetail.numero_frota} • ` : ""}
                    {selectedVehicleDetail.viagensCount} lançamento(s) vinculados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicleDetailKey(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Custo Total</span>
                <p className="text-lg font-black text-slate-900">{formatCurrency(selectedVehicleDetail.totalCost)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Litros / Volume</span>
                <p className="text-lg font-black text-amber-700">
                  {selectedVehicleDetail.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Média por Lançamento</span>
                <p className="text-lg font-black text-indigo-700">
                  {formatCurrency(
                    selectedVehicleDetail.viagensCount > 0
                      ? selectedVehicleDetail.totalCost / selectedVehicleDetail.viagensCount
                      : 0
                  )}
                </p>
              </div>
            </div>

            {/* Table of vehicle items */}
            <div className="space-y-2">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Histórico de Lançamentos do Veículo</h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Categoria</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 text-right">Qtd</th>
                      <th className="p-2.5 text-right">Valor</th>
                      <th className="p-2.5">Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVehicleDetail.items.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium">{r.data || "-"}</td>
                        <td className="p-2.5 font-bold text-blue-700">{r.tipo_registro}</td>
                        <td className="p-2.5 text-slate-600">{r.descricao_conta || r.conta || "-"}</td>
                        <td className="p-2.5 text-right">{Number(r.quantidade || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-black">{formatCurrency(Number(r.valor || 0))}</td>
                        <td className="p-2.5 text-slate-600">{r.fornecedor || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVehicleDetailKey(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD DETAIL MODAL */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">Detalhes do Registro</h3>
              </div>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Data</span>
                  <p className="font-black text-slate-900">{selectedRecordDetail.data || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Categoria</span>
                  <p className="font-black text-blue-700">{selectedRecordDetail.tipo_registro}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Placa</span>
                  <p className="font-mono font-black text-slate-900">{selectedRecordDetail.placa || "-"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Frota</span>
                  <p className="font-bold text-slate-800">{selectedRecordDetail.numero_frota || "-"}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Conta / Descrição</span>
                <p className="font-bold text-slate-900">{selectedRecordDetail.descricao_conta || selectedRecordDetail.conta || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Quantidade / Litros</span>
                  <p className="font-bold text-slate-900">{Number(selectedRecordDetail.quantidade || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Total</span>
                  <p className="font-black text-emerald-700 text-sm">{formatCurrency(Number(selectedRecordDetail.valor || 0))}</p>
                </div>
                {selectedRecordDetail.preco_litro !== undefined && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Preço / Litro</span>
                    <p className="font-bold text-slate-800">{formatCurrency(Number(selectedRecordDetail.preco_litro || 0))}</p>
                  </div>
                )}
                {selectedRecordDetail.km_rodado !== undefined && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Km Rodado</span>
                    <p className="font-bold text-slate-800">{selectedRecordDetail.km_rodado} km</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fornecedor / Posto</span>
                <p className="font-semibold text-slate-800">{selectedRecordDetail.fornecedor || "-"}</p>
              </div>

              {selectedRecordDetail.observacoes && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Observações</span>
                  <p className="text-slate-600 text-[11px]">{selectedRecordDetail.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
