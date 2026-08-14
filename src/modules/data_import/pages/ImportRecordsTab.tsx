import React, { useEffect, useState } from "react";
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  Download,
  Tag,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CheckSquare,
  Square,
  Check,
  FileSpreadsheet,
  Printer,
  Layers,
  FileText,
  Trash2,
  User,
  Clock,
  ArrowRight,
  Upload,
  Pencil,
  Gauge,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { ImportJob, ImportRecord, RecordCategory } from "../types";
import { ImportService } from "../services/importService";
import { getRecordImportType } from "../utils/vehicleStatsUtils";

interface Props {
  companyId: string;
  selectedJobId?: string | null;
}

const CATEGORIES: string[] = [
  "Todos",
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

export default function ImportRecordsTab({ companyId, selectedJobId }: Props) {
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("all");
  const [records, setRecords] = useState<ImportRecord[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "novo" | "duplicado" | "conflito" | "aprovado">("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Odometer & Km Rodado editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editHodometro, setEditHodometro] = useState<string>("");
  const [editKmRodado, setEditKmRodado] = useState<string>("");
  const [savingOdometer, setSavingOdometer] = useState<boolean>(false);

  const startEditingOdometer = (r: ImportRecord) => {
    setEditingRecordId(r.id);
    setEditHodometro(r.hodometro !== undefined && r.hodometro !== null ? String(r.hodometro) : "");
    setEditKmRodado(r.km_rodado !== undefined && r.km_rodado !== null ? String(r.km_rodado) : "");
  };

  // Helper to parse pt-BR / generic decimal numbers safely
  const parsePtBrNumber = (val: string): number | null => {
    if (!val || val.trim() === "") return null;
    let clean = val.toLowerCase().replace(/km/g, "").trim();
    if (!clean) return null;

    if (clean.includes(",")) {
      const parsed = Number(clean.replace(/\./g, "").replace(",", "."));
      return isNaN(parsed) ? null : parsed;
    }
    if ((clean.match(/\./g) || []).length > 1) {
      const parsed = Number(clean.replace(/\./g, ""));
      return isNaN(parsed) ? null : parsed;
    }
    if (/^\d{1,3}\.\d{3}$/.test(clean)) {
      const parsed = Number(clean.replace(".", ""));
      return isNaN(parsed) ? null : parsed;
    }
    const parsed = Number(clean);
    return isNaN(parsed) ? null : parsed;
  };

  const handleSaveOdometer = async (recordId: string) => {
    setSavingOdometer(true);
    try {
      const trimmedHod = editHodometro.trim();
      const trimmedKm = editKmRodado.trim();

      const numHodometro = trimmedHod !== "" ? parsePtBrNumber(trimmedHod) : null;
      const numKmRodado = trimmedKm !== "" ? parsePtBrNumber(trimmedKm) : null;

      const currentRecord = records.find((r) => r.id === recordId);

      const res = await ImportService.updateRecordOdometerAndKm(
        recordId,
        companyId,
        {
          hodometro: trimmedHod === "" ? null : numHodometro !== null ? numHodometro : undefined,
          km_rodado: trimmedKm === "" ? null : numKmRodado !== null ? numKmRodado : undefined,
        },
        currentRecord
      );

      if (res.success && res.updatedRecord) {
        setRecords((prev) =>
          prev.map((item) => (item.id === recordId ? res.updatedRecord! : item))
        );
        setFeedbackMsg("✓ Hodômetro e Quilometragem atualizados com sucesso!");
        setEditingRecordId(null);
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert("Erro ao salvar: " + (res.error || "Tente novamente."));
      }
    } catch (e: any) {
      alert("Erro ao salvar quilometragem: " + e.message);
    } finally {
      setSavingOdometer(false);
    }
  };

  useEffect(() => {
    loadJobsAndData();
  }, [companyId, selectedJobId]);

  const loadJobsAndData = async () => {
    setLoadingJobs(true);
    try {
      const allJobs = await ImportService.getImportJobs(companyId);
      setJobs(allJobs);

      // If a specific job was passed via props (from files tab), use it; otherwise default to "all" (Consolidated)
      const targetJobId = selectedJobId && (selectedJobId === "all" || allJobs.some((j) => j.id === selectedJobId))
        ? selectedJobId
        : "all";

      setActiveJobId(targetJobId);
      await fetchRecordsForJob(targetJobId);
    } catch (e) {
      console.error("Erro ao carregar lotes de importação:", e);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchRecordsForJob = async (jobId: string) => {
    setLoadingRecords(true);
    setSelectedIds(new Set());
    try {
      const data = await ImportService.getImportRecords(companyId, jobId);
      setRecords(data);
    } catch (e) {
      console.error("Erro ao carregar lançamentos do lote:", e);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelectJob = async (jobId: string) => {
    setActiveJobId(jobId);
    setSearch("");
    setSelectedCategory("Todos");
    setStatusFilter("todos");
    setFeedbackMsg(null);
    await fetchRecordsForJob(jobId);
  };

  const handleDeleteJob = async (jobId: string, fileName: string) => {
    if (
      !window.confirm(
        `Tem certeza que deseja apagar o Lote "${fileName}"?\n\nEsta ação excluirá permanentemente este lote e todos os seus lançamentos importados.`
      )
    ) {
      return;
    }

    setLoadingJobs(true);
    try {
      await ImportService.deleteImportJob(jobId, companyId);
      setFeedbackMsg(`✓ Lote "${fileName}" e seus lançamentos foram removidos com sucesso.`);
      const remainingJobs = await ImportService.getImportJobs(companyId);
      setJobs(remainingJobs);

      const nextJobId = remainingJobs.length > 0 ? "all" : "all";
      setActiveJobId(nextJobId);
      await fetchRecordsForJob(nextJobId);
    } catch (e: any) {
      alert("Erro ao apagar lote: " + e?.message);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleApproveEntireJob = async (jobId: string) => {
    setApproving(true);
    setFeedbackMsg(null);
    try {
      if (jobId === "all") {
        const toApproveIds = records.filter((r) => r.status !== "duplicado" && r.status !== "aprovado").map((r) => r.id);
        const res = await ImportService.approveRecords(toApproveIds, companyId);
        setFeedbackMsg(`✓ ${res.approvedCount} lançamentos aprovados em todos os lotes!`);
      } else {
        const res = await ImportService.approveJob(jobId, companyId);
        if (res.error) {
          setFeedbackMsg(`Aprovado localmente. Aviso do banco: ${res.error}`);
        } else {
          setFeedbackMsg(`✓ Lote inteiro aprovado com sucesso (${res.approvedCount} lançamento(s) salvos no banco)!`);
        }
      }
      await fetchRecordsForJob(jobId);
      const updatedJobs = await ImportService.getImportJobs(companyId);
      setJobs(updatedJobs);
    } catch (e: any) {
      setFeedbackMsg(`Erro ao aprovar: ${e?.message}`);
    } finally {
      setApproving(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.placa.toLowerCase().includes(search.toLowerCase()) ||
      r.conta.toLowerCase().includes(search.toLowerCase()) ||
      (r.fornecedor && r.fornecedor.toLowerCase().includes(search.toLowerCase())) ||
      (r.documento && r.documento.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "Todos" || r.tipo_registro === selectedCategory;

    const matchesStatus =
      statusFilter === "todos" || r.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    setApproving(true);
    setFeedbackMsg(null);
    try {
      const ids = Array.from(selectedIds);
      const res = await ImportService.approveRecords(ids, companyId);
      if (res.error) {
        setFeedbackMsg(`Salvo localmente. Aviso do banco: ${res.error}`);
      } else {
        setFeedbackMsg(`✓ ${res.approvedCount} lançamentos aprovados e confirmados no banco de dados!`);
      }
      setSelectedIds(new Set());
      await fetchRecordsForJob(activeJobId);
    } catch (e: any) {
      setFeedbackMsg(`Erro ao aprovar: ${e?.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleCategoryChangeSingle = async (recordId: string, newCategory: string) => {
    try {
      await ImportService.updateRecordCategory([recordId], newCategory, companyId);
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, tipo_registro: newCategory as any } : r))
      );
      setFeedbackMsg(`✓ Categoria atualizada para "${newCategory}".`);
    } catch (e: any) {
      alert("Erro ao atualizar categoria: " + e.message);
    }
  };

  const handleCategoryChangeBulk = async (newCategory: string) => {
    if (selectedIds.size === 0 || !newCategory) return;
    try {
      const ids = Array.from(selectedIds);
      await ImportService.updateRecordCategory(ids, newCategory, companyId);
      setRecords((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, tipo_registro: newCategory as any } : r))
      );
      setFeedbackMsg(`✓ Categoria de ${ids.length} lançamento(s) alterada para "${newCategory}".`);
      setSelectedIds(new Set());
    } catch (e: any) {
      alert("Erro ao atualizar categorias: " + e.message);
    }
  };

  const exportExcel = () => {
    if (filtered.length === 0) return alert("Nenhum registro para exportar.");

    let csvContent = "\uFEFF";
    csvContent += "ID;Lote;Tipo;Placa;Numero Frota;Data;Conta;Valor;Quantidade;Preco Litro;Media Km/L;Km Rodado;Preco/Km;Hodometro;Fornecedor;Documento;Status;Hash\n";

    filtered.forEach((r) => {
      const pLitro = r.preco_litro !== undefined && r.preco_litro !== null ? Number(r.preco_litro).toFixed(3).replace(".", ",") : "";
      const media = r.media_km_l !== undefined && r.media_km_l !== null ? Number(r.media_km_l).toFixed(2).replace(".", ",") : "";
      const kmRod = r.km_rodado !== undefined && r.km_rodado !== null ? Number(r.km_rodado).toFixed(1).replace(".", ",") : "";
      const pKm = r.preco_por_km !== undefined && r.preco_por_km !== null ? Number(r.preco_por_km).toFixed(3).replace(".", ",") : "";
      const jobName = jobs.find((j) => j.id === r.import_job_id)?.nome_arquivo || r.import_job_id || "";

      csvContent += `"${r.id}";"${jobName}";"${r.tipo_registro}";"${r.placa}";"${r.numero_frota || ""}";"${r.data}";"${r.conta.replace(/"/g, '""')}";"${Number(r.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}";"${Number(r.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}";"${pLitro}";"${media}";"${kmRod}";"${pKm}";"${r.hodometro || ""}";"${(r.fornecedor || "").replace(/"/g, '""')}";"${(r.documento || "").replace(/"/g, '""')}";"${r.status}";"${r.hash_registro}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const label = activeJobId === "all" ? "consolidado_todos_lotes" : `lote_${activeJobId.substring(0, 6)}`;
    link.href = url;
    link.setAttribute("download", `${label}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  const currentJob = jobs.find((j) => j.id === activeJobId);
  const totalAllJobsRecords = jobs.reduce((acc, j) => acc + (j.total_registros || 0), 0);
  const totalFinancialValue = filtered.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
  const totalLiters = filtered.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Title & Batch Selector Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Database className="w-4 h-4" /> Base de Lançamentos Importados
            </div>
            <h3 className="text-xl font-black text-zinc-900">
              {activeJobId === "all"
                ? "Dados Importados (Consolidado de Todos os Lotes)"
                : `Dados do Lote: ${currentJob?.nome_arquivo || "Lote Selecionado"}`}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {activeJobId === "all"
                ? `Exibindo todos os lançamentos acumulados de ${jobs.length} lote(s) importado(s). Você pode filtrar por um lote específico abaixo.`
                : "Visualizando isoladamente os lançamentos deste arquivo/lote específico."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadJobsAndData}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              title="Atualizar lista de lotes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingJobs || loadingRecords ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar Dados</span>
            </button>
          </div>
        </div>

        {/* Visual Batch Tabs / Pill Navigation */}
        {jobs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Selecione a Visualização do Lote:
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {jobs.length} lote(s) cadastrado(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Button: Todos os Lotes (Consolidado) */}
              <button
                type="button"
                onClick={() => handleSelectJob("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                  activeJobId === "all"
                    ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300"
                    : "bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100/70"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>★ Todos os Lotes (Consolidado Geral)</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${activeJobId === "all" ? "bg-white/20 text-white" : "bg-blue-200/80 text-blue-900"}`}>
                  {records.length} reg.
                </span>
              </button>

              {/* Individual Batch Pills */}
              {jobs.map((job) => {
                const isActive = job.id === activeJobId;
                const isGFV = job.nome_arquivo.toLowerCase().includes("gfv") || job.nome_arquivo.toLowerCase().includes("consumo");
                const isSOFtran = job.nome_arquivo.toLowerCase().includes("softran") || job.nome_arquivo.toLowerCase().includes("receita");
                return (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? "bg-zinc-900 text-white border-zinc-950 shadow-xs ring-2 ring-zinc-400"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-white/20 text-white" : isGFV ? "bg-amber-100 text-amber-800" : isSOFtran ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`}>
                      {isGFV ? "GFV" : isSOFtran ? "SOFtran" : "PDF"}
                    </span>
                    <span className="truncate max-w-[180px]" title={job.nome_arquivo}>
                      {job.nome_arquivo}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-zinc-700 text-zinc-100" : "bg-slate-100 text-slate-600"}`}>
                      {job.total_registros || 0} reg.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Batch Selection Dropdown Row */}
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div className="lg:col-span-5 space-y-1">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Filtro Rápido de Lote ({jobs.length} lote{jobs.length > 1 ? "s" : ""} disponível{jobs.length > 1 ? "is" : ""}):
              </label>
              <select
                value={activeJobId}
                onChange={(e) => handleSelectJob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="all">
                  ★ Todos os Lotes (Consolidado Geral) — {records.length} lançamentos totais
                </option>
                {jobs.map((job) => {
                  const dateStr = new Date(job.created_at || job.data_importacao || Date.now()).toLocaleDateString("pt-BR");
                  const timeStr = new Date(job.created_at || job.data_importacao || Date.now()).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <option key={job.id} value={job.id}>
                      Lote #{job.id.substring(0, 6).toUpperCase()} — {job.nome_arquivo} ({dateStr} às {timeStr}) — {job.total_registros || 0} reg.
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Metrics & Actions */}
            <div className="lg:col-span-7 flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-800 text-[11px] font-extrabold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {filtered.length} Lançamento(s)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                  Total: R$ {totalFinancialValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                {totalLiters > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-extrabold">
                    {totalLiters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApproveEntireJob(activeJobId)}
                  disabled={approving || records.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  title={activeJobId === "all" ? "Aprovar todos os lançamentos pendentes em todos os lotes" : "Aprovar lote selecionado"}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{activeJobId === "all" ? "Aprovar Todos" : "Aprovar Lote"}</span>
                </button>

                {currentJob && (
                  <button
                    onClick={() => handleDeleteJob(currentJob.id, currentJob.nome_arquivo)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Excluir permanentemente este lote de importação"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Lote</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Nenhum Lote de Importação Encontrado</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Importe seus arquivos PDF ou planilhas Excel na aba "Importações" para visualizar os dados consolidados aqui.
            </p>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-600 hover:underline text-[11px] cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* Notice Banner showing Active View Mode */}
      <div className="px-4 py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>
            {activeJobId === "all" ? (
              <>
                Modo Ativo: <strong className="font-black text-blue-950">Consolidado Geral ({jobs.length} Lotes)</strong> — {filtered.length} de {records.length} lançamento(s) exibido(s).
              </>
            ) : (
              <>
                Lote Ativo: <strong className="font-black text-blue-950">{currentJob?.nome_arquivo}</strong> — {filtered.length} de {records.length} lançamento(s) exibido(s).
              </>
            )}
          </span>
        </div>
        {activeJobId !== "all" && (
          <button
            onClick={() => handleSelectJob("all")}
            className="text-[11px] text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs font-extrabold hover:bg-blue-100 cursor-pointer"
          >
            ← Ver Todos os Lotes Consolidado
          </button>
        )}
      </div>

      {/* Filter Bar & Bulk Actions */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por placa, conta, fornecedor, doc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600">
            <button
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "todos" ? "bg-white text-zinc-900 shadow-sm" : ""
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("novo")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "novo" ? "bg-white text-emerald-700 shadow-sm" : ""
              }`}
            >
              Novos
            </button>
            <button
              onClick={() => setStatusFilter("aprovado")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "aprovado" ? "bg-white text-blue-700 shadow-sm" : ""
              }`}
            >
              Aprovados
            </button>
            <button
              onClick={() => setStatusFilter("duplicado")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "duplicado" ? "bg-white text-amber-700 shadow-sm" : ""
              }`}
            >
              Duplicados
            </button>
            <button
              onClick={() => setStatusFilter("conflito")}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "conflito" ? "bg-white text-rose-700 shadow-sm" : ""
              }`}
            >
              Conflitos
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleCategoryChangeBulk(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  Mudar Categoria ({selectedIds.size})...
                </option>
                {CATEGORIES.filter((c) => c !== "Todos").map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                onClick={handleApproveSelected}
                disabled={approving}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Aprovar ({selectedIds.size})
              </button>
            </div>
          )}

          <button
            onClick={exportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
            title="Exportar lançamentos para Excel (CSV)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
          </button>

          <button
            onClick={exportPDF}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Imprimir ou salvar PDF dos lançamentos"
          >
            <Printer className="w-4 h-4 text-zinc-500" /> PDF
          </button>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:text-zinc-800 cursor-pointer">
                    {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </th>
                <th className="p-4">Lote / Origem</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Placa / Frota</th>
                <th className="p-4">Data</th>
                <th className="p-4">Conta</th>
                <th className="p-4">Fornecedor / Doc</th>
                <th className="p-4">Qtd / P.Litro</th>
                <th className="p-4">Valor / Km Média</th>
                <th className="p-4">Hodômetro / Rodado</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {loadingRecords ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-zinc-400">
                    Nenhum registro encontrado para a seleção e filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isChecked = selectedIds.has(r.id);
                  const originJob = jobs.find((j) => j.id === r.import_job_id);
                  const isGfvRecord =
                    getRecordImportType(r) === "combustivel_gfv" ||
                    r.conta === "Consumo de Combustível" ||
                    Boolean(
                      originJob &&
                        (originJob.nome_arquivo.toLowerCase().includes("gfv") ||
                          originJob.nome_arquivo.toLowerCase().includes("consumo"))
                    );

                  return (
                    <tr key={r.id} className={`hover:bg-zinc-50/80 transition-colors ${isChecked ? "bg-blue-50/30" : ""}`}>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelect(r.id)} className="p-1 cursor-pointer">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isGfvRecord ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                            {isGfvRecord ? "GFV" : "Senior"}
                          </span>
                          <span className="text-[11px] font-bold text-zinc-700 truncate max-w-[120px]" title={originJob?.nome_arquivo || r.import_job_id}>
                            {originJob?.nome_arquivo ? originJob.nome_arquivo.replace(/\.[^/.]+$/, "") : `Lote #${r.import_job_id.substring(0, 6)}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={r.tipo_registro}
                          onChange={(e) => handleCategoryChangeSingle(r.id, e.target.value)}
                          className="py-1 px-2.5 bg-blue-50/90 hover:bg-blue-100 text-blue-900 font-extrabold text-[11px] rounded-lg border border-blue-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                        >
                          {CATEGORIES.filter((c) => c !== "Todos").map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 font-black text-zinc-900">
                        {r.placa}
                        {r.numero_frota && (
                          <span className="ml-1 text-[10px] text-zinc-400 font-normal">
                            ({r.numero_frota})
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-zinc-600 font-medium whitespace-nowrap">{r.data}</td>
                      <td className="p-4 max-w-xs truncate" title={r.descricao_conta}>
                        {r.conta}
                      </td>
                      <td className="p-4 text-zinc-500">
                        <div>{r.fornecedor || "N/I"}</div>
                        {r.documento && (
                          <div className="text-[10px] text-zinc-400">Doc: {r.documento}</div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-zinc-800 whitespace-nowrap">
                        <div>
                          {r.quantidade}
                          {(r.preco_litro || ["Combustível", "Gasolina", "Gasolina Administrativo", "Diesel", "Diesel Terceiro", "Arla", "Arla Estoque"].includes(r.tipo_registro)) ? " L" : ""}
                        </div>
                        {r.preco_litro !== undefined && r.preco_litro > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold">
                            R$ {Number(r.preco_litro).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}/L
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-black text-zinc-900 whitespace-nowrap">
                        <div>R$ {Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        {getRecordImportType(r) === "combustivel_gfv" ? (
                          <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block">
                            Usa Km Rodado
                          </div>
                        ) : r.media_km_l !== undefined && r.media_km_l > 0 ? (
                          <div className="text-[10px] text-blue-600 font-bold">
                            {Number(r.media_km_l).toFixed(2)} Km/L
                          </div>
                        ) : null}
                      </td>
                      {editingRecordId === r.id ? (
                        <td className="p-3 bg-amber-50/95 rounded-2xl border-2 border-amber-400 shadow-sm">
                          <div className="space-y-2 text-xs font-bold min-w-[190px]">
                            <div className="flex items-center justify-between text-[11px] font-black text-amber-950 border-b border-amber-200/80 pb-1">
                              <span className="flex items-center gap-1">
                                <Gauge className="w-3.5 h-3.5 text-amber-700" /> Editar Km & Hodômetro
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingRecordId(null)}
                                className="text-amber-800 hover:text-amber-950 text-[10px] cursor-pointer font-bold px-1 py-0.5 rounded hover:bg-amber-200/50"
                              >
                                Cancelar
                              </button>
                            </div>

                            <div>
                              <label className="text-[10px] text-amber-900 font-extrabold block mb-0.5">
                                Hodômetro Final (Km):
                              </label>
                              <input
                                type="text"
                                value={editHodometro}
                                onChange={(e) => setEditHodometro(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveOdometer(r.id);
                                  if (e.key === "Escape") setEditingRecordId(null);
                                }}
                                placeholder="Ex: 154.200"
                                autoFocus
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-amber-900 font-extrabold block mb-0.5">
                                Km Rodado (Trecho):
                              </label>
                              <input
                                type="text"
                                value={editKmRodado}
                                onChange={(e) => setEditKmRodado(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveOdometer(r.id);
                                  if (e.key === "Escape") setEditingRecordId(null);
                                }}
                                placeholder="Ex: 480"
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveOdometer(r.id)}
                              disabled={savingOdometer}
                              className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                            >
                              {savingOdometer ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Salvar Alteração
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="p-4 text-zinc-700 font-medium whitespace-nowrap">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-extrabold text-zinc-900 text-xs">
                                {r.hodometro ? (
                                  `${Number(r.hodometro).toLocaleString("pt-BR")} km`
                                ) : (
                                  <span className="text-zinc-400 font-normal italic">Sem Hodômetro</span>
                                )}
                              </div>
                              {r.km_rodado !== undefined && r.km_rodado !== null && r.km_rodado > 0 ? (
                                <div className="text-[10px] text-amber-800 font-black bg-amber-50/90 px-1.5 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                                  +{Number(r.km_rodado).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km rodado
                                </div>
                              ) : (
                                <div className="text-[10px] text-zinc-400">Sem Km Rodado</div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => startEditingOdometer(r)}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                              title="Editar Hodômetro ou Quilometragem Rodada deste registro"
                            >
                              <Pencil className="w-3 h-3 text-amber-700" />
                              <span>Editar</span>
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        {r.status === "aprovado" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" /> Aprovado
                          </span>
                        )}
                        {r.status === "novo" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Novo
                          </span>
                        )}
                        {r.status === "duplicado" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                            <Copy className="w-3 h-3" /> Duplicado
                          </span>
                        )}
                        {r.status === "conflito" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Conflito
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
