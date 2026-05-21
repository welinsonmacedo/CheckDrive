import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';

export default function ScoreProfilesSettingsSection() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: '', name: '', calculation_type: 'fixed', base_value: '1000',
    penalty_start: '50', penalty_end: '50', penalty_fuel: '50', penalty_yard: '50',
    apply_penalty_start: true, apply_penalty_end: true, apply_penalty_fuel: true, apply_penalty_yard: true,
    closing_rule: 'manual', closing_value: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('score_profiles').select('*').order('name');
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        calculation_type: form.calculation_type,
        base_value: Number(form.base_value),
        penalty_start: Number(form.penalty_start),
        penalty_end: Number(form.penalty_end),
        penalty_fuel: Number(form.penalty_fuel),
        penalty_yard: Number(form.penalty_yard),
        apply_penalty_start: form.apply_penalty_start,
        apply_penalty_end: form.apply_penalty_end,
        apply_penalty_fuel: form.apply_penalty_fuel,
        apply_penalty_yard: form.apply_penalty_yard,
        closing_rule: form.closing_rule,
        closing_value: form.closing_value || null
      };

      if (form.id) {
        await supabase.from('score_profiles').update(payload).eq('id', form.id);
      } else {
        await supabase.from('score_profiles').insert(payload);
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este perfil de pontuação?')) return;
    try {
      await supabase.from('score_profiles').delete().eq('id', id);
      fetchData();
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-zinc-200 rounded w-3/4"></div></div></div>;

  return (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
      <div className="p-5 border-b border-app-border flex justify-between items-center bg-zinc-50/50">
        <h3 className="text-sm font-black text-text-main uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert size={18} className="text-primary" />
          Tipos de Pontuação (Perfis)
        </h3>
        <button 
          onClick={() => {
            setForm({ 
              id: '', name: '', calculation_type: 'fixed', base_value: '1000', 
              penalty_start: '50', penalty_end: '50', penalty_fuel: '50', penalty_yard: '50', 
              apply_penalty_start: true, apply_penalty_end: true, apply_penalty_fuel: true, apply_penalty_yard: true,
              closing_rule: 'manual', closing_value: '' 
            });
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Novo Perfil
        </button>
      </div>

      <div className="p-5 space-y-6">
        {showForm && (
          <form onSubmit={handleSave} className="bg-zinc-50 p-5 rounded-xl border border-app-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome do Perfil</label>
                <input required type="text" placeholder="Ex: Mensalista, CLT..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo de Cálculo</label>
                <select value={form.calculation_type} onChange={e => setForm({...form, calculation_type: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary">
                  <option value="fixed">Fixo (ex: 1000 pts base)</option>
                  <option value="per_workday">Por Dia Útil (ex: 50 pts/dia)</option>
                  <option value="per_schedule">Por Escala (ex: 10 pts/escala)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-app-border">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Valores Base e Descontos</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Valor Base</label>
                  <input required type="number" min="0" value={form.base_value} onChange={e => setForm({...form, base_value: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex items-center justify-between">
                    Desconto Inicial
                    <input type="checkbox" checked={form.apply_penalty_start} onChange={e => setForm({...form, apply_penalty_start: e.target.checked})} className="accent-danger" />
                  </label>
                  <input required type="number" min="0" disabled={!form.apply_penalty_start} value={form.penalty_start} onChange={e => setForm({...form, penalty_start: e.target.value})} className={`w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary ${form.apply_penalty_start ? 'text-danger' : 'text-zinc-300'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex items-center justify-between">
                    Desconto Final
                    <input type="checkbox" checked={form.apply_penalty_end} onChange={e => setForm({...form, apply_penalty_end: e.target.checked})} className="accent-danger" />
                  </label>
                  <input required type="number" min="0" disabled={!form.apply_penalty_end} value={form.penalty_end} onChange={e => setForm({...form, penalty_end: e.target.value})} className={`w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary ${form.apply_penalty_end ? 'text-danger' : 'text-zinc-300'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex items-center justify-between">
                    Desc. Abastecimento
                    <input type="checkbox" checked={form.apply_penalty_fuel} onChange={e => setForm({...form, apply_penalty_fuel: e.target.checked})} className="accent-danger" />
                  </label>
                  <input required type="number" min="0" disabled={!form.apply_penalty_fuel} value={form.penalty_fuel} onChange={e => setForm({...form, penalty_fuel: e.target.value})} className={`w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary ${form.apply_penalty_fuel ? 'text-danger' : 'text-zinc-300'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-danger uppercase tracking-widest flex items-center justify-between">
                    Desc. Pátio
                    <input type="checkbox" checked={form.apply_penalty_yard} onChange={e => setForm({...form, apply_penalty_yard: e.target.checked})} className="accent-danger" />
                  </label>
                  <input required type="number" min="0" disabled={!form.apply_penalty_yard} value={form.penalty_yard} onChange={e => setForm({...form, penalty_yard: e.target.value})} className={`w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary ${form.apply_penalty_yard ? 'text-danger' : 'text-zinc-300'}`} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-app-border">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Opções de Fechamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Regra de Fechamento</label>
                  <select value={form.closing_rule} onChange={e => setForm({...form, closing_rule: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary">
                    <option value="manual">Manual (Admin fecha a pontuação)</option>
                    <option value="fixed_day">Dia Fixo do Mês</option>
                    <option value="last_sunday">Todo Último Domingo do Mês</option>
                  </select>
                </div>
                {form.closing_rule === 'fixed_day' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Dia do Fechamento (ex: 20)</label>
                    <input required type="number" min="1" max="31" value={form.closing_value} onChange={e => setForm({...form, closing_value: e.target.value})} className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-xs font-bold outline-none focus:border-primary" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="submit" className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity">Salvar Perfil</button>
            </div>
          </form>
        )}

        {profiles.length > 0 ? (
          <div className="overflow-x-auto border border-app-border rounded-xl">
             <table className="w-full text-left text-xs">
               <thead className="bg-zinc-50 border-b border-app-border">
                 <tr>
                   <th className="px-4 py-3 font-bold text-text-muted uppercase tracking-widest text-[9px]">Nome</th>
                   <th className="px-4 py-3 font-bold text-text-muted uppercase tracking-widest text-[9px]">Tipo</th>
                   <th className="px-4 py-3 font-bold text-text-muted uppercase tracking-widest text-[9px] text-right">Base / Descontos (Ini, Fin, Abs, Pátio)</th>
                   <th className="px-4 py-3 font-bold text-text-muted uppercase tracking-widest text-[9px] text-right">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-app-border">
                 {profiles.map(p => (
                   <tr key={p.id} className="hover:bg-zinc-50/50">
                     <td className="px-4 py-4 font-black tracking-wide text-text-main">{p.name}</td>
                     <td className="px-4 py-4 font-bold text-text-muted">
                        {p.calculation_type === 'fixed' ? 'Fixo' : p.calculation_type === 'per_workday' ? 'Dias Úteis' : 'Por Escala'}
                     </td>
                     <td className="px-4 py-4 text-right font-bold text-zinc-500">
                        {p.base_value} <span className="text-app-border">|</span> <span className="text-danger">-{p.penalty_start}, -{p.penalty_end}, -{p.penalty_fuel}, -{p.penalty_yard}</span>
                     </td>
                     <td className="px-4 py-4 flex justify-end gap-2">
                       <button onClick={() => {
                         setForm({
                           id: p.id, name: p.name, calculation_type: p.calculation_type || 'fixed',
                           base_value: p.base_value.toString(),
                           penalty_start: p.penalty_start.toString(), penalty_end: p.penalty_end.toString(), penalty_fuel: p.penalty_fuel.toString(), penalty_yard: (p.penalty_yard || 50).toString(),
                           apply_penalty_start: p.apply_penalty_start ?? true,
                           apply_penalty_end: p.apply_penalty_end ?? true,
                           apply_penalty_fuel: p.apply_penalty_fuel ?? true,
                           apply_penalty_yard: p.apply_penalty_yard ?? true,
                           closing_rule: p.closing_rule || 'manual', closing_value: p.closing_value || ''
                         });
                         setShowForm(true);
                       }} className="p-2 text-zinc-400 hover:text-primary transition-colors"><Edit2 size={16}/></button>
                       <button onClick={() => handleDelete(p.id)} className="p-2 text-zinc-400 hover:text-danger transition-colors"><Trash2 size={16}/></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-text-muted font-medium bg-zinc-50 rounded-xl border border-dashed border-app-border">
             Nenhum perfil de pontuação cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
