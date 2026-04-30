import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, Plus, Trash2, Edit2 } from 'lucide-react';

export default function FleetSettingsSection() {
  const [types, setTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Type form
  const [typeForm, setTypeForm] = useState({ id: '', name: '', max_speed: '', ideal_consumption: '' });
  const [showTypeForm, setShowTypeForm] = useState(false);

  // Model form
  const [modelForm, setModelForm] = useState({ id: '', type_id: '', name: '' });
  const [showModelForm, setShowModelForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, modelsRes] = await Promise.all([
        supabase.from('vehicle_types').select('*').order('name'),
        supabase.from('vehicle_models').select('*, vehicle_types(name)').order('name')
      ]);
      setTypes(typesRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: typeForm.name,
        max_speed: Number(typeForm.max_speed),
        ideal_consumption: Number(typeForm.ideal_consumption)
      };

      if (typeForm.id) {
        await supabase.from('vehicle_types').update(payload).eq('id', typeForm.id);
      } else {
        await supabase.from('vehicle_types').insert(payload);
      }
      setTypeForm({ id: '', name: '', max_speed: '', ideal_consumption: '' });
      setShowTypeForm(false);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Excluir este tipo?')) return;
    try {
      await supabase.from('vehicle_types').delete().eq('id', id);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: modelForm.name,
        type_id: modelForm.type_id
      };

      if (modelForm.id) {
        await supabase.from('vehicle_models').update(payload).eq('id', modelForm.id);
      } else {
        await supabase.from('vehicle_models').insert(payload);
      }
      setModelForm({ id: '', type_id: '', name: '' });
      setShowModelForm(false);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Excluir este modelo?')) return;
    try {
      await supabase.from('vehicle_models').delete().eq('id', id);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-zinc-200 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-zinc-200 rounded"></div></div></div></div>;

  return (
    <div className="bento-card space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Truck size={20} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Frota & Limites</h3>
            <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">Tipos, Modelos e Configurações de Veículos</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tipos de Veículos */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest">Tipos de Veículo</h4>
            <button 
              type="button"
              onClick={() => setShowTypeForm(!showTypeForm)}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} /> Novo Tipo
            </button>
          </div>

          {showTypeForm && (
            <form onSubmit={handleSaveType} className="bg-zinc-50 p-4 rounded-xl border border-app-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome do Tipo</label>
                  <input type="text" required placeholder="Ex: Cavalo Mecânico" className="w-full h-10 px-3 rounded-lg border border-app-border font-bold text-xs" value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Velocidade Máx. (km/h)</label>
                  <input type="number" required placeholder="Ex: 80" className="w-full h-10 px-3 rounded-lg border border-app-border font-bold text-xs" value={typeForm.max_speed} onChange={e => setTypeForm({...typeForm, max_speed: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Média Ideal (km/L)</label>
                  <input type="number" step="0.1" required placeholder="Ex: 3.5" className="w-full h-10 px-3 rounded-lg border border-app-border font-bold text-xs" value={typeForm.ideal_consumption} onChange={e => setTypeForm({...typeForm, ideal_consumption: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Salvar</button>
                <button type="button" onClick={() => { setShowTypeForm(false); setTypeForm({id:'', name:'', max_speed:'', ideal_consumption:''}) }} className="px-4 py-2 border border-app-border text-text-muted text-[10px] font-black uppercase tracking-widest rounded-lg">Cancelar</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-app-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-app-border">
                <tr>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px]">Tipo</th>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px]">Velocidade Máx.</th>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px]">Média Ideal</th>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-bold text-text-main">{t.name}</td>
                    <td className="px-4 py-3 font-medium text-text-muted">{t.max_speed} km/h</td>
                    <td className="px-4 py-3 font-medium text-text-muted">{t.ideal_consumption} km/L</td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      <button type="button" onClick={() => { setTypeForm({ id: t.id, name: t.name, max_speed: t.max_speed?.toString() || '', ideal_consumption: t.ideal_consumption?.toString() || '' }); setShowTypeForm(true); }} className="text-primary hover:text-primary/70"><Edit2 size={14} /></button>
                      <button type="button" onClick={() => handleDeleteType(t.id)} className="text-danger hover:text-danger/70"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {types.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-text-muted text-xs">Nenhum tipo cadastrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modelos de Veículos */}
        <div className="space-y-3 pt-4 border-t border-app-border">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest">Modelos por Tipo</h4>
            <button 
              type="button"
              onClick={() => setShowModelForm(!showModelForm)}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} /> Novo Modelo
            </button>
          </div>

          {showModelForm && (
            <form onSubmit={handleSaveModel} className="bg-zinc-50 p-4 rounded-xl border border-app-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo Associado</label>
                  <select required className="w-full h-10 px-3 rounded-lg border border-app-border font-bold text-xs" value={modelForm.type_id} onChange={e => setModelForm({...modelForm, type_id: e.target.value})}>
                    <option value="">Selecione o tipo</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome do Modelo</label>
                  <input type="text" required placeholder="Ex: Volvo FH 540" className="w-full h-10 px-3 rounded-lg border border-app-border font-bold text-xs" value={modelForm.name} onChange={e => setModelForm({...modelForm, name: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Salvar</button>
                <button type="button" onClick={() => { setShowModelForm(false); setModelForm({id:'', type_id:'', name:''}) }} className="px-4 py-2 border border-app-border text-text-muted text-[10px] font-black uppercase tracking-widest rounded-lg">Cancelar</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-app-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-app-border">
                <tr>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px]">Modelo</th>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px]">Tipo</th>
                  <th className="px-4 py-2 font-bold text-text-muted uppercase tracking-widest text-[9px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {models.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-bold text-text-main">{m.name}</td>
                    <td className="px-4 py-3 font-medium text-text-muted">{m.vehicle_types?.name}</td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      <button type="button" onClick={() => { setModelForm({ id: m.id, type_id: m.type_id, name: m.name }); setShowModelForm(true); }} className="text-primary hover:text-primary/70"><Edit2 size={14} /></button>
                      <button type="button" onClick={() => handleDeleteModel(m.id)} className="text-danger hover:text-danger/70"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {models.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-text-muted text-xs">Nenhum modelo cadastrado</td></tr>}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
