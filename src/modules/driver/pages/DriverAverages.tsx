import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Truck, AlertCircle, Droplets, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';

export default function DriverAverages() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const avgsRes = await supabase.from('vehicle_averages')
        .select(`
          id,
          created_at,
          start_date,
          end_date,
          start_odometer,
          end_odometer,
          distance,
          liters,
          average,
          status,
          vehicles(id, plate)
        `)
        .eq('driver_id', user!.id)
        .order('start_date', { ascending: false });

      if (avgsRes.error) throw avgsRes.error;

      const formatted = (avgsRes.data || []).map(row => ({
        id: row.id,
        created_at: row.start_date || row.created_at,
        distance: row.distance || 0,
        liters: row.liters || 0,
        average: row.average || 0,
        vehicles: row.vehicles,
        status: row.status,
        details: {
          average_status: row.status
        }
      }));
      setData(formatted);
    } catch (error) {
      console.error('Erro ao buscar médias:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-24 text-left">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full text-text-main shadow-sm border border-app-border cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
            <Droplets className="text-primary" />
            Minhas Médias
          </h1>
          <p className="text-sm text-text-muted font-bold mt-1">
            Seu histórico de consumo e médias de veículos registrado na tabela de médias.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-app-border text-center text-text-muted">
              <Droplets size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhuma média registrada ou revisada ainda</p>
            </div>
          ) : data.map((item, index) => {
            const isPending = item.status === 'pending';
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                className="bg-white border text-left p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-text-main leading-tight tracking-tight">
                        {item.vehicles?.plate || 'Sem Veículo'}
                      </h4>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                    isPending ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isPending ? (
                      <><Clock size={12} /> Aguardando Revisão</>
                    ) : (
                      <><CheckCircle2 size={12} /> Revisado</>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <span className="block text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                      Distância
                    </span>
                    <span className="text-sm font-black text-text-main font-mono">
                      {item.distance > 0 ? `${item.distance.toLocaleString('pt-BR')} km` : '-'}
                    </span>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <span className="block text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                      Litros
                    </span>
                    <span className="text-sm font-black text-text-main font-mono relative">
                      {item.liters > 0 ? `${item.liters.toFixed(2)} L` : '-'}
                    </span>
                  </div>
                  <div className={`rounded-xl p-3 ${isPending ? 'bg-orange-50' : 'bg-primary/5'}`}>
                    <span className={`block text-[9px] uppercase tracking-widest font-bold mb-1 ${isPending ? 'text-orange-700' : 'text-primary'}`}>
                      Média
                    </span>
                    <span className={`text-xl font-black font-mono leading-none ${isPending ? 'text-orange-700' : 'text-primary'}`}>
                      {item.average > 0 ? item.average.toFixed(2) : '-'}
                      {item.average > 0 && <span className="text-[10px] ml-1 opacity-70">km/L</span>}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
