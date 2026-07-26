import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  RotateCcw,
  X,
  Check,
  Search,
  Filter,
  TrendingDown,
  Sparkles,
  Activity,
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  History,
  CornerDownRight,
  Info,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Eye,
  SlidersHorizontal,
  Trash2,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Globe,
  Database,
  Tag,
  ArrowRight,
  Clock,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ClosingHistoryTab from "@/src/modules/company/components/ClosingHistoryTab";
import { runSilentAudit } from "@/src/lib/auditService";
import { purgeExpiredAuditLogs } from "@/src/lib/systemAuditService";
import { motion, AnimatePresence } from "motion/react";

interface AuditTabProps {
  appSettings: any;
}

export default function AuditTab({ appSettings }: AuditTabProps) {
  const { user } = useAuth();

  // Sub-tabs: 'system' (Auditoria Alterações Sistema), 'score' (Logs de Score & Penalidades), 'closings' (Histórico de Fechamentos)
  const [activeSubTab, setActiveSubTab] = useState<"system" | "score" | "closings">("system");

  // --- SYSTEM AUDIT LOGS STATE ---
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [selectedSystemLog, setSelectedSystemLog] = useState<any | null>(null);

  // Filters for System Audit
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Retention
  const [retentionDays, setRetentionDays] = useState<number>(365);
  const [isPurging, setIsPurging] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  // --- DRIVER SCORE LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingScore, setLoadingScore] = useState(true);

  // Contest states
  const [contestingLog, setContestingLog] = useState<any>(null);
  const [contestReason, setContestReason] = useState("");
  const [contestPointsAmount, setContestPointsAmount] = useState<number>(0);
  const [isSavingContest, setIsSavingContest] = useState(false);

  // Filter states for score
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Notifications & Confirm Modals
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  useEffect(() => {
    fetchSystemLogs();
    fetchScoreAuditLogs();
  }, []);

  // Handle toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToastMsg = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
  };

  // --- FETCH SYSTEM AUDIT LOGS ---
  const fetchSystemLogs = async () => {
    setLoadingSystem(true);
    try {
      let query = supabase
        .from("system_audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (user?.company_id) {
        query = query.eq("company_id", user.company_id);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("system_audit_logs query failed, attempting fallback query on audit_logs:", error.message);
        // Fallback to audit_logs for system_action
        let fallbackQuery = supabase
          .from("audit_logs")
          .select("*")
          .eq("type", "system_action")
          .order("created_at", { ascending: false });

        if (user?.company_id) {
          fallbackQuery = fallbackQuery.eq("company_id", user.company_id);
        }
        const { data: fallbackData } = await fallbackQuery;
        setSystemLogs(fallbackData || []);
      } else {
        setSystemLogs(data || []);
      }
    } catch (error: any) {
      console.error("Erro ao carregar auditoria do sistema:", error);
      showToastMsg("Erro ao carregar os registros de auditoria.", "error");
    } finally {
      setLoadingSystem(false);
    }
  };

  // --- FETCH DRIVER SCORE LOGS ---
  const fetchScoreAuditLogs = async () => {
    setLoadingScore(true);
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, profiles!audit_logs_driver_id_fkey(full_name)")
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false });
      setAuditLogs(data || []);
    } catch (error) {
      console.error("Erro ao buscar logs de auditoria:", error);
    } finally {
      setLoadingScore(false);
    }
  };

  // --- PURGE EXPIRED LOGS ---
  const handlePurgeLogs = async () => {
    if (!user?.company_id) return;
    setIsPurging(true);
    try {
      const res = await purgeExpiredAuditLogs(user.company_id, retentionDays);
      showToastMsg(`Limpeza concluída! ${res.deleted} registros expirados foram removidos.`);
      setShowRetentionModal(false);
      fetchSystemLogs();
    } catch (err: any) {
      showToastMsg("Erro ao remover logs expirados: " + err.message, "error");
    } finally {
      setIsPurging(false);
    }
  };

  // --- FILTER SYSTEM LOGS ---
  const filteredSystemLogs = systemLogs.filter((log) => {
    // Search query
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (log.user_name || "").toLowerCase().includes(searchLower) ||
      (log.user_email || "").toLowerCase().includes(searchLower) ||
      (log.module || "").toLowerCase().includes(searchLower) ||
      (log.action || "").toLowerCase().includes(searchLower) ||
      (log.entity || "").toLowerCase().includes(searchLower) ||
      (log.entity_id || "").toLowerCase().includes(searchLower) ||
      (log.reason || "").toLowerCase().includes(searchLower);

    // Module
    const matchesModule = selectedModule === "all" || log.module === selectedModule;

    // Action
    const matchesAction = selectedAction === "all" || log.action === selectedAction;

    // Entity
    const matchesEntity = selectedEntity === "all" || log.entity === selectedEntity;

    // User
    const matchesUser = selectedUser === "all" || log.user_id === selectedUser || log.user_name === selectedUser;

    // Date range
    let matchesDate = true;
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      const logTime = new Date(log.created_at).getTime();
      if (logTime < from) matchesDate = false;
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      const logTime = new Date(log.created_at).getTime();
      if (logTime > to) matchesDate = false;
    }

    return matchesSearch && matchesModule && matchesAction && matchesEntity && matchesUser && matchesDate;
  });

  // Unique lists for dropdown filters
  const availableModules = Array.from(new Set(systemLogs.map((l) => l.module).filter(Boolean)));
  const availableActions = Array.from(new Set(systemLogs.map((l) => l.action).filter(Boolean)));
  const availableEntities = Array.from(new Set(systemLogs.map((l) => l.entity).filter(Boolean)));
  const availableUsers = Array.from(
    new Map(
      systemLogs
        .filter((l) => l.user_id || l.user_name)
        .map((l) => [l.user_id || l.user_name, { id: l.user_id || l.user_name, name: l.user_name || l.user_email || "Usuário" }])
    ).values()
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSystemLogs.length / itemsPerPage) || 1;
  const paginatedSystemLogs = filteredSystemLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- EXPORT TO CSV / EXCEL ---
  const handleExportCSV = () => {
    if (filteredSystemLogs.length === 0) {
      showToastMsg("Nenhum registro para exportar com os filtros atuais.", "info");
      return;
    }

    const headers = [
      "ID",
      "Data/Hora",
      "Empresa ID",
      "Usuário",
      "E-mail Usuário",
      "Perfil",
      "Módulo",
      "Ação",
      "Entidade",
      "ID da Entidade",
      "Campo Alterado",
      "Valores Antigos",
      "Valores Novos",
      "Endereço IP",
      "Dispositivo/User Agent",
      "Resumo",
    ];

    const rows = filteredSystemLogs.map((log) => [
      log.id,
      new Date(log.created_at).toLocaleString("pt-BR"),
      log.company_id || "",
      log.user_name || "Sistema",
      log.user_email || "",
      log.user_role || "",
      log.module || "",
      log.action || "",
      log.entity || "",
      log.entity_id || "",
      log.field_changed || "",
      log.old_value ? JSON.stringify(log.old_value).replace(/"/g, '""') : "",
      log.new_value ? JSON.stringify(log.new_value).replace(/"/g, '""') : "",
      log.ip_address || "",
      (log.user_agent || "").replace(/"/g, '""'),
      (log.reason || "").replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.map((val) => `"${val}"`).join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_sistema_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastMsg("Relatório CSV gerado e baixado com sucesso!");
  };

  // --- EXPORT TO PRINT / PDF ---
  const handleExportPDF = () => {
    if (filteredSystemLogs.length === 0) {
      showToastMsg("Nenhum registro para exportar com os filtros atuais.", "info");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToastMsg("Não foi possível abrir a janela de impressão.", "error");
      return;
    }

    const rowsHtml = filteredSystemLogs
      .map(
        (log) => `
        <tr>
          <td>${new Date(log.created_at).toLocaleString("pt-BR")}</td>
          <td><b>${log.user_name || "Sistema"}</b><br/><small>${log.user_email || ""}</small></td>
          <td><span class="badge module">${log.module || "-"}</span></td>
          <td><span class="badge action action-${(log.action || "").toLowerCase()}">${log.action || "-"}</span></td>
          <td><b>${log.entity || "-"}</b> ${log.entity_id ? `(#${log.entity_id})` : ""}</td>
          <td>${log.reason || "-"}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Auditoria do Sistema - CheckDrive</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #1e293b; font-size: 11px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 11px; }
          .filter-info { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 9px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          .badge { padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase; display: inline-block; }
          .badge.module { background: #e0f2fe; color: #0369a1; }
          .badge.action { background: #f1f5f9; color: #334155; }
          .badge.action-criar { background: #dcfce7; color: #15803d; }
          .badge.action-editar { background: #dbeafe; color: #1d4ed8; }
          .badge.action-excluir { background: #ffe4e6; color: #be123c; }
          .footer { margin-top: 30px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>CheckDrive - Relatório Oficial de Auditoria de Sistema</h1>
            <p>Histórico rastreável de modificações e eventos operacionais</p>
          </div>
          <div style="text-align: right;">
            <strong>Data do Relatório:</strong> ${new Date().toLocaleString("pt-BR")}<br/>
            <strong>Total Registros:</strong> ${filteredSystemLogs.length}
          </div>
        </div>

        <div class="filter-info">
          <strong>Filtros Aplicados:</strong> Módulo: ${selectedModule} | Ação: ${selectedAction} | Entidade: ${selectedEntity} | Usuário: ${selectedUser} ${dateFrom ? `| De: ${dateFrom}` : ""} ${dateTo ? `| Até: ${dateTo}` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 130px;">Data / Hora</th>
              <th style="width: 150px;">Usuário Responsável</th>
              <th style="width: 100px;">Módulo</th>
              <th style="width: 90px;">Ação</th>
              <th style="width: 120px;">Entidade / Alvo</th>
              <th>Resumo da Alteração</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Relatório gerado automaticamente pelo módulo de auditoria do sistema CheckDrive.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- ACTION BADGE COLOR HELPER ---
  const getActionBadgeClass = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CRIAR") || act.includes("INCLUIR") || act.includes("APROVAR") || act.includes("RESTAURAR")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (act.includes("EDITAR") || act.includes("ALTERAR") || act.includes("ATUALIZAR")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (act.includes("EXCLUIR") || act.includes("DELETAR") || act.includes("REMOVER") || act.includes("REPROVAR") || act.includes("BLOQUEAR")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (act.includes("LOGIN") || act.includes("LOGOUT")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  };

  // --- EXECUTING DRIVER SCORE AUDIT ---
  const handleRunAudit = async (silent = false) => {
    if (silent) {
      setSaving(true);
      try {
        await runSilentAudit(user?.company_id);
        fetchScoreAuditLogs();
      } catch (error) {
        console.error("Silent audit background error:", error);
      } finally {
        setSaving(false);
      }
    } else {
      setShowRunConfirm(true);
    }
  };

  const executeRunAudit = async () => {
    setShowRunConfirm(false);
    setSaving(true);
    try {
      await runSilentAudit();
      showToastMsg("Auditoria de penalidades concluída com sucesso!");
      fetchScoreAuditLogs();
    } catch (error: any) {
      showToastMsg("Erro na auditoria: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // --- SCORE CONTESTATION ---
  const handleContestLog = async () => {
    if (!contestReason.trim() || !contestingLog || contestPointsAmount <= 0 || contestPointsAmount > contestingLog.amount) return;

    setIsSavingContest(true);
    try {
      const prefix = contestPointsAmount < contestingLog.amount ? "[CONTESTADO PARCIALMENTE]" : "[CONTESTADO]";
      const newReason = contestingLog.reason.includes("[CONTESTADO") ? contestingLog.reason : `${prefix} ${contestingLog.reason}`;

      await supabase.from("audit_logs").update({ reason: newReason }).eq("id", contestingLog.id);

      if (contestingLog.driver_id) {
        const { data: perf } = await supabase.from("driver_performance").select("score").eq("driver_id", contestingLog.driver_id).maybeSingle();
        let currentScore = perf?.score || appSettings?.initial_value || 1000;

        await supabase.from("driver_performance").upsert({
          driver_id: contestingLog.driver_id,
          score: currentScore + Number(contestPointsAmount),
          updated_at: new Date().toISOString(),
        });
      }

      await supabase.from("audit_logs").insert({
        company_id: user?.company_id,
        driver_id: contestingLog.driver_id,
        type: "reversal",
        amount: Number(contestPointsAmount),
        reason: `Reversão/Contestação: ${contestReason}`,
      });

      setContestingLog(null);
      setContestReason("");
      setContestPointsAmount(0);
      showToastMsg("Contestação e reversão geradas com sucesso!");
      fetchScoreAuditLogs();
    } catch (err: any) {
      showToastMsg("Erro ao contestar: " + err.message, "error");
    } finally {
      setIsSavingContest(false);
    }
  };

  // Stats for score
  const totalPenalties = auditLogs.filter((log) => log.type === "penalty").reduce((sum, log) => sum + (log.amount || 0), 0);
  const totalRewardsAndReversals = auditLogs.filter((log) => log.type === "reward" || log.type === "reversal").reduce((sum, log) => sum + (log.amount || 0), 0);

  const filteredScoreLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.profiles?.full_name || "Sistema").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "all") return matchesSearch;
    if (filterType === "penalty") return matchesSearch && log.type === "penalty";
    if (filterType === "reward") return matchesSearch && log.type === "reward";
    if (filterType === "reversal") return matchesSearch && log.type === "reversal";
    if (filterType === "manual") return matchesSearch && log.type !== "penalty" && log.type !== "reward" && log.type !== "reversal";
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans antialiased text-zinc-800">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3.5 px-4.5 py-3 rounded-xl shadow-xl border bg-white text-xs font-semibold tracking-tight"
            style={{
              borderColor: toast.type === "success" ? "#bbf7d0" : toast.type === "error" ? "#fecaca" : "#bfdbfe",
            }}
          >
            <div
              className={`p-1.5 rounded-lg ${
                toast.type === "success" ? "bg-emerald-50 text-emerald-600" : toast.type === "error" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              {toast.type === "success" ? <Check size={14} className="stroke-[2.5]" /> : <Info size={14} className="stroke-[2.5]" />}
            </div>
            <span className="text-zinc-700">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-zinc-400 hover:text-zinc-600 ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Sub-Tab Selection Header */}
      <div className="flex bg-zinc-100/90 rounded-2xl p-1.5 border border-zinc-200/60 max-w-2xl mx-auto shadow-xs">
        <button
          onClick={() => setActiveSubTab("system")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "system"
              ? "bg-white shadow-md text-primary border border-zinc-200/80 font-black"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50"
          }`}
        >
          <ShieldCheck size={15} className={activeSubTab === "system" ? "text-primary" : "text-zinc-400"} />
          <span>Auditoria Alterações Sistema</span>
        </button>
        <button
          onClick={() => setActiveSubTab("score")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "score"
              ? "bg-white shadow-md text-primary border border-zinc-200/80 font-black"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50"
          }`}
        >
          <Activity size={15} className={activeSubTab === "score" ? "text-primary" : "text-zinc-400"} />
          <span>Logs de Score & Penalidades</span>
        </button>
        <button
          onClick={() => setActiveSubTab("closings")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "closings"
              ? "bg-white shadow-md text-primary border border-zinc-200/80 font-black"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/50"
          }`}
        >
          <History size={15} className={activeSubTab === "closings" ? "text-primary" : "text-zinc-400"} />
          <span>Fechamentos</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* 1. SUB-TAB: AUDITORIA DE ALTERAÇÕES DO SISTEMA                              */}
      {/* -------------------------------------------------------------------------- */}
      {activeSubTab === "system" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Top Banner and Quick Stats */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-zinc-900 uppercase tracking-wide">
                      Auditoria de Alterações do Sistema
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Rastreamento transparente e automático de modificações, cadastros, exclusões e logins.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Export PDF, Export CSV, Retention Config */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleExportPDF}
                  className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-zinc-200"
                >
                  <Printer size={15} className="text-zinc-600" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="h-10 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-emerald-200"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>Exportar Excel (CSV)</span>
                </button>
                <button
                  onClick={() => setShowRetentionModal(true)}
                  className="h-10 px-4 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                >
                  <SlidersHorizontal size={15} />
                  <span>Retenção de Logs</span>
                </button>
              </div>
            </div>

            {/* Comprehensive Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
              {/* Text Search */}
              <div className="lg:col-span-2 relative">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Pesquisa por Texto / ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por usuário, entidade, ID..."
                    className="w-full h-9.5 pl-9 pr-8 bg-zinc-50 hover:bg-zinc-100/60 focus:bg-white border border-zinc-200 focus:border-primary rounded-xl text-xs font-medium transition-all outline-none"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Module Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Módulo
                </label>
                <select
                  value={selectedModule}
                  onChange={(e) => {
                    setSelectedModule(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 outline-none focus:border-primary"
                >
                  <option value="all">Todos os Módulos</option>
                  {availableModules.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Ação
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 outline-none focus:border-primary"
                >
                  <option value="all">Todas as Ações</option>
                  {availableActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Usuário
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9.5 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 outline-none focus:border-primary"
                >
                  <option value="all">Todos os Usuários</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From & To */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    De
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9.5 px-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Até
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9.5 px-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-700 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log Data Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <span className="text-xs font-bold text-zinc-600">
                Exibindo <strong className="text-zinc-900">{filteredSystemLogs.length}</strong> eventos registrados
              </span>

              {/* Page items size selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-medium">Linhas por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-150">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Data / Hora
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Usuário Responsável
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Módulo
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Entidade / Alvo
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Resumo
                    </th>
                    <th className="px-5 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loadingSystem ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={24} className="animate-spin text-zinc-400" />
                          <span className="text-xs text-zinc-500 font-bold">Carregando histórico de auditoria...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSystemLogs.length > 0 ? (
                    paginatedSystemLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedSystemLog(log)}
                        className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 text-xs font-semibold text-zinc-500 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-600">
                              {(log.user_name || "S")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-800">{log.user_name || "Sistema"}</p>
                              {log.user_email && <p className="text-[10px] text-zinc-400">{log.user_email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                            {log.module || "Geral"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action || "Ação"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs font-bold text-zinc-700">
                            {log.entity || "-"}
                            {log.entity_id ? (
                              <span className="text-[10px] font-mono text-zinc-400 ml-1">#{log.entity_id}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[300px]">
                          <p className="text-xs text-zinc-600 font-medium truncate group-hover:text-zinc-900">
                            {log.reason || "Sem descrição"}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSystemLog(log);
                            }}
                            className="p-1.5 hover:bg-zinc-200/80 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors"
                            title="Ver Detalhes do Registro"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs text-zinc-400 font-bold italic">
                        Nenhum registro de auditoria encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <span className="text-xs text-zinc-500 font-medium">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-white border border-zinc-200 rounded-lg disabled:opacity-40 text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-white border border-zinc-200 rounded-lg disabled:opacity-40 text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 2. SUB-TAB: LOGS DE SCORE & PENALIDADES (MOTORISTAS)                       */}
      {/* -------------------------------------------------------------------------- */}
      {activeSubTab === "score" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
          {/* Quick Stats Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total em Multas</p>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
                  <TrendingDown size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-rose-600 mt-2">
                -{totalPenalties} <span className="text-[11px] font-black uppercase font-sans text-zinc-400">pts</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-bold">
                <ShieldAlert size={12} className="text-zinc-400" />
                <span>Penalidades automáticas aplicadas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Prêmios & Reversões</p>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500">
                  <Sparkles size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-600 mt-2">
                +{totalRewardsAndReversals} <span className="text-[11px] font-black uppercase font-sans text-zinc-400">pts</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-bold">
                <Check size={12} className="text-emerald-500 stroke-[3]" />
                <span>Contestações e incentivos manuais</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Movimentações Ativas</p>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500">
                  <Activity size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-indigo-700 mt-2">
                {auditLogs.length} <span className="text-[11px] font-black uppercase font-sans text-zinc-400">logs</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-zinc-500 font-bold">
                <Info size={12} className="text-indigo-400" />
                <span>Registros de pontuação de motoristas</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-gradient-to-r from-zinc-50 to-white rounded-2xl border border-zinc-200/80 p-5 flex flex-col md:flex-row items-center justify-between gap-4.5 shadow-xs">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider">Verificação de Score Automática</h3>
              </div>
              <p className="text-xs text-zinc-500 font-medium">As decisões de escalas atrasadas e faltas de checklist são verificadas no motor de pontuação.</p>
            </div>
            <button
              onClick={() => handleRunAudit(false)}
              disabled={saving}
              className="w-full md:w-auto h-11 px-6 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  <span>Executar Auditoria de Score</span>
                </>
              )}
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-xs overflow-hidden">
            <div className="p-4.5 border-b border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por motorista ou motivo..."
                  className="w-full h-9.5 pl-9 pr-4 bg-zinc-50 border border-zinc-200 focus:border-primary rounded-xl text-xs font-medium outline-none"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "Todos" },
                  { id: "penalty", label: "Multas" },
                  { id: "reward", label: "Bônus" },
                  { id: "reversal", label: "Reversões" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setFilterType(pill.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      filterType === pill.id ? "bg-zinc-900 text-white shadow-xs" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border border-zinc-200/40"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-150">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data / Hora</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Motorista</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Pontuação</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Justificativa</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loadingScore ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 size={24} className="animate-spin text-zinc-300 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredScoreLogs.length > 0 ? (
                    filteredScoreLogs.map((log) => {
                      const isDeduction = log.type === "penalty" || (log.type === "manual" && log.amount > 0);
                      const isContested = log.reason.includes("[CONTESTADO]");
                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-semibold text-zinc-500 font-mono">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-zinc-800">{log.profiles?.full_name || "SISTEMA"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                log.type === "penalty" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              }`}
                            >
                              {log.type === "penalty" ? "Multa" : log.type === "reversal" ? "Reversão" : "Bônus"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-black text-xs">
                            <span className={log.type === "reward" || log.type === "reversal" ? "text-emerald-600" : "text-rose-600"}>
                              {log.type === "reward" || log.type === "reversal" ? "+" : "-"}{log.amount} pts
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-[280px]">
                            <p className="text-xs text-zinc-500 font-medium truncate" title={log.reason}>
                              {log.reason}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isDeduction && !isContested ? (
                              <button
                                onClick={() => {
                                  setContestingLog(log);
                                  setContestPointsAmount(log.amount);
                                }}
                                className="px-3 py-1 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
                              >
                                Contestar
                              </button>
                            ) : isContested ? (
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">Revertido</span>
                            ) : (
                              <span className="text-zinc-300">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-zinc-400 font-bold">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 3. SUB-TAB: HISTÓRICO DE FECHAMENTOS                                       */}
      {/* -------------------------------------------------------------------------- */}
      {activeSubTab === "closings" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <ClosingHistoryTab />
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES COMPLETOS DA AUDITORIA DO SISTEMA (VISUAL DIFF)          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedSystemLog && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-zinc-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-xl text-primary">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Detalhes do Registro de Auditoria
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">ID: {selectedSystemLog.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSystemLog(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60">
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Data e Hora</span>
                    <span className="font-bold font-mono text-zinc-800">
                      {new Date(selectedSystemLog.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Usuário</span>
                    <span className="font-bold text-zinc-800">{selectedSystemLog.user_name || "Sistema"}</span>
                    {selectedSystemLog.user_email && (
                      <span className="block text-[10px] text-zinc-500">{selectedSystemLog.user_email}</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Módulo / Ação</span>
                    <span className="font-bold text-zinc-800">
                      {selectedSystemLog.module} - {selectedSystemLog.action}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Entidade Alvo</span>
                    <span className="font-bold text-zinc-800">
                      {selectedSystemLog.entity} {selectedSystemLog.entity_id ? `#${selectedSystemLog.entity_id}` : ""}
                    </span>
                  </div>
                </div>

                {/* Additional Client Metadata */}
                {(selectedSystemLog.ip_address || selectedSystemLog.user_agent) && (
                  <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-zinc-100/60 rounded-xl text-[11px] text-zinc-600 font-mono border border-zinc-200/50">
                    {selectedSystemLog.ip_address && (
                      <div className="flex items-center gap-1.5">
                        <Globe size={13} className="text-zinc-400" />
                        <span>IP: {selectedSystemLog.ip_address}</span>
                      </div>
                    )}
                    {selectedSystemLog.user_agent && (
                      <div className="flex items-center gap-1.5 truncate max-w-md">
                        <Laptop size={13} className="text-zinc-400 shrink-0" />
                        <span className="truncate">{selectedSystemLog.user_agent}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Box */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1">Resumo Executivo</h4>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-zinc-800 font-medium leading-relaxed">
                    {selectedSystemLog.reason || "Sem resumo informado."}
                  </div>
                </div>

                {/* VISUAL DIFF: Old Value vs New Value */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 flex items-center justify-between">
                    <span>Comparativo de Valores (Antes vs Depois)</span>
                    {selectedSystemLog.field_changed && (
                      <span className="text-primary font-mono">Campo: {selectedSystemLog.field_changed}</span>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old Value */}
                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-rose-200/60 text-rose-800 font-bold text-xs">
                        <span>Valor Anterior (Antes)</span>
                        <span className="text-[10px] bg-rose-100 px-2 py-0.5 rounded font-mono">Original</span>
                      </div>
                      <pre className="text-[11px] font-mono text-rose-950 overflow-x-auto whitespace-pre-wrap break-all max-h-60 p-2 bg-white/80 rounded-xl border border-rose-100">
                        {selectedSystemLog.old_value
                          ? typeof selectedSystemLog.old_value === "object"
                            ? JSON.stringify(selectedSystemLog.old_value, null, 2)
                            : String(selectedSystemLog.old_value)
                          : "Nenhum valor anterior (Novo registro)"}
                      </pre>
                    </div>

                    {/* New Value */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-200/60 text-emerald-800 font-bold text-xs">
                        <span>Novo Valor (Depois)</span>
                        <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded font-mono">Atualizado</span>
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-950 overflow-x-auto whitespace-pre-wrap break-all max-h-60 p-2 bg-white/80 rounded-xl border border-emerald-100">
                        {selectedSystemLog.new_value
                          ? typeof selectedSystemLog.new_value === "object"
                            ? JSON.stringify(selectedSystemLog.new_value, null, 2)
                            : String(selectedSystemLog.new_value)
                          : "Nenhum novo valor informado"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => setSelectedSystemLog(null)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Fechar Visualização
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURAÇÃO DE RETENÇÃO DE LOGS DE AUDITORIA                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRetentionModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-100 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2 text-zinc-900">
                  <SlidersHorizontal size={18} className="text-primary" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Política de Retenção de Logs</h3>
                </div>
                <button onClick={() => setShowRetentionModal(false)} className="text-zinc-400 hover:text-zinc-700">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Defina por quanto tempo os registros de auditoria serão preservados no banco de dados. Registros mais antigos que o período selecionado podem ser limpos para manter a alta performance.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { value: 90, label: "90 dias (3 meses)", desc: "Recomendado para alto volume de dados" },
                  { value: 180, label: "180 dias (6 meses)", desc: "Equilíbrio entre histórico e performance" },
                  { value: 365, label: "365 dias (1 ano)", desc: "Padrão corporativo para conformidade" },
                  { value: 0, label: "Ilimitado", desc: "Mantém todos os registros indefinidamente" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setRetentionDays(opt.value)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      retentionDays === opt.value ? "bg-primary/5 border-primary text-zinc-900" : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="retention"
                      checked={retentionDays === opt.value}
                      onChange={() => setRetentionDays(opt.value)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-xs font-bold">{opt.label}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRetentionModal(false)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePurgeLogs}
                  disabled={isPurging || retentionDays === 0}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isPurging ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Limpando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Limpar Expirados</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Running Driver Score Audit */}
      <AnimatePresence>
        {showRunConfirm && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-100 p-6 text-center"
            >
              <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800">Forçar Auditoria de Escalas</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                Deseja realmente iniciar a verificação de escalas pendentes para aplicar penalidades automáticas no perfil dos motoristas?
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRunConfirm(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeRunAudit}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Sim, Processar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contest Modal */}
      <AnimatePresence>
        {contestingLog && (
          <div className="fixed inset-0 bg-zinc-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <RotateCcw size={18} />
                  <h3 className="text-xs font-black uppercase tracking-wider">Contestar Operação de Pontuação</h3>
                </div>
                <button onClick={() => setContestingLog(null)} className="text-zinc-400 hover:text-zinc-700">
                  <X size={16} />
                </button>
              </div>

              <div className="bg-zinc-50 p-4 rounded-2xl mb-4 text-xs space-y-1">
                <p className="font-bold text-zinc-800">{contestingLog.profiles?.full_name}</p>
                <p className="text-zinc-500 italic">"{contestingLog.reason}"</p>
                <p className="text-rose-600 font-mono font-bold">-{contestingLog.amount} pts</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Pontos a Reverter (Máx: {contestingLog.amount})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={contestingLog.amount}
                    value={contestPointsAmount}
                    onChange={(e) => setContestPointsAmount(Math.min(contestingLog.amount, Math.max(1, Number(e.target.value))))}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold font-mono outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Justificativa da Reversão
                  </label>
                  <textarea
                    value={contestReason}
                    onChange={(e) => setContestReason(e.target.value)}
                    className="w-full h-20 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:border-primary resize-none"
                    placeholder="Informe o motivo da reversão de pontos..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setContestingLog(null)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleContestLog}
                  disabled={isSavingContest || !contestReason.trim() || contestPointsAmount <= 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isSavingContest ? <Loader2 size={14} className="animate-spin" /> : "Reverter Pontos"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
