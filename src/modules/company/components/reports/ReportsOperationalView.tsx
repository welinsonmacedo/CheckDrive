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
        supabase.from("trailers").select("id, plate, branch_id").eq("company_id", companyId),
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
            .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
            profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
          }));

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
            .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
            profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
          }));

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
            const plate = iss.vehicles?.plate || iss.trailers?.plate || "Sem Placa";
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

        case "notifications": {
          let { data, error } = await supabase
            .from("auto_alerts")
            .select("*, vehicles(plate), trailers(plate)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
          }));

          if (filters.status === "active") result = result.filter((r: any) => r.active === true);
          if (filters.status === "inactive") result = result.filter((r: any) => r.active === false);

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        case "schedules": {
          let query = supabase
            .from("schedules")
            .select("*, profiles(full_name, branch_id), vehicles(plate, branch_id), trailers(plate, branch_id)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
            profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-", branch_id: null },
          }));

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

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        // --- CATEGORY: FROTA ---
        case "vehicles": {
          const [vRes, tRes] = await Promise.all([
            supabase
              .from("vehicles")
              .select("*, branches(name)")
              .eq("company_id", companyId)
              .order("plate"),
            supabase
              .from("trailers")
              .select("*, branches(name)")
              .eq("company_id", companyId)
              .order("plate"),
          ]);

          const vData = vRes.data || [];
          const tData = (tRes.data || []).map((t: any) => ({
            ...t,
            model: t.model || "Reboque",
            type: t.type || "Reboque",
          }));

          let combined = [...vData, ...tData];

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
                v.type?.toLowerCase().includes(term),
            );
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            active: result.filter((v: any) => v.active !== false).length,
          });
          break;
        }

        case "drivers": {
          let query = supabase
            .from("profiles")
            .select("*, branches(name)")
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
            driver_performance: [{ score: perfMap[d.id] ?? 0 }],
          }));

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((d: any) => d.full_name?.toLowerCase().includes(term));
          }

          setReportData(result);
          setSummaryStats({
            total: result.length,
            active: result.filter((d: any) => d.active !== false).length,
          });
          break;
        }

        case "branches": {
          const { data } = await supabase
            .from("branches")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          setReportData(data || []);
          setSummaryStats({ total: (data || []).length });
          break;
        }

        // --- CATEGORY: MANUTENÇÃO ---
        case "history": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
            profiles: r.profiles || { full_name: profilesMap[r.driver_id] || "-" },
          }));

          if (filters.vehicleId !== "all") {
            result = result.filter((r: any) => r.vehicle_id === filters.vehicleId || r.trailer_id === filters.vehicleId);
          }

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        case "resolved_issues": {
          let query = supabase
            .from("checklist_issues")
            .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
            resolver: r.resolver || { full_name: profilesMap[r.resolved_by] || "Sistema" },
          }));

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

        case "auto_alerts": {
          let { data, error } = await supabase
            .from("auto_alerts")
            .select("*, vehicles(plate), trailers(plate)")
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

          let result = (data || []).map((r: any) => ({
            ...r,
            vehicles: r.vehicles || vehiclesMap[r.vehicle_id] || null,
            trailers: r.trailers || trailersMap[r.trailer_id] || null,
          }));

          setReportData(result);
          setSummaryStats({ total: result.length });
          break;
        }

        // --- CATEGORY: ESTOQUE ---
        case "inventory": {
          const { data } = await supabase
            .from("inventory_items")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          let result = data || [];
          if (filters.status === "low") {
            result = result.filter((i) => Number(i.quantity) <= Number(i.min_quantity || 0));
          }

          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            result = result.filter((i) => i.name?.toLowerCase().includes(term));
          }

          setReportData(result);
          setSummaryStats({
            totalItems: result.length,
            lowStockCount: result.filter((i) => Number(i.quantity) <= Number(i.min_quantity || 0)).length,
          });
          break;
        }

        case "purchases": {
          let { data, error } = await supabase
            .from("inventory_transactions")
            .select("*, inventory_items(name)")
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

          const result = data || [];
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
          let { data, error } = await supabase
            .from("inventory_transactions")
            .select("*, inventory_items(name)")
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

          setReportData(data || []);
          setSummaryStats({ total: (data || []).length });
          break;
        }

        case "suppliers": {
          const { data } = await supabase
            .from("suppliers")
            .select("*")
            .eq("company_id", companyId)
            .order("name");

          setReportData(data || []);
          setSummaryStats({ total: (data || []).length });
          break;
        }

        // --- CATEGORY: ABASTECIMENTO ---
        case "fuelings": {
          let query = supabase
            .from("checklist_submissions")
            .select("*, vehicles(plate, branch_id), trailers(plate, branch_id)")
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
          let totalCost = 0;

          result = result.map((row: any) => {
            let detailsObj: any = {};
            try {
              detailsObj =
                typeof row.details === "string" ? JSON.parse(row.details) : row.details || {};
            } catch (e) {
              console.error(e);
            }
            const liters = Number(detailsObj.liters || detailsObj.litros) || 0;
            const cost = Number(detailsObj.total_value || detailsObj.valor_total) || 0;

            totalLiters += liters;
            totalCost += cost;

            return {
              ...row,
              vehicles: row.vehicles || vehiclesMap[row.vehicle_id] || null,
              trailers: row.trailers || trailersMap[row.trailer_id] || null,
              profiles: row.profiles || { full_name: profilesMap[row.driver_id] || "-" },
              parsedDetails: detailsObj,
              liters,
              cost,
            };
          });

          setReportData(result);
          setSummaryStats({
            totalFuelings: result.length,
            totalLiters: Math.round(totalLiters),
            totalCost,
          });
          break;
        }

        case "mileage": {
          let { data, error } = await supabase
            .from("checklist_submissions")
            .select("id, odometer, created_at, vehicle_id, trailer_id, driver_id")
            .eq("company_id", companyId)
            .not("odometer", "is", null)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: true });

          if (error || !data) {
            const fbRes = await supabase
              .from("checklist_submissions")
              .select("*")
              .eq("company_id", companyId)
              .gte("created_at", startIso)
              .lte("created_at", endIso)
              .order("created_at", { ascending: true });
            data = (fbRes.data || []).filter((s: any) => s.odometer !== null && s.odometer !== undefined);
          }

          let subs = data || [];
          if (filters.vehicleId !== "all") {
            subs = subs.filter((s: any) => s.vehicle_id === filters.vehicleId || s.trailer_id === filters.vehicleId);
          }

          const groupedByVehicle: Record<string, any[]> = {};

          subs.forEach((s: any) => {
            const plate =
              vehiclesMap[s.vehicle_id]?.plate ||
              trailersMap[s.vehicle_id]?.plate ||
              trailersMap[s.trailer_id]?.plate ||
              "Sem Placa";
            if (!groupedByVehicle[plate]) groupedByVehicle[plate] = [];
            groupedByVehicle[plate].push(s);
          });

          const mileageSummary = Object.entries(groupedByVehicle).map(([plate, list]) => {
            const minOdo = list[0]?.odometer || 0;
            const maxOdo = list[list.length - 1]?.odometer || 0;
            const kmDriven = Math.max(0, maxOdo - minOdo);
            return {
              plate,
              startOdo: minOdo,
              endOdo: maxOdo,
              kmDriven,
              count: list.length,
            };
          });

          setReportData(mileageSummary);
          setSummaryStats({
            totalVehiclesEvaluated: mileageSummary.length,
            totalKmDriven: mileageSummary.reduce((acc, curr) => acc + curr.kmDriven, 0),
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

          let result = (data || []).map((a: any) => ({
            ...a,
            profiles: { full_name: profilesMap[a.user_id || a.driver_id] || "-" },
          }));

          setReportData(result);
          setSummaryStats({ total: result.length });
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
        headers = ["Data", "Placa", "Item / Defeito", "Motorista", "Status", "Descrição"];
        rows = (reportData || []).map((d) => [
          new Date(d.created_at).toLocaleString("pt-BR"),
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.item_title,
          d.profiles?.full_name || "-",
          d.status,
          d.description || "-",
        ]);
      } else if (selectedReport === "pending_by_plate") {
        headers = ["Placa", "Qtd Pendências", "Itens Pendentes"];
        rows = (reportData || []).map((d) => [
          d.plate,
          d.count,
          (d.items || []).map((i: any) => i?.item_title || "").join(" | "),
        ]);
      } else if (selectedReport === "vehicles") {
        headers = ["Placa", "Modelo", "Tipo", "Filial", "Status"];
        rows = (reportData || []).map((d) => [
          d.plate,
          d.model || "-",
          d.type || "-",
          d.branches?.name || "Sem Filial",
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
      } else if (selectedReport === "resolved_issues") {
        headers = ["Data Resolução", "Placa", "Item", "Resolvido Por", "Custo (R$)"];
        rows = (reportData || []).map((d) => [
          d.resolved_at ? new Date(d.resolved_at).toLocaleString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.item_title,
          d.resolver?.full_name || "Sistema",
          Number(d.resolution_value || 0).toFixed(2),
        ]);
      } else if (selectedReport === "fuelings") {
        headers = ["Data", "Placa", "Motorista", "Litros (L)", "Valor Total (R$)"];
        rows = (reportData || []).map((d) => [
          new Date(d.created_at).toLocaleString("pt-BR"),
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.profiles?.full_name || "-",
          d.liters || 0,
          Number(d.cost || 0).toFixed(2),
        ]);
      } else if (selectedReport === "schedules") {
        headers = ["Data / Hora", "Placa", "Motorista", "Status"];
        rows = (reportData || []).map((d) => [
          d.start_at ? new Date(d.start_at).toLocaleString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.profiles?.full_name || "-",
          d.status || "-",
        ]);
      } else if (selectedReport === "notifications" || selectedReport === "auto_alerts") {
        headers = ["Data", "Placa", "Título / Alerta", "Status"];
        rows = (reportData || []).map((d) => [
          d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "-",
          d.plate || d.vehicles?.plate || d.trailers?.plate || "-",
          d.title || d.message || d.alert_type || "-",
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
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Qtd Pendências</th>
                      <th className="py-3 px-4">Itens com Defeito</th>
                    </>
                  ) : selectedReport === "vehicles" ? (
                    <>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Modelo</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Filial</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  ) : selectedReport === "drivers" ? (
                    <>
                      <th className="py-3 px-4">Nome Completo</th>
                      <th className="py-3 px-4">Filial</th>
                      <th className="py-3 px-4">Pontuação</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  ) : selectedReport === "fuelings" ? (
                    <>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Motorista</th>
                      <th className="py-3 px-4">Litros</th>
                      <th className="py-3 px-4">Valor Total (R$)</th>
                    </>
                  ) : selectedReport === "mileage" ? (
                    <>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">KM Inicial</th>
                      <th className="py-3 px-4">KM Final</th>
                      <th className="py-3 px-4">Distância Rodada (KM)</th>
                      <th className="py-3 px-4">Checklists</th>
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
                  <tr key={row.id || idx} className="hover:bg-gray-50/50 transition-colors">
                    {selectedReport === "pending_by_plate" ? (
                      <>
                        <td className="py-3 px-4 font-black text-indigo-600">{row.plate}</td>
                        <td className="py-3 px-4 font-bold">{row.count}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {(row.items || []).map((i: any) => i?.item_title || "").join(", ")}
                        </td>
                      </>
                    ) : selectedReport === "vehicles" ? (
                      <>
                        <td className="py-3 px-4 font-black text-gray-900">{row.plate}</td>
                        <td className="py-3 px-4">{row.model || "-"}</td>
                        <td className="py-3 px-4 uppercase">{row.type || "-"}</td>
                        <td className="py-3 px-4">{row.branches?.name || "Sem Filial"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.active !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "drivers" ? (
                      <>
                        <td className="py-3 px-4 font-extrabold text-gray-900">{row.full_name}</td>
                        <td className="py-3 px-4">{row.branches?.name || "Sem Filial"}</td>
                        <td className="py-3 px-4 font-black text-indigo-600">
                          {row.driver_performance?.[0]?.score ?? row.driver_performance?.score ?? "-"} pts
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              row.active !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.active !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </>
                    ) : selectedReport === "fuelings" ? (
                      <>
                        <td className="py-3 px-4">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4 font-black text-gray-900">{row.plate || row.vehicles?.plate || row.trailers?.plate || "-"}</td>
                        <td className="py-3 px-4">{row.profiles?.full_name || "-"}</td>
                        <td className="py-3 px-4 font-bold text-amber-600">{row.liters || 0} L</td>
                        <td className="py-3 px-4 font-black text-emerald-600">
                          R$ {Number(row.cost || 0).toFixed(2)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
