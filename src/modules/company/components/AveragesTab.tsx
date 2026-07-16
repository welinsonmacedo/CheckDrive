import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { motion } from 'motion/react';
import { Save, Edit2, X, AlertCircle, Filter, CheckCircle2, Clock, Printer, Plus, PlusCircle, Trash2, Droplet, Camera, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList } from 'recharts';
import { usePersistentState } from '@/src/hooks/usePersistentState';
import PrintHeader from './PrintHeader';

export default function AveragesTab() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = usePersistentState<'vehicles' | 'drivers' | 'schedules' | 'charts'>('averages_activeTab', 'vehicles');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fuelLiterItems, setFuelLiterItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicleAveragesData, setVehicleAveragesData] = useState<any[]>([]);
  const [tableError, setTableError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');
  const [syncDriverId, setSyncDriverId] = useState('');
  
  // Date filters
  const [startDate, setStartDate] = usePersistentState('averages_startDate', '');
  const [endDate, setEndDate] = usePersistentState('averages_endDate', '');
  
  // Extra filters
  const [filterVehicle, setFilterVehicle] = usePersistentState('averages_filterVehicle', '');
  const [filterDriver, setFilterDriver] = usePersistentState('averages_filterDriver', '');

  // Add scale for media modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    start_at: '',
    end_at: '',
    start_odometer: '',
    end_odometer: '',
    fuelSelectId: 'manual',
    routeSelectId: '',
    liters: '',
    litersOdometer: '',
    litersDate: ''
  });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    odometer: string;
    liters: string;
    litersId: string | null;
    date: string;
    fuelSelectId: string;
    routeSelectId: string;
    driver_id: string;
    vehicle_id: string;
    start_at: string;
    end_at: string;
    start_odometer: string;
    end_odometer: string;
  }>({
    odometer: '',
    liters: '',
    litersId: null,
    date: '',
    fuelSelectId: 'manual',
    routeSelectId: '',
    driver_id: '',
    vehicle_id: '',
    start_at: '',
    end_at: '',
    start_odometer: '',
    end_odometer: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setTableError(null);
    try {
      const [subsRes, schedsRes, routesRes, itemsRes, avgsRes] = await Promise.all([
        supabase.from('checklist_submissions').select(`
            id, 
            created_at, 
            odometer, 
            details, 
            type,
            vehicles(id, plate),
            profiles(id, full_name)
          `).eq("company_id", (user as any)?.company_id)
          .order('created_at', { ascending: true }),
        supabase.from('schedules').select(`
            id,
            vehicle_id,
            driver_id,
            fuel_checklist_id,
            created_at,
            start_at,
            end_at,
            start_checklist:checklist_submissions!start_checklist_id(id, odometer),
            end_checklist:checklist_submissions!end_checklist_id(id, odometer),
            fuel_checklist:checklist_submissions!fuel_checklist_id(id, details, created_at, odometer, vehicles(id, plate), profiles(id, full_name)),
            vehicles(id, plate),
            profiles(id, full_name),
            adjusted_start_odometer,
            adjusted_end_odometer,
            adjusted_liters,
            adjusted_fuel_date,
            adjusted_status
          `).eq("company_id", (user as any)?.company_id)
          .order('created_at', { ascending: true }),
        supabase.from('routes').select('id, origin, destination').eq('company_id', (user as any)?.company_id).eq('active', true),
        supabase.from('checklist_items')
          .select('id, title, input_type')
          .eq("company_id", (user as any)?.company_id),
        supabase.from('vehicle_averages')
          .select(`
            id,
            company_id,
            vehicle_id,
            driver_id,
            schedule_id,
            fuel_submission_id,
            start_date,
            end_date,
            start_odometer,
            end_odometer,
            distance,
            liters,
            average,
            status,
            notes,
            created_at,
            vehicles(id, plate),
            profiles(id, full_name),
            schedules(routes(origin, destination))
          `)
          .eq("company_id", (user as any)?.company_id)
          .order('start_date', { ascending: false })
      ]);
        
      if (subsRes.error) throw subsRes.error;
      if (schedsRes.error) throw schedsRes.error;
      
      setSubmissions(subsRes.data || []);
      setSchedules(schedsRes.data || []);
      setFuelLiterItems((itemsRes.data || []).filter(i => i.input_type === 'fuel_liters'));
      setRoutes(routesRes.data || []);
      setRoutes(routesRes.data || []);

      if (avgsRes.error) {
        if (avgsRes.error.code === '42P01') {
          setTableError('missing_table');
        } else {
          throw avgsRes.error;
        }
      } else {
        setVehicleAveragesData(avgsRes.data || []);
      }
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

    if (details?.itemValues) {
      let entry = null;

      if (fuelLiterItems && fuelLiterItems.length > 0) {
        const literItemIds = fuelLiterItems.map(item => item.id);
        const matchId = Object.keys(details.itemValues).find((id: string) => literItemIds.includes(id));
        if (matchId) {
          entry = [matchId, details.itemTitles?.[matchId] || 'Liters'];
        }
      }

      if (!entry && details?.itemTitles) {
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
    } else if (details?.manual_liters !== undefined && details?.manual_liters !== null) {
      liters = parseFloat(details.manual_liters.toString().replace(',','.'));
    }

    if (details?.adjusted_liters !== undefined && details?.adjusted_liters !== null && details.adjusted_liters !== '') {
      liters = parseFloat(details.adjusted_liters.toString().replace(',', '.'));
      hasAdjustment = true;
    }

    return { liters, litersId, hasAdjustment };
  };

  // Process data purely as a fallback/generator to synchronize history if needed
  const processData = () => {
    const list: any[] = [];
    const scheduleFuelMap: Record<string, any> = {};

    schedules.forEach(s => {
      const vId = s.vehicle_id || s.vehicles?.id;
      const dId = s.driver_id || s.profiles?.id;
      if (!vId || !dId) return;

      const startChecklistObj = s.start_checklist;
      
      let start_date_val = s.start_at || s.created_at;
      if (s.start_checklist_id) {
        const startSubObj = submissions.find(sub => sub.id === s.start_checklist_id);
        if (startSubObj) {
          start_date_val = startSubObj.details?.adjusted_date || startSubObj.created_at;
        }
      } else if (startChecklistObj) {
        start_date_val = startChecklistObj.created_at || start_date_val;
      }

      const subsequentFuels = submissions
        .filter(sub => {
          const isFuel = sub.type === 'fuel' || sub.type === 'Abastecimento';
          const isVehicleMatch = sub.vehicles?.id === vId;
          if (!isFuel || !isVehicleMatch) return false;
          
          const subDate = new Date(sub.details?.adjusted_date || sub.created_at);
          return subDate >= new Date(start_date_val);
        })
        .map(sub => ({
          ...sub,
          custom_date: new Date(sub.details?.adjusted_date || sub.created_at),
          custom_odometer: sub.details?.adjusted_odometer !== undefined && sub.details?.adjusted_odometer !== null
            ? parseInt(sub.details.adjusted_odometer, 10)
            : sub.odometer
        }))
        .sort((a, b) => a.custom_date.getTime() - b.custom_date.getTime());

      if (subsequentFuels.length >= 2) {
        const f1 = subsequentFuels[0];
        const f2 = subsequentFuels[1];

        const { liters, litersId } = getLitersInfo(f2.details);

        if (liters > 0) {
          const f1_odo = f1.custom_odometer || 0;
          const f2_odo = f2.custom_odometer || 0;
          let distance = f2_odo - f1_odo;
          if (distance < 0) distance = 0;

          if (distance === 0) {
            const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined
              ? s.adjusted_end_odometer
              : (s.end_checklist?.odometer || 0);
            const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined
              ? s.adjusted_start_odometer
              : (s.start_checklist?.odometer || 0);
            distance = endOdo - startOdo;
            if (distance < 0) distance = 0;
          }

          const avg = liters > 0 ? distance / liters : 0;

          list.push({
            id: f2.id,
            created_at: f2.custom_date.toISOString(),
            start_date: f1.custom_date.toISOString(),
            end_date: f2.custom_date.toISOString(),
            start_odometer: f1_odo,
            end_odometer: f2_odo,
            distance: distance,
            liters: liters,
            average: avg,
            status: f2.details?.average_status || 'reviewed',
            vehicles: s.vehicles,
            profiles: s.profiles,
            vehicle_id: vId,
            driver_id: f2.profiles?.id || dId,
            schedule_id: s.id,
            fuel_submission_id: f2.id,
            notes: `Calculado usando o 2º abastecimento posterior à escala #${s.id}`
          });

          scheduleFuelMap[s.id] = f2;
        }
      }
    });

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { list, map: scheduleFuelMap };
  };

  
  const handleOpenSyncModal = () => {
    setSyncStartDate(startDate || '');
    setSyncEndDate(endDate || '');
    setSyncDriverId(filterDriver || '');
    setShowSyncModal(true);
  };

  const confirmSyncHistory = async () => {
    setLoading(true);
    setShowSyncModal(false);
    try {
      const { list: rawList } = processData();
      
      const listMap = new Map();
      for (const item of rawList) {
         let include = true;
         const d = new Date(item.start_date || item.created_at);
         if (syncStartDate) {
           const s = new Date(syncStartDate);
           s.setHours(0,0,0,0);
           if (d < s) include = false;
         }
         if (syncEndDate) {
           const e = new Date(syncEndDate);
           e.setHours(23,59,59,999);
           if (d > e) include = false;
         }
         if (syncDriverId && item.driver_id !== syncDriverId) include = false;

         if (include) {
           const existing = listMap.get(item.fuel_submission_id);
           if (!existing || new Date(item.start_date) > new Date(existing.start_date)) {
              listMap.set(item.fuel_submission_id, item);
           }
         }
      }
      const list = Array.from(listMap.values());
      
      let insertedCount = 0;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profData } = await supabase.from('profiles').select('company_id').eq("company_id", (user as any)?.company_id).eq('id', currentUser?.id).single();
      const companyId = profData?.company_id || null;

      for (const item of list) {
        const alreadyExists = vehicleAveragesData.some(
          existing => 
            (existing.fuel_submission_id && existing.fuel_submission_id === item.fuel_submission_id) || 
            (existing.schedule_id && existing.schedule_id === item.schedule_id)
        );

        if (!alreadyExists) {

          const payload = {
            company_id: companyId,
            vehicle_id: item.vehicle_id,
            driver_id: item.driver_id,
            schedule_id: item.schedule_id,
            fuel_submission_id: item.fuel_submission_id,
            start_date: item.start_date,
            end_date: item.end_date,
            start_odometer: item.start_odometer,
            end_odometer: item.end_odometer,
            distance: item.distance,
            liters: item.liters,
            average: item.average,
            status: 'pending',
            notes: item.notes
          };

          if (payload.vehicle_id && payload.driver_id) {
            const { error: insErr } = await supabase.from('vehicle_averages').insert([payload]);
            if (!insErr) insertedCount++;
          }
        }
      }

      alert(`Sincronização concluída com sucesso! ${insertedCount} novas médias importadas.`);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro na sincronização: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const passesFilters = (createdAt: any, vehicleId: any, driverId: any) => {
    if (startDate || endDate) {
      const d = new Date(createdAt);
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

  const filteredVehicleAverages = useMemo(() => {
    return vehicleAveragesData.filter(row => 
      passesFilters(row.start_date || row.created_at, row.vehicle_id, row.driver_id)
    );
  }, [vehicleAveragesData, startDate, endDate, filterVehicle, filterDriver]);

  const uniqueVehicles = useMemo(() => {
    const vMap = new Map();
    submissions.forEach(s => { if (s.vehicles) vMap.set(s.vehicles.id, s.vehicles.plate); });
    schedules.forEach(s => { if (s.vehicles) vMap.set(s.vehicles.id, s.vehicles.plate); });
    vehicleAveragesData.forEach(s => { if (s.vehicles) vMap.set(s.vehicles.id, s.vehicles.plate); });
    return Array.from(vMap.entries()).map(([id, plate]) => ({ id, plate })).sort((a,b) => a.plate.localeCompare(b.plate));
  }, [submissions, schedules, vehicleAveragesData]);

  const uniqueDrivers = useMemo(() => {
    const dMap = new Map();
    schedules.forEach(s => { if (s.profiles) dMap.set(s.profiles.id, s.profiles.full_name); });
    vehicleAveragesData.forEach(s => { if (s.profiles) dMap.set(s.profiles.id, s.profiles.full_name); });
    return Array.from(dMap.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [schedules, vehicleAveragesData]);

  const vehicleAverages = useMemo(() => {
    const acc: Record<string, any> = {};

    vehicleAveragesData.forEach((row: any) => {
      if (row.status !== 'reviewed') return;
      if (!passesFilters(row.start_date || row.created_at, row.vehicle_id, row.driver_id)) return;

      const vId = row.vehicle_id;
      const plate = row.vehicles?.plate || 'Desconhecido';
      if (!vId) return;

      if (!acc[vId]) {
        acc[vId] = { plate, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      }
      
      acc[vId].distance += (row.distance || 0);
      acc[vId].scaleDistance += (row.distance || 0);
      acc[vId].liters += (row.liters || 0);
    });

    return acc;
  }, [vehicleAveragesData, startDate, endDate, filterVehicle, filterDriver]);

  const driverAverages = useMemo(() => {
    const acc: Record<string, any> = {};

    vehicleAveragesData.forEach((row: any) => {
      if (row.status !== 'reviewed') return;
      if (!passesFilters(row.start_date || row.created_at, row.vehicle_id, row.driver_id)) return;

      const pId = row.driver_id;
      const name = row.profiles?.full_name || 'Desconhecido';
      if (!pId) return;

      if (!acc[pId]) {
        acc[pId] = { name, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      }
      
      acc[pId].distance += (row.distance || 0);
      acc[pId].scaleDistance += (row.distance || 0);
      acc[pId].liters += (row.liters || 0);
    });

    return acc;
  }, [vehicleAveragesData, startDate, endDate, filterVehicle, filterDriver]);

  const toggleAverageReviewStatus = async (item: any) => {
    try {
      const newStatus = item.status === 'reviewed' ? 'pending' : 'reviewed';
      const { error } = await supabase.from('vehicle_averages')
        .update({ status: newStatus })
        .eq('id', item.id);
        
      if (!error) {
        fetchData();
      } else {
        throw error;
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao alterar status: ' + (err.message || err));
    }
  };

  const handleDeleteAverage = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta média permanentemente?')) return;
    try {
      const { error } = await supabase.from('vehicle_averages').delete().eq('id', id);
      if (error) throw error;

      alert('Média excluída com sucesso!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir média: ' + (err.message || err));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const startOdoNum = parseInt(editData.start_odometer, 10) || 0;
      const endOdoNum = parseInt(editData.end_odometer, 10) || 0;
      if (startOdoNum > endOdoNum) {
        alert('Erro: O hodômetro final não pode ser menor que o hodômetro inicial.');
        return;
      }

      const manualLitersNum = parseFloat(editData.liters.toString().replace(',', '.'));
      if (editData.liters && (isNaN(manualLitersNum) || manualLitersNum <= 0)) {
        alert('Erro: A quantidade de litros deve ser maior que zero.');
        return;
      }

      const distance = endOdoNum - startOdoNum;
      const average = manualLitersNum > 0 ? distance / manualLitersNum : 0;

      const { error } = await supabase.from('vehicle_averages')
        .update({
          driver_id: editData.driver_id || null,
          vehicle_id: editData.vehicle_id || null,
          start_date: new Date(editData.start_at).toISOString(),
          end_date: new Date(editData.end_at).toISOString(),
          start_odometer: startOdoNum,
          end_odometer: endOdoNum,
          distance: distance,
          liters: manualLitersNum || 0,
          average: average,
          status: 'reviewed',
          fuel_submission_id: editData.fuelSelectId !== 'manual' ? editData.fuelSelectId : null,
          notes: editData.routeSelectId ? `Rota: ${routes.find(r => r.id === editData.routeSelectId)?.origin}${routes.find(r => r.id === editData.routeSelectId)?.destination ? ' - ' + routes.find(r => r.id === editData.routeSelectId)?.destination : ''}\nInformação manual` : 'Informação manual'
        })
        .eq('id', editingId);

      if (error) throw error;

      alert('Média atualizada com sucesso!');
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar média:', err);
      alert('Erro ao salvar média: ' + (err.message || err));
    }
  };

  const handleCreateMediaSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.vehicle_id || !addFormData.driver_id || !addFormData.start_at || !addFormData.end_at || !addFormData.start_odometer || !addFormData.end_odometer) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const startOdoNum = parseInt(addFormData.start_odometer, 10) || 0;
    const endOdoNum = parseInt(addFormData.end_odometer, 10) || 0;
    if (startOdoNum > endOdoNum) {
      alert('Erro: O hodômetro final não pode ser menor que o hodômetro inicial.');
      return;
    }

    const litersNumVal = parseFloat(addFormData.liters.toString().replace(',', '.'));
    if (addFormData.liters && (isNaN(litersNumVal) || litersNumVal <= 0)) {
      alert('Erro: A quantidade de litros deve ser maior que zero.');
      return;
    }

    try {
      const distance = endOdoNum - startOdoNum;
      const average = litersNumVal > 0 ? distance / litersNumVal : 0;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profData } = await supabase.from('profiles').select('company_id').eq("company_id", (user as any)?.company_id).eq('id', user?.id).single();
      const companyId = profData?.company_id || null;

      const { error } = await supabase.from('vehicle_averages').insert([{
        company_id: companyId,
        vehicle_id: addFormData.vehicle_id,
        driver_id: addFormData.driver_id,
        start_date: new Date(addFormData.start_at).toISOString(),
        end_date: new Date(addFormData.end_at).toISOString(),
        start_odometer: startOdoNum,
        end_odometer: endOdoNum,
        distance: distance,
        liters: litersNumVal || 0,
        average: average,
        status: 'reviewed',
        notes: addFormData.routeSelectId ? `Rota: ${routes.find(r => r.id === addFormData.routeSelectId)?.origin}${routes.find(r => r.id === addFormData.routeSelectId)?.destination ? ' - ' + routes.find(r => r.id === addFormData.routeSelectId)?.destination : ''}\nInformação manual` : 'Informação manual',
        fuel_submission_id: addFormData.fuelSelectId !== 'manual' ? addFormData.fuelSelectId : null
      }]);

      if (error) throw error;

      alert('Lançamento de média criado com sucesso!');
      setShowAddModal(false);
      setAddFormData({
        vehicle_id: '',
        driver_id: '',
        start_at: '',
        end_at: '',
        start_odometer: '',
        end_odometer: '',
        fuelSelectId: 'manual',
    routeSelectId: '',
        liters: '',
        litersOdometer: '',
        litersDate: ''
      });
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao adicionar média:', err);
      alert('Erro ao adicionar média: ' + (err.message || err));
    }
  };

  const startEditing = (row: any) => {
    setEditingId(row.id);
    
    let startDateLocal = new Date(row.start_date || row.created_at);
    startDateLocal.setMinutes(startDateLocal.getMinutes() - startDateLocal.getTimezoneOffset());

    let endDateLocal = new Date(row.end_date || row.created_at);
    endDateLocal.setMinutes(endDateLocal.getMinutes() - endDateLocal.getTimezoneOffset());

    setEditData({
      odometer: (row.end_odometer || '').toString(),
      liters: (row.liters || '').toString(),
      litersId: row.fuel_submission_id,
      date: endDateLocal.toISOString().slice(0, 16),
      fuelSelectId: row.fuel_submission_id || 'manual',
      routeSelectId: '',
      driver_id: row.driver_id || '',
      vehicle_id: row.vehicle_id || '',
      start_at: startDateLocal.toISOString().slice(0, 16),
      end_at: endDateLocal.toISOString().slice(0, 16),
      start_odometer: (row.start_odometer || '').toString(),
      end_odometer: (row.end_odometer || '').toString()
    });
  };

  const sortedFuelSubs = useMemo(() => {
    return [...submissions]
      .filter(sub => sub.type === 'fuel' || sub.type === 'Abastecimento')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [submissions]);

  const tabs = [
    { id: 'vehicles', label: 'Médias por Veículo' },
    { id: 'drivers', label: 'Médias por Motorista' },
    { id: 'schedules', label: 'Histórico de Médias (Individual)' },
    { id: 'charts', label: 'Análises Gráficas' }
  ];

  if (tableError === 'missing_table') {
    return (
      <div className="bg-white p-8 rounded-3xl border border-app-border shadow-sm max-w-2xl mx-auto space-y-6 text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm animate-pulse">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Tabela de Médias Pendente</h3>
            <p className="text-xs text-zinc-500 font-bold italic uppercase tracking-wider">Configure o banco de dados para ativar a nova lógica</p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed">
          Para utilizar o novo módulo com tabela dedicada de médias, copie o código SQL abaixo e execute no console/editor SQL do seu painel do Supabase.
        </p>

        <div className="p-4 bg-zinc-900 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-200 shadow-xl border border-zinc-800">
          <pre>
{`CREATE TABLE IF NOT EXISTS public.vehicle_averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    fuel_submission_id UUID REFERENCES public.checklist_submissions(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    start_odometer INTEGER,
    end_odometer INTEGER,
    distance INTEGER,
    liters NUMERIC,
    average NUMERIC,
    status TEXT DEFAULT 'reviewed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicle_averages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages;
CREATE POLICY "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers can manage vehicle_averages" ON public.vehicle_averages;
CREATE POLICY "Managers can manage vehicle_averages" ON public.vehicle_averages
  FOR ALL TO authenticated USING (is_manager());`}
          </pre>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => fetchData()}
            className="px-5 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
          >
            Verificar e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white p-4 rounded-3xl border border-app-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 mb-2 md:mb-0">
            <div className="h-8 w-28 bg-zinc-200 rounded-xl"></div>
            <div className="h-8 w-28 bg-zinc-100 rounded-xl"></div>
            <div className="h-8 w-36 bg-zinc-100 rounded-xl"></div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-8 w-24 bg-zinc-100 rounded-xl"></div>
            <div className="h-8 w-24 bg-zinc-100 rounded-xl"></div>
            <div className="h-8 w-24 bg-zinc-100 rounded-xl"></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-app-border shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 bg-zinc-200 rounded-lg"></div>
            <div className="h-5 w-32 bg-zinc-100 rounded-lg"></div>
          </div>

          <div className="space-y-3">
            <div className="h-10 bg-zinc-100 rounded-xl w-full"></div>
            <div className="grid grid-cols-6 gap-4 py-2 border-b border-zinc-100">
              <div className="h-4 bg-zinc-200 rounded col-span-2"></div>
              <div className="h-4 bg-zinc-200 rounded"></div>
              <div className="h-4 bg-zinc-200 rounded"></div>
              <div className="h-4 bg-zinc-200 rounded"></div>
              <div className="h-4 bg-zinc-200 rounded"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b border-zinc-50 animate-pulse">
                <div className="h-4 bg-zinc-100 rounded col-span-2" style={{ animationDelay: `${i * 100}ms` }}></div>
                <div className="h-4 bg-zinc-100 rounded" style={{ animationDelay: `${i * 100}ms` }}></div>
                <div className="h-4 bg-zinc-100 rounded" style={{ animationDelay: `${i * 100}ms` }}></div>
                <div className="h-4 bg-zinc-100 rounded" style={{ animationDelay: `${i * 100}ms` }}></div>
                <div className="h-4 bg-zinc-100 rounded" style={{ animationDelay: `${i * 100}ms` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrintHeader />
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
                    <th className="py-3 px-4">Litros Abastecidos</th>
                    <th className="py-3 px-4 text-primary font-semibold">Média Geral (Km/L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {Object.values(vehicleAverages).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma média encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : Object.values(vehicleAverages).map((v: any) => {
                    const avg = v.liters > 0 ? (v.distance / v.liters).toFixed(2) : '-';
                    return (
                      <tr key={v.plate}>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main">{v.plate}</td>
                        <td className="py-3 px-4 font-mono text-sm">{v.distance.toLocaleString('pt-BR')} km</td>
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
                    <th className="py-3 px-4">Km Total</th>
                    <th className="py-3 px-4">Litros Abastecidos</th>
                    <th className="py-3 px-4 text-primary font-semibold">Média Geral (Km/L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {Object.values(driverAverages).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma média encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : Object.values(driverAverages).map((d: any) => {
                    const avg = d.liters > 0 ? (d.distance / d.liters).toFixed(2) : '-';
                    return (
                      <tr key={d.name}>
                        <td className="py-3 px-4 font-bold text-sm text-text-main">{d.name}</td>
                        <td className="py-3 px-4 font-mono text-sm">{d.distance.toLocaleString('pt-BR')} km</td>
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


        {activeTab === 'charts' && (() => {
          const vData = Object.values(vehicleAverages)
            .map((v: any) => ({
              name: v.plate,
              Média: v.liters > 0 ? Number((v.distance / v.liters).toFixed(2)) : 0,
              distance: v.distance || 0,
              liters: v.liters || 0
            }))
            .filter(d => d.Média > 0)
            .sort((a, b) => b.Média - a.Média);

          const dData = Object.values(driverAverages)
            .map((d: any) => ({
              name: d.name,
              Média: d.liters > 0 ? Number((d.distance / d.liters).toFixed(2)) : 0,
              distance: d.distance || 0,
              liters: d.liters || 0
            }))
            .filter(d => d.Média > 0)
            .sort((a, b) => b.Média - a.Média);

          const totalDistance = vData.reduce((acc, curr) => acc + curr.distance, 0);
          const totalLiters = vData.reduce((acc, curr) => acc + curr.liters, 0);
          const mediaPonderada = totalLiters > 0 ? (totalDistance / totalLiters).toFixed(2) : '0.00';
          const sumMedias = vData.reduce((acc, curr) => acc + curr.Média, 0);
          const mediaDaMedia = vData.length > 0 ? (sumMedias / vData.length).toFixed(2) : '0.00';

          return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xl font-black text-text-main flex items-center gap-2 text-left">
                  <BarChart2 size={24} className="text-primary" /> Análises Gráficas
                </h3>
                <p className="text-xs text-zinc-500">
                  Visão gráfica do consumo médio (Km/L) por veículo e motorista no período selecionado.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <div className="bg-app-bg border border-app-border rounded-2xl p-4 flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Km Total</span>
                 <span className="text-xl font-bold text-text-main">{totalDistance.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-400">km</span></span>
               </div>
               <div className="bg-app-bg border border-app-border rounded-2xl p-4 flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Abastecido</span>
                 <span className="text-xl font-bold text-text-main">{totalLiters.toFixed(2)} <span className="text-[10px] text-zinc-400">L</span></span>
               </div>
               <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Média Ponderada</span>
                 <span className="text-xl font-bold text-indigo-700">{mediaPonderada} <span className="text-[10px] text-indigo-400">km/L</span></span>
               </div>
               <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Média das Médias</span>
                 <span className="text-xl font-bold text-emerald-700">{mediaDaMedia} <span className="text-[10px] text-emerald-500">km/L</span></span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Chart */}
              <div className="bg-app-bg border border-app-border rounded-3xl p-6 flex flex-col items-center">
                <h4 className="text-sm font-black text-text-main mb-6 w-full text-center">Top Médias por Veículo (Km/L)</h4>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={vData}
                      margin={{ top: 30, right: 10, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} angle={-45} textAnchor="end" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }} 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="Média" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        <LabelList dataKey="Média" position="top" fill="#4F46E5" fontSize={11} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Driver Chart */}
              <div className="bg-app-bg border border-app-border rounded-3xl p-6 flex flex-col items-center">
                <h4 className="text-sm font-black text-text-main mb-6 w-full text-center">Top Médias por Motorista (Km/L)</h4>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dData}
                      margin={{ top: 30, right: 10, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} angle={-45} textAnchor="end" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }} 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="Média" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        <LabelList dataKey="Média" position="top" fill="#10B981" fontSize={11} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'schedules' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4 text-left">
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xl font-black text-text-main text-left">Lançamentos e Histórico de Médias</h3>
                <p className="text-xs text-zinc-500 flex items-center gap-2 text-left">
                  <AlertCircle size={14} className="text-zinc-400 shadow-sm"/>
                  Visualização detalhada da tabela dedicada de médias (`vehicle_averages`).
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleOpenSyncModal}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Varre escalas e checklists e insere na nova tabela de médias dedicada"
                >
                  <Droplet size={14} className="text-indigo-600" /> Sincronizar Histórico
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all cursor-pointer"
                >
                  <Plus size={14}/> Novo Lançamento de Média
                </button>
              </div>
            </div>
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border text-left">
                  <tr>
                    <th className="py-3 px-4 text-left">Período</th>
                    <th className="py-3 px-4 text-left">Veículo</th>
                    <th className="py-3 px-4 text-left">Motorista</th>
                    <th className="py-3 px-4 text-left">Rota</th>
                    <th className="py-3 px-4 text-left">Km Inicial / Final</th>
                    <th className="py-3 px-4 text-left">Distância</th>
                    <th className="py-3 px-4 text-left">Litros</th>
                    <th className="py-3 px-4 text-primary text-left">Média</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border text-left">
                  {filteredVehicleAverages.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-zinc-500">
                        Nenhuma média cadastrada no período selecionado. Use "Sincronizar Histórico" para trazer os dados antigos.
                      </td>
                    </tr>
                  ) : filteredVehicleAverages.map((row: any) => {
                    const scheduleDistance = (row.end_odometer - row.start_odometer) || row.distance || 0;
                    const avg = row.average > 0 ? row.average.toFixed(2) : '-';

                    return (
                      <tr key={row.id} className={editingId === row.id ? 'bg-blue-50/40 border-y-2 border-primary/20' : ''}>
                        <td className="py-3 px-4 font-mono text-xs text-text-main align-middle text-left">
                          {editingId === row.id ? (
                            <div className="flex flex-col gap-1 w-40 text-left">
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Início:</span>
                              <input 
                                type="datetime-local" 
                                className="bg-white border rounded px-1.5 py-0.5 text-xs text-text-main w-full"
                                value={editData.start_at}
                                onChange={(e) => setEditData({...editData, start_at: e.target.value})}
                              />
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Fim:</span>
                              <input 
                                type="datetime-local" 
                                className="bg-white border rounded px-1.5 py-0.5 text-xs text-text-main w-full"
                                value={editData.end_at}
                                onChange={(e) => setEditData({...editData, end_at: e.target.value})}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-xs text-text-main font-semibold">
                                {row.start_date ? new Date(row.start_date).toLocaleString('pt-BR') : '-'}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium">
                                até {row.end_date ? new Date(row.end_date).toLocaleString('pt-BR') : '-'}
                              </span>
                            </div>
                          )}
                        </td>
                        
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main text-left">
                          {editingId === row.id ? (
                            <select
                              value={editData.vehicle_id}
                              onChange={(e) => setEditData({...editData, vehicle_id: e.target.value})}
                              className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold"
                            >
                              {uniqueVehicles.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.plate}</option>
                              ))}
                            </select>
                          ) : (
                            row.vehicles?.plate || '-'
                          )}
                        </td>
                        
                        <td className="py-3 px-4 font-bold text-sm text-text-main text-left">
                          {editingId === row.id ? (
                            <select
                              value={editData.driver_id}
                              onChange={(e) => setEditData({...editData, driver_id: e.target.value})}
                              className="bg-white border rounded px-1.5 py-0.5 text-xs font-bold"
                            >
                              {uniqueDrivers.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          ) : (
                            row.profiles?.full_name?.split(' ')[0] || '-'
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-sm text-zinc-400 text-left">
                          {(() => {
                            let routeStr = "-";
                            if (row.schedules?.routes) {
                              routeStr = row.schedules.routes.destination ? `${row.schedules.routes.origin} - ${row.schedules.routes.destination}` : row.schedules.routes.origin;
                            } else if (row.notes && row.notes.includes("Rota: ")) {
                              routeStr = row.notes.split("Rota: ")[1].split("\n")[0];
                            }
                            return routeStr;
                          })()}

                        </td>

                        <td className="py-3 px-4 font-mono text-xs text-left">
                          {editingId === row.id ? (
                            <div className="flex flex-col gap-1 w-24 text-left">
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Ini:</span>
                              <input 
                                type="number" 
                                className="bg-white border rounded px-1.5 py-0.5 text-xs font-mono text-text-main w-full border-zinc-300"
                                value={editData.start_odometer}
                                onChange={(e) => setEditData({...editData, start_odometer: e.target.value})}
                              />
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Fim:</span>
                              <input 
                                type="number" 
                                className="bg-white border rounded px-1.5 py-0.5 text-xs font-mono text-text-main w-full border-zinc-300"
                                value={editData.end_odometer}
                                onChange={(e) => setEditData({...editData, end_odometer: e.target.value})}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-xs text-text-main font-semibold">Ini: {row.start_odometer?.toLocaleString('pt-BR')} km</span>
                              <span className="text-xs text-text-main font-semibold">Fim: {row.end_odometer?.toLocaleString('pt-BR')} km</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs font-bold text-left">
                          {editingId === row.id ? (
                            <span className="text-zinc-400">- Auto -</span>
                          ) : (
                            `${scheduleDistance.toLocaleString('pt-BR')} km`
                          )}
                        </td>
                        
                        <td className="py-3 px-4 font-mono text-sm relative border-r border-app-border text-left">
                           {editingId === row.id ? (
                             <div className="flex flex-col text-left">
                               <input 
                                 type="text" 
                                 className="w-20 bg-white border rounded px-2 py-1 text-xs font-mono"
                                 value={editData.liters}
                                 onChange={(e) => setEditData({...editData, liters: e.target.value})}
                               />
                             </div>
                           ) : (
                             <span>{row.liters > 0 ? `${row.liters.toFixed(2)} L` : '-'}</span>
                           )}
                        </td>
                        
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm text-left">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500 font-normal">Km/L</span>}
                        </td>
                        
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleAverageReviewStatus(row)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                              row.status === 'reviewed' 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {row.status === 'reviewed' ? (
                              <><CheckCircle2 size={12} /> Revisado</>
                            ) : (
                              <><Clock size={12} /> Aguardando</>
                            )}
                          </button>
                        </td>
                        
                        <td className="py-3 px-4">
                          {editingId === row.id ? (
                            <div className="flex gap-2">
                              <button onClick={handleSaveEdit} className="p-1.5 bg-primary text-white rounded hover:bg-primary-hover shadow-sm cursor-pointer" title="Salvar"><Save size={14}/></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300 shadow-sm cursor-pointer" title="Cancelar"><X size={14}/></button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => startEditing(row)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200 cursor-pointer shadow-sm" title="Editar">
                                <Edit2 size={14}/>
                              </button>
                              <button onClick={() => handleDeleteAverage(row.id)} className="p-1.5 bg-zinc-100 text-rose-500 hover:bg-rose-50 rounded cursor-pointer shadow-sm" title="Deletar">
                                <Trash2 size={14}/>
                              </button>
                            </div>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-app-border max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                <Plus className="text-primary" /> Novo Lançamento de Média
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMediaSchedule} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Veículo *</label>
                  <select
                    required
                    value={addFormData.vehicle_id}
                    onChange={(e) => setAddFormData({...addFormData, vehicle_id: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="">Selecione um veículo...</option>
                    {uniqueVehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.plate}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Motorista *</label>
                  <select
                    required
                    value={addFormData.driver_id}
                    onChange={(e) => setAddFormData({...addFormData, driver_id: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="">Selecione um motorista...</option>
                    {uniqueDrivers.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Início da Amostragem *</label>
                  <input
                    type="datetime-local"
                    required
                    value={addFormData.start_at}
                    onChange={(e) => setAddFormData({...addFormData, start_at: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Fim da Amostragem *</label>
                  <input
                    type="datetime-local"
                    required
                    value={addFormData.end_at}
                    onChange={(e) => setAddFormData({...addFormData, end_at: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Km Inicial *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 154020"
                    value={addFormData.start_odometer}
                    onChange={(e) => setAddFormData({...addFormData, start_odometer: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Km Final *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 154480"
                    value={addFormData.end_odometer}
                    onChange={(e) => setAddFormData({...addFormData, end_odometer: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-app-border pt-4 mt-2 space-y-4 text-left">
                <h4 className="text-sm font-black text-text-main flex items-center gap-2 text-left">
                  <Droplet className="text-indigo-600" size={16} /> Informações de Abastecimento
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="flex flex-col md:col-span-2 text-left">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Vincular Abastecimento do Sistema (Opcional)</label>
                    <select
                      value={addFormData.fuelSelectId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const linkedSub = val === 'manual' ? null : sortedFuelSubs.find((x: any) => x.id === val);
                        if (linkedSub) {
                          const { liters } = getLitersInfo(linkedSub.details);
                          let fuelDate = new Date(linkedSub.details?.adjusted_date || linkedSub.created_at);
                          fuelDate.setMinutes(fuelDate.getMinutes() - fuelDate.getTimezoneOffset());
                          setAddFormData({
                            ...addFormData,
                            fuelSelectId: val,
                            liters: liters > 0 ? liters.toString() : '',
                            litersOdometer: linkedSub.details?.adjusted_odometer !== undefined && linkedSub.details?.adjusted_odometer !== null 
                              ? linkedSub.details.adjusted_odometer.toString() 
                              : linkedSub.odometer?.toString() || '',
                            litersDate: fuelDate.toISOString().slice(0, 16)
                          });
                        } else {
                          setAddFormData({
                            ...addFormData,
                            fuelSelectId: 'manual',
    routeSelectId: '',
                            liters: '',
                            litersOdometer: '',
                            litersDate: ''
                          });
                        }
                      }}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-bold"
                    >
                      <option value="manual">Abastecimento Manual (Inserir Valores Abaixo)</option>
                      {sortedFuelSubs.map((sub: any) => {
                        const { liters } = getLitersInfo(sub.details);
                        const name = sub.profiles?.full_name?.split(' ')[0] || sub.profiles?.email || 'Checklist';
                        return (
                          <option key={sub.id} value={sub.id}>
                            {new Date(sub.created_at).toLocaleDateString('pt-BR')} - {liters.toFixed(1)}L ({name})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Litros Abastecidos *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 120.50"
                      value={addFormData.liters}
                      onChange={(e) => setAddFormData({...addFormData, liters: e.target.value})}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Km no Abastecimento</label>
                    <input
                      type="number"
                      placeholder="Km do Hodômetro"
                      value={addFormData.litersOdometer}
                      onChange={(e) => setAddFormData({...addFormData, litersOdometer: e.target.value})}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-app-border text-left">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-800 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-md cursor-pointer"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {showSyncModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up border border-app-border">
            <h3 className="text-xl font-black text-text-main mb-2">Sincronizar Histórico</h3>
            <p className="text-xs text-text-muted mb-6">
              Selecione o período que deseja varrer e importar os dados. Os registros que já existem no banco (por abastecimento ou escala) serão ignorados para evitar duplicidade.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex flex-col text-left">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Data Início</label>
                <input
                  type="date"
                  value={syncStartDate}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col text-left">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={syncEndDate}
                  onChange={(e) => setSyncEndDate(e.target.value)}
                  className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col text-left">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Motorista (Opcional)</label>
                <select
                  value={syncDriverId}
                  onChange={(e) => setSyncDriverId(e.target.value)}
                  className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="">Todos</option>
                  {uniqueDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSyncHistory}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                Iniciar Importação
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}
