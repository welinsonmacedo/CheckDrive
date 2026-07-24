import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import AddressFromCoordinates from "@/src/components/common/AddressFromCoordinates";
import { Edit2, Save, X, History, Clock, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export default function FuelTab() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [historySub, setHistorySub] = useState<any>(null);

  const [filterPlate, setFilterPlate] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const plate = sub.vehicles?.plate || "";
      const driver = sub.profiles?.full_name || sub.driver_profiles?.full_name || "";
      const date = new Date(sub.created_at);
      
      const matchesPlate = plate.toLowerCase().includes(filterPlate.toLowerCase());
      const matchesDriver = driver.toLowerCase().includes(filterDriver.toLowerCase());
      
      let matchesStart = true;
      let matchesEnd = true;
      if (filterStartDate) {
        const start = new Date(filterStartDate + 'T00:00:00');
        matchesStart = date >= start;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate + 'T23:59:59');
        matchesEnd = date <= end;
      }

      return matchesPlate && matchesDriver && matchesStart && matchesEnd;
    });
  }, [submissions, filterPlate, filterDriver, filterStartDate, filterEndDate]);


  useEffect(() => {
    fetchFuelSubmissions();
  }, []);

  const fetchFuelSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("checklist_submissions").select("*, profiles(full_name), vehicles(plate)")
        .eq("company_id", user?.company_id)
        .in("type", ["fuel", "Abastecimento"])
        .order("created_at", { ascending: false });
      setSubmissions(data || []);
    } catch (error) {
      console.error("Erro ao buscar abastecimentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (sub: any) => {
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
            changes[`item_${key}`] = { from: oldVal, to: newVal, title: editingSub.details.itemTitles?.[key] || 'Item' };
            newDetails.itemValues[key] = newVal;
          }
        });
      }

      if (Object.keys(changes).length > 0) {
        const historyEntry = {
          timestamp: new Date().toISOString(),
          user_id: user?.id,
          user_name: (user as any)?.full_name || (user as any)?.user_metadata?.full_name || user?.email || 'Usuário',
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
      {renderHistoryModal()}
      <div className="bento-card p-5 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-primary" />
            <span className="text-sm font-black text-text-main uppercase tracking-wider">Filtros</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Placa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={filterPlate}
                onChange={(e) => setFilterPlate(e.target.value)}
                placeholder="Buscar placa..."
                className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Motorista</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                placeholder="Buscar motorista..."
                className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data Início</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data Fim</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-xl text-xs font-medium text-text-main focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border flex justify-between items-center">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Histórico de Abastecimentos ({filteredSubmissions.length})
          </span>
        </div>
        
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {loading ? (
            <div className="text-center text-xs text-text-muted italic py-10">Carregando...</div>
          ) : filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((sub: any) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-app-border flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">{new Date(sub.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{sub.vehicles?.plate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-black text-text-main">{sub.profiles?.full_name || "Desconhecido"}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-text-muted">KM: <strong className="text-text-main font-bold">{sub.odometer || "-"}</strong></span>
                  <div className="flex items-center gap-2">
                    {sub.details?.editHistory && sub.details.editHistory.length > 0 && (
                      <button onClick={() => setHistorySub(sub)} className="p-1.5 text-indigo-500 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="Ver Histórico"><History size={14}/></button>
                    )}
                    <button onClick={() => handleEditClick(sub)} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-text-muted italic py-10">Nenhum abastecimento encontrado.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-app-bg/50">
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Data
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Motorista
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Veículo
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  KM
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Detalhes
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest w-10">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-text-main">
                      {sub.profiles?.full_name || sub.driver_profiles?.full_name || "N/I"}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-bold text-text-main">
                      {sub.vehicles?.plate}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono font-bold text-text-main">
                      {sub.odometer
                        ? `${sub.odometer.toLocaleString("pt-BR")} km`
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="flex flex-wrap gap-3">
                        {sub.details?.itemValues &&
                        Object.keys(sub.details.itemValues).length > 0 ? (
                          Object.keys(sub.details.itemValues).map((itemId) => {
                            const title =
                              sub.details.itemTitles?.[itemId] || "Item";
                            const value = sub.details.itemValues[itemId];
                            if (!value) return null;

                            // Legacy data check: if they hit 'defect' instead of typing numbers
                            const displayValue =
                              value === "defect" ? "N/A" : value;

                            return (
                              <div
                                key={itemId}
                                className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px]"
                              >
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  {title}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {displayValue}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <>
                            {sub.details?.manual_liters !== undefined && (
                              <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px]">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  Litragem
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {sub.details.manual_liters} L
                                </span>
                              </div>
                            )}
                            {(sub.latitude && sub.longitude) ||
                            sub.details?.location ? (
                              <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px] max-w-[200px]">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  Posto/Local
                                </span>
                                <span className="text-sm font-bold text-primary truncate">
                                  <AddressFromCoordinates
                                    latitude={sub.latitude}
                                    longitude={sub.longitude}
                                    fallback={sub.details?.location}
                                  />
                                </span>
                              </div>
                            ) : null}
                            {!sub.details?.manual_liters &&
                              !sub.details?.location &&
                              !sub.latitude && (
                                <span className="text-[10px] text-text-muted italic">
                                  Sem detalhes
                                </span>
                              )}
                          </>
                        )}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Nenhum abastecimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div></div></div>);
}
