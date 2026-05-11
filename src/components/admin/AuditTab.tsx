import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClosingHistoryTab from './ClosingHistoryTab';

interface AuditTabProps {
  appSettings: any;
}

import { runSilentAudit } from '../../lib/auditService';

export default function AuditTab({ appSettings }: AuditTabProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'closings'>('logs');

  useEffect(() => {
    const runInitialAudit = async () => {
      await fetchAuditLogs();
      // Silently run audit for very old schedules
      await handleRunAudit(true);
    };
    runInitialAudit();
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

  const handleRunAudit = async (silent = false) => {
    if (!silent && !confirm('Deseja verificar escalas atrasadas e aplicar penalidades automáticas?')) return;
    setSaving(true);
    try {
      await runSilentAudit();

      if (!silent) alert('Auditoria concluída com sucesso!');
      fetchAuditLogs();
    } catch (error: any) {
      if (!silent) alert('Erro na auditoria: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-app-bg rounded-xl p-1 border border-app-border max-w-2xl mx-auto">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeSubTab === 'logs' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Logs de Eventos
        </button>
        <button
          onClick={() => setActiveSubTab('closings')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeSubTab === 'closings' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Histórico de Fechamentos
        </button>
      </div>

      {activeSubTab === 'closings' ? (
        <ClosingHistoryTab />
      ) : (
        <>
          <div className="bento-card bg-zinc-50 border-app-border flex items-center justify-between py-2 px-3">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Auditoria Automática</h3>
            </div>
            <button 
              onClick={() => handleRunAudit(false)}
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
        </>
      )}
    </div>
  );
}