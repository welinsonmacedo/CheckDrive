import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChecklistEditModalProps {
  submission: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ChecklistEditModal({ submission, onClose, onSaved }: ChecklistEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [odometer, setOdometer] = useState(submission.odometer?.toString() || '');
  const [itemValues, setItemValues] = useState<Record<string, string>>(submission.details?.itemValues || {});
  const [defectDescriptions, setDefectDescriptions] = useState<Record<string, string>>(() => {
    const descs: Record<string, string> = {};
    if (submission.details?.defects) {
      for (const [itemId, rawDefectInfo] of Object.entries(submission.details.defects)) {
         if (!rawDefectInfo) continue;
         const defArr = Array.isArray(rawDefectInfo) ? rawDefectInfo : [rawDefectInfo];
         if (defArr.length > 0 && defArr[0]?.description) {
            descs[itemId] = defArr[0].description;
         }
      }
    }
    return descs;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedDefects = { ...submission.details?.defects };
      
      if (submission.type !== 'fuel') {
         for (const [itemId, val] of Object.entries(itemValues)) {
            if (val === 'defect') {
               const currentDesc = defectDescriptions[itemId] || '[Editado Manualmente] Defeito adicionado/alterado';
               const existingArr = Array.isArray(updatedDefects[itemId]) ? updatedDefects[itemId] : [updatedDefects[itemId] || {}];
               updatedDefects[itemId] = [{ ...existingArr[0], description: currentDesc }];
            } else {
               delete updatedDefects[itemId];
            }
         }
      }

      const oldDetails = submission.details || {};
      const editHistoryEntry = {
        edited_at: new Date().toISOString(),
        previous_odometer: submission.odometer,
        new_odometer: parseInt(odometer) || 0,
        previous_items: oldDetails.itemValues || {},
        new_items: itemValues,
        previous_defects: oldDetails.defects || {},
        new_defects: updatedDefects
      };

      const updatedDetails = {
        ...oldDetails,
        itemValues,
        defects: updatedDefects,
        is_edited: true,
        edited_at: editHistoryEntry.edited_at,
        edit_history: [...(oldDetails.edit_history || []), editHistoryEntry]
      };

      const { error } = await supabase.from('checklist_submissions')
        .update({
          odometer: parseInt(odometer) || 0,
          details: updatedDetails
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Handle checklist_issues sync 
      if (submission.type !== 'fuel') {
        // Fetch existing issues for this submission once to match
        const { data: existingIssues } = await supabase.from('checklist_issues')
          .select('id, item_title')
          .eq('submission_id', submission.id);

        for (const [itemId, val] of Object.entries(itemValues)) {
           const oldVal = submission.details?.itemValues?.[itemId];
           const titleBase = submission.details?.itemTitles?.[itemId] || `Item ${itemId}`;
           const newDesc = defectDescriptions[itemId] || '[Editado Manualmente] Defeito adicionado/alterado';
           
           // Find matching existing issue by title (prefix match since titles might have " (1)" suffix)
           const matchingIssue = existingIssues?.find(issue => issue.item_title.startsWith(titleBase));

           if (oldVal === 'defect' && val !== 'defect') {
              if (matchingIssue) {
                 await supabase.from('checklist_issues')
                    .delete()
                    .eq('id', matchingIssue.id);
              }
           } else if (oldVal !== 'defect' && val === 'defect') {
              if (!matchingIssue) {
                 await supabase.from('checklist_issues').insert({
                    submission_id: submission.id,
                    vehicle_id: submission.vehicle_id,
                    trailer_id: submission.trailer_id,
                    driver_id: submission.driver_id,
                    item_title: titleBase,
                    status: 'pending',
                    description: newDesc,
                    report_count: 1
                 });
              }
           } else if (oldVal === 'defect' && val === 'defect') {
              // Simply update the description
              if (matchingIssue) {
                 await supabase.from('checklist_issues')
                    .update({ description: newDesc })
                    .eq('id', matchingIssue.id);
              } else {
                 // if it somehow didn't exist in DB but did in oldVal
                 await supabase.from('checklist_issues').insert({
                    submission_id: submission.id,
                    vehicle_id: submission.vehicle_id,
                    trailer_id: submission.trailer_id,
                    driver_id: submission.driver_id,
                    item_title: titleBase,
                    status: 'pending',
                    description: newDesc,
                    report_count: 1
                 });
              }
           }
        }
      }

      onSaved();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from('checklist-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const titles = submission.details?.itemTitles || {};
  const hasPhotos = submission.photos && Object.keys(submission.photos).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-app-border bg-app-bg">
          <div>
            <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Editar Checklist</h3>
            <p className="text-xs text-text-muted mt-1">Altere o KM ou o status dos itens inspecionados</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasPhotos && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">Fotos do Checklist</h4>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {Object.entries(submission.photos).map(([key, path]) => {
                  const url = getPhotoUrl(path as string);
                  if (!url) return null;
                  return (
                    <div key={key} className="relative min-w-[120px] h-[120px] rounded-xl overflow-hidden border border-app-border bg-zinc-50 shrink-0 snap-start group">
                       <img src={url} alt={key} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                       <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] font-bold text-white uppercase tracking-widest">{key === 'receipt' ? 'Comprovante' : key === 'front' ? 'Frente' : key === 'back' ? 'Traseira' : key === 'left' ? 'Lateral Esq' : key === 'right' ? 'Lateral Dir' : key}</p>
                       </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">Informações Gerais</h4>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">KM Registrado</label>
              <input 
                type="number" 
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-white text-sm font-bold outline-none focus:border-primary transition-all"
                placeholder="Insira o KM..."
              />
            </div>
          </div>

          {Object.keys(titles).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-app-border pb-2">Itens Inspecionados</h4>
              
              <div className="grid gap-3">
                {Object.keys(titles).map(itemId => {
                  const title = titles[itemId];
                  const value = itemValues[itemId];
                  if (value === undefined) return null;

                  if (submission.type === 'fuel') {
                    return (
                      <div key={itemId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-app-border bg-app-bg/50">
                        <span className="text-xs font-bold text-text-main">{title}</span>
                        <input
                          type="text"
                          value={value}
                          onChange={e => setItemValues(prev => ({ ...prev, [itemId]: e.target.value }))}
                          className="w-full sm:w-1/2 h-9 px-3 rounded-lg text-xs font-bold outline-none border bg-white border-zinc-200 text-zinc-800 focus:border-primary transition-colors"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={itemId} className="flex flex-col gap-2 p-3 rounded-xl border border-app-border bg-app-bg/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs font-bold text-text-main">{title}</span>
                        <select
                          value={value}
                          onChange={e => setItemValues(prev => ({ ...prev, [itemId]: e.target.value }))}
                          className={`h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-widest outline-none border transition-colors ${
                            value === 'conform' ? 'bg-green-50 border-green-200 text-green-700' :
                            value === 'defect' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-zinc-100 border-zinc-200 text-zinc-600'
                          }`}
                        >
                          <option value="conform">Conforme</option>
                          <option value="defect">Defeito</option>
                          <option value="not_applicable">N/A</option>
                        </select>
                      </div>
                      
                      {value === 'defect' && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                          <textarea
                            placeholder="Descreva detalhadamente o defeito..."
                            value={defectDescriptions[itemId] || ''}
                            onChange={e => setDefectDescriptions(prev => ({ ...prev, [itemId]: e.target.value }))}
                            className="w-full min-h-[80px] p-3 rounded-xl text-xs font-medium outline-none border bg-white border-red-200 text-red-900 placeholder-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-y"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-app-border bg-app-bg flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-app-border text-xs font-black uppercase tracking-widest text-text-muted hover:bg-zinc-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Salvando...' : (
              <>
                <Save size={16} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
