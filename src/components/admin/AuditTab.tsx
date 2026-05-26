import React, { useState, useEffect } from 'react';
import { AlertTriangle, Undo, X, Check } from 'lucide-react';
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

  const [contestingLog, setContestingLog] = useState<any>(null);
  const [contestReason, setContestReason] = useState('');
  const [isSavingContest, setIsSavingContest] = useState(false);

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

  const handleContestLog = async () => {
    if (!contestReason.trim() || !contestingLog) return;
    
    setIsSavingContest(true);
    try {
      // 1. Update the old log reason to mark it as contested
      const newReason = `[CONTESTADO] ${contestingLog.reason}`;
      await supabase.from('audit_logs').update({ reason: newReason }).eq('id', contestingLog.id);
      
      // 2. Add points back to performance (if driver is selected, though global might be null)
      if (contestingLog.driver_id) {
        const { data: perf } = await supabase.from('driver_performance').select('score').eq('driver_id', contestingLog.driver_id).maybeSingle();
        let currentScore = perf?.score || (appSettings?.initial_value || 1000);
        
        await supabase.from('driver_performance').upsert({
           driver_id: contestingLog.driver_id,
           score: currentScore + Number(contestingLog.amount),
           updated_at: new Date().toISOString()
        });
      }
      
      // 3. Insert reversion log
      await supabase.from('audit_logs').insert({
         driver_id: contestingLog.driver_id,
         type: 'reversal',
         amount: contestingLog.amount,
         reason: `Reversão/Contestação: ${contestReason}`
      });
      
      setContestingLog(null);
      setContestReason('');
      fetchAuditLogs();
    } catch (err: any) {
      alert('Erro ao contestar: ' + err.message);
    } finally {
      setIsSavingContest(false);
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
                      <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {loading ? (
                       <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-text-muted italic">Carregando...</td></tr>
                    ) : auditLogs.length > 0 ? auditLogs.map((log) => {
                      const isDeduction = log.type === 'penalty' || (log.type === 'manual' && log.amount > 0 && !log.reason.toLowerCase().includes('bônus'));
                      const isContested = log.reason.includes('[CONTESTADO]');
                      return (
                      <tr key={log.id} className="hover:bg-app-bg/30">
                        <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-text-main">{log.profiles?.full_name || 'SISTEMA (Global)'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            log.type === 'penalty' ? 'bg-red-100 text-red-700' : 
                            log.type === 'reversal' ? 'bg-green-100 text-green-700' :
                            log.type === 'reward' ? 'bg-green-100 text-green-700' : 
                            'bg-blue-100 text-primary'
                          }`}>
                            {log.type === 'penalty' ? 'Multa' : 
                             log.type === 'reversal' ? 'Reversão' :
                             log.type === 'reward' ? 'Bônus' : 
                             'Ajuste'}
                          </span>
                        </td>
                        <td className={`px-5 py-4 text-center font-mono font-bold text-xs ${log.type === 'reward' || log.type === 'reversal' ? 'text-success' : 'text-danger'}`}>
                          {log.type === 'reward' || log.type === 'reversal' ? '+' : '-'}{log.amount}
                        </td>
                        <td className="px-5 py-4 text-[10px] font-medium text-text-muted italic underline decoration-dotted">
                          {log.reason}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isDeduction && !isContested ? (
                             <button
                               onClick={() => setContestingLog(log)}
                               className="px-3 py-1.5 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
                             >
                               Contestar
                             </button>
                          ) : isContested ? (
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                              Contestado
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    )}) : (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum log encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {/* Modal de Contestação */}
      {contestingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Undo size={20} className="text-primary" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Contestar Multa</h3>
                </div>
                <button
                  onClick={() => setContestingLog(null)}
                  className="text-text-muted hover:text-text-main transition-colors"
                  disabled={isSavingContest}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-app-bg p-3 rounded-xl mb-4 border border-app-border space-y-1">
                 <p className="text-xs text-text-muted font-medium">Motorista: <span className="font-bold text-text-main">{contestingLog.profiles?.full_name}</span></p>
                 <p className="text-xs text-text-muted font-medium">Valor: <span className="font-bold text-danger">-{contestingLog.amount} pts</span></p>
                 <p className="text-[10px] text-text-muted mt-2 italic border-t border-app-border/50 pt-2">{contestingLog.reason}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Motivo da Contestação
                  </label>
                  <textarea
                    value={contestReason}
                    onChange={(e) => setContestReason(e.target.value)}
                    className="w-full h-24 px-4 py-3 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder="Descreva por que esta multa deve ser revertida..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setContestingLog(null)}
                  disabled={isSavingContest}
                  className="flex-1 px-4 py-3 bg-app-bg text-text-main text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleContestLog}
                  disabled={isSavingContest || !contestReason.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingContest ? 'Gerando Reversão...' : (
                    <>
                      <Check size={14} /> Confirmar Reversão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}