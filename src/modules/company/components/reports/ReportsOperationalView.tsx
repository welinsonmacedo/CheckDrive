import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  FileText,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Users,
  Building2,
  Package,
  Fuel,
  Shield,
  Clock,
  Calendar,
  Layers,
  Wrench,
  TrendingUp,
  Download,
  Info,
  DollarSign,
  UserCheck,
  History,
  Bell,
  ShoppingCart,
  ListFilter,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Image,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import ReportsFilters, { GlobalReportFilters } from "./ReportsFilters";
import PrintHeader from "../PrintHeader";

export default function ReportsOperationalView() {
  const { user } = useAuth();

  // Category & Selected Report State
  const [selectedCategory, setSelectedCategory] = useState<
    "operacao" | "frota" | "manutencao" | "estoque" | "abastecimento" | "auditoria"
  >("operacao");

  const [selectedReport, setSelectedReport] = useState<string>("checklists");

  // Global Filters
  const [filters, setFilters] = useState<GlobalReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    branchId: "all",
    vehicleId: "all",
    driverId: "all",
    status: "all",
    searchTerm: "",
  });

  // Data Selectors Options
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Report Specific Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({});

  // Pendencias por Placa dropdown & expansion state
  const [expandedPlates, setExpandedPlates] = useState<Record<string, boolean>>({});
  const [selectedDefectByPlate, setSelectedDefectByPlate] = useState<Record<string, string>>({});
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const togglePlateExpand = (plate: string) => {
    setExpandedPlates((prev) => ({ ...prev, [plate]: !prev[plate] }));
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [user?.company_id]);

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, filters, user?.company_id]);

  const fetchFilterOptions = async () => {
    if (!user?.company_id) return;
    try {
      const [bRes, vRes, tRes, dRes] = await Promise.all([
        supabase
          .from("branches")
          .select("id, name")
          .eq("company_id", user.company_id)
          .order("name"),
        supabase
          .from("vehicles")
          .select("id, plate, model")
          .eq("company_id", user.company_id)
          .order("plate"),
        supabase
          .from("trailers")
          .select("id, plate, model")
          .eq("company_id", user.company_id)
          .order("plate"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("company_id", user.company_id)
          .eq("role", "driver")
          .order("full_name"),
      ]);

      const mergedVehicles = [
        ...(vRes.data || []),
        ...(tRes.data || []).map((t: any) => ({
          ...t,
          model: t.model ? `${t.model} (Reboque)` : "Reboque",
        })),
      ].sort((a, b) => (a.plate || "").localeCompare(b.plate || ""));

      setBranches(bRes.data || []);
      setVehicles(mergedVehicles);
      setDrivers(dRes.data || []);
    } catch (err) {
      console.warn("Could not fetch filter options", err);
    }
  };

  const handleFilterChange = (key: keyof GlobalReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      branchId: "all",
      vehicleId: "all",
      driverId: "all",
      status: "all",
      searchTerm: "",
    });
  };

  const fetchReportData = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setReportData([]);
    setSummaryStats({});

    try {
      const companyId = user.company_id;
      const startIso = `${filters.startDate}T00:00:00Z`;
      const endIso = `${filters.endDate}T23:59:59Z`;

      // Helper lookup maps for robust offline/schema-independent resolution
      const [profilesRes, vehiclesRes, trailersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("company_id", companyId),
        supabase.from("vehicles").select("id, plate, branch_id").eq("company_id", companyId),
        supabase.from("trailers").select("id, plate").eq("company_id", companyId),
      ]);

      const profilesMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        if (p.id) profilesMap[p.id] = p.full_name;
      });

      const vehiclesMap: Record<string, any> = {};
      (vehiclesRes.data || []).forEach((v: any) => {
        if (v.id) vehiclesMap[v.id] = v;
      });

      const trailersMap: Record<string, any> = {};
      (trailersRes.data || []).forEach((t: any) => {
        if (t.id) trailersMap[t.id] = t;
      });

      const getPlate = (r: any) => {
        if (!r) return "-";
        if (r.trailer_id) {
          const tp = r.trailers?.plate || trailersMap[r.trailer_id]?.plate;
          if (tp) return tp;
        }
        return (
          r.plate ||
          r.vehicles?.plate ||
          r.trailers?.plate ||
          vehiclesMap[r.vehicle_id]?.plate ||
          trailersMap[r.vehicle_id]?.plate ||
          trailersMap[r.trailer_id]?.plate ||
          r.parsedDetails?.plate ||
          r.name ||
          "-"
        );
      };

      switch (selectedReport) {
        // --- CATEGORY: OPERAÇÃO ---
        case "checklists": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate)")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          if (filters.vehicleId !== "all") query = query.eq("vehicle_id", filters.vehicleId);
          if (filters.driverId !== "all") query = query.eq("driver_id", filters.driverId);
          if (filters.status !== "all") query = query.eq("status", filters.status);

          let { data, error } = await query;
          if (error || !data) {
            // Fallback without joins
            let fallbackQuery = supabase
              .from("checklist_issues")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            if (filters.vehicleId !== "all") fallbackQuery = fallbackQuery.eq("vehicle_id", filters.vehicleId);
            if (filters.driverId !== "all") fallbackQuery = fallbackQuery.eq("driver_id", filters.driverId);
            if (filters.status !== "all") fallbackQuery = fallbackQuery.eq("status", filters.status);
            const fbRes = await fallbackQuery;
            data = fbRes.data || [];
          }

          let result = (data || []).map((r: any) => {
            const veh = r.vehicles || vehiclesMap[r.vehicle_id] || null;
            const trl = r.trailers || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || null;
            const plate =
              r.plate ||
              veh?.plate ||
              trl?.plate ||
              vehiclesMap[r.vehicle_id]?.plate ||
              trailersMap[r.trailer_id]?.plate ||
              trailersMap[r.vehicle_id]?.plate ||
              "-";

            return {
              ...r,
              vehicles: veh,
              trailers: trl,
              profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
              plate,
            };
          });

          if (filters.branchId !== "all") {
            result = result.filter(
              (r: any) =>
                r.vehicles?.branch_id === filters.branchId ||
                r.trailers?.branch_id === filters.branchId,
            );
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (r: any) =>
                r.item_title?.toLowerCase().includes(term) ||
                r.vehicles?.plate?.toLowerCase().includes(term) ||
                r.profiles?.full_name?.toLowerCase().includes(term),
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            pending: result.filter((r: any) => r.status === "pending").length,
            waiting: result.filter((r: any) => r.status === "waiting").length,
            resolved: result.filter((r: any) => r.status === "resolved").length,
          });
          break;
        }

        case "pending_by_plate": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate)")
            .eq("company_id", companyId)
            .in("status", ["pending", "waiting"])
            .gte("created_at", startIso)
            .lte("created_at", endIso);

          if (filters.vehicleId !== "all") query = query.eq("vehicle_id", filters.vehicleId);
          if (filters.driverId !== "all") query = query.eq("driver_id", filters.driverId);

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("checklist_issues")
              .select("*")
              .eq("company_id", companyId)
              .in("status", ["pending", "waiting"])
              .gte("created_at", startIso)
              .lte("created_at", endIso);
            if (filters.vehicleId !== "all") fbQuery = fbQuery.eq("vehicle_id", filters.vehicleId);
            if (filters.driverId !== "all") fbQuery = fbQuery.eq("driver_id", filters.driverId);
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          let result = (data || []).map((r: any) => {
            const veh = r.vehicles || vehiclesMap[r.vehicle_id] || null;
            const trl = r.trailers || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || null;
            const plate =
              r.plate ||
              veh?.plate ||
              trl?.plate ||
              vehiclesMap[r.vehicle_id]?.plate ||
              trailersMap[r.trailer_id]?.plate ||
              trailersMap[r.vehicle_id]?.plate ||
              "-";

            return {
              ...r,
              vehicles: veh,
              trailers: trl,
              profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
              plate,
            };
          });

          if (filters.branchId !== "all") {
            result = result.filter(
              (r: any) =>
                r.vehicles?.branch_id === filters.branchId ||
                r.trailers?.branch_id === filters.branchId,
            );
          }

          // Group by plate
          const groupedMap: Record<string, any[]> = {};
          result.forEach((iss: any) => {
            const plate = iss.plate || "Sem Placa";
            if (!groupedMap[plate]) groupedMap[plate] = [];
            groupedMap[plate].push(iss);
          });

          const groupedList = Object.entries(groupedMap).map(([plate, list]) => ({
            plate,
            count: list.length,
            items: list,
          }));

          setReportData(groupedList);
          setSummaryStats({
            totalPlates: groupedList.length,
            totalPendingIssues: result.length,
          });
          break;
        }

        case "notifications":
        case "auto_alerts": {
          let { data, error } = await supabase
            .from("auto_alerts")
            .select("*, vehicles:target_vehicle_id(plate, branch_id), trailers:target_vehicle_id(plate)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          if (error || !data) {
            const fbRes = await supabase
              .from("auto_alerts")
              .select("*")
              .eq("company_id", companyId)
              .order("created_at", { ascending: false });
            data = fbRes.data || [];
          }

          let result = (data || []).map((r: any) => {
            const vId = r.target_vehicle_id || r.vehicle_id;
            const veh = r.vehicles || vehiclesMap[vId] || trailersMap[vId] || null;
            const dId = r.target_driver_id || r.driver_id;
            const drvName = profilesMap[dId] || "-";

            let desc = r.description || r.notes || "";
            if (!desc) {
              if (r.trigger_type === "km") {
                desc = `A cada ${r.interval_km || 0} km (Aviso aos ${r.warning_km || 0} km | Último: ${r.last_km || 0} km)`;
              } else if (r.trigger_type === "date") {
                desc = `Data: ${r.trigger_date || "-"} (Aviso ${r.warning_days || 0} dias antes)`;
              } else {
                desc = r.alert_type || "Regra automática de manutenção";
              }
            }

            return {
              ...r,
              vehicles: veh,
              plate: veh?.plate || r.plate || "-",
              description: desc,
              driver_name: drvName,
            };
          });

          if (filters.status === "active") result = result.filter((r: any) => r.active !== false);
          if (filters.status === "inactive") result = result.filter((r: any) => r.active === false);

          if (filters.vehicleId !== "all") {
            result = result.filter((r: any) => (r.target_vehicle_id || r.vehicle_id) === filters.vehicleId);
          }

          if (filters.branchId !== "all") {
            result = result.filter((r: any) => r.vehicles?.branch_id === filters.branchId);
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (r: any) =>
                r.title?.toLowerCase().includes(term) ||
                r.description?.toLowerCase().includes(term) ||
                r.plate?.toLowerCase().includes(term),
            );
          }

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        case "schedules": {
          let query = supabase
            .from("schedules")
            .select(`
              *,
              profiles(full_name, branch_id),
              vehicles(plate, model, branch_id),
              trailers(plate, model)
            `)
            .eq("company_id", companyId)
            .gte("start_at", startIso)
            .lte("start_at", endIso)
            .order("start_at", { ascending: false });

          if (filters.driverId !== "all") query = query.eq("driver_id", filters.driverId);

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("schedules")
              .select("*")
              .eq("company_id", companyId)
              .gte("start_at", startIso)
              .lte("start_at", endIso)
              .order("start_at", { ascending: false });
            if (filters.driverId !== "all") fbQuery = fbQuery.eq("driver_id", filters.driverId);
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          const rawSchedules = data || [];
          const scheduleIds = rawSchedules.map((s: any) => s.id).filter(Boolean);
          const startChecklistIds = rawSchedules.map((s: any) => s.start_checklist_id).filter(Boolean);
          const endChecklistIds = rawSchedules.map((s: any) => s.end_checklist_id).filter(Boolean);
          const fuelChecklistIds = rawSchedules.map((s: any) => s.fuel_checklist_id).filter(Boolean);

          const allChecklistIds = Array.from(new Set([...startChecklistIds, ...endChecklistIds, ...fuelChecklistIds]));

          let submissionsMap: Record<string, any> = {};
          let averagesByScheduleMap: Record<string, any> = {};

          // Fetch explicit checklist submissions in batches of 30
          if (allChecklistIds.length > 0) {
            for (let i = 0; i < allChecklistIds.length; i += 30) {
              const batch = allChecklistIds.slice(i, i + 30);
              const { data: subBatch } = await supabase
                .from("checklist_submissions")
                .select("id, odometer, details, created_at")
                .in("id", batch);

              (subBatch || []).forEach((sub: any) => {
                submissionsMap[sub.id] = sub;
              });
            }
          }

          // Fetch vehicle_averages linked by schedule_id in batches of 30
          if (scheduleIds.length > 0) {
            for (let i = 0; i < scheduleIds.length; i += 30) {
              const batch = scheduleIds.slice(i, i + 30);
              const { data: avgs } = await supabase
                .from("vehicle_averages")
                .select("schedule_id, start_odometer, end_odometer, distance, liters")
                .in("schedule_id", batch);

              (avgs || []).forEach((avg: any) => {
                if (avg.schedule_id) {
                  averagesByScheduleMap[avg.schedule_id] = avg;
                }
              });
            }
          }

          const parseKm = (val: any): number => {
            if (val === null || val === undefined || val === "") return 0;
            if (typeof val === "number") return val > 0 ? val : 0;
            if (typeof val === "string") {
              const cleaned = val.replace(/\./g, "").replace(",", ".");
              const num = parseFloat(cleaned);
              return !isNaN(num) && num > 0 ? num : 0;
            }
            return 0;
          };

          const extractKmFromSub = (sub: any) => {
            if (!sub) return 0;
            if (parseKm(sub.odometer) > 0) return parseKm(sub.odometer);

            let details = sub.details;
            if (typeof details === "string") {
              try { details = JSON.parse(details); } catch (e) { details = {}; }
            }
            details = details || {};

            const keys = [
              "odometer", "km", "km_inicial", "km_final", "km_atual", "start_odometer", "end_odometer",
              "odometro", "quilometragem", "tacografo"
            ];
            for (const key of keys) {
              if (parseKm(details[key]) > 0) return parseKm(details[key]);
            }

            if (details.itemValues && typeof details.itemValues === "object") {
              for (const key of keys) {
                if (parseKm(details.itemValues[key]) > 0) return parseKm(details.itemValues[key]);
              }
            }

            // Fallback: check nested object numeric values
            if (typeof details === "object") {
              for (const v of Object.values(details)) {
                const parsed = parseKm(v);
                if (parsed > 100) return parsed;
              }
            }
            return 0;
          };

          const extractLitersFromDetails = (subDetails: any) => {
            if (!subDetails) return 0;
            const details = typeof subDetails === "string" ? JSON.parse(subDetails) : subDetails;
            return Number(
              details.manual_liters ??
              details.liters ??
              details.litros ??
              details.qtd_litros ??
              details.gas_station_liters ??
              details.quantidade_litros ??
              details.itemValues?.gas_station_liters ??
              details.itemValues?.manual_liters ??
              details.itemValues?.liters ??
              details.itemValues?.litros ??
              0
            );
          };

          let totalKmDriven = 0;
          let totalLiters = 0;

          let result = rawSchedules.map((r: any) => {
            const veh = r.vehicles || vehiclesMap[r.vehicle_id] || null;
            const trl = r.trailers || trailersMap[r.trailer_id] || null;
            const prof = r.profiles || { full_name: profilesMap[r.driver_id] || "-", branch_id: null };

            const startSub = submissionsMap[r.start_checklist_id];
            const schSubs = [submissionsMap[r.start_checklist_id], submissionsMap[r.end_checklist_id], submissionsMap[r.fuel_checklist_id]].filter(Boolean);
            const avgRecord = averagesByScheduleMap[r.id];

            let startKm = 0;
            if (parseKm(r.adjusted_start_odometer) > 0) {
              startKm = parseKm(r.adjusted_start_odometer);
            } else if (parseKm(r.start_odometer) > 0) {
              startKm = parseKm(r.start_odometer);
            } else if (parseKm(r.start_km) > 0) {
              startKm = parseKm(r.start_km);
            } else if (startSub && extractKmFromSub(startSub) > 0) {
              startKm = extractKmFromSub(startSub);
            } else if (avgRecord?.start_odometer && parseKm(avgRecord.start_odometer) > 0) {
              startKm = parseKm(avgRecord.start_odometer);
            } else {
              for (const s of schSubs) {
                const km = extractKmFromSub(s);
                if (km > 0) {
                  startKm = km;
                  break;
                }
              }
            }

            const endSub = submissionsMap[r.end_checklist_id];

            let endKm = 0;
            if (parseKm(r.adjusted_end_odometer) > 0) {
              endKm = parseKm(r.adjusted_end_odometer);
            } else if (parseKm(r.end_odometer) > 0) {
              endKm = parseKm(r.end_odometer);
            } else if (parseKm(r.end_km) > 0) {
              endKm = parseKm(r.end_km);
            } else if (endSub && extractKmFromSub(endSub) > 0) {
              endKm = extractKmFromSub(endSub);
            } else if (avgRecord?.end_odometer && parseKm(avgRecord.end_odometer) > 0) {
              endKm = parseKm(avgRecord.end_odometer);
            } else {
              for (let i = schSubs.length - 1; i >= 0; i--) {
                const km = extractKmFromSub(schSubs[i]);
                if (km > 0 && km !== startKm) {
                  endKm = km;
                  break;
                }
              }
            }

            let totalKm = 0;
            if (endKm > 0 && startKm > 0 && endKm >= startKm) {
              totalKm = endKm - startKm;
            } else if (parseKm(r.distance) > 0) {
              totalKm = parseKm(r.distance);
            } else if (parseKm(r.total_km) > 0) {
              totalKm = parseKm(r.total_km);
            } else if (parseKm(avgRecord?.distance) > 0) {
              totalKm = parseKm(avgRecord.distance);
            }

            const fuelSub = submissionsMap[r.fuel_checklist_id];
            let liters = 0;
            if (r.adjusted_liters !== undefined && r.adjusted_liters !== null && Number(r.adjusted_liters) > 0) {
              liters = Number(r.adjusted_liters);
            } else {
              if (fuelSub) {
                liters = extractLitersFromDetails(fuelSub.details);
              }
              if (liters === 0) {
                schSubs.forEach((s) => {
                  if (s.type === "fuel" || (s.type || "").toLowerCase().includes("abastecimento")) {
                    liters += extractLitersFromDetails(s.details);
                  }
                });
              }
            }

            totalKmDriven += totalKm;
            totalLiters += liters;

            return {
              ...r,
              vehicles: veh,
              trailers: trl,
              profiles: prof,
              start_km: startKm,
              end_km: endKm,
              total_km: totalKm,
              liters: liters,
            };
          });

          if (filters.vehicleId !== "all") {
            result = result.filter((r: any) => r.vehicle_id === filters.vehicleId || r.trailer_id === filters.vehicleId);
          }

          if (filters.branchId !== "all") {
            result = result.filter(
              (r: any) =>
                r.vehicles?.branch_id === filters.branchId ||
                r.trailers?.branch_id === filters.branchId ||
                r.profiles?.branch_id === filters.branchId,
            );
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (r: any) =>
                r.vehicles?.plate?.toLowerCase().includes(term) ||
                r.trailers?.plate?.toLowerCase().includes(term) ||
                r.profiles?.full_name?.toLowerCase().includes(term) ||
                r.plate?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            totalKmDriven: Math.round(totalKmDriven),
            totalLiters: Math.round(totalLiters * 10) / 10,
          });
          break;
        }

        // --- CATEGORY: FROTA ---
        case "vehicles": {
          const [vRes, tRes, subRes, schRes] = await Promise.all([
            supabase
              .from("vehicles")
              .select("*")
              .eq("company_id", companyId)
              .order("plate"),
            supabase
              .from("trailers")
              .select("*")
              .eq("company_id", companyId)
              .order("plate"),
            supabase
              .from("checklist_submissions")
              .select("id, vehicle_id, trailer_id, odometer, created_at")
              .eq("company_id", companyId)
              .not("odometer", "is", null)
              .gt("odometer", 0)
              .order("created_at", { ascending: false }),
            supabase
              .from("schedules")
              .select("id, vehicle_id, trailer_id, end_odometer, start_odometer, created_at, end_at, start_at")
              .eq("company_id", companyId)
              .order("created_at", { ascending: false }),
          ]);

          const vData = vRes.data || [];
          const tData = (tRes.data || []).map((t: any) => ({
            ...t,
            model: t.model || "Reboque",
            type: t.type || "Reboque / Semirreboque",
          }));

          // Maps for last known odometer and date
          const lastVehicleKmMap: Record<string, { km: number; date: string }> = {};
          const lastTrailerKmMap: Record<string, { km: number; date: string }> = {};

          // Populate from checklist_submissions
          (subRes.data || []).forEach((s: any) => {
            const odo = Number(s.odometer || 0);
            if (odo > 0) {
              if (s.vehicle_id && (!lastVehicleKmMap[s.vehicle_id] || new Date(s.created_at) > new Date(lastVehicleKmMap[s.vehicle_id].date))) {
                lastVehicleKmMap[s.vehicle_id] = { km: odo, date: s.created_at };
              }
              if (s.trailer_id && (!lastTrailerKmMap[s.trailer_id] || new Date(s.created_at) > new Date(lastTrailerKmMap[s.trailer_id].date))) {
                lastTrailerKmMap[s.trailer_id] = { km: odo, date: s.created_at };
              }
            }
          });

          // Populate from schedules
          (schRes.data || []).forEach((sch: any) => {
            const endOdo = Number(sch.adjusted_end_odometer ?? sch.end_odometer ?? sch.start_odometer ?? 0);
            const schDate = sch.end_at || sch.start_at || sch.created_at;
            if (endOdo > 0 && schDate) {
              if (sch.vehicle_id && (!lastVehicleKmMap[sch.vehicle_id] || endOdo > lastVehicleKmMap[sch.vehicle_id].km)) {
                lastVehicleKmMap[sch.vehicle_id] = { km: endOdo, date: schDate };
              }
              if (sch.trailer_id && (!lastTrailerKmMap[sch.trailer_id] || endOdo > lastTrailerKmMap[sch.trailer_id].km)) {
                lastTrailerKmMap[sch.trailer_id] = { km: endOdo, date: schDate };
              }
            }
          });

          // Combine vehicles & trailers with calculated current_km & last_km_date
          const processedVehicles = vData.map((v: any) => {
            let km = Number(v.odometer || v.current_km || 0);
            let date = v.updated_at || v.created_at || null;

            if (lastVehicleKmMap[v.id]) {
              if (lastVehicleKmMap[v.id].km >= km || !km) {
                km = lastVehicleKmMap[v.id].km;
                date = lastVehicleKmMap[v.id].date;
              }
            }

            return {
              ...v,
              asset_category: "Veículo",
              current_km: km,
              last_km_date: date,
            };
          });

          const processedTrailers = tData.map((t: any) => {
            let km = Number(t.odometer || t.current_km || 0);
            let date = t.updated_at || t.created_at || null;

            if (lastTrailerKmMap[t.id]) {
              if (lastTrailerKmMap[t.id].km >= km || !km) {
                km = lastTrailerKmMap[t.id].km;
                date = lastTrailerKmMap[t.id].date;
              }
            }

            return {
              ...t,
              asset_category: "Reboque",
              current_km: km,
              last_km_date: date,
            };
          });

          let combined = [...processedVehicles, ...processedTrailers];

          if (filters.branchId !== "all") {
            combined = combined.filter((v: any) => v.branch_id === filters.branchId);
          }
          if (filters.status === "active") {
            combined = combined.filter((v: any) => v.active !== false);
          }
          if (filters.status === "inactive") {
            combined = combined.filter((v: any) => v.active === false);
          }

          let result = combined;

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (v: any) =>
                v.plate?.toLowerCase().includes(term) ||
                v.model?.toLowerCase().includes(term) ||
                v.type?.toLowerCase().includes(term) ||
                v.chassi?.toLowerCase().includes(term) ||
                v.renavam?.toLowerCase().includes(term) ||
                v.asset_category?.toLowerCase().includes(term),
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            active: result.filter((v: any) => v.active !== false).length,
            vehiclesCount: result.filter((v: any) => v.asset_category === "Veículo").length,
            trailersCount: result.filter((v: any) => v.asset_category === "Reboque").length,
          });
          break;
        }

        case "drivers": {
          let query = supabase
            .from("profiles")
            .select("*")
            .eq("company_id", companyId)
            .eq("role", "driver")
            .order("full_name");

          if (filters.branchId !== "all") query = query.eq("branch_id", filters.branchId);
          if (filters.status === "active") query = query.eq("active", true);
          if (filters.status === "inactive") query = query.eq("active", false);

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("profiles")
              .select("*")
              .eq("company_id", companyId)
              .eq("role", "driver")
              .order("full_name");
            if (filters.branchId !== "all") fbQuery = fbQuery.eq("branch_id", filters.branchId);
            if (filters.status === "active") fbQuery = fbQuery.eq("active", true);
            if (filters.status === "inactive") fbQuery = fbQuery.eq("active", false);
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          // Build branches map from branches state
          const branchMap: Record<string, string> = {};
          (branches || []).forEach((b: any) => {
            if (b.id) branchMap[b.id] = b.name;
          });

          // Fetch scores separately
          const { data: perfData } = await supabase
            .from("driver_performance")
            .select("driver_id, score");
          const perfMap: Record<string, number> = {};
          (perfData || []).forEach((p: any) => {
            if (p.driver_id) perfMap[p.driver_id] = p.score;
          });

          let result = (data || []).map((d: any) => ({
            ...d,
            branches: d.branches || (d.branch_id && branchMap[d.branch_id] ? { name: branchMap[d.branch_id] } : null),
            driver_performance: [{ score: perfMap[d.id] ?? 0 }],
          }));

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (d: any) =>
                d.full_name?.toLowerCase().includes(term) ||
                d.branches?.name?.toLowerCase().includes(term) ||
                d.cpf?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            active: result.filter((d: any) => d.active !== false).length,
          });
          break;
        }

        case "branches": {
          const [bRes, vRes, tRes, dRes] = await Promise.all([
            supabase
              .from("branches")
              .select("*")
              .eq("company_id", companyId)
              .order("name"),
            supabase
              .from("vehicles")
              .select("id, branch_id")
              .eq("company_id", companyId),
            supabase
              .from("trailers")
              .select("id, branch_id")
              .eq("company_id", companyId),
            supabase
              .from("profiles")
              .select("id, branch_id")
              .eq("company_id", companyId)
              .eq("role", "driver"),
          ]);

          let branchesData = bRes.data || [];

          if (branchesData.length === 0) {
            try {
              const storageKey = `checkdrive_branches_${companyId || "default"}`;
              const local = localStorage.getItem(storageKey);
              if (local) {
                branchesData = JSON.parse(local);
              }
            } catch (e) {
              console.error("Error reading fallback branches from localStorage:", e);
            }
          }

          const vCountMap: Record<string, number> = {};
          (vRes.data || []).forEach((v: any) => {
            if (v.branch_id) vCountMap[v.branch_id] = (vCountMap[v.branch_id] || 0) + 1;
          });

          const tCountMap: Record<string, number> = {};
          (tRes.data || []).forEach((t: any) => {
            if (t.branch_id) tCountMap[t.branch_id] = (tCountMap[t.branch_id] || 0) + 1;
          });

          const dCountMap: Record<string, number> = {};
          (dRes.data || []).forEach((d: any) => {
            if (d.branch_id) dCountMap[d.branch_id] = (dCountMap[d.branch_id] || 0) + 1;
          });

          let result = branchesData.map((b: any) => {
            const vCount = vCountMap[b.id] || 0;
            const tCount = tCountMap[b.id] || 0;
            const dCount = dCountMap[b.id] || 0;
            return {
              ...b,
              vehiclesCount: vCount,
              trailersCount: tCount,
              totalVehicles: vCount + tCount,
              driversCount: dCount,
            };
          });

          if (filters.branchId !== "all") {
            result = result.filter((b: any) => b.id === filters.branchId);
          }

          if (filters.status === "active") {
            result = result.filter((b: any) => b.active !== false);
          } else if (filters.status === "inactive") {
            result = result.filter((b: any) => b.active === false);
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (b: any) =>
                b.name?.toLowerCase().includes(term) ||
                b.manager?.toLowerCase().includes(term) ||
                b.city?.toLowerCase().includes(term) ||
                b.state?.toLowerCase().includes(term) ||
                b.cnpj?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            active: result.filter((b: any) => b.active !== false).length,
            totalVehiclesInBranches: result.reduce((acc: number, b: any) => acc + (b.totalVehicles || 0), 0),
            totalDriversInBranches: result.reduce((acc: number, b: any) => acc + (b.driversCount || 0), 0),
          });
          break;
        }

        // --- CATEGORY: MANUTENÇÃO ---
        case "history": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate)")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("checklist_issues")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          let result = (data || []).map((r: any) => {
            const trl = r.trailers || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || null;
            const veh = r.vehicles || vehiclesMap[r.vehicle_id] || null;
            const isTrailer = Boolean(r.trailer_id || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || (r.trailers?.plate && !r.vehicles?.plate));
            const plate =
              r.plate ||
              (r.trailer_id ? (trailersMap[r.trailer_id]?.plate || r.trailers?.plate) : null) ||
              trailersMap[r.vehicle_id]?.plate ||
              (isTrailer && trl?.plate ? trl.plate : null) ||
              veh?.plate ||
              trl?.plate ||
              vehiclesMap[r.vehicle_id]?.plate ||
              "-";

            return {
              ...r,
              vehicles: veh,
              trailers: trl,
              profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
              plate,
              is_trailer: isTrailer,
            };
          });

          if (filters.vehicleId !== "all") {
            result = result.filter((r: any) => r.vehicle_id === filters.vehicleId || r.trailer_id === filters.vehicleId);
          }

          if (filters.branchId !== "all") {
            result = result.filter(
              (r: any) =>
                r.vehicles?.branch_id === filters.branchId ||
                r.trailers?.branch_id === filters.branchId,
            );
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (r: any) =>
                r.plate?.toLowerCase().includes(term) ||
                r.item_title?.toLowerCase().includes(term) ||
                r.description?.toLowerCase().includes(term) ||
                r.profiles?.full_name?.toLowerCase().includes(term),
            );
          }

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        case "resolved_issues": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate)")
            .eq("company_id", companyId)
            .eq("status", "resolved")
            .gte("resolved_at", startIso)
            .lte("resolved_at", endIso)
            .order("resolved_at", { ascending: false });

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("checklist_issues")
              .select("*")
              .eq("company_id", companyId)
              .eq("status", "resolved")
              .gte("resolved_at", startIso)
              .lte("resolved_at", endIso)
              .order("resolved_at", { ascending: false });
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          let result = (data || []).map((r: any) => {
            const trl = r.trailers || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || null;
            const veh = r.vehicles || vehiclesMap[r.vehicle_id] || null;
            const isTrailer = Boolean(r.trailer_id || trailersMap[r.trailer_id] || trailersMap[r.vehicle_id] || (r.trailers?.plate && !r.vehicles?.plate));
            const plate =
              r.plate ||
              (r.trailer_id ? (trailersMap[r.trailer_id]?.plate || r.trailers?.plate) : null) ||
              trailersMap[r.vehicle_id]?.plate ||
              (isTrailer && trl?.plate ? trl.plate : null) ||
              veh?.plate ||
              trl?.plate ||
              vehiclesMap[r.vehicle_id]?.plate ||
              "-";

            return {
              ...r,
              vehicles: veh,
              trailers: trl,
              resolver: r.resolver || { full_name: profilesMap[r.resolved_by] || "Sistema" },
              plate,
              is_trailer: isTrailer,
            };
          });

          if (filters.vehicleId !== "all") {
            result = result.filter((r: any) => r.vehicle_id === filters.vehicleId || r.trailer_id === filters.vehicleId);
          }

          if (filters.branchId !== "all") {
            result = result.filter(
              (r: any) =>
                r.vehicles?.branch_id === filters.branchId ||
                r.trailers?.branch_id === filters.branchId,
            );
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter(
              (r: any) =>
                r.plate?.toLowerCase().includes(term) ||
                r.item_title?.toLowerCase().includes(term) ||
                r.description?.toLowerCase().includes(term) ||
                r.resolution_notes?.toLowerCase().includes(term) ||
                r.resolver?.full_name?.toLowerCase().includes(term),
            );
          }

          const totalCost = result.reduce(
            (acc: number, curr: any) => acc + (Number(curr.resolution_value) || 0),
            0,
          );

          setReportData(result);
          setSummaryStats({
            totalResolved: result.length,
            totalCost,
          });
          break;
        }

        // --- CATEGORY: ESTOQUE ---
        case "inventory": {
          const { data: items } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          const { data: transactions } = await supabase
            .from("inventory_transactions")
            .select("*, inventory_items(name)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

          const { data: vehicles } = await supabase
            .from("vehicles")
            .select("id, plate")
            .eq("company_id", companyId);

          const { data: trailers } = await supabase
            .from("trailers")
            .select("id, plate")
            .eq("company_id", companyId);

          const vehMap: Record<string, string> = {};
          (vehicles || []).forEach((v) => { vehMap[v.id] = v.plate; });
          (trailers || []).forEach((t) => { vehMap[t.id] = t.plate; });

          const txMap: Record<string, any> = {};
          (transactions || []).forEach((tx) => {
            if (tx.item_id && !txMap[tx.item_id]) {
              txMap[tx.item_id] = tx;
            }
          });

          let result = (items || []).map((item) => {
            const tx = txMap[item.id];
            let plate = item.plate || tx?.plate || (tx?.vehicle_id ? vehMap[tx.vehicle_id] : null) || (tx?.trailer_id ? vehMap[tx.trailer_id] : null);
            if (!plate && tx?.notes) {
              const match = tx.notes.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4})/i);
              if (match) plate = match[0].toUpperCase();
            }

            const nfNumber = item.nf_number || tx?.nf_number || "-";
            const itemDate = tx?.date || tx?.created_at || item.created_at;
            const unitPrice = Number(item.average_cost || tx?.unit_price || 0);

            return {
              ...item,
              latest_tx: tx,
              date: itemDate,
              nf_number: nfNumber,
              plate: plate || "-",
              unit_price: unitPrice,
            };
          });

          if (filters.status === "low") {
            result = result.filter((i) => Number(i.current_quantity ?? i.quantity ?? 0) <= Number(i.min_quantity || 0));
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) =>
              i.name?.toLowerCase().includes(term) ||
              i.sku?.toLowerCase().includes(term) ||
              i.nf_number?.toLowerCase().includes(term) ||
              i.plate?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({
            totalItems: result.length,
            lowStockCount: result.filter((i) => Number(i.current_quantity ?? i.quantity ?? 0) <= Number(i.min_quantity || 0)).length,
          });
          break;
        }

        case "purchases": {
          const { data: vehicles } = await supabase
            .from("vehicles")
            .select("id, plate")
            .eq("company_id", companyId);

          const { data: trailers } = await supabase
            .from("trailers")
            .select("id, plate")
            .eq("company_id", companyId);

          const vehMap: Record<string, string> = {};
          (vehicles || []).forEach((v) => { vehMap[v.id] = v.plate; });
          (trailers || []).forEach((t) => { vehMap[t.id] = t.plate; });

          let { data, error } = await supabase
            .from("inventory_transactions")
            .select("*, inventory_items(name), inventory_suppliers(name)")
            .eq("company_id", companyId)
            .eq("type", "in")
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          if (error || !data) {
            const fbRes = await supabase
              .from("inventory_transactions")
              .select("*")
              .eq("company_id", companyId)
              .eq("type", "in")
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            data = fbRes.data || [];
          }

          let result = (data || []).map((tx: any) => {
            let plate = tx.plate || (tx.vehicle_id ? vehMap[tx.vehicle_id] : null) || (tx.trailer_id ? vehMap[tx.trailer_id] : null);
            if (!plate && tx.notes) {
              const match = tx.notes.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4})/i);
              if (match) plate = match[0].toUpperCase();
            }

            return {
              ...tx,
              plate: plate || "-",
              date: tx.date || tx.created_at,
            };
          });

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) =>
              i.inventory_items?.name?.toLowerCase().includes(term) ||
              i.nf_number?.toLowerCase().includes(term) ||
              i.plate?.toLowerCase().includes(term) ||
              i.inventory_suppliers?.name?.toLowerCase().includes(term)
            );
          }

          const totalAmount = result.reduce(
            (acc, curr) => acc + (Number(curr.total_price) || Number(curr.quantity) * Number(curr.unit_price) || 0),
            0,
          );

          setReportData(result);
          setSummaryStats({
            totalTransactions: result.length,
            totalAmount,
          });
          break;
        }

        case "stock_out": {
          const { data: vehicles } = await supabase
            .from("vehicles")
            .select("id, plate")
            .eq("company_id", companyId);

          const { data: trailers } = await supabase
            .from("trailers")
            .select("id, plate")
            .eq("company_id", companyId);

          const vehMap: Record<string, string> = {};
          (vehicles || []).forEach((v) => { vehMap[v.id] = v.plate; });
          (trailers || []).forEach((t) => { vehMap[t.id] = t.plate; });

          let { data, error } = await supabase
            .from("inventory_transactions")
            .select("*, inventory_items(name, average_cost)")
            .eq("company_id", companyId)
            .eq("type", "out")
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          if (error || !data) {
            const fbRes = await supabase
              .from("inventory_transactions")
              .select("*")
              .eq("company_id", companyId)
              .eq("type", "out")
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            data = fbRes.data || [];
          }

          let result = (data || []).map((tx: any) => {
            let plate = tx.plate || (tx.vehicle_id ? vehMap[tx.vehicle_id] : null) || (tx.trailer_id ? vehMap[tx.trailer_id] : null);
            if (!plate && tx.notes) {
              const match = tx.notes.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4})/i);
              if (match) plate = match[0].toUpperCase();
            }

            const qty = Math.abs(Number(tx.quantity || 0));
            const unitPrice = Number(tx.unit_price || tx.inventory_items?.average_cost || 0);
            const totalPrice = Number(tx.total_price) || (qty * unitPrice);

            return {
              ...tx,
              plate: plate || "-",
              date: tx.date || tx.created_at,
              quantity: qty,
              unit_price: unitPrice,
              total_price: totalPrice,
            };
          });

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) =>
              i.inventory_items?.name?.toLowerCase().includes(term) ||
              i.notes?.toLowerCase().includes(term) ||
              i.plate?.toLowerCase().includes(term)
            );
          }

          const totalAmount = result.reduce(
            (acc, curr) => acc + (Number(curr.total_price) || 0),
            0,
          );

          setReportData(result);
          setSummaryStats({
            totalTransactions: result.length,
            totalAmount,
          });
          break;
        }

        case "suppliers": {
          let { data: invSuppliers } = await supabase
            .from("inventory_suppliers")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          let { data: genSuppliers } = await supabase
            .from("suppliers")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          const map = new Map<string, any>();
          (invSuppliers || []).forEach((s) => map.set(s.id || s.name, s));
          (genSuppliers || []).forEach((s) => {
            const key = s.id || s.name;
            if (!map.has(key)) map.set(key, s);
          });

          let result = Array.from(map.values());

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) =>
              i.name?.toLowerCase().includes(term) ||
              i.cnpj_cpf?.toLowerCase().includes(term) ||
              i.contact_name?.toLowerCase().includes(term) ||
              i.phone?.toLowerCase().includes(term) ||
              i.email?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({ totalSuppliers: result.length });
          break;
        }

        // --- CATEGORY: ABASTECIMENTO ---
        case "fuelings": {
          let query = supabase
            .from("checklist_submissions")
            .select("*, vehicles(plate, branch_id), trailers(plate)")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          if (filters.driverId !== "all") query = query.eq("driver_id", filters.driverId);

          let { data, error } = await query;
          if (error || !data) {
            let fbQuery = supabase
              .from("checklist_submissions")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            if (filters.driverId !== "all") fbQuery = fbQuery.eq("driver_id", filters.driverId);
            const fbRes = await fbQuery;
            data = fbRes.data || [];
          }

          // Filter for fuel type or fuel details
          let result = (data || []).filter((sub: any) => {
            if (filters.vehicleId !== "all" && sub.vehicle_id !== filters.vehicleId && sub.trailer_id !== filters.vehicleId) {
              return false;
            }
            const t = (sub.type || "").toLowerCase();
            if (t === "fuel" || t === "abastecimento" || t === "combustivel") return true;
            try {
              const d = typeof sub.details === "string" ? JSON.parse(sub.details) : sub.details || {};
              if (d.liters || d.litros || d.total_value || d.valor_total) return true;
            } catch (e) {}
            return false;
          });

          if (filters.branchId !== "all") {
            result = result.filter((r: any) => {
              const v = r.vehicles || vehiclesMap[r.vehicle_id];
              const t = r.trailers || trailersMap[r.trailer_id];
              return v?.branch_id === filters.branchId || t?.branch_id === filters.branchId;
            });
          }

          let totalLiters = 0;

          result = result.map((row: any) => {
            let detailsObj: any = {};
            try {
              detailsObj =
                typeof row.details === "string" ? JSON.parse(row.details) : row.details || {};
            } catch (e) {
              console.error(e);
            }

            // Extract Liters accurately
            let liters = Number(detailsObj.manual_liters ?? detailsObj.liters ?? detailsObj.litros) || 0;

            if (!liters && detailsObj.itemValues && typeof detailsObj.itemValues === "object") {
              for (const [key, val] of Object.entries(detailsObj.itemValues)) {
                const title = (detailsObj.itemTitles?.[key] || "").toLowerCase();
                const valNum = Number(val);
                if (!isNaN(valNum) && valNum > 0) {
                  if (title.includes("litr") || title.includes("lit") || title.includes("qtd") || title.includes("combust")) {
                    liters = valNum;
                    break;
                  } else if (liters === 0) {
                    liters = valNum;
                  }
                }
              }
            }

            // Extract Location / Posto
            let location =
              detailsObj.station ||
              detailsObj.posto ||
              detailsObj.location ||
              detailsObj.local ||
              detailsObj.gas_station ||
              detailsObj.posto_combustivel ||
              row.location ||
              null;

            if (!location && row.latitude && row.longitude) {
              location = `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`;
            }

            if (!location) {
              location = "Posto / Local não informado";
            }

            totalLiters += liters;

            return {
              ...row,
              vehicles: row.vehicles || vehiclesMap[row.vehicle_id] || null,
              trailers: row.trailers || trailersMap[row.trailer_id] || null,
              profiles: row.profiles || { full_name: profilesMap[row.driver_id] || "-" },
              parsedDetails: detailsObj,
              liters,
              location,
            };
          });

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((r: any) =>
              r.plate?.toLowerCase().includes(term) ||
              r.vehicles?.plate?.toLowerCase().includes(term) ||
              r.trailers?.plate?.toLowerCase().includes(term) ||
              r.profiles?.full_name?.toLowerCase().includes(term) ||
              r.location?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({
            totalFuelings: result.length,
            totalLiters: Math.round(totalLiters),
          });
          break;
        }

        case "mileage": {
          const { data: schData } = await supabase
            .from("schedules")
            .select("id, vehicle_id, trailer_id, start_odometer, end_odometer, adjusted_start_odometer, adjusted_end_odometer, start_at")
            .eq("company_id", companyId)
            .gte("start_at", startIso)
            .lte("start_at", endIso);

          let { data: subsData } = await supabase
            .from("checklist_submissions")
            .select("id, odometer, details, created_at, vehicle_id, trailer_id, driver_id")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: true });

          const odosByPlate: Record<string, number[]> = {};

          (schData || []).forEach((s: any) => {
            const plate = vehiclesMap[s.vehicle_id]?.plate || trailersMap[s.trailer_id]?.plate;
            if (!plate) return;
            if (!odosByPlate[plate]) odosByPlate[plate] = [];

            const startKm = Number(s.adjusted_start_odometer) > 0 ? Number(s.adjusted_start_odometer) : Number(s.start_odometer) > 0 ? Number(s.start_odometer) : 0;
            const endKm = Number(s.adjusted_end_odometer) > 0 ? Number(s.adjusted_end_odometer) : Number(s.end_odometer) > 0 ? Number(s.end_odometer) : 0;

            if (startKm > 0) odosByPlate[plate].push(startKm);
            if (endKm > 0) odosByPlate[plate].push(endKm);
          });

          (subsData || []).forEach((s: any) => {
            const plate = vehiclesMap[s.vehicle_id]?.plate || trailersMap[s.trailer_id]?.plate;
            if (!plate) return;
            if (!odosByPlate[plate]) odosByPlate[plate] = [];

            let odo = Number(s.odometer);
            if (!odo || odo <= 0) {
              const details = typeof s.details === "string" ? JSON.parse(s.details) : s.details || {};
              odo = Number(details.odometer || details.km || details.start_odometer || details.end_odometer || 0);
            }
            if (odo > 0) odosByPlate[plate].push(odo);
          });

          let mileageSummary = Object.entries(odosByPlate).map(([plate, list]) => {
            if (list.length === 0) return null;
            list.sort((a, b) => a - b);
            const minOdo = list[0];
            const maxOdo = list[list.length - 1];
            const kmDriven = Math.max(0, maxOdo - minOdo);
            return {
              plate,
              startOdo: minOdo,
              endOdo: maxOdo,
              kmDriven,
              count: list.length,
            };
          }).filter(Boolean) as any[];

          if (filters.vehicleId !== "all") {
            const selectedPlate = vehiclesMap[filters.vehicleId]?.plate || trailersMap[filters.vehicleId]?.plate;
            if (selectedPlate) {
              mileageSummary = mileageSummary.filter((m: any) => m.plate === selectedPlate);
            }
          }

          setReportData(mileageSummary);
          setSummaryStats({
            totalVehiclesEvaluated: mileageSummary.length,
            totalKmDriven: mileageSummary.reduce((acc: number, curr: any) => acc + (curr?.kmDriven || 0), 0),
          });
          break;
        }

        // --- CATEGORY: AUDITORIA ---
        case "user_audits":
        case "system_audits": {
          let { data, error } = await supabase
            .from("system_audit_logs")
            .select("*")
            .eq("company_id", companyId)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: false });

          if (error || !data || data.length === 0) {
            const { data: fallbackData } = await supabase
              .from("audit_logs")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: false });
            data = fallbackData || [];
          }

          let result = (data || []).map((a: any) => {
            const userName = a.user_name || a.user_email || profilesMap[a.user_id || a.driver_id] || "Usuário";
            const whereChanged = [a.module, a.entity, a.entity_id ? `#${a.entity_id}` : ""].filter(Boolean).join(" › ") || a.system_section || a.section || "Sistema";

            let detailsText = a.reason || a.description || "";
            if (!detailsText && a.details) {
              detailsText = typeof a.details === "object" ? JSON.stringify(a.details) : String(a.details);
            }
            if (!detailsText && a.changes) {
              detailsText = typeof a.changes === "object" ? JSON.stringify(a.changes) : String(a.changes);
            }

            let whatChanged = detailsText;
            if (a.field_changed) {
              whatChanged = `Campo [${a.field_changed}]${whatChanged ? `: ${whatChanged}` : ""}`;
            }
            if (a.old_value !== undefined && a.old_value !== null && a.new_value !== undefined && a.new_value !== null) {
              const oldStr = typeof a.old_value === "object" ? JSON.stringify(a.old_value) : String(a.old_value);
              const newStr = typeof a.new_value === "object" ? JSON.stringify(a.new_value) : String(a.new_value);
              whatChanged += ` (${oldStr} ➔ ${newStr})`;
            }
            if (!whatChanged) {
              whatChanged = a.action || a.type || "Alteração registrada";
            }

            return {
              ...a,
              user_display: userName,
              where_changed: whereChanged,
              what_changed: whatChanged,
              profiles: { full_name: userName },
            };
          });

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) =>
              i.user_display?.toLowerCase().includes(term) ||
              i.where_changed?.toLowerCase().includes(term) ||
              i.what_changed?.toLowerCase().includes(term) ||
              i.action?.toLowerCase().includes(term) ||
              i.module?.toLowerCase().includes(term) ||
              i.entity?.toLowerCase().includes(term) ||
              i.reason?.toLowerCase().includes(term)
            );
          }

          setReportData(result);
          setSummaryStats({ totalAudits: result.length });
          break;
        }

        default:
          setReportData([]);
          break;
      }
    } catch (err) {
      console.error("Error fetching report data", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportData || reportData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    try {
      let company = null;
      if (user?.company_id) {
        const { data } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.company_id)
          .single();
        company = data;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Relatorio");

      // Title header
      worksheet.mergeCells("A1:G3");
      const headerCell = worksheet.getCell("A1");
      headerCell.value = `${company?.name?.toUpperCase() || "CHECKDRIVE"} - RELATÓRIO: ${selectedReport.toUpperCase()}`;
      headerCell.font = { size: 14, bold: true };
      headerCell.alignment = { vertical: "middle", horizontal: "center" };

      // Row 5: Column headers
      let headers: string[] = [];
      let rows: any[][] = [];

      if (selectedReport === "checklists" || selectedReport === "history") {
        headers = ["Data", "Placa", "Item / Defeito", "Descrição / Observação", "Motorista", "Status"];
        rows = (reportData || []).map((d) => [
          new Date(d.created_at).toLocaleString("pt-BR"),
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.item_title,
          d.description || d.observation || "-",
          d.profiles?.full_name || "-",
          d.status,
        ]);
      } else if (selectedReport === "pending_by_plate") {
        headers = ["Placa", "Qtd Pendências", "Itens Pendentes"];
        rows = (reportData || []).map((d) => [
          d.plate,
          d.count,
          (d.items || []).map((i: any) => i?.item_title || "").join(" | "),
        ]);
      } else if (selectedReport === "vehicles") {
        headers = [
          "Placa",
          "Categoria",
          "Modelo",
          "Tipo",
          "Ano Fab/Mod",
          "Chassi",
          "RENAVAM",
          "Cor",
          "Combustível",
          "ANTT",
          "Filial",
          "KM Atual",
          "Data do Último KM",
          "Status",
        ];
        rows = (reportData || []).map((d) => [
          d.plate,
          d.asset_category || (d.model === "Reboque" ? "Reboque" : "Veículo"),
          d.model || "-",
          d.type || "-",
          d.manufacture_year || d.model_year ? `${d.manufacture_year || '-'}/${d.model_year || '-'}` : "-",
          d.chassi || "-",
          d.renavam || "-",
          d.color || "-",
          d.fuel_type || "-",
          d.antt || "-",
          d.branches?.name || "Sem Filial",
          d.current_km ? `${Number(d.current_km).toLocaleString("pt-BR")} km` : "0 km",
          d.last_km_date ? new Date(d.last_km_date).toLocaleString("pt-BR") : "-",
          d.active !== false ? "Ativo" : "Inativo",
        ]);
      } else if (selectedReport === "drivers") {
        headers = ["Nome Completo", "Filial", "Pontuação", "Status"];
        rows = (reportData || []).map((d) => [
          d.full_name,
          d.branches?.name || "Sem Filial",
          d.driver_performance?.[0]?.score ?? d.driver_performance?.score ?? "-",
          d.active !== false ? "Ativo" : "Inativo",
        ]);
      } else if (selectedReport === "branches") {
        headers = ["Nome da Filial", "Cidade/UF", "Responsável / Gerente", "Total de Veículos", "Total de Motoristas", "Telefone", "CNPJ", "Status"];
        rows = (reportData || []).map((b) => [
          b.name,
          b.city && b.state ? `${b.city}/${b.state}` : b.city || b.state || "-",
          b.manager || "-",
          b.totalVehicles ?? 0,
          b.driversCount ?? 0,
          b.phone || "-",
          b.cnpj || "-",
          b.active !== false ? "Ativa" : "Inativa",
        ]);
      } else if (selectedReport === "resolved_issues") {
        headers = ["Data Resolução", "Placa", "Item", "Descrição da Pendência", "Detalhes da Resolução", "Resolvido Por", "Custo (R$)"];
        rows = (reportData || []).map((d) => [
          d.resolved_at ? new Date(d.resolved_at).toLocaleString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.item_title,
          d.description || d.observation || "-",
          d.resolution_notes || "-",
          d.resolver?.full_name || "Sistema",
          Number(d.resolution_value || 0).toFixed(2),
        ]);
      } else if (selectedReport === "fuelings") {
        headers = ["Data", "Placa", "Motorista", "Litros (L)", "Local / Posto"];
        rows = (reportData || []).map((d) => [
          d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.profiles?.full_name || "-",
          d.liters ? `${d.liters} L` : "0 L",
          d.location || "-",
        ]);
      } else if (selectedReport === "schedules") {
        headers = ["Data da Escala", "Placa", "Motorista", "KM Inicial", "KM Final", "KM Total", "Abastecimento (Litros)", "Status"];
        rows = (reportData || []).map((d) => {
          const plateStr = d.trailers?.plate
            ? `${d.trailers.plate}${d.vehicles?.plate ? ` (${d.vehicles.plate})` : ''}`
            : d.vehicles?.plate || d.plate || "-";
          return [
            d.start_at ? new Date(d.start_at).toLocaleString("pt-BR") : "-",
            plateStr,
            d.profiles?.full_name || d.driver_name || "-",
            d.start_km ? `${d.start_km} km` : "-",
            d.end_km ? `${d.end_km} km` : "-",
            d.total_km ? `${d.total_km} km` : "-",
            d.liters > 0 ? `${d.liters} L` : "-",
            d.status === "completed" ? "Concluída" : d.status === "in_progress" ? "Em Andamento" : d.status || "Agendada",
          ];
        });
      } else if (selectedReport === "notifications" || selectedReport === "auto_alerts") {
        headers = ["Data", "Placa", "Título / Alerta", "Descrição", "Status"];
        rows = (reportData || []).map((d) => [
          d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.title || d.message || d.alert_type || "-",
          d.description || "-",
          d.active !== false ? "Ativo" : "Inativo",
        ]);
      } else if (selectedReport === "mileage") {
        headers = ["Placa", "KM Inicial", "KM Final", "Distância Rodada (KM)", "Checklists"];
        rows = (reportData || []).map((d) => [
          d.plate,
          d.startOdo,
          d.endOdo,
          d.kmDriven,
          d.count,
        ]);
      } else if (selectedReport === "inventory") {
        headers = ["Data", "Item / Produto", "SKU / Código", "Categoria", "Nº da NF", "Placa", "Qtd. em Estoque", "Valor do Produto (R$)", "Status"];
        rows = (reportData || []).map((d) => [
          d.date || d.created_at ? new Date(d.date || d.created_at).toLocaleDateString("pt-BR") : "-",
          d.name || "-",
          d.sku || "-",
          d.category || "Geral",
          d.nf_number || "-",
          d.plate || "-",
          Number(d.current_quantity ?? d.quantity ?? 0),
          Number(d.unit_price ?? d.average_cost ?? 0).toFixed(2),
          Number(d.current_quantity ?? d.quantity ?? 0) <= Number(d.min_quantity || 0) ? "Estoque Baixo" : "Normal",
        ]);
      } else if (selectedReport === "purchases") {
        headers = ["Data", "Item / Produto", "Nº da NF", "Placa", "Fornecedor", "Quantidade", "Valor Unit. (R$)", "Valor Total (R$)"];
        rows = (reportData || []).map((d) => [
          d.date || d.created_at ? new Date(d.date || d.created_at).toLocaleDateString("pt-BR") : "-",
          d.inventory_items?.name || d.name || "-",
          d.nf_number || "-",
          d.plate || "-",
          d.inventory_suppliers?.name || "-",
          Number(d.quantity || 0),
          Number(d.unit_price || 0).toFixed(2),
          Number(d.total_price || (Number(d.quantity || 0) * Number(d.unit_price || 0))).toFixed(2),
        ]);
      } else if (selectedReport === "stock_out") {
        headers = ["Data", "Item / Produto", "Placa", "Observações", "Quantidade", "Valor Unit. (R$)", "Valor Total (R$)"];
        rows = (reportData || []).map((d) => [
          d.date || d.created_at ? new Date(d.date || d.created_at).toLocaleDateString("pt-BR") : "-",
          d.inventory_items?.name || d.name || "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.notes || "-",
          Number(d.quantity || 0),
          Number(d.unit_price || 0).toFixed(2),
          Number(d.total_price || 0).toFixed(2),
        ]);
      } else if (selectedReport === "suppliers") {
        headers = ["Nome / Fornecedor", "CNPJ / CPF", "Contato / Responsável", "Telefone", "E-mail", "Endereço"];
        rows = (reportData || []).map((d) => [
          d.name || "-",
          d.cnpj_cpf || "-",
          d.contact_name || "-",
          d.phone || "-",
          d.email || "-",
          d.address || "-",
        ]);
      } else if (selectedReport === "user_audits" || selectedReport === "system_audits") {
        headers = ["Data / Hora", "Usuário Responsável", "Onde Alterou (Módulo / Entidade)", "Ação", "O que Alterou / Detalhes"];
        rows = (reportData || []).map((d) => [
          d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "-",
          d.user_display || d.user_name || d.user_email || d.profiles?.full_name || "-",
          d.where_changed || [d.module, d.entity, d.entity_id ? `#${d.entity_id}` : ""].filter(Boolean).join(" > ") || "-",
          d.action || d.type || "-",
          d.what_changed || d.reason || d.field_changed || "-",
        ]);
      } else {
        // Fallback generic tabular mapping
        headers = ["ID", "Data / Nome", "Placa", "Detalhes / Status"];
        rows = (reportData || []).map((d) => [
          d.id || "-",
          d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : d.name || "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.status || d.description || JSON.stringify(d).slice(0, 50),
        ]);
      }

      worksheet.getRow(5).values = headers;
      worksheet.getRow(5).font = { bold: true };
      worksheet.getRow(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      rows.forEach((row) => worksheet.addRow(row));

      worksheet.columns = headers.map(() => ({ width: 25 }));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `Relatorio_${selectedReport}_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("Erro ao exportar excel", err);
      alert("Erro ao exportar excel.");
    }
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs Ribbon */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={() => {
            setSelectedCategory("operacao");
            setSelectedReport("checklists");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "operacao"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <CheckSquare size={15} /> Operação
        </button>

        <button
          onClick={() => {
            setSelectedCategory("frota");
            setSelectedReport("vehicles");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "frota"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Truck size={15} /> Frota
        </button>

        <button
          onClick={() => {
            setSelectedCategory("manutencao");
            setSelectedReport("history");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "manutencao"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Wrench size={15} /> Manutenção
        </button>

        <button
          onClick={() => {
            setSelectedCategory("estoque");
            setSelectedReport("inventory");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "estoque"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Package size={15} /> Estoque
        </button>

        <button
          onClick={() => {
            setSelectedCategory("abastecimento");
            setSelectedReport("fuelings");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "abastecimento"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Fuel size={15} /> Abastecimento
        </button>

        <button
          onClick={() => {
            setSelectedCategory("auditoria");
            setSelectedReport("user_audits");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedCategory === "auditoria"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <History size={15} /> Auditoria
        </button>
      </div>

      {/* Sub-Report Pills */}
      <div className="bg-gray-50/80 p-2 border border-gray-200/80 rounded-2xl flex flex-wrap gap-1.5 print:hidden">
        {selectedCategory === "operacao" && (
          <>
            <button
              onClick={() => setSelectedReport("checklists")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "checklists"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Checklist & Defeitos
            </button>
            <button
              onClick={() => setSelectedReport("pending_by_plate")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "pending_by_plate"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pendências por Placa
            </button>
            <button
              onClick={() => setSelectedReport("notifications")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "notifications"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Notificações
            </button>
            <button
              onClick={() => setSelectedReport("schedules")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "schedules"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Escalas
            </button>
          </>
        )}

        {selectedCategory === "frota" && (
          <>
            <button
              onClick={() => setSelectedReport("vehicles")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "vehicles"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Veículos
            </button>
            <button
              onClick={() => setSelectedReport("drivers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "drivers"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Motoristas
            </button>
            <button
              onClick={() => setSelectedReport("branches")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "branches"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Filiais
            </button>
          </>
        )}

        {selectedCategory === "manutencao" && (
          <>
            <button
              onClick={() => setSelectedReport("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "history"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Histórico do Veículo
            </button>
            <button
              onClick={() => setSelectedReport("resolved_issues")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "resolved_issues"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pendências Resolvidas
            </button>
            <button
              onClick={() => setSelectedReport("auto_alerts")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "auto_alerts"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Alertas Automáticos
            </button>
          </>
        )}

        {selectedCategory === "estoque" && (
          <>
            <button
              onClick={() => setSelectedReport("inventory")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "inventory"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Inventário
            </button>
            <button
              onClick={() => setSelectedReport("purchases")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "purchases"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Entradas & NFs
            </button>
            <button
              onClick={() => setSelectedReport("stock_out")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "stock_out"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Saídas
            </button>
            <button
              onClick={() => setSelectedReport("suppliers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "suppliers"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Fornecedores
            </button>
          </>
        )}

        {selectedCategory === "abastecimento" && (
          <>
            <button
              onClick={() => setSelectedReport("fuelings")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "fuelings"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Abastecimentos
            </button>
            <button
              onClick={() => setSelectedReport("mileage")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "mileage"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Médias & Distância
            </button>
          </>
        )}

        {selectedCategory === "auditoria" && (
          <>
            <button
              onClick={() => setSelectedReport("user_audits")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "user_audits"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Auditoria de Usuários
            </button>
            <button
              onClick={() => setSelectedReport("system_audits")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedReport === "system_audits"
                  ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Histórico de Alterações
            </button>
          </>
        )}
      </div>

      {/* Reusable Filter Controls */}
      <ReportsFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        branches={branches}
        vehicles={vehicles}
        drivers={drivers}
        loading={loading}
        onRefresh={fetchReportData}
      />

      {/* Actions Ribbon & Printable Header */}
      <PrintHeader />
      <div className="hidden print:block mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-black text-gray-800">
          Relatório: {selectedReport.toUpperCase().replace("_", " ")}
        </h1>
        <p className="text-xs text-gray-500 font-bold">
          Período: {filters.startDate} até {filters.endDate}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-black text-gray-700">
          <Info size={16} className="text-indigo-600" />
          <span>
            {loading
              ? "Carregando registros..."
              : `Exibindo ${reportData.length} registros`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 h-9 px-4 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
          >
            <FileText size={15} /> Exportar Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 h-9 px-4 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
          >
            <Printer size={15} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Summary Indicators */}
      {Object.keys(summaryStats).length > 0 && (
        <div className="flex flex-wrap gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 print:hidden text-xs font-bold text-indigo-900">
          {summaryStats.total !== undefined && <span>Total: {summaryStats.total}</span>}
          {summaryStats.pending !== undefined && <span>Pendentes: {summaryStats.pending}</span>}
          {summaryStats.waiting !== undefined && <span>Em Oficina: {summaryStats.waiting}</span>}
          {summaryStats.resolved !== undefined && <span>Resolvidos: {summaryStats.resolved}</span>}
          {summaryStats.totalResolved !== undefined && <span>Resolvidos: {summaryStats.totalResolved}</span>}
          {summaryStats.totalCost !== undefined && (
            <span>Custo Total: R$ {summaryStats.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          )}
          {summaryStats.totalFuelings !== undefined && <span>Abastecimentos: {summaryStats.totalFuelings}</span>}
          {summaryStats.totalLiters !== undefined && <span>Volume Total: {summaryStats.totalLiters} L</span>}
          {summaryStats.totalKmDriven !== undefined && <span>KM Rodados: {summaryStats.totalKmDriven} km</span>}
          {summaryStats.totalSuppliers !== undefined && <span>Fornecedores Cadastrados: {summaryStats.totalSuppliers}</span>}
          {summaryStats.totalAudits !== undefined && <span>Auditorias Registradas: {summaryStats.totalAudits}</span>}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">
            Carregando dados do relatório...
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Search size={32} className="mx-auto text-gray-300" />
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
              Nenhum registro encontrado
            </p>
            <p className="text-[11px] text-gray-400 font-medium">
              Tente alterar os filtros de data, filial ou veículo no painel superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  {selectedReport === "pending_by_plate" ? (
                    <>
                      <th className="py-3 px-4 w-36">Placa</th>
                      <th className="py-3 px-4 w-36 text-center">Qtd Pendências</th>
                      <th className="py-3 px-4">Seleção / Lista de Defeitos (Dropdown)</th>
                      <th className="py-3 px-4 w-24 text-right">Ação</th>
                    </>
                  ) : selectedReport === "vehicles" ? (
                    <>
                      <th className="py-3 px-4">Placa / Categoria</th>
                      <th className="py-3 px-4">Modelo / Tipo</th>
                      <th className="py-3 px-4">Ano (Fab/Mod)</th>
                      <th className="py-3 px-4">Chassi / RENAVAM</th>
                      <th className="py-3 px-4">Cor / Comb. / ANTT</th>
                      <th className="py-3 px-4">Filial</th>
                      <th className="py-3 px-4 text-right">KM Atual</th>
                      <th className="py-3 px-4 text-right">Data do Último KM</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  ) : selectedReport === "drivers" ? (
                    <>
                      <th className="py-3 px-4">Nome Completo</th>
                      <th className="py-3 px-4">Filial</th>
                      <th className="py-3 px-4">Pontuação</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  ) : selectedReport === "branches" ? (
                    <>
                      <th className="py-3 px-4">Filial / Localização</th>
                      <th className="py-3 px-4">Responsável / Gerente</th>
                      <th className="py-3 px-4 text-center">Total de Veículos</th>
                      <th className="py-3 px-4 text-center">Total de Motoristas</th>
                      <th className="py-3 px-4">Contato / CNPJ</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  ) : selectedReport === "fuelings" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Motorista</th>
                      <th className="py-3 px-4 text-center">Litros</th>
                      <th className="py-3 px-4">Local / Posto</th>
                    </>
                  ) : selectedReport === "mileage" ? (
                    <>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">KM Inicial</th>
                      <th className="py-3 px-4">KM Final</th>
                      <th className="py-3 px-4">Distância Rodada (KM)</th>
                      <th className="py-3 px-4">Checklists</th>
                    </>
                  ) : selectedReport === "resolved_issues" ? (
                    <>
                      <th className="py-3 px-4">Data Resolução</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Item / Defeito</th>
                      <th className="py-3 px-4">Descrição da Pendência</th>
                      <th className="py-3 px-4">Detalhes da Resolução</th>
                      <th className="py-3 px-4">Resolvido Por</th>
                      <th className="py-3 px-4">Custo (R$)</th>
                    </>
                  ) : selectedReport === "checklists" || selectedReport === "history" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Item / Defeito</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Motorista</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  ) : selectedReport === "notifications" || selectedReport === "auto_alerts" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Título / Alerta</th>
                      <th className="py-3 px-4">Descrição / Regra</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  ) : selectedReport === "schedules" ? (
                    <>
                      <th className="py-3 px-4">Data da Escala</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Motorista</th>
                      <th className="py-3 px-4 text-right">KM Inicial</th>
                      <th className="py-3 px-4 text-right">KM Final</th>
                      <th className="py-3 px-4 text-right">KM Total</th>
                      <th className="py-3 px-4 text-right">Abastecimento</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  ) : selectedReport === "inventory" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Item / Produto</th>
                      <th className="py-3 px-4">Nº da NF</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4 text-center">Qtd. em Estoque</th>
                      <th className="py-3 px-4 text-right">Valor do Produto</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  ) : selectedReport === "purchases" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Item / Produto</th>
                      <th className="py-3 px-4">Nº da NF</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Fornecedor</th>
                      <th className="py-3 px-4 text-center">Quantidade</th>
                      <th className="py-3 px-4 text-right">Valor Unit. (R$)</th>
                      <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                    </>
                  ) : selectedReport === "stock_out" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Item / Produto</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Observações / Motivo</th>
                      <th className="py-3 px-4 text-center">Quantidade</th>
                      <th className="py-3 px-4 text-right">Valor Unit. (R$)</th>
                      <th className="py-3 px-4 text-right">Valor Total (R$)</th>
                    </>
                  ) : selectedReport === "suppliers" ? (
                    <>
                      <th className="py-3 px-4">Nome / Fornecedor</th>
                      <th className="py-3 px-4">CNPJ / CPF</th>
                      <th className="py-3 px-4">Contato / Responsável</th>
                      <th className="py-3 px-4">Telefone / WhatsApp</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Endereço</th>
                    </>
                  ) : selectedReport === "user_audits" || selectedReport === "system_audits" ? (
                    <>
                      <th className="py-3 px-4">Data e Hora</th>
                      <th className="py-3 px-4">Usuário / Responsável</th>
                      <th className="py-3 px-4">Onde Alterou (Módulo / Entidade)</th>
                      <th className="py-3 px-4 text-center">Ação</th>
                      <th className="py-3 px-4">O que Alterou (Detalhes da Alteração)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Placa / Referência</th>
                      <th className="py-3 px-4">Item / Título</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                {(reportData || []).map((row, idx) => (
                  selectedReport === "pending_by_plate" ? (
                    <React.Fragment key={row.plate || idx}>
                      <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                        <td className="py-3 px-4 font-black text-indigo-600 text-sm align-top">
                          {row.plate}
                        </td>
                        <td className="py-3 px-4 font-bold text-center align-top">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            {row.count} {row.count === 1 ? 'pendência' : 'pendências'}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top">
                          {/* Dropdown Select to pick an individual defect */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="relative flex-1 w-full max-w-md">
                              <select
                                value={selectedDefectByPlate[row.plate] || ""}
                                onChange={(e) =>
                                  setSelectedDefectByPlate((prev) => ({
                                    ...prev,
                                    [row.plate]: e.target.value,
                                  }))
                                }
                                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                              >
                                <option value="">
                                  🔽 Selecionar Defeito no Dropdown ({row.count} cadastrado{row.count > 1 ? 's' : ''})...
                                </option>
                                {row.items?.map((item: any, iIdx: number) => (
                                  <option key={item.id || iIdx} value={item.id}>
                                    Defeito #{iIdx + 1}: {item.item_title || "Sem título"} [{item.priority || "Médio"}] - {item.description ? item.description.substring(0, 45) + '...' : 'Sem observação'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              onClick={() => togglePlateExpand(row.plate)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shrink-0"
                            >
                              {expandedPlates[row.plate] ? (
                                <>
                                  <ChevronUp size={14} /> Ocultar Lista ({row.count})
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={14} /> Ver Todos ({row.count})
                                </>
                              )}
                            </button>
                          </div>

                          {/* Selected Defect Card Detail */}
                          {(() => {
                            const selectedId = selectedDefectByPlate[row.plate];
                            if (!selectedId) return null;
                            const selectedDefect = row.items?.find((i: any) => i.id === selectedId);
                            if (!selectedDefect) return null;

                            return (
                              <div className="mt-2.5 p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2 text-xs text-gray-800 animate-fadeIn shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-indigo-950 text-sm">
                                      {selectedDefect.item_title}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                        selectedDefect.priority === "Alta"
                                          ? "bg-rose-100 text-rose-700 border border-rose-300"
                                          : selectedDefect.priority === "Baixa"
                                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                                          : "bg-amber-100 text-amber-800 border border-amber-300"
                                      }`}
                                    >
                                      Prioridade: {selectedDefect.priority || "Médio"}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setSelectedDefectByPlate((prev) => ({
                                        ...prev,
                                        [row.plate]: "",
                                      }))
                                    }
                                    className="text-gray-400 hover:text-gray-700 text-[11px] font-bold underline cursor-pointer"
                                  >
                                    Limpar seleção
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-gray-500 block font-semibold">Descrição / Observação:</span>
                                    <span className="font-bold text-gray-900">
                                      {selectedDefect.description || "Nenhuma observação informada."}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block font-semibold">Motorista / Apontado por:</span>
                                    <span className="font-bold text-gray-900">
                                      {selectedDefect.profiles?.full_name || selectedDefect.driver_name || "N/A"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block font-semibold">Data do Registro:</span>
                                    <span className="font-bold text-gray-900">
                                      {selectedDefect.created_at
                                        ? new Date(selectedDefect.created_at).toLocaleString("pt-BR")
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block font-semibold">Foto Anexa:</span>
                                    {selectedDefect.photo_url ? (
                                      <button
                                        onClick={() => setPreviewPhoto(selectedDefect.photo_url)}
                                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold cursor-pointer"
                                      >
                                        <Image size={13} /> Visualizar Foto do Defeito
                                      </button>
                                    ) : (
                                      <span className="text-gray-400">Sem foto registrada</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-4 text-right align-top">
                          <button
                            onClick={() => togglePlateExpand(row.plate)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Alternar lista completa de defeitos"
                          >
                            {expandedPlates[row.plate] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Full List of Defects for this Plate */}
                      {expandedPlates[row.plate] && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={4} className="p-4 border-b border-gray-200">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                                  <Wrench size={14} className="text-indigo-600" />
                                  Defeitos Pendentes da Placa: <span className="font-mono text-indigo-600">{row.plate}</span> ({row.count})
                                </h4>
                                <span className="text-[10px] text-gray-500 font-bold">
                                  Mostrando todos os {row.count} apontamentos
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {row.items?.map((item: any, idxItem: number) => (
                                  <div
                                    key={item.id || idxItem}
                                    className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2 relative"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                          {idxItem + 1}
                                        </span>
                                        <span className="font-extrabold text-xs text-gray-900">
                                          {item.item_title}
                                        </span>
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                                          item.priority === "Alta"
                                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                                            : item.priority === "Baixa"
                                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                                            : "bg-amber-100 text-amber-800 border border-amber-200"
                                        }`}
                                      >
                                        {item.priority || "Médio"}
                                      </span>
                                    </div>

                                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                      {item.description || "Sem observação detalhada."}
                                    </p>

                                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                                      <span>
                                        👤 {item.profiles?.full_name || item.driver_name || "Motorista N/A"}
                                      </span>
                                      <span>
                                        📅 {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "-"}
                                      </span>
                                    </div>

                                    {item.photo_url && (
                                      <div className="pt-1">
                                        <button
                                          onClick={() => setPreviewPhoto(item.photo_url)}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                        >
                                          <Image size={12} /> Ver Foto Anexa
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ) : (
                    <tr key={row.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      {selectedReport === "vehicles" ? (
                      <>
                        <td className="py-3 px-4 font-black text-gray-900">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-mono text-indigo-700 font-extrabold text-sm">{row.plate}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              row.asset_category === "Reboque"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}>
                              {row.asset_category || "Veículo"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-800 text-xs">{row.model || "-"}</div>
                          <div className="text-[10px] text-gray-500 uppercase">{row.type || "-"}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-700">
                          {row.manufacture_year || row.model_year ? `${row.manufacture_year || '-'}/${row.model_year || '-'}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <div className="text-gray-900 font-bold">{row.chassi || "-"}</div>
                          {row.renavam && <div className="text-[10px] text-gray-500">RN: {row.renavam}</div>}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="text-gray-800 font-medium">
                            {[row.color, row.fuel_type].filter(Boolean).join(" • ") || "-"}
                          </div>
                          {row.antt && <div className="text-[10px] text-gray-500 font-mono">ANTT: {row.antt}</div>}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-gray-700">
                          {row.branches?.name || "Sem Filial"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-600 text-sm">
                          {row.current_km ? `${Number(row.current_km).toLocaleString("pt-BR")} km` : "0 km"}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-medium text-gray-600 whitespace-nowrap">
                          {row.last_km_date ? new Date(row.last_km_date).toLocaleString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {row.active !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "drivers" ? (
                      <>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          <div className="font-extrabold text-gray-900 text-sm">{row.full_name}</div>
                          {row.email && <div className="text-[10px] text-gray-500 font-normal">{row.email}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200 text-xs font-bold">
                            🏢 {row.branches?.name || "Sem Filial"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-indigo-600 text-sm">
                          {row.driver_performance?.[0]?.score ?? row.driver_performance?.score ?? "-"} pts
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {row.active !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "branches" ? (
                      <>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                            🏢 {row.name}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {row.city && row.state ? `${row.city} / ${row.state}` : row.city || row.location || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {row.manager ? (
                            <div className="font-extrabold text-gray-800 flex items-center gap-1">
                              👤 {row.manager}
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal italic">Não informado</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 text-xs font-black">
                              🚚 {row.totalVehicles || 0}
                            </span>
                            {row.trailersCount > 0 && (
                              <span className="text-[10px] text-purple-700 font-semibold mt-0.5">
                                ({row.vehiclesCount || 0} veíc. + {row.trailersCount} reb.)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-xs font-black">
                            👨‍✈️ {row.driversCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <div className="text-gray-800 font-bold">{row.phone || "-"}</div>
                          {row.cnpj && <div className="text-[10px] text-gray-500">CNPJ: {row.cnpj}</div>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {row.active !== false ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "fuelings" ? (
                      <>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-gray-900">
                          {row.plate || row.vehicles?.plate || row.trailers?.plate || "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          {row.profiles?.full_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-amber-600 text-sm">
                          {row.liters || 0} L
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-xs font-semibold">
                          {row.location || "-"}
                        </td>
                      </>
                    ) : selectedReport === "mileage" ? (
                      <>
                        <td className="py-3 px-4 font-black text-gray-900">{row.plate}</td>
                        <td className="py-3 px-4">{row.startOdo}</td>
                        <td className="py-3 px-4">{row.endOdo}</td>
                        <td className="py-3 px-4 font-black text-indigo-600">{row.kmDriven} km</td>
                        <td className="py-3 px-4">{row.count}</td>
                      </>
                    ) : selectedReport === "resolved_issues" ? (
                      <>
                        <td className="py-3 px-4 text-gray-500">
                          {row.resolved_at
                            ? new Date(row.resolved_at).toLocaleDateString("pt-BR")
                            : row.created_at
                            ? new Date(row.created_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-mono text-indigo-700 font-extrabold text-sm">
                              {row.plate || row.trailers?.plate || row.vehicles?.plate || "-"}
                            </span>
                            {(row.is_trailer || row.trailer_id || (row.trailers?.plate && (!row.vehicles?.plate || row.plate === row.trailers?.plate))) && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-black rounded uppercase">
                                Reboque
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">{row.item_title || "-"}</td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.description || row.observation || "-"}>
                          {row.description || row.observation || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.resolution_notes || "-"}>
                          {row.resolution_notes || "-"}
                        </td>
                        <td className="py-3 px-4">{row.resolver?.full_name || row.profiles?.full_name || "Sistema"}</td>
                        <td className="py-3 px-4 font-black text-emerald-600">
                          R$ {Number(row.resolution_value || 0).toFixed(2)}
                        </td>
                      </>
                    ) : selectedReport === "checklists" || selectedReport === "history" ? (
                      <>
                        <td className="py-3 px-4 text-gray-500">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-mono text-indigo-700 font-extrabold text-sm">
                              {row.plate || row.trailers?.plate || row.vehicles?.plate || "-"}
                            </span>
                            {(row.is_trailer || row.trailer_id || (row.trailers?.plate && (!row.vehicles?.plate || row.plate === row.trailers?.plate))) && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-black rounded uppercase">
                                Reboque
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">{row.item_title || "-"}</td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.description || row.observation || "-"}>
                          {row.description || row.observation || "-"}
                        </td>
                        <td className="py-3 px-4">{row.profiles?.full_name || "-"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.status === "resolved"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.status === "waiting"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.status || "pendente"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "notifications" || selectedReport === "auto_alerts" ? (
                      <>
                        <td className="py-3 px-4 text-gray-500">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          {row.plate || row.vehicles?.plate || row.trailers?.plate || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {row.title || row.message || row.alert_type || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.description || "-"}>
                          {row.description || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.active !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "schedules" ? (
                      <>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {row.start_at ? new Date(row.start_at).toLocaleString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 font-black text-gray-900">
                          {row.trailers?.plate ? (
                            <span className="flex flex-col">
                              <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-xs w-fit font-mono font-bold">
                                Reboque: {row.trailers.plate}
                              </span>
                              {row.vehicles?.plate && (
                                <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                  Trator: {row.vehicles.plate}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="font-mono text-indigo-600 font-black">
                              {row.vehicles?.plate || row.plate || "Sem Placa"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-800">
                          {row.profiles?.full_name || row.driver_name || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700 text-right">
                          {row.start_km > 0 ? `${Number(row.start_km).toLocaleString("pt-BR")} km` : "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700 text-right">
                          {row.end_km > 0 ? `${Number(row.end_km).toLocaleString("pt-BR")} km` : "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-indigo-600 text-right">
                          {row.total_km > 0
                            ? `${Number(row.total_km).toLocaleString("pt-BR")} km`
                            : row.start_km > 0 && row.end_km > 0
                            ? `${Number(row.end_km - row.start_km).toLocaleString("pt-BR")} km`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-right">
                          {row.liters > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200 text-xs font-mono font-black">
                              ⛽ {Number(row.liters).toLocaleString("pt-BR")} L
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.status === "completed" || row.status === "finished" || row.status === "concluida"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : row.status === "in_progress" || row.status === "em_andamento"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {row.status === "completed" ? "Concluída" : row.status === "in_progress" ? "Em Andamento" : row.status || "Agendada"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "inventory" ? (
                      <>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {row.date || row.created_at
                            ? new Date(row.date || row.created_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-gray-900 text-sm">{row.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {row.sku ? `SKU: ${row.sku}` : "Sem SKU"} • {row.category || "Geral"}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-800 text-xs">
                          {row.nf_number || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-indigo-700 text-xs">
                          {row.plate || "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-gray-900 text-sm">
                          {Number(row.current_quantity ?? row.quantity ?? 0)} un
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                          R$ {Number(row.unit_price ?? row.average_cost ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              Number(row.current_quantity ?? row.quantity ?? 0) <= Number(row.min_quantity || 0)
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {Number(row.current_quantity ?? row.quantity ?? 0) <= Number(row.min_quantity || 0)
                              ? "Estoque Baixo"
                              : "Normal"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "purchases" ? (
                      <>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {row.date || row.created_at
                            ? new Date(row.date || row.created_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          {row.inventory_items?.name || row.name || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-800">
                          {row.nf_number || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-indigo-700">
                          {row.plate || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {row.inventory_suppliers?.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {row.quantity || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                          R$ {Number(row.unit_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          R$ {Number(row.total_price || (Number(row.quantity || 0) * Number(row.unit_price || 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : selectedReport === "stock_out" ? (
                      <>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {row.date || row.created_at
                            ? new Date(row.date || row.created_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">
                          {row.inventory_items?.name || row.name || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-indigo-700">
                          {row.plate || row.vehicles?.plate || row.trailers?.plate || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={row.notes || "-"}>
                          {row.notes || "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {Math.abs(Number(row.quantity || 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                          R$ {Number(row.unit_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                          R$ {Number(row.total_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : selectedReport === "suppliers" ? (
                      <>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-gray-900 text-sm">{row.name || "-"}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-800 text-xs">
                          {row.cnpj_cpf || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-800 font-semibold text-xs">
                          {row.contact_name || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-800 text-xs">
                          {row.phone || "-"}
                        </td>
                        <td className="py-3 px-4 text-indigo-600 font-medium text-xs">
                          {row.email || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {row.address || "-"}
                        </td>
                      </>
                    ) : selectedReport === "user_audits" || selectedReport === "system_audits" ? (
                      <>
                        <td className="py-3 px-4 text-gray-700 font-mono text-xs whitespace-nowrap font-medium">
                          {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-gray-900 text-sm">{row.user_display || row.user_name || row.user_email || "-"}</div>
                          {row.user_role && (
                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {row.user_role}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                            <span className="text-indigo-600 font-black">{row.module || "Geral"}</span>
                            {row.entity && <span className="text-slate-400">›</span>}
                            {row.entity && <span className="text-slate-700">{row.entity}</span>}
                            {row.entity_id && <span className="text-slate-400 text-[10px]">#{row.entity_id}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.action === "CRIAR" || row.action === "LOGIN"
                                ? "bg-emerald-100 text-emerald-800"
                                : row.action === "EXCLUIR" || row.action === "BLOQUEAR" || row.action === "FALHA_LOGIN"
                                ? "bg-rose-100 text-rose-800"
                                : row.action === "EDITAR" || row.action === "RESET_SENHA" || row.action === "ALTERAR_SENHA"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {row.action || row.type || "Ação"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 text-xs font-medium max-w-md">
                          {row.what_changed || row.reason || row.field_changed || "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          {row.created_at || row.resolved_at
                            ? new Date(row.created_at || row.resolved_at).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-gray-800">
                          {row.plate || row.vehicles?.plate || row.trailers?.plate || row.name || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {row.item_title || row.title || row.item_name || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {row.profiles?.full_name || row.resolver?.full_name || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {row.status ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                row.status === "resolved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : row.status === "waiting"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {row.status}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Defect Photo Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Image size={16} className="text-indigo-600" /> Foto do Defeito
              </h3>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 font-bold cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-hidden rounded-xl bg-gray-900 flex items-center justify-center">
              <img
                src={previewPhoto}
                alt="Foto do defeito"
                className="max-h-[70vh] object-contain w-full"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
