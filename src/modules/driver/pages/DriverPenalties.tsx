import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Clock, MapPin, Trophy } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';

export default function DriverPenalties() {
  const { user } = useAuth();
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemType, setSystemType] = useState('points');

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    try {
      if (!user) return;

      const { data: settings } = await supabase.from('app_settings').select('system_type').eq("company_id", user?.company_id).maybeSingle();
      if (settings) setSystemType(settings.system_type);

      // Start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('driver_id', user.id)
        .in('type', ['penalty', 'manual'])
        .gte('created_at', startOfMonth)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching penalties:', error);
      } else {
        setPenalties(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAmountStr = (amount: number) => {
    const val = Math.abs(amount);
    return systemType === 'cash' ? `R$ ${val.toFixed(2)}` : `${val} pts`;
  };

  const totalPenalties = penalties.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 py-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight">Descontos</h2>
        <p className="text-text-muted text-sm font-medium">Histórico de penalidades no mês atual.</p>
      </div>

      <div className="bento-card bg-red-50/50 border-red-100 flex flex-col items-center justify-center p-6 space-y-2">
        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-100 px-2 py-1 rounded inline-flex items-center gap-1">
          <AlertTriangle size={12} /> Total Descontado
        </span>
        <span className="text-4xl font-black text-red-600">
          -{getAmountStr(totalPenalties)}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-app-border" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            {penalties.length} {penalties.length === 1 ? 'registro' : 'registros'} neste mês
          </span>
          <div className="h-px flex-1 bg-app-border" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Carregando descontos...</span>
          </div>
        ) : penalties.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bento-card bg-green-50 border-green-200"
          >
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
              <Trophy size={28} className="text-green-600" />
            </div>
            <p className="text-lg font-black text-green-800">Parabéns!</p>
            <p className="text-sm text-green-700 mt-1 font-medium">Você não teve nenhum desconto neste mês. Excelente trabalho!</p>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {penalties.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bento-card !p-4 border-red-100/30 flex justify-between items-center bg-white"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-main">Desconto Aplicado</span>
                  </div>
                  <p className="text-xs font-medium text-text-muted">{item.reason}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted/70 uppercase tracking-wider mt-2">
                    <Clock size={10} />
                    {new Date(item.created_at).toLocaleDateString()} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="text-right whitespace-nowrap pl-4">
                  <span className="text-lg font-black text-red-500">
                    -{getAmountStr(item.amount)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
