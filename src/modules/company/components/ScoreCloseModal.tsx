import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface ScoreCloseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialScore: number;
}

export default function ScoreCloseModal({ onClose, onSuccess, initialScore }: ScoreCloseModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Format YYYY-MM-DD
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCloseScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return alert('Selecione as datas de início e fim');
    
    if (!confirm(`Deseja realmente fechar o período de ${startDate} a ${endDate} e resetar os saldos para ${initialScore}?`)) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create a closing record
      const { data: closingRec, error: closingErr } = await supabase
        .from('score_closings')
        .insert({
          period_start: startDate,
          period_end: endDate,
          closed_by: user?.id
        })
        .select()
        .single();
      
      if (closingErr) throw closingErr;

      // Ensure full end date including time
      const endDateTime = new Date(`${endDate}T23:59:59.999`).toISOString();
      const startDateTime = new Date(`${startDate}T00:00:00`).toISOString();

      const { data: schedules } = await supabase
        .from('schedules')
        .select('driver_id')
        .gte('start_at', startDateTime)
        .lte('start_at', endDateTime);

      const scheduleCounts = schedules?.reduce((acc: any, s: any) => {
         if (s.driver_id) acc[s.driver_id] = (acc[s.driver_id] || 0) + 1;
         return acc;
      }, {}) || {};

      // 2. Fetch current drivers performance
      const { data: drivers } = await supabase.from('profiles').select('id, participates_in_ranking, score_profile_id, score_profiles(base_value, calculation_type), driver_performance(*)').eq('role', 'driver');
      
      const itemsToInsert = [];
      const resetsToUpsert = [];

      if (drivers && drivers.length > 0) {
         for (const d of drivers) {
             if (d.participates_in_ranking === false) continue;
             
             let driverInitialScore = initialScore;
             const sp: any = d.score_profiles;
             if (sp) {
                if (sp.calculation_type === 'fixed' && sp.base_value !== undefined) {
                    driverInitialScore = Number(sp.base_value);
                } else if (sp.calculation_type !== 'fixed') {
                    driverInitialScore = 0;
                }
             }

             const perf = Array.isArray(d.driver_performance) ? d.driver_performance[0] : d.driver_performance || { score: driverInitialScore, total_checklists: 0 };
             itemsToInsert.push({
                 closing_id: closingRec.id,
                 driver_id: d.id,
                 score: perf.score,
                 total_checklists: scheduleCounts[d.id] || 0
             });

             resetsToUpsert.push({
                 driver_id: d.id,
                 score: driverInitialScore,
                 total_checklists: 0,
                 updated_at: new Date().toISOString()
             });
         }
         
         // 3. Insert closing items
         if (itemsToInsert.length > 0) {
             const { error: itemsErr } = await supabase.from('score_closing_items').insert(itemsToInsert);
             if (itemsErr) throw itemsErr;
         }

         // 4. Reset scores
         if (resetsToUpsert.length > 0) {
             const { error: resetErr } = await supabase.from('driver_performance').upsert(resetsToUpsert);
             if (resetErr) throw resetErr;
         }
      }

      // Log in audit
      await supabase.from('audit_logs').insert({
        driver_id: null,
        type: 'reset',
        amount: initialScore,
        reason: `Fechamento de ciclo (${startDate} a ${endDate}) e reset de saldos`
      });

      alert('Fechamento concluído com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Error closing score:', error);
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h2 className="text-sm font-black text-text-main uppercase tracking-widest text-center flex-1">
            Fechamento de Pontuação
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCloseScore} className="p-6 space-y-5">
           <div className="bg-zinc-50 p-4 rounded-xl border border-app-border space-y-4">
              <div>
                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">
                    Data Inicial do Fechamento
                 </label>
                 <div className="relative">
                   <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                   <input
                     type="date"
                     required
                     value={startDate}
                     onChange={e => setStartDate(e.target.value)}
                     className="w-full h-10 pl-9 pr-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
                   />
                 </div>
              </div>
              
              <div>
                 <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">
                    Data Final do Fechamento
                 </label>
                 <div className="relative">
                   <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                   <input
                     type="date"
                     required
                     value={endDate}
                     onChange={e => setEndDate(e.target.value)}
                     className="w-full h-10 pl-9 pr-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
                   />
                 </div>
              </div>
           </div>
           
           <div className="text-center">
             <p className="text-xs text-text-muted font-medium px-2">
               O histórico de todos os motoristas será salvo até a data final selecionada. 
               O saldo ativo será <strong className="text-primary font-black uppercase">resetado para {initialScore} pontos</strong>.
             </p>
           </div>
           
           <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
           >
              {loading ? 'Processando Fechamento...' : 'Confirmar Fechamento e Resetar Saldos'}
           </button>
        </form>
      </div>
    </div>
  );
}
