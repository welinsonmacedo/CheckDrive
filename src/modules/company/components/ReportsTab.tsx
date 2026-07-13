import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  FileText,
  CheckCircle2,
  Search,
  Calendar,
  ChevronRight,
  Truck,
  Printer,
  TrendingUp,
  Activity,
  Clock,
  User,
  MapPin,
  ListFilter,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import DefectPrintModal from "@/src/modules/company/components/DefectPrintModal";
import { usePersistentState } from "@/src/hooks/usePersistentState";
import PrintHeader from "./PrintHeader";


// Helper function to group resolved issues by OS (same resolution time and vehicle/trailer)
const groupResolvedIssues = (data: any[]) => {
  const groupedData: any[] = [];
  const resolvedGroups: { [key: string]: any } = {};

  data.forEach((item) => {
    if (item.status === "resolved" && item.resolved_at) {
      const vKey = item.vehicle_id || "none";
      const tKey = item.trailer_id || "none";
      const key = `${item.resolved_at}_${vKey}_${tKey}`;

      if (resolvedGroups[key]) {
        const exist = resolvedGroups[key];
        if (!exist.item_title.includes(item.item_title)) {
          exist.item_title = `${exist.item_title} + ${item.item_title}`;
        }
        if (item.description && !exist.description?.includes(item.description)) {
          exist.description = exist.description ? `${exist.description} | ${item.description}` : item.description;
        }
        exist.resolution_value = (Number(exist.resolution_value) || 0) + (Number(item.resolution_value) || 0);
      } else {
        resolvedGroups[key] = { ...item };
      }
    } else {
      groupedData.push(item);
    }
  });

  const finalData = [...groupedData, ...Object.values(resolvedGroups)];
  finalData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return finalData;
};

export default function ReportsTab() {
  const { user } = useAuth();

  const [activeReport, setActiveReport] = usePersistentState<
    "defects" | "pending_by_plate" | "mileage" | "history" | "purchases" | "schedules"
  >("reports_activeReport", "defects");

  // Date filters
  const [startDate, setStartDate] = usePersistentState(
    "reports_startDate",
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = usePersistentState(
    "reports_endDate",
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const [loading, setLoading] = useState(false);
  const [selectedDefectToPrint, setSelectedDefectToPrint] = useState<
    any | null
  >(null);

  const [printMode, setPrintMode] = useState<"all" | "pending" | "resolved">(
    "all",
  );

  // Defects Data
  const [defectsData, setDefectsData] = useState<any[]>([]);
  const [pendingByPlateData, setPendingByPlateData] = useState<any[]>([]);
  const [pendingByPlateSearchTerm, setPendingByPlateSearchTerm] = useState("");
  const [defectsStats, setDefectsStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    mostCommon: [] as any[],
  });

  // Mileage Data
  const [mileageData, setMileageData] = useState<any[]>([]);

  // History Data
  const [vehiclesAndTrailers, setVehiclesAndTrailers] = useState<any[]>([]);
  const [selectedHistoryEntityId, setSelectedHistoryEntityId] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Purchases Data
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [purchasesSearchTerm, setPurchasesSearchTerm] = useState("");
  const [purchasesFilterOrigin, setPurchasesFilterOrigin] = useState<
    "all" | "stock" | "maintenance"
  >("all");

  // Schedules Data
  const [schedulesData, setSchedulesData] = useState<any[]>([]);
  const [schedulesSearchTerm, setSchedulesSearchTerm] = useState("");

  const fetchHistoryEntities = async () => {
    try {
      const [{ data: vs }, { data: ts }] = await Promise.all([
        supabase.from("vehicles").select("id, plate").eq("company_id", user?.company_id).order("plate"),
        supabase.from("trailers").select("id, plate").eq("company_id", user?.company_id).order("plate"),
      ]);
      const combined = [
        ...(vs || []).map((v) => ({ ...v, type: "vehicle" })),
        ...(ts || []).map((t) => ({ ...t, type: "trailer" })),
      ];
      setVehiclesAndTrailers(combined);
    } catch (err) {
      console.warn("Could not load entities", err);
    }
  };

  const fetchHistoryReport = async (entityId: string) => {
    if (!entityId) return;
    setLoading(true);
    try {
      const entity = vehiclesAndTrailers.find((e) => e.id === entityId);
      if (!entity) {
        setLoading(false);
        return;
      }

      const column = entity.type === "vehicle" ? "vehicle_id" : "trailer_id";

      const { data, error } = await supabase.from("checklist_issues").select("*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name)")
        .eq("company_id", user?.company_id)
        .eq(column, entityId)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const filteredData = (data || []).map((d: any) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        
        // Re-classify issues that were resolved automatically as pending
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }

        return { ...d, status };
      });

      setHistoryData(groupResolvedIssues(filteredData));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasesReport = async () => {
    setLoading(true);
    try {
      // 1. Fetch from inventory_transactions
      const { data: stockTransactions, error: errStock } = await supabase.from("inventory_transactions").select(`*, inventory_items(name)`).eq("company_id", user?.company_id)
        .eq("type", "in")
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      if (errStock) throw errStock;

      
      // 2. Fetch from checklist_issues
      const { data: issuesData, error: errIssues } = await supabase.from("checklist_issues").select(`*, vehicles(plate), trailers(plate)`).eq("company_id", user?.company_id)
        .in("status", ["resolved", "waiting"])
        .gte("updated_at", `${startDate}T00:00:00Z`)
        .lte("updated_at", `${endDate}T23:59:59Z`);

      if (errIssues) throw errIssues;

      const combinedPurchases: any[] = [];

      // Process stock transactions
      (stockTransactions || []).forEach((t: any) => {
        combinedPurchases.push({
          id: `stock-${t.id}`,
          date: t.created_at,
          nf_number: t.nf_number || "S/N",
          origin: "stock",
          item_name: t.inventory_items?.name || t.item_id,
          quantity: t.quantity,
          unit_price: t.unit_price,
          total_price: t.total_price || t.quantity * t.unit_price,
          context: "Compra para Estoque",
        });
      });

      // Process issues
      (issuesData || []).forEach((i: any) => {
        const vehicleInfo =
          i.vehicles?.plate || i.trailers?.plate || "Sem Placa";
          
        let nfs = [];
        try {
          if (i.resolution_nfs) {
            nfs = typeof i.resolution_nfs === 'string' ? JSON.parse(i.resolution_nfs) : i.resolution_nfs;
          } else if (i.resolution_nf) {
            nfs = typeof i.resolution_nf === 'string' ? JSON.parse(i.resolution_nf) : i.resolution_nf;
          }
        } catch (e) {
          console.error("Error parsing NFs in report", e);
        }
        
        if (!Array.isArray(nfs)) nfs = [];

        nfs.forEach((nf: any) => {
          const items = Array.isArray(nf.items) ? nf.items : [];
          items.forEach((item: any, idx: number) => {
            combinedPurchases.push({
              id: `issue-${i.id}-${nf.nf_number || "sn"}-${item.name || idx}`,

              date: i.updated_at,
              nf_number: nf.nf_number || "S/N",
              origin: "maintenance",
              item_name: item.name,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total_price: (item.quantity || 1) * (item.unit_price || 0),
              context: `Solução: ${i.item_title} (${vehicleInfo})`,
            });
          });
        });
      });

      // Sort by date descending
      combinedPurchases.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setPurchasesData(combinedPurchases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulesReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("schedules").select(`
          id, start_at, end_at, requires_fueling,
          profiles(full_name),
          vehicles(plate),
          routes(origin, destination),
          start_check:checklist_submissions!schedules_start_checklist_id_fkey(odometer),
          end_check:checklist_submissions!schedules_end_checklist_id_fkey(odometer),
          fuel_check:checklist_submissions!schedules_fuel_checklist_id_fkey(type, details)
        `,
        )
        .gte("start_at", `${startDate}T00:00:00Z`)
        .lte("start_at", `${endDate}T23:59:59Z`)
        .order("start_at", { ascending: false });

      if (error) throw error;
      setSchedulesData(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport === "defects") {
      fetchDefectsReport();
    } else if (activeReport === "pending_by_plate") {
      fetchPendingByPlateReport();
    } else if (activeReport === "mileage") {
      fetchMileageReport();
    } else if (activeReport === "history") {
      fetchHistoryEntities();
    } else if (activeReport === "purchases") {
      fetchPurchasesReport();
    } else if (activeReport === "schedules") {
      fetchSchedulesReport();
    }
  }, [activeReport, startDate, endDate]);

  useEffect(() => {
    if (
      activeReport === "history" &&
      selectedHistoryEntityId &&
      vehiclesAndTrailers.length > 0
    ) {
      fetchHistoryReport(selectedHistoryEntityId);
    }
  }, [
    selectedHistoryEntityId,
    activeReport,
    startDate,
    endDate,
    vehiclesAndTrailers,
  ]);

  const fetchMileageReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("checklist_submissions").select("id, odometer, type, created_at, trailer_id, profiles(full_name), vehicles(plate)")
        .eq("company_id", user?.company_id)
        .not("odometer", "is", null)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch trailers separately safely
      const { data: trailersReq } = await supabase.from("trailers").select("id, plate").eq("company_id", user?.company_id);
      const trailersMap = new Map(
        (trailersReq || []).map((t: any) => [t.id, t.plate]),
      );

      // Calculate mileage per vehicle/trailer and driver combination
      const mileageStats: Record<string, any> = {};

      if (data) {
        // Group submissions by vehicle to compute correct deltas sequentially
        const subsByVehicle: Record<string, any[]> = {};
        data.forEach((sub: any) => {
          if (!sub.vehicles?.plate) return;
          if (!subsByVehicle[sub.vehicles.plate])
            subsByVehicle[sub.vehicles.plate] = [];
          subsByVehicle[sub.vehicles.plate].push(sub);
        });

        Object.values(subsByVehicle).forEach((vehicleSubs) => {
          let prevOdo = vehicleSubs[0].odometer;

          vehicleSubs.forEach((sub) => {
            if (!sub.profiles?.full_name || !sub.odometer) return;

            // Calculate diff since the last checklist for this same vehicle
            let diff = 0;
            if (sub.odometer >= prevOdo) {
              diff = sub.odometer - prevOdo;
            }
            prevOdo = sub.odometer;

            const vPlate = sub.vehicles.plate;
            const driverName = sub.profiles.full_name;

            // Credit diff to Vehicle
            const vKey = `V-${vPlate}-${driverName}`;
            if (!mileageStats[vKey]) {
              mileageStats[vKey] = {
                type: "Veículo",
                plate: vPlate,
                driverName,
                minOdometer: sub.odometer,
                maxOdometer: sub.odometer,
                submissionsCount: 0,
                distance: 0,
              };
            }
            mileageStats[vKey].submissionsCount += 1;
            if (sub.odometer < mileageStats[vKey].minOdometer)
              mileageStats[vKey].minOdometer = sub.odometer;
            if (sub.odometer > mileageStats[vKey].maxOdometer)
              mileageStats[vKey].maxOdometer = sub.odometer;
            mileageStats[vKey].distance += diff;

            // Credit diff to Trailer
            if (sub.trailer_id && trailersMap.has(sub.trailer_id)) {
              const tPlate = trailersMap.get(sub.trailer_id);
              const tKey = `T-${tPlate}-${driverName}`;
              if (!mileageStats[tKey]) {
                mileageStats[tKey] = {
                  type: "Reboque",
                  plate: tPlate,
                  driverName,
                  minOdometer: sub.odometer,
                  maxOdometer: sub.odometer,
                  submissionsCount: 0,
                  distance: 0,
                };
              }
              mileageStats[tKey].submissionsCount += 1;
              if (sub.odometer < mileageStats[tKey].minOdometer)
                mileageStats[tKey].minOdometer = sub.odometer;
              if (sub.odometer > mileageStats[tKey].maxOdometer)
                mileageStats[tKey].maxOdometer = sub.odometer;
              mileageStats[tKey].distance += diff;
            }
          });
        });
      }

      const results = Object.values(mileageStats).sort(
        (a: any, b: any) => b.distance - a.distance,
      );
      setMileageData(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  const fetchPendingByPlateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("checklist_issues").select("*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name)")
        .eq("company_id", user?.company_id)
        // NOTE: we could filter by date or not, but let's filter by the date range selected
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      if (error) throw error;

      // Only pending defects
      let mappedData = data.map((d: any) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }
        return { ...d, status };
      }).filter(d => d.status === "pending" || d.status === "waiting");

      // Group by plate
      const grouped: Record<string, any[]> = {};
      mappedData.forEach(d => {
        const plate = d.vehicles?.plate || d.trailers?.plate || "Sem Placa";
        if (!grouped[plate]) grouped[plate] = [];
        grouped[plate].push(d);
      });

      const groupedArray = Object.keys(grouped).map(plate => ({
        plate,
        issues: grouped[plate],
        count: grouped[plate].length
      })).sort((a, b) => b.count - a.count);

      setPendingByPlateData(groupedArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefectsReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("checklist_issues").select("*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name)")
        .eq("company_id", user?.company_id)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      if (error) throw error;

      let mappedData = data.map((d) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }
        return { ...d, status };
      });

      mappedData = groupResolvedIssues(mappedData);
      const stats = {
        total: mappedData.length,
        pending: mappedData.filter((d) => d.status === "pending").length,
        resolved: mappedData.filter((d) => d.status === "resolved").length,
        mostCommon: [] as any[],
      };

      const defectCounts: Record<string, number> = {};
      mappedData.forEach((d) => {
        defectCounts[d.item_title] = (defectCounts[d.item_title] || 0) + 1;
      });

      stats.mostCommon = Object.entries(defectCounts)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setDefectsStats(stats);
      setDefectsData(mappedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={selectedDefectToPrint ? "print:hidden" : ""}>
        {/* Modern Tabs and Date Selector controls */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-white p-4.5 rounded-2xl shadow-sm border border-gray-200/80 print:hidden">
          {/* Elegant Pill Tabs */}
          <div className="flex p-1 bg-gray-50/80 border border-gray-200/80 rounded-xl space-x-1 shrink-0 w-fit self-start xl:self-auto">
            <button
              onClick={() => setActiveReport("defects")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "defects"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <AlertTriangle size={14} className="stroke-[2.2]" />
              <span>Inspeção de Defeitos</span>
            </button>
            <button
              onClick={() => setActiveReport("pending_by_plate")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "pending_by_plate"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <AlertTriangle size={14} className="stroke-[2.2]" />
              <span>Pendentes por Placa</span>
            </button>


            <button
              onClick={() => setActiveReport("mileage")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "mileage"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Truck size={14} className="stroke-[2.2]" />
              <span>Relatório Quilometragem</span>
            </button>
            <button
              onClick={() => setActiveReport("history")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "history"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <FileText size={14} className="stroke-[2.2]" />
              <span>Histórico Veículo</span>
            </button>

            <button
              onClick={() => setActiveReport("purchases")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "purchases"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <TrendingUp size={14} className="stroke-[2.2]" />
              <span>Compras / NFs</span>
            </button>

            <button
              onClick={() => setActiveReport("schedules")}
              className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeReport === "schedules"
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200/40"
                  : "text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Calendar size={14} className="stroke-[2.2]" />
              <span>Escalas</span>
            </button>
          </div>

          {/* Date Picker Ribbon */}
          <div className="flex items-center gap-3.5 w-full xl:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-44">
              <Calendar
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={13}
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 pl-9.5 pr-4 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <span className="text-gray-400 font-extrabold text-[10px] uppercase tracking-wider">
              até
            </span>

            <div className="relative flex-1 sm:flex-initial sm:w-44">
              <Calendar
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={13}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 pl-9.5 pr-4 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <button
              onClick={() => {
                if (activeReport === "defects") fetchDefectsReport();
                else if (activeReport === "pending_by_plate") fetchPendingByPlateReport();
                else if (activeReport === "mileage") fetchMileageReport();
                else if (activeReport === "history")
                  fetchHistoryReport(selectedHistoryEntityId);
                else if (activeReport === "purchases") fetchPurchasesReport();
                else if (activeReport === "schedules") fetchSchedulesReport();
              }}
              className="h-10 w-10 bg-white border border-gray-200 hover:border-gray-300 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm text-gray-500 hover:text-indigo-600 shrink-0"
              title="Recarregar Relatório"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <PrintHeader />
        {/* Embedded Print Page Header */}
        <div className="hidden print:block mb-8 border-b border-gray-200 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">
                Relatórios Operacionais
              </p>
              <h1 className="text-xl font-black text-gray-800 tracking-tight">
                
                {activeReport === "defects" && "Inspeção de Defeitos e Sinistros"}
                {activeReport === "pending_by_plate" && "Defeitos Pendentes por Placa"}
                {activeReport === "mileage" && "Indicador de Distância e KM Rodado"}
                {activeReport === "history" && "Histórico do Veículo"}
                {activeReport === "purchases" && "Histórico de Manutenções"}
                {activeReport === "schedules" && "Histórico de Agendamentos"}

              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 leading-normal">
                {`Filtro: ${format(parseISO(startDate), "dd/MM/yyyy")} a ${format(parseISO(endDate), "dd/MM/yyyy")}`}
              </p>
              <p className="text-[8px] uppercase tracking-wider font-extrabold text-gray-400 mt-1">
                SGI - Sistema Integrado
              </p>
            </div>
          </div>
        </div>

        {/* Printing Action Buttons on top of content */}
        <div className="flex flex-wrap justify-end gap-2.5 print:hidden mt-4">
          
          {activeReport === "pending_by_plate" && (
            <button
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-2 h-9 px-4 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-indigo-100/50"
            >
              <Printer size={15} /> Imprimir Relatório
            </button>
          )}

          {activeReport === "defects" ? (
            <>
              <button
                onClick={() => {
                  setPrintMode("pending");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 h-9 px-3.5 bg-rose-50 border border-rose-100/60 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
              >
                <Printer size={13} /> Somente Pendentes
              </button>
              <button
                onClick={() => {
                  setPrintMode("resolved");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 h-9 px-3.5 bg-emerald-50 border border-emerald-100/60 hover:bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
              >
                <Printer size={13} /> Somente Resolvidos
              </button>
              <button
                onClick={() => {
                  setPrintMode("all");
                  setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 h-9 px-3.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
              >
                <Printer size={13} /> Imprimir Todos
              </button>
            </>
          ) : (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 h-9 px-4 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
            >
              <Printer size={13} /> Exportar PDF / Imprimir
            </button>
          )}
        </div>

        {/* Main dynamic loader */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 animate-pulse">
              Compilando dados consolidados...
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            
            {/* 1.5 REPORT TYPE: PENDING BY PLATE */}
            {activeReport === "pending_by_plate" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full max-w-sm relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por placa..."
                      value={pendingByPlateSearchTerm}
                      onChange={(e) => setPendingByPlateSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-gray-50/50 text-gray-500 font-bold text-[10px] uppercase tracking-wider print:bg-white print:text-black">
                        <tr>
                          <th className="px-5 py-4 border-b border-gray-200">Placa</th>
                          <th className="px-5 py-4 border-b border-gray-200">Quantidade de Defeitos</th>
                          <th className="px-5 py-4 border-b border-gray-200">Defeitos / Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 print:divide-black">
                        {pendingByPlateData
                          .filter((group) =>
                            group.plate.toLowerCase().includes(pendingByPlateSearchTerm.toLowerCase())
                          )
                          .map((group, idx) => (
                            <tr
                              key={group.plate}
                              className="hover:bg-gray-50/50 transition-colors print:break-inside-avoid"
                            >
                              <td className="px-5 py-4 font-bold text-gray-900 align-top">
                                {group.plate}
                              </td>
                              <td className="px-5 py-4 font-medium text-gray-600 align-top">
                                {group.count}
                              </td>
                              <td className="px-5 py-4 align-top">
                                <ul className="space-y-2 list-disc pl-4 text-xs text-gray-600">
                                  {group.issues.map((issue: any) => (
                                    <li key={issue.id}>
                                      <strong className="text-gray-900">{issue.item_title}</strong>: {issue.description || "Sem observações"}
                                      <span className="block text-[10px] text-gray-400 mt-0.5">
                                        Reportado em: {new Date(issue.created_at).toLocaleDateString("pt-BR")}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        {pendingByPlateData.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-5 py-12 text-center text-gray-400 font-medium bg-gray-50/50"
                            >
                              Nenhum defeito pendente encontrado no período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 1. REPORT TYPE: DEFECTS */}
            {activeReport === "defects" && (
              <div className="space-y-6">
                {/* Micro Stats Row for Defects */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-400/60" />
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={20} className="stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Ocorrências do Período
                      </p>
                      <p className="text-2xl font-black text-gray-800 tracking-tight mt-0.5">
                        {defectsStats.total}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-400/60" />
                    <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100/50 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert size={20} className="stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Pendentes de Resolução
                      </p>
                      <p className="text-2xl font-black text-rose-700 tracking-tight mt-0.5 animate-pulse">
                        {defectsStats.pending}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400/60" />
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={20} className="stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Casos Resolvidos
                      </p>
                      <p className="text-2xl font-black text-emerald-700 tracking-tight mt-0.5">
                        {defectsStats.resolved}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  {/* Top recurrence list on the left side */}
                  <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 self-stretch flex flex-col justify-between print:hidden">
                    <div>
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4.5 flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-500" />
                        Mais Frequentes
                      </h3>

                      <div className="space-y-4">
                        {defectsStats.mostCommon.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-6 text-center">
                            Nenhum caso catalogado.
                          </p>
                        ) : (
                          defectsStats.mostCommon.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                                <span className="truncate pr-2 font-medium">
                                  {item.title}
                                </span>
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono">
                                  {item.count}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${(item.count / defectsStats.total) * 100}%`,
                                  }}
                                  className="bg-indigo-500 h-full rounded-full"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] text-gray-450 font-bold leading-normal mt-6">
                      <div className="flex items-start gap-2">
                        <Info
                          size={14}
                          className="text-gray-400 shrink-0 mt-0.5"
                        />
                        <p>
                          O gráfico acima reúne as 5 anomalias mais recorrentes
                          reportadas por motoristas nos checklists.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Defects Tables Block - Expanded in Print */}
                  <div className="lg:col-span-3 space-y-6">
                    {/* A. Pending Defects List */}
                    <div
                      className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible ${printMode === "resolved" ? "print:hidden" : ""}`}
                    >
                      <div className="p-4 border-b border-gray-200/80 bg-rose-50/20 flex justify-between items-center">
                        <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle
                            size={15}
                            className="text-rose-500 animate-pulse"
                          />
                          Inspeções com Pendências Ativas
                        </h3>
                        <span className="text-[10px] bg-rose-50 border border-rose-100/60 text-rose-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {
                            defectsData.filter((d) => d.status === "pending")
                              .length
                          }{" "}
                          abertos
                        </span>
                      </div>

                      <div className="flex-1 overflow-auto max-h-[400px] print:max-h-none print:overflow-visible">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50/70 sticky top-0 border-b border-gray-200/80 z-10">
                            <tr>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Reportado Em
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Placa / Reboque
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Item do Checklist / Relato
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right print:hidden">
                                Ficha
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {defectsData.filter((d) => d.status === "pending")
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                                >
                                  Nenhuma pendência operacional pendente
                                </td>
                              </tr>
                            ) : (
                              defectsData
                                .filter((d) => d.status === "pending")
                                .map((d) => (
                                  <tr
                                    key={d.id}
                                    className="hover:bg-gray-50/30 transition-colors"
                                  >
                                    <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                      {format(
                                        parseISO(d.created_at),
                                        "dd/MM/yyyy",
                                        { locale: ptBR },
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-xs font-black text-gray-800 whitespace-nowrap font-mono">
                                      {d.vehicles?.plate
                                        ? d.trailers?.plate
                                          ? `${d.vehicles.plate} / ${d.trailers.plate}`
                                          : d.vehicles.plate
                                        : d.trailers?.plate || "-"}
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="text-xs font-bold text-gray-750">
                                        {d.item_title}
                                      </div>
                                      <div className="text-[11px] text-gray-450 mt-1 max-w-[450px] leading-relaxed break-words print:line-clamp-none">
                                        {d.description ||
                                          "Sem descrições adicionais registradas."}
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 text-right print:hidden whitespace-nowrap">
                                      <button
                                        onClick={() =>
                                          setSelectedDefectToPrint(d)
                                        }
                                        title="Imprimir Ficha de Reparo"
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-all inline-flex border border-transparent hover:border-indigo-100"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* B. Resolved Defects List */}
                    <div
                      className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible ${printMode === "pending" ? "print:hidden" : ""}`}
                    >
                      <div className="p-4 border-b border-gray-200/80 bg-emerald-50/15 flex justify-between items-center">
                        <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2
                            size={15}
                            className="text-emerald-500"
                          />
                          Histórico de Ocorrências Solucionadas
                        </h3>
                        <span className="text-[10px] bg-emerald-55 border border-emerald-150 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {
                            defectsData.filter((d) => d.status === "resolved")
                              .length
                          }{" "}
                          resolvidos
                        </span>
                      </div>

                      <div className="flex-1 overflow-auto max-h-[400px] print:max-h-none print:overflow-visible">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50/70 sticky top-0 border-b border-gray-200/80 z-10">
                            <tr>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Reportado Em
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Solucionado Em
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Placa / Reboque
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Item / Descrição
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right print:hidden">
                                Ficha
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {defectsData.filter((d) => d.status === "resolved")
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                                >
                                  Nenhum registro restaurado neste período
                                </td>
                              </tr>
                            ) : (
                              defectsData
                                .filter((d) => d.status === "resolved")
                                .map((d) => (
                                  <tr
                                    key={d.id}
                                    className="hover:bg-gray-50/30 transition-colors"
                                  >
                                    <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                      {format(
                                        parseISO(d.created_at),
                                        "dd/MM/yyyy",
                                        { locale: ptBR },
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-xs font-bold text-emerald-600 whitespace-nowrap">
                                      {d.resolved_at
                                        ? format(
                                            parseISO(d.resolved_at),
                                            "dd/MM/yyyy",
                                            { locale: ptBR },
                                          )
                                        : "-"}
                                    </td>
                                    <td className="px-5 py-4 text-xs font-black text-gray-800 whitespace-nowrap font-mono">
                                      {d.vehicles?.plate
                                        ? d.trailers?.plate
                                          ? `${d.vehicles.plate} / ${d.trailers.plate}`
                                          : d.vehicles.plate
                                        : d.trailers?.plate || "-"}
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="text-xs font-bold text-gray-750">
                                        {d.item_title}
                                      </div>
                                      <div className="text-[11px] text-gray-450 mt-1 max-w-[450px] leading-relaxed break-words print:line-clamp-none">
                                        {d.description ||
                                          "Sem descrições adicionais."}
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 text-right print:hidden whitespace-nowrap">
                                      <button
                                        onClick={() =>
                                          setSelectedDefectToPrint(d)
                                        }
                                        title="Imprimir Ficha de Reparo"
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-all inline-flex border border-transparent hover:border-indigo-100"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REPORT TYPE: MILEAGE */}
            {activeReport === "mileage" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden min-h-[400px] flex flex-col print:shadow-none print:border-none print:overflow-visible print:min-h-0 print:h-auto">
                  <div className="p-4 border-b border-gray-200/80 bg-gray-50/50">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      <Truck size={15} className="text-indigo-600" />
                      Acúmulo de Quilometragem por Equipamento (SGI)
                    </h3>
                  </div>

                  <div className="flex-1 overflow-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/75 sticky top-0 border-b border-gray-200/80 z-10">
                        <tr>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Operador / Motorista
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Identificação Equipamento
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Classificação
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Checklists
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Odômetro Inicial
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Odômetro Final
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                            Distância Total (KM)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mileageData.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                            >
                              Nenhum registro de odômetro computado no intervalo
                            </td>
                          </tr>
                        ) : (
                          mileageData.map((item: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50/30 transition-colors"
                            >
                              <td className="px-5 py-4 text-xs font-black text-gray-800 whitespace-nowrap">
                                {item.driverName}
                              </td>
                              <td className="px-5 py-4 text-xs font-black text-gray-800 whitespace-nowrap font-mono">
                                {item.plate}
                              </td>
                              <td className="px-5 py-4 text-xs whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                    item.type === "Veículo"
                                      ? "bg-blue-50 text-blue-700 border-blue-100"
                                      : "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100"
                                  }`}
                                >
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs font-bold text-gray-500 whitespace-nowrap">
                                {item.submissionsCount} checkouts
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-500 whitespace-nowrap">
                                {item.minOdometer.toLocaleString("pt-BR")} km
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-500 whitespace-nowrap">
                                {item.maxOdometer.toLocaleString("pt-BR")} km
                              </td>
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                <span className="text-xs font-black font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100/50">
                                  + {item.distance.toLocaleString("pt-BR")} KM
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {/* 4. REPORT TYPE: HISTORY */}
            {activeReport === "history" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                    Selecione o Veículo / Reboque
                  </label>
                  <select
                    className="w-full sm:w-1/2 p-2.5 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                    value={selectedHistoryEntityId}
                    onChange={(e) => setSelectedHistoryEntityId(e.target.value)}
                  >
                    <option value="">Selecione um equipamento...</option>
                    {vehiclesAndTrailers.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.plate} (
                        {entity.type === "vehicle" ? "Veículo" : "Reboque"})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedHistoryEntityId ? (
                  <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                    <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                        <Wrench size={15} className="text-indigo-600" />
                        Histórico de Manutenções
                      </h3>
                      <div className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg">
                        Total de Ocorrências: {historyData.length}
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto max-h-[600px] print:max-h-none print:overflow-visible">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/70 sticky top-0 border-b border-gray-200/80 z-10">
                          <tr>
                            <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Data
                            </th>
                            <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Status
                            </th>
                            <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Item Reportado
                            </th>
                            <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Custo (R$)
                            </th>
                            <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right print:hidden">
                              Ficha
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyData.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                              >
                                Nenhum registro de manutenção para este
                                equipamento
                              </td>
                            </tr>
                          ) : (
                            historyData.map((d: any) => (
                              <tr
                                key={d.id}
                                className="hover:bg-gray-50/30 transition-colors"
                              >
                                <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                  {format(
                                    parseISO(d.created_at),
                                    "dd/MM/yyyy",
                                    { locale: ptBR },
                                  )}
                                </td>
                                <td className="px-5 py-4 text-xs font-bold whitespace-nowrap">
                                  {d.status === "resolved" ? (
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                      Resolvido
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md animate-pulse">
                                      Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="text-xs font-bold text-gray-750">
                                    {d.item_title}
                                  </div>
                                  <div className="text-[11px] text-gray-450 mt-1 max-w-[450px] leading-relaxed break-words print:line-clamp-none">
                                    {d.description ||
                                      "Sem descrições adicionais registradas."}
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-xs font-mono font-bold text-gray-700 whitespace-nowrap">
                                  R${" "}
                                  {Number(
                                    d.resolution_value || 0,
                                  ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-5 py-4 text-right print:hidden whitespace-nowrap">
                                  <button
                                    onClick={() => setSelectedDefectToPrint(d)}
                                    title="Imprimir Ficha de Reparo"
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-all inline-flex border border-transparent hover:border-indigo-100"
                                  >
                                    <Printer size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-[10px] print:hidden">
                    Selecione um veículo para visualizar seu histórico.
                  </div>
                )}
              </div>
            )}
            {/* 5. REPORT TYPE: PURCHASES / NFs */}
            {activeReport === "purchases" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full relative max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Buscar por NF ou Item (ex: Pneu, Filtro)..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                      value={purchasesSearchTerm}
                      onChange={(e) => setPurchasesSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                      Origem:
                    </span>
                    <select
                      className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer"
                      value={purchasesFilterOrigin}
                      onChange={(e) =>
                        setPurchasesFilterOrigin(e.target.value as any)
                      }
                    >
                      <option value="all">Todas as Origens</option>
                      <option value="stock">Estoque</option>
                      <option value="maintenance">
                        Manutenção (Resolvidos)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                  <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={15} className="text-indigo-600" />
                      Extrato de Compras / NFs
                    </h3>
                    <div className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg">
                      {
                        purchasesData
                          .filter((p) =>
                            purchasesFilterOrigin === "all"
                              ? true
                              : p.origin === purchasesFilterOrigin,
                          )
                          .filter((p) => {
                            const s = purchasesSearchTerm.toLowerCase();
                            return (
                              String(p.nf_number).toLowerCase().includes(s) ||
                              String(p.item_name).toLowerCase().includes(s)
                            );
                          }).length
                      }{" "}
                      Registros
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto max-h-[600px] print:max-h-none print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/70 sticky top-0 border-b border-gray-200/80 z-10">
                        <tr>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Data
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            NF
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Item
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Qtd
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Vr Unit
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Subtotal
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Contexto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchasesData
                          .filter((p) =>
                            purchasesFilterOrigin === "all"
                              ? true
                              : p.origin === purchasesFilterOrigin,
                          )
                          .filter((p) => {
                            const s = purchasesSearchTerm.toLowerCase();
                            return (
                              String(p.nf_number).toLowerCase().includes(s) ||
                              String(p.item_name).toLowerCase().includes(s)
                            );
                          }).length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                            >
                              Nenhum registro encontrado
                            </td>
                          </tr>
                        ) : (
                          purchasesData
                            .filter((p) =>
                              purchasesFilterOrigin === "all"
                                ? true
                                : p.origin === purchasesFilterOrigin,
                            )
                            .filter((p) => {
                              const s = purchasesSearchTerm.toLowerCase();
                              return (
                                String(p.nf_number).toLowerCase().includes(s) ||
                                String(p.item_name).toLowerCase().includes(s)
                              );
                            })
                            .map((p: any) => (
                              <tr
                                key={p.id}
                                className="hover:bg-gray-50/30 transition-colors"
                              >
                                <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                  {format(parseISO(p.date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </td>
                                <td className="px-5 py-4 text-xs font-bold font-mono text-indigo-700 whitespace-nowrap">
                                  {p.nf_number}
                                </td>
                                <td className="px-5 py-4 text-xs font-bold text-gray-800">
                                  {p.item_name}
                                </td>
                                <td className="px-5 py-4 text-xs font-bold text-gray-600 whitespace-nowrap">
                                  x{p.quantity}
                                </td>
                                <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                                  R${" "}
                                  {Number(p.unit_price || 0).toLocaleString(
                                    "pt-BR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="px-5 py-4 text-xs font-mono font-bold text-gray-800 whitespace-nowrap">
                                  R${" "}
                                  {Number(p.total_price || 0).toLocaleString(
                                    "pt-BR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                      p.origin === "stock"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-purple-50 text-purple-600"
                                    }`}
                                  >
                                    {p.context}
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            
            {/* 6. REPORT TYPE: SCHEDULES */}
            {activeReport === "schedules" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 print:hidden flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex-1 w-full max-w-sm relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por motorista ou placa..."
                      value={schedulesSearchTerm}
                      onChange={(e) => setSchedulesSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">

                  <div className="p-4 border-b border-gray-200/80 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={15} className="text-indigo-600" />
                      Histórico Geral de Escalas
                    </h3>
                  </div>

                  <div className="flex-1 overflow-auto max-h-[600px] print:max-h-none print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/75 sticky top-0 border-b border-gray-200/80 z-10">
                        <tr>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Data
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Motorista / Veículo
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Rota
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            KM Início
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            KM Fim
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            KM Rodado
                          </th>
                          <th className="px-5 py-3.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            Abastecimento
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        
                        {schedulesData.filter((sch: any) => {
                            const term = schedulesSearchTerm.toLowerCase();
                            const driver = (sch.profiles?.full_name || "").toLowerCase();
                            const plate = (sch.vehicles?.plate || "").toLowerCase();
                            return driver.includes(term) || plate.includes(term);
                          }).length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                              >
                                Nenhuma escala encontrada
                              </td>
                            </tr>
                          ) : (
                            schedulesData
                              .filter((sch: any) => {
                                const term = schedulesSearchTerm.toLowerCase();
                                const driver = (sch.profiles?.full_name || "").toLowerCase();
                                const plate = (sch.vehicles?.plate || "").toLowerCase();
                                return driver.includes(term) || plate.includes(term);
                              })
                              .map((sch: any) => (

                            <tr
                              key={sch.id}
                              className="hover:bg-gray-50/30 transition-colors"
                            >
                              <td className="px-5 py-4 text-xs font-semibold text-gray-600 whitespace-nowrap">
                                {format(
                                  parseISO(sch.start_at),
                                  "dd/MM/yy HH:mm",
                                  { locale: ptBR },
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-xs font-bold text-gray-800">
                                  {sch.profiles?.full_name}
                                </p>
                                <p className="text-[10px] uppercase font-black tracking-widest text-indigo-600 mt-1">
                                  {sch.vehicles?.plate}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-xs font-bold text-gray-700 whitespace-nowrap">
                                {sch.routes?.origin && sch.routes?.destination
                                  ? `${sch.routes.origin} → ${sch.routes.destination}`
                                  : "Indefinida"}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-600">
                                {sch.start_check?.odometer
                                  ? `${sch.start_check.odometer.toLocaleString("pt-BR")} km`
                                  : "-"}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-gray-600">
                                {sch.end_check?.odometer
                                  ? `${sch.end_check.odometer.toLocaleString("pt-BR")} km`
                                  : "-"}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono font-bold text-indigo-600">
                                {sch.start_check?.odometer && sch.end_check?.odometer && sch.end_check.odometer >= sch.start_check.odometer
                                  ? `${(sch.end_check.odometer - sch.start_check.odometer).toLocaleString("pt-BR")} km`
                                  : "-"}
                              </td>
                              <td className="px-5 py-4">
                                {sch.requires_fueling ? (
                                  sch.fuel_check ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest w-fit">
                                        <CheckCircle2 size={12} />
                                        Realizado
                                      </span>
                                      {sch.fuel_check.details && (
                                        <span className="text-[10px] text-gray-500 font-medium">
                                          Qtd: {(() => {
                                            const details = sch.fuel_check.details;
                                            let liters = 0;
                                            if (details?.itemValues && details?.itemTitles) {
                                              const entry = Object.entries(details.itemTitles).find(([_, title]) => {
                                                const t = String(title).toLowerCase();
                                                return t.includes('litro') || t.includes('quantidade') || t.includes('lts');
                                              });
                                              if (entry) {
                                                liters = parseFloat(String(details.itemValues[entry[0]]).replace(',','.'));
                                              }
                                            } else if (details?.manual_liters !== undefined && details?.manual_liters !== null) {
                                              liters = parseFloat(String(details.manual_liters).replace(',', '.'));
                                            } else if (details?.adjusted_liters !== undefined && details?.adjusted_liters !== null && details.adjusted_liters !== '') {
                                              liters = parseFloat(String(details.adjusted_liters).replace(',', '.'));
                                            }
                                            return liters && !isNaN(liters) ? `${liters.toLocaleString('pt-BR')} L` : "-";
                                          })()}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest">
                                      <AlertTriangle size={12} />
                                      Pendente
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                    Não Exigido
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {selectedDefectToPrint && (
        <DefectPrintModal
          defect={selectedDefectToPrint}
          onClose={() => setSelectedDefectToPrint(null)}
        />
      )}
    </div>
  );
}
