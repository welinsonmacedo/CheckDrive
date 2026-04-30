import React, { useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FleetSettingsSection from './FleetSettingsSection';

interface SettingsTabProps {
  appSettings: any;
  setAppSettings: (settings: any) => void;
  fetchData: () => void;
}

export default function SettingsTab({ appSettings, setAppSettings, fetchData }: SettingsTabProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'points' | 'vehicles'>('points');

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

  const handleResetBalances = async () => {
    const resetValue = Number(appSettings.initial_value) || 1000;
    if (!confirm(`Deseja resetar o saldo de TODOS os motoristas para ${resetValue}?`)) return;
    
    setSaving(true);
    try {
      // Get all drivers
      const { data: drivers } = await supabase.from('profiles').select('id').eq('role', 'driver');
      
      if (drivers && drivers.length > 0) {
        const upsertData = drivers.map(d => ({
          driver_id: d.id,
          score: resetValue,
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('driver_performance')
          .upsert(upsertData);
        
        if (error) throw error;
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        driver_id: null,
        type: 'reset',
        amount: resetValue,
        reason: 'Reset mensal de saldos para todos os motoristas'
      });

      alert('Saldos resetados.');
      fetchData();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                disabled={saving}
                className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
              >
                Salvar Configurações
              </button>
              <button 
                type="button"
                disabled={saving}
                onClick={handleResetBalances}
                className="h-12 px-6 border border-app-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all font-mono disabled:opacity-50"
              >
                Resetar Saldos
              </button>
            </div>
          </form>
        </div>
      ) : (
        <FleetSettingsSection />
      )}
    </div>
  );
}