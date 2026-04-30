import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Ranking() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemType, setSystemType] = useState('points');

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const { data: settings } = await supabase.from('app_settings').select('system_type').single();
      if (settings) setSystemType(settings.system_type);

      const { data, error } = await supabase
        .from('driver_performance')
        .select(`
          score,
          profiles!inner(
            full_name,
            role
          )
        `)
        .eq('profiles.role', 'driver')
        .order('score', { ascending: false });

      if (error) throw error;
      
      // Filter out internal drivers and limit
      const filtered = (data || [])
        .filter((item: any) => !item.profiles?.full_name?.endsWith('//INTERNO'))
        .slice(0, 20);

      setRanking(filtered);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 py-10 pb-24">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white border border-app-border flex items-center justify-center hover:bg-zinc-50 transition-colors"
        >
          <ChevronLeft size={20} className="text-text-main" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight">Ranking de Motoristas</h2>
          <p className="text-text-muted text-xs font-medium uppercase tracking-widest">Os melhores da operação</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Carregando classificação...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.map((item, index) => {
            const isTop3 = index < 3;
            const colors = ['text-yellow-500', 'text-zinc-400', 'text-amber-600'];
            const bgColors = ['bg-yellow-50', 'bg-zinc-50', 'bg-amber-50'];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bento-card !flex-row items-center gap-4 ${isTop3 ? 'border-primary/20 bg-primary/5' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isTop3 ? `${bgColors[index]} ${colors[index]}` : 'bg-app-bg text-text-muted'}`}>
                  {index === 0 ? <Trophy size={18} /> : index + 1}
                </div>
                
                <div className="flex-1">
                  <span className={`block font-bold text-sm ${isTop3 ? 'text-text-main' : 'text-text-main'}`}>
                    {item.profiles?.full_name || 'Motorista'}
                  </span>
                  <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider">
                    {index === 0 ? 'Líder da Operação' : 'Consistência Operacional'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="block font-black text-text-main text-lg tabular-nums">
                    {systemType === 'cash' ? `R$ ${item.score}` : item.score}
                  </span>
                  <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest">
                    {systemType === 'cash' ? 'Saldo' : 'Pontos'}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {ranking.length === 0 && (
            <div className="text-center py-10 bg-app-bg/50 rounded-2xl border border-dashed border-app-border">
              <Star size={32} className="mx-auto text-app-border mb-3" />
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Nenhum dado de ranking disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Reward Info */}
      <div className="bg-zinc-900 rounded-2xl p-6 text-white overflow-hidden relative shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Medal size={80} />
        </div>
        <div className="relative z-10">
          <h4 className="font-black text-lg mb-1">Mantenha sua pontuação!</h4>
          <p className="text-white/70 text-xs font-medium leading-relaxed">
            Motoristas com score acima de 950 pontos no final do mês podem ser elegíveis para bonificações extras. 
            Realize todos os checklists da escala para evitar penalidades.
          </p>
        </div>
      </div>
    </div>
  );
}