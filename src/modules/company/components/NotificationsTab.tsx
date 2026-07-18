import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  AlertTriangle,
  Calendar,
  Gauge,
  X,
  Eye,
  Layers,
  Wrench,
  Clock,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import { usePersistentState } from "@/src/hooks/usePersistentState";

export default function NotificationsTab() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = usePersistentState<"issues" | "alerts">("notifications_activeTab", "issues");
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [alertIssues, setAlertIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user?.company_id) {
      fetchNotificationsData();
    }
  }, [user?.company_id]);

  const fetchNotificationsData = async () => {
    try {
      setLoading(true);

      // 1. Fetch ALL pending checklist issues
      const { data: allIssuesData, error: issuesError } = await supabase.from("checklist_issues").select(`
          *,
          vehicle:vehicles(id, plate),
          trailer:trailers(id, plate)
        `).eq("company_id", user?.company_id)
        .eq("company_id", user?.company_id)
        .or("status.eq.pending,and(status.eq.resolved,resolved_by.is.null)")
        .order("created_at", { ascending: false });

      if (issuesError) {
        console.error("Error fetching checklist issues:", issuesError);
      }

      const pendingAllIssuesData = allIssuesData || [];

      const issuesData = pendingAllIssuesData.filter((i: any) => !i.auto_alert_id);
      const alertIssuesData = pendingAllIssuesData.filter((i: any) => i.auto_alert_id);

      // Group and Deduplicate Checklist Issues
      const groupedIssuesMap = new Map<string, any[]>();
      issuesData.forEach((issue) => {
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
          const primaryIssue = group[0];
          return {
            ...primaryIssue,
            occurrencesCount: group.length,
            reportedDates: group.map((i) => i.created_at),
          };
        }
      );
      setIssues(processedIssuesList);

      // Group and Deduplicate Alert Issues
      const groupedAlertIssuesMap = new Map<string, any[]>();
      alertIssuesData.forEach((issue) => {
        const vehicleKey = issue.vehicle_id || issue.trailer_id || "no-vehicle";
        const titleKey = (issue.item_title || "").trim().toLowerCase();
        const groupKey = `${vehicleKey}_${titleKey}`;

        if (!groupedAlertIssuesMap.has(groupKey)) {
          groupedAlertIssuesMap.set(groupKey, []);
        }
        groupedAlertIssuesMap.get(groupKey)!.push(issue);
      });

      const processedAlertIssuesList = Array.from(groupedAlertIssuesMap.values()).map(
        (group) => {
          const primaryIssue = group[0];
          return {
            ...primaryIssue,
            occurrencesCount: group.length,
            reportedDates: group.map((i) => i.created_at),
          };
        }
      );
      setAlertIssues(processedAlertIssuesList);


      // 2. Fetch auto alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("auto_alerts")
        .select(`
          *,
          vehicle:vehicles(id, plate),
          trailer:trailers(id, plate)
        `)
        .eq("company_id", user?.company_id)
        .eq("active", true);

      if (alertsError) {
        console.error("Error fetching auto alerts:", alertsError);
      }

      // Fetch latest odometer submissions to check triggers
      const { data: recentSubmissions } = await supabase.from("checklist_submissions").select("vehicle_id, odometer").eq("company_id", user?.company_id)
        .eq("company_id", user?.company_id)
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

          return {
            ...alert,
            isTriggered,
            currentMetric,
            limitMetric,
            progressPercent,
          };
        })
        .filter((alert) => alert.isTriggered);

      setAlerts(triggeredAlerts);
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

  const filteredIssues = issues.filter((issue) => {
    const plate = (issue.vehicle?.plate || issue.trailer?.plate || "").toLowerCase();
    const title = (issue.item_title || "").toLowerCase();
    const desc = (issue.description || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return plate.includes(s) || title.includes(s) || desc.includes(s);
  });

  const filteredAlertIssues = alertIssues.filter((issue) => {
    const plate = (issue.vehicle?.plate || issue.trailer?.plate || "").toLowerCase();
    const title = (issue.item_title || "").toLowerCase();
    const desc = (issue.description || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return plate.includes(s) || title.includes(s) || desc.includes(s);
  });

  const filteredAlerts = alerts.filter((alert) => {
    const plate = (alert.vehicle?.plate || alert.trailer?.plate || "").toLowerCase();
    const title = (alert.title || "").toLowerCase();
    const desc = (alert.description || "").toLowerCase();
    const s = searchTerm.toLowerCase();
    return plate.includes(s) || title.includes(s) || desc.includes(s);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden gap-6 justify-start">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm shrink-0">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, defeito ou alerta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("issues")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
              activeTab === "issues"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle size={16} />
            Defeitos Deduplicados ({filteredIssues.length})
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
              activeTab === "alerts"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Wrench size={16} />
            Alertas Críticos ({filteredAlerts.length + filteredAlertIssues.length})
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-xs font-bold uppercase tracking-widest animate-pulse">
            Sincronizando novas pendências e alertas...
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
               {filteredIssues.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl items-center justify-center text-center p-8 py-16">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 mx-auto border border-emerald-100">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-gray-800">
                    Nenhum defeito não resolvido!
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 leading-normal max-w-sm font-medium mx-auto">
                    Não existem pendências ativas nos checklists dos seus veículos. Sua frota está 100% operacional.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="bg-white border border-gray-200/65 rounded-xl flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:border-indigo-300 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Status/Icon */}
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0 border border-amber-100/80">
                          <AlertTriangle size={18} />
                        </div>
                        
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-gray-700 px-2 py-0.5 bg-gray-100 rounded border border-gray-200 uppercase tracking-widest">
                              {issue.vehicle?.plate || issue.trailer?.plate || "S/ Placa"}
                            </span>
                            {issue.occurrencesCount > 1 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wider uppercase">
                                <Layers size={10} />
                                {issue.occurrencesCount}x Relatado
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Clock size={11} />
                              {getRelativeTime(issue.created_at)}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-gray-800 mt-1">
                            {issue.item_title}
                          </h4>
                          {issue.description && (
                            <p className="text-gray-500 text-xs font-semibold leading-relaxed mt-0.5 truncate md:max-w-2xl">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                        {issue.occurrencesCount > 1 && (
                          <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/80">
                            Primeiro: {new Date(issue.reportedDates[issue.reportedDates.length - 1]).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {issue.photo_url && (
                          <button
                            onClick={() => setSelectedPhoto(getPhotoUrl(issue.photo_url))}
                            className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative group shadow-sm flex items-center justify-center hover:border-indigo-500 transition-all active:scale-95"
                          >
                            <img
                              src={getPhotoUrl(issue.photo_url)}
                              alt="Defeito"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </button>
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
              {filteredAlerts.length === 0 && filteredAlertIssues.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl items-center justify-center text-center p-8 py-16">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 mx-auto border border-emerald-100">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-sm font-black text-gray-800">
                    Nenhum limite de alerta operacional atingido!
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 leading-normal max-w-sm font-medium mx-auto">
                    Todas as previsões de quilometragem e agendamentos temporais de vistorias estão dentro da normalidade.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredAlertIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="bg-white border border-red-200/65 rounded-xl flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:border-red-300 hover:shadow-sm transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0 border border-red-100/80">
                          <AlertTriangle size={18} />
                        </div>
                        
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-gray-700 px-2 py-0.5 bg-gray-100 rounded border border-gray-200 uppercase tracking-widest">
                              {issue.vehicle?.plate || issue.trailer?.plate || "S/ Placa"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[8px] font-black tracking-widest uppercase border border-red-100">
                              Alerta Disparado
                            </span>
                            {issue.occurrencesCount > 1 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black tracking-wider uppercase">
                                <Layers size={10} />
                                {issue.occurrencesCount}x Relatado
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Clock size={11} />
                              Disparado: {getRelativeTime(issue.created_at)}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-gray-800 mt-1">
                            {issue.item_title}
                          </h4>
                          {issue.description && (
                            <p className="text-gray-500 text-xs font-semibold leading-relaxed mt-0.5 truncate md:max-w-2xl">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                        {issue.occurrencesCount > 1 && (
                          <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/80">
                            Primeiro: {new Date(issue.reportedDates[issue.reportedDates.length - 1]).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {issue.photo_url && (
                          <button
                            onClick={() => setSelectedPhoto(getPhotoUrl(issue.photo_url))}
                            className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative group shadow-sm flex items-center justify-center hover:border-red-500 transition-all active:scale-95"
                          >
                            <img
                              src={getPhotoUrl(issue.photo_url)}
                              alt="Defeito"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredAlerts.map((alert) => {
                    const isKmType = alert.trigger_type === "km";

                    return (
                      <div
                        key={alert.id}
                        className="bg-white border border-gray-200/65 rounded-xl flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:border-red-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="p-2 bg-red-50 text-red-500 rounded-lg shrink-0 border border-red-100">
                            {isKmType ? <Gauge size={18} /> : <Calendar size={18} />}
                          </div>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-black text-gray-700 px-2 py-0.5 bg-gray-100 rounded border border-gray-200 uppercase tracking-widest">
                                {alert.vehicle?.plate || alert.trailer?.plate || "S/ Placa"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[8px] font-black tracking-widest uppercase border border-red-100">
                                Crítico / Planejado
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-bold text-gray-800 mt-1">
                              {alert.title}
                            </h4>
                            {alert.description && (
                              <p className="text-gray-500 text-xs font-semibold leading-relaxed mt-0.5 truncate md:max-w-2xl">
                                {alert.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metric progress and status */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/60 text-left min-w-[140px]">
                            <div>
                              <span className="block text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                Métrica
                              </span>
                              <span className="block text-[11px] font-bold text-gray-700 mt-0.5">
                                {alert.currentMetric || "A vencer"}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                Limite
                              </span>
                              <span className="block text-[11px] font-bold text-red-500 mt-0.5">
                                {alert.limitMetric}
                              </span>
                            </div>
                          </div>

                          {isKmType && alert.progressPercent > 0 && (
                            <div className="space-y-1 min-w-[120px]">
                              <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                <span>Preventivo</span>
                                <span className="text-red-500 font-extrabold">
                                  {alert.progressPercent}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-100 border border-gray-200/40 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${alert.progressPercent}%` }}
                                  className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full"
                                />
                              </div>
                            </div>
                          )}
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
      </div>

      {/* Enlarged Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
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
              alt="Photo preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
