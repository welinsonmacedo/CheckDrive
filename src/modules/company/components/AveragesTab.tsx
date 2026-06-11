import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { Save, Edit2, X, AlertCircle, Filter, CheckCircle2, Clock, Printer } from 'lucide-react';

export default function AveragesTab() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'schedules' | 'edit'>('vehicles');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fuelLiterItems, setFuelLiterItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Extra filters
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

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
    let hasAdjustment = false;

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

    if (details?.adjusted_liters !== undefined && details?.adjusted_liters !== null && details.adjusted_liters !== '') {
      liters = parseFloat(details.adjusted_liters.toString().replace(',', '.'));
      hasAdjustment = true;
    }

    return { liters, litersId, hasAdjustment };
  };

  // Process data to calculate distances and averages
  const processData = () => {
    const byVehicle: Record<string, any[]> = {};
    const scheduleFuelMap: Record<string, any> = {};
    
    // Group by vehicle and sort by created_at (already sorted from DB)
    // Only fuel submissions matter for the interval loop
    const mappedSubmissions = submissions.map(sub => ({
      ...sub,
      created_at: sub.details?.adjusted_date || sub.created_at,
      odometer: sub.details?.adjusted_odometer !== undefined && sub.details?.adjusted_odometer !== null 
        ? parseInt(sub.details.adjusted_odometer, 10) 
        : sub.odometer
    }));

    mappedSubmissions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const fuelSubmissions = mappedSubmissions.filter(s => s.type === 'fuel');

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
              scheduleFuelMap[s.id] = sub;
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
            average: avg,
            intervalScheds: lastFuelSub ? schedules.filter(s => 
              s.vehicle_id === sub.vehicles?.id && 
              new Date(s.created_at) >= new Date(lastFuelSub.created_at) &&
              new Date(s.created_at) <= new Date(sub.created_at)
            ) : []
          });

          lastFuelSub = sub;
        }
      });
    });

    // Re-sort enriched by created_at DESC for display
    enrichedSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { list: enrichedSubmissions, map: scheduleFuelMap };
  };

  const processed = useMemo(() => processData(), [submissions, schedules, fuelLiterItems]);
  const enrichedData = processed.list;
  const scheduleFuelMap = processed.map;

  const passesFilters = (itemDate: string, vehicleId?: string, driverId?: string) => {
    if (startDate || endDate) {
      const d = new Date(itemDate);
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
    }
    
    if (filterVehicle && vehicleId !== filterVehicle) return false;
    if (filterDriver && driverId !== filterDriver) return false;
    
    return true;
  };

  const filteredEnrichedData = useMemo(() => {
    return enrichedData.filter(d => passesFilters(d.created_at, d.vehicles?.id, d.profiles?.id));
  }, [enrichedData, startDate, endDate, filterVehicle, filterDriver]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => passesFilters(s.start_at || s.created_at, s.vehicle_id, s.driver_id));
  }, [schedules, startDate, endDate, filterVehicle, filterDriver]);

  const uniqueVehicles = useMemo(() => {
    const vMap = new Map();
    submissions.forEach(s => { if (s.vehicles) vMap.set(s.vehicles.id, s.vehicles.plate); });
    schedules.forEach(s => { if (s.vehicles) vMap.set(s.vehicles.id, s.vehicles.plate); });
    return Array.from(vMap.entries()).map(([id, plate]) => ({ id, plate })).sort((a,b) => a.plate.localeCompare(b.plate));
  }, [submissions, schedules]);

  const uniqueDrivers = useMemo(() => {
    const dMap = new Map();
    submissions.forEach(s => { if (s.profiles) dMap.set(s.profiles.id, s.profiles.full_name); });
    schedules.forEach(s => { if (s.profiles) dMap.set(s.profiles.id, s.profiles.full_name); });
    return Array.from(dMap.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [submissions, schedules]);

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
    const acc: any = {};
    
    filteredEnrichedData
      .filter((sub: any) => sub.details?.average_status === 'reviewed')
      .forEach((sub: any) => {
        const scheds = sub.intervalScheds || [];
        if (scheds.length === 0) {
            const pId = sub.profiles?.id;
            const pName = sub.profiles?.full_name;
            if (pId && pName) {
                if (!acc[pId]) acc[pId] = { name: pName, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
                acc[pId].distance += Math.max(0, sub.scaleDistance || 0);
                acc[pId].scaleDistance += Math.max(0, sub.scaleDistance || 0);
                acc[pId].offScaleDistance += Math.max(0, sub.offScaleDistance || 0);
                acc[pId].liters += Math.max(0, sub.liters || 0);
            }
            return;
        }

        const totalScaleDist = Math.max(sub.scaleDistance, 1);

        scheds.forEach((s: any) => {
            const pId = s.driver_id || s.profiles?.id;
            const pName = s.profiles?.full_name;
            if (!pId || !pName) return;

            const startOdo = s.start_checklist?.odometer || 0;
            const endOdo = s.end_checklist?.odometer || 0;
            let sDist = 0;
            if (endOdo > startOdo) sDist = endOdo - startOdo;

            if (sDist === 0) return; // ignore schedules with 0 distance in distribution

            const ratio = sDist / totalScaleDist;
            const sLiters = sub.liters * ratio;

            if (!acc[pId]) acc[pId] = { name: pName, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
            
            acc[pId].distance += sDist;
            acc[pId].scaleDistance += sDist;
            acc[pId].liters += sLiters;
        });
      });
      
    return acc;
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
      const subToUpdate = scheduleFuelMap[editingId];
      if (!subToUpdate) return;
      const fuelSubId = subToUpdate.id;
      
      const newDetails = { ...subToUpdate.details };
      // Instead of changing itemValues, we set adjusted_liters
      if (editData.liters !== '') {
        newDetails.adjusted_liters = editData.liters.toString().replace(',', '.');
      } else {
        newDetails.adjusted_liters = null; // reset to original
      }
      
      if (editData.odometer !== '') {
        newDetails.adjusted_odometer = editData.odometer.toString();
      } else {
        newDetails.adjusted_odometer = null;
      }
      
      if (editData.date !== '') {
        newDetails.adjusted_date = new Date(editData.date).toISOString();
      } else {
        newDetails.adjusted_date = null;
      }

      const { error } = await supabase.from('checklist_submissions')
        .update({
          details: newDetails
        })
        .eq('id', fuelSubId);

      if (error) throw error;
      
      alert('Abastecimento atualizado com sucesso!');
      setEditingId(null);
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar', error);
      alert('Erro ao atualizar abastecimento.');
    }
  };

  const startEditing = (s: any) => {
    // s is now a schedule
    const sub = scheduleFuelMap[s.id];
    if (!sub) return;

    setEditingId(s.id); // track editing by schedule 'id'
    let dDate = new Date(sub.details?.adjusted_date || sub.created_at);
    dDate.setMinutes(dDate.getMinutes() - dDate.getTimezoneOffset());
    
    const { liters, litersId } = getLitersInfo(sub.details);
    
    setEditData({
      odometer: sub.details?.adjusted_odometer !== undefined && sub.details?.adjusted_odometer !== null 
        ? sub.details.adjusted_odometer.toString() 
        : sub.odometer?.toString() || '',
      liters: liters > 0 ? liters.toString() : '',
      litersId: litersId,
      date: dDate.toISOString().slice(0, 16)
    });
  };

  const tabs = [
    { id: 'vehicles', label: 'Médias por Veículo' },
    { id: 'drivers', label: 'Médias por Motorista' },
    { id: 'schedules', label: 'Médias por Escala (C/ Revisão)' }
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

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-zinc-500 ml-1">Veículo</span>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono max-w-[150px]"
            >
              <option value="">Todos</option>
              {uniqueVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-zinc-500 ml-1">Motorista</span>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary max-w-[150px]"
            >
              <option value="">Todos</option>
              {uniqueDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
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
          {(startDate || endDate || filterVehicle || filterDriver) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setFilterVehicle(''); setFilterDriver(''); }}
              className="mt-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Limpar Filtros"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="mt-4 p-2 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors print:hidden"
            title="Imprimir"
          >
            <Printer size={16} />
          </button>
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text-main">Média de Consumo (Por Escala)</h3>
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500"/>
                Edite litros abastecidos sem alterar o check-list original do motorista.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4">Início da Escala</th>
                    <th className="py-3 px-4">Veículo</th>
                    <th className="py-3 px-4">Motorista Escala</th>
                    <th className="py-3 px-4 bg-app-bg border-l border-r border-app-border">Info Abastecimento</th>
                    <th className="py-3 px-4">Km Escala</th>
                    <th className="py-3 px-4">Km Acum.</th>
                    <th className="py-3 px-4 border-r border-app-border">Litros</th>
                    <th className="py-3 px-4 text-primary">Média</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma escala encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : filteredSchedules.map((s: any) => {
                    const startOdo = s.start_checklist?.odometer || 0;
                    const endOdo = s.end_checklist?.odometer || 0;
                    const scheduleDistance = endOdo > startOdo ? endOdo - startOdo : 0;
                    
                    let liters = 0;
                    let hasAdjustment = false;
                    let accumulatedDistance = 0;
                    let avg = '-';
                    let fuelSub: any = null;
                    const mappedFuelSub = scheduleFuelMap[s.id];

                    if (mappedFuelSub) {
                       const { liters: L, hasAdjustment: hasAdj } = getLitersInfo(mappedFuelSub.details);
                       liters = L;
                       hasAdjustment = hasAdj;
                       // Find global processed data for this fuel submission
                       const globalSub = enrichedData.find(e => e.id === mappedFuelSub.id);
                       fuelSub = mappedFuelSub;
                       
                       if (globalSub) {
                         accumulatedDistance = globalSub.distance || 0;
                         if (hasAdjustment && scheduleDistance > 0 && liters > 0) {
                           avg = (scheduleDistance / liters).toFixed(2);
                         } else if (accumulatedDistance > 0 && liters > 0) {
                           avg = (accumulatedDistance / liters).toFixed(2);
                         } else if (scheduleDistance > 0 && liters > 0) {
                           avg = (scheduleDistance / liters).toFixed(2);
                         } else if (globalSub.average > 0) {
                           avg = globalSub.average.toFixed(2);
                         }
                       }
                    }

                    return (
                      <tr key={s.id} className={editingId === s.id ? 'bg-blue-50/30' : ''}>
                        <td className="py-3 px-4 font-mono text-sm text-text-main align-middle">
                          {editingId === s.id ? (
                            <input 
                              type="datetime-local" 
                              className="bg-white border border-zinc-300 rounded px-2 py-1 text-xs"
                              value={editData.date}
                              onChange={(e) => setEditData({...editData, date: e.target.value})}
                            />
                          ) : (
                            new Date(s.start_at || s.created_at).toLocaleString('pt-BR')
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main">{s.vehicles?.plate || '-'}</td>
                        <td className="py-3 px-4 font-bold text-sm text-text-main">{s.profiles?.full_name?.split(' ')[0] || '-'}</td>
                        
                        <td className="py-3 px-4 bg-app-bg/30 border-l border-r border-app-border">
                          {fuelSub ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono text-text-main">
                                {new Date(fuelSub.created_at).toLocaleString('pt-BR')}
                              </span>
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                Por: <span className="text-primary">{fuelSub.profiles?.full_name?.split(' ')[0] || '-'}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-sm">
                          {editingId === s.id ? ( // for layout consistency, only edit odometer on fuel_sub? Actually odometer we might just want to edit fuel odometer not schedule
                            scheduleDistance > 0 ? `${scheduleDistance.toLocaleString('pt-BR')} km` : '-'
                          ) : (
                            scheduleDistance > 0 ? `${scheduleDistance.toLocaleString('pt-BR')} km` : '-'
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-sm text-amber-600 font-medium">
                          {editingId === s.id ? (
                            <input 
                              type="number" 
                              className="w-24 bg-white border border-zinc-300 rounded px-2 py-1 text-xs text-text-main"
                              value={editData.odometer}
                              onChange={(e) => setEditData({...editData, odometer: e.target.value})}
                              placeholder="Odo Abast."
                              title="Hodômetro do abastecimento"
                            />
                          ) : (
                            accumulatedDistance > 0 ? `${accumulatedDistance.toLocaleString('pt-BR')} km` : '-'
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-sm relative border-r border-app-border">
                           {editingId === s.id && mappedFuelSub ? (
                             <input 
                               type="number" 
                               step="0.01"
                               className="w-20 bg-white border border-zinc-300 rounded px-2 py-1 text-xs"
                               value={editData.liters}
                               onChange={(e) => setEditData({...editData, liters: e.target.value})}
                               placeholder="Lt."
                             />
                           ) : (
                             <span className="flex items-center gap-1">
                               {liters > 0 ? `${liters.toFixed(2)} L` : '-'}
                               {hasAdjustment && <span className="text-[10px] text-amber-500 font-black" title="Litros ajustados manualmente">*</span>}
                             </span>
                           )}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500 font-normal">Km/L</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {mappedFuelSub && (
                            <button
                              onClick={() => toggleReviewStatus(mappedFuelSub)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                                mappedFuelSub.details?.average_status === 'reviewed' 
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              }`}
                            >
                              {mappedFuelSub.details?.average_status === 'reviewed' ? (
                                <><CheckCircle2 size={12} /> Revisado</>
                              ) : (
                                <><Clock size={12} /> Aguardando</>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {mappedFuelSub && (
                            editingId === s.id ? (
                              <div className="flex gap-2">
                                <button onClick={handleSaveEdit} className="p-1.5 bg-primary text-white rounded hover:bg-primary-hover" title="Salvar"><Save size={14}/></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300" title="Cancelar"><X size={14}/></button>
                              </div>
                            ) : (
                              <button onClick={() => startEditing(s)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200" title="Ajustar Abastecimento">
                                <Edit2 size={14}/>
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
