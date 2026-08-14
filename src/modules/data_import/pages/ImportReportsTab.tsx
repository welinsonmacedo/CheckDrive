import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Share2,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  TrendingUp,
  Table as TableIcon,
  Sparkles,
  RefreshCw,
  Fuel,
  DollarSign,
  Layers,
  Award,
  Truck,
  Building2,
  Calculator,
  X,
  Eye,
} from "lucide-react";
import { ImportRecord, ImportJob } from "../types";
import { ImportService } from "../services/importService";
import {
  parseRecordMonthYear,
  matchesPeriod,
  MONTH_NAMES_PT,
} from "../utils/dateUtils";
import {
  calculateVehicleStats,
  calculateSupplierStats,
  getRecordFinancialValue,
  getRecordImportType,
  formatCurrency,
  VehicleReportStat,
} from "../utils/vehicleStatsUtils";
import { exportReportToExcel, exportReportToPDF } from "../utils/exportReportUtils";
import ShareReportModal from "../components/ShareReportModal";

import ReportTendenciaTab from "../components/ReportTendenciaTab";
import ReportRankingTab from "../components/ReportRankingTab";
import ReportCpkTab from "../components/ReportCpkTab";
import ReportVeiculoTab from "../components/ReportVeiculoTab";
import ReportFilterToolbar from "../components/ReportFilterToolbar";

interface Props {
  records?: ImportRecord[];
  companyId: string;
}

export interface ReportMold {
  id: string;
  name: string;
  description: string;
  categoryFilter: string;
  tipoImportacaoFilter?: string;
  periodFilter: string;
  agruparPor: "categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status";
  metrica: "soma_valor" | "quantidade" | "media_valor" | "soma_quantidade";
  tipoGrafico: "bar" | "pie" | "line" | "area";
  viewMode: "grafico" | "tabela" | "ambos";
  createdAt: string;
}

const CATEGORIES = [
  "Todas",
  "Combustível",
  "Diesel",
  "Gasolina",
  "Arla",
  "Manutenção",
  "Peças",
  "Pneus",
  "Pedágio",
  "Serviços",
  "Seguro",
  "Lavagem",
  "Outros",
];

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#9333ea",
  "#c026d3",
];

export default function ImportReportsTab({ records: initialRecords, companyId }: Props) {
  const [internalRecords, setInternalRecords] = useState<ImportRecord[]>(initialRecords || []);
  const [loadingRecords, setLoadingRecords] = useState(!initialRecords || initialRecords.length === 0);

  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      setInternalRecords(initialRecords);
      setLoadingRecords(false);
    } else {
      setLoadingRecords(true);
      ImportService.getImportRecords(companyId)
        .then((data) => setInternalRecords(data || []))
        .catch((err) => console.error("Error loading import records:", err))
        .finally(() => setLoadingRecords(false));
    }
  }, [initialRecords, companyId]);

  const records = internalRecords;

  // Navigation tab
  const [reportViewTab, setReportViewTab] = useState<
    "analitico" | "ranking" | "tendencia" | "tabelas" | "veiculo_a_veiculo" | "cpk"
  >("analitico");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [tipoImportacaoFilter, setTipoImportacaoFilter] = useState("Todas");
  const [jobIdFilter, setJobIdFilter] = useState<string>("all");
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  useEffect(() => {
    ImportService.getImportJobs(companyId)
      .then((data) => setJobs(data || []))
      .catch((err) => console.error("Error loading jobs in reports:", err));
  }, [companyId]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("0");
  const [customMonth, setCustomMonth] = useState<string>("");
  const [placaFilter, setPlacaFilter] = useState("");
  const [fornecedorFilter, setFornecedorFilter] = useState("");
  const [agruparPor, setAgruparPor] = useState<
    "categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status"
  >("categoria");
  const [metrica, setMetrica] = useState<"soma_valor" | "quantidade" | "media_valor" | "soma_quantidade">("soma_valor");
  const [tipoGrafico, setTipoGrafico] = useState<"bar" | "pie" | "line" | "area">("bar");
  const [viewMode, setViewMode] = useState<"grafico" | "tabela" | "ambos">("ambos");

  // Molds & persistence
  const [savedMolds, setSavedMolds] = useState<ReportMold[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newMoldName, setNewMoldName] = useState("");
  const [newMoldDesc, setNewMoldDesc] = useState("");
  const [savingMold, setSavingMold] = useState(false);

  // Modals & Exports
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedVehicleDetailKey, setSelectedVehicleDetailKey] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Table tab specifics
  const [tableSearch, setTableSearch] = useState("");
  const [tableMode, setTableMode] = useState<"agrupado" | "todos_lancamentos">("agrupado");

  // Load saved molds from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`report_molds_${companyId}`);
      if (stored) {
        setSavedMolds(JSON.parse(stored));
      } else {
        const defaultMolds: ReportMold[] = [
          {
            id: "mold-1",
            name: "Gastos por Categoria (Geral)",
            description: "Distribuição consolidada de todas as despesas por categoria",
            categoryFilter: "Todas",
            tipoImportacaoFilter: "Todas",
            periodFilter: "0",
            agruparPor: "categoria",
            metrica: "soma_valor",
            tipoGrafico: "bar",
            viewMode: "ambos",
            createdAt: new Date().toISOString(),
          },
          {
            id: "mold-2",
            name: "Consumo de Combustível GFV",
            description: "Análise de litragem e despesas de abastecimento da frota",
            categoryFilter: "Combustível",
            tipoImportacaoFilter: "combustivel_gfv",
            periodFilter: "0",
            agruparPor: "placa",
            metrica: "soma_quantidade",
            tipoGrafico: "bar",
            viewMode: "ambos",
            createdAt: new Date().toISOString(),
          },
          {
            id: "mold-3",
            name: "Receitas & Despesas SOFtran",
            description: "Controle de notas e manutenções importadas do SOFtran",
            categoryFilter: "Todas",
            tipoImportacaoFilter: "receitas_despesas",
            periodFilter: "0",
            agruparPor: "categoria",
            metrica: "soma_valor",
            tipoGrafico: "pie",
            viewMode: "ambos",
            createdAt: new Date().toISOString(),
          },
        ];
        setSavedMolds(defaultMolds);
        localStorage.setItem(`report_molds_${companyId}`, JSON.stringify(defaultMolds));
      }
    } catch (e) {
      console.error("Error loading report molds:", e);
    }
  }, [companyId]);

  // Group available months by year
  const monthsByYear = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    records.forEach((r) => {
      const parsed = parseRecordMonthYear(r);
      if (parsed) {
        if (!map[parsed.year]) map[parsed.year] = new Set();
        map[parsed.year].add(`${parsed.month}/${parsed.year}`);
      }
    });

    const result: Record<string, string[]> = {};
    Object.keys(map)
      .sort((a, b) => Number(b) - Number(a))
      .forEach((yr) => {
        result[yr] = Array.from(map[yr]).sort((a, b) => {
          const [mA] = a.split("/");
          const [mB] = b.split("/");
          return Number(mA) - Number(mB);
        });
      });
    return result;
  }, [records]);

  // Main Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 0. Filtro de Lote de Importação
      if (jobIdFilter && jobIdFilter !== "all") {
        if (r.import_job_id !== jobIdFilter) return false;
      }

      // 1. Categoria
      if (categoryFilter !== "Todas" && r.tipo_registro !== categoryFilter) {
        return false;
      }

      // 2. Tipo de Importação
      if (tipoImportacaoFilter !== "Todas") {
        const imp = getRecordImportType(r);
        if (tipoImportacaoFilter === "combustivel_gfv" && imp !== "combustivel_gfv") return false;
        if (tipoImportacaoFilter === "receitas_despesas" && imp !== "receitas_despesas") return false;
      }

      // 3. Período
      if (!matchesPeriod(r, selectedPeriod, customMonth)) {
        return false;
      }

      // 4. Placa
      if (placaFilter.trim()) {
        const term = placaFilter.toLowerCase().trim();
        const p = (r.placa || "").toLowerCase();
        const f = (r.numero_frota || "").toLowerCase();
        if (!p.includes(term) && !f.includes(term)) return false;
      }

      // 5. Fornecedor
      if (fornecedorFilter.trim()) {
        const term = fornecedorFilter.toLowerCase().trim();
        const forn = (r.fornecedor || "").toLowerCase();
        if (!forn.includes(term)) return false;
      }

      return true;
    });
  }, [records, jobIdFilter, categoryFilter, tipoImportacaoFilter, selectedPeriod, customMonth, placaFilter, fornecedorFilter]);

  // Overall metrics
  const totalValorGeral = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      return acc + getRecordFinancialValue(r, tipoImportacaoFilter === "combustivel_gfv");
    }, 0);
  }, [filteredRecords, tipoImportacaoFilter]);

  const totalQtyGeral = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0);
  }, [filteredRecords]);

  const totalRegistrosCount = filteredRecords.length;
  const mediaValorGeral = totalRegistrosCount > 0 ? totalValorGeral / totalRegistrosCount : 0;

  // Vehicle and Supplier Stats
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(filteredRecords);
  }, [filteredRecords]);

  const supplierStats = useMemo(() => {
    return calculateSupplierStats(filteredRecords, tipoImportacaoFilter);
  }, [filteredRecords, tipoImportacaoFilter]);

  // Aggregated Data for Analytical & Charts
  const aggregatedData = useMemo(() => {
    const groups: Record<
      string,
      { count: number; totalVal: number; totalQty: number; name: string }
    > = {};

    // When grouping by month, pre-populate all 12 months for the year so the chart renders a complete annual timeline
    if (agruparPor === "mes") {
      const availableYearsList = Object.keys(monthsByYear);
      let targetYear = availableYearsList.length > 0 ? availableYearsList[0] : String(new Date().getFullYear());
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, "0");
        const key = `${mStr}/${targetYear}`;
        groups[key] = { count: 0, totalVal: 0, totalQty: 0, name: key };
      }
    }

    filteredRecords.forEach((r) => {
      let key = "Outros";

      if (agruparPor === "categoria") {
        key = r.tipo_registro || "Sem Categoria";
      } else if (agruparPor === "tipo_importacao") {
        const imp = getRecordImportType(r);
        key = imp === "combustivel_gfv" ? "Combustível (GFV)" : "Receitas / Despesas (SOFtran)";
      } else if (agruparPor === "placa") {
        key = r.placa ? (r.numero_frota ? `${r.placa} (${r.numero_frota})` : r.placa) : "Sem Placa";
      } else if (agruparPor === "fornecedor") {
        key = r.fornecedor || "Não Informado";
      } else if (agruparPor === "mes") {
        const parsed = parseRecordMonthYear(r);
        key = parsed ? `${parsed.month}/${parsed.year}` : "Outros";
      } else if (agruparPor === "status") {
        key = r.status || "Pendente";
      }

      if (!groups[key]) {
        groups[key] = { count: 0, totalVal: 0, totalQty: 0, name: key };
      }

      groups[key].count += 1;
      groups[key].totalQty += Number(r.quantidade) || 0;
      groups[key].totalVal += getRecordFinancialValue(r, tipoImportacaoFilter === "combustivel_gfv");
    });

    const result = Object.values(groups).map((g) => {
      let metricValue = g.totalVal;
      if (metrica === "quantidade") metricValue = g.count;
      if (metrica === "media_valor") metricValue = g.count > 0 ? g.totalVal / g.count : 0;
      if (metrica === "soma_quantidade") metricValue = g.totalQty;

      const pct = totalValorGeral > 0 ? (g.totalVal / totalValorGeral) * 100 : 0;

      return {
        name: g.name,
        valor: Number(metricValue.toFixed(2)),
        count: g.count,
        totalQty: g.totalQty,
        valorTotal: g.totalVal,
        mediaValor: g.count > 0 ? g.totalVal / g.count : 0,
        percent: Number(pct.toFixed(1)),
      };
    });

    // If grouping by month, sort chronologically (Jan -> Dec)
    if (agruparPor === "mes") {
      result.sort((a, b) => {
        const pA = parseRecordMonthYear(a.name);
        const pB = parseRecordMonthYear(b.name);
        if (pA && pB) {
          const sA = Number(pA.year) * 100 + Number(pA.month);
          const sB = Number(pB.year) * 100 + Number(pB.month);
          return sA - sB;
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort by metric descending
      result.sort((a, b) => b.valor - a.valor);
    }
    return result;
  }, [filteredRecords, agruparPor, metrica, totalValorGeral, tipoImportacaoFilter]);

  // Selected Vehicle Detail
  const selectedVehicleDetail = useMemo(() => {
    if (!selectedVehicleDetailKey) return null;
    return vehicleStats.allVehicles.find((v) => v.key === selectedVehicleDetailKey) || null;
  }, [selectedVehicleDetailKey, vehicleStats]);

  // Save Mold
  const handleSaveMold = () => {
    if (!newMoldName.trim()) return;
    setSavingMold(true);

    const mold: ReportMold = {
      id: `mold-${Date.now()}`,
      name: newMoldName.trim(),
      description: newMoldDesc.trim() || `Configuração personalizada salva em ${new Date().toLocaleDateString("pt-BR")}`,
      categoryFilter,
      tipoImportacaoFilter,
      periodFilter: selectedPeriod,
      agruparPor,
      metrica,
      tipoGrafico,
      viewMode,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedMolds, mold];
    setSavedMolds(updated);
    try {
      localStorage.setItem(`report_molds_${companyId}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving mold:", e);
    }

    setNewMoldName("");
    setNewMoldDesc("");
    setSavingMold(false);
    setShowSaveModal(false);
  };

  const handleApplyMold = (mold: ReportMold) => {
    setCategoryFilter(mold.categoryFilter || "Todas");
    if (mold.tipoImportacaoFilter) setTipoImportacaoFilter(mold.tipoImportacaoFilter);
    setSelectedPeriod(mold.periodFilter || "0");
    setAgruparPor(mold.agruparPor || "categoria");
    setMetrica(mold.metrica || "soma_valor");
    setTipoGrafico(mold.tipoGrafico || "bar");
    setViewMode(mold.viewMode || "ambos");
    setReportViewTab("analitico");
  };

  const handleDeleteMold = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedMolds.filter((m) => m.id !== id);
    setSavedMolds(updated);
    try {
      localStorage.setItem(`report_molds_${companyId}`, JSON.stringify(updated));
    } catch (err) {
      console.error("Error deleting mold:", err);
    }
  };

  // Exports
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const periodLabel =
        selectedPeriod === "0"
          ? "Todo o Histórico"
          : selectedPeriod.startsWith("m:")
          ? `Mês ${selectedPeriod.replace("m:", "")}`
          : selectedPeriod === "custom" && customMonth
          ? `Mês ${customMonth}`
          : `Últimos ${selectedPeriod} dias`;

      await exportReportToExcel({
        records: filteredRecords,
        companyName: "Empresa",
        filters: {
          periodLabel,
          categoryFilter,
          tipoImportacaoFilter,
          selectedPeriod,
          customMonth,
          placaFilter,
          fornecedorFilter,
          agruparPor,
          metrica,
          tipoGrafico,
          viewMode,
        },
        aggregatedData,
        overallMetrics: {
          totalValorGeral,
          totalQtyGeral,
          totalRegistrosCount,
          mediaValorGeral,
        },
        vehicleStats,
      });
    } catch (err) {
      console.error("Error exporting to Excel:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const periodLabel =
        selectedPeriod === "0"
          ? "Todo o Histórico"
          : selectedPeriod.startsWith("m:")
          ? `Mês ${selectedPeriod.replace("m:", "")}`
          : selectedPeriod === "custom" && customMonth
          ? `Mês ${customMonth}`
          : `Últimos ${selectedPeriod} dias`;

      await exportReportToPDF({
        records: filteredRecords,
        companyName: "Empresa",
        filters: {
          periodLabel,
          categoryFilter,
          tipoImportacaoFilter,
          selectedPeriod,
          customMonth,
          placaFilter,
          fornecedorFilter,
          agruparPor,
          metrica,
          tipoGrafico,
          viewMode,
        },
        aggregatedData,
        overallMetrics: {
          totalValorGeral,
          totalQtyGeral,
          totalRegistrosCount,
          mediaValorGeral,
        },
        vehicleStats,
      });
    } catch (err) {
      console.error("Error exporting to PDF:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Reset Filters Helper
  const handleResetFilters = () => {
    setCategoryFilter("Todas");
    setTipoImportacaoFilter("Todas");
    setSelectedPeriod("0");
    setCustomMonth("");
    setPlacaFilter("");
    setFornecedorFilter("");
  };

  // Table Tab Filtered Records
  const tableFilteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return filteredRecords;
    const term = tableSearch.toLowerCase().trim();
    return filteredRecords.filter((r) => {
      return (
        (r.placa || "").toLowerCase().includes(term) ||
        (r.numero_frota || "").toLowerCase().includes(term) ||
        (r.tipo_registro || "").toLowerCase().includes(term) ||
        (r.fornecedor || "").toLowerCase().includes(term) ||
        (r.descricao_conta || "").toLowerCase().includes(term) ||
        (r.conta || "").toLowerCase().includes(term)
      );
    });
  }, [filteredRecords, tableSearch]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <FileSpreadsheet size={240} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Moldes & Dashboards de Importação
            </div>
            <h2 className="text-2xl font-black tracking-tight">Relatórios & Análise de Dados Importados</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Crie e salve moldes customizados de relatórios para analisar despesas, frotas, combustível e fornecedores com gráficos dinâmicos e exportação fácil.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              title="Compartilhar link de acesso protegido por PIN"
            >
              <Share2 className="w-4 h-4" /> Compartilhar Link
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Salvar Molde
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
              title="Exportar dados formatados para Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExportingExcel ? "Gerando Excel..." : "Exportar Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar relatório em PDF profissional"
            >
              <Printer className="w-4 h-4" />
              {isExportingPDF ? "Gerando PDF..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl p-2 border border-zinc-200/80 shadow-xs flex flex-wrap items-center gap-1.5 no-print">
        <button
          onClick={() => setReportViewTab("analitico")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "analitico"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analítico & Moldes
        </button>
        <button
          onClick={() => setReportViewTab("ranking")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "ranking"
              ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Award className="w-4 h-4" /> Ranking
        </button>
        <button
          onClick={() => setReportViewTab("tendencia")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "tendencia"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Tendência
        </button>
        <button
          onClick={() => setReportViewTab("veiculo_a_veiculo")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "veiculo_a_veiculo"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Truck className="w-4 h-4" /> Veículo a Veículo
        </button>
        <button
          onClick={() => setReportViewTab("cpk")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "cpk"
              ? "bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-md shadow-purple-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <Calculator className="w-4 h-4" /> Relatório CPK
        </button>
        <button
          onClick={() => setReportViewTab("tabelas")}
          className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            reportViewTab === "tabelas"
              ? "bg-gradient-to-r from-slate-700 to-zinc-900 text-white shadow-md shadow-zinc-500/20"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          <TableIcon className="w-4 h-4" /> Tabelas & Lançamentos
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {reportViewTab === "tendencia" && (
        <ReportTendenciaTab
          records={records}
          tipoImportacaoFilter={tipoImportacaoFilter}
          categoryFilter={categoryFilter}
          placaFilter={placaFilter}
          fornecedorFilter={fornecedorFilter}
          onResetFilters={handleResetFilters}
        />
      )}

      {reportViewTab === "ranking" && (
        <ReportRankingTab
          records={records}
          onSelectVehicle={(key) => setSelectedVehicleDetailKey(key)}
        />
      )}

      {reportViewTab === "veiculo_a_veiculo" && (
        <ReportVeiculoTab
          records={records}
          onSelectVehicle={(key) => setSelectedVehicleDetailKey(key)}
        />
      )}

      {reportViewTab === "cpk" && (
        <ReportCpkTab
          records={records}
          onSelectVehicle={(key) => setSelectedVehicleDetailKey(key)}
        />
      )}

      {reportViewTab === "analitico" && (
        <div className="space-y-6">
          {/* Saved Molds Carousel */}
          {savedMolds.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3 no-print">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Seus Moldes de Relatórios Salvos</span>
                </div>
                <span className="text-xs text-zinc-400 font-bold">
                  {savedMolds.length} modelo(s) disponível(is)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedMolds.map((mold) => (
                  <div
                    key={mold.id}
                    onClick={() => handleApplyMold(mold)}
                    className="p-4 rounded-2xl border border-zinc-200 hover:border-purple-300 bg-zinc-50 hover:bg-purple-50/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-extrabold text-zinc-900 text-xs group-hover:text-purple-700 transition-colors line-clamp-1">
                          {mold.name}
                        </h4>
                        <button
                          onClick={(e) => handleDeleteMold(mold.id, e)}
                          className="text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Excluir molde"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2">{mold.description}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-200/60 text-[10px] text-zinc-500">
                      <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        {mold.agruparPor}
                      </span>
                      <span className="font-semibold">{mold.metrica.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <ReportFilterToolbar
            tipoImportacaoFilter={tipoImportacaoFilter}
            setTipoImportacaoFilter={setTipoImportacaoFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={CATEGORIES}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            monthsByYear={monthsByYear}
            customMonth={customMonth}
            setCustomMonth={setCustomMonth}
            agruparPor={agruparPor}
            setAgruparPor={setAgruparPor}
            metrica={metrica}
            setMetrica={setMetrica}
            placaFilter={placaFilter}
            setPlacaFilter={setPlacaFilter}
            jobs={jobs}
            jobIdFilter={jobIdFilter}
            setJobIdFilter={setJobIdFilter}
          />

          {/* Overall Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Total em Despesas</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(totalValorGeral)}</p>
              <p className="text-[11px] text-zinc-400 mt-1">Soma financeira dos registros</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Volume Total (Litros)</span>
                <Fuel className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-900">
                {totalQtyGeral > 0 ? `${totalQtyGeral.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L` : "0,0 L"}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">Combustível e insumos</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Qtd de Lançamentos</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-900">{totalRegistrosCount}</p>
              <p className="text-[11px] text-zinc-400 mt-1">Total de linhas filtradas</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">Ticket Médio</span>
                <Calculator className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-purple-900">{formatCurrency(mediaValorGeral)}</p>
              <p className="text-[11px] text-zinc-400 mt-1">Média por lançamento</p>
            </div>
          </div>

          {/* Chart View */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">
                  Gráfico Analítico: Agrupamento por {agruparPor}
                </h3>
                <p className="text-xs text-zinc-500">
                  Métrica exibida: {metrica.replace("_", " ")}
                </p>
              </div>

              {/* Chart Switchers */}
              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 no-print">
                <button
                  onClick={() => setTipoGrafico("bar")}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    tipoGrafico === "bar" ? "bg-white text-blue-700 shadow-xs" : "text-zinc-600"
                  }`}
                  title="Barras"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTipoGrafico("pie")}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    tipoGrafico === "pie" ? "bg-white text-blue-700 shadow-xs" : "text-zinc-600"
                  }`}
                  title="Pizza"
                >
                  <PieChartIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTipoGrafico("line")}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    tipoGrafico === "line" ? "bg-white text-blue-700 shadow-xs" : "text-zinc-600"
                  }`}
                  title="Linha"
                >
                  <LineChartIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTipoGrafico("area")}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    tipoGrafico === "area" ? "bg-white text-blue-700 shadow-xs" : "text-zinc-600"
                  }`}
                  title="Área"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {aggregatedData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-zinc-400 font-semibold text-sm">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "bar" ? (
                    <BarChart data={aggregatedData.slice(0, 15)} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: "bold" }} angle={-25} textAnchor="end" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) =>
                          metrica.includes("valor") ? `R$ ${(val / 1000).toFixed(0)}k` : val.toLocaleString("pt-BR")
                        }
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          metrica.includes("valor") ? formatCurrency(Number(val)) : Number(val).toLocaleString("pt-BR"),
                          metrica.replace("_", " "),
                        ]}
                      />
                      <Bar dataKey="valor" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                        <LabelList
                          dataKey="valor"
                          position="top"
                          formatter={(val: any) =>
                            metrica.includes("valor")
                              ? Number(val) >= 1000
                                ? `R$ ${(Number(val) / 1000).toFixed(1)}k`
                                : `R$ ${Number(val).toFixed(0)}`
                              : Number(val).toLocaleString("pt-BR")
                          }
                          style={{ fill: "#1e293b", fontSize: "10px", fontWeight: "bold" }}
                        />
                        {aggregatedData.slice(0, 15).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : tipoGrafico === "pie" ? (
                    <PieChart>
                      <Pie
                        data={aggregatedData.slice(0, 8)}
                        dataKey="valor"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.percent}%`}
                      >
                        {aggregatedData.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [
                          metrica.includes("valor") ? formatCurrency(Number(val)) : Number(val).toLocaleString("pt-BR"),
                          metrica.replace("_", " "),
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  ) : tipoGrafico === "line" ? (
                    <LineChart data={aggregatedData.slice(0, 15)} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) =>
                          metrica.includes("valor") ? `R$ ${(val / 1000).toFixed(0)}k` : val.toLocaleString("pt-BR")
                        }
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          metrica.includes("valor") ? formatCurrency(Number(val)) : Number(val).toLocaleString("pt-BR"),
                          metrica.replace("_", " "),
                        ]}
                      />
                      <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }}>
                        <LabelList
                          dataKey="valor"
                          position="top"
                          formatter={(val: any) =>
                            metrica.includes("valor")
                              ? Number(val) >= 1000
                                ? `R$ ${(Number(val) / 1000).toFixed(1)}k`
                                : `R$ ${Number(val).toFixed(0)}`
                              : Number(val).toLocaleString("pt-BR")
                          }
                          style={{ fill: "#1e293b", fontSize: "10px", fontWeight: "bold" }}
                        />
                      </Line>
                    </LineChart>
                  ) : (
                    <AreaChart data={aggregatedData.slice(0, 15)} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) =>
                          metrica.includes("valor") ? `R$ ${(val / 1000).toFixed(0)}k` : val.toLocaleString("pt-BR")
                        }
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          metrica.includes("valor") ? formatCurrency(Number(val)) : Number(val).toLocaleString("pt-BR"),
                          metrica.replace("_", " "),
                        ]}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={3} fill="#bfdbfe" fillOpacity={0.5} dot={{ r: 4, fill: "#3b82f6" }}>
                        <LabelList
                          dataKey="valor"
                          position="top"
                          formatter={(val: any) =>
                            metrica.includes("valor")
                              ? Number(val) >= 1000
                                ? `R$ ${(Number(val) / 1000).toFixed(1)}k`
                                : `R$ ${Number(val).toFixed(0)}`
                              : Number(val).toLocaleString("pt-BR")
                          }
                          style={{ fill: "#1e293b", fontSize: "10px", fontWeight: "bold" }}
                        />
                      </Area>
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {reportViewTab === "tabelas" && (
        <div className="space-y-6">
          <ReportFilterToolbar
            tipoImportacaoFilter={tipoImportacaoFilter}
            setTipoImportacaoFilter={setTipoImportacaoFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={CATEGORIES}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            monthsByYear={monthsByYear}
            customMonth={customMonth}
            setCustomMonth={setCustomMonth}
            agruparPor={agruparPor}
            setAgruparPor={setAgruparPor}
            metrica={metrica}
            setMetrica={setMetrica}
            placaFilter={placaFilter}
            setPlacaFilter={setPlacaFilter}
          />

          <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-2xl border border-zinc-200/60 text-xs font-bold">
                  <button
                    onClick={() => setTableMode("agrupado")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      tableMode === "agrupado" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600"
                    }`}
                  >
                    Visão Agrupada ({agruparPor})
                  </button>
                  <button
                    onClick={() => setTableMode("todos_lancamentos")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      tableMode === "todos_lancamentos" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600"
                    }`}
                  >
                    Todos os Lançamentos ({tableFilteredRecords.length})
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {tableMode === "agrupado" ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                      <th className="p-3.5">Grupo ({agruparPor})</th>
                      <th className="p-3.5 text-center">Qtd Lançamentos</th>
                      <th className="p-3.5 text-center">Volume Total (Litros)</th>
                      <th className="p-3.5 text-right">Média por Registro (R$)</th>
                      <th className="p-3.5 text-right">Valor Total (R$)</th>
                      <th className="p-3.5 text-right">% do Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {aggregatedData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-400 font-semibold">
                          Nenhum dado encontrado.
                        </td>
                      </tr>
                    ) : (
                      aggregatedData.map((row) => (
                        <tr key={row.name} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-3.5 font-bold text-zinc-900">{row.name}</td>
                          <td className="p-3.5 text-center text-zinc-700">{row.count}</td>
                          <td className="p-3.5 text-center text-zinc-700">{row.totalQty.toFixed(2)}</td>
                          <td className="p-3.5 text-right text-zinc-700">{formatCurrency(row.mediaValor)}</td>
                          <td className="p-3.5 text-right font-black text-blue-700">{formatCurrency(row.valorTotal)}</td>
                          <td className="p-3.5 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-100 font-bold text-zinc-700 text-[11px]">
                              {row.percent}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                      <th className="p-3.5">Data</th>
                      <th className="p-3.5">Tipo Importação</th>
                      <th className="p-3.5">Categoria</th>
                      <th className="p-3.5">Placa / Frota</th>
                      <th className="p-3.5">Conta / Descrição</th>
                      <th className="p-3.5 text-center">Qtd</th>
                      <th className="p-3.5 text-right">Valor (R$)</th>
                      <th className="p-3.5">Fornecedor</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {tableFilteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-400 font-semibold">
                          Nenhum lançamento encontrado.
                        </td>
                      </tr>
                    ) : (
                      tableFilteredRecords.slice(0, 100).map((r) => {
                        const impType = getRecordImportType(r);
                        return (
                          <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="p-3.5 whitespace-nowrap text-zinc-600">{r.data || "-"}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              {impType === "combustivel_gfv" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Fuel className="w-3 h-3 text-amber-600" /> GFV (Combustível)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <FileSpreadsheet className="w-3 h-3 text-indigo-600" /> SOFtran (Despesas)
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-blue-700">{r.tipo_registro}</td>
                            <td className="p-3.5 font-extrabold text-zinc-900">
                              {r.placa} {r.numero_frota && `(${r.numero_frota})`}
                            </td>
                            <td className="p-3.5 text-zinc-600 max-w-xs truncate">{r.descricao_conta || r.conta || "-"}</td>
                            <td className="p-3.5 text-center font-semibold text-zinc-700">{r.quantidade}</td>
                            <td className="p-3.5 text-right font-black text-emerald-600">{formatCurrency(r.valor)}</td>
                            <td className="p-3.5 text-zinc-600 max-w-xs truncate">{r.fornecedor || "-"}</td>
                            <td className="p-3.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                                  r.status === "aprovado"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "conflito"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-zinc-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-base">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Salvar Molde de Relatório</span>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-700 mb-1">
                  Nome do Molde <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Relatório Mensal de Combustível"
                  value={newMoldName}
                  onChange={(e) => setNewMoldName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-700 mb-1">
                  Descrição do Molde (opcional)
                </label>
                <textarea
                  placeholder="Explicação simples sobre o objetivo deste relatório..."
                  value={newMoldDesc}
                  onChange={(e) => setNewMoldDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1">
                <p className="font-bold">Configuração que será salva:</p>
                <ul className="list-disc list-inside text-[11px] text-purple-800 space-y-0.5">
                  <li>Categoria: {categoryFilter}</li>
                  <li>Agrupar Por: {agruparPor}</li>
                  <li>Métrica: {metrica}</li>
                  <li>Gráfico: {tipoGrafico}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMold}
                disabled={savingMold}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingMold ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Salvar Molde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Drawer for Vehicle Trips & Cost Details */}
      {selectedVehicleDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2">
                  <Truck className="w-3.5 h-3.5" /> Detalhamento de Viagens & Custos do Veículo
                </div>
                <h3 className="text-xl font-black">
                  Veículo: {selectedVehicleDetail.placa}
                  {selectedVehicleDetail.numero_frota && ` (Frota ${selectedVehicleDetail.numero_frota})`}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Exibindo todas as {selectedVehicleDetail.viagensCount} viagens e abastecimentos.
                </p>
              </div>

              <button
                onClick={() => setSelectedVehicleDetailKey(null)}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  <p className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">Custo Total Geral</p>
                  <p className="text-lg font-black text-zinc-900 mt-1">{formatCurrency(selectedVehicleDetail.totalCost)}</p>
                </div>
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Custo Despesas (SOFtran)</p>
                  <p className="text-lg font-black text-emerald-950 mt-1">{formatCurrency(selectedVehicleDetail.costDespesas)}</p>
                </div>
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
                  <p className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Qtd Viagens / Abastecimentos</p>
                  <p className="text-lg font-black text-indigo-950 mt-1">{selectedVehicleDetail.viagensCount} viagens</p>
                </div>
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                  <p className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Consumo Total</p>
                  <p className="text-lg font-black text-amber-950 mt-1">
                    {selectedVehicleDetail.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L
                  </p>
                </div>
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wider">Km Rodado (GFV)</p>
                  <p className="text-lg font-black text-blue-950 mt-1">
                    {selectedVehicleDetail.kmRodadoCombustivel ? `${selectedVehicleDetail.kmRodadoCombustivel.toLocaleString("pt-BR")} km` : "Não Inf."}
                  </p>
                </div>
                <div className="bg-purple-100/80 p-4 rounded-2xl border border-purple-300">
                  <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">CPK do Veículo (R$/Km)</p>
                  <p className="text-lg font-black text-purple-950 mt-1">
                    {selectedVehicleDetail.cpk > 0 ? `R$ ${selectedVehicleDetail.cpk.toFixed(3)}/km` : "Sem Km"}
                  </p>
                </div>
              </div>

              {/* Categories Breakdown */}
              <div>
                <h4 className="font-extrabold text-zinc-900 text-sm mb-3">
                  Resumo de Custos por Categoria
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(selectedVehicleDetail.categories).map(([catName, catData]) => (
                    <div key={catName} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-800 text-xs">{catName}</p>
                        <p className="text-[11px] text-zinc-500">{catData.count} lançamento(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-700 text-sm">{formatCurrency(catData.valor)}</p>
                        <p className="text-[10px] text-zinc-400 font-bold">
                          {selectedVehicleDetail.totalCost > 0
                            ? `${((catData.valor / selectedVehicleDetail.totalCost) * 100).toFixed(1)}% do total`
                            : "0%"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trips Table */}
              <div>
                <h4 className="font-extrabold text-zinc-900 text-sm mb-3">
                  Lista Detalhada de Viagens e Lançamentos
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-zinc-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-600 border-b border-zinc-200 uppercase text-[10px] font-extrabold">
                        <th className="p-3">Data</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Descrição / Conta</th>
                        <th className="p-3">Fornecedor / Posto</th>
                        <th className="p-3 text-center">Litros / Qtd</th>
                        <th className="p-3 text-right">Valor (R$)</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium">
                      {selectedVehicleDetail.items.map((r, i) => (
                        <tr key={r.id || i} className="hover:bg-zinc-50">
                          <td className="p-3 whitespace-nowrap text-zinc-600">{r.data || "-"}</td>
                          <td className="p-3 font-bold text-blue-700">{r.tipo_registro}</td>
                          <td className="p-3 text-zinc-800">{r.descricao_conta || r.conta || "-"}</td>
                          <td className="p-3 text-zinc-600">{r.fornecedor || "-"}</td>
                          <td className="p-3 text-center text-zinc-700 font-bold">
                            {Number(r.quantidade || 0) > 0 ? `${Number(r.quantidade).toFixed(1)}` : "-"}
                          </td>
                          <td className="p-3 text-right font-black text-zinc-900">{formatCurrency(Number(r.valor) || 0)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 p-4 border-t border-zinc-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedVehicleDetailKey(null)}
                className="px-5 py-2 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Report Modal */}
      <ShareReportModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        companyId={companyId}
        currentTitle={`Relatório de Análise - ${categoryFilter !== "Todas" ? categoryFilter : "Geral"}`}
        filters={{
          categoryFilter,
          tipoImportacaoFilter,
          selectedPeriod,
          customMonth,
          placaFilter,
          fornecedorFilter,
          agruparPor,
          metrica,
          tipoGrafico,
          viewMode,
        }}
        records={records}
        overallMetrics={{
          totalValorGeral,
          totalQtyGeral,
          totalRegistrosCount,
          mediaValorGeral,
        }}
      />
    </div>
  );
}
