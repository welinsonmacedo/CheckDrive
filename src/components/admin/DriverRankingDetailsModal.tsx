import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface DriverRankingDetailsModalProps {
  driver: any;
  month: string;
  appSettings: any;
  onClose: () => void;
}

export default function DriverRankingDetailsModal({ driver, month, appSettings, onClose }: DriverRankingDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    fetchDriverDetails();
  }, [driver.id, month]);

  const fetchDriverDetails = async () => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = month.split('-');
      const startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toISOString();
      const endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999).toISOString();

      // Fetch Submissions
      const { data: subs } = await supabase
        .from('checklist_submissions')
        .select('*, vehicles(plate), routes(origin, destination)')
        .eq('driver_id', driver.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .order('created_at', { ascending: false });
      
      setSubmissions(subs || []);

      // Fetch Audit Logs (Penalties/Rewards)
      const { data: audits } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('driver_id', driver.id)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .order('created_at', { ascending: false });
        
      setAuditLogs(audits || []);

      // Fetch Schedules
      const { data: scheds } = await supabase
        .from('schedules')
        .select('*, routes(origin, destination)')
        .eq('driver_id', driver.id)
        .gte('start_at', startOfMonth)
        .lte('start_at', endOfMonth)
        .order('start_at', { ascending: false });

      setSchedules(scheds || []);
      
    } catch (error) {
      console.error('Erro ao buscar detalhes do motorista', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDone = () => {
     return submissions.length;
  };

  const calculateNotDone = () => {
     return auditLogs.filter(a => a.type === 'penalty').length;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-5 border-b border-app-border flex items-center justify-between bg-zinc-50 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div>
            <h2 className="text-lg font-black text-text-main tracking-tight">{driver.full_name}</h2>
            <p className="text-xs font-semibold text-text-muted mt-0.5 uppercase tracking-widest">
              Resumo do Mês: {month}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-app-border text-text-muted hover:bg-zinc-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
             <div className="text-center py-20 animate-pulse text-sm font-bold text-text-muted uppercase">Carregando detalhes...</div>
          ) : (
            <>
              {/* Score summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-50 border border-app-border p-4 rounded-xl flex flex-col items-center justify-center">
                   <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Pontuação Final</span>
                   <span className="text-2xl font-black text-text-main">{driver.score}</span>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Checklists Realizados</span>
                   <span className="text-xl font-black text-green-700">{calculateDone()}</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col items-center justify-center">
                   <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">Penalidades</span>
                   <span className="text-xl font-black text-red-700">{calculateNotDone()}</span>
                </div>
              </div>

              {/* Submissions Section */}
              <div className="space-y-3">
                 <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" /> Atividades Realizadas
                 </h3>
                 <div className="overflow-hidden border border-app-border rounded-xl">
                    <table className="w-full text-left">
                       <thead className="bg-zinc-50">
                          <tr>
                             <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Data / Hora</th>
                             <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo</th>
                             <th className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">Lugar (Rota)</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-app-border">
                          {submissions.length > 0 ? submissions.map(sub => (
                             <tr key={sub.id} className="hover:bg-zinc-50/50">
                                <td className="px-4 py-3">
                                   <div className="flex items-center gap-2 font-bold text-xs text-text-main">
                                      <Clock size={12} className="text-text-muted" />
                                      {new Date(sub.created_at).toLocaleDateString()} às {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </div>
                                </td>
                                <td className="px-4 py-3 text-xs font-bold text-text-main">{sub.type}</td>
                                <td className="px-4 py-3">
                                   <div className="flex items-center gap-2 font-medium text-[10px] text-text-muted">
                                      <MapPin size={12} />
                                      {sub.routes ? `${sub.routes.origin} → ${sub.routes.destination}` : 'N/D'}
                                   </div>
                                </td>
                             </tr>
                          )) : (
                             <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-text-muted">Nenhuma atividade registrada</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Missed / Audit Logs Section */}
              <div className="space-y-3">
                 <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" /> Penalidades e Omissões (Não Realizado)
                 </h3>
                 <div className="border border-app-border rounded-xl p-4 bg-zinc-50/50 space-y-4">
                    {auditLogs.filter(a => a.type === 'penalty').length > 0 ? (
                       auditLogs.filter(a => a.type === 'penalty').map(audit => (
                          <div key={audit.id} className="bg-white border border-red-100 p-3 rounded-lg flex items-start gap-3">
                             <div className="mt-0.5"><AlertTriangle size={16} className="text-red-500" /></div>
                             <div>
                                <span className="block text-xs font-bold text-red-700 capitalize">{audit.reason}</span>
                                <span className="block mt-1 text-[10px] font-bold text-text-muted">Desconto de: {audit.amount} {appSettings?.system_type === 'cash' ? 'R$' : 'Pontos'} em {new Date(audit.created_at).toLocaleDateString()}</span>
                             </div>
                          </div>
                       ))
                    ) : (
                       <div className="text-center text-xs font-medium text-text-muted">Nenhuma penalidade registrada no mês selecionado.</div>
                    )}
                 </div>
              </div>

              {/* Schedules */}
              <div className="space-y-3">
                 <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" /> Resumo de Escalas do Mês
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {schedules.length > 0 ? schedules.map(s => {
                       const missingStart = !s.start_checklist_id;
                       const missingEnd = !s.end_checklist_id;
                       const missingFuel = !s.fuel_checklist_id;
                       const isOk = !missingStart && !missingEnd && !missingFuel;

                       return (
                          <div key={s.id} className={`p-3 rounded-xl border ${isOk ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-text-muted">{new Date(s.start_at).toLocaleDateString()}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                   {isOk ? 'Completado' : 'Com Pendência'}
                                </span>
                             </div>
                             <div className="text-xs font-bold text-text-main mb-1">
                                {s.routes ? `${s.routes.origin} → ${s.routes.destination}` : 'Rota não definida'}
                             </div>
                             {!isOk && (
                                <div className="text-[9px] text-red-600 font-bold mt-2">
                                   Faltou: {missingStart && 'Início '} {missingEnd && 'Fim '} {missingFuel && 'Abastecimento'}
                                </div>
                             )}
                          </div>
                       )
                    }) : (
                       <div className="col-span-2 text-center text-xs font-medium text-text-muted py-4">Nenhuma escala programada para este mês.</div>
                    )}
                 </div>
              </div>

            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
