import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  Truck,
  Users,
  Building2,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Fuel,
  Package,
  TrendingUp,
  Award,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportsBiViewProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

export default function ReportsBiView({
  startDate,
  endDate,
  onDateChange,
}: ReportsBiViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]);

  // KPI States
  const [kpis, setKpis] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalBranches: 0,
    checklistsCompleted: 0,
    openIssues: 0,
    resolvedIssues: 0,
    resolvedCost: 0,
    fuelLiters: 0,
    fuelCost: 0,
    totalInventoryItems: 0,
    lowStockItemsCount: 0,
  });

  // Chart States
  const [checklistsByDateData, setChecklistsByDateData] = useState<any[]>([]);
  const [issuesByStatusData, setIssuesByStatusData] = useState<any[]>([]);
  const [fuelByDateData, setFuelByDateData] = useState<any[]>([]);
  const [vehiclesByBranchData, setVehiclesByBranchData] = useState<any[]>([]);
  const [driversByBranchData, setDriversByBranchData] = useState<any[]>([]);
  const [lowStockData, setLowStockData] = useState<any[]>([]);

  // Ranking States
  const [topDrivers, setTopDrivers] = useState<any[]>([]);
  const [bottomDrivers, setBottomDrivers] = useState<any[]>([]);

  // Executive Alerts States
  const [criticalIssues, setCriticalIssues] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [autoAlerts, setAutoAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchBranches();
  }, [user?.company_id]);

  useEffect(() => {
    fetchBiData();
  }, [user?.company_id, startDate, endDate, selectedBranchId]);

  const fetchBranches = async () => {
    if (!user?.company_id) return;
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("company_id", user.company_id)
        .order("name");
      setBranches(data || []);
    } catch (err) {
      console.warn("Could not fetch branches", err);
    }
  };

  const fetchBiData = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const companyId = user.company_id;

      // 1. Fetch Fleet Overview (Vehicles, Drivers, Branches)
      const [vRes, dRes, bRes, perfRes] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, plate, model, active, branch_id")
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select(
            "id, full_name, active, branch_id, role, participates_in_ranking",
          )
          .eq("company_id", companyId)
          .eq("role", "driver"),
        supabase.from("branches").select("id, name").eq("company_id", companyId),
        supabase.from("driver_performance").select("driver_id, score"),
      ]);

      const perfMap: Record<string, number> = {};
      (perfRes.data || []).forEach((p: any) => {
        if (p.driver_id) perfMap[p.driver_id] = p.score;
      });

      let allVehicles = vRes.data || [];
      let allDrivers = (dRes.data || []).map((d: any) => ({
        ...d,
        driver_performance: { score: perfMap[d.id] ?? 0 },
      }));
      const allBranchesList = bRes.data || [];

      // Filter by selected branch if set
      if (selectedBranchId !== "all") {
        allVehicles = allVehicles.filter(
          (v) => v.branch_id === selectedBranchId,
        );
        allDrivers = allDrivers.filter((d) => d.branch_id === selectedBranchId);
      }

      const activeV = allVehicles.filter((v) => v.active !== false).length;
      const activeD = allDrivers.filter((d) => d.active !== false).length;

      // 2. Vehicles per Branch & Drivers per Branch Data
      const branchMap: Record<string, string> = {};
      allBranchesList.forEach((b) => {
        branchMap[b.id] = b.name;
      });

      const vByBranchCount: Record<string, number> = {};
      const dByBranchCount: Record<string, number> = {};

      allVehicles.forEach((v) => {
        const bName = branchMap[v.branch_id] || "Sem Filial";
        vByBranchCount[bName] = (vByBranchCount[bName] || 0) + 1;
      });

      allDrivers.forEach((d) => {
        const bName = branchMap[d.branch_id] || "Sem Filial";
        dByBranchCount[bName] = (dByBranchCount[bName] || 0) + 1;
      });

      const formattedVBranch = Object.entries(vByBranchCount).map(
        ([name, count]) => ({ name, quantidade: count }),
      );
      const formattedDBranch = Object.entries(dByBranchCount).map(
        ([name, count]) => ({ name, quantidade: count }),
      );

      setVehiclesByBranchData(formattedVBranch);
      setDriversByBranchData(formattedDBranch);

      // 3. Checklists Submissions in Date Range
      const startIso = `${startDate}T00:00:00Z`;
      const endIso = `${endDate}T23:59:59Z`;

      let checklistsQuery = supabase
        .from("checklist_submissions")
        .select("id, type, created_at, details, vehicle_id")
        .eq("company_id", companyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: true });

      const { data: checklistsData } = await checklistsQuery;
      const totalChecklists = (checklistsData || []).length;

      // Group checklists by Date
      const dateChecklistMap: Record<string, number> = {};
      (checklistsData || []).forEach((c) => {
        const dateStr = format(parseISO(c.created_at), "dd/MM");
        dateChecklistMap[dateStr] = (dateChecklistMap[dateStr] || 0) + 1;
      });

      const formattedChecklistTrend = Object.entries(dateChecklistMap).map(
        ([date, count]) => ({ date, checklists: count }),
      );
      setChecklistsByDateData(formattedChecklistTrend);

      // 4. Issues & Maintenance
      let rawIssues: any[] | null = null;
      const { data: mainIssues, error: issuesErr } = await supabase
        .from("checklist_issues")
        .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
        .eq("company_id", companyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (issuesErr || !mainIssues) {
        // Fallback without joins
        const { data: fallbackIssues } = await supabase
          .from("checklist_issues")
          .select("*")
          .eq("company_id", companyId)
          .gte("created_at", startIso)
          .lte("created_at", endIso);
        rawIssues = fallbackIssues || [];
      } else {
        rawIssues = mainIssues;
      }
      let issuesList = rawIssues || [];

      if (selectedBranchId !== "all") {
        issuesList = issuesList.filter(
          (i) =>
            i.vehicles?.branch_id === selectedBranchId ||
            i.trailers?.branch_id === selectedBranchId,
        );
      }

      // Compute Issue Status Counts
      let pendingCount = 0;
      let waitingCount = 0;
      let resolvedCount = 0;
      let totalResolvedCost = 0;

      issuesList.forEach((iss) => {
        let status = iss.status;
        const notesStr = String(iss.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!iss.resolved_by ||
            notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }

        if (status === "resolved") {
          resolvedCount++;
          totalResolvedCost += Number(iss.resolution_value) || 0;
        } else if (status === "waiting") {
          waitingCount++;
        } else {
          pendingCount++;
        }
      });

      setIssuesByStatusData([
        { name: "Pendentes", valor: pendingCount, color: "#f43f5e" },
        { name: "Aguardando Oficina", valor: waitingCount, color: "#f59e0b" },
        { name: "Resolvidos", valor: resolvedCount, color: "#10b981" },
      ]);

      const openIssuesTotal = pendingCount + waitingCount;

      // Critical Issues List
      const openIssuesList = issuesList.filter(
        (i) => i.status === "pending" || i.status === "waiting",
      );
      setCriticalIssues(openIssuesList.slice(0, 5));

      // 5. Fuelings (Submissions with type 'fuel' or 'Abastecimento')
      const fuelSubmissions = (checklistsData || []).filter(
        (c) => c.type === "fuel" || c.type === "Abastecimento",
      );

      let totalFuelLiters = 0;
      let totalFuelCost = 0;
      const fuelByDateMap: Record<
        string,
        { litros: number; valor: number }
      > = {};

      fuelSubmissions.forEach((sub) => {
        let liters = 0;
        let value = 0;
        try {
          const details =
            typeof sub.details === "string"
              ? JSON.parse(sub.details)
              : sub.details || {};
          liters = Number(details.liters || details.litros) || 0;
          value = Number(details.total_value || details.valor_total) || 0;
        } catch (e) {
          console.error("Error parsing fuel details", e);
        }

        totalFuelLiters += liters;
        totalFuelCost += value;

        const dateStr = format(parseISO(sub.created_at), "dd/MM");
        if (!fuelByDateMap[dateStr]) {
          fuelByDateMap[dateStr] = { litros: 0, valor: 0 };
        }
        fuelByDateMap[dateStr].litros += liters;
        fuelByDateMap[dateStr].valor += value;
      });

      const formattedFuelTrend = Object.entries(fuelByDateMap).map(
        ([date, data]) => ({
          date,
          litros: Math.round(data.litros),
          valor: Math.round(data.valor),
        }),
      );
      setFuelByDateData(formattedFuelTrend);

      // 6. Inventory Items
      const { data: inventoryItems } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("company_id", companyId);

      const itemsList = inventoryItems || [];
      const lowStockList = itemsList.filter(
        (i) => Number(i.quantity) <= Number(i.min_quantity || 0),
      );

      setLowStockData(
        lowStockList.map((item) => ({
          name: item.name,
          atual: Number(item.quantity) || 0,
          minimo: Number(item.min_quantity) || 0,
        })),
      );
      setLowStockAlerts(lowStockList.slice(0, 5));

      // 7. Auto Alerts
      const { data: alertsRes } = await supabase
        .from("auto_alerts")
        .select("*, vehicles(plate)")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("created_at", { ascending: false });

      setAutoAlerts((alertsRes || []).slice(0, 5));

      // 8. Driver Ranking Scoring
      const rankedDrivers = allDrivers
        .filter((d) => d.participates_in_ranking !== false)
        .map((d) => {
          const perf = d.driver_performance as any;
          const score = Array.isArray(perf)
            ? perf[0]?.score ?? 0
            : perf?.score ?? 0;
          return {
            id: d.id,
            name: d.full_name,
            score,
            branchName: branchMap[d.branch_id] || "Sem Filial",
          };
        })
        .sort((a, b) => b.score - a.score);

      setTopDrivers(rankedDrivers.slice(0, 5));
      setBottomDrivers([...rankedDrivers].reverse().slice(0, 5));

      // Set KPI Summary State
      setKpis({
        totalVehicles: allVehicles.length,
        activeVehicles: activeV,
        totalDrivers: allDrivers.length,
        activeDrivers: activeD,
        totalBranches: allBranchesList.length,
        checklistsCompleted: totalChecklists,
        openIssues: openIssuesTotal,
        resolvedIssues: resolvedCount,
        resolvedCost: totalResolvedCost,
        fuelLiters: Math.round(totalFuelLiters),
        fuelCost: totalFuelCost,
        totalInventoryItems: itemsList.length,
        lowStockItemsCount: lowStockList.length,
      });
    } catch (err) {
      console.error("Error fetching BI Data", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar for BI */}
      <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-800 tracking-tight">
              Business Intelligence & Visão Executiva
            </h2>
            <p className="text-xs font-semibold text-gray-500">
              Indicadores consolidados, análises gráficas e saúde operacional
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold text-gray-700">
            <Building2 size={14} className="text-gray-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent outline-none cursor-pointer pr-1"
            >
              <option value="all">Todas as Filiais</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <span className="text-xs font-black text-gray-400">até</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          <button
            onClick={fetchBiData}
            disabled={loading}
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Atualizando..." : "Atualizar"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Veículos */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Frota de Veículos
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Truck size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.totalVehicles}
            </span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {kpis.activeVehicles} Ativos
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Veículos cadastrados no sistema
          </p>
        </div>

        {/* Total Motoristas */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Motoristas Cadastrados
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.totalDrivers}
            </span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {kpis.activeDrivers} Ativos
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Equipe de condutores operacionais
          </p>
        </div>

        {/* Checklists Realizados */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Checklists Realizados
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.checklistsCompleted}
            </span>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight size={12} /> No período
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Inspeções de pátio, início e fim
          </p>
        </div>

        {/* Pendências Abertas */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Pendências Abertas
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">
              {kpis.openIssues}
            </span>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Aguardando Reparo
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Defeitos pendentes e na oficina
          </p>
        </div>

        {/* Pendências Resolvidas */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Pendências Resolvidas
            </span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.resolvedIssues}
            </span>
            <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              R$ {kpis.resolvedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Manutenções concluídas no período
          </p>
        </div>

        {/* Abastecimentos */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Abastecimentos
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Fuel size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.fuelLiters.toLocaleString("pt-BR")} <span className="text-xs font-extrabold text-gray-500">L</span>
            </span>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              R$ {kpis.fuelCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Combustível consumido e custo
          </p>
        </div>

        {/* Itens em Estoque */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Itens em Estoque
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Package size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.totalInventoryItems}
            </span>
            {kpis.lowStockItemsCount > 0 ? (
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {kpis.lowStockItemsCount} Estoque Baixo
              </span>
            ) : (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Estoque Normal
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Inventário de peças e insumos
          </p>
        </div>

        {/* Filiais Ativas */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Unidades / Filiais
            </span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <Building2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">
              {kpis.totalBranches}
            </span>
            <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
              Operacionais
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500">
            Unidades descentralizadas da empresa
          </p>
        </div>
      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklists por Período */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Checklists Realizados no Período
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Evolução diária de inspeções concluídas
              </p>
            </div>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {kpis.checklistsCompleted} Total
            </span>
          </div>
          <div className="h-64 w-full">
            {checklistsByDateData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={checklistsByDateData}>
                  <defs>
                    <linearGradient id="colorChecklists" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="checklists" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorChecklists)" name="Checklists" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum checklist registrado no período
              </div>
            )}
          </div>
        </div>

        {/* Pendências por Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Distribuição de Pendências por Status
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Proporção de defeitos pendentes, na oficina e resolvidos
              </p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {issuesByStatusData.some((d) => d.valor > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issuesByStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="valor"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {issuesByStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs font-bold text-gray-400">
                Nenhuma pendência registrada no período
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abastecimento por Período */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Consumo de Combustível e Custos
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Volume em Litros e Gasto Total (R$) por data
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            {fuelByDateData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelByDateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar yAxisId="left" dataKey="litros" fill="#f59e0b" name="Litros (L)" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="valor" fill="#10b981" name="Valor Total (R$)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum abastecimento registrado no período
              </div>
            )}
          </div>
        </div>

        {/* Distribuição por Filial (Veículos & Motoristas) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                Distribuição da Frota por Filial
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Quantidade de veículos alocados em cada unidade
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            {vehiclesByBranchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehiclesByBranchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="quantidade" fill="#3b82f6" name="Veículos" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhuma filial vinculada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estoque Abaixo do Mínimo & Driver Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estoque Crítico */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="text-rose-600" size={16} /> Estoque Abaixo do Mínimo
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Itens com quantidade atual inferior ou igual à quantidade mínima
              </p>
            </div>
            <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
              {lowStockData.length} Alertas
            </span>
          </div>

          {lowStockData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lowStockData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="atual" fill="#f43f5e" name="Qtd Atual" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="minimo" fill="#94a3b8" name="Qtd Mínima" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center p-6 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Estoque Totalmente Regular</p>
                <p className="text-[11px] font-medium text-emerald-600 mt-0.5">Nenhum item está abaixo do limite mínimo cadastrado.</p>
              </div>
            )}
        </div>

        {/* Ranking de Desempenho dos Motoristas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Award className="text-amber-500" size={16} /> Top Desempenho dos Motoristas
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Classificação baseada em pontuação do ranking
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {topDrivers.length > 0 ? (
              topDrivers.map((driver, index) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-white hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        index === 0
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                          ? "bg-amber-800/10 text-amber-900"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}º
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-gray-800">
                        {driver.name}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400">
                        {driver.branchName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-600">
                      {driver.score} pts
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs font-bold text-gray-400">
                Nenhum motorista pontuado no ranking
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive Alerts Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pendências Críticas */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-black uppercase text-rose-600 flex items-center gap-1.5">
              <ShieldAlert size={15} /> Pendências Críticas
            </span>
            <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
              {criticalIssues.length} Abertas
            </span>
          </div>

          <div className="space-y-2">
            {criticalIssues.length > 0 ? (
              criticalIssues.map((iss) => (
                <div key={iss.id} className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-100/60 text-xs">
                  <p className="font-extrabold text-gray-800">{iss.item_title}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mt-1">
                    <span>Placa: {iss.vehicles?.plate || iss.trailers?.plate || "S/N"}</span>
                    <span>{format(parseISO(iss.created_at), "dd/MM/yyyy")}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 font-bold text-center py-4">Sem pendências críticas em aberto</p>
            )}
          </div>
        </div>

        {/* Resumo Reposição de Estoque */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-black uppercase text-amber-600 flex items-center gap-1.5">
              <Package size={15} /> Reposição Urgente
            </span>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              {lowStockAlerts.length} Peças
            </span>
          </div>

          <div className="space-y-2">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((item) => (
                <div key={item.id} className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-100/60 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-extrabold text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-500 font-semibold">Min: {item.min_quantity}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 font-black rounded-lg text-xs">
                    Qtd: {item.quantity}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 font-bold text-center py-4">Nenhum item necessitando compra urgente</p>
            )}
          </div>
        </div>

        {/* Regras e Alertas Automáticos */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-black uppercase text-indigo-600 flex items-center gap-1.5">
              <AlertCircle size={15} /> Alertas de Manutenção
            </span>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {autoAlerts.length} Ativos
            </span>
          </div>

          <div className="space-y-2">
            {autoAlerts.length > 0 ? (
              autoAlerts.map((al) => (
                <div key={al.id} className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100/60 text-xs">
                  <p className="font-extrabold text-gray-800">{al.title}</p>
                  <p className="text-[10px] text-gray-500 font-semibold truncate mt-0.5">{al.description || "Alerta automático ativo"}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 font-bold text-center py-4">Nenhum alerta automático configurado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
