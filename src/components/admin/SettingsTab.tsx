import React, { useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FleetSettingsSection from './FleetSettingsSection';
import ManualPenaltiesSettingsSection from './ManualPenaltiesSettingsSection';

import ScoreCloseModal from './ScoreCloseModal';

interface SettingsTabProps {
  appSettings: any;
  setAppSettings: (settings: any) => void;
  fetchData: () => void;
}

export default function SettingsTab({ appSettings, setAppSettings, fetchData }: SettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'points' | 'vehicles' | 'manual_penalties'>('points');
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
      <div className="flex bg-app-bg rounded-xl p-1 border border-app-border">
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'points' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Pontuação
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'vehicles' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Veículos
        </button>
        <button
          onClick={() => setActiveTab('manual_penalties')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'manual_penalties' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-text-main' : 'text-text-muted hover:text-text-main hover:bg-zinc-100/50'}`}
        >
          Penalidades Manuais
        </button>
      </div>

      {activeTab === 'points' ? (
        <div className="bento-card space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
              <Star size={20} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Sistema de Pontuação</h3>
              <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">Configure como os motoristas são avaliados</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo de Sistema</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
                  value={appSettings?.system_type || 'points'}
                  onChange={e => setAppSettings({...appSettings, system_type: e.target.value})}
                >
                  <option value="points">Pontos (Pts)</option>
                  <option value="cash">Saldo Financeiro (R$)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Valor Inicial (Mensal)</label>
                <input 
                  type="number"
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
                  value={appSettings?.initial_value || 1000}
                  onChange={e => setAppSettings({...appSettings, initial_value: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Penalidades por Faltas de Checklist</label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 border border-app-border rounded-xl p-3 bg-zinc-50/50">
                  <label className="text-[10px] font-bold text-text-main uppercase tracking-widest">Início de Viagem</label>
                  <div className="flex gap-2 items-center text-xs">
                     <input type="number" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-app-border font-bold outline-none focus:border-primary" value={appSettings?.penalty_start || 50} onChange={e => setAppSettings({...appSettings, penalty_start: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-1.5 border border-app-border rounded-xl p-3 bg-zinc-50/50">
                  <label className="text-[10px] font-bold text-text-main uppercase tracking-widest">Fim de Viagem</label>
                  <div className="flex gap-2 items-center text-xs">
                     <input type="number" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-app-border font-bold outline-none focus:border-primary" value={appSettings?.penalty_end || 50} onChange={e => setAppSettings({...appSettings, penalty_end: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-1.5 border border-app-border rounded-xl p-3 bg-zinc-50/50">
                  <label className="text-[10px] font-bold text-text-main uppercase tracking-widest">Abastecimento</label>
                  <div className="flex gap-2 items-center text-xs">
                     <input type="number" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-app-border font-bold outline-none focus:border-primary" value={appSettings?.penalty_fuel || 50} onChange={e => setAppSettings({...appSettings, penalty_fuel: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-1.5 border border-app-border rounded-xl p-3 bg-zinc-50/50">
                  <label className="text-[10px] font-bold text-text-main uppercase tracking-widest">Pátio</label>
                  <div className="flex gap-2 items-center text-xs">
                     <input type="number" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-app-border font-bold outline-none focus:border-primary" value={appSettings?.penalty_yard || 50} onChange={e => setAppSettings({...appSettings, penalty_yard: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-app-border">
               <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Fechamento Automático</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-app-border rounded-xl p-4 bg-zinc-50/50">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-main">Regra de Fechamento</label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-app-border bg-white text-xs font-bold outline-none focus:border-primary transition-all"
                      value={appSettings?.closing_rule || 'manual'}
                      onChange={e => setAppSettings({...appSettings, closing_rule: e.target.value})}
                    >
                      <option value="manual">Manual (Não fechar automático)</option>
                      <option value="fixed_day">Dia Fixo do Mês</option>
                      <option value="last_sunday">Último Domingo do Mês</option>
                    </select>
                  </div>
                  
                  {appSettings?.closing_rule === 'fixed_day' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-main">Dia de Fechamento</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31"
                        className="w-full h-10 px-3 rounded-lg border border-app-border bg-white text-xs font-bold outline-none focus:border-primary transition-all"
                        value={appSettings?.closing_day || 1}
                        onChange={e => setAppSettings({...appSettings, closing_day: Number(e.target.value)})}
                      />
                    </div>
                  )}
                  {appSettings?.closing_rule === 'last_sunday' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-main">Dia de Fechamento</label>
                      <div className="w-full h-10 px-3 pt-2.5 rounded-lg border border-app-border bg-gray-100 text-xs text-text-muted">
                        Do último domingo até o último sábado
                      </div>
                    </div>
                  )}
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                disabled={saving}
                className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
              >
                Salvar Configurações
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