import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Star, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DriverRankingDetailsModal from './DriverRankingDetailsModal';

export default function RankingTab({ appSettings }: { appSettings: any }) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  
  // 'current' or a closing.id
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  useEffect(() => {
    fetchClosings();
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [selectedPeriod]);

  const fetchClosings = async () => {
    const { data } = await supabase.from('score_closings').select('id, period_start, period_end').order('created_at', { ascending: false });
    if (data) setClosings(data);
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const fetchRanking = async () => {
    setLoading(true);
    try {
      if (selectedPeriod === 'current') {
        const { data: drivers } = await supabase
          .from('profiles')
          .select('id, full_name, role, participates_in_ranking, driver_performance(score, total_checklists)')
          .eq('role', 'driver');

        if (!drivers) {
          setRanking([]);
          setLoading(false);
          return;
        }

        const ranked = drivers
          .filter(driver => driver.participates_in_ranking !== false)
          .map(driver => ({
          ...driver,
          score: driver.driver_performance?.[0]?.score || (appSettings?.initial_value || 1000),
          total_checklists: driver.driver_performance?.[0]?.total_checklists || 0
        })).sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          // Se empatar na pontuação, ganha quem fez mais escalas
          return (b.total_checklists || 0) - (a.total_checklists || 0);
        });

        setRanking(ranked);
      } else {
        const { data: items } = await supabase
          .from('score_closing_items')
          .select('driver_id, score, total_checklists, profiles(full_name)')
          .eq('closing_id', selectedPeriod);

        if (!items) {
          setRanking([]);
        } else {
          const ranked = items.map((item: any) => ({
            id: item.driver_id,
            full_name: item.profiles?.full_name || 'Motorista',
            score: item.score,
            total_checklists: item.total_checklists || 0
          })).sort((a, b) => {
             if (b.score !== a.score) return b.score - a.score;
             return (b.total_checklists || 0) - (a.total_checklists || 0);
          });
          setRanking(ranked);
        }
      }
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
          <h2 className="text-xl font-black text-text-main tracking-tight">Ranking Oficial</h2>
          <p className="text-xs font-semibold text-text-muted">Desempenho dos motoristas por período base</p>
        </div>
        <div className="flex items-center gap-2">
          <History size={18} className="text-text-muted" />
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field max-w-[250px] cursor-pointer"
          >
            <option value="current">Período Atual (Em Aberto)</option>
            {closings.map(c => (
               <option key={c.id} value={c.id}>
                 Fechado: {formatDate(c.period_start)} a {formatDate(c.period_end)}
               </option>
            ))}
          </select>
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
                  onClick={() => {
                     // Only open details if it's current. For old closings, we'd need to adapt the modal.
                     if (selectedPeriod === 'current') setSelectedDriver(item);
                  }}
                  className={`flex items-center gap-4 p-4 hover:bg-app-bg/50 transition-colors ${selectedPeriod === 'current' ? 'cursor-pointer' : ''} ${isTop3 ? 'bg-primary/5' : ''}`}
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
                      {' • '}{item.total_checklists || 0} {(item.total_checklists === 1) ? 'Escala' : 'Escalas'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block font-black text-text-main text-lg tabular-nums">
                      {appSettings?.system_type === 'cash' ? `R$ ${item.score}` : item.score}
                    </span>
                    <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest">
                      {appSettings?.system_type === 'cash' ? 'Saldo no Período' : 'Pontos no Período'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDriver && selectedPeriod === 'current' && (
          <DriverRankingDetailsModal
            driver={selectedDriver}
            month={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
            appSettings={appSettings}
            onClose={() => setSelectedDriver(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
