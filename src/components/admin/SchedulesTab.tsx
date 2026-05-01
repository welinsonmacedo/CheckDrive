import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Search } from 'lucide-react';

interface SchedulesTabProps {
  onViewChecklist: (checklistId: string) => void;
}

export default function SchedulesTab({ onViewChecklist }: SchedulesTabProps) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  
  const todayLocal = new Date();
  todayLocal.setMinutes(todayLocal.getMinutes() - todayLocal.getTimezoneOffset());
  const [filterDate, setFilterDate] = useState(todayLocal.toISOString().split('T')[0]);

  const [scheduleForm, setScheduleForm] = useState({ 
    id: '', driver_id: '', vehicle_id: '', trailer_id: '', route_id: '', start_at: '', end_at: '' 
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatForLabel = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatForInput = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build local start and end of day to query UTC boundaries correctly
      const localStart = new Date(`${filterDate}T00:00:00`);
      const localEnd = new Date(`${filterDate}T23:59:59.999`);

      const { data } = await supabase.from('schedules')
        .select('*, profiles(*), vehicles(plate), trailers(plate), routes(origin, destination)')
        .gte('start_at', localStart.toISOString())
        .lte('start_at', localEnd.toISOString())
        .order('start_at', { ascending: false });
      setSchedules(data || []);

      
      const { data: d } = await supabase.from('profiles').select('*').eq('role', 'driver');
      setUsers(d || []);
      const { data: v } = await supabase.from('vehicles').select('id, plate, requires_trailer').eq('active', true);
      setVehicles(v || []);
      const { data: t } = await supabase.from('trailers').select('id, plate').eq('active', true);
      setTrailers(t || []);
      const { data: r } = await supabase.from('routes').select('id, origin, destination').eq('active', true);
      setRoutes(r || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Parse local dates explicitly to avoid browser timezone quirks
      const parseLocal = (localString: string) => {
        const [year, month, day, hour, minute] = localString.split(/[-T:]/).map(Number);
        return new Date(year, month - 1, day, hour, minute).toISOString();
      };

      const dataToInsert = {
        driver_id: scheduleForm.driver_id || null,
        vehicle_id: scheduleForm.vehicle_id || null,
        trailer_id: scheduleForm.trailer_id || null,
        route_id: scheduleForm.route_id || null, 
        start_at: parseLocal(scheduleForm.start_at),
        end_at: parseLocal(scheduleForm.end_at)
      };

      if (scheduleForm.id) {
        const { error } = await supabase.from('schedules').update(dataToInsert).eq('id', scheduleForm.id);
        if (error) throw error;
        alert('Escala atualizada!');
      } else {
        const { error } = await supabase.from('schedules').insert([dataToInsert]);
        if (error) throw error;
        alert('Escala agendada!');
      }
      
      setScheduleForm({ id: '', driver_id: '', vehicle_id: '', trailer_id: '', route_id: '', start_at: '', end_at: '' });
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string, hasChecklist: boolean) => {
    if (hasChecklist) {
      alert('Não é possível excluir uma escala que já tem checklist iniciado.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      await supabase.from('schedules').delete().eq('id', id);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  const handleEdit = (sch: any) => {
    setScheduleForm({
      id: sch.id,
      driver_id: sch.driver_id || '',
      vehicle_id: sch.vehicle_id || '',
      trailer_id: sch.trailer_id || '',
      route_id: sch.route_id || '',
      start_at: formatForInput(sch.start_at),
      end_at: formatForInput(sch.end_at)
    });
  };

  if (loading && !schedules.length) {
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando Escalas...</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-8 bento-card !p-0">
         <div className="p-5 border-b border-app-border flex sm:flex-row flex-col sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Escalas Agendadas</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden sm:inline-block">Data:</span>
               <input 
                 type="date"
                 className="h-10 px-3 rounded-lg border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary transition-all"
                 value={filterDate}
                 onChange={e => setFilterDate(e.target.value)}
               />
               <button onClick={fetchData} className="h-10 px-3 flex items-center justify-center bg-zinc-100 rounded-lg text-text-muted hover:bg-zinc-200 transition-colors">
                  <Search size={14} />
               </button>
            </div>
         </div>
         <div className="overflow-x-auto text-left min-h-[300px]">
         {loading ? (
             <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando...</div>
         ) : schedules.length === 0 ? (
             <div className="p-8 text-center text-text-muted font-bold text-xs uppercase tracking-widest">Nenhuma escala programada para {new Date(`${filterDate}T12:00:00`).toLocaleDateString()}</div>
         ) : (
            <table className="w-full">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Início/Fim</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Rota/Placa</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Checklists</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {schedules.map((sch) => {
                  const hasChecklist = !!(sch.start_checklist_id || sch.end_checklist_id || sch.fuel_checklist_id);
                  const createdTime = sch.created_at ? new Date(sch.created_at).getTime() : new Date(sch.start_at).getTime();
                  const isWithinOneHour = (Date.now() - createdTime) <= 60 * 60 * 1000;
                  
                  const canEdit = user?.role === 'admin' || (!hasChecklist && isWithinOneHour);
                  const canDelete = user?.role === 'admin' && !hasChecklist;

                  return (
                  <tr key={sch.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-text-main">{sch.profiles?.full_name}</span>
                    </td>
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                      {formatForLabel(sch.start_at)}<br/>
                      {formatForLabel(sch.end_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[10px] font-bold text-text-main uppercase">{sch.routes?.origin} → {sch.routes?.destination}</div>
                      <div className="text-[9px] font-mono text-text-muted mt-0.5">
                        {sch.vehicles?.plate}
                        {sch.trailers?.plate && <span className="ml-2 text-primary font-bold">| REB: {sch.trailers.plate}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 text-center items-center">
                        {sch.start_checklist_id ? (
                          <button onClick={() => onViewChecklist(sch.start_checklist_id)} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer title" title="Ver Checklist">
                            Início ✓
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                            Início ✕
                          </span>
                        )}
                        
                        {sch.end_checklist_id ? (
                          <button onClick={() => onViewChecklist(sch.end_checklist_id)} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer" title="Ver Checklist">
                            Fim ✓
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                            Fim ✕
                          </span>
                        )}

                        {sch.fuel_checklist_id ? (
                          <button onClick={() => onViewChecklist(sch.fuel_checklist_id)} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-100 text-primary hover:bg-blue-200 transition-colors cursor-pointer" title="Ver Checklist">
                            Posto ✓
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                            Posto ✕
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right flex gap-3 justify-end items-center">
                      {canEdit && (
                        <button onClick={() => handleEdit(sch)} className="text-primary hover:underline text-[10px] font-bold">Editar</button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteItem(sch.id, hasChecklist)} className="text-danger hover:underline text-[10px] font-bold">Excluir</button>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
         )}
         </div>
      </div>

      <div className="xl:col-span-4 bento-card space-y-5">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-text-main uppercase tracking-tight">
            {scheduleForm.id ? 'Editar Escala' : 'Nova Escala'}
          </h3>
          <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">
            {scheduleForm.id ? 'Atualize as informações da escala' : 'Atribua uma jornada a um motorista'}
          </p>
        </div>
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
              value={scheduleForm.driver_id}
              onChange={e => setScheduleForm({...scheduleForm, driver_id: e.target.value})}
              required
            >
              <option value="">Selecionar...</option>
              {users.filter(u => !u.full_name?.endsWith('//INTERNO')).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
              value={scheduleForm.vehicle_id}
              onChange={e => setScheduleForm({...scheduleForm, vehicle_id: e.target.value})}
              required
            >
              <option value="">Selecionar...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select>
          </div>

          {vehicles.find(v => v.id === scheduleForm.vehicle_id)?.requires_trailer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Reboque (Obrigatório para este veículo)</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border border-primary/30 bg-blue-50/20 text-xs font-bold outline-none focus:border-primary transition-all"
                value={scheduleForm.trailer_id}
                onChange={e => setScheduleForm({...scheduleForm, trailer_id: e.target.value})}
                required
              >
                <option value="">Selecionar Reboque...</option>
                {trailers.map(t => <option key={t.id} value={t.id}>{t.plate}</option>)}
              </select>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rota</label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
              value={scheduleForm.route_id}
              onChange={e => setScheduleForm({...scheduleForm, route_id: e.target.value})}
              required
            >
              <option value="">Selecionar...</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Início</label>
              <input 
                type="datetime-local" 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[10px] font-bold outline-none focus:border-primary transition-all"
                value={scheduleForm.start_at}
                onChange={e => setScheduleForm({...scheduleForm, start_at: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Prev. Fim</label>
              <input 
                type="datetime-local" 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[10px] font-bold outline-none focus:border-primary transition-all"
                value={scheduleForm.end_at}
                onChange={e => setScheduleForm({...scheduleForm, end_at: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3 flex-col sm:flex-row">
            {scheduleForm.id && (
              <button 
                type="button" 
                onClick={() => setScheduleForm({ id: '', driver_id: '', vehicle_id: '', trailer_id: '', route_id: '', start_at: '', end_at: '' })}
                className="flex-1 h-12 bg-zinc-100 text-text-muted font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all font-mono"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {saving ? 'Processando...' : (scheduleForm.id ? 'Salvar Alteração' : 'Agendar Escala')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}