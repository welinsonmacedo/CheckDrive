import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Truck,
  Map,
  Settings,
  BarChart3,
  LayoutDashboard,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  X,
  Fuel,
  History,
  Trophy,
  CalendarDays,
  ChevronRight,
  Bell,
  UserCircle,
  LogOut,
  Search,
  Activity,
  Wrench,
  AlertCircle,
  ChevronDown,
  Database,
  Navigation,
  HardDrive,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useNavigate } from "react-router-dom";
import SchedulesTab from "@/src/modules/company/components/SchedulesTab";
import AdmUsersTab from "@/src/modules/company/components/AdmUsersTab";
import DriversTab from "@/src/modules/company/components/DriversTab";
import VehiclesTab from "@/src/modules/company/components/VehiclesTab";
import RoutesTab from "@/src/modules/company/components/RoutesTab";
import ChecklistSetupTab from "@/src/modules/company/components/ChecklistSetupTab";
import ChecklistsHistoryTab from "@/src/modules/company/components/ChecklistsHistoryTab";
import MaintenanceTab from "@/src/modules/company/components/MaintenanceTab";
import FuelTab from "@/src/modules/company/components/FuelTab";
import BaitsTab from "@/src/modules/company/components/BaitsTab";
import TrackingTab from "@/src/modules/company/components/TrackingTab";
import AuditTab from "@/src/modules/company/components/AuditTab";
import OverviewTab from "@/src/modules/company/components/OverviewTab";
import SettingsTab from "@/src/modules/company/components/SettingsTab";
import ChecklistDetailsModal from "@/src/modules/company/components/ChecklistDetailsModal";
import RankingTab from "@/src/modules/company/components/RankingTab";
import DatabaseTab from "@/src/modules/company/components/DatabaseTab";
import ReportsTab from "@/src/modules/company/components/ReportsTab";
import AveragesTab from "@/src/modules/company/components/AveragesTab";
import AlertsTab from "@/src/modules/company/components/AlertsTab";
import FeedbackTab from "@/src/modules/company/components/FeedbackTab";
import NotificationsTab from "@/src/modules/company/components/NotificationsTab";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

import { runSilentAudit } from "@/src/lib/auditService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab ] = useState("overview");
  const [appSettings, setAppSettings] = useState({
    system_type: "points",
    initial_value: 1000,
    penalty_start: 50,
    penalty_end: 50,
    penalty_fuel: 50,
    penalty_yard: 50,
  });
  const [loading, setLoading] = useState(true);
  const [vehiclesWithPending, setVehiclesWithPending] = useState<any[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    fetchVehiclesWithPending();
    fetchNotificationCount();

    // Background audit specifically invoked when admin is online
    runSilentAudit();
    const intervalId = setInterval(
      () => {
        runSilentAudit();
        fetchNotificationCount();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(intervalId);
  }, [user?.company_id]);

  const fetchNotificationCount = async () => {
    if (!user?.company_id) return;
    try {
      const { data: issuesData } = await supabase
        .from("checklist_issues")
        .select("id, vehicle_id, trailer_id, item_title")
        .eq("company_id", user.company_id)
        .eq("status", "pending");

      const uniqueIssuesSet = new Set<string>();
      (issuesData || []).forEach((issue) => {
        const vehicleKey = issue.vehicle_id || issue.trailer_id || "no-vehicle";
        const titleKey = (issue.item_title || "").trim().toLowerCase();
        uniqueIssuesSet.add(`${vehicleKey}_${titleKey}`);
      });

      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select("id, trigger_type, trigger_date, warning_days, interval_km, last_km, warning_km, target_vehicle_id")
        .eq("company_id", user.company_id)
        .eq("active", true);

      const { data: submissions } = await supabase
        .from("checklist_submissions")
        .select("vehicle_id, odometer")
        .eq("company_id", user.company_id)
        .order("created_at", { ascending: false });

      const latestOdometer: Record<string, number> = {};
      (submissions || []).forEach((sub) => {
        if (sub.vehicle_id && !latestOdometer[sub.vehicle_id]) {
          latestOdometer[sub.vehicle_id] = sub.odometer || 0;
        }
      });

      let triggeredAlertsCount = 0;
      (alertsData || []).forEach((alert) => {
        if (alert.trigger_type === "date" && alert.trigger_date) {
          const warningDays = alert.warning_days ? Number(alert.warning_days) : 0;
          const targetDate = new Date(alert.trigger_date + "T00:00:00");
          const thresholdDate = new Date(targetDate);
          thresholdDate.setDate(targetDate.getDate() - warningDays);
          if (new Date() >= thresholdDate) {
            triggeredAlertsCount++;
          }
        } else if (
          alert.trigger_type === "km" &&
          alert.interval_km &&
          alert.last_km &&
          alert.warning_km
        ) {
          const vehicleOdometer = latestOdometer[alert.target_vehicle_id] || 0;
          const warningThreshold =
            Number(alert.last_km) + Number(alert.interval_km) - Number(alert.warning_km);
          if (vehicleOdometer >= warningThreshold) {
            triggeredAlertsCount++;
          }
        }
      });

      setNotifCount(uniqueIssuesSet.size + triggeredAlertsCount);
    } catch (err) {
      console.warn("Error fetching admin notification count:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleExitImpersonation = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: null })
        .eq('id', user.id);
        
      if (error) throw error;
      
      await refreshProfile();
      navigate('/sa/dashboard');
    } catch (err) {
      console.error('Erro ao sair do painel da empresa:', err);
      alert('Erro ao sair do painel da empresa.');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("*")
        .single();
      if (settings) setAppSettings(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehiclesWithPending = async () => {
    try {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select(
          `
          *,
          checklist_submissions(
            status,
            details,
            created_at
          ),
          maintenance_records(
            status,
            priority
          )
        `,
        )
        .limit(5);

      if (vehicles) {
        const processed = vehicles.map((vehicle) => {
          const pendingMaintenance =
            vehicle.maintenance_records?.filter(
              (m: any) => m.status === "pending" || m.status === "in_progress",
            ).length || 0;

          const recentDefects =
            vehicle.checklist_submissions?.filter(
              (c: any) =>
                c.status === "defect" &&
                new Date(c.created_at) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            ).length || 0;

          const totalScore = pendingMaintenance * 10 + recentDefects * 5;

          return {
            ...vehicle,
            pending_maintenance: pendingMaintenance,
            recent_defects: recentDefects,
            priority_score: totalScore,
            status:
              totalScore > 20
                ? "critical"
                : totalScore > 10
                  ? "warning"
                  : "normal",
          };
        });

        setVehiclesWithPending(
          processed.sort((a, b) => b.priority_score - a.priority_score),
        );
      }
    } catch (error) {
      console.error("Error fetching vehicles with pending:", error);
    }
  };

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdowns((prev) =>
      prev.includes(dropdown)
        ? prev.filter((d) => d !== dropdown)
        : [...prev, dropdown],
    );
  };

  const navItems: Array<{ id: string; icon: any; label: string; color: string; disabled?: boolean }> = [
    {
      id: "overview",
      icon: LayoutDashboard,
      label: "Painel",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Notificações",
      color: "from-indigo-600 to-purple-600",
    },
    {
      id: "tracking",
      icon: Navigation,
      label: "Monitoramento",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "checklists",
      icon: BarChart3,
      label: "CheckList",
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "ranking",
      icon: Trophy,
      label: "Ranking",
      color: "from-yellow-400 to-yellow-600",
    },
    {
      id: "maintenance",
      icon: AlertTriangle,
      label: "Pendências",
      color: "from-red-500 to-orange-500",
    },
    {
      id: "abastecimentos",
      icon: Fuel,
      label: "Abastecimento",
      color: "from-green-500 to-emerald-500",
    },
    ...(!user?.hideAverages
      ? [
          {
            id: "averages",
            icon: Activity,
            label: "Médias",
            color: "from-cyan-500 to-blue-500",
          },
        ]
      : []),
    {
      id: "schedules",
      icon: CalendarDays,
      label: "Escalas",
      color: "from-indigo-500 to-blue-500",
    },
    {
      id: "reports",
      icon: BarChart3,
      label: "Relatório Gerencial",
      color: "from-indigo-600 to-blue-600",
    },
    ...(user?.role === "admin"
      ? [
          {
            id: "audit",
            icon: History,
            label: "Auditoria",
            color: "from-slate-500 to-gray-500",
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            id: "feedback",
            icon: MessageSquare,
            label: "Feedback",
            color: "from-pink-500 to-rose-500",
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            id: "settings",
            icon: Settings,
            label: "Configurações",
            color: "from-gray-500 to-slate-500",
          },
        ]
      : []),
  ];

  const registerItems = [
    {
      id: "adm_users",
      icon: Users,
      label: "Usuários Admin",
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "drivers",
      icon: Users,
      label: "Motoristas",
      color: "from-amber-500 to-yellow-500",
    },
    {
      id: "vehicles",
      icon: Truck,
      label: "Veículos",
      color: "from-teal-500 to-green-500",
    },
    {
      id: "routes",
      icon: Map,
      label: "Rotas",
      color: "from-violet-500 to-purple-500",
    },
    {
      id: "checklist_setup",
      icon: ClipboardCheck,
      label: "Itens de Checklist",
      color: "from-rose-500 to-red-500",
    },
    {
      id: "baits",
      icon: Map,
      label: "Iscas",
      color: "from-fuchsia-500 to-purple-500",
    },
    {
      id: "alerts",
      icon: Bell,
      label: "Alertas",
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 print:h-auto print:overflow-visible flex-col md:flex-row relative">
      {/* Spacer for sidebar to avoid layout shift */}
      <div className="hidden md:block w-20 flex-shrink-0" />

      {/* Sidebar */}
      <aside className="group w-full md:absolute md:left-0 md:top-0 md:bottom-0 md:w-20 md:hover:w-72 flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col print:hidden transition-[width] duration-300 z-50 overflow-x-hidden overflow-y-auto md:overflow-y-hidden">
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto overflow-x-hidden md:hide-scrollbar">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={item.disabled ? {} : { x: 5 }}
              whileTap={item.disabled ? {} : { scale: 0.98 }}
              onClick={() => !item.disabled && setActiveTab(item.id)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group/item ${
                item.disabled
                  ? "opacity-60 cursor-not-allowed bg-gray-50 text-gray-400"
                  : activeTab === item.id
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                    : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="min-w-[20px] flex items-center justify-center relative">
                <item.icon
                  size={20}
                  className={
                    item.disabled
                      ? "text-gray-400"
                      : activeTab === item.id
                        ? "text-white"
                        : "text-gray-400 group-hover/item:text-gray-600"
                  }
                />
                {item.id === "notifications" && notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-2.5 h-2.5 border border-white" />
                )}
              </div>
              <span className="text-sm font-semibold flex-1 text-left opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {item.label}
              </span>
              {item.id === "notifications" && notifCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight tabular-nums transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-300 ${
                  activeTab === item.id ? "bg-white text-indigo-700" : "bg-red-500 text-white"
                }`}>
                  {notifCount}
                </span>
              )}
              {activeTab === item.id && !item.disabled && (
                <ChevronRight
                  size={16}
                  className="text-white/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 min-w-[16px]"
                />
              )}
            </motion.button>
          ))}

          {/* Dropdown: Cadastros - Only visible for admin */}
          {user?.role === "admin" && (
            <div className="mt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleDropdown("cadastros")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group/item ${
                  registerItems.some((item) => item.id === activeTab)
                    ? "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="min-w-[20px] flex items-center justify-center">
                  <Database
                    size={20}
                    className={
                      registerItems.some((item) => item.id === activeTab)
                        ? "text-primary"
                        : "text-gray-400 group-hover/item:text-gray-600"
                    }
                  />
                </div>
                <span className="text-sm font-semibold flex-1 text-left opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  Cadastros
                </span>
                <motion.div
                  animate={{
                    rotate: openDropdowns.includes("cadastros") ? 180 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 min-w-[16px]"
                >
                  <ChevronDown size={16} className="text-gray-400" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {openDropdowns.includes("cadastros") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-2 md:ml-6 mt-1 space-y-1 overflow-hidden"
                  >
                    {registerItems.map((item) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group/sub ${
                          activeTab === item.id
                            ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        <div className="min-w-[18px] flex items-center justify-center">
                          <item.icon
                            size={18}
                            className={
                              activeTab === item.id
                                ? "text-white"
                                : "text-gray-400 group-hover/sub:text-gray-600"
                            }
                          />
                        </div>
                        <span className="text-xs font-semibold flex-1 text-left opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                          {item.label}
                        </span>
                        {activeTab === item.id && (
                          <ChevronRight
                            size={14}
                            className="text-white/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 min-w-[14px]"
                          />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* Botão Logout */}
        <div className="p-4 border-t border-gray-100 bg-white/95 whitespace-nowrap overflow-hidden">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-200 group/logout"
          >
            <div className="min-w-[20px] flex items-center justify-center">
              <LogOut size={20} className="text-red-600" />
            </div>
            <span className="text-sm font-semibold flex-1 text-left text-red-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Sair do Sistema
            </span>
            <div className="w-6 h-6 rounded-full bg-red-200/50 flex items-center justify-center opacity-0 group-hover/logout:opacity-100 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 min-w-[24px]">
              <ChevronRight size={14} className="text-red-600" />
            </div>
          </motion.button>

          <div className="mt-4 p-3 bg-gray-50 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Sistema
              </span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              Desenvolvido Welinson Macedo.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`dashboard-scroll-area flex-1 flex flex-col h-full print:h-auto print:overflow-visible ${activeTab === 'notifications' ? 'overflow-hidden' : 'overflow-y-auto'} ${selectedSub ? 'print:hidden' : ''}`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-8 py-4 flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-black text-gray-800">
              {[...navItems, ...registerItems].find((i) => i.id === activeTab)
                ?.label || "Dashboard"}
            </h2>
          </div>
          {user?.role === "superadmin" && (
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40 rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-sm border border-purple-200/50"
            >
              Voltar ao SaaS / Super Admin
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className={`flex-1 p-8 ${activeTab === 'notifications' ? 'flex flex-col overflow-hidden h-full' : 'space-y-6'}`}>
          {/* Vehicles with Pending Section */}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`print:h-auto print:overflow-visible ${activeTab === 'notifications' ? 'flex-1 flex flex-col overflow-hidden h-full' : ''}`}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  setActiveTab={setActiveTab}
                  appSettings={appSettings}
                />
              )}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "tracking" && <TrackingTab />}
              {activeTab === "reports" && <ReportsTab />}
              {activeTab === "adm_users" && <AdmUsersTab />}
              {activeTab === "drivers" && <DriversTab />}
              {activeTab === "vehicles" && <VehiclesTab />}
              {activeTab === "routes" && <RoutesTab />}
              {activeTab === "checklist_setup" && <ChecklistSetupTab />}
              {activeTab === "baits" && <BaitsTab />}
              {activeTab === "ranking" && (
                <RankingTab appSettings={appSettings} />
              )}
              {activeTab === "checklists" && (
                <ChecklistsHistoryTab
                  onViewDetails={(sub) => {
                    setSelectedSub(sub);
                  }}
                />
              )}
              {activeTab === "maintenance" && <MaintenanceTab />}
              {activeTab === "abastecimentos" && <FuelTab />}
              {activeTab === "averages" && <AveragesTab />}
              {activeTab === "schedules" && (
                <SchedulesTab
                  onViewChecklist={async (subId: string) => {
                    const { data } = await supabase
                      .from("checklist_submissions")
                      .select("*, profiles(full_name), vehicles(plate)")
                      .eq("id", subId)
                      .single();
                    if (data) setSelectedSub(data);
                  }}
                />
              )}
              {activeTab === "audit" && user?.role === "admin" && (
                <AuditTab appSettings={appSettings} />
              )}
              {activeTab === "feedback" && user?.role === "admin" && <FeedbackTab />}
              {activeTab === "database" && (
                <DatabaseTab />
              )}
              {activeTab === "alerts" && (
                <AlertsTab />
              )}
              {activeTab === "settings" && user?.role === "admin" && (
                <SettingsTab
                  appSettings={appSettings}
                  setAppSettings={setAppSettings}
                  fetchData={fetchData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Checklist Details Modal - Apenas uma vez */}
      <ChecklistDetailsModal
        selectedSub={selectedSub}
        onClose={() => setSelectedSub(null)}
      />
    </div>
  );
}
