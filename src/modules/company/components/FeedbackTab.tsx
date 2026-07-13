import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Sparkles,
  Inbox,
  PenTool,
  CornerDownRight,
  Info,
  CalendarRange,
  Gauge,
  ArrowUpDown
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { motion, AnimatePresence } from "motion/react";

interface AdminNote {
  text: string;
  updatedAt: string;
  author: string;
}

export default function FeedbackTab() {
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced filters
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "complaint" | "suggestion">("all");
  const [authorFilter, setAuthorFilter] = useState<"all" | "named" | "anonymous">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Interaction notes (saved locally to enhance the user experience)
  const [notes, setNotes] = useState<{ [feedbackId: string]: AdminNote }>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pendingNoteText, setPendingNoteText] = useState("");

  // UI States
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);
  const [feedbackToDelete, setFeedbackToDelete] = useState<any>(null);

  useEffect(() => {
    fetchFeedbacks();
    loadNotes();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToastMsg = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
  };

  const loadNotes = () => {
    try {
      const savedNotes = localStorage.getItem("sgi_driver_feedback_notes");
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (e) {
      console.error("Erro ao ler notas salvas:", e);
    }
  };

  const saveNote = (feedbackId: string, text: string) => {
    try {
      const updatedNotes = {
        ...notes,
        [feedbackId]: {
          text,
          updatedAt: new Date().toISOString(),
          author: "Administrador"
        }
      };
      setNotes(updatedNotes);
      localStorage.setItem("sgi_driver_feedback_notes", JSON.stringify(updatedNotes));
      setEditingNoteId(null);
      setPendingNoteText("");
      showToastMsg("Observação interna anotada com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar nota:", e);
      showToastMsg("Erro ao salvar observação.", "error");
    }
  };

  const removeNote = (feedbackId: string) => {
    const updatedNotes = { ...notes };
    delete updatedNotes[feedbackId];
    setNotes(updatedNotes);
    localStorage.setItem("sgi_driver_feedback_notes", JSON.stringify(updatedNotes));
    showToastMsg("Observação excluída.");
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("app_feedback")
        .select(`
          *,
          profiles:driver_id(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (data) setFeedbacks(data);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      showToastMsg("Falha ao sincronizar feedbacks com o banco.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFeedback = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "resolved" ? "pending" : "resolved";

    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ status: newStatus })
        .eq("id", id);

      if (!error) {
        setFeedbacks(
          feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
        );
        showToastMsg(
          newStatus === "resolved" 
            ? "Mensagem classificada como RESOLVIDA!" 
            : "Mensagem movida de volta para PENDENTES."
        );
      } else {
        throw error;
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
      showToastMsg("Não foi possível atualizar o status do feedback.", "error");
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      const { error } = await supabase
        .from("app_feedback")
        .delete()
        .eq("id", feedbackToDelete.id);

      if (!error) {
        setFeedbacks(feedbacks.filter((f) => f.id !== feedbackToDelete.id));
        if (expandedFeedbackId === feedbackToDelete.id) {
          setExpandedFeedbackId(null);
        }
        showToastMsg("Feedback arquivado permanentemente.");
      } else {
        throw error;
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
      showToastMsg("Erro ao tentar arquivar o feedback.", "error");
    } finally {
      setFeedbackToDelete(null);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedFeedbackId(expandedFeedbackId === id ? null : id);
    if (editingNoteId !== id) {
      setEditingNoteId(null);
    }
  };

  // Metrics calculating
  const pendingCount = feedbacks.filter((f) => f.status === "pending").length;
  const resolvedCount = feedbacks.filter((f) => f.status === "resolved").length;
  const totalCount = feedbacks.length;
  
  const totalReceivedComplaints = feedbacks.filter((f) => f.type === "complaint").length;
  const totalReceivedSuggestions = feedbacks.filter((f) => f.type === "suggestion").length;

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Real-time querying & sorting
  const filteredFeedbacks = feedbacks.filter((f) => {
    // 1. Status Filter
    if (filter !== "all" && f.status !== filter) return false;
    
    // 2. Type/Category Filter
    if (typeFilter !== "all" && f.type !== typeFilter) return false;

    // 3. Author Identity Type Filter
    if (authorFilter === "anonymous" && !f.is_anonymous) return false;
    if (authorFilter === "named" && f.is_anonymous) return false;

    // 4. Search text (Message or Driver full name)
    const driverName = f.profiles?.full_name || "";
    const driverEmail = f.profiles?.email || "";
    const nameMatch = driverName.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = driverEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const msgMatch = (f.message || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchSearch = searchTerm === "" || nameMatch || emailMatch || msgMatch;

    return matchSearch;
  }).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortBy === "newest" ? timeB - timeA : timeA - timeB;
  });

  const clearFilters = () => {
    setFilter("all");
    setTypeFilter("all");
    setAuthorFilter("all");
    setSearchTerm("");
    setSortBy("newest");
    showToastMsg("Todos os filtros foram limpos.", "info");
  };

  return (
    <div className="space-y-6 font-sans text-gray-800 antialiased">
      {/* Toast Alert System overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4.5 py-3 rounded-xl shadow-xl border bg-white text-xs font-semibold tracking-tight"
            style={{
              borderColor: toast.type === "success" ? "#bbf7d0" : toast.type === "error" ? "#fecaca" : "#bfdbfe"
            }}
          >
            <div className={`p-1.5 rounded-lg ${
              toast.type === "success" ? "bg-emerald-50 text-emerald-600" :
              toast.type === "error" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
            }`}>
              {toast.type === "success" ? <Check size={14} className="stroke-[2.5]" /> : <Info size={14} className="stroke-[2.5]" />}
            </div>
            <span className="text-gray-700">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-650 ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl">
              <MessageSquare size={22} className="stroke-[2.2]" />
            </div>
            <span>Canal de Ouvidoria & Feedbacks</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider">
            Mensagens, requisições de melhorias e críticas enviadas por motoristas
          </p>
        </div>

        {/* Global Action Tools */}
        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="h-10 px-4.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-gray-200/80 active:scale-95 flex items-center justify-center gap-2"
        >
          <Inbox size={14} className={loading ? "animate-pulse" : ""} />
          <span>Sincronizar Mensagens</span>
        </button>
      </div>

      {/* Dashboard Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Metric */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Entrada Total</span>
            <span className="p-1 px-2 bg-gray-100 text-gray-600 text-[8px] font-black rounded uppercase">Logs SGI</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-800 font-mono">{totalCount}</span>
            <span className="text-[10px] text-gray-400 font-bold">visitas</span>
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase">Volume acumulado de contatos</p>
        </div>

        {/* Pending Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all focus:border-indigo-400">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Aguardando Resposta</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">{pendingCount}</span>
            <span className="text-[10px] text-rose-400 font-extrabold uppercase">Pendente</span>
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase">Chamados abertos prioritários</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Taxa de Eficácia</span>
            <div className="p-1 rounded bg-emerald-50 text-emerald-600">
              <Gauge size={12} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{resolutionRate}%</span>
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Resolvido</span>
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase">{resolvedCount} de {totalCount} arquivados</p>
        </div>

        {/* Suggestions/Critical distribution */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Composição de Mensagens</span>
            <Sparkles size={13} className="text-indigo-400" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-rose-600 font-mono">{totalReceivedComplaints}</p>
              <p className="text-[8px] font-black uppercase text-gray-400">Reclamações</p>
            </div>
            <div className="h-6 w-px bg-gray-150 mx-2" />
            <div className="text-right">
              <p className="text-xs font-black text-emerald-600 font-mono">{totalReceivedSuggestions}</p>
              <p className="text-[8px] font-black uppercase text-gray-400">Sugestões</p>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 font-bold mt-1.5 uppercase">Equilíbrio qualitativo da frota</p>
        </div>
      </div>

      {/* Search and Advanced Filters Layout */}
      <div className="bg-gray-50/50 rounded-2xl border border-gray-200 p-4 space-y-4">
        
        {/* First Row: Status Filter and Search Input */}
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Status Select Tab Pill System */}
          <div className="flex bg-gray-100 p-1 rounded-xl self-start shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={`px-4.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                filter === "all" 
                  ? "bg-white shadow text-indigo-700 font-black" 
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Exibir Todas ({totalCount})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                filter === "pending" 
                  ? "bg-white shadow text-indigo-700 font-black"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-4.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                filter === "resolved" 
                  ? "bg-white shadow text-indigo-700 font-black"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Resolvidos ({resolvedCount})
            </button>
          </div>

          {/* Core Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por conteúdo da mensagem ou nome do motorista..."
              className="w-full h-11 pl-10 pr-10 bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl text-xs font-semibold shadow-xs outline-none transition-all placeholder-gray-400"
            />
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Secondary constraints and resets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-150/50">
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-gray-400 shrink-0" />
              <span className="text-[10px] font-black text-gray-405 uppercase tracking-wider">Refinar Categoria:</span>
            </div>

            {/* Type Filter selector */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="h-8.5 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[10px] font-black tracking-wider text-gray-600 outline-none focus:border-indigo-400 cursor-pointer appearance-none shadow-xs font-sans uppercase"
              >
                <option value="all">Todas Categorias</option>
                <option value="complaint">Como Reclamação</option>
                <option value="suggestion">Como Sugestão</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[3.5px] border-t-gray-500" />
            </div>

            {/* Author filter selector */}
            <div className="relative">
              <select
                value={authorFilter}
                onChange={(e: any) => setAuthorFilter(e.target.value)}
                className="h-8.5 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[10px] font-black tracking-wider text-gray-600 outline-none focus:border-indigo-400 cursor-pointer appearance-none shadow-xs font-sans uppercase"
              >
                <option value="all">Qualquer Identidade</option>
                <option value="named">Motoristas Identificados</option>
                <option value="anonymous">Apenas Anônimos</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[3.5px] border-t-gray-500" />
            </div>

            {/* Ordering filter selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="h-8.5 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[10px] font-black tracking-wider text-gray-600 outline-none focus:border-indigo-400 cursor-pointer appearance-none shadow-xs font-sans uppercase"
              >
                <option value="newest">Mais recentes primeiro</option>
                <option value="oldest">Mais antigos primeiro</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[3.5px] border-t-gray-500" />
            </div>
          </div>

          {/* Reset Filters action */}
          {(searchTerm || typeFilter !== "all" || filter !== "pending" || authorFilter !== "all" || sortBy !== "newest") && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 self-end py-1 px-2 hover:bg-indigo-50 rounded"
            >
              <X size={12} />
              <span>Redefinir Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Main List Rendering */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center border border-gray-150 rounded-2xl shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-650 animate-spin" />
              <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                Recuperando e descriptografando envios...
              </p>
            </div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          /* Empty state board */
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-3.5 shadow-xs">
            <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-gray-450">
              <Inbox size={32} className="text-gray-300 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-700">Caixa de entrada limpa</h4>
              <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
                Não há mensagens para o filtro selecionado neste momento ou todas as reclamações pendentes já foram devidamente actioned.
              </p>
            </div>
            <button
              onClick={clearFilters}
              className="h-9 px-4.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Redefinir Busca
            </button>
          </div>
        ) : (
          /* Feedbacks rendering stream */
          <div className="grid gap-4.5">
            {filteredFeedbacks.map((f) => {
              const isExpanded = expandedFeedbackId === f.id;
              const hasNote = !!notes[f.id];
              const note = notes[f.id];
              
              return (
                <div
                  key={f.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    f.status === "resolved" 
                      ? "border-gray-200 bg-gray-50/40 opacity-75 shadow-xs hover:opacity-100" 
                      : "border-gray-200/90 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Card Visible Header container */}
                  <div className="p-4.5 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
                    
                    {/* Left block Info content */}
                    <div className="flex items-start gap-3.5">
                      {/* Interactive Categorization Icon sphere */}
                      <div
                        className={`w-10.5 h-10.5 rounded-xl flex items-center justify-center shrink-0 border ${
                          f.type === "complaint" 
                            ? "bg-rose-50/50 text-rose-500 border-rose-100" 
                            : "bg-emerald-50/50 text-emerald-500 border-emerald-100"
                        }`}
                      >
                        {f.type === "complaint" ? (
                          <AlertTriangle size={18} className="stroke-[2]" />
                        ) : (
                          <AlertCircle size={18} className="stroke-[2]" />
                        )}
                      </div>

                      {/* Header tags and text */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            f.type === "complaint" ? "text-rose-650" : "text-emerald-650"
                          }`}>
                            {f.type === "complaint" ? "Denúncia / Reclamação" : "Opinião / Sugestão"}
                          </span>

                          {/* Identity disclosure indicator */}
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            f.is_anonymous 
                              ? "bg-gray-100 text-gray-500 border-gray-150" 
                              : "bg-indigo-50/50 text-indigo-700 border-indigo-150/40"
                          }`}>
                            {f.is_anonymous ? "Anônimo" : "Identificado"}
                          </span>

                          {/* Resolution state badge */}
                          {f.status === "resolved" && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 uppercase tracking-widest">
                              <CheckCircle2 size={10} className="stroke-[2.5]" />
                              <span>Resolvido</span>
                            </span>
                          )}

                          {/* Internal annotation tag */}
                          {hasNote && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50 uppercase tracking-widest">
                              <span>Possui Nota</span>
                            </span>
                          )}
                        </div>

                        {/* Message description body excerpt */}
                        <p className={`text-xs font-semibold text-gray-700 leading-relaxed ${isExpanded ? "" : "line-clamp-2 cursor-pointer hover:text-gray-900"}`} onClick={() => handleToggleExpand(f.id)}>
                          {f.message}
                        </p>

                        {/* Metadata row layout */}
                        <div className="flex flex-wrap items-center gap-3.5 pt-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <CalendarRange size={11} className="text-gray-300" />
                            <span>{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                          </span>

                          <span className="text-gray-300">•</span>

                          <span className="flex items-center gap-1">
                            <User size={11} className="text-gray-300" />
                            <span>
                              {f.is_anonymous
                                ? "Ocultado (Ouvidoria anônima)"
                                : f.profiles?.full_name || f.profiles?.email || "Motorista cadastrado"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right block interaction suite */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-3.5 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 shrink-0">
                      
                      {/* Expand detail button */}
                      <button
                        onClick={() => handleToggleExpand(f.id)}
                        className="text-[9px] font-black uppercase tracking-widest text-gray-450 hover:text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-150/40 transition-all flex items-center gap-1"
                      >
                        {isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}
                      </button>

                      {/* Main Resolve/Reopen toggle button */}
                      <div className="flex items-center gap-2">
                        {/* Real deletion/archive block */}
                        <button
                          onClick={() => setFeedbackToDelete(f)}
                          className="h-8.5 w-8.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg flex items-center justify-center transition-colors border border-gray-150/60"
                          title="Arquivar permanentemente"
                        >
                          <Trash2 size={13} />
                        </button>

                        <button
                          onClick={() => handleResolveFeedback(f.id, f.status)}
                          className={`h-8.5 px-3.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            f.status === "resolved"
                              ? "bg-gray-105 text-gray-600 hover:bg-gray-150 border border-gray-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250/50"
                          }`}
                        >
                          {f.status === "resolved" ? (
                            <>
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Reabrir Chamado</span>
                            </>
                          ) : (
                            <>
                              <Check size={11} className="stroke-[3.5] text-emerald-600" />
                              <span>Concluir</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Collapsible detail box (Framer motion responsive transition) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="bg-gray-50 border-t border-gray-150/70"
                      >
                        <div className="p-5 space-y-4">
                          
                          {/* Profile detail details if not anonymous */}
                          {!f.is_anonymous && (
                            <div className="bg-white p-3 rounded-xl border border-gray-150 text-left text-xs space-y-1">
                              <p className="text-[8px] uppercase tracking-wider font-extrabold text-gray-400">Informações de Contato</p>
                              <div className="flex items-center gap-2 font-semibold">
                                <span className="text-gray-800">{f.profiles?.full_name || "Motorista de Linha"}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500 font-mono text-[11px]">{f.profiles?.email || "Sem e-mail"}</span>
                              </div>
                            </div>
                          )}

                          {/* Interactive Internal Resolution Thread */}
                          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-3xs text-left space-y-3.5">
                            
                            {/* Thread header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PenTool size={13} className="text-indigo-600" />
                                <h4 className="text-[10px] font-black uppercase text-gray-700 tracking-wider">Anotações Internas & Resolução</h4>
                              </div>
                              <span className="text-[8px] uppercase font-black text-gray-400">Exclusivo para Administração</span>
                            </div>

                            {/* Existing Note Block */}
                            {hasNote ? (
                              <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-150/40 space-y-2 relative">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <CornerDownRight size={13} className="text-indigo-500 shrink-0" />
                                    <span className="text-[9px] font-black text-indigo-750 uppercase">Histórico de Atendimento</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(f.id);
                                        setPendingNoteText(note.text);
                                      }}
                                      className="text-[8px] font-extrabold uppercase text-indigo-600 hover:underline"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => removeNote(f.id)}
                                      className="text-[8px] font-extrabold uppercase text-rose-600 hover:underline"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                                  {note.text}
                                </p>
                                <div className="text-[8px] text-gray-400 font-bold uppercase text-right">
                                  Anotado por {note.author} às {new Date(note.updatedAt).toLocaleString("pt-BR")}
                                </div>
                              </div>
                            ) : null}

                            {/* Editing / Writing Mode */}
                            {editingNoteId === f.id || !hasNote ? (
                              <div className="space-y-3 pt-1">
                                <textarea
                                  value={pendingNoteText}
                                  onChange={(e) => setPendingNoteText(e.target.value)}
                                  placeholder="Escreva uma anotação privada sobre a resolução desta demanda (ex: Contatado motorista por celular; encaminhado à manutenção do pátio)."
                                  className="w-full h-20 px-3 py-2 bg-gray-50 border border-gray-250/70 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-semibold leading-relaxed text-gray-800 outline-none transition-all resize-none"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  {editingNoteId === f.id && (
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(null);
                                        setPendingNoteText("");
                                      }}
                                      className="h-8 px-3.5 text-[9px] font-black uppercase text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => saveNote(f.id, pendingNoteText)}
                                    disabled={!pendingNoteText.trim()}
                                    className="h-8 px-4 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white text-[9px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 shadow-2xs shadow-indigo-600/10"
                                  >
                                    <Check size={11} className="stroke-[3]" />
                                    <span>Salvar Observação</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNoteId(f.id);
                                  setPendingNoteText("");
                                }}
                                className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                              >
                                <PenTool size={11} />
                                <span>Adicionar Nota Administrativa</span>
                              </button>
                            )}

                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modern Drawer / Modal for archiving logs */}
      <AnimatePresence>
        {feedbackToDelete && (
          <div className="fixed inset-0 bg-gray-905/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="p-6 text-center">
                
                <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <Trash2 size={22} className="stroke-[1.8]" />
                </div>
                
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Confirmar Arquivamento</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-2 mx-2">
                  Deseja realmente remover permanentemente este feedback do sistema? Esta ação é irreversível e excluirá o registro da base de dados.
                </p>

                {/* Sender card detail nested inside popup */}
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-150 mt-4 text-xs font-semibold text-gray-650 italic leading-relaxed text-left">
                  "{feedbackToDelete.message.substring(0, 100)}{feedbackToDelete.message.length > 100 ? "..." : ""}"
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setFeedbackToDelete(null)}
                    className="flex-1 px-4 py-3 bg-gray-105 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors duration-150"
                  >
                    Não, manter
                  </button>
                  <button
                    onClick={handleDeleteFeedback}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-sm shadow-rose-200"
                  >
                    Sim, arquivar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
