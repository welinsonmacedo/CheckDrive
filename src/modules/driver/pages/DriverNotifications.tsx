import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  AlertTriangle,
  X,
  CheckCircle,
  Trophy,
  Clock,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function DriverNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [viewedLogIds, setViewedLogIds] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!user?.id) return;
      const stored = localStorage.getItem(`viewed_point_log_ids_${user.id}`);
      if (stored) {
        setViewedLogIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const unviewedPointLogsCount = pointLogs.filter((log) => !viewedLogIds.includes(log.id)).length;

  useEffect(() => {
    if (pointLogs.length > 0 && user?.id) {
      const allIds = pointLogs.map((log) => log.id);
      const hasNewViewedLog = allIds.some((id) => !viewedLogIds.includes(id));
      
      if (hasNewViewedLog) {
        const uniqueIds = Array.from(new Set([...viewedLogIds, ...allIds]));
        setViewedLogIds(uniqueIds);
        localStorage.setItem(`viewed_point_log_ids_${user.id}`, JSON.stringify(uniqueIds));
        
        // Dispatch custom event to notify DriverLayout to update counters instantly
        window.dispatchEvent(new Event("notifications_read"));
      }
    }
  }, [pointLogs, viewedLogIds, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchNotificationsData();
    }
  }, [user?.id]);

  const fetchNotificationsData = async () => {
    try {
      setLoading(true);

      // Fetch audit logs (points / penalties / contests)
      const { data: auditData, error: auditError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("driver_id", user?.id)
        .order("created_at", { ascending: false });

      if (auditError) {
        console.error("Error fetching driver audit logs:", auditError);
      } else {
        setPointLogs(auditData || []);
      }
    } catch (e) {
      console.error("Error loading notification view data", e);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      return `Há ${diffDays} dia(s)`;
    } catch {
      return "";
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
          <Bell size={24} className="animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-3xl font-black text-text-main tracking-tight">Notificações</h2>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-widest">
            Acompanhamento de Pontos e Contestações
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-bold uppercase tracking-widest">
            Carregando notificações...
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
            <motion.div
              key="points"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Notificações de Pontos e Contestações
                </span>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Auditoria
                </span>
              </div>

              {pointLogs.length === 0 ? (
                <div className="bento-card items-center justify-center text-center p-8 border-dashed py-16 bg-white">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 mx-auto border border-emerald-100">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-text-main">
                    Nenhum registro encontrado!
                  </h3>
                  <p className="text-text-muted text-xs mt-1 leading-normal max-w-sm font-medium">
                    Até o momento, não foram registradas penalidades, descontos ou contestações de pontos na sua conta.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pointLogs.map((log) => {
                    const isNew = !viewedLogIds.includes(log.id);
                    const isContested = log.reason && (log.reason.includes("[CONTESTADO]") || log.reason.includes("[CONTESTADO PARCIALMENTE]"));
                    const isReversal = log.type === "reversal";
                    const isDeduction = log.type === "penalty" || log.type === "manual";
                    
                    let badgeLabel = "Registro";
                    let badgeColor = "bg-zinc-100 text-zinc-800 border-zinc-200";
                    let prefixIcon = <Clock size={14} className="text-zinc-500" />;
                    
                    if (isReversal) {
                      badgeLabel = "Pontos Revertidos";
                      badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      prefixIcon = <CheckCircle size={14} className="text-emerald-500" />;
                    } else if (isContested) {
                      badgeLabel = "Contestado";
                      badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                      prefixIcon = <AlertTriangle size={14} className="text-amber-500" />;
                    } else if (isDeduction) {
                      badgeLabel = "Pontos Descontados";
                      badgeColor = "bg-red-50 text-red-800 border-red-200";
                      prefixIcon = <AlertTriangle size={14} className="text-red-500" />;
                    }

                    return (
                      <div
                        key={log.id}
                        className={`bento-card border flex flex-col gap-3 p-4 hover:border-indigo-200 transition-colors relative bg-white ${
                          isNew
                            ? "border-amber-300 bg-amber-50/[0.04]"
                            : "border-app-border"
                        }`}
                      >
                        {isNew && (
                          <div className="absolute top-3 right-3 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${badgeColor}`}>
                                {badgeLabel}
                              </span>
                              {isNew && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-black tracking-widest uppercase animate-pulse">
                                  Novo
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-text-main mt-1.5">
                              {log.reason || "Auditoria de rotina"}
                            </h4>
                          </div>

                          <span className={`text-sm font-black tabular-nums shrink-0 whitespace-nowrap ${
                            log.amount > 0 ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {log.amount > 0 ? `+${log.amount}` : log.amount} pts
                          </span>
                        </div>

                        <div className="pt-2.5 border-t border-app-border flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            {prefixIcon}
                            {getRelativeTime(log.created_at)}
                          </span>
                          <span className="text-zinc-400 font-bold">
                            {new Date(log.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
        </AnimatePresence>
      )}

      {/* Fullscreen Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={selectedPhoto}
              alt="Preview ampliado"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
