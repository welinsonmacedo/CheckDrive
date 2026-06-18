import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { Save, Edit2, X, AlertCircle, Filter, CheckCircle2, Clock, Printer, Plus, PlusCircle, Trash2, Droplet } from 'lucide-react';

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
            const intervalScheds = schedules.filter(s => {
              // ALWAYS prefer the DB linked fuel checklist first
              if (s.fuel_checklist_id === sub.id) return true;
              
              const schedCompDate = new Date(s.end_at || s.start_at || s.created_at);
              const isVehicleMatch = s.vehicle_id === sub.vehicles?.id;
              
              // If it has some other fuel checklist explicitly assigned, it is not part of this interval's fallback
              if (s.fuel_checklist_id && s.fuel_checklist_id !== sub.id) return false;
              
              return isVehicleMatch && 
                schedCompDate > new Date(lastFuelSub.created_at) &&
                schedCompDate <= new Date(sub.created_at);
            });

            intervalScheds.forEach(s => {
              const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined 
                ? s.adjusted_start_odometer 
                : (s.start_checklist?.odometer || 0);
              const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined 
                ? s.adjusted_end_odometer 
                : (s.end_checklist?.odometer || 0);
              if (endOdo > startOdo) {
                scaleDistance += (endOdo - startOdo);
              }
              scheduleFuelMap[s.id] = sub;
            });

            // Off-scale is simply whatever is left over
            offScaleDistance = Math.max(0, distance - scaleDistance);
          } else {
            // No last fuel sub, let's still map any explicitly linked schedules
            const intervalScheds = schedules.filter(s => s.fuel_checklist_id === sub.id);
            intervalScheds.forEach(s => {
              const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined 
                ? s.adjusted_start_odometer 
                : (s.start_checklist?.odometer || 0);
              const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined 
                ? s.adjusted_end_odometer 
                : (s.end_checklist?.odometer || 0);
              if (endOdo > startOdo) {
                scaleDistance += (endOdo - startOdo);
              }
              scheduleFuelMap[s.id] = sub;
            });
          }

          enrichedSubmissions.push({
            ...sub,
            liters,
            litersId,
            distance,
            scaleDistance,
            offScaleDistance,
            average: avg,
            intervalScheds: lastFuelSub ? schedules.filter(s => {
              if (s.fuel_checklist_id === sub.id) return true;
              if (s.fuel_checklist_id && s.fuel_checklist_id !== sub.id) return false;
              const schedCompDate = new Date(s.end_at || s.start_at || s.created_at);
              return s.vehicle_id === sub.vehicles?.id && 
                schedCompDate > new Date(lastFuelSub.created_at) &&
                schedCompDate <= new Date(sub.created_at);
            }) : schedules.filter(s => s.fuel_checklist_id === sub.id)
          });

          lastFuelSub = sub;
        }
      });
    });

    // Make sure we explicitly map ANY schedules that are linked to database fuel checklist
    schedules.forEach(s => {
      if (s.fuel_checklist) {
        const fSub = submissions.find(sub => sub.id === s.fuel_checklist_id) || s.fuel_checklist;
        scheduleFuelMap[s.id] = fSub;
      }
    });

    // Re-sort enriched by created_at DESC for display
    enrichedSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { list: enrichedSubmissions, map: scheduleFuelMap };
  };

  const processed = useMemo(() => processData(), [submissions, schedules, fuelLiterItems]);
  const enrichedData = processed.list;
  const scheduleFuelMap = processed.map;

  const sortedFuelSubs = useMemo(() => {
    return [...submissions]
      .filter(sub => sub.type === 'fuel')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [submissions]);

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
    schedules.forEach(s => { if (s.profiles) dMap.set(s.profiles.id, s.profiles.full_name); });
    return Array.from(dMap.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [schedules]);

  // Aggregated data for vehicles based strictly on reviewed schedules
  const vehicleAverages = useMemo(() => {
    const acc: Record<string, any> = {};

    schedules.forEach((s: any) => {
      const sub = scheduleFuelMap[s.id];
      const isReviewed = s.adjusted_status === 'reviewed' || (sub && sub.details?.average_status === 'reviewed');
      if (!isReviewed) return;

      // Filter by schedule details
      if (!passesFilters(s.start_at || s.created_at, s.vehicle_id, s.driver_id)) return;

      const vId = s.vehicle_id || s.vehicles?.id;
      const plate = s.vehicles?.plate || 'Desconhecido';
      if (!vId) return;

      // Find sibling schedules for the same fuel sub to calculate proportion ratio
      const siblingScheds = schedules.filter(sibling => {
        if (sibling.fuel_checklist_id === sub?.id) return true;
        if (!sub) return false;
        
        const schedCompDate = new Date(sibling.end_at || sibling.start_at || sibling.created_at);
        const lastFuelSub = enrichedData.find((e, idx) => {
          const currentIdx = enrichedData.findIndex(item => item.id === sub.id);
          return idx > currentIdx && e.vehicles?.id === sub.vehicles?.id;
        });
        
        const isMatchVehicle = sibling.vehicle_id === sub.vehicles?.id;
        if (!isMatchVehicle) return false;
        
        if (sibling.fuel_checklist_id && sibling.fuel_checklist_id !== sub.id) return false;
        
        if (lastFuelSub) {
          return schedCompDate > new Date(lastFuelSub.created_at) && schedCompDate <= new Date(sub.created_at);
        } else {
          return schedCompDate <= new Date(sub.created_at);
        }
      });

      const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined 
        ? s.adjusted_start_odometer 
        : (s.start_checklist?.odometer || 0);
      const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined 
        ? s.adjusted_end_odometer 
        : (s.end_checklist?.odometer || 0);
      const sDist = Math.max(0, endOdo - startOdo);

      let sLiters = 0;
      if (s.adjusted_liters !== null && s.adjusted_liters !== undefined) {
        sLiters = Number(s.adjusted_liters);
      } else if (sub) {
        const totalScaleDist = siblingScheds.reduce((sum, sibling) => {
          const sibStart = sibling.adjusted_start_odometer !== null && sibling.adjusted_start_odometer !== undefined 
            ? sibling.adjusted_start_odometer 
            : (sibling.start_checklist?.odometer || 0);
          const sibEnd = sibling.adjusted_end_odometer !== null && sibling.adjusted_end_odometer !== undefined 
            ? sibling.adjusted_end_odometer 
            : (sibling.end_checklist?.odometer || 0);
          return sum + Math.max(0, sibEnd - sibStart);
        }, 0);

        const ratio = totalScaleDist > 0 ? (sDist / totalScaleDist) : (1 / Math.max(1, siblingScheds.length));
        const { liters } = getLitersInfo(sub.details);
        sLiters = liters * ratio;
      }

      if (!acc[vId]) {
        acc[vId] = { plate, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      }
      
      acc[vId].distance += sDist;
      acc[vId].scaleDistance += sDist;
      acc[vId].liters += sLiters;
    });

    return acc;
  }, [enrichedData, schedules, startDate, endDate, filterVehicle, filterDriver, scheduleFuelMap]);

  // Aggregated data for drivers based strictly on reviewed schedules
  const driverAverages = useMemo(() => {
    const acc: Record<string, any> = {};

    schedules.forEach((s: any) => {
      const sub = scheduleFuelMap[s.id];
      const isReviewed = s.adjusted_status === 'reviewed' || (sub && sub.details?.average_status === 'reviewed');
      if (!isReviewed) return;

      // Filter by schedule details
      if (!passesFilters(s.start_at || s.created_at, s.vehicle_id, s.driver_id)) return;

      const pId = s.driver_id || s.profiles?.id;
      const name = s.profiles?.full_name || 'Desconhecido';
      if (!pId) return;

      // Find sibling schedules for the same fuel sub to calculate proportion ratio
      const siblingScheds = schedules.filter(sibling => {
        if (sibling.fuel_checklist_id === sub?.id) return true;
        if (!sub) return false;
        
        const schedCompDate = new Date(sibling.end_at || sibling.start_at || sibling.created_at);
        const lastFuelSub = enrichedData.find((e, idx) => {
          const currentIdx = enrichedData.findIndex(item => item.id === sub.id);
          return idx > currentIdx && e.vehicles?.id === sub.vehicles?.id;
        });
        
        const isMatchVehicle = sibling.vehicle_id === sub.vehicles?.id;
        if (!isMatchVehicle) return false;
        
        if (sibling.fuel_checklist_id && sibling.fuel_checklist_id !== sub.id) return false;
        
        if (lastFuelSub) {
          return schedCompDate > new Date(lastFuelSub.created_at) && schedCompDate <= new Date(sub.created_at);
        } else {
          return schedCompDate <= new Date(sub.created_at);
        }
      });

      const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined 
        ? s.adjusted_start_odometer 
        : (s.start_checklist?.odometer || 0);
      const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined 
        ? s.adjusted_end_odometer 
        : (s.end_checklist?.odometer || 0);
      const sDist = Math.max(0, endOdo - startOdo);

      let sLiters = 0;
      if (s.adjusted_liters !== null && s.adjusted_liters !== undefined) {
        sLiters = Number(s.adjusted_liters);
      } else if (sub) {
        const totalScaleDist = siblingScheds.reduce((sum, sibling) => {
          const sibStart = sibling.adjusted_start_odometer !== null && sibling.adjusted_start_odometer !== undefined 
            ? sibling.adjusted_start_odometer 
            : (sibling.start_checklist?.odometer || 0);
          const sibEnd = sibling.adjusted_end_odometer !== null && sibling.adjusted_end_odometer !== undefined 
            ? sibling.adjusted_end_odometer 
            : (sibling.end_checklist?.odometer || 0);
          return sum + Math.max(0, sibEnd - sibStart);
        }, 0);

        const ratio = totalScaleDist > 0 ? (sDist / totalScaleDist) : (1 / Math.max(1, siblingScheds.length));
        const { liters } = getLitersInfo(sub.details);
        sLiters = liters * ratio;
      }

      if (!acc[pId]) {
        acc[pId] = { name, distance: 0, scaleDistance: 0, offScaleDistance: 0, liters: 0 };
      }
      
      acc[pId].distance += sDist;
      acc[pId].scaleDistance += sDist;
      acc[pId].liters += sLiters;
    });

    return acc;
  }, [enrichedData, schedules, startDate, endDate, filterVehicle, filterDriver, scheduleFuelMap]);

  const toggleScheduleReviewStatus = async (s: any) => {
    try {
      const newStatus = s.adjusted_status === 'reviewed' ? 'pending' : 'reviewed';
      const { error } = await supabase.from('schedules')
        .update({ adjusted_status: newStatus })
        .eq('id', s.id);
        
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
      const s = schedules.find(sched => sched.id === editingId);
      if (!s) return;

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

      const manualOdoNum = parseInt(editData.odometer, 10) || null;
      const manualDateIso = editData.date ? new Date(editData.date).toISOString() : null;

      // Update the schedule row with all adjusted fields, driver, vehicle and time constraints
      const { error: updSchedFieldsErr } = await supabase.from('schedules')
        .update({
          driver_id: editData.driver_id || null,
          vehicle_id: editData.vehicle_id || null,
          start_at: new Date(editData.start_at).toISOString(),
          end_at: new Date(editData.end_at).toISOString(),
          adjusted_start_odometer: parseInt(editData.start_odometer, 10) || null,
          adjusted_end_odometer: parseInt(editData.end_odometer, 10) || null,
          adjusted_liters: !isNaN(manualLitersNum) && manualLitersNum > 0 ? manualLitersNum : null,
          adjusted_fuel_date: manualDateIso,
          adjusted_status: 'reviewed',
          fuel_checklist_id: editData.fuelSelectId !== 'manual' ? editData.fuelSelectId : null
        })
        .eq('id', s.id);

      if (updSchedFieldsErr) throw updSchedFieldsErr;

      alert('Escala e abastecimento atualizados com sucesso!');
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar edição:', err);
      alert('Erro ao salvar abastecimento: ' + (err.message || err));
    }
  };

  const handleCreateMediaSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.vehicle_id || !addFormData.driver_id || !addFormData.start_at || !addFormData.end_at || !addFormData.start_odometer || !addFormData.end_odometer) {
      alert('Por favor, preencha todos os campos obrigatórios da escala.');
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
      // 1. Create a checklist_submission of type 'start' for start odometer
      const { data: startCheck, error: errStart } = await supabase.from('checklist_submissions').insert([{
        driver_id: addFormData.driver_id,
        vehicle_id: addFormData.vehicle_id,
        odometer: parseInt(addFormData.start_odometer, 10),
        type: 'start',
        details: { info: 'Escala de média' }
      }]).select();
      if (errStart) throw errStart;

      // 2. Create a checklist_submission of type 'end' for end odometer
      const { data: endCheck, error: errEnd } = await supabase.from('checklist_submissions').insert([{
        driver_id: addFormData.driver_id,
        vehicle_id: addFormData.vehicle_id,
        odometer: parseInt(addFormData.end_odometer, 10),
        type: 'end',
        details: { info: 'Escala de média' }
      }]).select();
      if (errEnd) throw errEnd;

      let fuelChecklistId = null;

      // 3. Create fuel checklist submission if liters are supplied
      if (addFormData.liters) {
        const litersNum = parseFloat(addFormData.liters.replace(',', '.'));
        const fuelOdo = addFormData.litersOdometer ? parseInt(addFormData.litersOdometer, 10) : parseInt(addFormData.end_odometer, 10);
        const fuelDateIso = addFormData.litersDate ? new Date(addFormData.litersDate).toISOString() : new Date(addFormData.end_at).toISOString();

        if (addFormData.fuelSelectId === 'manual') {
          const { data: fuelCheck, error: errFuel } = await supabase.from('checklist_submissions').insert([{
            driver_id: addFormData.driver_id,
            vehicle_id: addFormData.vehicle_id,
            type: 'fuel',
            odometer: fuelOdo,
            created_at: fuelDateIso,
            details: {
              itemTitles: { manual_liters: "Litros (Manual)" },
              itemValues: { manual_liters: litersNum.toString() },
              adjusted_liters: litersNum.toString(),
              adjusted_odometer: fuelOdo.toString(),
              adjusted_date: fuelDateIso,
              average_status: 'reviewed'
            }
          }]).select();
          if (errFuel) throw errFuel;
          fuelChecklistId = fuelCheck[0].id;
        } else {
          fuelChecklistId = addFormData.fuelSelectId;
        }
      }

      // 4. Create the schedule linking them!
      const { error: errSched } = await supabase.from('schedules').insert([{
        driver_id: addFormData.driver_id,
        vehicle_id: addFormData.vehicle_id,
        start_at: new Date(addFormData.start_at).toISOString(),
        end_at: new Date(addFormData.end_at).toISOString(),
        start_checklist_id: startCheck[0].id,
        end_checklist_id: endCheck[0].id,
        fuel_checklist_id: fuelChecklistId
      }]);

      if (errSched) throw errSched;

      alert('Escala criada e vinculada com sucesso!');
      setShowAddModal(false);
      // Reset form
      setAddFormData({
        vehicle_id: '',
        driver_id: '',
        start_at: '',
        end_at: '',
        start_odometer: '',
        end_odometer: '',
        fuelSelectId: 'manual',
        liters: '',
        litersOdometer: '',
        litersDate: ''
      });
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao adicionar escala:', err);
      alert('Erro ao adicionar escala: ' + (err.message || err));
    }
  };

  const startEditing = (s: any) => {
    setEditingId(s.id); // track editing by schedule 'id'
    
    const sub = scheduleFuelMap[s.id];
    
    let dDate = new Date(s.adjusted_fuel_date || s.end_at || s.start_at || s.created_at);
    dDate.setMinutes(dDate.getMinutes() - dDate.getTimezoneOffset());
    
    let startIso = s.start_at ? new Date(s.start_at) : new Date(s.created_at);
    startIso.setMinutes(startIso.getMinutes() - startIso.getTimezoneOffset());
    
    let endIso = s.end_at ? new Date(s.end_at) : new Date(s.created_at);
    endIso.setMinutes(endIso.getMinutes() - endIso.getTimezoneOffset());

    const initialStartOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined
      ? s.adjusted_start_odometer.toString()
      : s.start_checklist?.odometer?.toString() || '0';
      
    const initialEndOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined
      ? s.adjusted_end_odometer.toString()
      : s.end_checklist?.odometer?.toString() || '0';

    const initialLiters = s.adjusted_liters !== null && s.adjusted_liters !== undefined
      ? s.adjusted_liters.toString()
      : (sub ? getLitersInfo(sub.details).liters.toString() : '');

    const initialOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined
      ? s.adjusted_end_odometer.toString()
      : (sub ? (sub.details?.adjusted_odometer || sub.odometer || '').toString() : '');

    if (sub) {
      let fuelDate = new Date(s.adjusted_fuel_date || sub.details?.adjusted_date || sub.created_at);
      fuelDate.setMinutes(fuelDate.getMinutes() - fuelDate.getTimezoneOffset());
      
      setEditData({
        odometer: initialOdo,
        liters: initialLiters,
        litersId: s.fuel_checklist_id || sub.id,
        date: fuelDate.toISOString().slice(0, 16),
        fuelSelectId: s.fuel_checklist_id || sub.id,
        driver_id: s.driver_id || '',
        vehicle_id: s.vehicle_id || '',
        start_at: startIso.toISOString().slice(0, 16),
        end_at: endIso.toISOString().slice(0, 16),
        start_odometer: initialStartOdo,
        end_odometer: initialEndOdo
      });
    } else {
      let fuelDate = s.adjusted_fuel_date ? new Date(s.adjusted_fuel_date) : dDate;
      
      setEditData({
        odometer: initialOdo,
        liters: initialLiters,
        litersId: null,
        date: fuelDate.toISOString().slice(0, 16),
        fuelSelectId: 'manual',
        driver_id: s.driver_id || '',
        vehicle_id: s.vehicle_id || '',
        start_at: startIso.toISOString().slice(0, 16),
        end_at: endIso.toISOString().slice(0, 16),
        start_odometer: initialStartOdo,
        end_odometer: initialEndOdo
      });
    }
  };

  const tabs = [
    { id: 'vehicles', label: 'Médias por Veículo' },
    { id: 'drivers', label: 'Médias por Motorista' },
    { id: 'schedules', label: 'Médias por Escala (C/ Revisão)' }
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Filtros */}
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

        {/* Skeleton Tabela / Conteúdo */}
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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-text-main">Média de Consumo (Por Escala)</h3>
                <p className="text-xs text-zinc-500 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500"/>
                  Edite todas as escalas e abastecimentos diretamente, ou crie novos.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all"
              >
                <Plus size={14}/> Nova Escala de Média
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-app-bg text-[10px] uppercase tracking-widest text-text-muted font-black border-y border-app-border">
                  <tr>
                    <th className="py-3 px-4">Início / Fim da Escala</th>
                    <th className="py-3 px-4">Veículo</th>
                    <th className="py-3 px-4">Motorista Escala</th>
                    <th className="py-3 px-4 bg-app-bg border-l border-r border-app-border">Vínculo Abastecimento</th>
                    <th className="py-3 px-4">Hodômetro Inicial / Final</th>
                    <th className="py-3 px-4">Km Ref. Abast.</th>
                    <th className="py-3 px-4 border-r border-app-border font-bold">Litros</th>
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
                    const startOdo = s.adjusted_start_odometer !== null && s.adjusted_start_odometer !== undefined
                      ? s.adjusted_start_odometer
                      : s.start_checklist?.odometer || 0;
                    const endOdo = s.adjusted_end_odometer !== null && s.adjusted_end_odometer !== undefined
                      ? s.adjusted_end_odometer
                      : s.end_checklist?.odometer || 0;
                    const scheduleDistance = endOdo > startOdo ? endOdo - startOdo : 0;
                    
                    let liters = 0;
                    let hasAdjustment = false;
                    let accumulatedDistance = 0;
                    let avg = '-';
                    let fuelSub: any = null;
                    const mappedFuelSub = scheduleFuelMap[s.id];

                    if (s.adjusted_liters !== null && s.adjusted_liters !== undefined) {
                      liters = Number(s.adjusted_liters);
                      hasAdjustment = true;
                      if (scheduleDistance > 0 && liters > 0) {
                        avg = (scheduleDistance / liters).toFixed(2);
                      }
                    } else if (mappedFuelSub) {
                       const { liters: L, hasAdjustment: hasAdj } = getLitersInfo(mappedFuelSub.details);
                       liters = L;
                       hasAdjustment = hasAdj;
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
                      <tr key={s.id} className={editingId === s.id ? 'bg-blue-50/40 border-y-2 border-primary/20' : ''}>
                        <td className="py-3 px-4 font-mono text-xs text-text-main align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-text-main font-semibold">
                              {s.start_at ? new Date(s.start_at).toLocaleString('pt-BR') : '-'}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              até {s.end_at ? new Date(s.end_at).toLocaleString('pt-BR') : '-'}
                            </span>
                          </div>
                        </td>
                        
                        <td className="py-3 px-4 font-mono font-bold text-sm text-text-main">
                          {s.vehicles?.plate || '-'}
                        </td>
                        
                        <td className="py-3 px-4 font-bold text-sm text-text-main">
                          {s.profiles?.full_name?.split(' ')[0] || '-'}
                        </td>
                        
                        <td className="py-3 px-4 bg-app-bg/30 border-l border-r border-app-border">
                          {editingId === s.id ? (
                            <div className="flex flex-col gap-1 w-48">
                              <select
                                className="bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-xs text-text-main w-full"
                                value={editData.fuelSelectId || 'manual'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const linkedSub = val === 'manual' ? null : sortedFuelSubs.find((x: any) => x.id === val);
                                  if (linkedSub) {
                                    const { liters } = getLitersInfo(linkedSub.details);
                                    let fuelDate = new Date(linkedSub.details?.adjusted_date || linkedSub.created_at);
                                    fuelDate.setMinutes(fuelDate.getMinutes() - fuelDate.getTimezoneOffset());
                                    setEditData({
                                      ...editData,
                                      fuelSelectId: val,
                                      liters: liters > 0 ? liters.toString() : '',
                                      odometer: linkedSub.details?.adjusted_odometer !== undefined && linkedSub.details?.adjusted_odometer !== null 
                                        ? linkedSub.details.adjusted_odometer.toString() 
                                        : linkedSub.odometer?.toString() || '',
                                      date: fuelDate.toISOString().slice(0, 16)
                                    });
                                  } else {
                                    setEditData({
                                      ...editData,
                                      fuelSelectId: 'manual',
                                      liters: '',
                                      date: editData.end_at
                                    });
                                  }
                                }}
                              >
                                <option value="manual">Abastecimento Manual (Criar Novo)</option>
                                {sortedFuelSubs.map((sub: any) => {
                                  const sLiters = getLitersInfo(sub.details).liters;
                                  const sName = sub.profiles?.full_name?.split(' ')[0] || 'Checklist';
                                  return (
                                    <option key={sub.id} value={sub.id}>
                                      {new Date(sub.created_at).toLocaleDateString('pt-BR')} - {sLiters.toFixed(1)}L ({sName})
                                    </option>
                                  );
                                })}
                              </select>
                              {editData.fuelSelectId === 'manual' ? (
                                <span className="text-[9px] text-green-600 font-bold">Novo registro será gerado</span>
                              ) : (
                                <span className="text-[9px] text-blue-600 font-bold">Registro vinculado existente</span>
                              )}
                            </div>
                          ) : s.adjusted_liters !== null && s.adjusted_liters !== undefined ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono text-text-main">
                                {s.adjusted_fuel_date ? new Date(s.adjusted_fuel_date).toLocaleString('pt-BR') : new Date(s.end_at || s.start_at || s.created_at).toLocaleString('pt-BR')}
                              </span>
                              <div>
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Manual</span>
                              </div>
                            </div>
                          ) : fuelSub ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono text-text-main">
                                {new Date(fuelSub.created_at).toLocaleString('pt-BR')}
                              </span>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                  Por: <span className="text-primary">{fuelSub.profiles?.full_name?.split(' ')[0] || '-'}</span>
                                </span>
                                {hasAdjustment && (
                                  <div>
                                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider">Manual</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">- Sem Vínculo -</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          {editingId === s.id ? (
                            <div className="flex flex-col gap-1 w-24">
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Início:</span>
                              <input 
                                type="number" 
                                className={`bg-white border rounded px-1.5 py-0.5 text-xs font-mono text-text-main w-full ${parseInt(editData.start_odometer, 10) > parseInt(editData.end_odometer, 10) ? 'border-red-500 bg-red-50' : 'border-zinc-300'}`}
                                value={editData.start_odometer}
                                onChange={(e) => setEditData({...editData, start_odometer: e.target.value})}
                                placeholder="Km Inicial"
                              />
                              <span className="text-[9px] uppercase font-bold text-zinc-400">Fim:</span>
                              <input 
                                type="number" 
                                className={`bg-white border rounded px-1.5 py-0.5 text-xs font-mono text-text-main w-full ${parseInt(editData.start_odometer, 10) > parseInt(editData.end_odometer, 10) ? 'border-red-500 bg-red-50' : 'border-zinc-300'}`}
                                value={editData.end_odometer}
                                onChange={(e) => setEditData({...editData, end_odometer: e.target.value})}
                                placeholder="Km Final"
                              />
                              {parseInt(editData.start_odometer, 10) > parseInt(editData.end_odometer, 10) && (
                                <span className="text-[9px] text-red-500 font-bold leading-tight mt-0.5">Fim menor que início!</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-text-main">Ini: {startOdo.toLocaleString('pt-BR')} km</span>
                              <span className="text-xs text-text-main">Fim: {endOdo.toLocaleString('pt-BR')} km</span>
                              <span className="text-[9px] text-zinc-400 uppercase font-black">Dist: {scheduleDistance.toLocaleString('pt-BR')} km</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-sm text-amber-600 font-medium">
                          {editingId === s.id ? (
                            <input 
                              type="number" 
                              className="w-24 bg-white border border-zinc-300 rounded px-2 py-1 text-xs text-text-main font-mono"
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
                           {editingId === s.id ? (
                             <div className="flex flex-col">
                               <input 
                                 type="number" 
                                 step="0.01"
                                 className={`w-20 bg-white border rounded px-2 py-1 text-xs font-mono ${editData.liters && (isNaN(parseFloat(editData.liters.toString().replace(',', '.'))) || parseFloat(editData.liters.toString().replace(',', '.')) <= 0) ? 'border-red-500 bg-red-50' : 'border-zinc-300'}`}
                                 value={editData.liters}
                                 onChange={(e) => setEditData({...editData, liters: e.target.value})}
                                 placeholder="Lt."
                               />
                               {editData.liters && (isNaN(parseFloat(editData.liters.toString().replace(',', '.'))) || parseFloat(editData.liters.toString().replace(',', '.')) <= 0) && (
                                 <span className="text-[8px] text-red-500 font-bold block mt-0.5">Inválido!</span>
                               )}
                             </div>
                           ) : (
                             <div className="flex flex-col gap-0.5 font-bold">
                               <span>{liters > 0 ? `${liters.toFixed(2)} L` : '-'}</span>
                               {hasAdjustment && (
                                 <span className="text-[8px] text-amber-700 bg-amber-100 border border-amber-200 px-1 rounded uppercase tracking-wider font-extrabold w-max" title="Litros ajustados manualmente">
                                   Manual
                                 </span>
                               )}
                             </div>
                           )}
                        </td>
                        
                        <td className="py-3 px-4 font-mono font-black text-primary text-sm">
                           {avg} {avg !== '-' && <span className="text-[10px] text-zinc-500 font-normal">Km/L</span>}
                        </td>
                        
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleScheduleReviewStatus(s)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                              s.adjusted_status === 'reviewed' 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {s.adjusted_status === 'reviewed' ? (
                              <><CheckCircle2 size={12} /> Revisado</>
                            ) : (
                              <><Clock size={12} /> Aguardando</>
                            )}
                          </button>
                        </td>
                        
                        <td className="py-3 px-4">
                          {editingId === s.id ? (
                            <div className="flex gap-2">
                              <button onClick={handleSaveEdit} className="p-1.5 bg-primary text-white rounded hover:bg-primary-hover" title="Salvar"><Save size={14}/></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 text-zinc-700 rounded hover:bg-zinc-300" title="Cancelar"><X size={14}/></button>
                            </div>
                          ) : (
                            <button onClick={() => startEditing(s)} className="p-1.5 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200" title="Ajustar Escala e Abastecimento">
                              <Edit2 size={14}/>
                            </button>
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
                <Plus className="text-primary" /> Nova Escala de Média
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMediaSchedule} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
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

                <div className="flex flex-col">
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

                <div className="flex flex-col">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Início da Escala *</label>
                  <input
                    type="datetime-local"
                    required
                    value={addFormData.start_at}
                    onChange={(e) => setAddFormData({...addFormData, start_at: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-black uppercase text-zinc-500 mb-1">Fim da Escala *</label>
                  <input
                    type="datetime-local"
                    required
                    value={addFormData.end_at}
                    onChange={(e) => setAddFormData({...addFormData, end_at: e.target.value})}
                    className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col">
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

                <div className="flex flex-col">
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

              <div className="border-t border-app-border pt-4 mt-2 space-y-4">
                <h4 className="text-sm font-black text-text-main flex items-center gap-2">
                  <Droplet className="text-indigo-600" size={16} /> Informações de Abastecimento
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Abastecimento Existente ou Manual</label>
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

                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Litros Abastecidos</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 120.50"
                      value={addFormData.liters}
                      onChange={(e) => setAddFormData({...addFormData, liters: e.target.value})}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Km no Abastecimento</label>
                    <input
                      type="number"
                      placeholder="Km do Hodômetro"
                      value={addFormData.litersOdometer}
                      onChange={(e) => setAddFormData({...addFormData, litersOdometer: e.target.value})}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div className="flex flex-col md:col-span-2">
                    <label className="text-xs font-black uppercase text-zinc-500 mb-1">Data do Abastecimento</label>
                    <input
                      type="datetime-local"
                      value={addFormData.litersDate}
                      onChange={(e) => setAddFormData({...addFormData, litersDate: e.target.value})}
                      className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-800 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-md"
                >
                  Criar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
