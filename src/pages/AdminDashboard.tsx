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
  Trophy,
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
import RankingTab from '../components/admin/RankingTab';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appSettings, setAppSettings] = useState({ system_type: 'points', initial_value: 1000, penalty_start: 50, penalty_end: 50, penalty_fuel: 50, penalty_yard: 50 });
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
    { id: 'ranking', icon: Trophy, label: 'Ranking', color: 'from-yellow-400 to-yellow-600' },
    { id: 'maintenance', icon: AlertTriangle, label: 'Pendências', color: 'from-red-500 to-orange-500' },
    { id: 'abastecimentos', icon: Fuel, label: 'Abastecimento', color: 'from-green-500 to-emerald-500' },
    { id: 'schedules', icon: CalendarDays, label: 'Escalas', color: 'from-indigo-500 to-blue-500' },
    ...(user?.role === 'admin' ? [{ id: 'audit', icon: History, label: 'Auditoria', color: 'from-slate-500 to-gray-500' }] : []),
    // Only admin gets settings
    ...(user?.role === 'admin' ? [{ id: 'settings', icon: Settings, label: 'Configurações', color: 'from-gray-500 to-slate-500' }] : []),
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

          {/* Dropdown: Cadastros - Only visible for admin */}
          {user?.role === 'admin' && (
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
          )}
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
              {activeTab === 'ranking' && <RankingTab appSettings={appSettings} />}
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
              {activeTab === 'audit' && user?.role === 'admin' && <AuditTab appSettings={appSettings} />}
              {activeTab === 'settings' && user?.role === 'admin' && (
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