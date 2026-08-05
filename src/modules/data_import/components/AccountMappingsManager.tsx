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

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formTargetName, setFormTargetName] = useState("");
  const [formCategory, setFormCategory] = useState<RecordCategory | string>("Diesel");
  const [formKeywords, setFormKeywords] = useState("");
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

  const handleOpenAdd = () => {
    setEditingMapping(null);
    setFormCode("");
    setFormTargetName("");
    setFormCategory("Diesel");
    setFormKeywords("");
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
    setFormActive(m.active);
    setFormError("");
    setShowModal(true);
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

  const filteredMappings = mappings.filter(
    (m) =>
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.target_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                Configure como os códigos do ERP/PDF são convertidos automaticamente (ex: Código 104 = Diesel S10, Código 106 = Gasolina).
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
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <p className="font-bold">Como funciona a Inteligência de De-Para?</p>
          <p className="text-amber-800 leading-relaxed">
            Sempre que um relatório PDF ou planilha for importado e contiver o código ou nome mapeado (ex: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950">104</code> ou <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950">106</code>), o CheckDrive vai vincular o lançamento como <strong className="font-bold text-amber-950">Diesel S10</strong> ou <strong className="font-bold text-amber-950">Gasolina</strong> automaticamente!
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código (104, 106) ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <span className="text-xs font-semibold text-zinc-500">
          {filteredMappings.length} de {mappings.length} vínculos cadastrados
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-200/80 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <th className="p-3">Código do ERP/PDF</th>
              <th className="p-3">Nome / Produto Mapeado</th>
              <th className="p-3">Categoria no CheckDrive</th>
              <th className="p-3">Palavras-Chave de Busca</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Carregando lista de vínculos...
                </td>
              </tr>
            ) : filteredMappings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400">
                  Nenhum vínculo encontrado. Clique em "+ Criar Novo Vínculo" para adicionar.
                </td>
              </tr>
            ) : (
              filteredMappings.map((m) => (
                <tr key={m.id || m.code} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="p-3 font-mono font-black text-blue-600 bg-blue-50/50 rounded-lg">
                    {m.code}
                  </td>
                  <td className="p-3 font-bold text-zinc-900">{m.target_name}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 font-semibold text-[11px] border border-zinc-200">
                      {m.category}
                    </span>
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
              ))
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
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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
