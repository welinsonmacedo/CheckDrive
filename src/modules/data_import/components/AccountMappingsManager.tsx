import React, { useState, useEffect } from "react";
import {
  Link2,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  X,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Layers,
  Fuel,
  ShieldAlert,
} from "lucide-react";
import { RecordCategory } from "../types";
import {
  AccountMappingService,
  AccountMapping,
} from "../services/accountMappingService";

const CATEGORIES: RecordCategory[] = [
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

interface Props {
  companyId?: string;
}

export default function AccountMappingsManager({ companyId = "global" }: Props) {
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [postoFilter, setPostoFilter] = useState<"todos" | "postos" | "outros">("todos");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formTargetName, setFormTargetName] = useState("");
  const [formCategory, setFormCategory] = useState<RecordCategory | string>("Diesel");
  const [formKeywords, setFormKeywords] = useState("");
  const [formIsPosto, setFormIsPosto] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMappings();
  }, [companyId]);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const data = await AccountMappingService.getAccountMappings(companyId);
      setMappings(data);
    } catch (e) {
      console.error("Erro ao carregar vínculos de contas:", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isFuelCategoryName = (cat: string) => {
    const l = (cat || "").toLowerCase();
    return (
      l.includes("diesel") ||
      l.includes("gasolina") ||
      l.includes("combust") ||
      l.includes("arla")
    );
  };

  const handleOpenAdd = () => {
    setEditingMapping(null);
    setFormCode("");
    setFormTargetName("");
    setFormCategory("Diesel");
    setFormKeywords("");
    setFormIsPosto(true);
    setFormActive(true);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (m: AccountMapping) => {
    setEditingMapping(m);
    setFormCode(m.code);
    setFormTargetName(m.target_name);
    setFormCategory(m.category);
    setFormKeywords((m.keywords || []).join(", "));
    setFormIsPosto(m.is_posto !== undefined ? Boolean(m.is_posto) : isFuelCategoryName(m.category));
    setFormActive(m.active);
    setFormError("");
    setShowModal(true);
  };

  const handleCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    // If not manually edited or editing brand new mapping, suggest is_posto based on category
    if (!editingMapping) {
      setFormIsPosto(isFuelCategoryName(newCat));
    }
  };

  const handleTogglePostoInline = async (m: AccountMapping) => {
    const nextVal = !m.is_posto;
    try {
      await AccountMappingService.saveAccountMapping({
        ...m,
        is_posto: nextVal,
      });
      await loadMappings();
      showToast(
        nextVal
          ? `Conta '${m.code} - ${m.target_name}' marcada como Posto de Combustível ⛽`
          : `Conta '${m.code} - ${m.target_name}' marcada como Outras Despesas 📦`
      );
    } catch (err: any) {
      alert("Erro ao atualizar status de posto: " + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError("O código da conta (ex: 104, 106) é obrigatório.");
      return;
    }
    if (!formTargetName.trim()) {
      setFormError("A descrição/nome mapeado é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      const kwArray = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      await AccountMappingService.saveAccountMapping({
        id: editingMapping?.id,
        company_id: companyId,
        code: formCode.trim(),
        target_name: formTargetName.trim(),
        category: formCategory,
        keywords: kwArray.length > 0 ? kwArray : [formCode.trim(), formTargetName.trim().toLowerCase()],
        is_posto: formIsPosto,
        active: formActive,
      });

      setShowModal(false);
      await loadMappings();
      showToast(
        editingMapping
          ? `Vínculo '${formCode}' atualizado com sucesso!`
          : `Novo vínculo '${formCode} = ${formTargetName}' criado!`
      );
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar vínculo de conta.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: AccountMapping) => {
    if (confirm(`Tem certeza que deseja excluir o vínculo da conta '${m.code} = ${m.target_name}'?`)) {
      try {
        await AccountMappingService.deleteAccountMapping(m.code, companyId);
        await loadMappings();
        showToast(`Vínculo '${m.code}' removido.`);
      } catch (err: any) {
        alert("Erro ao remover vínculo: " + err.message);
      }
    }
  };

  const handleResetDefaults = async () => {
    if (confirm("Deseja restaurar os vínculos padrão do sistema (104 = Diesel S10, 106 = Gasolina, etc.)?")) {
      setLoading(true);
      try {
        await AccountMappingService.resetToDefaults(companyId);
        await loadMappings();
        showToast("Vínculos padrão restaurados com sucesso!");
      } catch (e: any) {
        alert("Erro ao restaurar padrões: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredMappings = mappings.filter((m) => {
    // 1. Posto filter
    if (postoFilter === "postos" && !m.is_posto) return false;
    if (postoFilter === "outros" && m.is_posto) return false;

    // 2. Search query
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.code.toLowerCase().includes(term) ||
      m.target_name.toLowerCase().includes(term) ||
      m.category.toLowerCase().includes(term) ||
      (m.keywords && m.keywords.some((k) => k.toLowerCase().includes(term)))
    );
  });

  const totalPostosCount = mappings.filter((m) => m.is_posto).length;
  const totalOutrosCount = mappings.filter((m) => !m.is_posto).length;

  return (
    <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900">
                Vínculos de Contas & De-Para Inteligente
              </h3>
              <p className="text-xs text-zinc-500">
                Configure como os códigos do ERP/PDF são convertidos e marque se a conta é um <strong>Posto de Combustível</strong> para os relatórios analíticos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaurar lista de regras padrão (104=Diesel S10, 106=Gasolina, etc.)"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrões
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Criar Novo Vínculo
          </button>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
        <Fuel className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>Classificação de Posto de Combustível & Abastecimento</span>
            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full uppercase tracking-wider font-black">
              Novo
            </span>
          </p>
          <p className="text-emerald-800 leading-relaxed">
            As contas marcadas como <strong className="font-bold text-emerald-950">Posto de Combustível ⛽</strong> serão usadas automaticamente pelos relatórios e gráficos de <strong className="font-bold text-emerald-950">Evolução do Preço Médio por Litro (R$/L)</strong>, <strong className="font-bold text-emerald-950">Consumo GFV</strong> e <strong className="font-bold text-emerald-950">Ranking de Postos</strong>. Contas marcadas como <strong className="font-bold text-zinc-800">Outras Despesas 📦</strong> serão computadas como despesas operacionais normais.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar código (104, 106), nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <button
            onClick={() => setPostoFilter("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              postoFilter === "todos"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Todos ({mappings.length})
          </button>
          <button
            onClick={() => setPostoFilter("postos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              postoFilter === "postos"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Postos ({totalPostosCount})</span>
          </button>
          <button
            onClick={() => setPostoFilter("outros")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              postoFilter === "outros"
                ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Outras Despesas ({totalOutrosCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-200/80 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <th className="p-3">Código do ERP/PDF</th>
              <th className="p-3">Nome / Produto Mapeado</th>
              <th className="p-3">Categoria CheckDrive</th>
              <th className="p-3 text-center">Tipo / É Posto?</th>
              <th className="p-3">Palavras-Chave de Busca</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Carregando lista de vínculos...
                </td>
              </tr>
            ) : filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-400">
                  Nenhum vínculo encontrado. Clique em "+ Criar Novo Vínculo" para adicionar.
                </td>
              </tr>
            ) : (
              filteredMappings.map((m) => {
                const isPosto = Boolean(m.is_posto);
                return (
                  <tr key={m.id || m.code} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="p-3 font-mono font-black text-blue-600 bg-blue-50/40 rounded-lg">
                      {m.code}
                    </td>
                    <td className="p-3 font-bold text-zinc-900">{m.target_name}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 font-semibold text-[11px] border border-zinc-200">
                        {m.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleTogglePostoInline(m)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer border ${
                          isPosto
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-xs"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                        }`}
                        title={
                          isPosto
                            ? "Marcado como Posto de Combustível. Clique para alterar para Outras Despesas."
                            : "Marcado como Outras Despesas. Clique para marcar como Posto de Combustível."
                        }
                      >
                        <Fuel className={`w-3.5 h-3.5 ${isPosto ? "text-emerald-600" : "text-zinc-400"}`} />
                        <span>{isPosto ? "⛽ Posto / Combustível" : "Outras Despesas"}</span>
                      </button>
                    </td>
                    <td className="p-3 text-zinc-500 max-w-xs truncate font-mono text-[11px]">
                      {(m.keywords || []).join(", ") || "-"}
                    </td>
                    <td className="p-3 text-center">
                      {m.active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-bold text-[10px]">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                        title="Editar Vínculo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Excluir Vínculo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal create / edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-zinc-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Link2 className="w-5 h-5" />
                </div>
                <h3 className="font-black text-zinc-900 text-base">
                  {editingMapping ? "Editar Vínculo de Conta" : "Novo Vínculo (De-Para)"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Código */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 mb-1 block">
                    Código do PDF/ERP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 104 ou 106"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Ex: 104, 106, 06.01.002</p>
                </div>

                {/* Nome/Produto */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 mb-1 block">
                    Nome Mapeado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Diesel S10 ou Gasolina"
                    value={formTargetName}
                    onChange={(e) => setFormTargetName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Descrição legível para o relatório</p>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-bold text-zinc-700 mb-1 block">
                  Categoria Principal no CheckDrive
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* POSTO DE COMBUSTÍVEL CARD TOGGLE */}
              <div
                onClick={() => setFormIsPosto(!formIsPosto)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  formIsPosto
                    ? "bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/40"
                    : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 transition-colors ${
                      formIsPosto ? "bg-emerald-600 text-white shadow-xs" : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-900">
                        É Posto de Combustível / Abastecimento?
                      </span>
                      <input
                        type="checkbox"
                        checked={formIsPosto}
                        onChange={(e) => setFormIsPosto(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                      {formIsPosto ? (
                        <span className="text-emerald-800 font-medium">
                          ✓ Sim, esta conta representa combustível/abastecimento e será incluída nos cálculos de litragem, consumo médio e gráficos de postos.
                        </span>
                      ) : (
                        <span>
                          Não, esta conta será classificada como despesa geral ou manutenção operacional.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-xs font-bold text-zinc-700 mb-1 block">
                  Palavras-Chave de Busca (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 104, diesel s10, s10, diesel-s10"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300"
                />
                <label htmlFor="activeCheck" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  Vínculo Ativo na Importação
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {saving ? "Salvando..." : "Salvar Vínculo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
