import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Car, Fuel, Route, ClipboardCheck, Trophy, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function DriverHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState({ name: 'Carregando...', score: 0, checklists: 0 });
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
        checklists: count || 0
      });

      // Fetch active schedule
      const { data: schedule } = await supabase
        .from('schedules')
        .select('id, start_at, end_at, vehicles(plate, requires_trailer), routes(origin, destination)')
        .eq('driver_id', user.id)
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString())
        .limit(1)
        .single();

      if (schedule) {
        setActiveSchedule(schedule);
      } else {
        // Look for next upcoming today to show them
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: upcoming } = await supabase
          .from('schedules')
          .select('id, start_at, end_at, vehicles(plate, requires_trailer), routes(origin, destination)')
          .eq('driver_id', user.id)
          .gte('start_at', new Date().toISOString())
          .like('start_at', `${todayStr}%`)
          .order('start_at')
          .limit(1)
          .single();
        if (upcoming) setActiveSchedule(upcoming);
      }

    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  };

  const checklistTypes = [
    { id: 'start', label: 'Início de Viagem', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Registre o início' },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel, color: 'text-warning', bg: 'bg-orange-50', desc: 'Litragem e KM' },
    { id: 'end', label: 'Fim de Viagem', icon: CheckCircle2, color: 'text-success', bg: 'bg-green-50', desc: 'Encerre jornada' },
  ];

  const internalTypes = [
    { id: 'yard', label: 'Checklist de Pátio', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Inspeção interna de frota' },
  ];

  const displayedTypes = user?.isInternal ? internalTypes : checklistTypes;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 py-10">
      {/* Welcome & Quick Stats */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight">{driverInfo.name}</h2>
        <p className="text-text-muted text-sm font-medium">Bom dia! Sua operação hoje começa agora.</p>
      </div>

      {!user?.isInternal ? (
      <div className="grid grid-cols-2 gap-4">
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

      {/* Active Schedule Alert */}
      {!user?.isInternal && activeSchedule && (
        <div className="bg-primary border border-primary/20 rounded-2xl p-5 flex flex-col gap-4 text-white shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
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
          </div>
          <div className="relative z-10 mt-2">
            <button
              onClick={() => navigate(`/checklist/start?schedule=${activeSchedule.id}`)}
              className="w-full bg-white text-primary h-12 rounded-xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-zinc-50 transition-colors"
            >
              Iniciar Checklist da Escala
            </button>
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
          {displayedTypes.map((type) => (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/checklist/${type.id}`)}
              className="w-full bento-card !p-4 flex-row items-center gap-5 group hover:border-primary/30 active:bg-app-bg"
            >
              <div className={`${type.bg} ${type.color} p-4 rounded-xl group-hover:scale-105 transition-transform`}>
                <type.icon size={24} />
              </div>
              <div className="flex-1 text-left">
                <span className="block font-bold text-base text-text-main">{type.label}</span>
                <span className="block text-xs text-text-muted font-medium italic">{type.desc}</span>
              </div>
              <ChevronRight size={20} className="text-app-border group-hover:text-primary transition-colors" />
            </motion.button>
          ))}
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
