import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Truck, 
  Map, 
  Settings, 
  BarChart3, 
  LayoutDashboard, 
  AlertTriangle,
  ClipboardCheck,
  X,
  Fuel,
  History,
  CalendarDays,
  ChevronRight,
  Bell,
  UserCircle,
  LogOut,
  Search,
  Activity,
  Wrench,
  AlertCircle,
  ChevronDown,
  Database,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
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
import ChecklistDetailsModal from '../components/admin/ChecklistDetailsModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [appSettings, setAppSettings] = useState({ system_type: 'points', initial_value: 1000, penalty_value: 50 });
  const [loading, setLoading] = useState(true);
  const [vehiclesWithPending, setVehiclesWithPending] = useState<any[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>(['cadastros']);


  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    fetchVehiclesWithPending();
    
  }, []);



  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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

  const fetchVehiclesWithPending = async () => {
    try {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select(`
          *,
          checklist_submissions(
            status,
            details,
            created_at
          ),
          maintenance_records(
            status,
            priority
          )
        `)
        .limit(5);

      if (vehicles) {
        const processed = vehicles.map(vehicle => {
          const pendingMaintenance = vehicle.maintenance_records?.filter((m: any) => 
            m.status === 'pending' || m.status === 'in_progress'
          ).length || 0;
          
          const recentDefects = vehicle.checklist_submissions?.filter((c: any) => 
            c.status === 'defect' && 
            new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length || 0;
          
          const totalScore = (pendingMaintenance * 10) + (recentDefects * 5);
          
          return {
            ...vehicle,
            pending_maintenance: pendingMaintenance,
            recent_defects: recentDefects,
            priority_score: totalScore,
            status: totalScore > 20 ? 'critical' : totalScore > 10 ? 'warning' : 'normal'
          };
        });
        
        setVehiclesWithPending(processed.sort((a, b) => b.priority_score - a.priority_score));
      }
    } catch (error) {
      console.error('Error fetching vehicles with pending:', error);
    }
  };

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdowns(prev => 
      prev.includes(dropdown) 
        ? prev.filter(d => d !== dropdown)
        : [...prev, dropdown]
    );
  };

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Painel', color: 'from-blue-500 to-cyan-500' },
    { id: 'checklists', icon: BarChart3, label: 'Relatórios', color: 'from-purple-500 to-pink-500' },
    { id: 'maintenance', icon: AlertTriangle, label: 'Pendências', color: 'from-red-500 to-orange-500' },
    { id: 'abastecimentos', icon: Fuel, label: 'Abastecimento', color: 'from-green-500 to-emerald-500' },
    { id: 'schedules', icon: CalendarDays, label: 'Escalas', color: 'from-indigo-500 to-blue-500' },
    { id: 'audit', icon: History, label: 'Auditoria', color: 'from-slate-500 to-gray-500' },
    { id: 'settings', icon: Settings, label: 'Configurações', color: 'from-gray-500 to-slate-500' },
  ];

  const registerItems = [
    { id: 'drivers', icon: Users, label: 'Motoristas', color: 'from-amber-500 to-yellow-500' },
    { id: 'vehicles', icon: Truck, label: 'Veículos', color: 'from-teal-500 to-green-500' },
    { id: 'routes', icon: Map, label: 'Rotas', color: 'from-violet-500 to-purple-500' },
    { id: 'checklist_setup', icon: ClipboardCheck, label: 'Itens de Checklist', color: 'from-rose-500 to-red-500' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col h-full">
     
        

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
              <span className="text-sm font-semibold flex-1 text-left">{item.label}</span>
              {activeTab === item.id && <ChevronRight size={16} className="text-white/70" />}
            </motion.button>
          ))}

          {/* Dropdown: Cadastros */}
          <div className="mt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleDropdown('cadastros')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                registerItems.some(item => item.id === activeTab)
                  ? 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Database size={20} className={registerItems.some(item => item.id === activeTab) ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'} />
              <span className="text-sm font-semibold flex-1 text-left">Cadastros</span>
              <motion.div
                animate={{ rotate: openDropdowns.includes('cadastros') ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} className="text-gray-400" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {openDropdowns.includes('cadastros') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-6 mt-1 space-y-1 overflow-hidden"
                >
                  {registerItems.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                        activeTab === item.id 
                          ? `bg-gradient-to-r ${item.color} text-white shadow-md` 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                      <span className="text-xs font-semibold flex-1 text-left">{item.label}</span>
                      {activeTab === item.id && <ChevronRight size={14} className="text-white/70" />}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Botão Logout */}
        <div className="p-4 border-t border-gray-100 bg-white/95">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-200 group"
          >
            <LogOut size={20} className="text-red-600" />
            <span className="text-sm font-semibold flex-1 text-left text-red-700">Sair do Sistema</span>
            <div className="w-6 h-6 rounded-full bg-red-200/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={14} className="text-red-600" />
            </div>
          </motion.button>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Sistema</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Online</span>
            </div>
            <p className="text-xs text-gray-500">Desenvolvido Welinson Macedo.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-800">
              {[...navItems, ...registerItems].find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 space-y-6">
          {/* Vehicles with Pending Section */}
          {activeTab === 'overview' && vehiclesWithPending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <AlertTriangle size={20} className="text-orange-500" />
                    Veículos com Mais Pendências
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Priorize a manutenção dos veículos abaixo</p>
                </div>
                <button 
                  onClick={() => setActiveTab('maintenance')}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {vehiclesWithPending.map((vehicle, index) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      vehicle.status === 'critical' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                      vehicle.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                      'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`} />

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            vehicle.status === 'critical' ? 'bg-red-50' :
                            vehicle.status === 'warning' ? 'bg-yellow-50' :
                            'bg-green-50'
                          }`}>
                            <Truck size={20} className={
                              vehicle.status === 'critical' ? 'text-red-500' :
                              vehicle.status === 'warning' ? 'text-yellow-500' :
                              'text-green-500'
                            } />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">{vehicle.model || 'Veículo'}</p>
                            <p className="text-sm font-black text-gray-800">{vehicle.plate}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                          vehicle.status === 'critical' ? 'bg-red-50 text-red-600' :
                          vehicle.status === 'warning' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {vehicle.status === 'critical' ? 'Crítico' : vehicle.status === 'warning' ? 'Atenção' : 'Normal'}
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Wrench size={12} />
                            Manutenções Pendentes
                          </span>
                          <span className={`font-bold ${
                            vehicle.pending_maintenance > 0 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            {vehicle.pending_maintenance}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Defeitos (30 dias)
                          </span>
                          <span className={`font-bold ${
                            vehicle.recent_defects > 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {vehicle.recent_defects}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Activity size={12} />
                            Pontuação de Risco
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  vehicle.priority_score > 20 ? 'bg-red-500' :
                                  vehicle.priority_score > 10 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(vehicle.priority_score, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold">{vehicle.priority_score}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('vehicles')}
                        className="w-full mt-2 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        Ver Detalhes
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab setActiveTab={setActiveTab} appSettings={appSettings} />
              )}
              {activeTab === 'drivers' && <DriversTab />}
              {activeTab === 'vehicles' && <VehiclesTab />}
              {activeTab === 'routes' && <RoutesTab />}
              {activeTab === 'checklist_setup' && <ChecklistSetupTab />}
              {activeTab === 'checklists' && (
                <ChecklistsHistoryTab onViewDetails={(sub) => {
                  setSelectedSub(sub);
                }} />
              )}
              {activeTab === 'maintenance' && <MaintenanceTab />}
              {activeTab === 'abastecimentos' && <FuelTab />}
              {activeTab === 'schedules' && (
                <SchedulesTab onViewChecklist={async (subId: string) => {
                  const { data } = await supabase.from('checklist_submissions')
                    .select('*, profiles(full_name), vehicles(plate)')
                    .eq('id', subId)
                    .single();
                  if (data) setSelectedSub(data);
                }} />
              )}
              {activeTab === 'audit' && <AuditTab appSettings={appSettings} />}
              {activeTab === 'settings' && (
                <SettingsTab 
                  appSettings={appSettings} 
                  setAppSettings={setAppSettings} 
                  fetchData={fetchData} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Checklist Details Modal - Apenas uma vez */}
      <ChecklistDetailsModal 
        selectedSub={selectedSub} 
        onClose={() => setSelectedSub(null)} 
      />
    </div>
  );
}