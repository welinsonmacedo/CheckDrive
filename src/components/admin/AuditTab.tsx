import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  X, 
  Check, 
  Search, 
  Filter, 
  TrendingDown, 
  Sparkles, 
  Activity, 
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  History,
  CornerDownRight,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClosingHistoryTab from './ClosingHistoryTab';
import { runSilentAudit } from '../../lib/auditService';
import { motion, AnimatePresence } from 'motion/react';

interface AuditTabProps {
  appSettings: any;
}

export default function AuditTab({ appSettings }: AuditTabProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'closings'>('logs');

  // Contest states
  const [contestingLog, setContestingLog] = useState<any>(null);
  const [contestReason, setContestReason] = useState('');
  const [contestPointsAmount, setContestPointsAmount] = useState<number>(0);
  const [isSavingContest, setIsSavingContest] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Custom Notifications & Confirm Modals
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Handle toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToastMsg = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      showToastMsg('Erro ao carregar logs de auditoria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async (silent = false) => {
    if (silent) {
      setSaving(true);
      try {
        await runSilentAudit();
        fetchAuditLogs();
      } catch (error) {
        console.error('Silent audit background error:', error);
      } finally {
        setSaving(false);
      }
    } else {
      setShowRunConfirm(true);
    }
  };

  const executeRunAudit = async () => {
    setShowRunConfirm(false);
    setSaving(true);
    try {
      await runSilentAudit();
      showToastMsg('Auditoria concluída com sucesso!');
      fetchAuditLogs();
    } catch (error: any) {
      showToastMsg('Erro na auditoria: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleContestLog = async () => {
    if (!contestReason.trim() || !contestingLog || contestPointsAmount <= 0 || contestPointsAmount > contestingLog.amount) return;
    
    setIsSavingContest(true);
    try {
      // 1. Update the old log reason to mark it as contested
      const prefix = contestPointsAmount < contestingLog.amount ? '[CONTESTADO PARCIALMENTE]' : '[CONTESTADO]';
      const newReason = contestingLog.reason.includes('[CONTESTADO') 
          ? contestingLog.reason 
          : `${prefix} ${contestingLog.reason}`;
          
      await supabase.from('audit_logs').update({ reason: newReason }).eq('id', contestingLog.id);
      
      // 2. Add points back to performance (if driver is selected, though global might be null)
      if (contestingLog.driver_id) {
        const { data: perf } = await supabase.from('driver_performance').select('score').eq('driver_id', contestingLog.driver_id).maybeSingle();
        let currentScore = perf?.score || (appSettings?.initial_value || 1000);
        
        await supabase.from('driver_performance').upsert({
           driver_id: contestingLog.driver_id,
           score: currentScore + Number(contestPointsAmount),
           updated_at: new Date().toISOString()
        });
      }
      
      // 3. Insert reversion log
      await supabase.from('audit_logs').insert({
         driver_id: contestingLog.driver_id,
         type: 'reversal',
         amount: Number(contestPointsAmount),
         reason: `Reversão/Contestação: ${contestReason}`
      });
      
      setContestingLog(null);
      setContestReason('');
      setContestPointsAmount(0);
      showToastMsg('Contestação e reversão geradas com sucesso!');
      fetchAuditLogs();
    } catch (err: any) {
      showToastMsg('Erro ao contestar: ' + err.message, 'error');
    } finally {
      setIsSavingContest(false);
    }
  };

  // Stats Calculations from logs
  const totalPenalties = auditLogs
    .filter(log => log.type === 'penalty')
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  const totalRewardsAndReversals = auditLogs
    .filter(log => log.type === 'reward' || log.type === 'reversal')
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  const totalActiveLogs = auditLogs.length;

  // Real-time filtering configuration
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.profiles?.full_name || 'Sistema').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.reason || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'penalty') return matchesSearch && log.type === 'penalty';
    if (filterType === 'reward') return matchesSearch && log.type === 'reward';
    if (filterType === 'reversal') return matchesSearch && log.type === 'reversal';
    if (filterType === 'manual') return matchesSearch && log.type !== 'penalty' && log.type !== 'reward' && log.type !== 'reversal';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans antialiased text-gray-800">
      
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3.5 px-4.5 py-3 rounded-xl shadow-xl border bg-white text-xs font-semibold tracking-tight"
            style={{
              borderColor: toast.type === 'success' ? '#bbf7d0' : toast.type === 'error' ? '#fecaca' : '#bfdbfe'
            }}
          >
            <div className={`p-1.5 rounded-lg ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {toast.type === 'success' ? <Check size={14} className="stroke-[2.5]" /> : <Info size={14} className="stroke-[2.5]" />}
            </div>
            <span className="text-gray-700">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-650 ml-2">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Sub-Tab Selection Header */}
      <div className="flex bg-gray-100/80 rounded-2xl p-1.5 border border-gray-200/50 max-w-lg mx-auto shadow-sm">
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'logs' 
              ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-indigo-650 border border-gray-100/80 font-black' 
              : 'text-gray-550 hover:text-gray-800 hover:bg-gray-50/50'
          }`}
        >
          <Activity size={14} className={activeSubTab === 'logs' ? 'text-indigo-600' : 'text-gray-400'} />
          <span>Logs de Eventos</span>
        </button>
        <button
          onClick={() => setActiveSubTab('closings')}
          className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'closings' 
              ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-indigo-650 border border-gray-100/80 font-black' 
              : 'text-gray-550 hover:text-gray-800 hover:bg-gray-50/50'
          }`}
        >
          <History size={14} className={activeSubTab === 'closings' ? 'text-indigo-600' : 'text-gray-400'} />
          <span>Histórico de Fechamentos</span>
        </button>
      </div>

      {activeSubTab === 'closings' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ClosingHistoryTab />
        </motion.div>
      ) : (
        <div className="space-y-6">
          
          {/* Quick Stats Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-450 animate-pulse">Total em Multas</p>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
                  <TrendingDown size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-rose-600 mt-2">
                -{totalPenalties} <span className="text-[11px] font-black uppercase font-sans text-gray-400">pts</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-450 font-semibold">
                <ShieldAlert size={12} className="text-gray-450" />
                <span>Penalidades automáticas aplicadas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-455">Prêmios & Reversões</p>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500">
                  <Sparkles size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-600 mt-2">
                +{totalRewardsAndReversals} <span className="text-[11px] font-black uppercase font-sans text-gray-400">pts</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-450 font-semibold">
                <Check size={12} className="text-emerald-500 stroke-[3]" />
                <span>Contestações e incentivos manuais</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-450">Movimentações Ativas</p>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500">
                  <Activity size={16} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-indigo-700 mt-2">
                {totalActiveLogs} <span className="text-[11px] font-black uppercase font-sans text-gray-400">logs</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-450 font-semibold">
                <Info size={12} className="text-indigo-400" />
                <span>Auditoria total registrada em frota</span>
              </div>
            </div>
          </div>

          {/* Quick Audit Action Bar */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-200/80 p-5 flex flex-col md:flex-row items-center justify-between gap-4.5 shadow-sm">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wilder">Mecanismo de Auditoria Ativo</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium">As decisões de escalas atrasadas e multas são verificadas periodicamente, mas você pode forçar no botão ao lado.</p>
            </div>
            <button 
              onClick={() => handleRunAudit(false)}
              disabled={saving}
              className="w-full md:w-auto h-11 px-6 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 shrink-0 group active:scale-95 duration-150"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Processando Auditoria...</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} className="group-hover:rotate-12 transition-transform" />
                  <span>Executar Auditoria Agora</span>
                </>
              )}
            </button>
          </div>

          {/* Core Table View / Database Control Card */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden flex flex-col">
            
            {/* Header, Search & Filter Subsystem */}
            <div className="p-4.5 md:p-5 border-b border-gray-105 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-sans">
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest font-sans">Logs de Auditoria Estendida</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase font-sans">Histórico analítico de transações de score</p>
              </div>

              {/* Functional Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-sans">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por motorista ou motivo..."
                    className="w-full h-9.5 pl-9 pr-4 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-indigo-400 rounded-xl text-xs font-medium placeholder-gray-400 transition-all outline-none"
                  />
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Selector Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-sans">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'penalty', label: 'Multas' },
                    { id: 'reward', label: 'Bônus' },
                    { id: 'reversal', label: 'Reversões' },
                    { id: 'manual', label: 'Ajustes' }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setFilterType(pill.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                        filterType === pill.id 
                          ? 'bg-gray-900 text-white shadow-sm font-black' 
                          : 'bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/40'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Listings */}
            <div className="flex-1 overflow-x-auto">
              
              {/* Responsive Wide Desktop Table Container */}
              <table className="w-full text-left border-collapse hidden md:table font-sans">
                <thead className="bg-gray-50/70 border-b border-gray-150/80 sticky top-0 font-sans">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest font-sans">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Data / Hora</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest font-sans">
                      <div className="flex items-center gap-1">
                        <User size={11} />
                        <span>Perfil Motorista</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest font-sans">Tipo</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center font-sans">Pontuação</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest font-sans font-sans">Justificativa</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right font-sans">Ação Corretiva</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 font-sans">
                          <Loader2 size={24} className="animate-spin text-gray-300" />
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Buscando do banco de dados...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => {
                      const isDeduction = log.type === 'penalty' || (log.type === 'manual' && log.amount > 0 && !log.reason.toLowerCase().includes('bônus'));
                      const isContested = log.reason.includes('[CONTESTADO]');
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/20 transition-colors">
                          <td className="px-6 py-4.5 whitespace-nowrap text-xs font-semibold text-gray-500 font-mono">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-6.5 w-6.5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-extrabold text-gray-500 uppercase">
                                {(log.profiles?.full_name || 'SI')[0]}
                              </div>
                              <span className="text-xs font-extrabold text-gray-800">
                                {log.profiles?.full_name || 'SISTEMA (Global)'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              log.type === 'penalty' ? 'bg-rose-50/50 text-rose-700 border-rose-100' : 
                              log.type === 'reversal' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' :
                              log.type === 'reward' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' : 
                              'bg-indigo-50/50 text-indigo-700 border-indigo-100'
                            }`}>
                              {log.type === 'penalty' ? 'Multa' : 
                               log.type === 'reversal' ? 'Reversão' :
                               log.type === 'reward' ? 'Bônus' : 
                               'Ajuste'}
                            </span>
                          </td>
                          <td className={`px-6 py-4.5 whitespace-nowrap text-center font-mono font-black text-xs`}>
                            <span className={`px-2 py-0.5 rounded ${
                              log.type === 'reward' || log.type === 'reversal' ? 'text-emerald-600 bg-emerald-50/30' : 'text-rose-600 bg-rose-50/30'
                            }`}>
                              {log.type === 'reward' || log.type === 'reversal' ? '+' : '-'}{log.amount} pts
                            </span>
                          </td>
                          <td className="px-6 py-4.5 max-w-[280px]">
                            <p className="text-xs text-gray-500 font-medium leading-relaxed truncate hover:text-gray-800 cursor-help" title={log.reason}>
                              {log.reason}
                            </p>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-right">
                            {isDeduction && !isContested ? (
                              <button
                                onClick={() => {
                                  setContestingLog(log);
                                  setContestPointsAmount(log.amount);
                                }}
                                className="px-3.5 py-1.5 hover:bg-gray-900 border border-gray-200 hover:border-gray-900 text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 duration-100"
                              >
                                Contestar
                              </button>
                            ) : isContested ? (
                              <div className="inline-flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                                <Check size={11} className="stroke-[3]" />
                                <span>Revertido</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold font-mono">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest italic bg-gray-50/20">
                        Nenhum registro de log localizado no escopo atual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Beautiful Timeline Mobile Stream Cards */}
              <div className="md:hidden p-4 space-y-4">
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-gray-300" />
                    <span className="text-[10px] text-gray-400 font-black uppercase">Pesquisando Logs...</span>
                  </div>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const isDeduction = log.type === 'penalty' || (log.type === 'manual' && log.amount > 0 && !log.reason.toLowerCase().includes('bônus'));
                    const isContested = log.reason.includes('[CONTESTADO]');
                    
                    return (
                      <div 
                        key={log.id} 
                        className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 transition-all relative overflow-hidden ${
                          log.type === 'penalty' ? 'border-rose-100' : 
                          log.type === 'reversal' || log.type === 'reward' ? 'border-emerald-100' : 'border-indigo-100'
                        }`}
                      >
                        {/* Top Metadata */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-mono text-gray-400 uppercase">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            log.type === 'penalty' ? 'bg-rose-50 text-rose-700' : 
                            log.type === 'reversal' ? 'bg-emerald-50 text-emerald-700' :
                            log.type === 'reward' ? 'bg-emerald-50 text-emerald-700' : 
                            'bg-indigo-50 text-indigo-700'
                          }`}>
                            {log.type === 'penalty' ? 'Multa' : 
                             log.type === 'reversal' ? 'Reversão' :
                             log.type === 'reward' ? 'Bônus' : 
                             'Ajuste'}
                          </span>
                        </div>

                        {/* Driver & Amount Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6.5 w-6.5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-extrabold text-gray-500">
                              {(log.profiles?.full_name || 'SI')[0]}
                            </div>
                            <span className="text-xs font-black text-gray-800">
                              {log.profiles?.full_name || 'SISTEMA (Global)'}
                            </span>
                          </div>
                          
                          <span className={`text-sm font-extrabold font-mono ${
                            log.type === 'reward' || log.type === 'reversal' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {log.type === 'reward' || log.type === 'reversal' ? '+' : '-'}{log.amount} pts
                          </span>
                        </div>

                        {/* description and contest container */}
                        <div className="bg-gray-50 p-2.5 rounded-xl text-[11px] text-gray-550 leading-relaxed font-semibold italic border border-gray-100">
                          {log.reason}
                        </div>

                        {/* actions button mobile */}
                        {isDeduction && !isContested ? (
                          <button
                            onClick={() => {
                              setContestingLog(log);
                              setContestPointsAmount(log.amount);
                            }}
                            className="w-full py-2.5 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black text-center"
                          >
                            Contestar este Log
                          </button>
                        ) : isContested ? (
                          <div className="text-center py-2 bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-1.5 border border-gray-205/50">
                            <Check size={11} className="stroke-[3]" />
                            <span>Contestação Aceita / Revertido</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-xs text-gray-400 font-extrabold uppercase tracking-widest italic border-2 border-dashed border-gray-100 rounded-2xl">
                    Nenhum log encontrado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modern Drawer / Modal for Running Audits manually */}
      <AnimatePresence>
        {showRunConfirm && (
          <div className="fixed inset-0 bg-gray-905/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 shadow-2xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="p-6 relative text-center">
                
                <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} />
                </div>
                
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Forçar Auditoria de Escalas</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-2 mx-2">
                  Deseja realmente iniciar a verificação de escalas pendentes para aplicar penalidades automáticas (atraso/falta) no perfil dos motoristas?
                </p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowRunConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-105 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors duration-150"
                  >
                    Não, cancelar
                  </button>
                  <button
                    onClick={executeRunAudit}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    Sim, Processar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Contestação Modernizado */}
      <AnimatePresence>
        {contestingLog && (
          <div className="fixed inset-0 bg-gray-905/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 shadow-2xl"
            >
              <div className="p-6">
                
                {/* Header title */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5 text-indigo-700">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                      <RotateCcw size={16} className="text-indigo-650" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">Contestar Operação</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Estorno ou reversão pontual de score</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setContestingLog(null)}
                    className="h-8 w-8 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center rounded-lg"
                    disabled={isSavingContest}
                  >
                    <X size={15} />
                  </button>
                </div>
                
                {/* Information Box */}
                <div className="bg-gradient-to-br from-gray-50 to-white p-4.5 rounded-2xl mb-5 border border-gray-200/60 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Metadados da Auditoria</span>
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      -{contestingLog.amount} pts
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] uppercase font-black text-gray-400">Motorista penalizado</p>
                      <p className="font-extrabold text-gray-800 text-[11px]">{contestingLog.profiles?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black text-gray-400">Log Original</p>
                      <p className="font-mono text-[10px] text-gray-500 font-semibold">{new Date(contestingLog.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100/80 pt-2 mt-1 flex items-start gap-1">
                    <CornerDownRight size={13} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-gray-550 font-semibold italic">"{contestingLog.reason}"</p>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-405 uppercase tracking-widest mb-1.5">
                      Número de Pontos a Reverter (Máx: {contestingLog.amount})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={contestingLog.amount}
                      value={contestPointsAmount}
                      onChange={(e) => setContestPointsAmount(Math.min(contestingLog.amount, Math.max(1, Number(e.target.value))))}
                      className="w-full h-11 px-4 bg-gray-50 hover:bg-gray-100/40 focus:bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl text-sm font-black font-mono text-gray-800 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-405 uppercase tracking-widest mb-1.5">
                      Justificativa Técnica da Relação
                    </label>
                    <textarea
                      value={contestReason}
                      onChange={(e) => setContestReason(e.target.value)}
                      className="w-full h-24 px-4 py-3 bg-gray-50 hover:bg-gray-100/40 focus:bg-white border border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl text-xs font-semibold leading-relaxed text-gray-800 outline-none transition-all resize-none"
                      placeholder="Indique o motivo formal de cancelamento desta pontuação..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setContestingLog(null)}
                    disabled={isSavingContest}
                    className="flex-1 h-11 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors duration-150"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleContestLog}
                    disabled={isSavingContest || !contestReason.trim() || contestPointsAmount <= 0 || contestPointsAmount > contestingLog.amount}
                    className="flex-1 h-11 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-55 duration-150 flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-650/10"
                  >
                    {isSavingContest ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} className="stroke-[3]" /> 
                        <span>Reverter Penalidade</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
