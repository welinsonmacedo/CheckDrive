import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Truck, 
  Map, 
  Settings, 
  BarChart3, 
  LayoutDashboard, 
  Plus, 
  Filter,
  AlertTriangle,
  ClipboardCheck,
  X,
  Fuel,
  History,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import SchedulesTab from '../components/admin/SchedulesTab';
import DriversTab from '../components/admin/DriversTab';
import VehiclesTab from '../components/admin/VehiclesTab';
import RoutesTab from '../components/admin/RoutesTab';
import ChecklistSetupTab from '../components/admin/ChecklistSetupTab';
import ChecklistsHistoryTab from '../components/admin/ChecklistsHistoryTab';
import MaintenanceTab from '../components/admin/MaintenanceTab';
import FuelTab from '../components/admin/FuelTab';
import AuditTab from '../components/admin/AuditTab';
import OverviewTab from '../components/admin/OverviewTab';
import SettingsTab from '../components/admin/SettingsTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [appSettings, setAppSettings] = useState({ system_type: 'points', initial_value: 1000, penalty_value: 50 });
  const [loading, setLoading] = useState(true);

  const fetchAndShowSub = async (subId: string) => {
    try {
      const { data } = await supabase.from('checklist_submissions')
        .select('*, profiles(full_name), vehicles(plate)')
        .eq('id', subId)
        .single();
      if (data) {
        setSelectedSub(data);
        setShowPhotos(false);
        setExpandedItems([]);
      } else {
        alert("Checklist não encontrado ou excluído.");
      }
    } catch (error) {
      console.error("Erro ao buscar checklist:", error);
    }
  };

  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [showPhotos, setShowPhotos] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settings } = await supabase.from('app_settings').select('*').single();
      if (settings) setAppSettings(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar - Rail layout with Bento styling */}
      <aside className="w-full lg:w-20 lg:min-h-screen bg-card-bg border-r border-app-border flex lg:flex-col items-center py-6 px-2 lg:sticky lg:top-16">
        <nav className="flex lg:flex-col gap-4 w-full justify-around lg:justify-start">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Painel' },
            { id: 'checklists', icon: BarChart3, label: 'Relatórios' },
            { id: 'maintenance', icon: AlertTriangle, label: 'Pendências' },
            { id: 'abastecimentos', icon: Fuel, label: 'Abastecimento' },
            { id: 'schedules', icon: CalendarDays, label: 'Escalas' },
            { id: 'audit', icon: History, label: 'Auditoria' },
            { id: 'drivers', icon: Users, label: 'Motoristas' },
            { id: 'vehicles', icon: Truck, label: 'Veículos' },
            { id: 'routes', icon: Map, label: 'Rotas' },
            { id: 'checklist_setup', icon: ClipboardCheck, label: 'Itens' },
            { id: 'settings', icon: Settings, label: 'Config' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-3 rounded-2xl transition-all group relative lg:w-14 lg:h-14 flex items-center justify-center ${activeTab === item.id ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-app-bg hover:text-text-main'}`}
            >
              <item.icon size={22} />
              <span className="lg:hidden ml-2 text-xs font-bold uppercase tracking-wider">{item.label}</span>
              <div className="hidden lg:group-hover:block absolute left-full ml-4 px-3 py-1 bg-text-main text-white text-[10px] font-bold uppercase rounded whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Header - Minimalist Bento style */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-text-main tracking-tight">
              {activeTab === 'drivers' ? 'Gestão de Usuários' : 
               activeTab === 'maintenance' ? 'Manutenção & Pendências' :
               activeTab === 'schedules' ? 'Controle de Escalas' :
               activeTab === 'audit' ? 'Auditoria Financeira' :
               'Painel de Controle'}
            </h1>
            <p className="text-text-muted text-sm font-medium">
              {activeTab === 'drivers' ? 'Cadastre e gerencie motoristas e administradores.' : 
               activeTab === 'maintenance' ? 'Acompanhe defeitos relatados e marque-os como resolvidos.' :
               activeTab === 'schedules' ? 'Defina horários e rotas obrigatórias para os motoristas.' :
               activeTab === 'audit' ? 'Histórico de débitos, multas e transações de pontuação.' :
               'Gestão inteligente de frota e performance.'}
            </p>
          </div>
         
        </div>

        {activeTab === 'overview' && <OverviewTab setActiveTab={setActiveTab} appSettings={appSettings} />}

        {activeTab === 'drivers' && (
          <DriversTab />
        )}

        {activeTab === 'vehicles' && <VehiclesTab />}

        {activeTab === 'routes' && <RoutesTab />}

        {activeTab === 'checklist_setup' && <ChecklistSetupTab />}

        {activeTab === 'checklists' && (
          <ChecklistsHistoryTab onViewDetails={(sub) => {
            setSelectedSub(sub);
            setShowPhotos(false);
          }} />
        )}
        {activeTab === 'maintenance' && <MaintenanceTab />}

        {activeTab === 'abastecimentos' && <FuelTab />}

        {activeTab === 'schedules' && (
          <SchedulesTab onViewChecklist={fetchAndShowSub} />
        )}

        {activeTab === 'audit' && <AuditTab appSettings={appSettings} />}

        {activeTab === 'settings' && (
          <SettingsTab 
            appSettings={appSettings} 
            setAppSettings={setAppSettings} 
            fetchData={fetchData} 
          />
        )}

      
      {/* Detalhes do Checklist Modal GERAL */}
      {selectedSub && (
         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
         >
           <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
             <div className="p-6 border-b border-app-border flex items-center justify-between bg-zinc-50">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Detalhes do Checklist</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase">Nº {selectedSub.id.split('-')[0]} • {new Date(selectedSub.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => {
                  setSelectedSub(null);
                  setShowPhotos(false);
                }} className="h-10 w-10 bg-white border border-app-border rounded-xl flex items-center justify-center shadow-sm hover:bg-app-bg transition-all">
                  <X size={20} className="text-text-muted" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1">
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</span>
                     <p className="text-sm font-black">{selectedSub.profiles?.full_name}</p>
                   </div>
                   <div className="space-y-1">
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo / Placa</span>
                     <p className="text-sm font-black">{selectedSub.vehicles?.plate}</p>
                   </div>
                   <div className="space-y-1">
                     <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Status / KM</span>
                     <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${selectedSub.status === 'concluded' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>{selectedSub.status}</span>
                      <span className="text-sm font-mono font-bold">{selectedSub.odometer !== null && selectedSub.odometer !== undefined ? selectedSub.odometer : 'N/A'} KM</span>
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest pb-2 border-b border-app-border">
                    {selectedSub.type === 'fuel' ? 'Dados do Abastecimento' : 'Checklist Realizado'}
                  </h4>
                  <div className="grid gap-3">
                     {Object.entries(selectedSub.details?.itemValues || {}).map(([itemId, val]: any) => {
                       const isExpanded = expandedItems.includes(itemId);
                       const hasDefectDetails = val === 'defect' && selectedSub.details?.defects?.[itemId];
                       
                       return (
                         <div key={itemId} className={`flex flex-col p-3 rounded-xl border ${val === 'defect' ? 'bg-red-50/10 border-red-100' : 'bg-app-bg border-app-border'}`}>
                           <div 
                             className={`flex items-center justify-between ${hasDefectDetails ? 'cursor-pointer' : ''}`}
                             onClick={() => {
                               if (hasDefectDetails) {
                                 setExpandedItems(prev => prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]);
                               }
                             }}
                           >
                             <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-text-main">{selectedSub.details.itemTitles?.[itemId] || `Item ${itemId}`}</span>
                               {hasDefectDetails && (
                                 <span className="text-[10px] text-text-muted">
                                   (Clique para {isExpanded ? 'recolher' : 'expandir'})
                                 </span>
                               )}
                             </div>
                             {selectedSub.type === 'fuel' ? (
                               <span className="px-3 py-1 rounded-lg text-[10px] font-black font-mono text-primary bg-blue-50 border border-blue-100">
                                 {val} L
                               </span>
                             ) : (
                               <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${val === 'normal' ? 'bg-green-100 text-success' : 'bg-red-100 text-danger'}`}>
                                 {val === 'normal' ? 'NORMAL' : 'DEFEITO'}
                               </span>
                             )}
                           </div>
                           
                           {isExpanded && hasDefectDetails && (
                             <div className="mt-4 pt-4 border-t border-red-100 flex gap-4 animate-in fade-in slide-in-from-top-2">
                               {selectedSub.details.defects[itemId].photoUrl && (
                                 <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden shadow-sm border border-red-200 flex items-center justify-center bg-white cursor-zoom-in" onClick={(e) => {
                                   e.stopPropagation();
                                   if(showPhotos) window.open(supabase.storage.from('checklist-photos').getPublicUrl(selectedSub.details.defects[itemId].photoUrl).data.publicUrl, '_blank');
                                 }}>
                                   {showPhotos ? (
                                     <img src={`${supabase.storage.from('checklist-photos').getPublicUrl(selectedSub.details.defects[itemId].photoUrl).data.publicUrl}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   ) : (
                                     <span className="text-[9px] font-bold text-text-muted text-center px-2">Foto Oculta</span>
                                   )}
                                 </div>
                               )}
                               <div className="flex-1 space-y-2">
                                 <span className="text-[10px] font-bold text-danger uppercase">Descrição Reportada:</span>
                                 <p className="text-xs font-medium text-secondary italic">{selectedSub.details.defects[itemId].description || 'Sem descrição.'}</p>
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center pb-2 border-b border-app-border">
                     <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Fotos de Inspeção</h4>
                     <button 
                       onClick={() => setShowPhotos(!showPhotos)}
                       className="text-[10px] font-bold bg-white border border-app-border px-3 py-1.5 rounded bg-app-bg text-text-main shadow-sm hover:bg-zinc-100 transition-colors"
                     >
                       {showPhotos ? 'Ocultar Imagens' : 'Carregar Imagens'}
                     </button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(selectedSub.photos || {}).map(([pos, url]: any) => (
                        <div key={pos} className="space-y-2">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center block">{pos}</span>
                          <div className="aspect-[4/3] rounded-xl overflow-hidden border border-app-border bg-app-bg shadow-sm flex items-center justify-center">
                            {showPhotos ? (
                              <img src={`${supabase.storage.from('checklist-photos').getPublicUrl(url).data.publicUrl}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-[9px] font-bold text-text-muted text-center px-4">Imagem Oculta</span>
                            )}
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           </div>
         </motion.div>
      )}

      </div>
    </div>
  );
}