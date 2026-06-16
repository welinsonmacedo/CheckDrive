import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
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
  ArrowRight
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import DefectPrintModal from "@/src/modules/company/components/DefectPrintModal";

export default function ReportsTab() {
  const [activeReport, setActiveReport] = useState<
    "defects" | "mileage"
  >("defects");

  // Date filters
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );

  const [loading, setLoading] = useState(false);
  const [selectedDefectToPrint, setSelectedDefectToPrint] = useState<
    any | null
  >(null);

  const [printMode, setPrintMode] = useState<"all" | "pending" | "resolved">("all");

  // Defects Data
  const [defectsData, setDefectsData] = useState<any[]>([]);
  const [defectsStats, setDefectsStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    mostCommon: [] as any[],
  });

  // Mileage Data
  const [mileageData, setMileageData] = useState<any[]>([]);

  useEffect(() => {
    if (activeReport === "defects") {
      fetchDefectsReport();
    } else if (activeReport === "mileage") {
      fetchMileageReport();
    }
  }, [activeReport, startDate, endDate]);

  const fetchMileageReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_submissions")
        .select(
          "id, odometer, type, created_at, trailer_id, profiles(full_name), vehicles(plate)",
        )
        .not("odometer", "is", null)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch trailers separately safely
      const { data: trailersReq } = await supabase.from("trailers").select("id, plate");
      const trailersMap = new Map((trailersReq || []).map((t: any) => [t.id, t.plate]));

      // Calculate mileage per vehicle/trailer and driver combination
      const mileageStats: Record<string, any> = {};

      if (data) {
        // Group submissions by vehicle to compute correct deltas sequentially
        const subsByVehicle: Record<string, any[]> = {};
        data.forEach((sub: any) => {
          if (!sub.vehicles?.plate) return;
          if (!subsByVehicle[sub.vehicles.plate]) subsByVehicle[sub.vehicles.plate] = [];
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
            if (sub.odometer < mileageStats[vKey].minOdometer) mileageStats[vKey].minOdometer = sub.odometer;
            if (sub.odometer > mileageStats[vKey].maxOdometer) mileageStats[vKey].maxOdometer = sub.odometer;
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
              if (sub.odometer < mileageStats[tKey].minOdometer) mileageStats[tKey].minOdometer = sub.odometer;
              if (sub.odometer > mileageStats[tKey].maxOdometer) mileageStats[tKey].maxOdometer = sub.odometer;
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

  const fetchDefectsReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_issues")
        .select(
          "*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name)",
        )
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter((d) => d.status === "pending").length,
        resolved: data.filter((d) => d.status === "resolved").length,
        mostCommon: [] as any[],
      };

      const defectCounts: Record<string, number> = {};
      data.forEach((d) => {
        defectCounts[d.item_title] = (defectCounts[d.item_title] || 0) + 1;
      });

      stats.mostCommon = Object.entries(defectCounts)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setDefectsStats(stats);
      setDefectsData(data);
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
          </div>

          {/* Date Picker Ribbon */}
          <div className="flex items-center gap-3.5 w-full xl:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-44">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 pl-9.5 pr-4 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>
            
            <span className="text-gray-400 font-extrabold text-[10px] uppercase tracking-wider">até</span>
            
            <div className="relative flex-1 sm:flex-initial sm:w-44">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
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
                else if (activeReport === "mileage") fetchMileageReport();
              }}
              className="h-10 w-10 bg-white border border-gray-200 hover:border-gray-300 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm text-gray-500 hover:text-indigo-600 shrink-0"
              title="Recarregar Relatório"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Embedded Print Page Header */}
        <div className="hidden print:block mb-8 border-b border-gray-200 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Relatórios Operacionais</p>
              <h1 className="text-xl font-black text-gray-800 tracking-tight">
                {activeReport === "defects"
                  ? "Inspeção de Defeitos e Sinistros"
                  : "Indicador de Distância e KM Rodado"}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 leading-normal">
                {`Filtro: ${format(parseISO(startDate), "dd/MM/yyyy")} a ${format(parseISO(endDate), "dd/MM/yyyy")}`}
              </p>
              <p className="text-[8px] uppercase tracking-wider font-extrabold text-gray-400 mt-1">SGI - Sistema Integrado</p>
            </div>
          </div>
        </div>

        {/* Printing Action Buttons on top of content */}
        <div className="flex flex-wrap justify-end gap-2.5 print:hidden mt-4">
          {activeReport === "defects" ? (
            <>
              <button
                onClick={() => { setPrintMode("pending"); setTimeout(() => window.print(), 100); }}
                className="flex items-center gap-2 h-9 px-3.5 bg-rose-50 border border-rose-100/60 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
              >
                <Printer size={13} /> Somente Pendentes
              </button>
              <button
                onClick={() => { setPrintMode("resolved"); setTimeout(() => window.print(), 100); }}
                className="flex items-center gap-2 h-9 px-3.5 bg-emerald-50 border border-emerald-100/60 hover:bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-sm"
              >
                <Printer size={13} /> Somente Resolvidos
              </button>
              <button
                onClick={() => { setPrintMode("all"); setTimeout(() => window.print(), 100); }}
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
                                <span className="truncate pr-2 font-medium">{item.title}</span>
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono">{item.count}</span>
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
                        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                        <p>O gráfico acima reúne as 5 anomalias mais recorrentes reportadas por motoristas nos checklists.</p>
                      </div>
                    </div>
                  </div>

                  {/* Defects Tables Block - Expanded in Print */}
                  <div className="lg:col-span-3 space-y-6">
                    
                    {/* A. Pending Defects List */}
                    <div className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible ${printMode === "resolved" ? "print:hidden" : ""}`}>
                      <div className="p-4 border-b border-gray-200/80 bg-rose-50/20 flex justify-between items-center">
                        <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle size={15} className="text-rose-500 animate-pulse" />
                          Inspeções com Pendências Ativas
                        </h3>
                        <span className="text-[10px] bg-rose-50 border border-rose-100/60 text-rose-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {defectsData.filter(d => d.status === "pending").length} abertos
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
                            {defectsData.filter(d => d.status === "pending").length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                                >
                                  Nenhuma pendência operacional pendente
                                </td>
                              </tr>
                            ) : (
                              defectsData.filter(d => d.status === "pending").map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                    {format(parseISO(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                                      {d.description || "Sem descrições adicionais registradas."}
                                    </div>
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

                    {/* B. Resolved Defects List */}
                    <div className={`bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible ${printMode === "pending" ? "print:hidden" : ""}`}>
                      <div className="p-4 border-b border-gray-200/80 bg-emerald-50/15 flex justify-between items-center">
                        <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          Histórico de Ocorrências Solucionadas
                        </h3>
                        <span className="text-[10px] bg-emerald-55 border border-emerald-150 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {defectsData.filter(d => d.status === "resolved").length} resolvidos
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
                            {defectsData.filter(d => d.status === "resolved").length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center py-10 text-xs text-gray-400 uppercase tracking-widest font-black"
                                >
                                  Nenhum registro restaurado neste período
                                </td>
                              </tr>
                            ) : (
                              defectsData.filter(d => d.status === "resolved").map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-5 py-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                    {format(parseISO(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </td>
                                  <td className="px-5 py-4 text-xs font-bold text-emerald-600 whitespace-nowrap">
                                    {d.resolved_at ? format(parseISO(d.resolved_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
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
                                      {d.description || "Sem descrições adicionais."}
                                    </div>
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
                            <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
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
