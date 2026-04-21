import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, X, MapPin, Gauge, Car } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';

const STEPS = [
  'info',
  'external_photos',
  'items',
  'summary'
];

export default function ChecklistFlow() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ vehicles: any[], routes: any[], trailers: any[], items: any[] }>({
    vehicles: [],
    routes: [],
    trailers: [],
    items: []
  });

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    trailerId: '',
    manualTrailerPlate: '',
    km: '',
    routeId: '',
    photos: {
      front: null as File | null,
      back: null as File | null,
      left: null as File | null,
      right: null as File | null
    },
    itemValues: {} as Record<string, 'normal' | 'defect'>,
    defects: {} as Record<string, { description: string, photo: File | null }>
  });
  
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, [type]);

  useEffect(() => {
    if (formData.vehicleId) {
      fetchLastKm(formData.vehicleId);
    } else {
      setLastKm(null);
    }
  }, [formData.vehicleId]);

  const fetchLastKm = async (vehicleId: string) => {
    try {
      const { data } = await supabase
        .from('checklist_submissions')
        .select('odometer')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setLastKm(data.odometer);
      } else {
        setLastKm(null);
      }
    } catch (error) {
      console.error('Error fetching last KM:', error);
      setLastKm(null);
    }
  };

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [vRes, rRes, tRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('active', true),
        supabase.from('routes').select('*').eq('active', true),
        supabase.from('trailers').select('*').eq('active', true)
      ]);

      // Check for active schedule to pre-fill
      let prefill = { vehicleId: '', trailerId: '', routeId: '' };
      if (user) {
        // Find if url has ?schedule=ID
        const urlParams = new URLSearchParams(window.location.search);
        const scheduleId = urlParams.get('schedule');
        
        let query = supabase.from('schedules').select('vehicle_id, trailer_id, route_id').eq('driver_id', user.id);
        
        if (scheduleId) {
          query = query.eq('id', scheduleId);
        } else {
          const todayStr = new Date().toISOString().split('T')[0];
          query = query.like('start_at', `${todayStr}%`).gte('end_at', new Date().toISOString()).order('start_at');
        }
        
        const { data: schedule } = await query.limit(1).single();
        
        if (schedule) {
          prefill = {
            vehicleId: schedule.vehicle_id || '',
            trailerId: schedule.trailer_id || '',
            routeId: schedule.route_id || ''
          };
          setIsScheduled(true);
        } else {
          setIsScheduled(false);
        }
      }

      const { data: typeData } = await supabase
        .from('checklist_types')
        .select('id')
        .eq('slug', type || 'start')
        .single();

      let checklistItems: any[] = [];
      if (typeData) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('type_id', typeData.id)
          .order('order_index');
        checklistItems = items || [];
      }

      setOptions({
        vehicles: vRes.data || [],
        routes: rRes.data || [],
        trailers: tRes.data || [],
        items: checklistItems
      });

      // Init item defaults
      const defaults: Record<string, 'normal' | 'defect'> = {};
      checklistItems.forEach(item => {
        defaults[item.id] = 'normal';
      });
      setFormData(prev => ({ 
        ...prev, 
        ...prefill,
        itemValues: defaults 
      }));

    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => {
    if (type === 'yard' && prev === 0) return 2;
    return Math.min(prev + 1, STEPS.length - 1);
  });
  const prevStep = () => setCurrentStep(prev => {
    if (type === 'yard' && prev === 2) return 0;
    return Math.max(prev - 1, 0);
  });

  const handlePhotoUpload = async (key: string, file: File) => {
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      setFormData(prev => ({
        ...prev,
        photos: { ...prev.photos, [key]: compressedFile }
      }));
    } catch (error) {
      console.error('Compression failed', error);
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) {
      const selectedVehicle = options.vehicles.find(v => v.id === formData.vehicleId);
      const trailerRequired = selectedVehicle?.requires_trailer;
      
      const currentKm = parseInt(formData.km);
      let isKmValid = true;
      if (type !== 'yard') {
        isKmValid = !!formData.km && !isNaN(currentKm) && (lastKm === null || currentKm >= lastKm);
      } else if (formData.km) {
        isKmValid = !isNaN(currentKm) && (lastKm === null || currentKm >= lastKm);
      }

      return formData.vehicleId && isKmValid && (type === 'yard' || formData.routeId) && (!trailerRequired || (formData.trailerId || formData.manualTrailerPlate));
    }
    if (currentStep === 1) {
      if (type === 'yard') return true;
      if (type === 'fuel') return formData.photos.front; // Only tachograph (stored in 'front') is required for fuel
      return formData.photos.front && formData.photos.back && formData.photos.left && formData.photos.right;
    }
    if (currentStep === 2) {
      if (type === 'fuel') {
         return options.items.every((i: any) => formData.itemValues[i.id] && formData.itemValues[i.id].trim() !== '');
      }
      return options.items.every((i: any) => formData.itemValues[i.id]);
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload external photos
      const photoUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(formData.photos)) {
        if (file) {
          const path = `${user.id}/${Date.now()}_${key}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('checklist-photos')
            .upload(path, file as any);
          
          if (uploadError) throw uploadError;
          photoUrls[key] = path;
        }
      }

      // 2. Create Submission
      const itemValues = formData.itemValues;
      const itemTitles = options.items.reduce((acc: any, item: any) => ({ ...acc, [item.id]: item.title }), {});

      const { data: submission, error: subError } = await supabase
        .from('checklist_submissions')
        .insert({
          driver_id: user.id,
          vehicle_id: formData.vehicleId,
          trailer_id: formData.trailerId || null,
          route_id: formData.routeId || null,
          type: type || 'start',
          odometer: parseInt(formData.km) || 0,
          photos: photoUrls,
          status: type === 'fuel' ? 'concluido' : (Object.values(itemValues).includes('defect') ? 'com_defeitos' : 'concluido'),
          details: { 
            itemValues,
            itemTitles,
            manualTrailerPlate: formData.manualTrailerPlate
          }
        })
        .select()
        .single();

      if (subError) throw subError;

      // 3. Handle Defects (if any)
      const defectData: Record<string, { description: string, photoUrl: string | null }> = {};
      const issuesToInsert = [];
      
      const defectEntries = Object.entries(formData.defects) as [string, { description: string, photo: File | null }][];
      for (const [itemId, defect] of defectEntries) {
        let defectPhotoUrl = null;
        if (defect.photo) {
          const path = `${user.id}/defects/${Date.now()}_${itemId}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('checklist-photos')
            .upload(path, defect.photo);
          
          if (!uploadError) {
            defectPhotoUrl = path;
          }
        }
        
        const itemTitle = options.items.find((i: any) => i.id === itemId)?.title || 'Item Desconhecido';
        
        defectData[itemId] = {
          description: defect.description,
          photoUrl: defectPhotoUrl
        };

        issuesToInsert.push({
          submission_id: submission.id,
          vehicle_id: formData.vehicleId,
          driver_id: user.id,
          item_title: itemTitle,
          description: defect.description,
          photo_url: defectPhotoUrl,
          status: 'pending'
        });
      }

      // Insert issues into dedicated table
      if (issuesToInsert.length > 0) {
        await supabase.from('checklist_issues').insert(issuesToInsert);
      }

      // Update submission with defect data if needed
      if (Object.keys(defectData).length > 0) {
        // Fetch existing details
        const { data: existingSubmission } = await supabase
          .from('checklist_submissions')
          .select('details')
          .eq('id', submission.id)
          .single();

        const existingDetails = existingSubmission?.details || {};

        await supabase
          .from('checklist_submissions')
          .update({
            details: { 
              ...existingDetails,
              itemValues: formData.itemValues,
              defects: defectData
            }
          })
          .eq('id', submission.id);
      }

      // 4. Link to Schedule if applicable
      if (type === 'start' || type === 'end' || type === 'fuel') {
        const { data: activeSchedule } = await supabase
          .from('schedules')
          .select('id')
          .eq('driver_id', user.id)
          .eq('vehicle_id', formData.vehicleId)
          .eq('route_id', formData.routeId)
          // Look for any schedule today (simple approach) or current active one
          .lte('start_at', new Date().toISOString()) 
          .gte('end_at', new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24h
          .is(type === 'start' ? 'start_checklist_id' : type === 'end' ? 'end_checklist_id' : 'fuel_checklist_id', null)
          .order('start_at', { ascending: false })
          .limit(1)
          .single();
        
        if (activeSchedule) {
          const updateField = type === 'start' ? 'start_checklist_id' : type === 'end' ? 'end_checklist_id' : 'fuel_checklist_id';
          await supabase
            .from('schedules')
            .update({ [updateField]: submission.id })
            .eq('id', activeSchedule.id);
        }
      }

      navigate('/');
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Falha ao enviar checklist. Verifique conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-[calc(100vh-64px)] bg-app-bg flex flex-col p-4 sm:p-6 pb-36">
      
      {/* progress card - Bento style */}
      <div className="bg-card-bg border border-app-border rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
         <div className="flex gap-1.5 flex-1">
          {STEPS.map((_, i) => {
            if (type === 'yard' && i === 1) return null;
            return (
              <div 
                key={i} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-primary' : 'bg-app-bg'}`}
              />
            );
          })}
        </div>
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-6">
          Passo {type === 'yard' ? (currentStep === 0 ? 1 : currentStep === 2 ? 2 : 3) : currentStep + 1} de {type === 'yard' ? STEPS.length - 1 : STEPS.length}
        </span>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5"
            >
              <div className="bento-card">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Identificação Operacional</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                    <Car size={16} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</label>
                    <div className="relative">
                      <select 
                        disabled={isScheduled}
                        className={`w-full h-12 px-4 rounded-xl border border-app-border bg-white text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled ? 'opacity-70 bg-zinc-50' : ''}`}
                        value={formData.vehicleId}
                        onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                      >
                        <option value="">Selecione o veículo</option>
                        {options.vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Reboque {options.vehicles.find(v => v.id === formData.vehicleId)?.requires_trailer ? <span className="text-primary">(Obrigatório)</span> : '(Opcional)'}
                    </label>
                    <div className="relative">
                      <select 
                        disabled={isScheduled}
                        className={`w-full h-12 px-4 rounded-xl border ${options.vehicles.find(v => v.id === formData.vehicleId)?.requires_trailer && !formData.trailerId ? 'border-primary/50 bg-blue-50/10' : 'border-app-border bg-white'} text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled ? 'opacity-70 bg-zinc-50' : ''}`}
                        value={formData.trailerId}
                        onChange={e => setFormData({...formData, trailerId: e.target.value})}
                      >
                        <option value="">Nenhum reboque</option>
                        {options.trailers.map(t => (
                          <option key={t.id} value={t.id}>{t.plate}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none" />
                    </div>
                    {/* Add manual input if desired or if trailerId is empty but required */}
                    {(options.vehicles.find(v => v.id === formData.vehicleId)?.requires_trailer) && (
                      <div className="mt-2 text-[10px] text-text-muted">
                        Ou insira a placa manualmente:
                        <input
                          type="text"
                          placeholder="Ex: REB-0000"
                          className="w-full h-10 px-4 mt-1 rounded-xl border border-app-border bg-white text-sm font-semibold text-text-main outline-none focus:border-primary"
                          value={formData.manualTrailerPlate}
                          onChange={e => setFormData({...formData, manualTrailerPlate: e.target.value.toUpperCase()})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      KM Atual {type === 'yard' && <span className="normal-case text-primary font-medium">(Opcional)</span>}
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="Ex: 125430"
                        className={`w-full h-12 px-4 pl-10 rounded-xl border ${formData.km && lastKm !== null && parseInt(formData.km) < lastKm ? 'border-danger focus:border-danger bg-red-50' : 'border-app-border focus:border-primary bg-white'} text-sm font-bold text-text-main outline-none transition-colors`}
                        value={formData.km}
                        onChange={e => setFormData({...formData, km: e.target.value})}
                      />
                      <Gauge size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${formData.km && lastKm !== null && parseInt(formData.km) < lastKm ? 'text-danger' : 'text-text-muted'}`} />
                    </div>
                    {formData.km && lastKm !== null && parseInt(formData.km) < lastKm && (
                      <div className="text-[10px] font-bold text-danger mt-1 flex items-center gap-1">
                        <AlertCircle size={10} /> Não pode ser menor que o último KM registrado: {lastKm}
                      </div>
                    )}
                  </div>

                  {type !== 'yard' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">Rota</label>
                      <div className="relative">
                        <select 
                          disabled={isScheduled}
                          className={`w-full h-12 px-4 pl-10 rounded-xl border border-app-border bg-white text-sm font-semibold text-text-main outline-none focus:border-primary transition-colors appearance-none ${isScheduled ? 'opacity-70 bg-zinc-50' : ''}`}
                          value={formData.routeId}
                          onChange={e => setFormData({...formData, routeId: e.target.value})}
                        >
                          <option value="">Selecione a rota</option>
                          {options.routes.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.origin} &#8594; {r.destination} 
                              {r.stops?.length > 0 ? ` (via ${r.stops.join(', ')})` : ''}
                            </option>
                          ))}
                        </select>
                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="bento-card">
                 <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Registro Fotográfico</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-warning flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                </div>

                <div className={`grid gap-4 ${type === 'fuel' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {(type === 'fuel' ? [{ id: 'front', label: 'Tacógrafo' }] : [
                    { id: 'front', label: 'Frente' },
                    { id: 'back', label: 'Traseira' },
                    { id: 'left', label: 'Lateral Esq.' },
                    { id: 'right', label: 'Lateral Dir.' }
                  ]).map(pos => (
                    <div key={pos.id} className="space-y-2">
                      <div className="relative aspect-[4/3]">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                          onChange={(e) => e.target.files?.[0] && handlePhotoUpload(pos.id, e.target.files[0])}
                        />
                        <div className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all 
                          ${formData.photos[pos.id as keyof typeof formData.photos] ? 'border-success bg-green-50' : 'border-app-border hover:border-text-muted bg-app-bg'}`}>
                          {formData.photos[pos.id as keyof typeof formData.photos] ? (
                            <CheckCircle2 className="text-success" size={20} />
                          ) : (
                            <>
                              <Camera className="text-text-muted mb-1" size={24} />
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{pos.label}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
               <div className="bento-card">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-6">Lista de Verificação</span>
                <div className="space-y-6">
                  {/* Vehicle Items */}
                  <div className="space-y-3">
                    {options.items.some(i => !i.is_trailer_item) && <h4 className="text-[9px] font-black text-primary uppercase tracking-widest pl-1">Veículo Principal</h4>}
                    {options.items.filter(i => !i.is_trailer_item).map(item => (
                      <React.Fragment key={item.id}>
                        <div className="p-4 rounded-xl border border-app-border bg-app-bg flex items-center justify-between group hover:bg-white hover:border-primary/20 transition-all">
                          <span className="text-xs font-bold text-text-main flex-1 mr-4">{item.title}</span>
                          
                          {type === 'fuel' ? (
                            <input 
                              type="number"
                              step="0.01"
                              placeholder="Valor numérico..."
                              className="w-32 h-9 px-3 rounded-lg border border-app-border bg-white text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              value={formData.itemValues[item.id] || ''}
                              onChange={(e) => setFormData(prev => ({...prev, itemValues: {...prev.itemValues, [item.id]: e.target.value }}))}
                            />
                          ) : (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setFormData(prev => ({...prev, itemValues: {...prev.itemValues, [item.id]: 'normal' }}));
                                  // Clear defect data if reverting
                                  const newDefects = { ...formData.defects };
                                  delete newDefects[item.id];
                                  setFormData(prev => ({ ...prev, defects: newDefects }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-app-border ${formData.itemValues[item.id] === 'normal' ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted'}`}>NORMAL</button>
                              <button 
                               onClick={() => setFormData(prev => ({...prev, itemValues: {...prev.itemValues, [item.id]: 'defect' }}))}
                               className={`px-3 py-1.5 rounded-lg border border-danger/20 text-[9px] font-black uppercase tracking-widest ${formData.itemValues[item.id] === 'defect' ? 'bg-danger text-white border-danger shadow-md shadow-danger/20' : 'bg-red-50 text-danger'}`}>DEFEITO</button>
                            </div>
                          )}
                        </div>
                        
                        {formData.itemValues[item.id] === 'defect' && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-4 rounded-xl border border-danger/20 bg-red-50/30 space-y-4"
                          >
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-danger uppercase tracking-widest">Descrição do Problema</label>
                              <textarea 
                                className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                placeholder="Descreva o defeito encontrado..."
                                rows={2}
                                value={formData.defects[item.id]?.description || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  defects: {
                                    ...prev.defects,
                                    [item.id]: { ...(prev.defects[item.id] || { photo: null }), description: e.target.value }
                                  }
                                }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-danger uppercase tracking-widest">Foto do Defeito</label>
                              <div className="flex items-center gap-3">
                                <div className="relative w-16 h-16 rounded-lg border border-red-200 bg-white flex items-center justify-center overflow-hidden">
                                  <input 
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        imageCompression(file, { maxSizeMB: 0.5 }).then(compressed => {
                                          setFormData(prev => ({
                                            ...prev,
                                            defects: {
                                              ...prev.defects,
                                              [item.id]: { ...(prev.defects[item.id] || { description: '' }), photo: compressed }
                                            }
                                          }));
                                        });
                                      }
                                    }}
                                  />
                                  {formData.defects[item.id]?.photo ? (
                                    <img 
                                      src={URL.createObjectURL(formData.defects[item.id].photo!)} 
                                      className="w-full h-full object-cover" 
                                      alt="Defeito" 
                                    />
                                  ) : (
                                    <Camera size={20} className="text-danger/40" />
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-text-muted italic">Toque para anexar evidência fotográfica</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Trailer Items (Only if trailer selected) */}
                  {formData.trailerId && (
                    <div className="space-y-3 pt-4 border-t border-app-border">
                      <h4 className="text-[9px] font-black text-orange-600 uppercase tracking-widest pl-1">Itens do Reboque</h4>
                      {options.items.filter(i => i.is_trailer_item).length > 0 ? options.items.filter(i => i.is_trailer_item).map(item => (
                        <React.Fragment key={item.id}>
                          <div className="p-4 rounded-xl border border-app-border bg-app-bg flex items-center justify-between group hover:bg-white hover:border-orange-200 transition-all">
                            <span className="text-xs font-bold text-text-main">{item.title}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setFormData(prev => ({...prev, itemValues: {...prev.itemValues, [item.id]: 'normal' }}));
                                  const newDefects = { ...formData.defects };
                                  delete newDefects[item.id];
                                  setFormData(prev => ({ ...prev, defects: newDefects }));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-app-border ${formData.itemValues[item.id] === 'normal' ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100' : 'bg-white text-text-muted'}`}>NORMAL</button>
                              <button 
                               onClick={() => setFormData(prev => ({...prev, itemValues: {...prev.itemValues, [item.id]: 'defect' }}))}
                               className={`px-3 py-1.5 rounded-lg border border-danger/20 text-[9px] font-black uppercase tracking-widest ${formData.itemValues[item.id] === 'defect' ? 'bg-danger text-white border-danger shadow-md shadow-danger/20' : 'bg-red-50 text-danger'}`}>DEFEITO</button>
                            </div>
                          </div>
                          
                          {formData.itemValues[item.id] === 'defect' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mb-4 p-4 rounded-xl border border-danger/20 bg-red-50/30 space-y-4"
                            >
                               <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-danger uppercase tracking-widest">Descrição do Problema (Reboque)</label>
                                <textarea 
                                  className="w-full p-3 rounded-lg border border-red-100 bg-white text-xs text-text-main outline-none focus:border-danger"
                                  placeholder="Descreva o defeito no reboque..."
                                  rows={2}
                                  value={formData.defects[item.id]?.description || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    defects: {
                                      ...prev.defects,
                                      [item.id]: { ...(prev.defects[item.id] || { photo: null }), description: e.target.value }
                                    }
                                  }))}
                                />
                              </div>
                              {/* Photo logic same as above */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-danger uppercase tracking-widest">Foto do Defeito</label>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-16 h-16 rounded-lg border border-red-200 bg-white flex items-center justify-center overflow-hidden">
                                    <input 
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          imageCompression(file, { maxSizeMB: 0.5 }).then(compressed => {
                                            setFormData(prev => ({
                                              ...prev,
                                              defects: {
                                                ...prev.defects,
                                                [item.id]: { ...(prev.defects[item.id] || { description: '' }), photo: compressed }
                                              }
                                            }));
                                          });
                                        }
                                      }}
                                    />
                                    {formData.defects[item.id]?.photo ? (
                                      <img 
                                        src={URL.createObjectURL(formData.defects[item.id].photo!)} 
                                        className="w-full h-full object-cover" 
                                        alt="Defeito" 
                                      />
                                    ) : (
                                      <Camera size={20} className="text-danger/40" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </React.Fragment>
                      )) : (
                        <p className="text-[10px] text-text-muted italic py-2">Nenhum item de reboque configurado.</p>
                      )}
                    </div>
                  )}

                  {options.items.length === 0 && (
                    <div className="py-10 text-center text-xs text-text-muted italic">Carregando itens...</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
             <motion.div 
              key="step3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="bento-card items-center py-10 space-y-6">
                <div className="w-20 h-20 bg-green-50 text-success rounded-full flex items-center justify-center shadow-inner">
                   <ClipboardCheck size={32} />
                </div>
                <div className="space-y-2 text-center px-4">
                  <h2 className="text-2xl font-black text-text-main tracking-tight">Tudo pronto!</h2>
                  <p className="text-text-muted text-xs font-medium leading-relaxed">Os dados foram validados e o checklist está completo para envio.</p>
                </div>

                <div className="w-full bg-app-bg p-5 rounded-2xl border border-app-border space-y-3">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Placa</span>
                    <span className="text-text-main">{options.vehicles.find(v => v.id === formData.vehicleId)?.plate}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Hodômetro</span>
                    <span className="text-text-main font-mono">{formData.km} km</span>
                  </div>
                  <div className="h-px bg-app-border/50" />
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="text-text-muted">Status</span>
                    <span className="text-success">CONCLUÍDO</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/80 backdrop-blur-md border-t border-app-border flex gap-3 z-[60] max-w-xl mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {currentStep > 0 && currentStep < 3 && (
          <button 
            disabled={loading}
            onClick={prevStep}
            className="flex-1 h-12 rounded-xl border border-app-border font-bold text-xs text-text-muted flex items-center justify-center gap-2 hover:bg-app-bg transition-all disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
        )}
        
        {currentStep < 3 ? (
          <button 
            disabled={!isStepValid() || loading}
            onClick={nextStep}
            className={`flex-[2] h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm
              ${isStepValid() ? 'bg-primary text-white hover:opacity-90' : 'bg-app-bg text-text-muted cursor-not-allowed border border-app-border'}`}
          >
            {loading ? 'Processando...' : <>Próximo <ChevronRight size={16} /></>}
          </button>
        ) : (
          <button 
            disabled={loading}
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-text-main text-white font-black text-sm tracking-widest shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : 'FINALIZAR OPERAÇÃO'}
          </button>
        )}
      </div>
    </div>
  );
}

// Sub-component for Checklist Icon
function ClipboardCheck({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
  );
}
