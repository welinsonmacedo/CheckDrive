import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Search, X } from 'lucide-react';

export default function VehiclesTab() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [vehicleForm, setVehicleForm] = useState({ id: '', plate: '', model: '', type: '', requires_trailer: false });
  const [trailerForm, setTrailerForm] = useState({ id: '', plate: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, tRes] = await Promise.all([
        supabase.from('vehicles').select('*').order('plate'),
        supabase.from('trailers').select('*').order('plate')
      ]);
      setVehicles(vRes.data || []);
      setTrailers(tRes.data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (vehicleForm.id) {
        const { error } = await supabase.from('vehicles').update({
          plate: vehicleForm.plate,
          model: vehicleForm.model,
          type: vehicleForm.type,
          requires_trailer: vehicleForm.requires_trailer
        }).eq('id', vehicleForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert([{
          plate: vehicleForm.plate,
          model: vehicleForm.model,
          type: vehicleForm.type,
          requires_trailer: vehicleForm.requires_trailer
        }]);
        if (error) throw error;
      }
      setVehicleForm({ id: '', plate: '', model: '', type: '', requires_trailer: false });
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrailer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (trailerForm.id) {
        const { error } = await supabase.from('trailers').update({
          plate: trailerForm.plate
        }).eq('id', trailerForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('trailers').insert([{
          plate: trailerForm.plate
        }]);
        if (error) throw error;
      }
      setTrailerForm({ id: '', plate: '' });
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
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando veículos...</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-8 space-y-6">
        <div className="bento-card !p-0">
           <div className="p-5 border-b border-app-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Veículos na Frota</span>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Filtrar placa..."
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
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-left">Placa</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-left">Modelo / Tipo</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-left">Reboque</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {vehicles.filter(v => v.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || v.model?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? vehicles.filter(v => v.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || v.model?.toLowerCase().includes(searchTerm.toLowerCase())).map((v) => (
                    <tr key={v.id} className="hover:bg-app-bg/30">
                      <td className="px-5 py-4 text-xs font-mono font-bold">{v.plate}</td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold">{v.model}</div>
                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest">{v.type || 'N/A'}</div>
                      </td>
                      <td className="px-5 py-4">
                        {v.requires_trailer ? (
                          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[8px] font-black uppercase">Obrigatório</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-black uppercase">Não</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                         <button
                           onClick={() => {
                             setVehicleForm({ id: v.id, plate: v.plate || '', model: v.model || '', type: v.type || '', requires_trailer: v.requires_trailer || false });
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                           }}
                           className="p-1.5 rounded-lg hover:bg-zinc-100 text-text-muted hover:text-primary transition-colors"
                           title="Editar Veículo"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                         </button>
                         <button 
                           onClick={() => toggleStatus('vehicles', v.id, v.active !== false)}
                           className={`p-1.5 rounded-lg ${v.active !== false ? 'hover:bg-red-50 text-text-muted hover:text-danger' : 'bg-red-50 text-danger hover:bg-green-50 hover:text-success'} transition-colors`}
                           title={v.active !== false ? "Desabilitar" : "Habilitar"}
                         >
                           {v.active !== false ? <X size={14} /> : <CheckCircle2 size={14} />}
                         </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum veículo cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>

        <div className="bento-card !p-0">
           <div className="p-5 border-b border-app-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Reboques na Frota</span>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                <thead className="bg-app-bg/50">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-left">Placa</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-left">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {trailers.filter(t => t.plate?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? trailers.filter(t => t.plate?.toLowerCase().includes(searchTerm.toLowerCase())).map((t) => (
                    <tr key={t.id} className="hover:bg-app-bg/30">
                      <td className="px-5 py-4 text-xs font-mono font-bold">{t.plate}</td>
                      <td className="px-5 py-4">
                        {t.active !== false ? (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[8px] font-black uppercase">Ativo</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[8px] font-black uppercase">Inativo</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                         <button
                           onClick={() => {
                             setTrailerForm({ id: t.id, plate: t.plate || '' });
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                           }}
                           className="p-1.5 rounded-lg hover:bg-zinc-100 text-text-muted hover:text-primary transition-colors"
                           title="Editar Reboque"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                         </button>
                         <button 
                           onClick={() => toggleStatus('trailers', t.id, t.active !== false)}
                           className={`p-1.5 rounded-lg ${t.active !== false ? 'hover:bg-red-50 text-text-muted hover:text-danger' : 'bg-red-50 text-danger hover:bg-green-50 hover:text-success'} transition-colors`}
                           title={t.active !== false ? "Desabilitar" : "Habilitar"}
                         >
                           {t.active !== false ? <X size={14} /> : <CheckCircle2 size={14} />}
                         </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum reboque cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
      <div className="xl:col-span-4 space-y-6">
        <div className="bento-card">
          <h3 className="text-sm font-black text-text-main mb-6 uppercase tracking-tight">{vehicleForm.id ? 'Editar Veículo' : 'Novo Veículo'}</h3>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Placa</label>
              <input 
                required
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
                placeholder="ABC-1234"
                value={vehicleForm.plate}
                onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Modelo</label>
              <input 
                required
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
                placeholder="Ex: Volvo FH 540"
                value={vehicleForm.model}
                onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo de Veículo</label>
              <input 
                placeholder="Ex: Truck, Van, Bitrens..." 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
                value={vehicleForm.type}
                onChange={e => setVehicleForm({...vehicleForm, type: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="reqTrailer"
                className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                checked={vehicleForm.requires_trailer}
                onChange={e => setVehicleForm({...vehicleForm, requires_trailer: e.target.checked})}
              />
              <label htmlFor="reqTrailer" className="text-xs font-bold text-text-main cursor-pointer select-none">
                Requer Reboque no Checklist
              </label>
            </div>
            <div className="pt-2 flex gap-2">
              {vehicleForm.id && (
                 <button
                   type="button"
                   onClick={() => setVehicleForm({ id: '', plate: '', model: '', type: '', requires_trailer: false })}
                   className="flex-1 h-12 bg-app-bg text-text-main border border-app-border font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-100 transition-all shadow-sm"
                 >
                   Cancelar
                 </button>
              )}
              <button 
                disabled={saving}
                className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'Aguarde...' : 'Salvar Veículo'}
              </button>
            </div>
          </form>
        </div>

        <div className="bento-card">
          <h3 className="text-sm font-black text-text-main mb-6 uppercase tracking-tight">{trailerForm.id ? 'Editar Reboque' : 'Novo Reboque'}</h3>
          <form onSubmit={handleSaveTrailer} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Placa do Reboque</label>
              <input 
                required
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary"
                placeholder="REB-9999"
                value={trailerForm.plate}
                onChange={e => setTrailerForm({...trailerForm, plate: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="pt-2 flex gap-2">
              {trailerForm.id && (
                 <button
                   type="button"
                   onClick={() => setTrailerForm({ id: '', plate: '' })}
                   className="flex-1 h-12 bg-app-bg text-text-main border border-app-border font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-100 transition-all shadow-sm"
                 >
                   Cancelar
                 </button>
              )}
              <button disabled={saving} className="flex-1 h-12 border border-primary text-primary font-black text-[10px] uppercase rounded-xl hover:bg-primary hover:text-white transition-all">
                {saving ? 'Aguarde...' : 'Salvar Reboque'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
