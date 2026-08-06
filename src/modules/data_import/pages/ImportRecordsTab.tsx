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
  const [activeJobId, setActiveJobId] = useState<string | null>(selectedJobId || null);
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

  const handleSaveOdometer = async (recordId: string) => {
    setSavingOdometer(true);
    try {
      const numHodometro = editHodometro.trim() !== "" ? Number(editHodometro.replace(",", ".")) : undefined;
      const numKmRodado = editKmRodado.trim() !== "" ? Number(editKmRodado.replace(",", ".")) : undefined;

      const res = await ImportService.updateRecordOdometerAndKm(recordId, companyId, {
        hodometro: numHodometro !== undefined && !isNaN(numHodometro) ? numHodometro : undefined,
        km_rodado: numKmRodado !== undefined && !isNaN(numKmRodado) ? numKmRodado : undefined,
      });

      if (res.success && res.updatedRecord) {
        setRecords((prev) =>
          prev.map((item) => (item.id === recordId ? res.updatedRecord! : item))
        );
        setFeedbackMsg("✓ Hodômetro e Quilometragem Rodada atualizados com sucesso!");
        setEditingRecordId(null);
      } else {
        alert("Erro ao salvar: " + (res.error || "Tente novamente."));
      }
    } catch (e: any) {
      alert("Erro ao salvar hodômetro: " + e.message);
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

      let targetJobId = selectedJobId;
      if (!targetJobId || !allJobs.some((j) => j.id === targetJobId)) {
        targetJobId = allJobs.length > 0 ? allJobs[0].id : null;
      }
      setActiveJobId(targetJobId);

      if (targetJobId) {
        await fetchRecordsForJob(targetJobId);
      } else {
        setRecords([]);
      }
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

      const nextJobId = remainingJobs.length > 0 ? remainingJobs[0].id : null;
      setActiveJobId(nextJobId);
      if (nextJobId) {
        await fetchRecordsForJob(nextJobId);
      } else {
        setRecords([]);
      }
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
      const res = await ImportService.approveJob(jobId, companyId);
      if (res.error) {
        setFeedbackMsg(`Aprovado localmente. Aviso do banco: ${res.error}`);
      } else {
        setFeedbackMsg(`✓ Lote inteiro aprovado com sucesso (${res.approvedCount} lançamento(s) salvos no banco)!`);
      }
      await fetchRecordsForJob(jobId);
      // Refresh jobs to reflect status update
      const updatedJobs = await ImportService.getImportJobs(companyId);
      setJobs(updatedJobs);
    } catch (e: any) {
      setFeedbackMsg(`Erro ao aprovar lote: ${e?.message}`);
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
      if (activeJobId) await fetchRecordsForJob(activeJobId);
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

    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "ID;Categoria;Placa;Frota;Data;Conta;Valor (R$);Quantidade;Preço/Litro (R$);Média (Km/L);Km Rodado;Preço/Km (R$);Hodômetro;Fornecedor;Documento;Status;Hash SHA-256\n";

    filtered.forEach((r) => {
      const pLitro = r.preco_litro !== undefined ? Number(r.preco_litro).toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : "";
      const media = r.media_km_l !== undefined ? Number(r.media_km_l).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
      const kmRod = r.km_rodado !== undefined ? Number(r.km_rodado).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "";
      const pKm = r.preco_por_km !== undefined ? Number(r.preco_por_km).toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : "";

      csvContent += `"${r.id}";"${r.tipo_registro}";"${r.placa}";"${r.numero_frota || ""}";"${r.data}";"${r.conta.replace(/"/g, '""')}";"${Number(r.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}";"${Number(r.quantidade || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}";"${pLitro}";"${media}";"${kmRod}";"${pKm}";"${r.hodometro || ""}";"${(r.fornecedor || "").replace(/"/g, '""')}";"${(r.documento || "").replace(/"/g, '""')}";"${r.status}";"${r.hash_registro}"\n`;
    });

    const currentJob = jobs.find((j) => j.id === activeJobId);
    const jobFileName = currentJob ? currentJob.nome_arquivo.replace(/[^a-zA-Z0-9_-]/g, "_") : "lote";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lote_${jobFileName}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  const currentJob = jobs.find((j) => j.id === activeJobId);

  return (
    <div className="space-y-6">
      {/* Top Title & Batch Selector Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" /> Gestão Individual de Lotes
            </div>
            <h3 className="text-xl font-black text-zinc-900">
              Dados Importados por Lote (Staging Area)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Os lançamentos são organizados exclusivamente por lote de importação para evitar misturas. Selecione o lote desejado abaixo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadJobsAndData}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              title="Atualizar lista de lotes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingJobs || loadingRecords ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar Lotes</span>
            </button>
          </div>
        </div>

        {/* Visual Batch Tabs / Pill Navigation */}
        {jobs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Selecione o Lote Desejado (Isolado):
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {jobs.length} lote(s) disponível(is)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
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
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-white/20 text-white" : isGFV ? "bg-amber-100 text-amber-800" : isSOFtran ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`}>
                      {isGFV ? "GFV" : isSOFtran ? "SOFtran" : "PDF"}
                    </span>
                    <span className="truncate max-w-[200px]" title={job.nome_arquivo}>
                      {job.nome_arquivo}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-blue-800 text-blue-100" : "bg-slate-100 text-slate-600"}`}>
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
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Escolher Lote de Importação ({jobs.length} disponível{jobs.length > 1 ? "is" : ""}):
              </label>
              <select
                value={activeJobId || ""}
                onChange={(e) => handleSelectJob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
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

            {currentJob && (
              <div className="lg:col-span-7 flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-800 text-[11px] font-extrabold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {currentJob.total_registros} Lançamentos
                  </span>
                  {currentJob.novos > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                      {currentJob.novos} Novos
                    </span>
                  )}
                  {currentJob.conflitos > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-extrabold">
                      {currentJob.conflitos} Conflitos
                    </span>
                  )}
                  {currentJob.duplicados > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-extrabold">
                      {currentJob.duplicados} Duplicados
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveEntireJob(currentJob.id)}
                    disabled={approving}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    title="Aprovar todos os lançamentos deste lote no banco"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar Lote</span>
                  </button>

                  <button
                    onClick={() => handleDeleteJob(currentJob.id, currentJob.nome_arquivo)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Excluir permanentemente este lote de importação"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Lote</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Nenhum Lote de Importação Encontrado</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cada importação realizada gera um lote isolado para que não haja mistura de dados. Importe seu primeiro arquivo na aba "Importações".
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

      {/* Notice Banner showing Active Isolation */}
      {currentJob && (
        <div className="px-4 py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>
              Lote Ativo: <strong className="font-black text-blue-950">{currentJob.nome_arquivo}</strong> — {filtered.length} de {records.length} lançamento(s) do lote exibido(s).
            </span>
          </div>
          <span className="text-[11px] text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs font-extrabold">
            Lote Isolado
          </span>
        </div>
      )}

      {/* Filter Bar & Bulk Actions */}
      {currentJob && (
        <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por placa, conta, fornecedor..."
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
              title="Exportar lançamentos deste lote para Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
            </button>

            <button
              onClick={exportPDF}
              className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Imprimir ou salvar PDF deste lote"
            >
              <Printer className="w-4 h-4 text-zinc-500" /> PDF
            </button>
          </div>
        </div>
      )}

      {/* Main Records Table for Selected Lote */}
      {currentJob && (
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
                    <td colSpan={10} className="p-12 text-center text-zinc-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando lançamentos do lote selecionado...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-zinc-400">
                      Nenhum registro encontrado para este lote com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isChecked = selectedIds.has(r.id);
                    const isGfvRecord =
                      getRecordImportType(r) === "combustivel_gfv" ||
                      r.conta === "Consumo de Combustível" ||
                      Boolean(
                        currentJob &&
                          (currentJob.nome_arquivo.toLowerCase().includes("gfv") ||
                            currentJob.nome_arquivo.toLowerCase().includes("consumo"))
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
                              Relatório: usa Km Rodado
                            </div>
                          ) : r.media_km_l !== undefined && r.media_km_l > 0 ? (
                            <div className="text-[10px] text-blue-600 font-bold">
                              {Number(r.media_km_l).toFixed(2)} Km/L
                            </div>
                          ) : null}
                        </td>
                        {editingRecordId === r.id ? (
                          <td className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300">
                            <div className="space-y-1.5 text-xs font-bold min-w-[170px]">
                              <div className="flex items-center justify-between text-[11px] font-black text-amber-900 border-b border-amber-200 pb-1">
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3.5 h-3.5 text-amber-600" /> Editar GFV
                                </span>
                                <button
                                  onClick={() => setEditingRecordId(null)}
                                  className="text-amber-700 hover:text-amber-950 text-[10px] cursor-pointer font-bold"
                                >
                                  Cancelar
                                </button>
                              </div>

                              <div>
                                <label className="text-[10px] text-amber-800 font-extrabold block">Hodômetro Final (Km):</label>
                                <input
                                  type="text"
                                  value={editHodometro}
                                  onChange={(e) => setEditHodometro(e.target.value)}
                                  placeholder="Ex: 154200"
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-amber-800 font-extrabold block">Km Rodado (Trecho):</label>
                                <input
                                  type="text"
                                  value={editKmRodado}
                                  onChange={(e) => setEditKmRodado(e.target.value)}
                                  placeholder="Ex: 480"
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>

                              <button
                                onClick={() => handleSaveOdometer(r.id)}
                                disabled={savingOdometer}
                                className="w-full mt-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> Salvar Alteração
                              </button>
                            </div>
                          </td>
                        ) : (
                          <td className="p-4 text-zinc-700 font-medium whitespace-nowrap">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-extrabold text-zinc-900 text-xs">
                                  {r.hodometro ? `${Number(r.hodometro).toLocaleString("pt-BR")} km` : <span className="text-zinc-400 font-normal italic">Sem Hodômetro</span>}
                                </div>
                                {r.km_rodado !== undefined && r.km_rodado > 0 ? (
                                  <div className="text-[10px] text-amber-800 font-black bg-amber-50/90 px-1.5 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                                    +{Number(r.km_rodado).toLocaleString("pt-BR")} km rodado
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-zinc-400">Sem Km Rodado</div>
                                )}
                              </div>

                              {isGfvRecord && (
                                <button
                                  onClick={() => startEditingOdometer(r)}
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                                  title="Editar Hodômetro ou Quilometragem Rodada deste registro GFV"
                                >
                                  <Pencil className="w-3 h-3 text-amber-700" />
                                  <span>Editar</span>
                                </button>
                              )}
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
      )}
    </div>
  );
}
