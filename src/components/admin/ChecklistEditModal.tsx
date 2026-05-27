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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedDetails = {
        ...submission.details,
        itemValues,
        is_edited: true,
        edited_at: new Date().toISOString()
      };

      const { error } = await supabase.from('checklist_submissions')
        .update({
          odometer: parseInt(odometer) || 0,
          details: updatedDetails
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Handle checklist_issues sync (extremely basic to prevent ghost defects)
      for (const [itemId, val] of Object.entries(itemValues)) {
         const oldVal = submission.details?.itemValues?.[itemId];
         if (oldVal === 'defect' && val !== 'defect') {
            const title = submission.details?.itemTitles?.[itemId] || `Item ${itemId}`;
            const { data: existingIssues } = await supabase.from('checklist_issues')
               .select('id')
               .eq('submission_id', submission.id);
            
            // Note: Since item_title in issues may have index suffix if multiple of same name, 
            // we will just delete any unresolved matched issues roughly. For robust setup, 
            // we delete by submission_id if we change everything.
            await supabase.from('checklist_issues')
               .delete()
               .eq('submission_id', submission.id)
               .ilike('item_title', `${title}%`);
         } else if (oldVal !== 'defect' && val === 'defect') {
            const title = submission.details?.itemTitles?.[itemId] || `Item ${itemId}`;
            // Check if already exists just in case
            const { data: ex } = await supabase.from('checklist_issues')
               .select('id')
               .eq('submission_id', submission.id)
               .ilike('item_title', `${title}%`);
            
            if (!ex || ex.length === 0) {
               await supabase.from('checklist_issues').insert({
                  submission_id: submission.id,
                  vehicle_id: submission.vehicle_id,
                  trailer_id: submission.trailer_id,
                  driver_id: submission.driver_id,
                  item_title: title,
                  status: 'pending',
                  description: '[Editado Manualmente] Defeito adicionado após envio',
                  report_count: 1
               });
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

  const titles = submission.details?.itemTitles || {};

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
                  if (!value) return null;

                  // Ignorar litragem (fuel) pois não é 'conform/defect'
                  if (submission.type === 'fuel') return null;

                  return (
                    <div key={itemId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-app-border bg-app-bg/50">
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
