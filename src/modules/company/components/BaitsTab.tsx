import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { CheckCircle2, Search, X } from 'lucide-react';

export default function BaitsTab() {
  const [baits, setBaits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [baitForm, setBaitForm] = useState<{id: string, name: string}>({ id: '', name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('baits').select('*').order('name');
      setBaits(data || []);
    } catch (error) {
      console.error('Error fetching baits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveBait = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (baitForm.id) {
        const { error } = await supabase.from('baits').update({
          name: baitForm.name
        }).eq('id', baitForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('baits').insert([{
          name: baitForm.name
        }]);
        if (error) throw error;
      }
      setBaitForm({ id: '', name: '' });
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja ${currentStatus ? 'desabilitar' : 'habilitar'} esta isca?`)) return;
    try {
      const { error } = await supabase.from('baits').update({ active: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      alert('Erro ao alterar status. Detalhes: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando iscas...</div>;
  }

  const filteredBaits = baits.filter(b => b.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-8 bento-card !p-0">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Iscas Ativas</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Filtrar iscas..."
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
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome da Isca</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredBaits.length > 0 ? filteredBaits.map((bait) => (
                  <tr key={bait.id} className={`hover:bg-app-bg/30 ${!bait.active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-text-main">{bait.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right flex gap-3 justify-end items-center">
                      <button onClick={() => setBaitForm({ id: bait.id, name: bait.name })} className="text-primary hover:underline text-[10px] font-bold">Editar</button>
                      <button onClick={() => toggleStatus(bait.id, bait.active)} className={`${bait.active ? 'text-danger' : 'text-success'} hover:underline text-[10px] font-bold`}>{bait.active ? 'Desabilitar' : 'Habilitar'}</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-center text-[10px] text-text-muted font-bold uppercase tracking-wider">Nenhuma isca encontrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

       {/* Form */}
       <div className="xl:col-span-4 bento-card border-none bg-primary/5 xl:sticky xl:top-24 self-start">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              {baitForm.id ? 'Editar Isca' : 'Nova Isca'}
            </h3>
            <p className="text-[10px] text-primary/60 font-bold italic uppercase tracking-wider mt-1">
              {baitForm.id ? 'Atualize as informações' : 'Adicione uma nova isca ao catálogo'}
            </p>
          </div>
          {baitForm.id && (
            <button 
              onClick={() => setBaitForm({ id: '', name: '' })}
              className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <form onSubmit={handleSaveBait} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Nome da Isca</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: Isca Modelo A"
              className="w-full h-11 px-4 rounded-xl border border-primary/20 bg-white text-xs font-bold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-primary/30 transition-all shadow-sm"
              value={baitForm.name}
              onChange={e => setBaitForm({...baitForm, name: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full h-12 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 focus:ring-2 focus:ring-offset-2 focus:ring-primary active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'SALVANDO...' : 'SALVAR ISCA'}
          </button>
        </form>
      </div>
    </div>
  );
}
