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
} from "lucide-react";
import { ImportRecord, RecordCategory } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
  selectedJobId?: string | null;
}

const CATEGORIES: string[] = [
  "Todos",
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

export default function ImportRecordsTab({ companyId, selectedJobId }: Props) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "novo" | "duplicado" | "conflito" | "aprovado">("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [companyId, selectedJobId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await ImportService.getImportRecords(companyId, selectedJobId || undefined);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      await loadRecords();
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

  const handleApproveAllNew = async () => {
    const newRecords = records.filter((r) => r.status === "novo" || r.status === "conflito");
    if (newRecords.length === 0) {
      alert("Nenhum lançamento pendente encontrado para aprovação.");
      return;
    }

    setApproving(true);
    setFeedbackMsg(null);
    try {
      const ids = newRecords.map((r) => r.id);
      const res = await ImportService.approveRecords(ids, companyId);
      if (res.error) {
        setFeedbackMsg(`Salvo localmente. Aviso do banco: ${res.error}`);
      } else {
        setFeedbackMsg(`✓ Todos os ${res.approvedCount} lançamentos novos foram aprovados e salvos no banco de dados!`);
      }
      setSelectedIds(new Set());
      await loadRecords();
    } catch (e: any) {
      setFeedbackMsg(`Erro ao aprovar: ${e?.message}`);
    } finally {
      setApproving(false);
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) return alert("Nenhum registro para exportar.");

    const headers = [
      "ID",
      "Tipo",
      "Placa",
      "Frota",
      "Data",
      "Conta",
      "Valor (R$)",
      "Quantidade",
      "Hodometro",
      "Fornecedor",
      "Documento",
      "Status",
      "Hash SHA-256",
    ];

    const rows = filtered.map((r) => [
      r.id,
      r.tipo_registro,
      r.placa,
      r.numero_frota || "",
      r.data,
      `"${r.conta.replace(/"/g, '""')}"`,
      r.valor,
      r.quantidade,
      r.hodometro || "",
      `"${(r.fornecedor || "").replace(/"/g, '""')}"`,
      `"${(r.documento || "").replace(/"/g, '""')}"`,
      r.status,
      r.hash_registro,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_records_staging_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-zinc-900">
            Dados Importados (Staging Area)
          </h3>
          <p className="text-xs text-zinc-500">
            Tabela própria <code className="font-mono text-blue-600 bg-blue-50 px-1 rounded">import_records</code> no banco de dados. Aprovação direta disponível.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {records.some((r) => r.status === "novo") && (
            <button
              onClick={handleApproveAllNew}
              disabled={approving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Aprovar Todos os Novos
            </button>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Aprovar Selecionados ({selectedIds.size})
              </button>
            </div>
          )}

          <button
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-zinc-500" /> Exportar CSV
          </button>

          <button
            onClick={loadRecords}
            className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-600 hover:underline text-[11px]">
            Fechar
          </button>
        </div>
      )}

      {/* Filter Bar */}
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
            className="py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none"
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
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "todos" ? "bg-white text-zinc-900 shadow-sm" : ""
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("novo")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "novo" ? "bg-white text-emerald-700 shadow-sm" : ""
              }`}
            >
              Novos
            </button>
            <button
              onClick={() => setStatusFilter("aprovado")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "aprovado" ? "bg-white text-blue-700 shadow-sm" : ""
              }`}
            >
              Aprovados
            </button>
            <button
              onClick={() => setStatusFilter("duplicado")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "duplicado" ? "bg-white text-amber-700 shadow-sm" : ""
              }`}
            >
              Duplicados
            </button>
            <button
              onClick={() => setStatusFilter("conflito")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === "conflito" ? "bg-white text-rose-700 shadow-sm" : ""
              }`}
            >
              Conflitos
            </button>
          </div>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:text-zinc-800">
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
                <th className="p-4">Qtd</th>
                <th className="p-4">Valor (R$)</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-400">
                    Nenhum registro atende aos critérios de busca.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isChecked = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className={`hover:bg-zinc-50/80 transition-colors ${isChecked ? "bg-blue-50/30" : ""}`}>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelect(r.id)} className="p-1">
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
                      <td className="p-4 text-zinc-600 font-medium">{r.data}</td>
                      <td className="p-4 max-w-xs truncate" title={r.descricao_conta}>
                        {r.conta}
                      </td>
                      <td className="p-4 text-zinc-500">
                        <div>{r.fornecedor || "N/I"}</div>
                        {r.documento && (
                          <div className="text-[10px] text-zinc-400">Doc: {r.documento}</div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-zinc-800">{r.quantidade}</td>
                      <td className="p-4 font-black text-zinc-900">
                        R$ {Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
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
