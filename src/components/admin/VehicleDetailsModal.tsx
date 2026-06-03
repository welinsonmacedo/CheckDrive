import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Truck,
  Wrench,
  User,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

interface VehicleDetailsModalProps {
  vehicle: any;
  onClose: () => void;
}

export default function VehicleDetailsModal({
  vehicle,
  onClose,
}: VehicleDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [closings, setClosings] = useState<any[]>([]);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    fetchClosings();
  }, []);

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicle.id, selectedPeriod, closings]);

  const fetchClosings = async () => {
    const { data } = await supabase
      .from("score_closings")
      .select("*")
      .order("created_at", { ascending: false });
    setClosings(data || []);
  };

  const fetchVehicleDetails = async () => {
    setLoading(true);
    try {
      let startOfMonth: string;
      let endOfMonth: string;

      if (selectedPeriod === "current") {
        const now = new Date();
        startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
        endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ).toISOString();
      } else {
        const closing = closings.find((c) => c.id === selectedPeriod);
        if (closing) {
          startOfMonth = new Date(
            `${closing.period_start}T00:00:00Z`,
          ).toISOString();
          endOfMonth = new Date(
            `${closing.period_end}T23:59:59Z`,
          ).toISOString();
        } else {
          const now = new Date();
          startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
          ).toISOString();
          endOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ).toISOString();
        }
      }

      // Fetch Submissions
      const { data: subs } = await supabase
        .from("checklist_submissions")
        .select(
          "*, profiles!checklist_submissions_driver_id_fkey(full_name), routes(origin, destination)",
        )
        .eq("vehicle_id", vehicle.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      setSubmissions(subs || []);

      // Fetch Issues
      const { data: defs } = await supabase
        .from("checklist_issues")
        .select("*, profiles!checklist_issues_driver_id_fkey(full_name)")
        .eq("vehicle_id", vehicle.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      setIssues(defs || []);
    } catch (error) {
      console.error("Erro ao buscar detalhes do veículo", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubmissionsCnt = () => submissions.length;
  const calculatePendingIssues = () =>
    issues.filter((i) => i.status === "pending").length;
  const calculateResolvedIssues = () =>
    issues.filter((i) => i.status === "resolved").length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:border-0"
      >
        {/* Header */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-zinc-50 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pr-4 gap-2">
            <div>
              <h2 className="text-lg flex items-center gap-2 font-black text-text-main tracking-tight uppercase">
                <Truck size={18} className="text-primary" />
                {vehicle.plate}
              </h2>
              {vehicle.model && (
                <div className="text-xs text-text-muted font-bold mt-1 uppercase tracking-widest">
                  {vehicle.model} {vehicle.type ? ` - ${vehicle.type}` : ""}
                </div>
              )}
            </div>
            <div className="mt-2 sm:mt-0 flex items-center gap-2">
              <Calendar size={16} className="text-text-muted" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input-field text-xs py-1 px-2 h-auto max-w-[200px]"
              >
                <option value="current">Mês Atual / Período Atual</option>
                {closings.map((c) => (
                  <option key={c.id} value={c.id}>
                    Período:{" "}
                    {new Date(
                      `${c.period_start}T12:00:00Z`,
                    ).toLocaleDateString()}{" "}
                    a{" "}
                    {new Date(`${c.period_end}T12:00:00Z`).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-xl bg-white border border-app-border text-text-muted hover:bg-zinc-50 print:hidden"
              title="Imprimir"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-xl bg-white border border-app-border text-text-muted hover:bg-zinc-50 print:hidden"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 print:overflow-visible print:h-auto">
          {loading ? (
            <div className="text-center py-20 animate-pulse text-sm font-bold text-text-muted uppercase">
              Carregando detalhes...
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-50 border border-app-border p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 text-center">
                    Checklists
                  </span>
                  <span className="text-2xl font-black text-text-main">
                    {calculateSubmissionsCnt()}
                  </span>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1 text-center">
                    Pendências (Abertas)
                  </span>
                  <span className="text-xl font-black text-orange-700">
                    {calculatePendingIssues()}
                  </span>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1 text-center">
                    Manutenções Resolvidas
                  </span>
                  <span className="text-xl font-black text-green-700">
                    {calculateResolvedIssues()}
                  </span>
                </div>
              </div>

              {/* Issues Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                  <Wrench size={16} className="text-orange-600" /> Ocorrências /
                  Manutenções
                </h3>
                <div className="overflow-hidden border border-app-border rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Data
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Item
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Motorista
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {issues.length > 0 ? (
                        issues.map((iss) => (
                          <tr key={iss.id} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-3">
                              <div className="font-bold text-xs text-text-main">
                                {new Date(iss.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-text-main">
                              <div>{iss.item_title}</div>
                              {iss.description && (
                                <div className="text-[10px] text-text-muted font-normal mt-0.5 max-w-[200px] whitespace-normal break-words">
                                  {iss.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {iss.status === "pending" ? (
                                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wider">
                                  Pendente
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-wider">
                                  Resolvido
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-medium text-[10px] text-text-muted">
                                <User size={12} />
                                {iss.profiles?.full_name || "Desconhecido"}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs font-bold text-text-muted italic"
                          >
                            Nenhuma ocorrência registrada neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submissions Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />{" "}
                  Checklists Realizados
                </h3>
                <div className="overflow-hidden border border-app-border rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Data / Hora
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Lugar (Rota)
                        </th>
                        <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Motorista
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {submissions.length > 0 ? (
                        submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 font-bold text-xs text-text-main">
                                <Clock size={12} className="text-text-muted" />
                                {new Date(
                                  sub.created_at,
                                ).toLocaleDateString()}{" "}
                                às{" "}
                                {new Date(sub.created_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-text-main uppercase">
                              {sub.type === "start"
                                ? "Início de Viagem"
                                : sub.type === "end"
                                  ? "Fim de Viagem"
                                  : sub.type === "fuel"
                                    ? "Abastecimento"
                                    : sub.type === "yard"
                                      ? "Pátio"
                                      : sub.type}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 font-medium text-[10px] text-text-muted">
                                <MapPin size={12} />
                                {sub.routes
                                  ? `${sub.routes.origin} → ${sub.routes.destination}`
                                  : "Não Informada"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 font-medium text-[10px] text-text-muted">
                                <User size={12} />
                                {sub.profiles?.full_name || "Desconhecido"}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs font-bold text-text-muted italic"
                          >
                            Nenhum checklist registrado neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
