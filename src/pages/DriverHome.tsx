import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Fuel, Route, ClipboardCheck, Trophy, AlertTriangle, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function DriverHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState({ name: 'Carregando...', score: 0, checklists: 0, participates_in_ranking: true });
  const [systemType, setSystemType] = useState('points');
  const [activeSchedule, setActiveSchedule] = useState<any>(null);

  useEffect(() => {
    fetchDriverStats();
  }, []);

  const fetchDriverStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase.from('app_settings').select('system_type').single();
      if (settings) setSystemType(settings.system_type);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      let score = 0;
      const { data: perf, error: perfError } = await supabase
        .from('driver_performance')
        .select('score')
        .eq('driver_id', user.id)
        .maybeSingle();
      
      if (perfError) {
        console.error('Error fetching performance:', perfError);
      } else if (!perf) {
        // Record missing. Driver cannot insert due to RLS, so default locally.
        score = 1000;
      } else {
        score = perf.score;
      }
      
      const { count, error: countError } = await supabase
        .from('checklist_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', user.id);

      if (countError) console.error('Error fetching submissions count:', countError);

      setDriverInfo({
        name: profile?.full_name || user.email?.split('@')[0] || 'Motorista',
        score: score,
        checklists: count || 0,
        participates_in_ranking: profile?.participates_in_ranking !== false
      });

      // Fetch relevant schedule (Active or Next Upcoming)
      // We look for schedules that haven't expired for more than 30 mins
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      const { data: fetchedSchedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, start_at, end_at, start_checklist_id, end_checklist_id, fuel_checklist_id, requires_fueling, vehicles(plate, requires_trailer), routes(origin, destination)')
        .eq('driver_id', user.id)
        .gte('end_at', thirtyMinsAgo.toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
      } else if (fetchedSchedules && fetchedSchedules.length > 0) {
        // Find the most appropriate one to show:
        const active = fetchedSchedules.find(s => 
          new Date(s.start_at) <= now && new Date(s.end_at) >= thirtyMinsAgo
        );
        
        if (active) {
          setActiveSchedule(active);
        } else {
          // If no active, show the one with the closest start date
          setActiveSchedule(fetchedSchedules[0]);
        }
      } else {
        setActiveSchedule(null);
      }

    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  };

  const originalChecklistTypes = [
    { id: 'start', label: 'Início de Viagem', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Registre o início', field: 'start_checklist_id' },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel, color: 'text-warning', bg: 'bg-orange-50', desc: 'Litragem e KM', field: 'fuel_checklist_id' },
    { id: 'end', label: 'Fim de Viagem', icon: CheckCircle2, color: 'text-success', bg: 'bg-green-50', desc: 'Encerre jornada', field: 'end_checklist_id' },
  ];

  const checklistTypes = activeSchedule?.requires_fueling === false 
    ? originalChecklistTypes.filter(t => t.id !== 'fuel') 
    : originalChecklistTypes;

  const internalTypes = [
    { id: 'yard', label: 'Checklist de Pátio', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Inspeção interna de frota' },
  ];

  const displayedTypes = user?.isInternal ? internalTypes : checklistTypes;

  const [showScheduleOptions, setShowScheduleOptions] = useState(false);

  const isTypeDone = (typeId: string) => {
    if (!activeSchedule) return false;
    if (typeId === 'start') return !!activeSchedule.start_checklist_id;
    if (typeId === 'end') return !!activeSchedule.end_checklist_id;
    if (typeId === 'fuel') return !!activeSchedule.fuel_checklist_id;
    return false;
  };

  const isTypeLocked = (typeId: string) => {
    if (user?.isInternal) return false;
    // Se há escala ativa, os cards normais ficam totalmente inativos
    if (activeSchedule) return true;
    return false;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 py-10">
      {/* Welcome & Quick Stats */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight">{driverInfo.name}</h2>
        <p className="text-text-muted text-sm font-medium">Bom dia! Sua operação hoje começa agora.</p>
      </div>

      {!user?.isInternal ? (
      <div className={`grid ${driverInfo.participates_in_ranking ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {driverInfo.participates_in_ranking && (
          <button 
            onClick={() => navigate('/ranking')}
            className="bento-card items-center justify-center text-center hover:border-primary/30 active:bg-app-bg transition-all"
          >
            <Trophy className="text-warning mb-2" size={24} />
            <span className="text-3xl font-black text-text-main tabular-nums tracking-tighter">
              {systemType === 'cash' ? `R$ ${driverInfo.score}` : driverInfo.score}
            </span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {systemType === 'cash' ? 'Meu Saldo' : 'Sua Pontuação'}
            </span>
          </button>
        )}
        <div className="bento-card items-center justify-center text-center">
          <ClipboardCheck className="text-primary mb-2" size={24} />
          <span className="text-3xl font-black text-text-main tabular-nums tracking-tighter">{driverInfo.checklists}</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Checklists Mês</span>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="bento-card items-center justify-center text-center">
            <ClipboardCheck className="text-primary mb-2" size={24} />
            <span className="text-3xl font-black text-text-main tabular-nums tracking-tighter">{driverInfo.checklists}</span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Checklists Realizados no Mês</span>
          </div>
        </div>
      )}

      {/* Manual do App Link */}
      <button onClick={() => navigate('/driver-manual')} className="w-full flex items-center justify-between p-4 bg-white border border-app-border rounded-2xl shadow-sm hover:border-primary/30 active:bg-zinc-50 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex shrink-0 items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-text-main">Manual do App</h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted mt-0.5">Aprenda a usar o aplicativo</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-text-muted" />
      </button>

      {/* Active Schedule Alert */}
      {!user?.isInternal && activeSchedule && (
        <div 
          onClick={() => setShowScheduleOptions(!showScheduleOptions)}
          className={`border rounded-2xl p-5 flex flex-col gap-4 text-white shadow-lg overflow-hidden relative cursor-pointer transition-colors ${
            activeSchedule.start_checklist_id && activeSchedule.end_checklist_id 
              ? 'bg-success border-success/20' 
              : 'bg-primary border-primary/20'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Route size={100} />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="inline-flex px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest mb-3">
                {new Date() >= new Date(activeSchedule.start_at) ? 'Escala Ativa' : 'Próxima Escala'}
              </span>
              <h3 className="text-xl font-black tracking-tight">{activeSchedule.routes?.origin} &#8594; {activeSchedule.routes?.destination}</h3>
              <p className="text-white/80 text-sm font-medium mt-1">Veículo: <span className="font-mono">{activeSchedule.vehicles?.plate}</span></p>
            </div>
            <motion.div animate={{ rotate: showScheduleOptions ? 180 : 0 }}>
              <ChevronRight size={24} className="text-white/80 transform rotate-90" />
            </motion.div>
          </div>
          
          <div className="relative z-10">
            <AnimatePresence>
              {showScheduleOptions ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-3 mt-4" 
                  onClick={(e) => e.stopPropagation()}
                >
                  {checklistTypes.map((type) => {
                    const done = isTypeDone(type.id);
                    return (
                      <button
                        key={type.id}
                        disabled={done}
                        onClick={() => {
                          if (!done) navigate(`/checklist/${type.id}?schedule=${activeSchedule.id}`);
                        }}
                        className={`w-full h-14 rounded-xl flex items-center px-4 gap-3 font-black text-sm uppercase tracking-widest shadow-sm transition-all ${
                          done ? 'bg-[#299c5e] text-white border border-[#30b56d] cursor-default opacity-90' : 'bg-white text-primary hover:bg-zinc-50'
                        }`}
                      >
                        <type.icon size={20} />
                        <span className="flex-1 text-left">{type.label}</span>
                        {done && <CheckCircle2 size={20} />}
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-white/80 uppercase tracking-widest border-t border-white/20">
                  <span>Clique para opções de checklist</span>
                  {activeSchedule.start_checklist_id && activeSchedule.end_checklist_id && (
                    <span className="bg-white/20 px-2 py-0.5 rounded">Concluída</span>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Checklist Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{user?.isInternal ? 'Gestão de Frota' : 'Operação Diária'}</h3>
          <div className="h-px flex-1 mx-4 bg-app-border" />
        </div>
        <div className="grid gap-4">
          {displayedTypes.map((type) => {
            const done = isTypeDone(type.id);
            const locked = isTypeLocked(type.id);
            
            return (
              <motion.button
                key={type.id}
                whileTap={locked ? {} : { scale: 0.98 }}
                disabled={locked}
                onClick={() => navigate(activeSchedule ? `/checklist/${type.id}?schedule=${activeSchedule.id}` : `/checklist/${type.id}`)}
                className={`w-full bento-card !p-4 flex-row items-center gap-5 group transition-all ${
                  locked 
                    ? 'opacity-60 grayscale cursor-not-allowed border-dashed bg-gray-50/50' 
                    : 'hover:border-primary/30 active:bg-app-bg'
                }`}
              >
                <div className={`${done ? 'bg-green-400 text-white' : type.bg + ' ' + type.color} p-4 rounded-xl group-hover:scale-105 transition-transform`}>
                  <type.icon size={24} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`block font-bold text-base ${done ? 'text-green-600' : 'text-text-main'}`}>{type.label}</span>
                    {done && (
                      <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[8px] font-black uppercase tracking-widest">FEITO</span>
                    )}
                  </div>
                  <span className="block text-xs text-text-muted font-medium italic">{type.desc}</span>
                </div>
                {!locked && <ChevronRight size={20} className="text-app-border group-hover:text-primary transition-colors" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Status Alert - Bento style */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 items-center">
        <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-xl text-primary">
          <Route size={20} />
        </div>
        <div className="flex-1">
          <span className="block font-bold text-primary text-xs uppercase tracking-wider">Info</span>
          <span className="block text-secondary text-[11px] leading-tight font-medium">Lembre-se de realizar as fotos obrigatórias dos 4 ângulos do veículo.</span>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function CheckCircle2({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}