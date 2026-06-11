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
      const [subsRes, itemsRes] = await Promise.all([
        supabase.from('checklist_submissions')
          .select(`
            id, 
            created_at, 
            odometer, 
            details, 
            type,
            vehicles(id, plate)
          `)
          .eq('driver_id', user!.id)
          .eq('type', 'fuel')
          .order('created_at', { ascending: true }),
        supabase.from('checklist_items')
          .select('id, title, input_type')
          .eq('input_type', 'fuel_liters')
      ]);
        
      if (subsRes.error) throw subsRes.error;
      
      const submissions = subsRes.data || [];
      const fuelLiterItems = itemsRes.data || [];
      
      const getLitersInfo = (details: any) => {
        let liters = 0;
        let hasAdjustment = false;

        if (details?.itemTitles && details?.itemValues) {
          let entry = null;
          if (fuelLiterItems.length > 0) {
            const literItemIds = fuelLiterItems.map(item => item.id);
            const match = Object.entries(details.itemTitles).find(([id, _]: any) => literItemIds.includes(id));
            if (match) entry = match;
          }
          if (!entry) {
            entry = Object.entries(details.itemTitles).find(([_, title]: any) => {
              const t = title.toLowerCase();
              return t.includes('litro') || t.includes('quantidade') || t.includes('valor') || t.includes('lts');
            });
          }
          if (entry) {
            liters = parseFloat(details.itemValues[entry[0]]?.toString().replace(',','.') || '0');
          }
        }

        if (details?.adjusted_liters !== undefined && details?.adjusted_liters !== null && details.adjusted_liters !== '') {
          liters = parseFloat(details.adjusted_liters.toString().replace(',','.'));
          hasAdjustment = true;
        }

        return { liters, hasAdjustment };
      };

      const byVehicle: Record<string, any[]> = {};
      submissions.forEach(sub => {
        const v = Array.isArray(sub.vehicles) ? sub.vehicles[0] : sub.vehicles;
        const vId = v?.id;
        if (!vId) return;
        if (!byVehicle[vId]) byVehicle[vId] = [];
        byVehicle[vId].push({ 
          ...sub, 
          vehicles: v,
          created_at: sub.details?.adjusted_date || sub.created_at,
          odometer: sub.details?.adjusted_odometer !== undefined && sub.details?.adjusted_odometer !== null 
            ? parseInt(sub.details.adjusted_odometer, 10) 
            : sub.odometer
        });
      });

      const enrichedSubmissions: any[] = [];
      Object.values(byVehicle).forEach(vehicleSubs => {
        // Sort explicitly by the (potentially adjusted) time
        vehicleSubs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        let lastFuelSub: any = null;
        vehicleSubs.forEach((sub) => {
          const { liters, hasAdjustment } = getLitersInfo(sub.details);
          if (liters > 0) {
            let distance = 0;
            let avg = 0;
            if (lastFuelSub) {
              distance = (sub.odometer || 0) - (lastFuelSub.odometer || 0);
              if (distance > 0) avg = distance / liters;
            }
            enrichedSubmissions.push({
              ...sub,
              liters,
              hasAdjustment,
              distance,
              average: avg
            });
            lastFuelSub = sub;
          }
        });
      });

      enrichedSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setData(enrichedSubmissions.filter(item => item.details?.average_status === 'reviewed'));

    } catch (error) {
      console.error('Erro ao buscar médias:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full text-text-main shadow-sm border border-app-border"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
            <Droplets className="text-primary" />
            Minhas Médias
          </h1>
          <p className="text-sm text-text-muted font-bold mt-1">
            Seu histórico de consumo e médias de veículos.
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
              <p className="text-sm font-bold uppercase tracking-widest">Nenhuma média registrada ainda</p>
            </div>
          ) : data.map((item, index) => {
            const isPending = item.details?.average_status !== 'reviewed';
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                className="bg-white border text-left p-5 rounded-3xl shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex  items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-text-main leading-tight tracking-tight">
                        {item.vehicles?.plate}
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
                      {item.liters > 0 ? `${item.liters} L` : '-'}
                      {item.hasAdjustment && <span className="text-amber-500 ml-1" title="Litros ajustados pelo gestor">*</span>}
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
