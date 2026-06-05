import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Save, Edit2, X, AlertCircle, Filter, CheckCircle2, Clock } from 'lucide-react';

export default function AveragesTab() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'schedules' | 'edit'>('vehicles');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fuelLiterItems, setFuelLiterItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ odometer: string; liters: string; litersId: string | null; date: string }>({ odometer: '', liters: '', litersId: null, date: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, schedsRes, itemsRes] = await Promise.all([
        supabase.from('checklist_submissions')
          .select(`
            id, 
            created_at, 
            odometer, 
            details, 
            type,
            vehicles(id, plate), 
            profiles(id, full_name)
          `)
          .order('created_at', { ascending: true }),
        supabase.from('schedules')
          .select(`
            id,
            vehicle_id,
            driver_id,
            created_at,
            start_at,
            end_at,
            start_checklist:checklist_submissions!start_checklist_id(id, odometer),
            end_checklist:checklist_submissions!end_checklist_id(id, odometer),
            fuel_checklist:checklist_submissions!fuel_checklist_id(id, details),
            vehicles(id, plate),
            profiles(id, full_name)
          `)
          .order('created_at', { ascending: true }),
        supabase.from('checklist_items')
          .select('id, title, input_type')
      ]);
        
      if (subsRes.error) throw subsRes.error;
      if (schedsRes.error) throw schedsRes.error;
      
      setSubmissions(subsRes.data || []);
      setSchedules(schedsRes.data || []);
      setFuelLiterItems((itemsRes.data || []).filter(i => i.input_type === 'fuel_liters'));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLitersInfo = (details: any) => {
    let liters = 0;
    let litersId = null;
    if (details?.itemTitles && details?.itemValues) {
      let entry = null;

      // Try matching by checking if any key in details maps to our known fuel liters items
      if (fuelLiterItems && fuelLiterItems.length > 0) {
        const literItemIds = fuelLiterItems.map(item => item.id);
        const match = Object.entries(details.itemTitles).find(([id, _]: any) => literItemIds.includes(id));
        if (match) {
          entry = match;
        }
      }

      // Fallback matching
      if (!entry) {
        entry = Object.entries(details.itemTitles).find(([_, title]: any) => {
          const t = title.toLowerCase();
          return t.includes('litro') || t.includes('quantidade') || t.includes('valor') || t.includes('lts') || 
                 (fuelLiterItems && fuelLiterItems.some(f => f.title && title.includes(f.title.split('::')[0])));
        });
      }

      if (entry) {
        litersId = entry[0];
        liters = parseFloat(details.itemValues[entry[0]]?.toString().replace(',','.') || '0');
      }
    }
    return { liters, litersId };
  };

  // Process data to calculate distances and averages
  const processData = () => {
    const byVehicle: Record<string, any[]> = {};
    
    // Group by vehicle and sort by created_at (already sorted from DB)
    // Only fuel submissions matter for the interval loop
    const fuelSubmissions = submissions.filter(s => s.type === 'fuel');

    fuelSubmissions.forEach(sub => {
      const vId = sub.vehicles?.id;
      if (!vId) return;
      if (!byVehicle[vId]) byVehicle[vId] = [];
      byVehicle[vId].push({ ...sub });
    });

    const enrichedSubmissions: any[] = [];

    // Calculate distance and average
    Object.values(byVehicle).forEach(vehicleSubs => {
      let lastFuelSub: any = null;

      vehicleSubs.forEach((sub) => {
        const { liters, litersId } = getLitersInfo(sub.details);
        
        if (liters > 0) {
          let distance = 0;
          let avg = 0;
          let scaleDistance = 0;
          let offScaleDistance = 0;
          
          if (lastFuelSub) {
            distance = (sub.odometer || 0) - (lastFuelSub.odometer || 0);
            
            if (distance > 0) {
              avg = distance / liters;
            }

            // Calculate schedule distances in this interval
            const intervalScheds = schedules.filter(s => 
              s.vehicle_id === sub.vehicles?.id && 
              new Date(s.created_at) >= new Date(lastFuelSub.created_at) &&
              new Date(s.created_at) <= new Date(sub.created_at)
            );

            intervalScheds.forEach(s => {
              const startOdo = s.start_checklist?.odometer || 0;
              const endOdo = s.end_checklist?.odometer || 0;
              if (endOdo > startOdo) {
                scaleDistance += (endOdo - startOdo);
              }
            });

            // Off-scale is simply whatever is left over
            offScaleDistance = Math.max(0, distance - scaleDistance);
          }

          enrichedSubmissions.push({
            ...sub,
            liters,
            litersId,
            distance,
            scaleDistance,
            offScaleDistance,
            average: avg
          });

          lastFuelSub = sub;
        }
      });
    });

    // Re-sort enriched by created_at DESC for display
    enrichedSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return enrichedSubmissions;
  };

  const enrichedData = useMemo(() => processData(), [submissions, schedules, fuelLiterItems]);

  const passesDateFilter = (dateString: string) => {
    if (!startDate && !endDate) return true;
    const d = new Date(dateString);
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0,0,0,0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59,999);
      if (d > e) return false;
    }
    return true;
  };

  const filteredEnrichedData = useMemo(() => {
    return enrichedData.filter(d => passesDateFilter(d.created_at));
  }, [enrichedData, startDate, endDate]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => passesDateFilter(s.start_at || s.created_at));
  }, [schedules, startDate, endDate]);

  // Aggregated data for vehicles
  const vehicleAverages = useMemo(() => {
    return filteredEnrichedData.reduce((acc: any, sub: any) => {
      const vId = sub.vehicles?.id;
      if (!vId || !sub.vehicles?.plate) return acc;
      if (!acc[vId]) acc[vId] = { plate: sub.vehicles.plate, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      acc[vId].distance += Math.max(0, sub.distance || 0);
      acc[vId].scaleDistance += Math.max(0, sub.scaleDistance || 0);
      acc[vId].offScaleDistance += Math.max(0, sub.offScaleDistance || 0);
      acc[vId].liters += Math.max(0, sub.liters || 0);
      return acc;
    }, {});
  }, [filteredEnrichedData]);

  // Aggregated data for drivers
  const driverAverages = useMemo(() => {
    return filteredEnrichedData.reduce((acc: any, sub: any) => {
      const pId = sub.profiles?.id;
      if (!pId || !sub.profiles?.full_name) return acc;
      if (!acc[pId]) acc[pId] = { name: sub.profiles.full_name, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      acc[pId].distance += Math.max(0, sub.distance || 0);
      acc[pId].scaleDistance += Math.max(0, sub.scaleDistance || 0);
      acc[pId].offScaleDistance += Math.max(0, sub.offScaleDistance || 0);
      acc[pId].liters += Math.max(0, sub.liters || 0);
      return acc;
    }, {});
  }, [filteredEnrichedData]);

  const toggleReviewStatus = async (sub: any) => {
    try {
      const newDetails = { ...sub.details };
      const newStatus = newDetails.average_status === 'reviewed' ? 'pending' : 'reviewed';
      newDetails.average_status = newStatus;
      
      const { error } = await supabase.from('checklist_submissions')
        .update({ details: newDetails })
        .eq('id', sub.id);
        
      if (!error) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const subToUpdate = submissions.find(s => s.id === editingId);
      if (!subToUpdate) return;
      
      const newDetails = { ...subToUpdate.details };
      if (editData.litersId && newDetails.itemValues) {
        newDetails.itemValues[editData.litersId] = editData.liters.toString();
      }

      const { error } = await supabase.from('checklist_submissions')
        .update({
          odometer: parseInt(editData.odometer, 10) || 0,
          details: newDetails,
          created_at: new Date(editData.date).toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      alert('Abastecimento atualizado com sucesso!');
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar', error);
      alert('Erro ao atualizar abastecimento.');
    }
  };

  const startEditing = (sub: any) => {
    setEditingId(sub.id);
    let dDate = new Date(sub.created_at);
    dDate.setMinutes(dDate.getMinutes() - dDate.getTimezoneOffset());
    
    setEditData({
      odometer: sub.odometer?.toString() || '',
      liters: sub.liters?.toString() || '',
      litersId: sub.litersId,
      date: dDate.toISOString().slice(0, 16)
    });
  };

  const tabs = [
    { id: 'vehicles', label: 'Médias por Veículo' },
    { id: 'drivers', label: 'Médias por Motorista' },
    { id: 'schedules', label: 'Médias por Escala' },
    { id: 'edit', label: 'Gestão de Abastecimentos' }
  ];

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Carregando médias...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros em uma barra branca estilizada */}
      <div className="bg-white p-4 rounded-3xl border border-app-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 mb-2 md:mb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 bg-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-zinc-500 ml-1">Data Início</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-zinc-500 ml-1">Data Fim</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="mt-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Limpar Filtros"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        {activeTab === 'vehicles' && (
          <div className="p-6">
            <h3 className="text-xl font-black text-text-main mb-6">Média de Consumo (Por Veículo)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4 flex items-center gap-1"><Filter size={12}/> Veículo (Placa)</th>
                    <th className="py-3 px-4">Km Total</th>
                    <th className="py-3 px-4 text-indigo-600">Km Escala</th>
                    <th className="py-3 px-4 text-purple-600">Km Fora Escala</th>
                    <th className="py-3 px-4">Litros Abastecidos</th>
                    <th className="py-3 px-4 text-primary">Média (Km/L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {Object.values(vehicleAverages).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma média encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : Object.values(vehicleAverages).map((v: any) => {
                    const avg = v.liters > 0 ? (v.distance / v.liters).toFixed(2) : '-';
                    return (
                      <tr key={v.plate}>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main">{v.plate}</td>
                        <td className="py-3 px-4 font-mono text-sm">{v.distance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm text-indigo-600">{v.scaleDistance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm text-purple-600">{v.offScaleDistance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm">{v.liters.toFixed(2)} L</td>
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm flex items-center gap-1">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500">Km/L</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="p-6">
            <h3 className="text-xl font-black text-text-main mb-6">Média de Consumo (Por Motorista)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4 flex items-center gap-1"><Filter size={12}/> Motorista</th>
                    <th className="py-3 px-4">Km Total (Estimado)</th>
                    <th className="py-3 px-4 text-indigo-600">Km Escala</th>
                    <th className="py-3 px-4 text-purple-600">Km Fora Escala</th>
                    <th className="py-3 px-4">Litros Abastecidos</th>
                    <th className="py-3 px-4 text-primary">Média (Km/L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {Object.values(driverAverages).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma média encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : Object.values(driverAverages).map((d: any) => {
                    const avg = d.liters > 0 ? (d.distance / d.liters).toFixed(2) : '-';
                    return (
                      <tr key={d.name}>
                        <td className="py-3 px-4 font-bold text-sm text-text-main">{d.name}</td>
                        <td className="py-3 px-4 font-mono text-sm">{d.distance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm text-indigo-600">{d.scaleDistance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm text-purple-600">{d.offScaleDistance.toLocaleString('pt-BR')} km</td>
                        <td className="py-3 px-4 font-mono text-sm">{d.liters.toFixed(2)} L</td>
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm flex items-center gap-1">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500">Km/L</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="p-6">
            <h3 className="text-xl font-black text-text-main mb-6">Média de Consumo (Por Escala)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4">Início da Escala</th>
                    <th className="py-3 px-4">Veículo</th>
                    <th className="py-3 px-4">Motorista</th>
                    <th className="py-3 px-4">Km Escala</th>
                    <th className="py-3 px-4">Km Acumulado</th>
                    <th className="py-3 px-4">Litros</th>
                    <th className="py-3 px-4 text-primary">Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma escala encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : filteredSchedules.map((s: any) => {
                    const startOdo = s.start_checklist?.odometer || 0;
                    const endOdo = s.end_checklist?.odometer || 0;
                    const scheduleDistance = endOdo > startOdo ? endOdo - startOdo : 0;
                    
                    let liters = 0;
                    let accumulatedDistance = 0;
                    let avg = '-';

                    if (s.fuel_checklist) {
                       const { liters: L } = getLitersInfo(s.fuel_checklist.details);
                       liters = L;
                       // Find global processed data for this fuel submission
                       const globalSub = enrichedData.find(e => e.id === s.fuel_checklist.id);
                       if (globalSub) {
                         accumulatedDistance = globalSub.distance || 0;
                         if (globalSub.average > 0) {
                           avg = globalSub.average.toFixed(2);
                         }
                       }
                    }

                    return (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono text-sm text-text-main">
                          {new Date(s.start_at || s.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main">{s.vehicles?.plate || '-'}</td>
                        <td className="py-3 px-4 font-bold text-sm text-text-main">{s.profiles?.full_name?.split(' ')[0] || '-'}</td>
                        <td className="py-3 px-4 font-mono text-sm">{scheduleDistance > 0 ? `${scheduleDistance.toLocaleString('pt-BR')} km` : '-'}</td>
                        <td className="py-3 px-4 font-mono text-sm text-amber-600 font-medium">{accumulatedDistance > 0 ? `${accumulatedDistance.toLocaleString('pt-BR')} km` : '-'}</td>
                        <td className="py-3 px-4 font-mono text-sm">{liters > 0 ? `${liters.toFixed(2)} L` : '-'}</td>
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500 font-normal">Km/L</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="p-6">
            <h3 className="text-xl font-black text-text-main mb-4">Gestão de Abastecimentos</h3>
            <p className="text-xs text-zinc-500 mb-6 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500"/>
              Edite as linhas de abastecimento para ajustar as margens de cálculo das médias (limitado ao filtro).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Veículo</th>
                    <th className="py-3 px-4">Motorista</th>
                    <th className="py-3 px-4">Hodômetro</th>
                    <th className="py-3 px-4">Litros Info</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredEnrichedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                        Nenhum abastecimento encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : filteredEnrichedData.map((sub: any) => (
                    <tr key={sub.id} className={editingId === sub.id ? 'bg-blue-50/30' : ''}>
                      <td className="py-3 px-4 text-xs font-mono text-text-main align-middle">
                        {editingId === sub.id ? (
                          <input 
                            type="datetime-local" 
                            className="bg-white border border-zinc-300 rounded px-2 py-1 text-xs"
                            value={editData.date}
                            onChange={(e) => setEditData({...editData, date: e.target.value})}
                          />
                        ) : (
                          new Date(sub.created_at).toLocaleString('pt-BR')
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-text-main">{sub.vehicles?.plate}</td>
                      <td className="py-3 px-4 font-bold text-xs text-text-main">{sub.profiles?.full_name?.split(' ')[0]}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                         {editingId === sub.id ? (
                           <input 
                             type="number" 
                             className="w-24 bg-white border border-zinc-300 rounded px-2 py-1"
                             value={editData.odometer}
                             onChange={(e) => setEditData({...editData, odometer: e.target.value})}
                           />
                         ) : (
                           sub.odometer ? `${sub.odometer} km` : '-'
                         )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                         {editingId === sub.id && sub.litersId ? (
                           <input 
                             type="number" 
                             step="0.01"
                             className="w-20 bg-white border border-zinc-300 rounded px-2 py-1"
                             value={editData.liters}
                             onChange={(e) => setEditData({...editData, liters: e.target.value})}
                           />
                         ) : (
                           sub.liters > 0 ? `${sub.liters} L` : '-'
                         )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleReviewStatus(sub)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                            sub.details?.average_status === 'reviewed' 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {sub.details?.average_status === 'reviewed' ? (
                            <><CheckCircle2 size={12} /> Revisado</>
                          ) : (
                            <><Clock size={12} /> Aguardando</>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {editingId === sub.id ? (
                          <div className="flex gap-2">
                            <button onClick={handleSaveEdit} className="p-1.5 bg-primary text-white rounded hover:bg-primary-hover"><Save size={14}/></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300"><X size={14}/></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(sub)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200" title="Editar Abastecimento"><Edit2 size={14}/></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
