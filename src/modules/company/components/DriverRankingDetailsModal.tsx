import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Award,
  User,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Compass,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase";

interface DriverRankingDetailsModalProps {
  driver: any;
  initialPeriodId: string;
  closings: any[];
  appSettings: any;
  onClose: () => void;
}

export default function DriverRankingDetailsModal({
  driver,
  initialPeriodId,
  closings,
  appSettings,
  onClose,
}: DriverRankingDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(
    initialPeriodId || "current",
  );
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [scoreProfile, setScoreProfile] = useState<any>(null);
  const [activeScore, setActiveScore] = useState<number>(driver.score || 0);

  useEffect(() => {
    fetchDriverDetails();
  }, [driver.id, selectedPeriod]);

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      let startOfMonth: string;
      let endOfMonth: string;

      // Handle fetching score
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

        const { data: perf } = await supabase
          .from("driver_performance")
          .select("score")
          .eq("driver_id", driver.id)
          .single();
        setActiveScore(perf?.score ?? 0);
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

        const { data: cItem } = await supabase
          .from("score_closing_items")
          .select("score")
          .eq("closing_id", selectedPeriod)
          .eq("driver_id", driver.id)
          .single();
        setActiveScore(cItem?.score ?? 0);
      }

      // Fetch driver score profile setting
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, score_profiles(*)")
        .eq("id", driver.id)
        .single();

      setScoreProfile(profileData?.score_profiles || null);

      // Fetch Submissions
      const { data: subs } = await supabase
        .from("checklist_submissions")
        .select("*, vehicles(plate), routes(origin, destination)")
        .eq("driver_id", driver.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      setSubmissions(subs || []);

      // Fetch Audit Logs (Penalties/Rewards)
      const { data: audits } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("driver_id", driver.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      setAuditLogs(audits || []);

      // Fetch Schedules
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*, routes(origin, destination)")
        .eq("driver_id", driver.id)
        .gte("start_at", startOfMonth)
        .lte("start_at", endOfMonth)
        .order("start_at", { ascending: false });

      setSchedules(scheds || []);
    } catch (error) {
      console.error("Erro ao buscar detalhes do motorista", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDone = () => {
    return submissions.length;
  };

  const calculateNotDone = () => {
    return auditLogs.filter((a) => a.type === "penalty" || a.type === "manual")
      .length;
  };

  useEffect(() => {
    document.body.classList.add("modal-open-for-print");
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, []);

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excelente";
    if (score >= 70) return "Bom / Regular";
    return "Abaixo da Média";
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none print:z-[99999] print:block">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-[95vw] md:max-w-6xl xl:max-w-7xl my-auto flex flex-col relative print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden"
      >
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />

        {/* Header Panel */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gradient-to-b from-slate-50/40 to-white relative pt-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
              <User size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {driver.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider border border-slate-200/50">
                  RANKING & SCORE
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                Motorista Profissional de Operações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Period selector dropdown */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 hover:border-slate-300 transition-colors">
              <Calendar size={14} className="text-slate-400 mr-2 shrink-0" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none pr-6 cursor-pointer appearance-none"
              >
                <option value="current">Mês Atual (Em Aberto)</option>
                {closings.map((c) => (
                  <option key={c.id} value={c.id}>
                    {new Date(`${c.period_start}T12:00:00Z`).toLocaleDateString(
                      "pt-BR",
                      { month: "short", year: "2-digit" },
                    )}{" "}
                    (
                    {new Date(`${c.period_start}T12:00:00Z`).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit" },
                    )}{" "}
                    a{" "}
                    {new Date(`${c.period_end}T12:00:00Z`).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit" },
                    )}
                    )
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500" />
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 hover:bg-slate-50/50 transition-all shadow-sm print:hidden"
              title="Gerar / Imprimir Ranking"
            >
              <Printer size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 text-slate-500 hover:text-rose-600 transition-all shadow-sm print:hidden"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Panel Scroll */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 print:overflow-visible print:h-auto max-h-[85vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 animate-pulse">
                Processando logs de desempenho do motorista...
              </p>
            </div>
          ) : (
            <>
              {/* Score indicators Ribbon */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Score Meter Circle */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100/50 rounded-full blur-2xl pointer-events-none" />

                  <span className="text-[9px] font-black uppercase text-slate-405 tracking-widest mb-3.5">
                    Nota de Direção Defensiva
                  </span>

                  <div
                    className={`w-28 h-28 rounded-full border-[6.5px] border-slate-100 flex flex-col items-center justify-center relative shadow-inner ${
                      activeScore >= 90
                        ? "bg-emerald-50/40"
                        : activeScore >= 70
                          ? "bg-amber-50/45"
                          : "bg-rose-50/45"
                    }`}
                  >
                    {/* Visual Ring accent */}
                    <div
                      className={`absolute inset-[-6.5px] rounded-full border-[6.5px] border-transparent border-t-indigo-500 filter drop-shadow`}
                      style={{
                        transform: `rotate(${Math.min(360, (activeScore / 100) * 360)}deg)`,
                      }}
                    />

                    <span className="text-3xl font-black text-slate-800 font-mono select-none leading-none">
                      {activeScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-450 mt-1 uppercase">
                      Pontos
                    </span>
                  </div>

                  <span
                    className={`mt-3 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      activeScore >= 90
                        ? "bg-emerald-55 text-emerald-700 border-emerald-200"
                        : activeScore >= 70
                          ? "bg-amber-55 text-amber-700 border-amber-200"
                          : "bg-rose-55 text-rose-700 border-rose-200"
                    }`}
                  >
                    {getScoreLabel(activeScore)}
                  </span>
                </div>

                {/* 2. Checklists Counter */}
                <div className="bg-gradient-to-br from-emerald-50/20 to-emerald-50/5 border border-emerald-100/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">
                        Checklists Entregues
                      </span>
                      <p className="text-3xl font-black text-emerald-950 font-mono mt-1">
                        {calculateDone()}
                      </p>
                    </div>
                    <span className="p-2 bg-white border border-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                      <CheckCircle size={15} />
                    </span>
                  </div>

                  <div className="pt-4 border-t border-emerald-100/30 mt-4">
                    <p className="text-[10px] font-bold text-emerald-700/80 uppercase">
                      Participação Operacional
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-black text-emerald-800">
                        100%
                      </span>
                      <span className="text-[9px] text-emerald-600/60 font-semibold uppercase">
                        dos plantões programados
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Penalties Count */}
                <div className="bg-gradient-to-br from-rose-50/20 to-rose-50/5 border border-rose-100/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider">
                        Pontos Descontados
                      </span>
                      <p className="text-3xl font-black text-rose-950 font-mono mt-1">
                        {calculateNotDone()}
                      </p>
                    </div>
                    <span className="p-2 bg-white border border-rose-100 rounded-xl text-rose-600 shadow-sm">
                      <TrendingDown size={15} />
                    </span>
                  </div>

                  <div className="pt-4 border-t border-rose-100/30 mt-4">
                    <p className="text-[10px] font-bold text-rose-700/80 uppercase">
                      Inobservâncias / Omissões
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-black text-rose-800">
                        {calculateNotDone() > 0
                          ? `${calculateNotDone()} falhas`
                          : "Ficha Limpa"}
                      </span>
                      <span className="text-[9px] text-rose-600/60 font-semibold uppercase">
                        sem incidentes severos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid split for checklists and penalties/schedules */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:block">
                {/* Left Side: Submissions Table */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Award size={14} className="text-emerald-500 mt-[-2px]" />
                      Atividades Realizadas (Últimos Checklists)
                    </h3>
                    <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                      {submissions.length} inspeções
                    </span>
                  </div>

                  {submissions.length > 0 ? (
                    <div className="overflow-hidden border border-slate-105 rounded-2xl bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50/70 border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-3 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Data / Hora
                              </th>
                              <th className="px-5 py-3 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Tipo
                              </th>
                              <th className="px-5 py-3 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Veículo
                              </th>
                              <th className="px-5 py-3 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Rota Associada
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {submissions.map((sub) => (
                              <tr
                                key={sub.id}
                                className="hover:bg-slate-50/20 transition-all"
                              >
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                    <Clock
                                      size={12}
                                      className="text-slate-400 shrink-0"
                                    />
                                    <span>
                                      {new Date(
                                        sub.created_at,
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                      {new Date(
                                        sub.created_at,
                                      ).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className="text-[10px] font-black uppercase text-indigo-750 bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded-md">
                                    {sub.type === "start"
                                      ? "Início Viagem"
                                      : sub.type === "end"
                                        ? "Fim Viagem"
                                        : sub.type === "fuel"
                                          ? "Abastecimento"
                                          : sub.type === "yard"
                                            ? "Pátio"
                                            : sub.type}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/55">
                                    {sub.vehicles?.plate || "N/A"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-1.5 text-xs text-slate-550 font-bold max-w-xs truncate">
                                    <MapPin
                                      size={11}
                                      className="text-slate-400 shrink-0"
                                    />
                                    <span>
                                      {sub.routes
                                        ? `${sub.routes.origin} → ${sub.routes.destination}`
                                        : "Lançamento Avulso"}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
                      <User size={24} className="text-slate-350 mx-auto mb-2" />
                      <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                        Nenhuma Atividade Registrada
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Nenhum checklist associado no período selecionado.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side: Penalties and Schedules */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Missed / Audit Logs Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle
                          size={14}
                          className="text-rose-500 mt-[-2px]"
                        />
                        Ficha de Ocorrências e Descontos
                      </h3>
                      <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                        Histórico Geral
                      </span>
                    </div>

                    {auditLogs.filter(
                      (a) => a.type === "penalty" || a.type === "manual",
                    ).length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {auditLogs
                          .filter(
                            (a) => a.type === "penalty" || a.type === "manual",
                          )
                          .map((audit) => (
                            <div
                              key={audit.id}
                              className="bg-white border border-rose-100/60 p-4 rounded-2xl flex items-start gap-3.5 hover:shadow-md transition-shadow duration-150 bg-gradient-to-br from-rose-50/10 to-transparent"
                            >
                              <div className="p-2 bg-rose-55 text-rose-500 rounded-xl shrink-0">
                                <AlertTriangle size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-black text-slate-850 leading-snug truncate capitalize">
                                  {audit.reason}
                                </span>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                    -{audit.amount}{" "}
                                    {appSettings?.system_type === "cash"
                                      ? "R$"
                                      : "Pts"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    em{" "}
                                    {new Date(
                                      audit.created_at,
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-emerald-100 rounded-3xl bg-emerald-50/5">
                        <ShieldCheck
                          size={28}
                          className="text-emerald-500 mb-2.5"
                        />
                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                          Ficha Limpa Sem Ocorrências
                        </p>
                        <p className="text-[10px] text-emerald-600/70 font-semibold mt-1">
                          Este motorista cumpre todos os procedimentos.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Schedules Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Calendar
                          size={14}
                          className="text-amber-500 mt-[-2px]"
                        />
                        Escalas de Viagem Programadas
                      </h3>
                    </div>

                    {schedules.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-1">
                        {schedules.map((s) => {
                          const applyStart =
                            scoreProfile?.apply_penalty_start !== false;
                          const applyEnd =
                            scoreProfile?.apply_penalty_end !== false;
                          const applyFuel =
                            scoreProfile?.apply_penalty_fuel !== false;

                          const missingStart =
                            applyStart && !s.start_checklist_id;
                          const missingEnd = applyEnd && !s.end_checklist_id;
                          const missingFuel =
                            applyFuel &&
                            s.requires_fueling !== false &&
                            !s.fuel_checklist_id;
                          const isOk =
                            !missingStart && !missingEnd && !missingFuel;

                          return (
                            <div
                              key={s.id}
                              className={`p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between ${
                                isOk
                                  ? "bg-gradient-to-br from-emerald-50/15 to-transparent border-slate-200/80 hover:border-emerald-250"
                                  : "bg-gradient-to-br from-rose-50/15 to-transparent border-rose-100/70 hover:border-rose-250"
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                                    <Clock size={11} />
                                    {new Date(s.start_at).toLocaleDateString(
                                      "pt-BR",
                                    )}
                                  </span>
                                  <span
                                    className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      isOk
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                        : "bg-rose-50 text-rose-700 border-rose-150"
                                    }`}
                                  >
                                    {isOk ? "Completa" : "Pendente"}
                                  </span>
                                </div>

                                <div className="text-xs font-black text-slate-850 leading-relaxed flex items-center gap-2">
                                  <MapPin
                                    size={12}
                                    className="text-slate-400 shrink-0"
                                  />
                                  <span>
                                    {s.routes
                                      ? `${s.routes.origin} → ${s.routes.destination}`
                                      : "Rota Indefinida"}
                                  </span>
                                </div>
                              </div>

                              {!isOk && (
                                <div className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100/50 p-2 rounded-lg font-black uppercase tracking-wider mt-3 flex items-center gap-1.5">
                                  <Info size={11} className="shrink-0" />
                                  <span>
                                    Faltou:{" "}
                                    {[
                                      missingStart && "Início",
                                      missingEnd && "Fim",
                                      missingFuel && "Combustível",
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
                        <Calendar
                          size={24}
                          className="text-slate-350 mx-auto mb-2"
                        />
                        <p className="text-xs font-black text-slate-600 uppercase tracking-widest">
                          Sem Escalas Registradas
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
