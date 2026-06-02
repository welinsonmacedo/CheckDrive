import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";
import {
  BarChart3,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Search,
  Calendar,
  ChevronRight,
  Truck,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import DefectPrintModal from "./DefectPrintModal";

export default function ReportsTab() {
  const [activeReport, setActiveReport] = useState<
    "scores" | "defects" | "mileage"
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

  // Defects Data
  const [defectsData, setDefectsData] = useState<any[]>([]);
  const [defectsStats, setDefectsStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    mostCommon: [] as any[],
  });

  // Scores Data
  const [closures, setClosures] = useState<any[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<string>("");
  const [closureItems, setClosureItems] = useState<any[]>([]);

  // Mileage Data
  const [mileageData, setMileageData] = useState<any[]>([]);

  useEffect(() => {
    if (activeReport === "defects") {
      fetchDefectsReport();
    } else if (activeReport === "scores") {
      fetchClosures();
    } else if (activeReport === "mileage") {
      fetchMileageReport();
    }
  }, [activeReport, startDate, endDate]);

  useEffect(() => {
    if (selectedClosure) {
      fetchClosureItems(selectedClosure);
    }
  }, [selectedClosure]);

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("score_closings")
        .select("*")
        .gte("period_start", startDate)
        .lte("period_end", endDate)
        .order("period_start", { ascending: false });

      if (!error && data) {
        setClosures(data);
        if (data.length > 0 && !selectedClosure) {
          setSelectedClosure(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClosureItems = async (closingId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("score_closing_items")
        .select("*, profiles(full_name, score_profiles(name))")
        .eq("closing_id", closingId)
        .order("score", { ascending: false });

      if (!error && data) {
        setClosureItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMileageReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_submissions")
        .select(
          "id, odometer, type, created_at, profiles(full_name), vehicles(plate)",
        )
        .not("odometer", "is", null)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Calculate mileage per vehicle/driver combination
      const mileageStats: Record<string, any> = {};

      if (data) {
        data.forEach((sub: any) => {
          if (!sub.vehicles?.plate || !sub.profiles?.full_name || !sub.odometer)
            return;

          const key = `${sub.vehicles.plate}-${sub.profiles.full_name}`;
          if (!mileageStats[key]) {
            mileageStats[key] = {
              vehiclePlate: sub.vehicles.plate,
              driverName: sub.profiles.full_name,
              minOdometer: sub.odometer,
              maxOdometer: sub.odometer,
              submissionsCount: 1,
              distance: 0,
            };
          } else {
            mileageStats[key].submissionsCount += 1;
            if (sub.odometer < mileageStats[key].minOdometer) {
              mileageStats[key].minOdometer = sub.odometer;
            }
            if (sub.odometer > mileageStats[key].maxOdometer) {
              mileageStats[key].maxOdometer = sub.odometer;
            }
            mileageStats[key].distance =
              mileageStats[key].maxOdometer - mileageStats[key].minOdometer;
          }
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
      <div className={selectedDefectToPrint ? 'print:hidden' : ''}>
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-app-border print:hidden">
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveReport("defects")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === "defects" ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"}`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} /> Relatório de Defeitos
            </div>
          </button>
          <button
            onClick={() => setActiveReport("scores")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === "scores" ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"}`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={16} /> Pontuação por Período
            </div>
          </button>
          <button
            onClick={() => setActiveReport("mileage")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === "mileage" ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-main"}`}
          >
            <div className="flex items-center gap-2">
              <Truck size={16} /> KM Rodado
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-40">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              size={14}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-app-border bg-white text-xs font-bold text-text-main outline-none focus:border-primary"
            />
          </div>
          <span className="text-text-muted font-bold text-xs">até</span>
          <div className="relative flex-1 md:w-40">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              size={14}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-app-border bg-white text-xs font-bold text-text-main outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-black text-text-main uppercase tracking-widest">
          {activeReport === "defects"
            ? "Relatório de Defeitos"
            : activeReport === "scores"
              ? "Pontuação por Período"
              : "Relatório de KM Rodado"}
        </h1>
        <p className="text-sm font-bold text-text-muted mt-2">
          {activeReport === "defects" || activeReport === "mileage"
            ? `Período: ${format(parseISO(startDate), "dd/MM/yyyy")} até ${format(parseISO(endDate), "dd/MM/yyyy")}`
            : closures &&
                selectedClosure &&
                closures.find((c) => c.id === selectedClosure)?.period_start
              ? `Fechamento: ${format(parseISO(closures.find((c) => c.id === selectedClosure)!.period_start), "dd/MM/yyyy")}`
              : ""}
        </p>
      </div>

      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-text-main text-xs font-bold rounded-xl transition-colors"
        >
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeReport === "defects" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Total no Período
                    </p>
                    <p className="text-2xl font-black text-text-main">
                      {defectsStats.total}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-danger flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Pendentes
                    </p>
                    <p className="text-2xl font-black text-text-main">
                      {defectsStats.pending}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-app-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Solucionados
                    </p>
                    <p className="text-2xl font-black text-text-main">
                      {defectsStats.resolved}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Defects */}
                <div className="bg-white rounded-2xl border border-app-border shadow-sm p-5">
                  <h3 className="text-sm font-black text-text-main tracking-tight mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-primary" />
                    Principais Reincidências
                  </h3>
                  <div className="space-y-4">
                    {defectsStats.mostCommon.length === 0 && (
                      <p className="text-xs text-text-muted italic py-4 text-center">
                        Nenhum defeito no período.
                      </p>
                    )}
                    {defectsStats.mostCommon.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-text-main">
                          <span className="truncate pr-2">{item.title}</span>
                          <span className="text-primary">{item.count}</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(item.count / defectsStats.total) * 100}%`,
                            }}
                            className="bg-primary h-full rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defects List */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:overflow-visible">
                  <div className="p-5 border-b border-app-border bg-zinc-50/50">
                    <h3 className="text-sm font-black text-text-main tracking-tight flex items-center gap-2">
                      <FileText size={18} className="text-primary" />
                      Listagem de Ocorrências
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto max-h-[400px] print:max-h-none print:overflow-visible">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-50/80 sticky top-0 border-b border-app-border">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Data
                          </th>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Motorista
                          </th>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Veículo/Reboque
                          </th>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Defeito
                          </th>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Status
                          </th>
                          <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest print:hidden text-right">
                            Ação
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {defectsData.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center py-8 text-xs text-text-muted uppercase tracking-widest font-bold"
                            >
                              Sem dados para exibir
                            </td>
                          </tr>
                        ) : (
                          defectsData.map((d) => (
                            <tr key={d.id} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-3 text-xs font-bold text-text-muted">
                                {format(parseISO(d.created_at), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </td>
                              <td className="px-4 py-3 text-xs font-black text-text-main">
                                {d.profiles?.full_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-xs font-black text-text-main">
                                {d.vehicles?.plate
                                  ? d.trailers?.plate
                                    ? `${d.vehicles.plate} / ${d.trailers.plate}`
                                    : d.vehicles.plate
                                  : d.trailers?.plate || "-"}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-text-main">
                                {d.item_title}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    d.status === "resolved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {d.status === "resolved"
                                    ? "Resolvido"
                                    : "Pendente"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right print:hidden">
                                <button
                                  onClick={() => setSelectedDefectToPrint(d)}
                                  title="Imprimir Ficha"
                                  className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors inline-flex"
                                >
                                  <Printer size={16} />
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
          )}

          {activeReport === "scores" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden min-h-[400px] flex flex-col print:shadow-none print:border-none print:overflow-visible print:min-h-0 print:h-auto">
                {closures.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted">
                    <BarChart3 size={48} className="opacity-20 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      Nenhum fechamento encontrado no período
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-app-border bg-zinc-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-primary" />
                        <h3 className="text-sm font-black text-text-main tracking-tight">
                          Fechamentos Concluídos
                        </h3>
                      </div>
                      <select
                        className="h-10 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary print:hidden"
                        value={selectedClosure}
                        onChange={(e) => setSelectedClosure(e.target.value)}
                      >
                        {closures.map((c) => (
                          <option key={c.id} value={c.id}>
                            {format(parseISO(c.period_start), "dd/MM/yyyy")} a{" "}
                            {format(parseISO(c.period_end), "dd/MM/yyyy")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 overflow-auto print:overflow-visible">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-50/80 sticky top-0 border-b border-app-border">
                          <tr>
                            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                              Motorista
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                              Perfil
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                              Escalas
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                              Pontuação Final
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                          {closureItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center py-8 text-xs text-text-muted uppercase tracking-widest font-bold"
                              >
                                Sem dados para exibir
                              </td>
                            </tr>
                          ) : (
                            closureItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-50/50">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                                      {idx + 1}
                                    </div>
                                    <span className="text-xs font-black text-text-main">
                                      {item.profiles?.full_name || "Motorista"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-[10px] font-bold text-text-muted uppercase">
                                  {item.profiles?.score_profiles?.name ||
                                    "Geral"}
                                </td>
                                <td className="px-5 py-4 text-xs font-bold text-text-muted">
                                  {item.total_checklists || 0}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className="text-sm font-black text-primary">
                                    {item.score}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeReport === "mileage" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-app-border shadow-sm overflow-hidden min-h-[400px] flex flex-col print:shadow-none print:border-none print:overflow-visible print:min-h-0 print:h-auto">
                <div className="p-4 border-b border-app-border bg-zinc-50/50">
                  <h3 className="text-sm font-black text-text-main tracking-tight flex items-center gap-2">
                    <Truck size={18} className="text-primary" />
                    Relatório de KM Rodado
                  </h3>
                </div>
                <div className="flex-1 overflow-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50/80 sticky top-0 border-b border-app-border">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Motorista
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Veículo
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Checklists (Qtd)
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          KM Inicial
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          KM Final
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                          Distância (KM)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {mileageData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-8 text-xs text-text-muted uppercase tracking-widest font-bold"
                          >
                            Nenhum dado encontrado no período
                          </td>
                        </tr>
                      ) : (
                        mileageData.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="px-5 py-4 text-xs font-black text-text-main">
                              {item.driverName}
                            </td>
                            <td className="px-5 py-4 text-xs font-black text-text-main">
                              {item.vehiclePlate}
                            </td>
                            <td className="px-5 py-4 text-xs font-bold text-text-muted">
                              {item.submissionsCount}
                            </td>
                            <td className="px-5 py-4 text-xs font-mono font-medium text-text-muted">
                              {item.minOdometer.toLocaleString("pt-BR")}
                            </td>
                            <td className="px-5 py-4 text-xs font-mono font-medium text-text-muted">
                              {item.maxOdometer.toLocaleString("pt-BR")}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="text-sm font-black text-primary">
                                {item.distance.toLocaleString("pt-BR")}
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
