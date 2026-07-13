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
  ShieldAlert,
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
  PackageSearch,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import SchedulesTab from "@/src/modules/company/components/SchedulesTab";
import AdmUsersTab from "@/src/modules/company/components/AdmUsersTab";
import DriversTab from "@/src/modules/company/components/DriversTab";
import VehiclesTab from "@/src/modules/company/components/VehiclesTab";
import RoutesTab from "@/src/modules/company/components/RoutesTab";
import ChecklistSetupTab from "@/src/modules/company/components/ChecklistSetupTab";
import ChecklistsHistoryTab from "@/src/modules/company/components/ChecklistsHistoryTab";
import MaintenanceTab from "@/src/modules/company/components/MaintenanceTab";
import InventoryTab from "@/src/modules/company/components/InventoryTab";
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
import InfractionsTab from "@/src/modules/company/components/InfractionsTab";
import FeedbackTab from "@/src/modules/company/components/FeedbackTab";
import NotificationsTab from "@/src/modules/company/components/NotificationsTab";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

import { GlobalSearch } from "@/src/modules/company/components/GlobalSearch";
import { runSilentAudit } from "@/src/lib/auditService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      prev.set("tab", tab);
      return prev;
    });
  };
  const [appSettings, setAppSettings] = useState({
    system_type: "points",
    initial_value: 1000,
    penalty_start: 50,
    penalty_end: 50,
    penalty_fuel: 50,
    penalty_yard: 50,
  });
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vehiclesWithPending, setVehiclesWithPending] = useState<any[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    fetchVehiclesWithPending();
    fetchNotificationCount();

    // Background audit specifically invoked when admin is online
    runSilentAudit(user?.company_id);
    const intervalId = setInterval(
      () => {
        runSilentAudit(user?.company_id);
        fetchNotificationCount();
      },
      60 * 60 * 1000,
    ); // 60 minutes

    return () => clearInterval(intervalId);
  }, [user?.company_id]);

  const fetchNotificationCount = async () => {
    if (!user?.company_id) return;
    try {
      const { data: issuesData } = await supabase.from("checklist_issues").select("id, vehicle_id, trailer_id, item_title, status, resolved_by").eq("company_id", user?.company_id)
        .eq("company_id", user.company_id)
        .or("status.eq.pending,and(status.eq.resolved,resolved_by.is.null)");

      const pendingIssues = issuesData || [];

      const uniqueIssuesSet = new Set<string>();
      pendingIssues.forEach((issue) => {
        const vehicleKey = issue.vehicle_id || issue.trailer_id || "no-vehicle";
        const titleKey = (issue.item_title || "").trim().toLowerCase();
        uniqueIssuesSet.add(`${vehicleKey}_${titleKey}`);
      });

      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select(
          "id, trigger_type, trigger_date, warning_days, interval_km, last_km, warning_km, target_vehicle_id",
        )
        .eq("company_id", user.company_id)
        .eq("active", true);

      const { data: submissions } = await supabase.from("checklist_submissions").select("vehicle_id, odometer").eq("company_id", user?.company_id)
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
          const warningDays = alert.warning_days
            ? Number(alert.warning_days)
            : 0;
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
            Number(alert.last_km) +
            Number(alert.interval_km) -
            Number(alert.warning_km);
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
        .from("profiles")
        .update({ company_id: null })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      navigate("/sa/dashboard");
    } catch (err) {
      console.error("Erro ao sair do painel da empresa:", err);
      alert("Erro ao sair do painel da empresa.");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let { data: settings } = await supabase
        .from("app_settings")
        .select("*")
        .eq("company_id", user?.company_id)
        .maybeSingle();

      if (!settings && user?.company_id) {
         const { data: newSettings } = await supabase.from("app_settings").insert({
           company_id: user.company_id,
           system_type: 'logistics',
           initial_value: 1000,
           require_external_photos: false,
           require_fuel_receipt_photo: false,
           require_location: false,
           km_limit_enabled: false,
           max_km_limit: 500,
           manual_checklist_activate: true
         }).select().single();
         settings = newSettings;
      }

      if (settings) setAppSettings(settings);

      if (user?.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.company_id)
          .single();
        if (company) setCompanyData(company);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehiclesWithPending = async () => {
    try {
      const { data: vehicles } = await supabase.from("vehicles").select(`
          *,
          checklist_submissions(
            status,
            details,
            created_at).eq("company_id", user?.company_id),
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

  const navItems: Array<{
    id: string;
    icon: any;
    label: string;
    color: string;
    disabled?: boolean;
  }> = [
    {
      id: "overview",
      icon: LayoutDashboard,
      label: "Painel",
      color: "from-blue-500 to-cyan-500",
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
      id: "infractions",
      icon: ShieldAlert,
      label: "Infrações",
      color: "from-red-600 to-rose-600",
    },
    {
      id: "inventory",
      icon: PackageSearch,
      label: "Estoque",
      color: "from-teal-500 to-emerald-500",
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
        {/* Company Logo & Name */}
        {companyData && (
          <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-100 overflow-hidden">
            <div className="min-w-[40px] w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
              {companyData.logo_url ? (
                <img src={companyData.logo_url} alt={companyData.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-bold text-lg">{companyData.name?.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h2 className="text-sm font-bold text-gray-900 truncate">{companyData.name}</h2>
              <p className="text-xs text-gray-500 font-medium tracking-wide">PAINEL ADMINISTRATIVO</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto overflow-x-hidden md:hide-scrollbar">
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
              </div>
              <span className="text-sm font-semibold flex-1 text-left opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {item.label}
              </span>
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
      </aside>

      {/* Main Content */}
      <div
        className={`dashboard-scroll-area flex-1 flex flex-col h-full print:h-auto print:overflow-visible ${activeTab === "notifications" ? "overflow-hidden" : "overflow-y-auto"} ${selectedSub ? "print:hidden" : ""}`}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 md:px-8 py-2 md:py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4 lg:gap-8 flex-1">
            {/* Search Input */}
            <GlobalSearch
              onNavigate={(tab) => {
                if (activeTab !== tab) {
                  setActiveTab(tab);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3 lg:gap-4 ml-4">
            {/* Notifications */}
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors border border-gray-200/50"
            >
              <Bell
                size={18}
                className={activeTab === "notifications" ? "text-primary" : ""}
              />
              {notifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 pl-2 lg:pl-3 border-l border-gray-200 cursor-pointer focus:outline-none"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-gray-800 leading-tight select-none">
                    {user?.name || "Administrador"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold leading-tight mt-0.5 select-none">
                    {user?.role || "Gestão de Frota"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow border-2 border-white ring-1 ring-gray-200">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Super Admin Back button */}
            {user?.role === "superadmin" && (
              <button
                onClick={handleExitImpersonation}
                className="hidden xl:flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40 rounded-xl transition-all font-bold text-xs uppercase tracking-wider shadow-sm border border-purple-200/50"
              >
                Sair
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div
          className={`flex-1 p-8 ${activeTab === "notifications" ? "flex flex-col overflow-hidden h-full" : "space-y-6"}`}
        >
          {/* Vehicles with Pending Section */}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`print:h-auto print:overflow-visible ${activeTab === "notifications" ? "flex-1 flex flex-col overflow-hidden h-full" : ""}`}
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
              {activeTab === "infractions" && <InfractionsTab />}
              {activeTab === "inventory" && <InventoryTab />}
              {activeTab === "abastecimentos" && <FuelTab />}
              {activeTab === "averages" && <AveragesTab />}
              {activeTab === "schedules" && (
                <SchedulesTab
                  onViewChecklist={async (subId: string) => {
                    const { data } = await supabase.from("checklist_submissions").select("*, profiles(full_name), vehicles(plate)").eq("company_id", user?.company_id)
                      .eq("id", subId)
                      .single();
                    if (data) setSelectedSub(data);
                  }}
                />
              )}
              {activeTab === "audit" && user?.role === "admin" && (
                <AuditTab appSettings={appSettings} />
              )}
              {activeTab === "feedback" && user?.role === "admin" && (
                <FeedbackTab />
              )}
              {activeTab === "database" && <DatabaseTab />}
              {activeTab === "alerts" && <AlertsTab />}
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
