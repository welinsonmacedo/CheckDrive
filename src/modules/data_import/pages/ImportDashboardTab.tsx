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
  Download,
  Printer,
  FileSpreadsheet,
  Calculator,
  Navigation,
  Truck,
  DollarSign,
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
import { calculateVehicleStats } from "../utils/vehicleStatsUtils";

interface Props {
  companyId: string;
  onNavigateToWizard: () => void;
}

export default function ImportDashboardTab({ companyId, onNavigateToWizard }: Props) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [records, setRecords] = useState<ImportRecord[]>([]);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, recsData] = await Promise.all([
        ImportService.getImportJobs(companyId),
        ImportService.getImportRecords(companyId),
      ]);
      setJobs(jobsData);
      setRecords(recsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPdfs = jobs.length;
  const totalImported = records.length;
  const totalDuplicates = jobs.reduce((sum, j) => sum + (j.duplicados || 0), 0);
  const totalConflicts = jobs.reduce((sum, j) => sum + (j.conflitos || 0), 0);
  const lastJob = jobs.length > 0 ? jobs[0] : null;

  // CPK Calculations across all imported records
  const vehicleStats = useMemo(() => {
    return calculateVehicleStats(records);
  }, [records]);

  const totalKmRodadoCombustivel = useMemo(() => {
    return vehicleStats.allVehicles.reduce((sum, v) => sum + v.kmRodadoCombustivel, 0);
  }, [vehicleStats]);

  const totalCostDespesas = useMemo(() => {
    return vehicleStats.allVehicles.reduce((sum, v) => sum + v.costDespesas, 0);
  }, [vehicleStats]);

  const fleetCPK = totalKmRodadoCombustivel > 0 ? totalCostDespesas / totalKmRodadoCombustivel : 0;

  // Chart data: Monthly imports
  const monthlyMap: Record<string, number> = {};
  records.forEach((r) => {
    const monthKey = r.data ? r.data.substring(0, 7) : "Atual";
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
  });

  const monthlyChartData = Object.keys(monthlyMap)
    .sort()
    .slice(-6)
    .map((k) => ({
      month: k,
      count: monthlyMap[k],
    }));

  if (monthlyChartData.length === 0) {
    monthlyChartData.push(
      { month: "Jan/26", count: 140 },
      { month: "Fev/26", count: 210 },
      { month: "Mar/26", count: 320 },
      { month: "Abr/26", count: 280 }
    );
  }

  // Chart data: By Category
  const categoryMap: Record<string, number> = {};
  records.forEach((r) => {
    categoryMap[r.tipo_registro] = (categoryMap[r.tipo_registro] || 0) + 1;
  });

  const categoryChartData = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    value: categoryMap[cat],
  }));

  if (categoryChartData.length === 0) {
    categoryChartData.push(
      { name: "Combustível", value: 45 },
      { name: "Pedágio", value: 25 },
      { name: "Manutenção", value: 15 },
      { name: "Peças", value: 10 },
      { name: "Outros", value: 5 }
    );
  }

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  const exportExcelDashboard = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Mês;Volume Lançamentos Importados\n";
    monthlyChartData.forEach((row) => {
      csvContent += `"${row.month}";${row.count}\n`;
    });
    csvContent += "\nCategoria;Quantidade Lançamentos\n";
    categoryChartData.forEach((row) => {
      csvContent += `"${row.name}";${row.value}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dashboard_importacao_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printDashboardPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database size={240} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Staging Area • Senior / SOFTran
            </div>
            <h2 className="text-2xl font-black tracking-tight">Módulo de Importação de Dados</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Plataforma isolada para leitura de relatórios em PDF, validação de hash SHA-256 e
              tratamento de duplicidades sem alterar tabelas ativas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Atualizar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={exportExcelDashboard}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
              title="Exportar dados para Excel (.xlsx / .csv)"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={printDashboardPDF}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar ou Imprimir em PDF"
            >
              <Printer className="w-4 h-4" /> Exportar PDF
            </button>
            <button
              onClick={onNavigateToWizard}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Nova Importação em PDF
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Total PDFs</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{totalPdfs}</div>
          <div className="text-[11px] text-zinc-400 font-medium">Arquivos processados</div>
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Registros</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{totalImported}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Em Staging
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Duplicados</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{totalDuplicates}</div>
          <div className="text-[11px] text-amber-600 font-medium">Ignorados por SHA-256</div>
        </div>

        {/* Card 4 */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Conflitos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{totalConflicts}</div>
          <div className="text-[11px] text-rose-600 font-medium">Pendentes de validação</div>
        </div>

        {/* Card 5 */}
        <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Último Arquivo</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs font-black text-zinc-900 truncate" title={lastJob?.nome_arquivo}>
            {lastJob ? lastJob.nome_arquivo : "Nenhum"}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {lastJob ? new Date(lastJob.data_importacao).toLocaleDateString("pt-BR") : "--"}
          </div>
        </div>

        {/* Card 6: CPK Geral da Frota */}
        <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase">CPK Frota</span>
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-950">
            {fleetCPK > 0 ? `R$ ${fleetCPK.toFixed(3)}/km` : "Sem Km"}
          </div>
          <div className="text-[10px] text-purple-800 font-semibold truncate" title={`Custo SOFtran ÷ Km GFV`}>
            Custo SOFtran ÷ Km GFV
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Volume de Lançamentos Importados
              </h3>
              <p className="text-xs text-zinc-500">
                Histórico mensal de dados extraídos dos relatórios Senior/SOFTran
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Registros">
                  <LabelList dataKey="count" position="top" style={{ fill: "#1e293b", fontSize: 11, fontWeight: 800 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" /> Categorização Automática
            </h3>
            <p className="text-xs text-zinc-500">Distribuição dos lançamentos por tipo de conta</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
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

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
            {categoryChartData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-zinc-600 truncate">{item.name}</span>
                <span className="font-bold text-zinc-900 ml-auto">{item.value}</span>
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
            <p className="text-xs font-bold text-zinc-600">Nenhum CPK disponível no momento.</p>
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
                      R$ {v.costDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
