import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ChecklistSetupTab() {
  const [checklistTypes, setChecklistTypes] = useState<any[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [itemForm, setItemForm] = useState({ title: '', is_trailer_item: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchItems();
    } else {
      setChecklistItems([]);
    }
  }, [selectedTypeId]);

  const fetchTypes = async () => {
    const { data: types } = await supabase.from('checklist_types').select('*').order('title');
    setChecklistTypes(types || []);
    if (types && types.length > 0 && !selectedTypeId) {
      setSelectedTypeId(types[0].id);
    }
  };

  const fetchItems = async () => {
    if (!selectedTypeId) return;
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('type_id', selectedTypeId)
      .order('is_trailer_item', { ascending: true })
      .order('order_index');
    setChecklistItems(items || []);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('checklist_items').insert([{
        type_id: selectedTypeId,
        title: itemForm.title,
        is_trailer_item: itemForm.is_trailer_item,
        order_index: checklistItems.length
      }]);
      if (error) throw error;
      setItemForm({ title: '', is_trailer_item: false });
      fetchItems();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      await supabase.from('checklist_items').delete().eq('id', id);
      fetchItems();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const createDefaultTypes = async () => {
    try {
      await supabase.from('checklist_types').insert([
        { title: 'Início de Viagem', slug: 'start' },
        { title: 'Abastecimento', slug: 'fuel' },
        { title: 'Fim de Viagem', slug: 'end' },
        { title: 'Pátio / Interno', slug: 'yard' }
      ]);
      fetchTypes();
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-4 bento-card">
        <h3 className="text-sm font-black text-text-main mb-6 uppercase tracking-tight">Tipos de Checklist</h3>
        <div className="space-y-2">
          {checklistTypes.map(t => (
            <button 
              key={t.id}
              onClick={() => setSelectedTypeId(t.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${selectedTypeId === t.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-app-bg text-text-muted border-app-border'}`}
            >
              {t.title}
            </button>
          ))}
          {checklistTypes.length === 0 && (
            <div className="space-y-4">
              <p className="text-xs text-text-muted italic">Nenhum tipo encontrado. Criar padrões?</p>
              <button 
                onClick={createDefaultTypes}
                className="w-full h-11 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Criar Tipos Padrão
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-8 bento-card !p-0">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider italic">Itens do Checklist Selecionado</span>
            <form onSubmit={handleSaveItem} className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                 <input 
                  type="checkbox" 
                  id="isTrailerItem"
                  className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                  checked={itemForm.is_trailer_item}
                  onChange={e => setItemForm({...itemForm, is_trailer_item: e.target.checked})}
                />
                <label htmlFor="isTrailerItem" className="text-[9px] font-black text-text-muted uppercase tracking-widest cursor-pointer whitespace-nowrap">Reboque</label>
              </div>
              <input 
                required
                className="h-8 px-3 rounded-lg border border-app-border text-[10px] font-bold outline-none focus:border-primary w-48"
                placeholder="Novo item (Ex: Freios)"
                value={itemForm.title}
                onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
              />
              <button disabled={!selectedTypeId || saving} className="h-8 w-8 bg-primary text-white flex items-center justify-center rounded-lg shadow-sm">
                <Plus size={14} />
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Ordem</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Item / Pergunta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {checklistItems.length > 0 ? checklistItems.map((item, i) => (
                  <tr key={item.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-xs font-bold text-text-muted">{i + 1}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.is_trailer_item ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-primary'}`}>
                        {item.is_trailer_item ? 'Reboque' : 'Veículo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">{item.title}</td>
                    <td className="px-5 py-4 text-right">
                       <button onClick={() => deleteItem(item.id)} className="text-text-muted hover:text-danger p-2"><X size={14}/></button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-xs text-text-muted italic">Selecione um tipo e cadastre os itens.</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
