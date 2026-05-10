import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Truck, AlertTriangle, User, Navigation, Edit2, X, RefreshCw } from 'lucide-react';

export default function TrackingTab() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [baits, setBaits] = useState<any[]>([]);
  const [issuesCount, setIssuesCount] = useState<Record<string, number>>({});
  const [schedulesMap, setSchedulesMap] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'baits'>('vehicles');
  
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editForm, setEditForm] = useState({ manual_location: '', manual_status: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vehicles, drivers, baits
      const [vRes, dRes, bRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('active', true).order('plate'),
        supabase.from('profiles').select('*').eq('role', 'driver').order('full_name'),
        supabase.from('baits').select('*').eq('active', true).order('name')
      ]);
      
      const vData = vRes.data || [];
      const dData = dRes.data || [];
      const bData = bRes.data || [];
      
      // Fetch issues
      const { data: iData } = await supabase.from('checklist_issues').select('vehicle_id').eq('status', 'pending');
      const iCount: Record<string, number> = {};
      iData?.forEach(i => {
        iCount[i.vehicle_id] = (iCount[i.vehicle_id] || 0) + 1;
      });
      setIssuesCount(iCount);

      // Fetch upcoming/recent schedules to determine automatic state
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const { data: sData } = await supabase.from('schedules')
        .select(`
          *,
          profiles:driver_id (full_name),
          vehicles:vehicle_id (plate),
          routes:route_id (origin, destination),
          bait1:baits!schedules_bait1_id_fkey(name),
          bait2:baits!schedules_bait2_id_fkey(name),
          bait3:baits!schedules_bait3_id_fkey(name)
        `)
        .gte('start_at', lastWeek.toISOString())
        .order('start_at', { ascending: false });

      // Map latest schedule to each entity
      const sMap: Record<string, any> = {};
      if (sData) {
        const findCurrentSchedule = (schedulesList: any[]) => {
          if (schedulesList.length === 0) return null;
          const now = new Date().getTime();
          let chosen = schedulesList.find(s => new Date(s.start_at).getTime() <= now && new Date(s.end_at).getTime() >= now);
          if (!chosen) {
            const upcoming = schedulesList.filter(s => new Date(s.start_at).getTime() > now).sort((a,b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            if (upcoming.length > 0) chosen = upcoming[0];
          }
          if (!chosen) {
            const past = schedulesList.filter(s => new Date(s.end_at).getTime() < now).sort((a,b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime());
            if (past.length > 0) chosen = past[0];
          }
          return chosen;
        };

        vData.forEach(v => {
          const vSchedules = sData.filter(s => s.vehicle_id === v.id);
          sMap[`v_${v.id}`] = findCurrentSchedule(vSchedules);
        });

        dData.forEach(d => {
          const dSchedules = sData.filter(s => s.driver_id === d.id);
          sMap[`d_${d.id}`] = findCurrentSchedule(dSchedules);
        });

        bData.forEach(b => {
          const bSchedules = sData.filter(s => s.bait1_id === b.id || s.bait2_id === b.id || s.bait3_id === b.id);
          sMap[`b_${b.id}`] = findCurrentSchedule(bSchedules);
        });
      }
      
      setSchedulesMap(sMap);
      setVehicles(vData);
      setDrivers(dData);
      setBaits(bData);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.from('vehicles').update({
        manual_location: editForm.manual_location || null,
        manual_status: editForm.manual_status || null,
        last_status_update: new Date().toISOString()
      }).eq('id', editingVehicle.id);
      
      if (error) throw error;
      setEditingVehicle(null);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getComputedState = (item: any, schedule: any, isVehicle: boolean = false) => {
    if (isVehicle && (item.manual_status || item.manual_location)) {
      return {
        status: item.manual_status || 'Modificado Manualmente',
        location: item.manual_location || 'Desconhecida',
        isManual: true
      };
    }
    
    if (!schedule) {
      return { status: 'Sem viagem', location: 'Pátio', isManual: false };
    }
    
    const now = new Date().getTime();
    const start = new Date(schedule.start_at).getTime();
    const end = new Date(schedule.end_at).getTime();
    const route = schedule.routes;
    
    if (now > end) {
      return { status: 'Viagem Concluída', location: route?.destination || 'Destino', isManual: false };
    }
    if (now < start) {
      return { status: 'Aguardando Início', location: route?.origin || 'Origem', isManual: false };
    }
    
    return { status: 'Em trânsito', location: `Para ${route?.destination || 'Destino'}`, isManual: false };
  };

  const getStatusColor = (status: string) => {
    if (status === 'Em trânsito') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'Viagem Concluída') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'Aguardando Início') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'Sem viagem') return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    return 'bg-purple-100 text-purple-700 border-purple-200'; 
  };

  const filteredVehicles = vehicles.filter(v => 
    (vehicleTypeFilter === '' || v.type === vehicleTypeFilter) &&
    (v.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || schedulesMap[`v_${v.id}`]?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDrivers = drivers.filter(d => 
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || schedulesMap[`d_${d.id}`]?.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBaits = baits.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const vehicleTypes = Array.from(new Set(vehicles.map(v => v.type).filter(Boolean)));

  const renderCard = (type: 'vehicle' | 'driver' | 'bait', item: any) => {
    const key = type === 'vehicle' ? 'v_' : type === 'driver' ? 'd_' : 'b_';
    const schedule = schedulesMap[`${key}${item.id}`];
    const state = getComputedState(item, schedule, type === 'vehicle');
    const statusColor = getStatusColor(state.status);
    
    let title = '';
    let subtitle = '';
    let icon = null;
    let issues = 0;
    
    if (type === 'vehicle') {
      title = item.plate;
      subtitle = item.type || 'Veículo';
      icon = <Truck size={18} className="text-primary" />;
      issues = issuesCount[item.id] || 0;
    } else if (type === 'driver') {
      title = item.full_name;
      subtitle = 'Motorista';
      icon = <User size={18} className="text-blue-500" />;
    } else {
      title = item.name;
      subtitle = 'Isca';
      icon = <MapPin size={18} className="text-fuchsia-500" />;
    }

    const baitsStr = [schedule?.bait1?.name, schedule?.bait2?.name, schedule?.bait3?.name].filter(Boolean).join(', ');

    return (
      <div key={item.id} className="bg-white border border-app-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${state.status === 'Em trânsito' ? 'bg-blue-500' : state.status === 'Viagem Concluída' ? 'bg-green-500' : state.isManual ? 'bg-purple-500' : 'bg-zinc-300'}`} />
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black text-text-main flex items-center gap-2">
              {icon}
              {title}
            </h3>
            <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted mt-0.5">{subtitle}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${statusColor}`}>
              {state.status}
            </span>
            {issues > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-danger/10 text-danger border border-danger/20 w-fit">
                <AlertTriangle size={12} />
                {issues} pend {issues === 1 ? 'ância' : 'ências'}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-app-border/50">
            <Navigation size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Localização e Destino</p>
              <p className="text-sm font-bold text-text-main leading-tight">{state.location}</p>
              {state.isManual && (
                <p className="text-[9px] font-black text-purple-600 mt-1 uppercase tracking-widest bg-purple-100 inline-block px-1.5 py-0.5 rounded">Sobrescrito Manualmente</p>
              )}
            </div>
          </div>

          {schedule && (
            <div className="space-y-2">
              {type !== 'driver' && (
                <div className="flex items-center gap-3 px-1 text-sm font-medium text-text-main">
                  <User size={16} className="text-text-muted shrink-0" />
                  <span className="truncate">{schedule.profiles?.full_name}</span>
                </div>
              )}
              {type !== 'vehicle' && schedule.vehicles && (
                <div className="flex items-center gap-3 px-1 text-sm font-medium text-text-main">
                  <Truck size={16} className="text-text-muted shrink-0" />
                  <span className="truncate">{schedule.vehicles.plate}</span>
                </div>
              )}
              {type !== 'bait' && baitsStr && (
                <div className="flex items-start gap-3 px-1 text-sm font-medium text-fuchsia-700">
                  <MapPin size={16} className="shrink-0 mt-0.5" />
                  <span className="text-xs font-bold">Iscas: {baitsStr}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {type === 'vehicle' && (
          <button 
            onClick={() => {
              setEditingVehicle(item);
              setEditForm({
                manual_location: item.manual_location || state.location,
                manual_status: item.manual_status || state.status
              });
            }}
            className="absolute bottom-4 right-4 p-2 bg-white border border-app-border hover:border-primary text-text-muted hover:text-primary rounded-xl translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Corrigir Manualmente"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main tracking-tight uppercase">Monitoramento</h2>
          <p className="text-text-muted text-sm font-bold mt-1">Acompanhe a localização e status atual da frota</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto text-text-main">
          {activeTab === 'vehicles' && vehicleTypes.length > 0 && (
            <select
              className="h-10 px-4 bg-white rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto border border-app-border shadow-sm text-text-muted"
              value={vehicleTypeFilter}
              onChange={e => setVehicleTypeFilter(e.target.value)}
            >
              <option value="">Todos os TIpos</option>
              {vehicleTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar..."
              className="h-10 pl-9 pr-4 bg-white rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64 border border-app-border shadow-sm placeholder:text-text-muted/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="p-2.5 bg-white border border-app-border rounded-xl hover:bg-zinc-50 transition-colors shadow-sm text-text-muted hover:text-primary">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-app-border pb-px overflow-x-auto no-scrollbar">
        {[
          { id: 'vehicles', label: 'Veículos' },
          { id: 'drivers', label: 'Motoristas' },
          { id: 'baits', label: 'Iscas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text-main hover:border-text-muted/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeTab === 'vehicles' && filteredVehicles.map(v => renderCard('vehicle', v))}
        {activeTab === 'drivers' && filteredDrivers.map(d => renderCard('driver', d))}
        {activeTab === 'baits' && filteredBaits.map(b => renderCard('bait', b))}
        
        {activeTab === 'vehicles' && filteredVehicles.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-text-muted">
            <p className="font-bold text-sm">Nenhum veículo encontrado para monitoramento.</p>
          </div>
        )}
        {activeTab === 'drivers' && filteredDrivers.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-text-muted">
            <p className="font-bold text-sm">Nenhum motorista encontrado.</p>
          </div>
        )}
        {activeTab === 'baits' && filteredBaits.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-text-muted">
            <p className="font-bold text-sm">Nenhuma isca encontrada.</p>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-app-border flex items-center justify-between">
              <h3 className="text-base font-black text-text-main flex items-center gap-2 uppercase tracking-wide">
                <Edit2 size={18} className="text-primary" />
                DADOS MANUAIS DE FROTA
              </h3>
              <button 
                onClick={() => setEditingVehicle(null)}
                className="p-2 hover:bg-zinc-100 rounded-full text-text-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleManualSave} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs font-medium">
                <strong>Atenção:</strong> Ao inserir dados manuais, as atualizações automáticas via escala para este veículo serão interrompidas até que você apague as informações abaixo.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Status Atual</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary transition-all text-text-main"
                  value={editForm.manual_status}
                  onChange={e => setEditForm({...editForm, manual_status: e.target.value})}
                >
                  <option value="">(Automático)</option>
                  <option value="Em trânsito">Em trânsito</option>
                  <option value="Viagem Concluída">Viagem Concluída</option>
                  <option value="Aguardando Início">Aguardando Início</option>
                  <option value="Em manutenção">Em manutenção</option>
                  <option value="Disponível">Disponível</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Localização / Destino</label>
                <input 
                  type="text" 
                  placeholder="Ex: Pátio SP ou Para RJ"
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold text-text-main outline-none focus:border-primary transition-all"
                  value={editForm.manual_location}
                  onChange={e => setEditForm({...editForm, manual_location: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({ manual_location: '', manual_status: '' });
                  }}
                  className="flex-1 py-3 text-xs font-bold text-text-muted uppercase border border-app-border hover:bg-zinc-50 rounded-xl"
                >
                  Limpar / Usar Auto
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 text-[11px] font-black text-white bg-primary hover:bg-primary/90 rounded-xl uppercase tracking-widest shadow-md flex justify-center items-center gap-2"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
