import React, { useState, useEffect } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import { decodeItemTitle } from '@/src/lib/maskUtils';
import { validateFileUpload } from '@/src/modules/shared/utils/validators';

interface ManualIssueModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualIssueModal({ onClose, onSuccess }: ManualIssueModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [isOtherItem, setIsOtherItem] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    trailerId: '',
    itemTitle: '',
    description: '',
    photo: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vRes, tRes, typesRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq("company_id", user?.company_id).eq("company_id", user?.company_id).eq('active', true),
        supabase.from('trailers').select('*').eq("company_id", user?.company_id).eq("company_id", user?.company_id).eq('active', true),
        supabase.from('checklist_types').select('id').eq('slug', 'manual').maybeSingle()
      ]);
      
      if (vRes.data) setVehicles(vRes.data);
      if (tRes.data) setTrailers(tRes.data);
      
      if (typesRes.data) {
        const { data: items } = await supabase.from('checklist_items').select('*').eq('type_id', typesRes.data.id).order('title');
        if (items) {
          const decoded = items.map(item => ({ ...item, title: decodeItemTitle(item.title).title }));
          setManualItems(decoded);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        });
        setFormData({ ...formData, photo: compressed });
      } catch (err) {
        console.error('Error compressing image:', err);
        setFormData({ ...formData, photo: file });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId && !formData.trailerId) return alert('Selecione um veículo ou reboque');
    if (!formData.itemTitle) return alert('Descreva o item com problema');

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let photoUrl = null;
      if (formData.photo) {
        const valRes = validateFileUpload(formData.photo);
        if (!valRes.valid) {
          throw new Error(`Erro na foto: ${valRes.error}`);
        }
        
        const fileExt = formData.photo.name && formData.photo.name.includes('.') ? formData.photo.name.split('.').pop() : 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id || 'manual'}/${Date.now()}_${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('checklist-photos')
          .upload(filePath, formData.photo);
          
        if (uploadError) throw uploadError;
        photoUrl = filePath;
      }

      const { error } = await supabase
        .from('checklist_issues')
        .insert({
          vehicle_id: formData.vehicleId || null,
          trailer_id: formData.trailerId || null,
          driver_id: user?.id,
          item_title: formData.itemTitle,
          description: formData.description,
          photo_url: photoUrl,
          status: 'pending'
        });

      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting manual issue:', error);
      alert('Erro ao salvar a pendência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h2 className="text-sm font-black text-text-main uppercase tracking-widest">
            Lançar Pendência Manual
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Veículo
            </label>
            <select
              value={formData.vehicleId}
              onChange={e => setFormData({ ...formData, vehicleId: e.target.value, trailerId: '' })}
              className="w-full h-10 px-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
            >
              <option value="">Selecione um veículo...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Ou Reboque
            </label>
            <select
              value={formData.trailerId}
              onChange={e => setFormData({ ...formData, trailerId: e.target.value, vehicleId: '' })}
              className="w-full h-10 px-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
            >
              <option value="">Selecione um reboque...</option>
              {trailers.map(t => (
                <option key={t.id} value={t.id}>{t.plate}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Item com Problema (ex: Pneu, Farol) <span className="text-danger">*</span>
            </label>
            {!isOtherItem ? (
              <select
                required
                value={formData.itemTitle}
                onChange={e => {
                  if (e.target.value === 'other') {
                    setIsOtherItem(true);
                    setFormData({ ...formData, itemTitle: '' });
                  } else {
                    setFormData({ ...formData, itemTitle: e.target.value });
                  }
                }}
                className="w-full h-10 px-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="">Selecione o item...</option>
                {manualItems.map(item => (
                  <option key={item.id} value={item.title}>{item.title} {item.is_trailer_item ? '(Reboque)' : ''}</option>
                ))}
                <option value="other">Outro (Digitar)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Digite o nome do item..."
                  value={formData.itemTitle}
                  onChange={e => setFormData({ ...formData, itemTitle: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-app-border text-sm font-semibold outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherItem(false);
                    setFormData({ ...formData, itemTitle: '' });
                  }}
                  className="h-10 px-3 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Descrição Detalhada
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-app-border text-sm font-medium outline-none focus:border-primary resize-none"
              placeholder="Descreva o problema encontrado..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Foto (Opcional)
            </label>
            <div className={`relative h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors ${formData.photo ? 'border-primary bg-primary/5' : 'border-app-border bg-zinc-50 hover:border-text-muted'}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              {formData.photo ? (
                <>
                  <img src={URL.createObjectURL(formData.photo)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  <div className="relative z-20 flex flex-col items-center p-2 bg-white/90 rounded-lg shadow-sm">
                    <Camera size={20} className="text-primary mb-1" />
                    <span className="text-[10px] font-bold text-primary">Trocar Foto</span>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-text-muted mb-2" />
                  <span className="text-xs font-bold text-text-main">Toque para anexar foto</span>
                </>
              )}
            </div>
          </div>

          <button
             type="submit"
             disabled={loading}
             className="w-full h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 mt-4"
          >
             {loading ? 'Salvando...' : 'Salvar Pendência'}
          </button>
        </form>
      </div>
    </div>
  );
}
