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
  Shield,
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
  PackageSearch, Menu,
  Bot,
  Building2,
  Grid,
  ArrowLeft,
  Layers,
} from "lucide-react";
import CheckDriveAiTab from "../components/CheckDriveAiTab";
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
import InsurancesTab from "@/src/modules/company/components/InsurancesTab";
import BranchesTab from "@/src/modules/company/components/BranchesTab";
import ImportModuleView from "@/src/modules/data_import/components/ImportModuleView";
import MyVehicles from "@/src/modules/driver/pages/MyVehicles";
import MyDrivers from "@/src/modules/driver/pages/MyDrivers";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

import { GlobalSearch } from "@/src/modules/company/components/GlobalSearch";
import { runSilentAudit } from "@/src/lib/auditService";

const tabToModuleMap: Record<string, string> = {
  overview: "core",
  branches: "core",
  adm_users: "core",
  drivers: "core",
  my_drivers: "core",
  vehicles: "core",
  my_vehicles: "core",
  insurances: "core",
  settings: "core",

  checklists: "checklist",
  checklist_setup: "checklist",

  maintenance: "maintenance",
  alerts: "maintenance",
  infractions: "maintenance",

  inventory: "inventory",

  abastecimentos: "fuel",
  averages: "fuel",

  tracking: "tracking",
  routes: "tracking",
  baits: "tracking",

  schedules: "schedules",

  ranking: "intelligence",
  reports: "intelligence",
  audit: "intelligence",
  notifications: "intelligence",
  feedback: "intelligence",
  database: "intelligence",

  checkdrive_ai: "checkdrive_ai",
  data_import: "data_import",
};

const MODULES = [
  {
    id: "core",
    title: "Core",
    subtitle: "Gestão Principal",
    description: "Visão geral, filiais, usuários administrativos, motoristas, veículos e configurações do sistema.",
    icon: Building2,
    color: "from-blue-600 to-indigo-600",
    bgGradient: "from-blue-50 to-indigo-50/50",
    borderHover: "hover:border-blue-300",
    badgeBg: "bg-blue-100 text-blue-700",
    items: [
      { id: "overview", icon: LayoutDashboard, label: "Painel Geral", color: "from-blue-500 to-cyan-500" },
      { id: "branches", icon: Building2, label: "Filiais", color: "from-blue-600 to-cyan-500", requiresRole: "admin" },
      { id: "adm_users", icon: Users, label: "Usuários Admin", color: "from-blue-500 to-indigo-500", requiresRole: "admin" },
      { id: "drivers", icon: Users, label: "Motoristas", color: "from-amber-500 to-yellow-500" },
      { id: "my_drivers", icon: Users, label: "Meus Motoristas", color: "from-amber-500 to-yellow-500" },
      { id: "vehicles", icon: Truck, label: "Veículos", color: "from-teal-500 to-green-500", requiresRole: "admin" },
      { id: "my_vehicles", icon: Truck, label: "Meus Veículos", color: "from-teal-500 to-green-500" },
      { id: "insurances", icon: Shield, label: "Seguradoras", color: "from-indigo-500 to-blue-500", requiresRole: "admin" },
      { id: "settings", icon: Settings, label: "Opções de Perfil", color: "from-gray-500 to-slate-500", requiresRole: "admin" },
    ],
  },
  {
    id: "checklist",
    title: "Checklist",
    subtitle: "Inspeções e Formulários",
    description: "Acompanhamento do histórico de auditoria de veículos e parametrização do setup de checklists.",
    icon: ClipboardCheck,
    color: "from-purple-600 to-pink-600",
    bgGradient: "from-purple-50 to-pink-50/50",
    borderHover: "hover:border-purple-300",
    badgeBg: "bg-purple-100 text-purple-700",
    items: [
      { id: "checklists", icon: BarChart3, label: "Histórico de Checklists", color: "from-purple-500 to-pink-500" },
      { id: "checklist_setup", icon: ClipboardCheck, label: "Setup do Checklist", color: "from-rose-500 to-red-500", requiresRole: "admin" },
    ],
  },
  {
    id: "maintenance",
    title: "Manutenção",
    subtitle: "Pendências e Alertas",
    description: "Central de resolução de pendências de frota, regras de alertas automáticos e registro de infrações.",
    icon: AlertTriangle,
    color: "from-red-500 to-orange-500",
    bgGradient: "from-red-50 to-orange-50/50",
    borderHover: "hover:border-red-300",
    badgeBg: "bg-red-100 text-red-700",
    items: [
      { id: "maintenance", icon: AlertTriangle, label: "Pendências e Resolução", color: "from-red-500 to-orange-500" },
      { id: "alerts", icon: Bell, label: "Alertas Automáticos", color: "from-orange-500 to-amber-500", requiresRole: "admin" },
      { id: "infractions", icon: ShieldAlert, label: "Infrações", color: "from-red-600 to-rose-600" },
    ],
  },
  {
    id: "inventory",
    title: "Estoque",
    subtitle: "Suprimentos e Peças",
    description: "Gestão de peças, insumos, cadastro de fornecedores e lançamento de entrada por Notas Fiscais.",
    icon: PackageSearch,
    color: "from-teal-500 to-emerald-600",
    bgGradient: "from-teal-50 to-emerald-50/50",
    borderHover: "hover:border-teal-300",
    badgeBg: "bg-teal-100 text-teal-700",
    items: [
      { id: "inventory", icon: PackageSearch, label: "Peças, Insumos e Notas", color: "from-teal-500 to-emerald-500" },
    ],
  },
  {
    id: "fuel",
    title: "Abastecimento",
    subtitle: "Combustível e Médias",
    description: "Lançamento e controle de abastecimentos da frota com cálculo e monitoramento de médias de consumo.",
    icon: Fuel,
    color: "from-green-500 to-emerald-600",
    bgGradient: "from-green-50 to-emerald-50/50",
    borderHover: "hover:border-green-300",
    badgeBg: "bg-green-100 text-green-700",
    items: [
      { id: "abastecimentos", icon: Fuel, label: "Abastecimento", color: "from-green-500 to-emerald-500" },
      { id: "averages", icon: Activity, label: "Médias de Consumo", color: "from-cyan-500 to-blue-500" },
    ],
  },
  {
    id: "tracking",
    title: "Rastreamento",
    subtitle: "Telemetria e Rotas",
    description: "Monitoramento em tempo real, cadastro e gestão de rotas operacionais e rastreadores iscas.",
    icon: Navigation,
    color: "from-emerald-500 to-cyan-600",
    bgGradient: "from-emerald-50 to-cyan-50/50",
    borderHover: "hover:border-emerald-300",
    badgeBg: "bg-emerald-100 text-emerald-700",
    items: [
      { id: "tracking", icon: Navigation, label: "Monitoramento", color: "from-emerald-500 to-teal-500" },
      { id: "routes", icon: Map, label: "Rotas", color: "from-violet-500 to-purple-500", requiresRole: "admin" },
      { id: "baits", icon: Map, label: "Iscas", color: "from-fuchsia-500 to-purple-500", requiresRole: "admin" },
    ],
  },
  {
    id: "schedules",
    title: "Planejamento",
    subtitle: "Escalas de Trabalho",
    description: "Programação e gestão de escalas de serviço e turnos operacionais dos motoristas.",
    icon: CalendarDays,
    color: "from-indigo-500 to-blue-600",
    bgGradient: "from-indigo-50 to-blue-50/50",
    borderHover: "hover:border-indigo-300",
    badgeBg: "bg-indigo-100 text-indigo-700",
    items: [
      { id: "schedules", icon: CalendarDays, label: "Escalas", color: "from-indigo-500 to-blue-500" },
    ],
  },
  {
    id: "intelligence",
    title: "Inteligência",
    subtitle: "Análises e Auditoria",
    description: "Ranking de desempenho, relatórios gerenciais consolidados, auditoria de alterações e notificações.",
    icon: Trophy,
    color: "from-amber-500 to-yellow-600",
    bgGradient: "from-amber-50 to-yellow-50/50",
    borderHover: "hover:border-amber-300",
    badgeBg: "bg-amber-100 text-amber-700",
    items: [
      { id: "ranking", icon: Trophy, label: "Ranking", color: "from-yellow-400 to-yellow-600" },
      { id: "reports", icon: BarChart3, label: "Relatórios e BI", color: "from-indigo-600 to-blue-600" },
      { id: "audit", icon: History, label: "Auditoria", color: "from-slate-500 to-gray-500", requiresPermission: "AUDIT_VIEW" },
      { id: "notifications", icon: Bell, label: "Notificações", color: "from-orange-500 to-amber-500" },
      { id: "feedback", icon: MessageSquare, label: "Feedback", color: "from-pink-500 to-rose-500", requiresRole: "admin" },
    ],
  },
  {
    id: "checkdrive_ai",
    title: "IA (CheckDrive AI)",
    subtitle: "Inteligência Artificial",
    description: "Assistente virtual inteligente para insights preditivos e análises em tempo real da frota.",
    icon: Bot,
    color: "from-blue-600 via-indigo-600 to-purple-600",
    bgGradient: "from-indigo-50 via-purple-50 to-blue-50/50",
    borderHover: "hover:border-indigo-300",
    badgeBg: "bg-indigo-100 text-indigo-700",
    items: [
      { id: "checkdrive_ai", icon: Bot, label: "CheckDrive AI", color: "from-blue-600 via-indigo-600 to-purple-600" },
    ],
  },
  {
    id: "data_import",
    title: "Importação de Dados",
    subtitle: "Senior / SOFTran PDF",
    description: "Módulo isolado para leitura de relatórios PDF, validação SHA-256 e staging area.",
    icon: HardDrive,
    color: "from-blue-600 via-indigo-700 to-slate-800",
    bgGradient: "from-blue-50 via-indigo-50 to-slate-50/50",
    borderHover: "hover:border-blue-300",
    badgeBg: "bg-blue-100 text-blue-700",
    items: [
      { id: "data_import", icon: HardDrive, label: "Importação de Dados", color: "from-blue-600 to-indigo-700" },
    ],
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlModule = searchParams.get("module");
  const urlTab = searchParams.get("tab");

  const activeTab = urlTab || null;
  const activeModule = urlModule || (urlTab ? tabToModuleMap[urlTab] || null : null);

  const isItemAccessible = (item: any, userObj: any) => {
    if (item.hideIf) return false;
    if (item.requiresRole === "admin" && userObj?.role !== "admin") return false;
    if (item.requiresPermission) {
      const userPerms = userObj?.permissions || [];
      const hasPerm =
        userObj?.role === "admin" ||
        userPerms.includes(item.requiresPermission) ||
        userPerms.includes(item.requiresPermission.toLowerCase());
      if (!hasPerm) return false;
    }
    return true;
  };

  const accessibleModules = MODULES.filter((mod) =>
    mod.items.some((item) => isItemAccessible(item, user))
  );

  const currentModuleObj = MODULES.find((m) => m.id === activeModule);
  const accessibleCurrentModuleItems = currentModuleObj
    ? currentModuleObj.items.filter((item) => isItemAccessible(item, user))
    : [];

  const selectModule = (moduleId: string) => {
    const mod = MODULES.find((m) => m.id === moduleId);
    if (!mod) return;
    const validItems = mod.items.filter((item) => isItemAccessible(item, user));
    if (validItems.length === 0) return;
    const defaultTab = validItems[0].id;
    setSearchParams({ module: moduleId, tab: defaultTab });
  };

  const setActiveTab = (tab: string) => {
    setIsMobileMenuOpen(false);
    const targetModule = tabToModuleMap[tab] || activeModule || "core";
    setSearchParams({ module: targetModule, tab });
  };

  const goBackToModules = () => {
    setIsMobileMenuOpen(false);
    setSearchParams({});
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
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(activeTab ? [activeTab] : []));

  useEffect(() => {
    if (activeTab) {
      setVisitedTabs((prev) => {
        if (!prev.has(activeTab)) {
          const next = new Set(prev);
          next.add(activeTab);
          return next;
        }
        return prev;
      });
    }
  }, [activeTab]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    fetchVehiclesWithPending();
    fetchNotificationCount();

    // Background audit specifically invoked when admin is online
    runSilentAudit((user as any)?.company_id);
    const intervalId = setInterval(
      () => {
        runSilentAudit((user as any)?.company_id);
        fetchNotificationCount();
      },
      60 * 60 * 1000,
    ); // 60 minutes

    
  return () => clearInterval(intervalId);
  }, [(user as any)?.company_id]);

  const fetchNotificationCount = async () => {
    if (!(user as any)?.company_id) return;
    try {
      const { data: issuesData } = await supabase.from("checklist_issues").select("id, vehicle_id, trailer_id, item_title, status, resolved_by").eq("company_id", (user as any)?.company_id)
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

      const { data: submissions } = await supabase.from("checklist_submissions").select("vehicle_id, odometer").eq("company_id", (user as any)?.company_id)
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
        .eq("company_id", (user as any)?.company_id)
        .maybeSingle();

      if (!settings && (user as any)?.company_id) {
         const { data: newSettings } = await supabase.from("app_settings").insert({
           company_id: user.company_id,
           system_type: 'logistics',
           initial_value: 1000,
           require_external_photos: false,
           require_fuel_receipt_photo: false,
           require_location: false,
           km_limit_enabled: false,
           max_km_limit: 500,
           hours_limit_enabled: false,
           max_hours: 100,
           manual_checklist_activate: true,
           activate_telemetry_engine_all_the_time: false
         }).select().single();
         settings = newSettings;
      }

      if (settings) setAppSettings(settings);

      if ((user as any)?.company_id) {
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
          checklist_submissions(             status,             details,             created_at           ),
          maintenance_records(
            status,
            priority
          )
        `,
        )
        .eq("company_id", (user as any)?.company_id)         .limit(5);

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
      id: "checkdrive_ai",
      icon: Bot,
      label: "🤖 CheckDrive AI",
      color: "from-blue-600 via-indigo-600 to-purple-600",
    },
    {
      id: "tracking",
      icon: Navigation,
      label: "Monitoramento",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "my_vehicles",
      icon: Truck,
      label: "Meus Veículos",
      color: "from-teal-500 to-green-500",
    },
    {
      id: "my_drivers",
      icon: Users,
      label: "Meus Motoristas",
      color: "from-amber-500 to-yellow-500",
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
    ...(user?.role === "admin" || (user as any)?.permissions?.includes("AUDIT_VIEW") || (user as any)?.permissions?.includes("audit_view")
      ? [
          {
            id: "audit",
            icon: History,
            label: "Auditoria Alterações Sistema",
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
      id: "branches",
      icon: Building2,
      label: "Filiais",
      color: "from-blue-600 to-cyan-500",
    },
    {
      id: "adm_users",
      icon: Users,
      label: "Usuários Admin",
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "insurances",
      icon: Shield,
      label: "Seguradoras",
      color: "from-indigo-500 to-blue-500",
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
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            {companyData?.name?.charAt(0) || 'C'}
          </div>
          <span className="font-bold text-gray-900 truncate max-w-[200px]">{companyData?.name || 'Painel'}</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Spacer for sidebar to avoid layout shift */}
      <div className="hidden md:block w-20 flex-shrink-0 print:hidden" />

      {/* Sidebar */}
      <aside className={`group absolute md:absolute top-[73px] md:top-0 left-0 bottom-0 md:w-20 md:hover:w-72 flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col print:hidden transition-all duration-300 z-50 overflow-x-hidden overflow-y-auto md:overflow-y-hidden ${isMobileMenuOpen ? 'w-full translate-x-0' : 'w-full -translate-x-full md:translate-x-0'}`}>
        {/* Company Logo & Name */}
        {companyData && (
          <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-100 overflow-hidden">
            <div className="min-w-[40px] w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
              <img src={companyData.logo_url || 'https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg'} alt={companyData.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h2 className="text-sm font-bold text-gray-900 truncate">{companyData.name}</h2>
              <p className="text-xs text-gray-500 font-medium tracking-wide">PAINEL ADMINISTRATIVO</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden md:hide-scrollbar">
          {!activeModule ? (
            <div className="space-y-2">
              <button
                onClick={goBackToModules}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-bold text-sm"
              >
                <Grid size={20} className="min-w-[20px]" />
                <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  Central de Módulos
                </span>
              </button>
              <div className="pt-2 px-2">
                <p className="text-[11px] font-medium text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 leading-relaxed">
                  Selecione um módulo na central para acessar as telas.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Back to Modules button */}
              <button
                onClick={goBackToModules}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-bold border border-slate-200 shadow-sm"
              >
                <ArrowLeft size={16} className="text-slate-600 min-w-[16px]" />
                <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap truncate">
                  Voltar aos Módulos
                </span>
              </button>

              {/* Active Module Header */}
              {currentModuleObj && (
                <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                  <currentModuleObj.icon size={18} className="text-blue-600 min-w-[18px]" />
                  <span className="text-xs font-black uppercase text-blue-900 tracking-wider truncate opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    {currentModuleObj.title}
                  </span>
                </div>
              )}

              {/* Module Items */}
              <div className="pt-1 space-y-1">
                {accessibleCurrentModuleItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group/item ${
                      activeTab === item.id
                        ? `bg-gradient-to-r ${item.color} text-white shadow-md font-bold`
                        : "text-gray-600 hover:bg-gray-100 font-semibold"
                    }`}
                  >
                    <div className="min-w-[20px] flex items-center justify-center relative">
                      <item.icon
                        size={20}
                        className={
                          activeTab === item.id
                            ? "text-white"
                            : "text-gray-400 group-hover/item:text-gray-600"
                        }
                      />
                    </div>
                    <span className="text-sm flex-1 text-left opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      {item.label}
                    </span>
                    {activeTab === item.id && (
                      <ChevronRight
                        size={16}
                        className="text-white/80 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 min-w-[16px]"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
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
          <div className="flex items-center gap-3 lg:gap-4 flex-1">
            {activeModule && (
              <button
                onClick={goBackToModules}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-sm flex-shrink-0"
              >
                <Grid size={16} className="text-blue-600" />
                <span className="hidden sm:inline">Módulos</span>
              </button>
            )}
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
          className={`flex-1 p-4 md:p-8 ${activeTab === "notifications" ? "flex flex-col overflow-hidden h-full" : "space-y-6"}`}
        >
          {!activeModule ? (
            /* Tela de Módulos (Central de Navegação) */
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-12">
              {/* Header section */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                    <Grid size={14} />
                    Central de Módulos
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                    Bem-vindo ao CheckDrive, {user?.name?.split(" ")[0] || "Usuário"}
                  </h1>
                  <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                    Selecione um dos módulos organizados abaixo para acessar as funcionalidades do sistema de gestão da frota.
                  </p>
                </div>
              </div>

              {/* Grid of Modules */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accessibleModules.map((mod) => {
                  const modAccessibleItems = mod.items.filter((i) => isItemAccessible(i, user));
                  return (
                    <motion.div
                      key={mod.id}
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => selectModule(mod.id)}
                      className={`group cursor-pointer rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${mod.borderHover}`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                            <mod.icon size={24} />
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${mod.badgeBg}`}>
                            {modAccessibleItems.length} {modAccessibleItems.length === 1 ? 'tela' : 'telas'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {mod.title}
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">({mod.subtitle})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>

                        {/* List of screens/pages inside this module */}
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {modAccessibleItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60"
                            >
                              <item.icon size={12} className="text-slate-400" />
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>Acessar Módulo</span>
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab Content */
            <div className="w-full h-full relative">
            <div className={activeTab === "checkdrive_ai" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("checkdrive_ai") && <CheckDriveAiTab />}
            </div>
            <div className={activeTab === "data_import" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("data_import") && (
                <ImportModuleView companyId={user?.company_id || "2988d70f-3c53-4563-a442-67c20ea40b7a"} />
              )}
            </div>
            <div className={activeTab === "overview" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("overview") && <OverviewTab setActiveTab={setActiveTab} appSettings={appSettings} />}
            </div>
            <div className={activeTab === "notifications" ? "flex-1 flex flex-col overflow-hidden h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("notifications") && <NotificationsTab />}
            </div>
            <div className={activeTab === "tracking" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("tracking") && <TrackingTab />}
            </div>
            <div className={activeTab === "reports" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("reports") && <ReportsTab />}
            </div>
            <div className={activeTab === "branches" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("branches") && <BranchesTab />}
            </div>
            <div className={activeTab === "adm_users" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("adm_users") && <AdmUsersTab />}
            </div>
            <div className={activeTab === "insurances" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("insurances") && <InsurancesTab />}
            </div>
            <div className={activeTab === "drivers" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("drivers") && <DriversTab />}
            </div>
            <div className={activeTab === "vehicles" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("vehicles") && <VehiclesTab />}
            </div>
            <div className={activeTab === "my_vehicles" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("my_vehicles") && <MyVehicles />}
            </div>
            <div className={activeTab === "my_drivers" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("my_drivers") && <MyDrivers />}
            </div>
            <div className={activeTab === "routes" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("routes") && <RoutesTab />}
            </div>
            <div className={activeTab === "checklist_setup" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("checklist_setup") && <ChecklistSetupTab />}
            </div>
            <div className={activeTab === "baits" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("baits") && <BaitsTab />}
            </div>
            <div className={activeTab === "ranking" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("ranking") && <RankingTab appSettings={appSettings} />}
            </div>
            <div className={activeTab === "checklists" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("checklists") && (
                <ChecklistsHistoryTab
                  onViewDetails={(sub) => setSelectedSub(sub)}
                />
              )}
            </div>
            <div className={activeTab === "maintenance" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("maintenance") && <MaintenanceTab />}
            </div>
            <div className={activeTab === "infractions" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("infractions") && <InfractionsTab />}
            </div>
            <div className={activeTab === "inventory" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("inventory") && <InventoryTab />}
            </div>
            <div className={activeTab === "abastecimentos" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("abastecimentos") && <FuelTab />}
            </div>
            <div className={activeTab === "averages" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("averages") && <AveragesTab />}
            </div>
            <div className={activeTab === "schedules" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("schedules") && (
                <SchedulesTab
                  onViewChecklist={async (subId) => {
                    const { data } = await supabase.from("checklist_submissions").select("*, profiles(full_name), vehicles(plate)").eq("company_id", user?.company_id)
                      .eq("id", subId)
                      .single();
                    if (data) setSelectedSub(data);
                  }}
                />
              )}
            </div>
            <div className={activeTab === "audit" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("audit") && (user?.role === "admin" || (user as any)?.permissions?.includes("AUDIT_VIEW") || (user as any)?.permissions?.includes("audit_view")) && <AuditTab appSettings={appSettings} />}
            </div>
            <div className={activeTab === "feedback" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("feedback") && user?.role === "admin" && <FeedbackTab />}
            </div>
            <div className={activeTab === "database" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("database") && <DatabaseTab />}
            </div>
            <div className={activeTab === "alerts" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("alerts") && <AlertsTab />}
            </div>
            <div className={activeTab === "settings" ? "block h-full animate-fadeIn" : "hidden"}>
              {visitedTabs.has("settings") && user?.role === "admin" && (
                <SettingsTab
                  appSettings={appSettings}
                  setAppSettings={setAppSettings}
                  fetchData={fetchData}
                />
              )}
            </div>
          </div>
        )}
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
