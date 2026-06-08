import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Settings, Plus, Trash2 } from 'lucide-react';

export default function ManualPenaltiesSettingsSection() {
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ id: '', name: '', points: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('manual_penalties').select('*').order('name');
      if (error) throw error;
      setPenalties(data || []);
    } catch (error: any) {
      if (error.message?.includes('Could not find the table') || error.message?.includes('relation "manual_penalties" does not exist') || error.message?.includes('violates row-level security policy')) {
        setErrorMsg('A tabela "manual_penalties" não foi encontrada, ou as permissões estão faltando. Por favor, execute o script SQL no editor do Supabase.');
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        points: Number(form.points)
      };

      if (form.id) {
        const { error } = await supabase.from('manual_penalties').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('manual_penalties').insert([payload]);
        if (error) throw error;
      }
      setForm({ id: '', name: '', points: '' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      if (error.message?.includes('violates row-level security policy')) {
        alert('Erro de Permissão (RLS): As políticas da tabela "manual_penalties" não foram aplicadas. Feche este modal e siga as instruções na tela.');
        setErrorMsg('Parece que faltam as políticas de permissão RLS para a tabela "manual_penalties". Por favor, execute o script SQL abaixo no Supabase.');
      } else {
        alert('Erro: ' + error.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta penalidade?')) return;
    try {
      const { error } = await supabase.from('manual_penalties').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    }
  };

  if (errorMsg) {
    return (
      <div className="bento-card p-6">
         <h3 className="text-sm font-black text-danger uppercase tracking-tight mb-2">Atenção!</h3>
         <p className="text-xs text-text-muted">{errorMsg}</p>
         <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg overflow-x-auto text-[10px] font-mono text-text-muted">
           <pre>
{`CREATE TABLE IF NOT EXISTS manual_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    points NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE manual_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read" ON manual_penalties;
DROP POLICY IF EXISTS "Admin Manage" ON manual_penalties;

CREATE POLICY "Public Read" ON manual_penalties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage" ON manual_penalties FOR ALL TO authenticated USING (true) WITH CHECK (true);
`}
           </pre>
         </div>
      </div>
    );
  }

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Settings size={20} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Penalidades Manuais</h3>
            <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">Cadastre penalidades para aplicar avulsamente nas escalas</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ id: '', name: '', points: '' });
            setShowForm(!showForm);
          }}
          className="h-10 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2"
        >
          {showForm ? 'Fechar' : <><Plus size={16} /> Nova Penalidade</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="mb-6 bg-app-bg p-5 rounded-xl border border-app-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome da Penalidade</label>
              <input 
                required
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-[11px] font-bold outline-none focus:border-primary"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ex: Falta Grave"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Valor/Pontos (Positivo)</label>
              <input 
                required
                type="number"
                min="1"
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-[11px] font-bold outline-none focus:border-primary"
                value={form.points}
                onChange={e => setForm({...form, points: e.target.value})}
                placeholder="Ex: 50"
              />
            </div>
          </div>
          <button className="h-11 px-6 rounded-xl bg-text-main text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
            Salvar
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-text-muted uppercase tracking-widest">Carregando...</div>
      ) : penalties.length === 0 ? (
        <div className="p-8 text-center text-xs font-bold text-text-muted uppercase tracking-widest bg-zinc-50 rounded-xl">Sem penalidades manuais cadastradas.</div>
      ) : (
        <div className="space-y-2">
          {penalties.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-app-bg border border-app-border rounded-xl">
              <div>
                <h4 className="text-sm font-black text-text-main">{p.name}</h4>
                <p className="text-[10px] font-bold text-danger uppercase mt-0.5">-{p.points} pontos</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({ id: p.id, name: p.name, points: String(p.points) });
                    setShowForm(true);
                  }}
                  className="w-8 h-8 rounded-lg border border-app-border flex items-center justify-center text-text-muted hover:text-primary transition-colors bg-white shadow-sm"
                >
                  <Settings size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="w-8 h-8 rounded-lg border border-app-border flex items-center justify-center text-text-muted hover:text-danger hover:bg-red-50 transition-colors bg-white shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
