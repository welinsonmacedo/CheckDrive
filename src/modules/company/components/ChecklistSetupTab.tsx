import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { encodeItemTitle, decodeItemTitle } from '@/src/lib/maskUtils';

export default function ChecklistSetupTab() {
  const { user } = useAuth();

  const [checklistTypes, setChecklistTypes] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [vehicleTypesList, setVehicleTypesList] = useState<any[]>([]);
  
  const [itemForm, setItemForm] = useState({ 
    title: '', 
    is_trailer_item: false,
    selectedTypes: [] as string[],
    target_vehicle_type: 'ALL',
    appears_in_manual: false,
    input_type: 'boolean',
    is_required: true,
    mask: 'none',
    is_fuel_liters: false,
    options: [] as string[],
    newOption: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [editingItemIds, setEditingItemIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: types } = await supabase.from('checklist_types').select('*').eq("company_id", user?.company_id).order('title');
    let currentTypes = types || [];
    
    // Fetch vehicle types for linking
    const { data: vTypes } = await supabase.from('vehicle_types').select('*').eq("company_id", user?.company_id).order('name');
    setVehicleTypesList(vTypes || []);

    // Auto-create 'Lançamento Manual' type if it doesn't exist
    const hasManualType = currentTypes.some(t => t.slug === 'manual');
    if (!hasManualType && currentTypes.length > 0) {
       const { data: manualType } = await supabase.from('checklist_types').insert([
         { title: 'Lançamento Manual', slug: 'manual', company_id: user?.company_id }
       ]).select().single();
       if (manualType) {
         currentTypes = [...currentTypes, manualType];
       }
    }
    
    setChecklistTypes(currentTypes);

    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq("company_id", user?.company_id)
      .order('is_trailer_item', { ascending: true })
      .order('created_at', { ascending: true });
    setChecklistItems(items || []);
  };

  const groupedItems = checklistItems.reduce((acc, current) => {
    const { title: decodedTitle, mask, options, vtype } = decodeItemTitle(current.title);
    const itemVType = current.vehicle_type || vtype || (current.is_trailer_item ? 'TRAILER' : 'ALL');

    const key = `${current.title.toLowerCase().trim()}_${itemVType}_${current.is_trailer_item}_${current.input_type || 'boolean'}_${current.order_index}`;
    if (!acc[key]) {
      acc[key] = {
        title: decodedTitle,
        mask: mask || 'none',
        options: options || [],
        vehicle_type: itemVType,
        is_trailer_item: current.is_trailer_item || itemVType === 'TRAILER',
        appears_in_manual: current.appears_in_manual || false,
        input_type: current.input_type || 'boolean',
        is_required: current.order_index !== 0,
        is_fuel_liters: current.input_type === 'fuel_liters',
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
    if (!itemForm.target_vehicle_type) {
      alert("Erro: É OBRIGATÓRIO vincular este item a um Tipo de Veículo ou Ativo.");
      return;
    }
    setSaving(true);
    try {
      const encodedTitle = encodeItemTitle(itemForm.title, itemForm.mask, itemForm.options, itemForm.target_vehicle_type);

      const finalInputType = itemForm.is_fuel_liters ? 'fuel_liters' : itemForm.input_type;
      const isTrailer = itemForm.target_vehicle_type === 'TRAILER' || itemForm.is_trailer_item;

      // Create an array of inserts
      const insertsWithLiters = itemForm.selectedTypes.map(typeId => ({
        type_id: typeId,
        title: encodedTitle,
        vehicle_type: itemForm.target_vehicle_type,
        is_trailer_item: isTrailer,
        appears_in_manual: itemForm.appears_in_manual,
        input_type: finalInputType,
        order_index: itemForm.is_required ? 1 : 0,
        company_id: user?.company_id
      }));

      // Se estiver editando, remove os antigos antes de inserir os novos
      if (editingItemIds.length > 0) {
        const { error: delError } = await supabase.from('checklist_items').delete().in('id', editingItemIds);
        if (delError) throw delError;
      }

      const { error: err1 } = await supabase.from('checklist_items').insert(insertsWithLiters);
      if (err1) {
        console.warn('Fallback inserting without vehicle_type column...', err1.message);
        
        const fallbackInserts = itemForm.selectedTypes.map(typeId => ({
          type_id: typeId,
          title: encodedTitle,
          is_trailer_item: isTrailer,
          input_type: finalInputType,
          order_index: itemForm.is_required ? 1 : 0,
          company_id: user?.company_id
        }));
        const { error: err3 } = await supabase.from('checklist_items').insert(fallbackInserts);
        if (err3) {
            alert('Erro ao salvar item no banco: ' + err3.message);
        }
      }
      
      setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], target_vehicle_type: 'ALL', appears_in_manual: false, input_type: 'boolean', is_required: true, mask: 'none', is_fuel_liters: false, options: [], newOption: '' });
      setShowForm(false);
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
      target_vehicle_type: item.vehicle_type || (item.is_trailer_item ? 'TRAILER' : 'ALL'),
      appears_in_manual: item.appears_in_manual || false,
      input_type: item.input_type === 'fuel_liters' ? 'number' : (item.input_type || 'boolean'),
      is_required: item.is_required,
      mask: item.mask || 'none',
      is_fuel_liters: item.input_type === 'fuel_liters',
      options: item.options || [],
      newOption: ''
    });
    setEditingItemIds(item.ids);
    setShowForm(true);
  };

  const createDefaultTypes = async () => {
    try {
      await supabase.from('checklist_types').insert([
        { title: 'Início de Viagem', slug: 'start', company_id: user?.company_id },
        { title: 'Abastecimento', slug: 'fuel', company_id: user?.company_id },
        { title: 'Fim de Viagem', slug: 'end', company_id: user?.company_id },
        { title: 'Pátio / Interno', slug: 'yard', company_id: user?.company_id }
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
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 sm:p-8 relative">
              <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                <X size={16}/>
              </button>
            <div>
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">{editingItemIds.length > 0 ? "Editando Item" : "Novo Item"}</h3>
              <p className="text-xs text-text-muted mt-1">{editingItemIds.length > 0 ? "Altere onde este item deve aparecer" : "Cadastre os itens, vincule obrigatoriamente ao tipo de veículo/ativo e marque onde deve aparecer."}</p>
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

              {/* MANDATORY: Linkage to Vehicle / Asset Type */}
              <div className="flex flex-col gap-2 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                     📌 Vincular ao Tipo de Veículo / Ativo (Obrigatório) *
                   </span>
                   <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">Campo Obrigatório</span>
                 </div>
                 <p className="text-[11px] text-indigo-900/80 mb-1">
                   O item só será exibido no checklist para o tipo de ativo selecionado:
                 </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                     <input type="radio" name="vtype" value="ALL" checked={itemForm.target_vehicle_type === 'ALL'} onChange={() => setItemForm({...itemForm, target_vehicle_type: 'ALL', is_trailer_item: false})} className="hidden" />
                     🌐 Todos os Tipos de Veículos e Ativos
                   </label>
                   <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === 'VEHICLE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                     <input type="radio" name="vtype" value="VEHICLE" checked={itemForm.target_vehicle_type === 'VEHICLE'} onChange={() => setItemForm({...itemForm, target_vehicle_type: 'VEHICLE', is_trailer_item: false})} className="hidden" />
                     🚚 Apenas Veículos (Caminhão, Van, etc.)
                   </label>
                   <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === 'MACHINE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                     <input type="radio" name="vtype" value="MACHINE" checked={itemForm.target_vehicle_type === 'MACHINE'} onChange={() => setItemForm({...itemForm, target_vehicle_type: 'MACHINE', is_trailer_item: false})} className="hidden" />
                     🚜 Apenas Máquinas (Agrícola / Amarela)
                   </label>
                   <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === 'EQUIPMENT' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                     <input type="radio" name="vtype" value="EQUIPMENT" checked={itemForm.target_vehicle_type === 'EQUIPMENT'} onChange={() => setItemForm({...itemForm, target_vehicle_type: 'EQUIPMENT', is_trailer_item: false})} className="hidden" />
                     ⚙️ Apenas Equipamentos
                   </label>
                   <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === 'TRAILER' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                     <input type="radio" name="vtype" value="TRAILER" checked={itemForm.target_vehicle_type === 'TRAILER'} onChange={() => setItemForm({...itemForm, target_vehicle_type: 'TRAILER', is_trailer_item: true})} className="hidden" />
                     🚛 Apenas Reboques / Carretas
                   </label>

                   {/* Registered vehicle types from database */}
                   {vehicleTypesList.map((vt) => (
                     <label key={vt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer font-bold transition-all ${itemForm.target_vehicle_type === vt.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-indigo-200 text-slate-700 hover:bg-indigo-50'}`}>
                       <input type="radio" name="vtype" value={vt.name} checked={itemForm.target_vehicle_type === vt.name} onChange={() => setItemForm({...itemForm, target_vehicle_type: vt.name, is_trailer_item: false})} className="hidden" />
                       📋 Tipo Específico: {vt.name}
                     </label>
                   ))}
                 </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-50 border border-app-border rounded-xl">
                 <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Aparecer nos tipos de checklist:</span>
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
                      <input type="radio" value="number" checked={itemForm.input_type === 'number'} onChange={e => setItemForm({...itemForm, input_type: 'number', mask: 'decimal'})} className="text-primary focus:ring-primary" />
                      Numérico
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-main">
                      <input type="radio" value="text" checked={itemForm.input_type === 'text'} onChange={e => setItemForm({...itemForm, input_type: 'text'})} className="text-primary focus:ring-primary" />
                      Texto Livre
                    </label>
                 </div>

                 {itemForm.input_type === 'number' && (
                   <div className="mt-3 pt-3 border-t border-app-border">
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Mascara do Campo (Opcional):</span>
                     <div className="flex items-center gap-4">
                       <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-main">
                         <input type="radio" value="none" checked={itemForm.mask === 'none' || !itemForm.mask} onChange={e => setItemForm({...itemForm, mask: 'none'})} className="text-primary focus:ring-primary" />
                         Sem Máscara
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-main">
                         <input type="radio" value="decimal" checked={itemForm.mask === 'decimal'} onChange={e => setItemForm({...itemForm, mask: 'decimal'})} className="text-primary focus:ring-primary" />
                         Decimal (ex: 1.000,50)
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-main">
                         <input type="radio" value="currency" checked={itemForm.mask === 'currency'} onChange={e => setItemForm({...itemForm, mask: 'currency'})} className="text-primary focus:ring-primary" />
                         Moeda (ex: R$ 1.000,50)
                       </label>
                     </div>
                   </div>
                 )}
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-50 border border-app-border rounded-xl mt-2">
                 <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Opções de Pendência (Defeito):</span>
                 <div className="flex flex-col gap-2">
                   {itemForm.options.map((opt, i) => (
                     <div key={i} className="flex items-center justify-between p-2 bg-white border border-app-border rounded-lg shadow-sm">
                       <span className="text-sm font-medium">{opt}</span>
                       <button
                         type="button"
                         onClick={() => setItemForm({ ...itemForm, options: itemForm.options.filter((_, index) => index !== i) })}
                         className="text-danger hover:bg-red-50 p-1 rounded transition-colors"
                       >
                         <X size={14} />
                       </button>
                     </div>
                   ))}
                   <div className="flex items-center gap-2">
                     <input
                       className="h-10 px-3 rounded-lg border border-app-border text-xs font-medium outline-none focus:border-primary flex-1 bg-white"
                       placeholder="Nova pendência (ex: Pneu furado)"
                       value={itemForm.newOption}
                       onChange={e => setItemForm({ ...itemForm, newOption: e.target.value })}
                       onKeyDown={e => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           if (itemForm.newOption.trim()) {
                             setItemForm({ ...itemForm, options: [...itemForm.options, itemForm.newOption.trim()], newOption: '' });
                           }
                         }
                       }}
                     />
                     <button
                       type="button"
                       onClick={() => {
                         if (itemForm.newOption.trim()) {
                           setItemForm({ ...itemForm, options: [...itemForm.options, itemForm.newOption.trim()], newOption: '' });
                         }
                       }}
                       className="h-10 px-4 bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-300 transition-colors"
                     >
                       Adicionar
                     </button>
                   </div>
                 </div>
              </div>

              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                    checked={itemForm.appears_in_manual}
                    onChange={e => setItemForm({...itemForm, appears_in_manual: e.target.checked})}
                  />
                  <span className="text-xs font-black text-text-muted uppercase tracking-widest">Aparece em Pendência</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                    checked={itemForm.is_required}
                    onChange={e => setItemForm({...itemForm, is_required: e.target.checked})}
                  />
                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Obrigatório</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                    checked={itemForm.is_fuel_liters}
                    onChange={e => setItemForm({...itemForm, is_fuel_liters: e.target.checked})}
                  />
                  <span className="text-xs font-black text-red-600 uppercase tracking-widest">Litros?</span>
                </label>
              </div>
                
              <div className="flex justify-end gap-2 mt-2">
                {editingItemIds.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingItemIds([]);
                      setShowForm(false);
                      setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], target_vehicle_type: 'ALL', appears_in_manual: false, input_type: 'boolean', is_required: true, mask: 'none', is_fuel_liters: false, options: [], newOption: '' });
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
      </div>
      )}

                <div className="xl:col-span-12 bento-card !p-0 order-2 xl:order-1">
          <div className="p-5 border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Itens do Checklist
            </span>
            <button
              onClick={() => {
                setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], target_vehicle_type: 'ALL', appears_in_manual: false, input_type: 'boolean', is_required: true, mask: 'none', is_fuel_liters: false, options: [], newOption: '' });
                setEditingItemIds([]);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
            >
              <Plus size={14} /> Novo Item
            </button>
          </div>
          <div className="overflow-x-auto"> 
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Item / Pergunta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Tipo de Veículo / Ativo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Resposta</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Aparece em</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Pendência Manual?</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Obrigatório?</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest border-y border-app-border">Litros?</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right border-y border-app-border">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {uniqueItems.length > 0 ? uniqueItems.map((item, i) => (
                  <tr key={i} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-sm font-bold text-text-main">{item.title}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        item.vehicle_type === 'MACHINE' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        item.vehicle_type === 'EQUIPMENT' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        item.vehicle_type === 'VEHICLE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        item.vehicle_type === 'TRAILER' || item.is_trailer_item ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {item.vehicle_type === 'MACHINE' ? '🚜 Máquina' :
                         item.vehicle_type === 'EQUIPMENT' ? '⚙️ Equipamento' :
                         item.vehicle_type === 'VEHICLE' ? '🚚 Veículo' :
                         item.vehicle_type === 'TRAILER' || item.is_trailer_item ? '🚛 Reboque' :
                         item.vehicle_type === 'ALL' || !item.vehicle_type ? '🌐 Todos os Ativos' :
                         `📋 ${item.vehicle_type}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded-md border border-app-border inline-block whitespace-nowrap">
                        {item.input_type === 'number' || item.input_type === 'fuel_liters'
                          ? `Numérico${item.mask === 'currency' ? ' (Moeda)' : item.mask === 'decimal' ? ' (Decimal)' : ''}` 
                          : item.input_type === 'text' ? 'Texto' : 'Normal / Defeito'}
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
                    <td className="px-5 py-4">
                      {item.is_required ? (
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sim</span>
                      ) : (
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Não</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.is_fuel_liters ? (
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Sim</span>
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
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-text-muted italic">Nenhum item cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}