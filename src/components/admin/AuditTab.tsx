import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditTabProps {
  appSettings: any;
}

export default function AuditTab({ appSettings }: AuditTabProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!confirm('Deseja verificar escalas atrasadas e aplicar penalidades automáticas?')) return;
    setSaving(true);
    try {
      // 1. Get expired schedules without penalty applied
      const { data: expired } = await supabase
        .from('schedules')
        .select('*')
        .lt('end_at', new Date().toISOString())
        .eq('penalty_applied', false);

      if (!expired || expired.length === 0) {
        alert('Nenhuma escala pendente de auditoria encontrada.');
        return;
      }

      for (const schedule of expired) {
        const missingStart = !schedule.start_checklist_id;
        const missingEnd = !schedule.end_checklist_id;
        const missingFuel = !schedule.fuel_checklist_id;

        if (missingStart || missingEnd || missingFuel) {
          const penaltyCount = (missingStart ? 1 : 0) + (missingEnd ? 1 : 0) + (missingFuel ? 1 : 0);
          const penaltyAmount = Number(appSettings.penalty_value) || 50;
          const totalPenalty = penaltyCount * penaltyAmount;

          // Apply penalty to performance
          const { data: perf } = await supabase
            .from('driver_performance')
            .select('score')
            .eq('driver_id', schedule.driver_id)
            .maybeSingle();

          const newScore = (perf?.score || 1000) - totalPenalty;

          await supabase.from('driver_performance').upsert({ 
            driver_id: schedule.driver_id, 
            score: newScore,
            updated_at: new Date().toISOString()
          });

          // Mark schedule as penalized
          await supabase.from('schedules').update({ penalty_applied: true }).eq('id', schedule.id);

          // Build detailed reason
          const missingItems = [];
          if (missingStart) missingItems.push('inicial');
          if (missingEnd) missingItems.push('final');
          if (missingFuel) missingItems.push('abastecimento');
          
          const reason = `Penalidade automática: Falta de checklist ${missingItems.join(', ').replace(/, ([^,]*)$/, ' e $1')} na escala.`;

          // Log Audit
          await supabase.from('audit_logs').insert({
            driver_id: schedule.driver_id,
            type: 'penalty',
            amount: totalPenalty,
            reason
          });
        } else {
          // Both checklists done, just mark as audited
          await supabase.from('schedules').update({ penalty_applied: true }).eq('id', schedule.id);
        }
      }

      alert('Auditoria concluída com sucesso!');
      fetchAuditLogs();
    } catch (error: any) {
      alert('Erro na auditoria: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bento-card bg-zinc-50 border-app-border flex items-center justify-between py-2 px-3">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Auditoria Automática</h3>
        </div>
        <button 
          onClick={handleRunAudit}
          disabled={saving}
          className="h-10 px-6 m-4 bg-danger text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <AlertTriangle size={14} />
          Executar Auditoria Agora
        </button>
      </div>

      <div className="bento-card !p-0 overflow-hidden">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Logs de Auditoria</span>
         </div>
         <div className="overflow-x-auto text-left">
            <table className="w-full">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-center">Valor</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {loading ? (
                   <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-text-muted italic">Carregando...</td></tr>
                ) : auditLogs.length > 0 ? auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-text-main">{log.profiles?.full_name || 'SISTEMA (Global)'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        log.type === 'penalty' ? 'bg-red-100 text-red-700' : 
                        log.type === 'reward' ? 'bg-green-100 text-green-700' : 
                        'bg-blue-100 text-primary'
                      }`}>
                        {log.type === 'penalty' ? 'Multa' : 
                         log.type === 'reward' ? 'Bônus' : 
                         'Ajuste'}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-center font-mono font-bold text-xs ${log.type === 'reward' ? 'text-success' : 'text-danger'}`}>
                      {log.type === 'reward' ? '+' : '-'}{log.amount}
                    </td>
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted italic underline decoration-dotted">
                      {log.reason}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum log encontrado.</td></tr>
                )}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
