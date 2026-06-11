import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  AlertTriangle,
  ClipboardCopy,
  Calendar,
  Gauge,
  FileText,
  X,
  ChevronRight,
  Eye,
  Camera,
  Layers,
  Wrench,
  Clock,
  CheckCircle,
  Trophy,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function DriverNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"issues" | "alerts" | "points">("issues");
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [viewedLogIds, setViewedLogIds] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Stats for vehicles driver is associated with
  const [driverVehicleIds, setDriverVehicleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("viewed_point_log_ids");
      if (stored) {
        setViewedLogIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const unviewedPointLogsCount = pointLogs.filter((log) => !viewedLogIds.includes(log.id)).length;

  useEffect(() => {
    if (activeTab === "points" && pointLogs.length > 0) {
      const allIds = pointLogs.map((log) => log.id);
      const uniqueIds = Array.from(new Set([...viewedLogIds, ...allIds]));
      setViewedLogIds(uniqueIds);
      localStorage.setItem("viewed_point_log_ids", JSON.stringify(uniqueIds));
      
      // Dispatch custom event to notify DriverLayout to update counters instantly
      window.dispatchEvent(new Event("notifications_read"));
    }
  }, [activeTab, pointLogs, viewedLogIds]);

  useEffect(() => {
    if (user?.id) {
      fetchNotificationsData();
    }
  }, [user?.id]);

  const fetchNotificationsData = async () => {
    try {
      setLoading(true);

      // 1. Identify vehicles the driver is scheduled for or recently submitted checklists for
      const myVehiclesSet = new Set<string>();

      const { data: schedules } = await supabase
        .from("schedules")
        .select("vehicle_id")
        .eq("driver_id", user?.id);

      if (schedules) {
        schedules.forEach((s) => {
          if (s.vehicle_id) myVehiclesSet.add(s.vehicle_id);
        });
      }

      const { data: submissions } = await supabase
        .from("checklist_submissions")
        .select("vehicle_id")
        .eq("driver_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(15);

      if (submissions) {
        submissions.forEach((s) => {
          if (s.vehicle_id) myVehiclesSet.add(s.vehicle_id);
        });
      }

      setDriverVehicleIds(myVehiclesSet);

      // 2. Fetch checklist issues (status: pending)
      const { data: issuesData, error: issuesError } = await supabase
        .from("checklist_issues")
        .select(`
          *,
          vehicle:vehicles(id, plate),
          trailer:trailers(id, plate)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (issuesError) {
        console.error("Error fetching checklist issues:", issuesError);
      }

      // Group and Deduplicate Checklist Issues
      // When the same issue (same vehicle + item_title) is reported multiple times, we only display the newest one,
      // but we add a badge indicating "Reported X times" (Relatado X vezes).
      const groupedIssuesMap = new Map<string, any[]>();
      (issuesData || []).forEach((issue) => {
        const vehicleKey = issue.vehicle_id || issue.trailer_id || "no-vehicle";
        const titleKey = (issue.item_title || "").trim().toLowerCase();
        const groupKey = `${vehicleKey}_${titleKey}`;

        if (!groupedIssuesMap.has(groupKey)) {
          groupedIssuesMap.set(groupKey, []);
        }
        groupedIssuesMap.get(groupKey)!.push(issue);
      });

      const processedIssuesList = Array.from(groupedIssuesMap.values()).map(
        (group) => {
          // The newest is the first in the group since the initial list is ordered by created_at DESC
          const primaryIssue = group[0];
          return {
            ...primaryIssue,
            occurencesCount: group.length,
            // Track all dates reported
            reportedDates: group.map((i) => i.created_at),
          };
        }
      );

      // Mark issues belonging to "My Vehicles"
      const prioritizedIssues = processedIssuesList.map((issue) => {
        const isMine =
          (issue.vehicle_id && myVehiclesSet.has(issue.vehicle_id)) || false;
        return { ...issue, isMine };
      });

      setIssues(prioritizedIssues);

      // 3. Fetch auto alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("auto_alerts")
        .select(`
          *,
          vehicle:vehicles(id, plate),
          trailer:trailers(id, plate)
        `)
        .eq("active", true);

      if (alertsError) {
        console.error("Error fetching auto alerts:", alertsError);
      }

      // Fetch latest odometer submissions to check triggers
      const { data: recentSubmissions } = await supabase
        .from("checklist_submissions")
        .select("vehicle_id, odometer")
        .order("created_at", { ascending: false });

      const latestOdometerByVehicle: Record<string, number> = {};
      (recentSubmissions || []).forEach((sub) => {
        if (sub.vehicle_id && !latestOdometerByVehicle[sub.vehicle_id]) {
          latestOdometerByVehicle[sub.vehicle_id] = sub.odometer || 0;
        }
      });

      // Map through auto_alerts to determine if they are currently triggered
      const triggeredAlerts = (alertsData || [])
        .map((alert) => {
          let isTriggered = false;
          let currentMetric = "";
          let limitMetric = "";
          let progressPercent = 0;

          if (alert.trigger_type === "date" && alert.trigger_date) {
            const warningDays = alert.warning_days ? Number(alert.warning_days) : 0;
            const targetDate = new Date(alert.trigger_date + "T00:00:00");
            const thresholdDate = new Date(targetDate);
            thresholdDate.setDate(targetDate.getDate() - warningDays);
            isTriggered = new Date() >= thresholdDate;

            currentMetric = new Date().toLocaleDateString("pt-BR");
            limitMetric = new Date(alert.trigger_date).toLocaleDateString("pt-BR");
          } else if (
            alert.trigger_type === "km" &&
            alert.interval_km &&
            alert.last_km &&
            alert.warning_km
          ) {
            const vehicleOdometer = latestOdometerByVehicle[alert.target_vehicle_id] || 0;
            const warningThreshold =
              Number(alert.last_km) + Number(alert.interval_km) - Number(alert.warning_km);
            isTriggered = vehicleOdometer >= warningThreshold;

            currentMetric = `${vehicleOdometer.toLocaleString("pt-BR")} KM`;
            const limit = Number(alert.last_km) + Number(alert.interval_km);
            limitMetric = `${limit.toLocaleString("pt-BR")} KM`;

            const totalInterval = Number(alert.interval_km);
            const relativeKm = vehicleOdometer - Number(alert.last_km);
            progressPercent = Math.min(
              100,
              Math.max(0, Math.round((relativeKm / totalInterval) * 100))
            );
          }

          const isMine =
            (alert.target_vehicle_id && myVehiclesSet.has(alert.target_vehicle_id)) || false;

          return {
            ...alert,
            isTriggered,
            currentMetric,
            limitMetric,
            progressPercent,
            isMine,
          };
        })
        .filter((alert) => alert.isTriggered);

      setAlerts(triggeredAlerts);

      // 4. Fetch audit logs (points / penalties / contests)
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

  // Helper to resolve supabase path to visible image URL
  const getPhotoUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("checklist-photos").getPublicUrl(path);
    return data?.publicUrl || "";
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
            Acompanhamento em tempo real
          </p>
        </div>
      </div>

      {/* Stats/Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab("issues")}
          className={`bento-card flex flex-col items-center justify-center p-3 transition-all hover:border-indigo-400 active:scale-98 ${
            activeTab === "issues"
              ? "border-indigo-500 bg-indigo-50/[0.15] ring-2 ring-indigo-500/10"
              : "border-app-border"
          }`}
        >
          <div className="relative mb-2">
            <AlertTriangle
              className={issues.length > 0 ? "text-amber-500" : "text-text-muted"}
              size={22}
            />
            {issues.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full text-[9px] w-4.5 h-4.5 font-black flex items-center justify-center shadow-sm">
                {issues.length}
              </span>
            )}
          </div>
          <span className="text-xl font-black text-text-main tabular-nums">
            {issues.length}
          </span>
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center truncate w-full">
            Pendências
          </span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`bento-card flex flex-col items-center justify-center p-3 transition-all hover:border-indigo-400 active:scale-98 ${
            activeTab === "alerts"
              ? "border-indigo-500 bg-indigo-50/[0.15] ring-2 ring-indigo-500/10"
              : "border-app-border"
          }`}
        >
          <div className="relative mb-2">
            <Wrench
              className={alerts.length > 0 ? "text-[#e12a2a]" : "text-text-muted"}
              size={22}
            />
            {alerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#e12a2a] text-white rounded-full text-[9px] w-4.5 h-4.5 font-black flex items-center justify-center shadow-sm">
                {alerts.length}
              </span>
            )}
          </div>
          <span className="text-xl font-black text-text-main tabular-nums">
            {alerts.length}
          </span>
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center truncate w-full">
            Manutenções
          </span>
        </button>

        <button
          onClick={() => setActiveTab("points")}
          className={`bento-card flex flex-col items-center justify-center p-3 transition-all hover:border-indigo-400 active:scale-98 ${
            activeTab === "points"
              ? "border-indigo-500 bg-indigo-50/[0.15] ring-2 ring-indigo-500/10"
              : "border-app-border"
          }`}
        >
          <div className="relative mb-2">
            <Trophy
              className={unviewedPointLogsCount > 0 ? "text-amber-500 animate-bounce" : "text-text-muted"}
              size={22}
            />
            {unviewedPointLogsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[9px] w-4.5 h-4.5 font-black flex items-center justify-center shadow-sm">
                {unviewedPointLogsCount}
              </span>
            )}
          </div>
          <span className="text-xl font-black text-text-main tabular-nums">
            {pointLogs.length}
          </span>
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center truncate w-full">
            Histórico Pontos
          </span>
        </button>
      </div>

      {/* Tabs list with Framer Motion underliner */}
      <div className="flex border-b border-app-border">
        {(["issues", "alerts", "points"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab ? "text-indigo-600" : "text-text-muted"
            }`}
          >
            {tab === "issues" && "Pendências"}
            {tab === "alerts" && "Manutenções"}
            {tab === "points" && (
              <span className="inline-flex items-center gap-1">
                Pontos
                {unviewedPointLogsCount > 0 && (
                  <span className="bg-red-500 text-white rounded-full text-[9px] px-1 font-black leading-none py-0.5 animate-pulse">
                    {unviewedPointLogsCount}
                  </span>
                )}
              </span>
            )}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-full"
              />
            )}
          </button>
        ))}
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
          {activeTab === "issues" && (
            <motion.div
              key="issues"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Defeitos em Aberto Sem Repetições
                </span>
                <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Deduplicado
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="bento-card items-center justify-center text-center p-8 border-dashed py-16">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 mx-auto border border-emerald-100">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-text-main">
                    Excelente trabalho!
                  </h3>
                  <p className="text-text-muted text-xs mt-1 leading-normal max-w-sm font-medium">
                    Nenhum defeito pendente foi relatado nos checklists. Sua frota está operacional e segura.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`bento-card border flex flex-col gap-4 p-4 hover:border-indigo-200 transition-colors ${
                        issue.isMine
                          ? "border-indigo-200/50 bg-indigo-50/[0.04]"
                          : "border-app-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {issue.isMine && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[8px] font-black tracking-widest uppercase">
                                Meu Veículo
                              </span>
                            )}
                            <span className="font-mono text-xs font-bold text-text-main px-2 py-0.5 bg-zinc-100 rounded border border-zinc-200">
                              {issue.vehicle?.plate || issue.trailer?.plate || "S/ Placa"}
                            </span>
                            {issue.occurencesCount > 1 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wider uppercase">
                                <Layers size={10} />
                                {issue.occurencesCount}x Relatado
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-text-main mt-1">
                            {issue.item_title}
                          </h4>
                          {issue.description && (
                            <p className="text-text-muted text-xs font-medium leading-relaxed mt-1">
                              {issue.description}
                            </p>
                          )}
                        </div>

                        {issue.photo_url && (
                          <button
                            onClick={() => setSelectedPhoto(getPhotoUrl(issue.photo_url))}
                            className="w-14 h-14 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-app-border relative group shadow-sm flex items-center justify-center hover:border-indigo-400 transition-all active:scale-95"
                          >
                            <img
                              src={getPhotoUrl(issue.photo_url)}
                              alt="Defeito"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={16} className="text-white" />
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-app-border flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {getRelativeTime(issue.created_at)}
                        </span>
                        {issue.occurencesCount > 1 && (
                          <span className="italic normal-case text-[9px] text-[#2ebd73] font-black">
                            Ultima ocorrência: {new Date(issue.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "alerts" && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Alertas de Operação & Manutenção
                </span>
                <span className="text-[10px] font-bold text-[#e12a2a] bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ativados
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="bento-card items-center justify-center text-center p-8 border-dashed py-16">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 mx-auto border border-emerald-100">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-text-main">
                    Nenhum alerta crítico!
                  </h3>
                  <p className="text-text-muted text-xs mt-1 leading-normal max-w-sm font-medium">
                    Não existem limites de quilometragem vencidos ou prazos expirados de manutenção cadastrados para seus veículos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const isKmType = alert.trigger_type === "km";

                    return (
                      <div
                        key={alert.id}
                        className={`bento-card border flex flex-col gap-4 p-4 hover:border-red-200 transition-colors ${
                          alert.isMine
                            ? "border-red-200/50 bg-red-50/[0.04]"
                            : "border-app-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {alert.isMine && (
                                <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[8px] font-black tracking-widest uppercase">
                                  Meu Veículo
                                </span>
                              )}
                              <span className="font-mono text-xs font-bold text-text-main px-2 py-0.5 bg-zinc-100 rounded border border-zinc-200">
                                {alert.vehicle?.plate || alert.trailer?.plate || "S/ Placa"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[#e12a2a] text-[8px] font-black tracking-widest uppercase">
                                Manutenção
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-text-main mt-1">
                              {alert.title}
                            </h4>
                            {alert.description && (
                              <p className="text-text-muted text-xs font-medium leading-relaxed mt-1">
                                {alert.description}
                              </p>
                            )}
                          </div>

                          <div className="p-3 bg-red-50 rounded-2xl text-[#e12a2a] shrink-0">
                            {isKmType ? <Gauge size={22} /> : <Calendar size={22} />}
                          </div>
                        </div>

                        {/* Metric stats card */}
                        <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-3 rounded-xl border border-app-border">
                          <div>
                            <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest">
                              Métrica Atual
                            </span>
                            <span className="block text-xs font-bold text-text-main mt-0.5">
                              {alert.currentMetric || "Expira logo"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                              Limite {isKmType ? "Alerta" : "Vencimento"}
                            </span>
                            <span className="block text-xs font-bold text-[#e12a2a] mt-0.5">
                              {alert.limitMetric}
                            </span>
                          </div>
                        </div>

                        {/* Kilometers Progress Indicator */}
                        {isKmType && alert.progressPercent > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-text-muted uppercase tracking-wider">
                              <span>Progresso no Intervalo</span>
                              <span className="text-red-600 font-extrabold">
                                {alert.progressPercent}%
                              </span>
                            </div>
                            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${alert.progressPercent}%` }}
                                className="h-full bg-red-500 rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "points" && (
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
          )}
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
