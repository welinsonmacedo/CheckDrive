import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
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

export default function SharedReportPage() {
  const { shareId } = useParams<{ shareId: string }>();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SharedReportConfig | null>(null);

  // Authentication PIN state
  const [inputPin, setInputPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState("");

  // Report Filter State (initialized from shared report)
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [tipoImportacaoFilter, setTipoImportacaoFilter] = useState<string>("Todas");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("0");
  const [customMonth, setCustomMonth] = useState<string>("");
  const [placaFilter, setPlacaFilter] = useState<string>("");
  const [fornecedorFilter, setFornecedorFilter] = useState<string>("");
  const [agruparPor, setAgruparPor] = useState<"categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status">("categoria");
  const [metrica, setMetrica] = useState<"soma_valor" | "quantidade" | "media_valor" | "soma_quantidade">("soma_valor");
  const [tipoGrafico, setTipoGrafico] = useState<"bar" | "pie" | "line" | "area" | "table">("bar");
  const [viewMode, setViewMode] = useState<"agrupado" | "detalhado">("agrupado");
  const [tableSearch, setTableSearch] = useState<string>("");

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
          if (data.filters.viewMode) setViewMode(data.filters.viewMode as any);
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

  // Available options
  const availablePlacas = useMemo(() => {
    const setP = new Set<string>();
    records.forEach((r) => {
      if (r.placa) setP.add(r.placa.toUpperCase());
    });
    return Array.from(setP).sort();
  }, [records]);

  const availableFornecedores = useMemo(() => {
    const setF = new Set<string>();
    records.forEach((r) => {
      if (r.fornecedor) setF.add(r.fornecedor.trim());
    });
    return Array.from(setF).sort();
  }, [records]);

  // Period label
  const getPeriodLabel = () => {
    if (selectedPeriod === "0") return "Todo o Período";
    if (selectedPeriod.startsWith("m:")) return `Mês ${selectedPeriod.replace("m:", "")}`;
    return `Últimos ${selectedPeriod} dias`;
  };

  // Filter records
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
      // 5. Período
      if (selectedPeriod !== "0" && r.data) {
        if (selectedPeriod.startsWith("m:")) {
          const targetMonthYear = selectedPeriod.replace("m:", "");
          const recordDate = r.data.trim();
          if (recordDate.includes("-")) {
            const parts = recordDate.split("-");
            if (parts.length >= 2) {
              const ym = parts[0].length === 4 ? `${parts[1].padStart(2, "0")}/${parts[0]}` : `${parts[1].padStart(2, "0")}/${parts[2]}`;
              if (ym !== targetMonthYear) return false;
            }
          } else if (recordDate.includes("/")) {
            const parts = recordDate.split("/");
            if (parts.length === 3) {
              const ym = `${parts[1].padStart(2, "0")}/${parts[2]}`;
              if (ym !== targetMonthYear) return false;
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
  }, [records, categoryFilter, tipoImportacaoFilter, placaFilter, fornecedorFilter, selectedPeriod]);

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

  // Aggregated data
  const aggregatedData = useMemo(() => {
    const groups: Record<string, { count: number; valorTotal: number; totalQty: number }> = {};

    filteredRecords.forEach((r) => {
      let key = "Outros";
      if (agruparPor === "categoria") key = r.tipo_registro || "Sem Categoria";
      else if (agruparPor === "tipo_importacao") key = getImportTypeLabel(getRecordImportType(r));
      else if (agruparPor === "placa") key = r.placa ? r.placa.toUpperCase() : "Sem Placa";
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

  // Vehicle Stats
  const vehicleStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValor: number; totalLitros: number; totalKm: number }> = {};

    filteredRecords.forEach((r) => {
      const p = r.placa ? r.placa.toUpperCase() : "SEM PLACA";
      if (!stats[p]) {
        stats[p] = { count: 0, totalValor: 0, totalLitros: 0, totalKm: 0 };
      }
      stats[p].count += 1;
      stats[p].totalValor += Number(r.valor) || 0;
      stats[p].totalLitros += Number(r.quantidade) || 0;
      stats[p].totalKm += Number(r.km_rodado) || 0;
    });

    return Object.entries(stats)
      .map(([placa, s]) => ({
        placa,
        count: s.count,
        totalValor: s.totalValor,
        totalLitros: s.totalLitros,
        totalKm: s.totalKm,
        mediaKmL: s.totalLitros > 0 && s.totalKm > 0 ? s.totalKm / s.totalLitros : 0,
      }))
      .sort((a, b) => b.totalValor - a.totalValor);
  }, [filteredRecords]);

  // Table records search
  const tableFilteredRecords = useMemo(() => {
    if (!tableSearch) return filteredRecords;
    const term = tableSearch.toLowerCase();
    return filteredRecords.filter(
      (r) =>
        r.placa?.toLowerCase().includes(term) ||
        r.tipo_registro?.toLowerCase().includes(term) ||
        r.fornecedor?.toLowerCase().includes(term) ||
        r.descricao_conta?.toLowerCase().includes(term)
    );
  }, [filteredRecords, tableSearch]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportReportToExcel({
        filters: {
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
      alert("Erro ao exportar Excel: " + e.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportReportToPDF({
        filters: {
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
      alert("Erro ao exportar PDF: " + e.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
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

  // Unlocked Report Display
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
                  <Lock className="w-3.5 h-3.5" /> Visão Congelada (Filtros Bloqueados)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                  <Unlock className="w-3.5 h-3.5" /> Filtros Interativos Liberados
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{report.title}</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Gerado via CheckDrive • {getPeriodLabel()} • {totalRegistrosCount} registros localizados
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

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-900 text-sm">Filtros & Parâmetros de Análise</h3>
            {filtersDisabled && (
              <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold border border-purple-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Travado pelo Emissor
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

            {/* Período */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Período</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="0">Todo o Histórico</option>
                <option value="30">Últimos 30 Dias</option>
                <option value="60">Últimos 60 Dias</option>
                <option value="90">Últimos 90 Dias</option>
                <option value="365">Último Ano (365 Dias)</option>
              </select>
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
          <p className="text-[11px] text-slate-500 mt-1">Total de registros extraídos</p>
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

      {/* Data Table */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Detalhamento dos Registros</h3>
            <p className="text-xs text-slate-500">Tabela completa de itens e lançamentos do relatório.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, categoria..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <th className="p-3 rounded-r-xl">Fornecedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableFilteredRecords.slice(0, 100).map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-medium text-slate-700">{r.data || "-"}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                      {r.tipo_registro}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900">{r.placa || "-"}</td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{r.descricao_conta || r.conta || "-"}</td>
                  <td className="p-3 text-right font-medium text-slate-700">{Number(r.quantidade || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-slate-900">{formatCurrency(Number(r.valor || 0))}</td>
                  <td className="p-3 text-slate-600 truncate max-w-xs">{r.fornecedor || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableFilteredRecords.length > 100 && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-100">
              Exibindo os primeiros 100 de {tableFilteredRecords.length} registros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
