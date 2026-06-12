import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Fuel, Route, ClipboardCheck, Trophy, AlertTriangle, ChevronRight, BookOpen, Bell } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { cacheData, getCachedData } from '@/src/lib/offlineQueue';

export default function DriverHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState({ name: 'Carregando...', score: 0, checklists: 0, participates_in_ranking: true });
  const [systemType, setSystemType] = useState('points');
  const [schedulesToday, setSchedulesToday] = useState<any[]>([]);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [hiddenSchedules, setHiddenSchedules] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('hiddenSchedules');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const hideSchedule = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = [...hiddenSchedules, id];
    setHiddenSchedules(next);
    localStorage.setItem('hiddenSchedules', JSON.stringify(next));
  };

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
        const { data: sp } = await supabase.from('score_profiles').select('base_value').eq('id', profile?.score_profile_id).maybeSingle();
        score = sp?.base_value || 1000;
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

      // Fetch relevant schedules that overlap with today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: fetchedSchedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, start_at, end_at, start_checklist_id, end_checklist_id, fuel_checklist_id, requires_fueling, vehicles(plate, requires_trailer), routes(origin, destination)')
        .eq('driver_id', user.id)
        .gte('end_at', startOfDay.toISOString())
        .lte('start_at', endOfDay.toISOString())
        .order('start_at', { ascending: true });

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
        const cached = await getCachedData('schedulesToday');
        if (cached) setSchedulesToday(cached);
      } else {
        setSchedulesToday(fetchedSchedules || []);
        await cacheData('schedulesToday', fetchedSchedules || []);
      }

      // Fetch notification counts (unique pending checklist issues + active auto_alerts)
      try {
        const { data: issuesData } = await supabase
          .from("checklist_issues")
          .select("id, vehicle_id, trailer_id, item_title")
          .eq("status", "pending");

        const uniqueIssuesSet = new Set<string>();
        (issuesData || []).forEach((issue) => {
          const vehicleKey = issue.vehicle_id || issue.trailer_id || "no-vehicle";
          const titleKey = (issue.item_title || "").trim().toLowerCase();
          uniqueIssuesSet.add(`${vehicleKey}_${titleKey}`);
        });

        const { data: alertsData } = await supabase
          .from("auto_alerts")
          .select("id, trigger_type, trigger_date, warning_days, interval_km, last_km, warning_km, target_vehicle_id")
          .eq("active", true);

        const { data: oauthSubs } = await supabase
          .from("checklist_submissions")
          .select("vehicle_id, odometer")
          .order("created_at", { ascending: false });

        const latestOdometer: Record<string, number> = {};
        (oauthSubs || []).forEach((sub) => {
          if (sub.vehicle_id && !latestOdometer[sub.vehicle_id]) {
            latestOdometer[sub.vehicle_id] = sub.odometer || 0;
          }
        });

        let triggeredAlertsCount = 0;
        (alertsData || []).forEach((alert) => {
          if (alert.trigger_type === "date" && alert.trigger_date) {
            const warningDays = alert.warning_days ? Number(alert.warning_days) : 0;
            const targetDate = new Date(alert.trigger_date + "T00:00:00");
            const thresholdDate = new Date(targetDate);
            thresholdDate.setDate(targetDate.getDate() - warningDays);
            if (new Date() >= thresholdDate) {
              triggeredAlertsCount++;
            }
          } else if (
            alert.trigger_type === "km" &&
            alert.interval_km &&
            alert.last_km &&
            alert.warning_km
          ) {
            const vehicleOdometer = latestOdometer[alert.target_vehicle_id] || 0;
            const warningThreshold =
              Number(alert.last_km) + Number(alert.interval_km) - Number(alert.warning_km);
            if (vehicleOdometer >= warningThreshold) {
              triggeredAlertsCount++;
            }
          }
        });

        setNotifCount(uniqueIssuesSet.size + triggeredAlertsCount);
      } catch (err) {
        console.warn("Could not retrieve notification stats counts:", err);
      }

    } catch (error) {
      console.error('Error fetching driver stats:', error);
      const cached = await getCachedData('schedulesToday');
      if (cached) setSchedulesToday(cached);
    }
  };

  const originalChecklistTypes = [
    { id: 'start', label: 'Início de Viagem', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Registre o início', field: 'start_checklist_id' },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel, color: 'text-warning', bg: 'bg-orange-50', desc: 'Litragem e KM', field: 'fuel_checklist_id' },
    { id: 'end', label: 'Fim de Viagem', icon: CheckCircle2, color: 'text-success', bg: 'bg-green-50', desc: 'Encerre jornada', field: 'end_checklist_id' },
  ];

  const internalTypes = [
    { id: 'yard', label: 'Checklist de Pátio', icon: ClipboardCheck, color: 'text-primary', bg: 'bg-blue-50', desc: 'Inspeção interna de frota' },
  ];

  const displayedTypes = user?.isInternal ? internalTypes : originalChecklistTypes;

  const isTypeDone = (schedule: any, typeId: string) => {
    if (!schedule) return false;
    if (typeId === 'start') return !!schedule.start_checklist_id;
    if (typeId === 'end') return !!schedule.end_checklist_id;
    if (typeId === 'fuel') return !!schedule.fuel_checklist_id;
    return false;
  };

  const activeSchedules = schedulesToday.filter(s => new Date(s.end_at) > new Date() && !hiddenSchedules.includes(s.id));

  const isTypeLocked = (typeId: string) => {
    if (user?.isInternal) return false;
    // Se há escalas ATIVAS para hoje, bloqueia chamadas avulsas
    if (activeSchedules.length > 0) return true;
    return false;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 py-10">
      {/* Welcome & Quick Stats */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-text-main tracking-tight">{driverInfo.name}</h2>
          <p className="text-text-muted text-sm font-medium">Bom dia! Sua operação hoje começa agora.</p>
        </div>
        <button
          onClick={() => navigate('/driver/notifications')}
          className="relative p-3 bg-white border border-app-border rounded-2xl shadow-sm text-text-muted hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 flex items-center justify-center shrink-0"
        >
          <Bell size={22} />
          {notifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#e12a2a] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-white">
              {notifCount}
            </span>
          )}
        </button>
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

      {/* active schedules rendering */}
      {activeSchedules.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Minhas Escalas</h3>
            <div className="h-px flex-1 mx-4 bg-app-border" />
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {activeSchedules.map((schedule) => {
                const isExpanded = expandedScheduleId === schedule.id;
                return (
                  <motion.div
                    key={schedule.id}
                    layoutId={`schedule-${schedule.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bento-card border ${isExpanded ? 'border-primary shadow-md' : 'border-app-border hover:border-primary/30'} overflow-hidden transition-colors cursor-pointer p-0`}
                    onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-text-main px-2 py-0.5 bg-zinc-100 text-center rounded border border-zinc-200">
                              🚗 {schedule.vehicles?.plate || 'Não definido'}
                            </span>
                         </div>
                         <h4 className="text-sm font-black text-text-main mt-2 leading-tight line-clamp-1">{schedule.routes?.origin || '?'} <span className="font-bold text-zinc-300 mx-1">-</span> {schedule.routes?.destination || '?'}</h4>
                         <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                           <Route size={10} /> 
                           {new Date(schedule.start_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} às {new Date(schedule.end_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                      <ChevronRight size={20} className={`text-text-muted transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-app-bg border-t border-app-border p-4 grid gap-3"
                      >
                         {displayedTypes.filter(type => type.id !== 'fuel' || schedule.requires_fueling).map((type) => {
                            const done = isTypeDone(schedule, type.id);
                            return (
                               <button
                                 key={type.id}
                                 disabled={done}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   navigate(`/checklist/${type.id}?schedule_id=${schedule.id}&vehicle_id=${schedule.vehicles?.id}`);
                                 }}
                                 className={`w-full flex items-center p-3 rounded-xl border ${done ? 'border-green-200 bg-green-50/50 opacity-60' : 'border-zinc-200 bg-white hover:border-primary/30 shadow-sm'} transition-all`}
                               >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-green-100 text-green-600' : type.bg + ' ' + type.color}`}>
                                    <type.icon size={16} />
                                  </div>
                                  <div className="flex-1 text-left ml-3">
                                    <span className={`block text-xs font-bold tracking-tight uppercase ${done ? 'text-green-700' : 'text-text-main'}`}>{type.label}</span>
                                  </div>
                                  {done ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest leading-none">Feito</span> : <ChevronRight size={16} className="text-zinc-400" />}
                               </button>
                            );
                         })}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
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
            const done = isTypeDone(null, type.id);
            const locked = isTypeLocked(type.id);
            
            return (
              <motion.button
                key={type.id}
                whileTap={locked ? {} : { scale: 0.98 }}
                disabled={locked}
                onClick={() => navigate(`/checklist/${type.id}`)}
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