import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ChecklistSetupTab() {
  const [checklistTypes, setChecklistTypes] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  
  const [itemForm, setItemForm] = useState({ 
    title: '', 
    is_trailer_item: false,
    selectedTypes: [] as string[]
  });
  
  const [saving, setSaving] = useState(false);
  const [editingItemIds, setEditingItemIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: types } = await supabase.from('checklist_types').select('*').order('title');
    setChecklistTypes(types || []);

    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .order('is_trailer_item', { ascending: true })
      .order('created_at', { ascending: true });
    setChecklistItems(items || []);
  };

  // Group items by title and is_trailer_item
  const groupedItems = checklistItems.reduce((acc, current) => {
    const key = `${current.title.toLowerCase().trim()}_${current.is_trailer_item}`;
    if (!acc[key]) {
      acc[key] = {
        title: current.title,
        is_trailer_item: current.is_trailer_item,
        types: [],
        ids: [] // Store IDs so we can delete all of them
      };
    }
    acc[key].types.push(current.type_id);
    acc[key].ids.push(current.id);
    return acc;
  }, {} as Record<string, any>);

  const uniqueItems = Object.values(groupedItems);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemForm.selectedTypes.length === 0) {
      alert("Selecione pelo menos um tipo de checklist para este item.");
      return;
    }
    setSaving(true);
    try {
      // Create an array of inserts
      const inserts = itemForm.selectedTypes.map(typeId => ({
        type_id: typeId,
        title: itemForm.title,
        is_trailer_item: itemForm.is_trailer_item,
        order_index: 0 // Simplification since order will now be global
      }));

      // Se estiver editando, remove os antigos antes de inserir os novos
      if (editingItemIds.length > 0) {
        const { error: delError } = await supabase.from('checklist_items').delete().in('id', editingItemIds);
        if (delError) throw delError;
      }

      const { error } = await supabase.from('checklist_items').insert(inserts);
      if (error) throw error;
      
      setItemForm({ title: '', is_trailer_item: false, selectedTypes: [] });
      setEditingItemIds([]);
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (ids: string[]) => {
    if (!confirm('Tem certeza que deseja excluir este item de todos os tipos?')) return;
    try {
      if (ids.length === 0) return;
      await supabase.from('checklist_items').delete().in('id', ids);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const toggleTypeSelection = (typeId: string) => {
    setItemForm(prev => {
      const isSelected = prev.selectedTypes.includes(typeId);
      return {
        ...prev,
        selectedTypes: isSelected 
          ? prev.selectedTypes.filter(id => id !== typeId)
          : [...prev.selectedTypes, typeId]
      };
    });
  };

  const startEditingItem = (item: any) => {
    setItemForm({
      title: item.title,
      is_trailer_item: item.is_trailer_item,
      selectedTypes: item.types
    });
    setEditingItemIds(item.ids);
  };

  const createDefaultTypes = async () => {
    try {
      await supabase.from('checklist_types').insert([
        { title: 'Início de Viagem', slug: 'start' },
        { title: 'Abastecimento', slug: 'fuel' },
        { title: 'Fim de Viagem', slug: 'end' },
        { title: 'Pátio / Interno', slug: 'yard' }
      ]);
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {checklistTypes.length === 0 && (
        <div className="bento-card flex items-center justify-between p-6 bg-red-50 border-red-200">
           <p className="text-sm text-red-800 font-bold">Nenhum tipo de checklist encontrado.</p>
           <button 
             onClick={createDefaultTypes}
             className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
           >
             Criar Tipos Padrão
           </button>
        </div>
      )}

      <div className="bento-card flex flex-col gap-6">
          <div className="border-b border-app-border pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">{editingItemIds.length > 0 ? "Editando Item" : "Novo Item"}</h3>
              <p className="text-xs text-text-muted mt-1">{editingItemIds.length > 0 ? "Altere onde este item deve aparecer" : "Cadastre os itens e marque para qual tipo ele deve aparecer."}</p>
            </div>
            
            <form onSubmit={handleSaveItem} className="flex flex-col gap-4 w-full md:w-2/3 lg:w-1/2">
              <div className="flex flex-col gap-2">
                <input 
                  required
                  disabled={editingItemIds.length > 0}
                  className="h-10 px-4 rounded-xl border border-app-border text-sm font-bold outline-none focus:border-primary w-full shadow-sm bg-zinc-50 focus:bg-white transition-colors disabled:opacity-50"
                  placeholder="Nome do item (ex: Nível do Óleo)"
                  value={itemForm.title}
                  onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-50 border border-app-border rounded-xl">
                 <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Aparecer nos tipos:</span>
                 <div className="flex flex-wrap gap-2">
                   {checklistTypes.map(t => (
                     <label key={t.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${itemForm.selectedTypes.includes(t.id) ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-white border-app-border text-text-muted'}`}>
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={itemForm.selectedTypes.includes(t.id)}
                          onChange={() => toggleTypeSelection(t.id)}
                        />
                        {t.title}
                     </label>
                   ))}
                 </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    disabled={editingItemIds.length > 0}
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary disabled:opacity-50"
                    checked={itemForm.is_trailer_item}
                    onChange={e => setItemForm({...itemForm, is_trailer_item: e.target.checked})}
                  />
                  <span className="text-xs font-black text-text-main uppercase tracking-widest">Item para Reboque</span>
                </label>
                
                <div className="flex gap-2">
                  {editingItemIds.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingItemIds([]);
                        setItemForm({ title: '', is_trailer_item: false, selectedTypes: [] });
                      }}
                      className="h-10 px-4 bg-zinc-200 text-zinc-700 flex items-center justify-center gap-2 rounded-xl shadow-sm text-xs font-black uppercase tracking-widest hover:bg-zinc-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    disabled={saving || checklistTypes.length === 0} 
                    className="h-10 px-6 bg-primary text-white flex items-center justify-center gap-2 rounded-xl shadow-sm text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                    type="submit"
                  >
                    <Plus size={16} />
                    {editingItemIds.length > 0 ? "Salvar" : "Cadastrar Item"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
             <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Item / Pergunta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Tipo de Equip.</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Aparece em</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right border-y border-app-border">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {uniqueItems.length > 0 ? uniqueItems.map((item, i) => (
                  <tr key={i} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-sm font-bold text-text-main">{item.title}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${item.is_trailer_item ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-primary'}`}>
                        {item.is_trailer_item ? 'Reboque' : 'Veículo'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {checklistTypes.filter(t => item.types.includes(t.id)).map(t => (
                          <span key={t.id} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[9px] font-bold uppercase tracking-wider border border-app-border">
                            {t.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => startEditingItem(item)} className="text-text-muted hover:text-primary p-2 transition-colors rounded-lg hover:bg-blue-50"><Edit2 size={16}/></button>
                         <button onClick={() => deleteItem(item.ids)} className="text-text-muted hover:text-danger p-2 transition-colors rounded-lg hover:bg-red-50"><X size={16}/></button>
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-text-muted italic">Nenhum item cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}