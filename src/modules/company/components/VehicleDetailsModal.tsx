import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ChevronRight,
  ArrowRight,
  Info,
  Layers,
  CircleDot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import PrintHeader from "./PrintHeader";
import AttachmentViewModal from "./AttachmentViewModal";

interface VehicleDetailsModalProps {
  vehicle: any;
  onClose: () => void;
}

export default function VehicleDetailsModal({
  vehicle,
  onClose,
}: VehicleDetailsModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  });
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<any>(null);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicle.id, startDate, endDate]);

  const fetchVehicleDetails = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(`${startDate}T00:00:00Z`).toISOString();
      const endOfMonth = new Date(`${endDate}T23:59:59Z`).toISOString();

      // Fetch Insurance Details
      if (vehicle.insurance_id) {
        const { data: insData } = await supabase.from("insurances").select("*").eq("id", vehicle.insurance_id).single();
        if (insData) {
          setInsurance(insData);
        }
      }

      // Fetch Alerts
      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select("*")
        .eq("company_id", user?.company_id)
        .eq("target_type", "vehicle")
        .eq("target_vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      
      setAlerts(alertsData || []);

      // Fetch Submissions
      const { data: subs } = await supabase.from("checklist_submissions").select("*, profiles!checklist_submissions_driver_id_fkey(full_name), routes(origin, destination), schedules_start:schedules!schedules_start_checklist_id_fkey(routes(origin, destination)), schedules_end:schedules!schedules_end_checklist_id_fkey(routes(origin, destination)), schedules_fuel:schedules!schedules_fuel_checklist_id_fkey(routes(origin, destination))")
        .eq("company_id", user?.company_id)
        .eq("vehicle_id", vehicle.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      const mappedSubs = (subs || []).map((sub: any) => {
        let route = sub.routes;
        if (!route && sub.schedules_start && sub.schedules_start.length > 0) {
           route = sub.schedules_start[0].routes;
        }
        if (!route && sub.schedules_end && sub.schedules_end.length > 0) {
           route = sub.schedules_end[0].routes;
        }
        if (!route && sub.schedules_fuel && sub.schedules_fuel.length > 0) {
           route = sub.schedules_fuel[0].routes;
        }
        return {
           ...sub,
           resolved_route: route
        };
      });
      setSubmissions(mappedSubs);

      // Fetch Issues
      const { data: defs } = await supabase.from("checklist_issues").select("*, profiles!checklist_issues_driver_id_fkey(full_name)")
        .eq("company_id", user?.company_id)
        .eq("vehicle_id", vehicle.id)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth)
        .order("created_at", { ascending: false });

      const mappedDefs = (defs || []).map((issue: any) => {
        let status = issue.status;
        if (status === "resolved" && !issue.resolved_by) {
          status = "pending";
        }
        return { ...issue, status };
      });

      setIssues(mappedDefs);
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

  useEffect(() => {
    document.body.classList.add("modal-open-for-print");
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none print:z-[99999] print:block">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-[95vw] md:max-w-6xl xl:max-w-7xl my-auto flex flex-col relative print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden"
      >
        {/* Top Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Header Section */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gradient-to-b from-slate-50/50 to-white relative pt-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
              <Truck size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight font-mono select-all">
                  {vehicle.plate}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200/50">
                  {vehicle.type || "FROTA"}
                </span>
              </div>
              {vehicle.model && (
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {vehicle.model}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 hover:border-slate-300 transition-colors">
                <Calendar size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">a</span>
              <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 hover:border-slate-300 transition-colors">
                <Calendar size={14} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 hover:bg-slate-50/50 transition-all shadow-sm print:hidden"
              title="Exportar / Imprimir Relatório"
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

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 print:overflow-visible print:h-auto max-h-[85vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 animate-pulse">
                Carregando histórico do veículo...
              </p>
            </div>
          ) : (
            <>
              <PrintHeader />
              {/* Detailed Specs Block */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2 mb-3">
                  <Info size={14} className="text-slate-400" /> Detalhes Cadastrais e Especificações
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Renavam</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.renavam || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Chassi</span>
                    <span className="text-xs font-semibold text-slate-700 font-mono uppercase">{vehicle.chassi || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Ano Fab/Mod</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.manufacture_year || '-'}/{vehicle.model_year || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">CRV</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.crv_number || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Combustível</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.fuel_type || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Cor Predominante</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.color || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">ANTT</span>
                    <span className="text-xs font-semibold text-slate-700">{vehicle.antt || 'Não informado'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Seguradora</span>
                    <span className="text-xs font-semibold text-slate-700">{insurance?.name || (vehicle.insurance_id ? 'Vínculo Ativo' : 'Não informado')}</span>
                    {insurance && (
                      <div className="mt-2 space-y-1">
                        {insurance.claims_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Sinistro:</span> {insurance.claims_phone}
                          </div>
                        )}
                        {insurance.support_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Assistência:</span> {insurance.support_phone}
                          </div>
                        )}
                        {insurance.broker_phone && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-600">
                            <span className="font-bold">Corretor:</span> {insurance.broker_phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 mt-4">
                  <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-3">Documentos Anexados (PDF/Fotos)</h4>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.doc_crlv_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_crlv_url)?.startsWith('http') ? (vehicle.doc_crlv_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_crlv_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 CRLV</button>
                    )}
                    {vehicle.doc_antt_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_antt_url)?.startsWith('http') ? (vehicle.doc_antt_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_antt_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 ANTT</button>
                    )}
                    {vehicle.doc_insurance_url && (
                      <button onClick={() => setSelectedAttachment(((vehicle.doc_insurance_url)?.startsWith('http') ? (vehicle.doc_insurance_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.doc_insurance_url).data.publicUrl))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">📄 Apólice Seguro</button>
                    )}
                    {!vehicle.doc_crlv_url && !vehicle.doc_antt_url && !vehicle.doc_insurance_url && (
                      <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 mt-4">
                  <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-3">Galeria do Veículo</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {vehicle.photo_front_url && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 text-center block">Frontal</span>
                        <button onClick={() => setSelectedAttachment(((vehicle.photo_front_url)?.startsWith('http') ? (vehicle.photo_front_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_front_url).data.publicUrl))} className="focus:outline-none">
                          <img src={((vehicle.photo_front_url)?.startsWith('http') ? (vehicle.photo_front_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_front_url).data.publicUrl)} alt="Frontal" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                        </button>
                      </div>
                    )}
                    {vehicle.photo_right_url && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Direita</span>
                        <button onClick={() => setSelectedAttachment(((vehicle.photo_right_url)?.startsWith('http') ? (vehicle.photo_right_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_right_url).data.publicUrl))} className="focus:outline-none">
                          <img src={((vehicle.photo_right_url)?.startsWith('http') ? (vehicle.photo_right_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_right_url).data.publicUrl)} alt="Direita" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                        </button>
                      </div>
                    )}
                    {vehicle.photo_left_url && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Esquerda</span>
                        <button onClick={() => setSelectedAttachment(((vehicle.photo_left_url)?.startsWith('http') ? (vehicle.photo_left_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_left_url).data.publicUrl))} className="focus:outline-none">
                          <img src={((vehicle.photo_left_url)?.startsWith('http') ? (vehicle.photo_left_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_left_url).data.publicUrl)} alt="Esquerda" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                        </button>
                      </div>
                    )}
                    {vehicle.photo_rear_url && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 text-center block">Traseira</span>
                        <button onClick={() => setSelectedAttachment(((vehicle.photo_rear_url)?.startsWith('http') ? (vehicle.photo_rear_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_rear_url).data.publicUrl))} className="focus:outline-none">
                          <img src={((vehicle.photo_rear_url)?.startsWith('http') ? (vehicle.photo_rear_url) : supabase.storage.from('vehicles-docs').getPublicUrl(vehicle.photo_rear_url).data.publicUrl)} alt="Traseira" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                        </button>
                      </div>
                    )}
                    {!vehicle.photo_front_url && !vehicle.photo_right_url && !vehicle.photo_left_url && !vehicle.photo_rear_url && (
                      <span className="text-[10px] text-slate-400 italic col-span-4">Nenhuma foto anexada</span>
                    )}
                  </div>
                </div>
              </div>
{/* Premium Stat Ribbons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Submissions count */}
                <div className="relative bg-gradient-to-br from-indigo-50/20 to-indigo-50/5 border border-indigo-100/50 rounded-2xl p-5 shadow-sm group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                      Checklists Completados
                    </span>
                    <span className="p-1.5 bg-white border border-indigo-100/50 rounded-lg text-indigo-600">
                      <CheckCircle size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-indigo-950 font-mono">
                      {calculateSubmissionsCnt()}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-bold">
                      realizados
                    </span>
                  </div>
                  <div className="mt-3.5 w-full bg-indigo-100/40 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, calculateSubmissionsCnt() * 5)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2. Pending Issues */}
                <div className="relative bg-gradient-to-br from-amber-50/30 to-amber-50/5 border border-amber-100/50 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">
                      Pendências de Segurança
                    </span>
                    <span className="p-1.5 bg-white border border-amber-100/50 rounded-lg text-amber-600">
                      <AlertTriangle size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-amber-950 font-mono">
                      {calculatePendingIssues()}
                    </span>
                    <span className="text-[10px] text-amber-500 font-bold">
                      abertas
                    </span>
                  </div>
                  <div className="mt-3.5 w-full bg-amber-100/40 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, calculatePendingIssues() * 20)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3. Resolved Issues */}
                <div className="relative bg-gradient-to-br from-emerald-50/20 to-emerald-50/5 border border-emerald-100/50 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">
                      Ocorrências Sanadas
                    </span>
                    <span className="p-1.5 bg-white border border-emerald-100/50 rounded-lg text-emerald-600">
                      <Wrench size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-950 font-mono">
                      {calculateResolvedIssues()}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-bold">
                      manutenções
                    </span>
                  </div>
                  <div className="mt-3.5 w-full bg-emerald-100/40 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, calculateResolvedIssues() * 15)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Alerts Block */}
              {alerts.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500 mt-[-2px] animate-pulse" />
                      Próximos Alertas
                    </h3>
                    <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                      {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col hover:border-orange-200 transition-all shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 mb-3 truncate" title={alert.title}>
                          {alert.title}
                        </h4>
                        
                        <div className="mt-auto flex flex-col gap-2">
                          {alert.trigger_type === "km" && (
                            <div className="flex flex-col text-[10px] text-slate-500 space-y-1">
                              <div className="flex justify-between items-center">
                                <span>Última Execução/KM:</span>
                                <span className="font-mono font-medium text-slate-700">
                                  {Number(alert.last_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Intervalo:</span>
                                <span className="font-mono font-medium text-slate-700">
                                  a cada {Number(alert.interval_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded-lg text-orange-700 mt-1">
                                <span className="font-bold">Aviso próximo de:</span>
                                <span className="font-mono font-black">
                                  {Number(alert.last_km + alert.interval_km - alert.warning_km).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          )}
                          {alert.trigger_type === "date" && (
                            <div className="flex flex-col text-[10px] text-slate-500 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Data Alvo/Vencimento:</span>
                                <span className="font-mono font-black text-orange-600">
                                  {alert.trigger_date.split("-").reverse().join("/")}
                                </span>
                              </div>
                              {alert.warning_days && (
                                <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded-lg text-orange-700 mt-1">
                                  <span className="font-bold">Avisar com antecedência de:</span>
                                  <span className="font-mono">
                                    {alert.warning_days} dias
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid split for Issues and Submissions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:block">
                {/* Issues / Anomalies Block */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Wrench
                        size={14}
                        className="text-amber-500 mt-[-2px] animate-pulse"
                      />
                      Ocorrências & Falhas Reportadas
                    </h3>
                    <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                      {issues.length}{" "}
                      {issues.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  {issues.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3.5">
                      {issues.map((iss) => (
                        <div
                          key={iss.id}
                          className={`bg-white border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-150 hover:shadow-md ${
                            iss.status === "pending"
                              ? "border-amber-100 bg-amber-50/5 hover:border-amber-200"
                              : "border-slate-200/60 hover:border-slate-350"
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${iss.status === "pending" ? "bg-amber-100/40 text-amber-600" : "bg-slate-100 text-slate-500"}`}
                            >
                              <CircleDot size={15} className="mt-[2px]" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 leading-snug">
                                {iss.item_title}
                              </span>
                              {iss.description && (
                                <p className="text-[11px] text-slate-500 mt-1 max-w-[500px] break-words">
                                  {iss.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                  <Calendar size={11} />
                                  {new Date(iss.created_at).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </span>
                                <span className="w-1.5 h-1.5 bg-slate-250 rounded-full" />
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                  <User size={11} />
                                  {iss.profiles?.full_name || "Desconhecido"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                                iss.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                  : "bg-emerald-55/60 text-emerald-700 border-emerald-150"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${iss.status === "pending" ? "bg-amber-500" : "bg-emerald-500"}`}
                              />
                              {iss.status === "pending"
                                ? "Pendente"
                                : "Resolvido"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-3xl bg-slate-50/30">
                      <CheckCircle
                        size={28}
                        className="text-emerald-400 mb-2.5"
                      />
                      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
                        Veículo 100% Operacional
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Nenhuma ocorrência ou falha aberta no período.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submissions Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle
                        size={14}
                        className="text-indigo-500 mt-[-2px]"
                      />
                      Inspeções & Checklists Realizados
                    </h3>
                    <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-bold">
                      {submissions.length}{" "}
                      {submissions.length === 1 ? "inspeção" : "inspeções"}
                    </span>
                  </div>

                  {submissions.length > 0 ? (
                    <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                          <thead className="bg-slate-50/70 border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Data & Hora
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Tipo de Inspeção
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Rota / Programada
                              </th>
                              <th className="px-5 py-3.5 text-[9px] font-black text-slate-450 uppercase tracking-widest">
                                Lançado por
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {submissions.map((sub) => (
                              <tr
                                key={sub.id}
                                className="hover:bg-slate-50/30 transition-all"
                              >
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-750">
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
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                      sub.type === "start"
                                        ? "bg-indigo-50 border-indigo-100/50 text-indigo-750"
                                        : sub.type === "end"
                                          ? "bg-purple-50 border-purple-100/50 text-purple-750"
                                          : sub.type === "fuel" || sub.type === "Abastecimento"
                                            ? "bg-fuchsia-50 border-fuchsia-100/50 text-fuchsia-750"
                                            : "bg-slate-55 border-slate-150 text-slate-650"
                                    }`}
                                  >
                                    {sub.type === "start"
                                      ? "Início de Viagem"
                                      : sub.type === "end"
                                        ? "Fim de Viagem"
                                        : sub.type === "fuel" || sub.type === "Abastecimento"
                                          ? "Abastecimento"
                                          : sub.type === "yard"
                                            ? "Pátio"
                                            : sub.type}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <MapPin
                                      size={11}
                                      className="text-slate-400 shrink-0"
                                    />
                                    <span className="truncate max-w-[200px]">
                                      {sub.resolved_route
                                        ? `${sub.resolved_route.origin} → ${sub.resolved_route.destination}`
                                        : "Espontânea / Sem Rota"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1" />
                                    {sub.profiles?.full_name || "Membro"}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-3xl bg-slate-50/30">
                      <Layers size={28} className="text-slate-300 mb-2.5" />
                      <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
                        Sem Inspeções
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Nenhum checklist de viagem foi lançado neste período.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
      {selectedAttachment && (
        <AttachmentViewModal
          attachmentUrl={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
  return createPortal(modalContent, document.body);
}
