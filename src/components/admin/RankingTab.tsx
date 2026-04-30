import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Star, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DriverRankingDetailsModal from './DriverRankingDetailsModal';

export default function RankingTab({ appSettings }: { appSettings: any }) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchRanking();
  }, [month]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      // Fetch all standard drivers
      const { data: drivers } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'driver')
        .not('full_name', 'like', '%//INTERNO%');

      if (!drivers) {
         setRanking([]);
         setLoading(false);
         return;
      }

      // Filter by month
      const [yearStr, monthStr] = month.split('-');
      const startOfMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toISOString();
      const endOfMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999).toISOString();

      // Fetch audit logs for the selected month to calculate monthly score
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('driver_id, type, amount')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      const auditMap = auditLogs?.reduce((acc: any, log: any) => {
        if (!acc[log.driver_id]) {
           acc[log.driver_id] = { penalty: 0, reward: 0, manual: 0 };
        }
        if (log.type === 'penalty') acc[log.driver_id].penalty += Number(log.amount);
        else if (log.type === 'reward') acc[log.driver_id].reward += Number(log.amount);
        else if (log.type === 'manual') acc[log.driver_id].manual += Number(log.amount); 
        return acc;
      }, {}) || {};

      const initialValue = appSettings?.initial_value || 1000;

      const ranked = drivers.map(driver => {
         const audits = auditMap[driver.id] || { penalty: 0, reward: 0, manual: 0 };
         // Score for the month: initial - penalties + rewards (assuming manual adjust is signed properly, commonly it's handled as addition if pos or neg)
         const monthScore = initialValue - audits.penalty + audits.reward + audits.manual;
         return {
            ...driver,
            score: monthScore
         };
      }).sort((a, b) => b.score - a.score);

      setRanking(ranked);
    } catch (error) {
      console.error('Erro ao buscar o ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-main tracking-tight">Ranking Mensal</h2>
          <p className="text-xs font-semibold text-text-muted">Desempenho dos motoristas por mês base (Pontuação Inicial: {appSettings?.initial_value || 1000})</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-text-muted" />
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input-field max-w-[200px]"
          />
        </div>
      </div>

      <div className="bento-card !p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs font-bold text-text-muted animate-pulse">Carregando ranking...</div>
        ) : ranking.length === 0 ? (
          <div className="p-10 text-center">
            <Star size={32} className="mx-auto text-app-border mb-3" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Nenhum motorista disponível no ranking</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {ranking.map((item, index) => {
              const isTop3 = index < 3;
              const colors = ['text-yellow-500', 'text-zinc-400', 'text-amber-600'];
              const bgColors = ['bg-yellow-50', 'bg-zinc-50', 'bg-amber-50'];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedDriver(item)}
                  className={`flex items-center gap-4 p-4 hover:bg-app-bg/50 transition-colors cursor-pointer ${isTop3 ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${isTop3 ? `${bgColors[index]} ${colors[index]}` : 'bg-app-bg border border-app-border text-text-muted'}`}>
                    {index === 0 ? <Trophy size={18} /> : index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className={`block font-bold text-sm truncate ${isTop3 ? 'text-text-main' : 'text-text-main'}`}>
                      {item.full_name || 'Motorista'}
                    </span>
                    <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider truncate">
                      {index === 0 ? 'Líder da Operação' : 'Consistência Operacional'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block font-black text-text-main text-lg tabular-nums">
                      {appSettings?.system_type === 'cash' ? `R$ ${item.score}` : item.score}
                    </span>
                    <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest">
                      {appSettings?.system_type === 'cash' ? 'Saldo no Mês' : 'Pontos no Mês'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDriver && (
          <DriverRankingDetailsModal
            driver={selectedDriver}
            month={month}
            appSettings={appSettings}
            onClose={() => setSelectedDriver(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
