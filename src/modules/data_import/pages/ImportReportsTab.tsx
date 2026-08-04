import React, { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
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
  Layers,
  X,
  FileText,
  DollarSign,
  Hash,
  Calculator,
  RefreshCw,
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
} from "recharts";
import { ImportRecord, ReportMold, RecordCategory } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
}

const CATEGORIES: (RecordCategory | "Todas")[] = [
  "Todas",
  "Combustível",
  "Diesel",
  "Arla",
  "Lava-jato",
  "Pneus Novos",
  "Recapagem",
  "Pneus",
  "Rastreamento",
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

export default function ImportReportsTab({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [molds, setMolds] = useState<ReportMold[]>([]);
  const [activeMoldId, setActiveMoldId] = useState<string | null>("mold_default_1");

  // Filter & Config state
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [periodDays, setPeriodDays] = useState<number>(0); // 0 = Todos
  const [placaFilter, setPlacaFilter] = useState<string>("");
  const [fornecedorFilter, setFornecedorFilter] = useState<string>("");
  const [agruparPor, setAgruparPor] = useState<"categoria" | "placa" | "fornecedor" | "mes" | "status">("categoria");
  const [metrica, setMetrica] = useState<"soma_valor" | "quantidade" | "media_valor" | "soma_quantidade">("soma_valor");
  const [tipoGrafico, setTipoGrafico] = useState<"bar" | "pie" | "line" | "area" | "table">("bar");
  const [viewMode, setViewMode] = useState<"agrupado" | "detalhado">("agrupado");
  const [tableSearch, setTableSearch] = useState<string>("");

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newMoldName, setNewMoldName] = useState("");
  const [newMoldDesc, setNewMoldDesc] = useState("");
  const [savingMold, setSavingMold] = useState(false);

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
    if (mold.periodo_dias !== undefined) setPeriodDays(mold.periodo_dias);
    if (mold.placa_filtro !== undefined) setPlacaFilter(mold.placa_filtro);
    if (mold.fornecedor_filtro !== undefined) setFornecedorFilter(mold.fornecedor_filtro);
    if (mold.agrupar_por) setAgruparPor(mold.agrupar_por);
    if (mold.metrica) setMetrica(mold.metrica);
    if (mold.tipo_grafico) setTipoGrafico(mold.tipo_grafico);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Category filter
      if (categoryFilter !== "Todas" && r.tipo_registro !== categoryFilter) return false;

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

      // Period filter
      if (periodDays > 0 && r.data) {
        const rDate = new Date(r.data).getTime();
        const now = new Date().getTime();
        const diffDays = (now - rDate) / (1000 * 3600 * 24);
        if (diffDays > periodDays) return false;
      }

      return true;
    });
  }, [records, categoryFilter, placaFilter, fornecedorFilter, periodDays]);

  // Aggregated data for grouping & charts
  const aggregatedData = useMemo(() => {
    const map: Record<
      string,
      { key: string; totalValor: number; totalQty: number; count: number; items: ImportRecord[] }
    > = {};

    filteredRecords.forEach((r) => {
      let groupKey = "Outros";
      if (agruparPor === "categoria") groupKey = r.tipo_registro || "Sem Categoria";
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
        periodo_dias: periodDays,
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

  // Export CSV
  const exportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    if (viewMode === "agrupado") {
      csvContent += `Agrupamento (${agruparPor});Qtd Lançamentos;Soma Quantidade/Litros;Valor Total (R$);Média Valor (R$);% do Total\n`;
      aggregatedData.forEach((row) => {
        csvContent += `"${row.name}";${row.count};${row.totalQty.toFixed(2)};${row.valorTotal.toFixed(2)};${row.mediaValor.toFixed(2)};${row.percent}%\n`;
      });
    } else {
      csvContent += `Data;Categoria;Placa;Frota;Conta;Descrição;Quantidade;Valor (R$);Fornecedor;Status\n`;
      tableFilteredRecords.forEach((r) => {
        csvContent += `"${r.data || ""}";"${r.tipo_registro}";"${r.placa}";"${r.numero_frota || ""}";"${r.conta || ""}";"${r.descricao_conta || ""}";${r.quantidade};${r.valor};"${r.fornecedor || ""}";"${r.status}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_importacao_${agruparPor}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const printReport = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
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
              <Plus className="w-4 h-4" /> Salvar como Novo Molde
            </button>
            <button
              onClick={exportCSV}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button
              onClick={printReport}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Gallery of Report Models / Moldes */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
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
        <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm border-b border-zinc-100 pb-3">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtros e Configuração do Relatório Atual</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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

          {/* Período */}
          <div>
            <label className="block text-[11px] font-extrabold text-zinc-600 mb-1">
              Período
            </label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value={0}>Todo o Histórico</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Este Ano (365d)</option>
            </select>
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
                <BarChart data={aggregatedData}>
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
                    outerRadius={100}
                    innerRadius={45}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                <LineChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                  />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      metrica.includes("valor") ? [formatCurrency(Number(value)), "Valor"] : [value, "Quantidade"]
                    }
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} />
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
                    <td colSpan={8} className="p-8 text-center text-zinc-400 font-semibold">
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : (
                  tableFilteredRecords.slice(0, 100).map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 whitespace-nowrap text-zinc-600">{r.data || "-"}</td>
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
                  ))
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
    </div>
  );
}
