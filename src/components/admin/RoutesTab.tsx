import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Search, X } from 'lucide-react';

export default function RoutesTab() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [routeForm, setRouteForm] = useState<{id: string, origin: string, destination: string, stops: string[]}>({ id: '', origin: '', destination: '', stops: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('routes').select('*').order('origin');
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (routeForm.id) {
        const { error } = await supabase.from('routes').update({
          origin: routeForm.origin,
          destination: routeForm.destination,
          stops: routeForm.stops
        }).eq('id', routeForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routes').insert([{
          origin: routeForm.origin,
          destination: routeForm.destination,
          stops: routeForm.stops
        }]);
        if (error) throw error;
      }
      setRouteForm({ id: '', origin: '', destination: '', stops: [] });
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (table: string, id: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja ${currentStatus ? 'desabilitar' : 'habilitar'} este registro?`)) return;
    try {
      const { error } = await supabase.from(table).update({ active: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      alert('Erro ao alterar status. Detalhes: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando rotas...</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-8 bento-card !p-0">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Rotas Ativas</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Filtrar rotas..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main outline-none focus:ring-1 focus:ring-primary w-48 border border-app-border"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Origem</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Paradas</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Destino</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {routes.filter(r => r.origin?.toLowerCase().includes(searchTerm.toLowerCase()) || r.destination?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? routes.filter(r => r.origin?.toLowerCase().includes(searchTerm.toLowerCase()) || r.destination?.toLowerCase().includes(searchTerm.toLowerCase())).map((r) => (
                  <tr key={r.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-xs font-bold">{r.origin}</td>
                    <td className="px-5 py-4 text-[10px] text-text-muted font-medium">
                      {r.stops?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.stops.map((stop: string, idx: number) => (
                            <span key={idx} className="bg-app-bg px-2 py-0.5 rounded border border-app-border">{stop}</span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">{r.destination}</td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                       <button
                         onClick={() => {
                           setRouteForm({ id: r.id, origin: r.origin || '', destination: r.destination || '', stops: r.stops || [] });
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                         }}
                         className="p-1.5 rounded-lg hover:bg-zinc-100 text-text-muted hover:text-primary transition-colors title='Editar Rota'"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                       </button>
                       <button 
                         onClick={() => toggleStatus('routes', r.id, r.active !== false)}
                         className={`p-1.5 rounded-lg ${r.active !== false ? 'hover:bg-red-50 text-text-muted hover:text-danger' : 'bg-red-50 text-danger hover:bg-green-50 hover:text-success'} transition-colors`}
                         title={r.active !== false ? "Desabilitar" : "Habilitar"}
                       >
                         {r.active !== false ? <X size={14} /> : <CheckCircle2 size={14} />}
                       </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhuma rota cadastrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
      <div className="xl:col-span-4 bento-card">
        <h3 className="text-sm font-black text-text-main mb-6 uppercase tracking-tight">{routeForm.id ? 'Editar Rota' : 'Nova Rota'}</h3>
        <form onSubmit={handleSaveRoute} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Origem</label>
            <input 
              required
              className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
              placeholder="Cidade A"
              value={routeForm.origin}
              onChange={e => setRouteForm({...routeForm, origin: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Paradas Intermediárias</label>
              <button 
                type="button"
                onClick={() => setRouteForm({...routeForm, stops: [...routeForm.stops, '']})}
                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                + Adicionar Parada
              </button>
            </div>
            <div className="space-y-2">
              {routeForm.stops.map((stop, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    required
                    className="flex-1 h-9 px-3 rounded-lg border border-app-border bg-app-bg text-[10px] font-bold outline-none focus:border-primary"
                    placeholder={`Parada ${idx + 1}`}
                    value={stop}
                    onChange={e => {
                      const newStops = [...routeForm.stops];
                      newStops[idx] = e.target.value;
                      setRouteForm({...routeForm, stops: newStops});
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newStops = routeForm.stops.filter((_, i) => i !== idx);
                      setRouteForm({...routeForm, stops: newStops});
                    }}
                    className="w-9 h-9 border border-app-border rounded-lg flex items-center justify-center text-text-muted hover:text-danger bg-app-bg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Destino</label>
            <input 
              required
              className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
              placeholder="Cidade B"
              value={routeForm.destination}
              onChange={e => setRouteForm({...routeForm, destination: e.target.value})}
            />
          </div>
          <div className="pt-2 flex gap-2">
            {routeForm.id && (
               <button
                 type="button"
                 onClick={() => setRouteForm({ id: '', origin: '', destination: '', stops: [] })}
                 className="flex-1 h-12 bg-app-bg text-text-main border border-app-border font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-100 transition-all shadow-sm"
               >
                 Cancelar
               </button>
            )}
            <button 
              disabled={saving}
              className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? 'Aguarde...' : 'Salvar Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}