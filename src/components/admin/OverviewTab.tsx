import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Search, CheckCircle2, AlertCircle, Filter, Plus, Map as MapIcon, ClipboardCheck, Truck, Users, Wrench, Activity, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OverviewTab({ setActiveTab, appSettings }: { setActiveTab: (tab: string) => void, appSettings: any }) {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [vehiclesWithPending, setVehiclesWithPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: checklistCount } = await supabase
        .from('checklist_submissions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      const { count: issueCount } = await supabase
        .from('checklist_issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: perfData } = await supabase
        .from('driver_performance')
        .select('score');
      
      const avgScore = perfData?.length 
        ? Math.round(perfData.reduce((acc, curr) => acc + curr.score, 0) / perfData.length)
        : 0;

      setStats([
        { label: 'Checklists Hoje', value: String(checklistCount || 0), trend: '+', color: 'text-success', bg: 'bg-green-50' },
        { label: 'Veículos Ativos', value: String(vehicleCount || 0), trend: '0', color: 'text-secondary', bg: 'bg-zinc-50' },
        { label: 'Pendências', value: String(issueCount || 0), trend: issueCount && issueCount > 0 ? '!' : '-', color: 'text-danger', bg: 'bg-red-50' },
        { label: 'Média Performance', value: String(avgScore), trend: '+', color: 'text-primary', bg: 'bg-blue-50' },
      ]);

      const { data: activity } = await supabase
        .from('checklist_submissions')
        .select(`id, created_at, status, type, profiles (full_name), vehicles (plate)`)
        .order('created_at', { ascending: false }).limit(6);
      setRecentActivity(activity || []);

      const { data: rankData } = await supabase
        .from('driver_performance')
        .select(`score, profiles!inner(full_name, role)`)
        .eq('profiles.role', 'driver')
        .order('score', { ascending: false });
      
      const filteredRanks = (rankData || []).filter((r: any) => !r.profiles?.full_name?.endsWith('//INTERNO')).slice(0, 3);
      setRankings(filteredRanks);
    } catch (error) {
      console.error('Error fetching overview', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehiclesWithPending = async () => {
    setLoadingVehicles(true);
    try {
      console.log('=== BUSCANDO VEÍCULOS COM MAIS DEFEITOS ===');
      
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');

      if (vehiclesError) {
        console.error('Erro ao buscar veículos:', vehiclesError);
        setVehiclesWithPending([]);
        setLoadingVehicles(false);
        return;
      }

      if (!vehicles || vehicles.length === 0) {
        console.log('Nenhum veículo encontrado');
        setVehiclesWithPending([]);
        setLoadingVehicles(false);
        return;
      }

      console.log(`Total de veículos: ${vehicles.length}`);

      const { data: allChecklists, error: checklistsError } = await supabase
        .from('checklist_submissions')
        .select('*, vehicles(plate)');

      if (checklistsError) {
        console.error('Erro ao buscar checklists:', checklistsError);
        setVehiclesWithPending([]);
        setLoadingVehicles(false);
        return;
      }

      console.log(`Total de checklists: ${allChecklists?.length || 0}`);
      
      if (allChecklists && allChecklists.length > 0) {
        const statuses = [...new Set(allChecklists.map(c => c.status))];
        console.log('Status disponíveis:', statuses);
      }

      const checklistsWithDefects = allChecklists?.filter(c => {
        if (c.status === 'com_defeitos' || c.status === 'defect') {
          return true;
        }
        if (c.details && c.details.itemValues) {
          const values = Object.values(c.details.itemValues);
          return values.some((v: any) => v === 'defect' || v === 'defeito');
        }
        return false;
      }) || [];

      console.log(`Checklists com itens defeituosos: ${checklistsWithDefects.length}`);

      const defectCountByVehicle: { [key: string]: number } = {};
      
      checklistsWithDefects.forEach(c => {
        const vehicleId = c.vehicle_id;
        if (vehicleId) {
          defectCountByVehicle[vehicleId] = (defectCountByVehicle[vehicleId] || 0) + 1;
        }
      });

      console.log('Defeitos por veículo:', defectCountByVehicle);

      const vehiclesWithDefects = vehicles.map(vehicle => {
        const defectCount = defectCountByVehicle[vehicle.id] || 0;
        
        return {
          ...vehicle,
          total_defects: defectCount,
          status: defectCount > 5 ? 'critical' : defectCount > 2 ? 'warning' : 'normal'
        };
      });

      const vehiclesWithIssues = vehiclesWithDefects.filter(vehicle => vehicle.total_defects > 0);

      console.log(`Veículos COM defeitos: ${vehiclesWithIssues.length}`);
      console.log('Detalhes:', vehiclesWithIssues.map(v => ({ 
        plate: v.plate, 
        defeitos: v.total_defects 
      })));
      
      const sortedVehicles = vehiclesWithIssues.sort((a, b) => b.total_defects - a.total_defects);
      
      setVehiclesWithPending(sortedVehicles.slice(0, 5));
      
    } catch (error) {
      console.error('Erro ao buscar veículos com defeitos:', error);
      setVehiclesWithPending([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
    fetchVehiclesWithPending();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-xs font-bold text-text-muted animate-pulse">Calculando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Seção de Veículos com Pendências */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Veículos com Mais Defeitos
            </h3>
            <p className="text-xs text-gray-500 mt-1">Priorize a manutenção dos veículos com mais defeitos</p>
          </div>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
          >
            Ver todos <ChevronRight size={14} />
          </button>
        </div>

        {loadingVehicles ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : vehiclesWithPending.length > 0 ? (
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
                        <AlertCircle size={12} />
                        Defeitos
                      </span>
                      <span className={`font-bold text-lg ${
                        vehicle.total_defects > 5 ? 'text-red-600' :
                        vehicle.total_defects > 2 ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {vehicle.total_defects}
                      </span>
                    </div>  
                  </div>

               
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} className="text-yellow-500" />
              </div>
              <h4 className="text-lg font-black text-gray-800">Nenhum Defeito Encontrado</h4>
              <p className="text-sm text-gray-500 max-w-md">
                Não foram encontrados veículos com defeitos registrados.
              </p>
              <button 
                onClick={fetchVehiclesWithPending}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold"
              >
                Recarregar Dados
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Original */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 auto-rows-[140px]">
        {/* Stats Cards */}
        {stats.map((stat, i) => (
          <div key={i} className="xl:col-span-3 bento-card justify-center">
             <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{stat.label}</span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${stat.bg} ${stat.color} border border-black/5`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-3xl font-black text-text-main tracking-tighter tabular-nums">{stat.value}</div>
          </div>
        ))}
        
      
      

        
      </div>
    </div>
  );
}