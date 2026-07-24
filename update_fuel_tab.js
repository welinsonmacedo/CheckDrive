import fs from 'fs';

const file = 'src/modules/company/components/FuelTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
const importTarget = `import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import AddressFromCoordinates from "@/src/components/common/AddressFromCoordinates";`;
const importReplacement = `import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import AddressFromCoordinates from "@/src/components/common/AddressFromCoordinates";
import { Edit2, Save, X, History, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';`;

content = content.replace(importTarget, importReplacement);

// Add state
const stateTarget = `  const [loading, setLoading] = useState(true);

  useEffect(() => {`;
const stateReplacement = `  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [historySub, setHistorySub] = useState<any>(null);

  useEffect(() => {`;
content = content.replace(stateTarget, stateReplacement);

// Add handlers before return
const handlersTarget = `  return (
    <div className="space-y-6">`;
const handlersReplacement = `  const handleEditClick = (sub: any) => {
    setEditingSub(sub);
    setEditFormData({
      odometer: sub.odometer || '',
      manual_liters: sub.details?.manual_liters || '',
      itemValues: sub.details?.itemValues ? { ...sub.details.itemValues } : {}
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    setSaving(true);
    try {
      const changes: any = {};
      const oldOdometer = editingSub.odometer;
      const newOdometer = Number(editFormData.odometer);
      if (oldOdometer !== newOdometer && !isNaN(newOdometer)) {
        changes.odometer = { from: oldOdometer, to: newOdometer };
      }

      let newDetails = { ...editingSub.details };

      if (editingSub.details?.manual_liters !== undefined) {
        const oldLiters = editingSub.details.manual_liters;
        const newLiters = Number(editFormData.manual_liters);
        if (oldLiters !== newLiters && !isNaN(newLiters)) {
          changes.manual_liters = { from: oldLiters, to: newLiters };
          newDetails.manual_liters = newLiters;
        }
      }

      if (editingSub.details?.itemValues) {
        newDetails.itemValues = { ...editingSub.details.itemValues };
        Object.keys(editingSub.details.itemValues).forEach(key => {
          const oldVal = editingSub.details.itemValues[key];
          const newVal = editFormData.itemValues[key];
          if (oldVal !== newVal) {
            changes[\`item_\${key}\`] = { from: oldVal, to: newVal, title: editingSub.details.itemTitles?.[key] || 'Item' };
            newDetails.itemValues[key] = newVal;
          }
        });
      }

      if (Object.keys(changes).length > 0) {
        const historyEntry = {
          timestamp: new Date().toISOString(),
          user_id: user?.id,
          user_name: user?.full_name || 'Usuário',
          changes
        };
        newDetails.editHistory = [...(newDetails.editHistory || []), historyEntry];

        const { error } = await supabase
          .from("checklist_submissions")
          .update({
            odometer: newOdometer || oldOdometer,
            details: newDetails
          })
          .eq("id", editingSub.id);

        if (error) throw error;

        fetchFuelSubmissions();
      }
      setEditingSub(null);
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      alert("Erro ao salvar edição. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const renderEditModal = () => {
    if (!editingSub) return null;
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-app-border flex justify-between items-center bg-zinc-50">
            <h3 className="text-sm font-black text-text-main">Editar Abastecimento</h3>
            <button onClick={() => setEditingSub(null)} className="p-1.5 hover:bg-zinc-200 rounded-lg text-text-muted transition-colors"><X size={16} /></button>
          </div>
          <div className="p-5 overflow-y-auto space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">KM (Odômetro)</label>
              <input type="number" value={editFormData.odometer} onChange={(e) => setEditFormData({...editFormData, odometer: e.target.value})} className="w-full p-2.5 rounded-lg border border-app-border text-sm font-medium outline-none focus:border-primary" />
            </div>
            
            {editingSub.details?.manual_liters !== undefined && (
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Litragem</label>
                <input type="number" value={editFormData.manual_liters} onChange={(e) => setEditFormData({...editFormData, manual_liters: e.target.value})} className="w-full p-2.5 rounded-lg border border-app-border text-sm font-medium outline-none focus:border-primary" />
              </div>
            )}

            {editingSub.details?.itemValues && Object.keys(editingSub.details.itemValues).map(key => (
              <div key={key}>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{editingSub.details.itemTitles?.[key] || "Item"}</label>
                <input type="text" value={editFormData.itemValues[key] || ''} onChange={(e) => setEditFormData({...editFormData, itemValues: {...editFormData.itemValues, [key]: e.target.value}})} className="w-full p-2.5 rounded-lg border border-app-border text-sm font-medium outline-none focus:border-primary" />
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-app-border bg-zinc-50 flex justify-end gap-2">
            <button onClick={() => setEditingSub(null)} className="px-4 py-2 text-xs font-bold text-text-muted hover:bg-zinc-200 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2">
              <Save size={14} />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderHistoryModal = () => {
    if (!historySub) return null;
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-app-border flex justify-between items-center bg-zinc-50">
            <h3 className="text-sm font-black text-text-main flex items-center gap-2"><History size={16} className="text-primary"/> Histórico de Edições</h3>
            <button onClick={() => setHistorySub(null)} className="p-1.5 hover:bg-zinc-200 rounded-lg text-text-muted transition-colors"><X size={16} /></button>
          </div>
          <div className="p-5 overflow-y-auto space-y-6">
            {historySub.details?.editHistory?.slice().reverse().map((hist: any, i: number) => (
              <div key={i} className="relative pl-4 border-l-2 border-indigo-100 pb-2">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary" />
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={12} className="text-text-muted" />
                  <span className="text-[10px] font-bold text-text-muted">{new Date(hist.timestamp).toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] font-medium text-text-muted ml-auto">por {hist.user_name || 'Usuário'}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(hist.changes).map(([key, change]: [string, any], j) => (
                    <div key={j} className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 text-xs">
                      <span className="font-bold text-text-main block mb-1">
                        {key === 'odometer' ? 'KM (Odômetro)' : key === 'manual_liters' ? 'Litragem' : change.title || key}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-rose-500 line-through decoration-rose-300">{change.from || '-'}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="text-emerald-600 font-bold">{change.to || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-6">
      {renderEditModal()}
      {renderHistoryModal()}`;
content = content.replace(handlersTarget, handlersReplacement);

// Fix column headers
const desktopHeaderTarget = `                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Detalhes
                </th>
              </tr>`;
const desktopHeaderReplacement = `                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Detalhes
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest w-10">
                  Ações
                </th>
              </tr>`;
content = content.replace(desktopHeaderTarget, desktopHeaderReplacement);

// Fix column span for Empty/Loading
const desktopEmptyTarget = `colSpan={4}`;
const desktopEmptyReplacement = `colSpan={6}`;
content = content.replace(/colSpan=\{4\}/g, desktopEmptyReplacement);

// Add mobile edit button
const mobileCardTarget = `                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-text-muted">KM: <strong className="text-text-main font-bold">{sub.odometer || "-"}</strong></span>
                  <span className="text-xs font-mono font-bold text-text-main">{sub.vehicles?.plate}</span>
                </div>
              </div>`;
const mobileCardReplacement = `                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-text-muted">KM: <strong className="text-text-main font-bold">{sub.odometer || "-"}</strong></span>
                  <div className="flex items-center gap-2">
                    {sub.details?.editHistory && sub.details.editHistory.length > 0 && (
                      <button onClick={() => setHistorySub(sub)} className="p-1.5 text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="Ver Histórico"><History size={14}/></button>
                    )}
                    <button onClick={() => handleEditClick(sub)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 size={14}/></button>
                  </div>
                </div>
              </div>`;
content = content.replace(mobileCardTarget, mobileCardReplacement);

// Add desktop edit button
const desktopRowTarget = `                        )}
                      </div>
                    </td>
                  </tr>`;
const desktopRowReplacement = `                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {sub.details?.editHistory && sub.details.editHistory.length > 0 && (
                          <button onClick={() => setHistorySub(sub)} className="p-1.5 text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="Ver Histórico (Antes/Depois)"><History size={16}/></button>
                        )}
                        <button onClick={() => handleEditClick(sub)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Editar"><Edit2 size={16}/></button>
                      </div>
                    </td>
                  </tr>`;
content = content.replace(desktopRowTarget, desktopRowReplacement);

fs.writeFileSync(file, content);
console.log("Successfully updated FuelTab.tsx");
