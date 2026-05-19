import React, { useState } from 'react';
import { Star, AlertCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FleetSettingsSection from './FleetSettingsSection';
import ManualPenaltiesSettingsSection from './ManualPenaltiesSettingsSection';
import ScoreProfilesSettingsSection from './ScoreProfilesSettingsSection';

import ScoreCloseModal from './ScoreCloseModal';

interface SettingsTabProps {
  appSettings: any;
  setAppSettings: (settings: any) => void;
  fetchData: () => void;
}

export default function SettingsTab({ appSettings, setAppSettings, fetchData }: SettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'points' | 'profiles' | 'vehicles' | 'manual_penalties'>('points');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').update(appSettings).eq('id', 'global');
      if (error) throw error;
      alert('Configurações salvas com sucesso.');
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetBalancesClick = () => {
    setIsClosingModalOpen(true);
  };



  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex bg-app-bg rounded-xl p-1 border border-app-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 flex-none py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'points' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Opções Gerais
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 flex-none py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'profiles' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Perfis de Pontos
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 flex-none py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'vehicles' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Veículos
        </button>
        <button
          onClick={() => setActiveTab('manual_penalties')}
          className={`px-4 flex-none py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'manual_penalties' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Pendências
        </button>
      </div>

      {activeTab === 'points' ? (
        <div className="bento-card space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
              <Star size={20} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Opções Globais do APP</h3>
              <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">Configurações globais independentes de perfil</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo de Sistema Global</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
                  value={appSettings?.system_type || 'points'}
                  onChange={e => setAppSettings({...appSettings, system_type: e.target.value})}
                >
                  <option value="points">Pontos (Pts)</option>
                  <option value="cash">Saldo Financeiro (R$)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
               <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Fotos do Veículo (4 Lados)</label>
               <div className="flex items-center justify-between border border-app-border rounded-xl p-4 bg-zinc-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-text-main">Obrigatoriedade</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Se ativo, será obrigatório tirar as 4 fotos do veículo no início/fim de viagem.</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={appSettings?.require_external_photos ?? true}
                        onChange={(e) => setAppSettings({...appSettings, require_external_photos: e.target.checked})}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${appSettings?.require_external_photos !== false ? 'bg-primary' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${appSettings?.require_external_photos !== false ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                  </label>
               </div>
            </div>

            <div className="space-y-3 pt-2">
               <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Comprovante de Abastecimento</label>
               <div className="flex items-center justify-between border border-app-border rounded-xl p-4 bg-zinc-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-text-main">Foto do Cupom Fiscal</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Se ativo, será obrigatório tirar foto do comprovante nos abastecimentos.</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={appSettings?.require_fuel_receipt_photo ?? true}
                        onChange={(e) => setAppSettings({...appSettings, require_fuel_receipt_photo: e.target.checked})}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${appSettings?.require_fuel_receipt_photo !== false ? 'bg-primary' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${appSettings?.require_fuel_receipt_photo !== false ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                  </label>
               </div>
            </div>

            <div className="space-y-3 pt-2">
               <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Localização (GPS)</label>
               <div className="flex items-center justify-between border border-app-border rounded-xl p-4 bg-zinc-50/50">
                  <div>
                    <h4 className="text-xs font-bold text-text-main">Obrigatoriedade de GPS</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Se ativo, será obrigatório obter a localização GPS no fechamento do checklist.</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={appSettings?.require_location ?? false}
                        onChange={(e) => setAppSettings({...appSettings, require_location: e.target.checked})}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${appSettings?.require_location ? 'bg-primary' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${appSettings?.require_location ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                  </label>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                disabled={saving}
                className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
              >
                Salvar Configurações Globais
              </button>
              <button 
                type="button"
                disabled={saving}
                onClick={handleResetBalancesClick}
                className="h-12 px-6 border border-app-border rounded-xl text-[10px] font-black uppercase tracking-widest text-text-main hover:bg-zinc-50 transition-all disabled:opacity-50"
              >
                Resetar (Fechamento)
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'profiles' ? (
        <ScoreProfilesSettingsSection />
      ) : activeTab === 'vehicles' ? (
        <FleetSettingsSection />
      ) : (
        <ManualPenaltiesSettingsSection />
      )}

      {isClosingModalOpen && (
        <ScoreCloseModal 
          initialScore={Number(appSettings.initial_value) || 1000}
          onClose={() => setIsClosingModalOpen(false)}
          onSuccess={() => {
            setIsClosingModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}