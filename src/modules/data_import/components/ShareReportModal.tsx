import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { ImportRecord } from "../types";
import { SharedReportService, SharedReportConfig } from "../services/sharedReportService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  currentTitle?: string;
  filters: {
    categoryFilter: string;
    tipoImportacaoFilter: string;
    selectedPeriod: string;
    customMonth: string;
    placaFilter: string;
    fornecedorFilter: string;
    agruparPor: string;
    metrica: string;
    tipoGrafico: string;
    viewMode: string;
  };
  records: ImportRecord[];
  overallMetrics: {
    totalValorGeral: number;
    totalQtyGeral: number;
    totalRegistrosCount: number;
    mediaValorGeral: number;
  };
}

export default function ShareReportModal({
  isOpen,
  onClose,
  companyId,
  currentTitle = "Relatório de Importação e Análise de Custos",
  filters,
  records,
  overallMetrics,
}: Props) {
  const [shareId, setShareId] = useState<string>("");
  const [accessCode, setAccessCode] = useState<string>("");
  const [allowFilters, setAllowFilters] = useState<boolean>(true);
  const [title, setTitle] = useState<string>(currentTitle);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stableShareId = SharedReportService.generateShareId(companyId);
      setShareId(stableShareId);
      setTitle(currentTitle);
      setSavedSuccess(false);
      setCopiedLink(false);
      setCopiedCode(false);
      setCopiedMessage(false);

      // Attempt to load existing share config to preserve settings or PIN unless user regenerates
      SharedReportService.getSharedReport(stableShareId).then((existing) => {
        if (existing) {
          if (existing.access_code) setAccessCode(existing.access_code);
          else setAccessCode(SharedReportService.generateAccessCode());
          if (existing.title) setTitle(existing.title);
          if (typeof existing.allow_filters === "boolean") setAllowFilters(existing.allow_filters);
        } else {
          setAccessCode(SharedReportService.generateAccessCode());
          setAllowFilters(true);
        }
      });
    }
  }, [isOpen, companyId, currentTitle]);

  // Auto-save active report configuration whenever key fields change
  useEffect(() => {
    if (isOpen && shareId && accessCode) {
      const reportConfig: SharedReportConfig = {
        id: shareId,
        company_id: companyId,
        title: title || "Relatório Compartilhado",
        access_code: accessCode,
        allow_filters: allowFilters,
        created_at: new Date().toISOString(),
        created_by_name: "CheckDrive Admin",
        filters,
        records_snapshot: records,
        overall_metrics: overallMetrics,
      };
      SharedReportService.saveSharedReport(reportConfig).then(() => {
        setSavedSuccess(true);
      });
    }
  }, [isOpen, shareId, accessCode, allowFilters, title, companyId, filters, records, overallMetrics]);

  if (!isOpen) return null;

  const fullShareUrl = `${window.location.origin}/relatorio-compartilhado/${shareId}`;

  const handleRegenerateCode = () => {
    setAccessCode(SharedReportService.generateAccessCode());
  };

  const handleCopyLink = () => {
    // Ensure saved
    if (shareId && accessCode) {
      const reportConfig: SharedReportConfig = {
        id: shareId,
        company_id: companyId,
        title: title || "Relatório Compartilhado",
        access_code: accessCode,
        allow_filters: allowFilters,
        created_at: new Date().toISOString(),
        created_by_name: "CheckDrive Admin",
        filters,
        records_snapshot: records,
        overall_metrics: overallMetrics,
      };
      SharedReportService.saveSharedReport(reportConfig);
    }
    navigator.clipboard.writeText(fullShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const fullMessageText = `📊 *Relatório CheckDrive*: ${title}
🔗 *Link de Acesso*: ${fullShareUrl}
🔑 *Código de Acesso (PIN)*: ${accessCode}

${allowFilters ? "⚡ *Filtros*: Liberados para navegação do leitor." : "🔒 *Filtros*: Congelados na visão do relatório."}
_Acesse o link e informe o código de acesso para visualizar._`;

  const handleCopyFullMessage = () => {
    if (shareId && accessCode) {
      const reportConfig: SharedReportConfig = {
        id: shareId,
        company_id: companyId,
        title: title || "Relatório Compartilhado",
        access_code: accessCode,
        allow_filters: allowFilters,
        created_at: new Date().toISOString(),
        created_by_name: "CheckDrive Admin",
        filters,
        records_snapshot: records,
        overall_metrics: overallMetrics,
      };
      SharedReportService.saveSharedReport(reportConfig);
    }
    navigator.clipboard.writeText(fullMessageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleSaveAndActivate = async () => {
    setSaving(true);
    try {
      const reportConfig: SharedReportConfig = {
        id: shareId,
        company_id: companyId,
        title: title || "Relatório Compartilhado",
        access_code: accessCode,
        allow_filters: allowFilters,
        created_at: new Date().toISOString(),
        created_by_name: "CheckDrive Admin",
        filters,
        records_snapshot: records,
        overall_metrics: overallMetrics,
      };

      await SharedReportService.saveSharedReport(reportConfig);
      setSavedSuccess(true);
      // Auto-copy full message on save for user convenience
      navigator.clipboard.writeText(fullMessageText);
      setCopiedMessage(true);
    } catch (e: any) {
      console.error("Erro ao salvar compartilhamento:", e);
      alert("Erro ao salvar compartilhamento: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
            <Share2 className="w-3.5 h-3.5" /> Compartilhamento Seguro via Link
          </div>
          <h3 className="text-xl font-black tracking-tight">Compartilhar Relatório com Proteção</h3>
          <p className="text-slate-300 text-xs mt-1">
            Gere um link direto com código de acesso (PIN) e defina a permissão de uso de filtros.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              Título do Relatório Compartilhado
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Relatório Mensal de Combustível e Frota"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 font-medium"
            />
          </div>

          {/* 1. Código de Acesso / PIN */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-900">Código de Acesso Protegido (PIN)</h4>
                  <p className="text-[11px] text-amber-700">Necessário para abrir e desbloquear o relatório.</p>
                </div>
              </div>
              <button
                onClick={handleRegenerateCode}
                className="px-2.5 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Gerar outro PIN aleatório"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Gerar Novo PIN
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Ex: 4829"
                className="w-36 px-3 py-2 text-center text-lg font-black tracking-widest bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-950"
              />
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? "Copiado!" : "Copiar PIN"}
              </button>
              <div className="text-[11px] text-amber-800 flex-1">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                Código gerado automaticamente. O leitor precisa digitá-lo para acessar.
              </div>
            </div>
          </div>

          {/* 2. Filtros Toggle Option */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900">Configuração do Uso de Filtros no Link</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setAllowFilters(true)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  allowFilters
                    ? "bg-blue-50/80 border-blue-600 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="allowFilters"
                  checked={allowFilters === true}
                  onChange={() => setAllowFilters(true)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-950">
                    <Unlock className="w-3.5 h-3.5 text-blue-600" /> Deixar Filtros Liberados
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    O leitor poderá interagir com os filtros (alterar período, categoria, veículos, gráficos).
                  </p>
                </div>
              </label>

              <label
                onClick={() => setAllowFilters(false)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  !allowFilters
                    ? "bg-purple-50/80 border-purple-600 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="allowFilters"
                  checked={allowFilters === false}
                  onChange={() => setAllowFilters(false)}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                    <Lock className="w-3.5 h-3.5 text-purple-600" /> Congelar / Bloquear Filtros
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    O leitor verá apenas a visão congelada com os filtros atuais, sem poder alterá-los.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Link gerado */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" /> Link de Compartilhamento Gerado
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ID: {shareId}</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullShareUrl}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copiado!" : "Copiar Link"}
              </button>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Link Ativado com Sucesso!</strong> O relatório já está pronto para ser acessado com o PIN{" "}
                  <code className="bg-emerald-200 px-1.5 py-0.5 rounded font-black text-emerald-950">{accessCode}</code>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyFullMessage}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Copiar mensagem completa formatada com Link + PIN para WhatsApp"
          >
            {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Send className="w-4 h-4 text-emerald-600" />}
            {copiedMessage ? "Mensagem Copiada!" : "Copiar Texto com Link + PIN"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleSaveAndActivate}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {saving ? "Salvando..." : savedSuccess ? "Atualizar Link" : "Gerar & Ativar Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
