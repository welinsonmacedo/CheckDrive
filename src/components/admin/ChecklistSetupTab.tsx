import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ChecklistSetupTab() {
  const [checklistTypes, setChecklistTypes] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  
  const [itemForm, setItemForm] = useState({ 
    title: '', 
    is_trailer_item: false,
    selectedTypes: [] as string[],
    appears_in_manual: false,
    input_type: 'boolean'
  });
  
  const [saving, setSaving] = useState(false);
  const [editingItemIds, setEditingItemIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: types } = await supabase.from('checklist_types').select('*').order('title');
    let currentTypes = types || [];
    
    // Auto-create 'Lançamento Manual' type if it doesn't exist
    const hasManualType = currentTypes.some(t => t.slug === 'manual');
    if (!hasManualType && currentTypes.length > 0) {
       const { data: manualType } = await supabase.from('checklist_types').insert([
         { title: 'Lançamento Manual', slug: 'manual' }
       ]).select().single();
       if (manualType) {
         currentTypes = [...currentTypes, manualType];
       }
    }
    
    setChecklistTypes(currentTypes);

    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .order('is_trailer_item', { ascending: true })
      .order('created_at', { ascending: true });
    setChecklistItems(items || []);
  };

  // Group items by title and is_trailer_item
  const groupedItems = checklistItems.reduce((acc, current) => {
    const key = `${current.title.toLowerCase().trim()}_${current.is_trailer_item}_${current.input_type || 'boolean'}`;
    if (!acc[key]) {
      acc[key] = {
        title: current.title,
        is_trailer_item: current.is_trailer_item,
        appears_in_manual: current.appears_in_manual || false,
        input_type: current.input_type || 'boolean',
        types: [],
        ids: [] // Store IDs so we can delete all of them
      };
    }
    acc[key].types.push(current.type_id);
    acc[key].ids.push(current.id);
    return acc;
  }, {} as Record<string, any>);

  const uniqueItems = Object.values(groupedItems) as any[];

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
        appears_in_manual: itemForm.appears_in_manual,
        input_type: itemForm.input_type,
        order_index: 0 // Simplification since order will now be global
      }));

      // Se estiver editando, remove os antigos antes de inserir os novos
      if (editingItemIds.length > 0) {
        const { error: delError } = await supabase.from('checklist_items').delete().in('id', editingItemIds);
        if (delError) throw delError;
      }

      const { error } = await supabase.from('checklist_items').insert(inserts);
      if (error) {
        // Fallback for appears_in_manual column missing
        const fallbackInserts = itemForm.selectedTypes.map(typeId => ({
          type_id: typeId,
          title: itemForm.title,
          is_trailer_item: itemForm.is_trailer_item,
          input_type: itemForm.input_type,
          order_index: 0
        }));
        const { error: err2 } = await supabase.from('checklist_items').insert(fallbackInserts);
        if (err2) {
            // fallback if input_type fails
            const finalFallback = itemForm.selectedTypes.map(typeId => ({
               type_id: typeId,
               title: itemForm.title,
               is_trailer_item: itemForm.is_trailer_item,
               order_index: 0
            }));
            await supabase.from('checklist_items').insert(finalFallback);
        }
      }
      
      setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], appears_in_manual: false, input_type: 'boolean' });
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
      selectedTypes: item.types,
      appears_in_manual: item.appears_in_manual || false,
      input_type: item.input_type || 'boolean'
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-4 bento-card xl:sticky xl:top-24 self-start order-1 xl:order-2">
            <div>
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">{editingItemIds.length > 0 ? "Editando Item" : "Novo Item"}</h3>
              <p className="text-xs text-text-muted mt-1">{editingItemIds.length > 0 ? "Altere onde este item deve aparecer" : "Cadastre os itens e marque para qual tipo ele deve aparecer."}</p>
            </div>
            <form onSubmit={handleSaveItem} className="flex flex-col gap-4 mt-6">
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

              <div className="flex flex-col gap-2 p-3 bg-zinc-50 border border-app-border rounded-xl mt-2">
                 <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Tipo de Resposta:</span>
                 <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main">
                      <input type="radio" value="boolean" checked={itemForm.input_type === 'boolean'} onChange={e => setItemForm({...itemForm, input_type: 'boolean'})} className="text-primary focus:ring-primary" />
                      Normal / Defeito
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main">
                      <input type="radio" value="number" checked={itemForm.input_type === 'number'} onChange={e => setItemForm({...itemForm, input_type: 'number'})} className="text-primary focus:ring-primary" />
                      Numérico
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main">
                      <input type="radio" value="text" checked={itemForm.input_type === 'text'} onChange={e => setItemForm({...itemForm, input_type: 'text'})} className="text-primary focus:ring-primary" />
                      Texto Livre
                    </label>
                 </div>
              </div>

              <div className="flex items-center gap-4 mt-1">
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
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                    checked={itemForm.appears_in_manual}
                    onChange={e => setItemForm({...itemForm, appears_in_manual: e.target.checked})}
                  />
                  <span className="text-xs font-black text-text-muted uppercase tracking-widest">Aparece em Pendência Manual</span>
                </label>
              </div>
                
              <div className="flex justify-end gap-2 mt-2">
                {editingItemIds.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingItemIds([]);
                      setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], appears_in_manual: false, input_type: 'boolean' });
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
          </form>
        </div>

        <div className="xl:col-span-8 bento-card !p-0 order-2 xl:order-1">
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Item / Pergunta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Tipo de Equip.</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Resposta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Aparece em</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Manual?</th>
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
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded-md border border-app-border">
                        {item.input_type === 'number' ? 'Numérico' : item.input_type === 'text' ? 'Texto' : 'Normal / Defeito'}
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
                    <td className="px-5 py-4">
                      {item.appears_in_manual ? (
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Sim</span>
                      ) : (
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Não</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button onClick={() => startEditingItem(item)} className="text-text-muted hover:text-primary p-2 transition-colors rounded-lg hover:bg-blue-50"><Edit2 size={16}/></button>
                         <button onClick={() => deleteItem(item.ids)} className="text-text-muted hover:text-danger p-2 transition-colors rounded-lg hover:bg-red-50"><X size={16}/></button>
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-text-muted italic">Nenhum item cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}