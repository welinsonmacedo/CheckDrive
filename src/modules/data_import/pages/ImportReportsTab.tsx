import React, { useEffect, useState, useMemo } from "react";
import { exportReportToExcel, exportReportToPDF } from "../utils/exportReportUtils";
import {
  FileSpreadsheet,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Truck,
  Fuel,
  Building2,
  Plus,
  Trash2,
  Download,
  Printer,
  Sparkles,
  Filter,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  X,
  FileText,
  DollarSign,
  Hash,
  Calculator,
  RefreshCw,
  Flame,
  Award,
  Navigation,
  Info,
  ArrowUpRight,
  ArrowDownRight,
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
import { ImportRecord, ReportMold, RecordCategory } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
}

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

export function getRecordImportType(r: ImportRecord): "combustivel_gfv" | "receitas_despesas" {
  if (
    r.conta === "Consumo de Combustível" ||
    (r.observacoes && (r.observacoes.includes("GFV") || r.observacoes.includes("Consumo por Veículo"))) ||
    r.preco_litro !== undefined ||
    r.media_km_l !== undefined
  ) {
    return "combustivel_gfv";
  }
  return "receitas_despesas";
}

export function getImportTypeLabel(type: "combustivel_gfv" | "receitas_despesas" | string): string {
  if (type === "combustivel_gfv") return "Consumo de Combustível (GFV)";
  if (type === "receitas_despesas") return "Receitas e Despesas (SOFtran)";
  return type;
}

export default function ImportReportsTab({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [molds, setMolds] = useState<ReportMold[]>([]);
  const [activeMoldId, setActiveMoldId] = useState<string | null>("mold_default_1");

  // Filter & Config state
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [tipoImportacaoFilter, setTipoImportacaoFilter] = useState<string>("Todas"); // "Todas" | "combustivel_gfv" | "receitas_despesas"
  const [selectedPeriod, setSelectedPeriod] = useState<string>("0"); // "0", "30", "60", "90", "365", "m:01/2026", "custom", etc.
  const [customMonth, setCustomMonth] = useState<string>(""); // "YYYY-MM"
  const [placaFilter, setPlacaFilter] = useState<string>("");
  const [fornecedorFilter, setFornecedorFilter] = useState<string>("");
  const [agruparPor, setAgruparPor] = useState<"categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status">("categoria");
  const [metrica, setMetrica] = useState<"soma_valor" | "quantidade" | "media_valor" | "soma_quantidade">("soma_valor");
  const [tipoGrafico, setTipoGrafico] = useState<"bar" | "pie" | "line" | "area" | "table">("bar");
  const [viewMode, setViewMode] = useState<"agrupado" | "detalhado">("agrupado");
  const [tableSearch, setTableSearch] = useState<string>("");

  // Top 10 Vehicles Report State
  const [topVehiclesTab, setTopVehiclesTab] = useState<"maior" | "menor" | "lado_a_lado">("lado_a_lado");
  const [selectedVehicleDetailKey, setSelectedVehicleDetailKey] = useState<string | null>(null);

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newMoldName, setNewMoldName] = useState("");
  const [newMoldDesc, setNewMoldDesc] = useState("");
  const [savingMold, setSavingMold] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, mldList] = await Promise.all([
        ImportService.getImportRecords(companyId),
        ImportService.getReportMolds(companyId),
      ]);
      setRecords(recs);
      setMolds(mldList);
    } catch (e) {
      console.error("Error loading report data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Apply a mold's settings
  const applyMold = (mold: ReportMold) => {
    setActiveMoldId(mold.id);
    if (mold.categoria_filtro) setCategoryFilter(mold.categoria_filtro);
    if (mold.tipo_importacao_filtro) setTipoImportacaoFilter(mold.tipo_importacao_filtro);
    if (mold.periodo_dias !== undefined) setSelectedPeriod(String(mold.periodo_dias));
    if (mold.placa_filtro !== undefined) setPlacaFilter(mold.placa_filtro);
    if (mold.fornecedor_filtro !== undefined) setFornecedorFilter(mold.fornecedor_filtro);
    if (mold.agrupar_por) setAgruparPor(mold.agrupar_por);
    if (mold.metrica) setMetrica(mold.metrica);
    if (mold.tipo_grafico) setTipoGrafico(mold.tipo_grafico);

    if (mold.id === "mold_default_top_high") {
      setTopVehiclesTab("maior");
    } else if (mold.id === "mold_default_top_low") {
      setTopVehiclesTab("menor");
    }
  };

  // Helper for period label
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

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Category filter
      if (categoryFilter !== "Todas" && r.tipo_registro !== categoryFilter) return false;

      // Tipo de Importação filter
      if (tipoImportacaoFilter !== "Todas") {
        const rImpType = getRecordImportType(r);
        if (rImpType !== tipoImportacaoFilter) return false;
      }

      // Placa filter
      if (placaFilter.trim()) {
        const pTerm = placaFilter.toLowerCase().trim();
        const rPlaca = (r.placa || "").toLowerCase();
        const rFrota = (r.numero_frota || "").toLowerCase();
        if (!rPlaca.includes(pTerm) && !rFrota.includes(pTerm)) return false;
      }

      // Fornecedor filter
      if (fornecedorFilter.trim()) {
        const fTerm = fornecedorFilter.toLowerCase().trim();
        const rForn = (r.fornecedor || "").toLowerCase();
        if (!rForn.includes(fTerm)) return false;
      }

      // Period / Month filter
      if (selectedPeriod === "custom" && customMonth) {
        const [cYear, cMonth] = customMonth.split("-");
        const parsed = parseRecordMonthYear(r.data);
        if (!parsed || parsed.month !== cMonth || parsed.year !== cYear) return false;
      } else if (selectedPeriod.startsWith("m:")) {
        const monthYearStr = selectedPeriod.substring(2); // e.g. "01/2026"
        const [targetMonth, targetYear] = monthYearStr.split("/");
        const parsed = parseRecordMonthYear(r.data);
        if (!parsed || parsed.month !== targetMonth || parsed.year !== targetYear) return false;
      } else {
        const days = Number(selectedPeriod);
        if (days > 0 && r.data) {
          const rDate = new Date(r.data).getTime();
          const now = new Date().getTime();
          const diffDays = (now - rDate) / (1000 * 3600 * 24);
          if (diffDays > days) return false;
        }
      }

      return true;
    });
  }, [records, categoryFilter, tipoImportacaoFilter, placaFilter, fornecedorFilter, selectedPeriod, customMonth]);

  // Aggregated data for grouping & charts
  const aggregatedData = useMemo(() => {
    const map: Record<
      string,
      { key: string; totalValor: number; totalQty: number; count: number; items: ImportRecord[] }
    > = {};

    filteredRecords.forEach((r) => {
      let groupKey = "Outros";
      if (agruparPor === "categoria") groupKey = r.tipo_registro || "Sem Categoria";
      else if (agruparPor === "tipo_importacao") {
        const impType = getRecordImportType(r);
        groupKey = getImportTypeLabel(impType);
      }
      else if (agruparPor === "placa") groupKey = r.placa ? `${r.placa}${r.numero_frota ? ` (${r.numero_frota})` : ""}` : "Sem Placa";
      else if (agruparPor === "fornecedor") groupKey = r.fornecedor || "Não informado";
      else if (agruparPor === "status") groupKey = r.status.toUpperCase();
      else if (agruparPor === "mes") {
        if (r.data) {
          const parts = r.data.split("-");
          if (parts.length >= 2) {
            groupKey = `${parts[1]}/${parts[0]}`; // MM/YYYY
          } else {
            groupKey = r.data.substring(0, 7);
          }
        } else {
          groupKey = "Sem Data";
        }
      }

      if (!map[groupKey]) {
        map[groupKey] = { key: groupKey, totalValor: 0, totalQty: 0, count: 0, items: [] };
      }

      map[groupKey].totalValor += Number(r.valor) || 0;
      map[groupKey].totalQty += Number(r.quantidade) || 0;
      map[groupKey].count += 1;
      map[groupKey].items.push(r);
    });

    const totalSumAll = Object.values(map).reduce((sum, g) => sum + g.totalValor, 0);

    return Object.values(map)
      .map((g) => {
        let metricValue = g.totalValor;
        if (metrica === "quantidade") metricValue = g.count;
        if (metrica === "media_valor") metricValue = g.count > 0 ? g.totalValor / g.count : 0;
        if (metrica === "soma_quantidade") metricValue = g.totalQty;

        const percent = totalSumAll > 0 ? (g.totalValor / totalSumAll) * 100 : 0;

        return {
          name: g.key,
          valorTotal: g.totalValor,
          totalQty: g.totalQty,
          count: g.count,
          mediaValor: g.count > 0 ? g.totalValor / g.count : 0,
          value: Math.round(metricValue * 100) / 100,
          percent: Math.round(percent * 10) / 10,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords, agruparPor, metrica]);

  // Vehicle Stats for Top 10 Highest & Lowest Cost Reports
  const vehicleStats = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        placa: string;
        numero_frota?: string;
        viagensCount: number; // Cada abastecimento / lançamento = 1 viagem
        totalCost: number;
        totalLiters: number;
        categories: Record<string, { count: number; valor: number; liters: number }>;
        items: ImportRecord[];
      }
    > = {};

    filteredRecords.forEach((r) => {
      const rawPlaca = r.placa?.trim().toUpperCase() || "SEM PLACA";
      const frota = r.numero_frota?.trim() || "";
      const key = frota ? `${rawPlaca} (Frota ${frota})` : rawPlaca;

      if (!map[key]) {
        map[key] = {
          key,
          placa: rawPlaca,
          numero_frota: frota,
          viagensCount: 0,
          totalCost: 0,
          totalLiters: 0,
          categories: {},
          items: [],
        };
      }

      map[key].viagensCount += 1;
      const val = Number(r.valor) || 0;
      const qty = Number(r.quantidade) || 0;
      map[key].totalCost += val;
      map[key].totalLiters += qty;
      map[key].items.push(r);

      const cat = r.tipo_registro || "Outros";
      if (!map[key].categories[cat]) {
        map[key].categories[cat] = { count: 0, valor: 0, liters: 0 };
      }
      map[key].categories[cat].count += 1;
      map[key].categories[cat].valor += val;
      map[key].categories[cat].liters += qty;
    });

    const allVehicles = Object.values(map);

    const top10Highest = [...allVehicles]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    const top10Lowest = [...allVehicles]
      .filter((v) => v.totalCost > 0)
      .sort((a, b) => a.totalCost - b.totalCost)
      .slice(0, 10);

    return {
      allVehicles,
      top10Highest,
      top10Lowest,
    };
  }, [filteredRecords]);

  const selectedVehicleDetail = useMemo(() => {
    if (!selectedVehicleDetailKey) return null;
    return vehicleStats.allVehicles.find((v) => v.key === selectedVehicleDetailKey) || null;
  }, [selectedVehicleDetailKey, vehicleStats]);

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
                  {vehicle.viagensCount} {vehicle.viagensCount === 1 ? "viagem (abastecimento)" : "viagens (abastecimentos)"}
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
              Média: {formatCurrency(avgCostPerTrip)} / viagem
            </p>
          </div>
        </div>

        {/* Cost Breakdown Description / Detalhamento de Custos */}
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-extrabold text-zinc-700 flex items-center justify-between">
            <span>Detalhamento dos Custos por Categoria:</span>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-50 border border-zinc-200/80"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="font-semibold text-zinc-700">{cat.name}:</span>
                <span className="font-black text-zinc-900">{formatCurrency(cat.valor)}</span>
                <span className="text-[10px] text-zinc-400 font-bold">({cat.percent.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-medium">
            {vehicle.items.length} lançamento(s) vinculados (cada lançamento = 1 viagem)
          </span>
          <button
            onClick={() => setSelectedVehicleDetailKey(vehicle.key)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver Viagens / Detalhes <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Overall Metrics
  const totalValorGeral = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (Number(r.valor) || 0), 0),
    [filteredRecords]
  );
  const totalQtyGeral = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (Number(r.quantidade) || 0), 0),
    [filteredRecords]
  );
  const totalRegistrosCount = filteredRecords.length;
  const mediaValorGeral = totalRegistrosCount > 0 ? totalValorGeral / totalRegistrosCount : 0;
  const topGroup = aggregatedData.length > 0 ? aggregatedData[0] : null;

  // Filter table by search
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

  const handleSaveMold = async () => {
    if (!newMoldName.trim()) {
      alert("Por favor, digite um nome para o molde de relatório.");
      return;
    }
    setSavingMold(true);
    try {
      const created = await ImportService.saveReportMold({
        empresa_id: companyId,
        nome: newMoldName,
        descricao: newMoldDesc,
        icon: "FileSpreadsheet",
        categoria_filtro: categoryFilter,
        tipo_importacao_filtro: tipoImportacaoFilter,
        periodo_dias: Number(selectedPeriod) || 0,
        placa_filtro: placaFilter,
        fornecedor_filtro: fornecedorFilter,
        agrupar_por: agruparPor,
        metrica,
        tipo_grafico: tipoGrafico,
      });

      setMolds((prev) => [...prev, created]);
      setActiveMoldId(created.id);
      setShowSaveModal(false);
      setNewMoldName("");
      setNewMoldDesc("");
    } catch (e: any) {
      alert("Erro ao salvar molde: " + e.message);
    } finally {
      setSavingMold(false);
    }
  };

  const handleDeleteCustomMold = async (moldId: string, moldName: string) => {
    if (window.confirm(`Deseja excluir o molde de relatório "${moldName}"?`)) {
      try {
        await ImportService.deleteReportMold(moldId);
        setMolds((prev) => prev.filter((m) => m.id !== moldId));
        if (activeMoldId === moldId) setActiveMoldId("mold_default_1");
      } catch (e: any) {
        alert("Erro ao remover molde: " + e.message);
      }
    }
  };

  // Export Excel (.xlsx) profissional
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
      console.error("Erro ao exportar Excel:", e);
      alert("Ocorreu um erro ao gerar a planilha Excel: " + (e?.message || e));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export PDF (.pdf) profissional
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
      console.error("Erro ao exportar PDF:", e);
      alert("Ocorreu um erro ao gerar o relatório PDF: " + (e?.message || e));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const renderLabelValue = (val: number) => {
    if (metrica.includes("valor")) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val);
    }
    return val;
  };

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

      {/* Gallery of Report Models / Moldes */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-zinc-900 text-base">Moldes e Modelos de Relatórios</h3>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-bold">
              {molds.length} disponíveis
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {molds.map((mold) => {
            const isActive = activeMoldId === mold.id;
            return (
              <div
                key={mold.id}
                onClick={() => applyMold(mold)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isActive
                    ? "bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-zinc-50/60 border-zinc-200/80 hover:bg-white hover:border-zinc-300 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`p-2 rounded-xl text-xs font-bold ${
                        isActive ? "bg-blue-600 text-white" : "bg-zinc-200/80 text-zinc-700"
                      }`}
                    >
                      {mold.icon === "Fuel" ? (
                        <Fuel className="w-4 h-4" />
                      ) : mold.icon === "Truck" ? (
                        <Truck className="w-4 h-4" />
                      ) : mold.icon === "Building2" ? (
                        <Building2 className="w-4 h-4" />
                      ) : mold.icon === "TrendingUp" ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <PieChartIcon className="w-4 h-4" />
                      )}
                    </span>
                    {mold.e_padrao ? (
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-md">
                        Padrão
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomMold(mold.id, mold.nome);
                        }}
                        className="text-zinc-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Excluir Molde Customizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="font-bold text-zinc-900 text-xs line-clamp-1">{mold.nome}</h4>
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-tight">
                    {mold.descricao || "Sem descrição"}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] font-semibold text-zinc-600">
                  <span className="capitalize">
                    Agrup: <strong>{mold.agrupar_por}</strong>
                  </span>
                  <span className="capitalize text-blue-600 font-bold">{mold.tipo_grafico}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Customizer Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtros e Configuração do Relatório Atual</span>
          </div>

          {/* Quick Sub-tabs for Import Type */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60">
            <button
              onClick={() => setTipoImportacaoFilter("Todas")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipoImportacaoFilter === "Todas"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Todas as Importações
            </button>
            <button
              onClick={() => setTipoImportacaoFilter("combustivel_gfv")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tipoImportacaoFilter === "combustivel_gfv"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Fuel className="w-3.5 h-3.5" /> Consumo de Combustível (GFV)
            </button>
            <button
              onClick={() => setTipoImportacaoFilter("receitas_despesas")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tipoImportacaoFilter === "receitas_despesas"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Receitas e Despesas (SOFtran)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Tipo de Importação Dropdown */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Tipo da Importação
            </label>
            <select
              value={tipoImportacaoFilter}
              onChange={(e) => setTipoImportacaoFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Todas">Todas as Importações</option>
              <option value="combustivel_gfv">Consumo de Combustível (GFV)</option>
              <option value="receitas_despesas">Receitas e Despesas (SOFtran)</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Período / Mês */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1 flex items-center justify-between">
              <span>Período / Mês</span>
              {selectedPeriod.startsWith("m:") && (
                <span className="text-[10px] text-blue-600 font-bold">Por Mês</span>
              )}
            </label>
            <div className="space-y-1">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <optgroup label="Períodos Relativos">
                  <option value="0">Todo o Histórico</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="60">Últimos 60 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Este Ano (365d)</option>
                </optgroup>
                <optgroup label="Ano 2026">
                  <option value="m:01/2026">Mês 01/2026 (Janeiro)</option>
                  <option value="m:02/2026">Mês 02/2026 (Fevereiro)</option>
                  <option value="m:03/2026">Mês 03/2026 (Março)</option>
                  <option value="m:04/2026">Mês 04/2026 (Abril)</option>
                  <option value="m:05/2026">Mês 05/2026 (Maio)</option>
                  <option value="m:06/2026">Mês 06/2026 (Junho)</option>
                  <option value="m:07/2026">Mês 07/2026 (Julho)</option>
                  <option value="m:08/2026">Mês 08/2026 (Agosto)</option>
                  <option value="m:09/2026">Mês 09/2026 (Setembro)</option>
                  <option value="m:10/2026">Mês 10/2026 (Outubro)</option>
                  <option value="m:11/2026">Mês 11/2026 (Novembro)</option>
                  <option value="m:12/2026">Mês 12/2026 (Dezembro)</option>
                </optgroup>
                <optgroup label="Ano 2025">
                  <option value="m:01/2025">Mês 01/2025 (Janeiro)</option>
                  <option value="m:02/2025">Mês 02/2025 (Fevereiro)</option>
                  <option value="m:03/2025">Mês 03/2025 (Março)</option>
                  <option value="m:04/2025">Mês 04/2025 (Abril)</option>
                  <option value="m:05/2025">Mês 05/2025 (Maio)</option>
                  <option value="m:06/2025">Mês 06/2025 (Junho)</option>
                  <option value="m:07/2025">Mês 07/2025 (Julho)</option>
                  <option value="m:08/2025">Mês 08/2025 (Agosto)</option>
                  <option value="m:09/2025">Mês 09/2025 (Setembro)</option>
                  <option value="m:10/2025">Mês 10/2025 (Outubro)</option>
                  <option value="m:11/2025">Mês 11/2025 (Novembro)</option>
                  <option value="m:12/2025">Mês 12/2025 (Dezembro)</option>
                </optgroup>
                <optgroup label="Personalizado">
                  <option value="custom">Selecionar Mês Específico (Seletor)</option>
                </optgroup>
              </select>

              {selectedPeriod === "custom" && (
                <input
                  type="month"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-300 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Agrupar Por */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Agrupar Dados Por
            </label>
            <select
              value={agruparPor}
              onChange={(e) => setAgruparPor(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="categoria">Categoria</option>
              <option value="tipo_importacao">Tipo de Importação (GFV vs SOFtran)</option>
              <option value="placa">Placa / Frota</option>
              <option value="fornecedor">Fornecedor / Posto</option>
              <option value="mes">Mês / Período</option>
              <option value="status">Status do Lançamento</option>
            </select>
          </div>

          {/* Métrica */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Métrica Principal
            </label>
            <select
              value={metrica}
              onChange={(e) => setMetrica(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="soma_valor">Soma Valor Total (R$)</option>
              <option value="quantidade">Quantidade de Lançamentos</option>
              <option value="media_valor">Valor Médio por Lançamento (R$)</option>
              <option value="soma_quantidade">Soma Unidades / Litros</option>
            </select>
          </div>

          {/* Tipo de Gráfico */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Exibição Gráfica
            </label>
            <select
              value={tipoGrafico}
              onChange={(e) => setTipoGrafico(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-purple-50/80 border border-purple-200 text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="bar">Gráfico de Barras</option>
              <option value="pie">Gráfico de Pizza</option>
              <option value="line">Gráfico de Linhas</option>
              <option value="area">Gráfico de Área</option>
              <option value="table">Apenas Tabela</option>
            </select>
          </div>

          {/* Placa Search Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Filtro Placa / Frota
            </label>
            <input
              type="text"
              placeholder="Ex: ABC1D23"
              value={placaFilter}
              onChange={(e) => setPlacaFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-zinc-500">Valor Total Filtrado</p>
            <h4 className="text-xl font-black text-zinc-900 mt-0.5">{formatCurrency(totalValorGeral)}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-zinc-500">Total de Registros</p>
            <h4 className="text-xl font-black text-zinc-900 mt-0.5">{totalRegistrosCount} lançamentos</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-zinc-500">Custo Médio por Item</p>
            <h4 className="text-xl font-black text-zinc-900 mt-0.5">{formatCurrency(mediaValorGeral)}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-zinc-500">Maior Custo ({agruparPor})</p>
            <h4 className="text-sm font-black text-zinc-900 mt-0.5 line-clamp-1">
              {topGroup ? `${topGroup.name}: ${formatCurrency(topGroup.valorTotal)}` : "Sem dados"}
            </h4>
          </div>
        </div>
      </div>

      {/* Top 10 Vehicles Cost Analysis Block */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold mb-1.5 border border-rose-200">
              <Truck className="w-3.5 h-3.5" /> Relatório Especial de Frotas & Veículos
            </div>
            <h3 className="text-lg font-black text-zinc-900">
              Top 10 Veículos de Maior e Menor Custo
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Análise com detalhamento descritivo de custos por categoria e contagem de viagens (considerando <strong>cada abastecimento / lançamento como 1 viagem</strong>).
            </p>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200/80 shrink-0">
            <button
              onClick={() => setTopVehiclesTab("lado_a_lado")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                topVehiclesTab === "lado_a_lado"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Lado a Lado
            </button>
            <button
              onClick={() => setTopVehiclesTab("maior")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                topVehiclesTab === "maior"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Top 10 Maior Custo
            </button>
            <button
              onClick={() => setTopVehiclesTab("menor")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                topVehiclesTab === "menor"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" /> Top 10 Menor Custo
            </button>
          </div>
        </div>

        {topVehiclesTab === "lado_a_lado" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Maior Custo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  <h4 className="font-black text-rose-950 text-sm">10 Veículos com Maior Custo</h4>
                </div>
                <span className="text-[11px] font-bold text-rose-800 bg-white/80 px-2.5 py-0.5 rounded-md border border-rose-200">
                  {vehicleStats.top10Highest.length} veículos
                </span>
              </div>

              {vehicleStats.top10Highest.length === 0 ? (
                <p className="text-xs text-zinc-400 italic p-4 text-center">Nenhum veículo encontrado para este filtro.</p>
              ) : (
                <div className="space-y-3">
                  {vehicleStats.top10Highest.map((v, i) => renderVehicleCard(v, i + 1, true))}
                </div>
              )}
            </div>

            {/* Top 10 Menor Custo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-emerald-950 text-sm">10 Veículos com Menor Custo</h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {vehicleStats.top10Lowest.length} veículos
                </span>
              </div>

              {vehicleStats.top10Lowest.length === 0 ? (
                <p className="text-xs text-zinc-400 italic p-4 text-center">Nenhum veículo encontrado para este filtro.</p>
              ) : (
                <div className="space-y-3">
                  {vehicleStats.top10Lowest.map((v, i) => renderVehicleCard(v, i + 1, false))}
                </div>
              )}
            </div>
          </div>
        ) : topVehiclesTab === "maior" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h4 className="font-black text-rose-950 text-base">Top 10 Veículos de Maior Custo Acumulado</h4>
              </div>
              <span className="text-xs font-extrabold text-rose-800 bg-white px-3 py-1 rounded-xl border border-rose-200">
                Total acumulado: {formatCurrency(vehicleStats.top10Highest.reduce((s, v) => s + v.totalCost, 0))}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicleStats.top10Highest.map((v, i) => renderVehicleCard(v, i + 1, true))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-emerald-950 text-base">Top 10 Veículos de Menor Custo Registrado</h4>
              </div>
              <span className="text-xs font-extrabold text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200">
                Total acumulado: {formatCurrency(vehicleStats.top10Lowest.reduce((s, v) => s + v.totalCost, 0))}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicleStats.top10Lowest.map((v, i) => renderVehicleCard(v, i + 1, false))}
            </div>
          </div>
        )}
      </div>

      {/* Chart Section */}
      {tipoGrafico !== "table" && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-zinc-900 text-base">
                Visualização Gráfica — Agrupado por {agruparPor.toUpperCase()}
              </h3>
            </div>
            <span className="text-xs font-bold text-zinc-500">
              Métrica: {metrica === "soma_valor" ? "Valor Total (R$)" : metrica === "quantidade" ? "Qtd Lançamentos" : metrica === "media_valor" ? "Valor Médio (R$)" : "Soma Quantidade"}
            </span>
          </div>

          <div className="h-80 w-full pt-4">
            {aggregatedData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <FileText className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Nenhum dado importado para o filtro selecionado.</p>
              </div>
            ) : tipoGrafico === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                    contentStyle={{ backgroundColor: "#18181b", borderRadius: "12px", border: "none", color: "#fff", fontWeight: 700 }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={renderLabelValue}
                      style={{ fill: "#1e293b", fontSize: 11, fontWeight: 800 }}
                    />
                    {aggregatedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : tipoGrafico === "pie" ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aggregatedData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value, percent }) => `${name}: ${renderLabelValue(value)} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {aggregatedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : tipoGrafico === "line" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                  />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={renderLabelValue}
                      style={{ fill: "#4c1d95", fontSize: 11, fontWeight: 800 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={renderLabelValue}
                      style={{ fill: "#1e3a8a", fontSize: 11, fontWeight: 800 }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("agrupado")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === "agrupado"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Tabela Agrupada ({aggregatedData.length} grupos)
            </button>
            <button
              onClick={() => setViewMode("detalhado")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === "detalhado"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Lançamentos Individuais ({filteredRecords.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar no relatório..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {viewMode === "agrupado" ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/80 uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="p-3.5">Item ({agruparPor.toUpperCase()})</th>
                  <th className="p-3.5 text-center">Qtd Lançamentos</th>
                  <th className="p-3.5 text-center">Soma Qtd/Litros</th>
                  <th className="p-3.5 text-right">Valor Médio (R$)</th>
                  <th className="p-3.5 text-right">Valor Total (R$)</th>
                  <th className="p-3.5 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {aggregatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400 font-semibold">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  aggregatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
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
                  placeholder="Ex: Relatório Mensal de Combustível da Frota SP"
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMold}
                disabled={savingMold}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
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
                  Exibindo todas as {selectedVehicleDetail.viagensCount} viagens (cada abastecimento / lançamento = 1 viagem).
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  <p className="text-xs font-extrabold text-zinc-500">Custo Total Acumulado</p>
                  <p className="text-lg font-black text-zinc-900 mt-1">{formatCurrency(selectedVehicleDetail.totalCost)}</p>
                </div>
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200">
                  <p className="text-xs font-extrabold text-indigo-700">Qtd de Viagens (Abastecimentos)</p>
                  <p className="text-lg font-black text-indigo-950 mt-1">{selectedVehicleDetail.viagensCount} viagens</p>
                </div>
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                  <p className="text-xs font-extrabold text-amber-700">Consumo de Combustível</p>
                  <p className="text-lg font-black text-amber-950 mt-1">
                    {selectedVehicleDetail.totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L
                  </p>
                </div>
              </div>

              {/* Categories Breakdown Table */}
              <div>
                <h4 className="font-extrabold text-zinc-900 text-sm mb-3">
                  Resumo de Custos Descritivos por Categoria
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
                          {((catData.valor / selectedVehicleDetail.totalCost) * 100).toFixed(1)}% do total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trips List / Table */}
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
    </div>
  );
}
