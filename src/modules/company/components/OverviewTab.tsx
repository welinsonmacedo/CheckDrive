import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { decodeItemTitle } from '@/src/lib/maskUtils';
import { 
  Trophy, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Plus, 
  Map as MapIcon, 
  ClipboardCheck, 
  Truck, 
  Users, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function OverviewTab({ setActiveTab, appSettings }: { setActiveTab: (tab: string) => void, appSettings: any }) {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [vehiclesWithPending, setVehiclesWithPending] = useState<any[]>([]);
  const [frequentDefects, setFrequentDefects] = useState<any[]>([]);
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
        { 
          label: 'Checklists Hoje', 
          value: String(checklistCount || 0), 
          description: 'Enviados hoje', 
          icon: ClipboardCheck,
          iconColor: 'text-emerald-500 bg-emerald-50 border-emerald-100', 
          gradient: 'from-emerald-50 to-teal-50/20 hover:border-emerald-200' 
        },
        { 
          label: 'Veículos Ativos', 
          value: String(vehicleCount || 0), 
          description: 'Frota total cadastrada', 
          icon: Truck,
          iconColor: 'text-blue-500 bg-blue-50 border-blue-100', 
          gradient: 'from-blue-50 to-indigo-50/20 hover:border-blue-200' 
        },
        { 
          label: 'Defeitos Ativos', 
          value: String(issueCount || 0), 
          description: 'Pendentes de correção', 
          icon: AlertTriangle,
          iconColor: 'text-rose-500 bg-rose-50 border-rose-100', 
          gradient: 'from-rose-50 to-red-50/20 hover:border-rose-200' 
        },
        { 
          label: 'Média de Score', 
          value: `${avgScore} pts`, 
          description: 'Performance geral', 
          icon: Trophy,
          iconColor: 'text-amber-500 bg-amber-50 border-amber-100', 
          gradient: 'from-amber-50 to-yellow-50/20 hover:border-amber-200' 
        },
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
        setVehiclesWithPending([]);
        setLoadingVehicles(false);
        return;
      }

      const { data: allChecklists, error: checklistsError } = await supabase
        .from('checklist_submissions')
        .select('*, vehicles(plate)');

      if (checklistsError) {
        console.error('Erro ao buscar checklists:', checklistsError);
        setVehiclesWithPending([]);
        setLoadingVehicles(false);
        return;
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

      // Fetch checklists items titles
      const { data: allItems } = await supabase.from('checklist_items').select('id, title');
      const itemTitleMap: { [key: string]: string } = {};
      if (allItems) {
        allItems.forEach((i: any) => {
          itemTitleMap[i.id] = decodeItemTitle(i.title).title;
        });
      }

      const defectCountByVehicle: { [key: string]: number } = {};
      const itemDefectCounts: { [key: string]: number } = {};
      
      checklistsWithDefects.forEach(c => {
        const vehicleId = c.vehicle_id;
        if (vehicleId) {
          defectCountByVehicle[vehicleId] = (defectCountByVehicle[vehicleId] || 0) + 1;
        }

        if (c.details && c.details.itemValues) {
          Object.entries(c.details.itemValues).forEach(([itemId, value]) => {
            if (value === 'defect' || value === 'defeito') {
               const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
               const title = itemTitleMap[itemId] || (isUUID ? 'Desconhecido' : itemId);
               
               if (title !== 'Desconhecido') {
                 itemDefectCounts[title] = (itemDefectCounts[title] || 0) + 1;
               }
            }
          });
        }
      });

      const frequent = Object.entries(itemDefectCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
      setFrequentDefects(frequent);

      const vehiclesWithDefects = vehicles.map(vehicle => {
        const defectCount = defectCountByVehicle[vehicle.id] || 0;
        
        return {
          ...vehicle,
          total_defects: defectCount,
          status: defectCount > 5 ? 'critical' : defectCount > 2 ? 'warning' : 'normal'
        };
      });

      const vehiclesWithIssues = vehiclesWithDefects.filter(vehicle => vehicle.total_defects > 0);
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

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Agora mesmo";
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      return `Há ${diffDays} dias`;
    } catch {
      return "Recentemente";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">
          Sincronizando Métricas em Tempo Real...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Bento KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`bg-gradient-to-br ${stat.gradient} bg-white border border-gray-200/80 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer`}
            >
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300 text-gray-900 pointer-events-none">
                <IconComponent size={100} />
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className={`p-2.5 rounded-xl border ${stat.iconColor} shadow-sm shrink-0 transition-transform group-hover:scale-110 duration-300`}>
                  <IconComponent size={20} />
                </div>
                <span className="text-[10px] bg-white border border-gray-100 rounded-full px-2 py-0.5 font-bold text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  Ativo
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-800 tracking-tight tabular-nums group-hover:text-indigo-950 transition-colors">{stat.value}</h3>
                <p className="text-[10px] text-gray-500 font-semibold">{stat.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 2. Middle Row: Critical Vehicles & Leadboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left block (8 Cols): Critical Fleet */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-850 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500" />
                Pendências Críticas da Frota
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Veículos com maior acúmulo de defeitos a corrigir</p>
            </div>
            <button 
              onClick={() => setActiveTab('maintenance')}
              className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-150 active:scale-95"
            >
              Manutenção <ChevronRight size={13} />
            </button>
          </div>

          {loadingVehicles ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                      <div className="h-4 bg-gray-150 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-gray-50 rounded"></div>
                </div>
              ))}
            </div>
          ) : vehiclesWithPending.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vehiclesWithPending.slice(0, 3).map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-200/90 rounded-2xl p-5 hover:border-red-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    vehicle.status === 'critical' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                    'bg-gradient-to-r from-yellow-500 to-amber-500'
                  }`} />

                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          vehicle.status === 'critical' 
                            ? 'bg-rose-50 text-rose-500 border-rose-100' 
                            : 'bg-amber-50 text-amber-500 border-amber-100'
                        }`}>
                          <Truck size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{vehicle.model || 'Veículo'}</p>
                          <p className="text-sm font-black text-gray-800 leading-none mt-0.5">{vehicle.plate}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle size={11} className="text-red-500" />
                        Defeitos Ativos
                      </span>
                      <span className={`text-base font-black px-2.5 py-0.5 rounded-lg border ${
                        vehicle.total_defects > 5 
                          ? 'text-red-600 bg-red-50 border-red-100' 
                          : 'text-amber-600 bg-amber-50 border-amber-100'
                      }`}>
                        {vehicle.total_defects}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('maintenance')}
                    className="w-full text-center text-[10px] font-black text-gray-500 hover:text-indigo-600 uppercase tracking-widest border border-dashed border-gray-200 hover:border-indigo-200 rounded-lg py-2 transition-all"
                  >
                    Encaminhar Manutenção
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-black text-gray-850">Frota 100% Operacional</h4>
                <p className="text-xs text-gray-500">Nenhum veículo apresenta pendências críticas ou defeitos relatados no momento.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right block (4 Cols): Driver Ranking / Leaderboard */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col shadow-sm">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Award className="text-amber-500" size={18} />
            <div>
              <h3 className="text-base font-black text-gray-850">Top Motoristas</h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Ranking de performance de direção</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[180px] gap-3">
            {rankings.length > 0 ? (
              rankings.map((driver, idx) => {
                const initials = driver.profiles?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'M';
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-amber-100 hover:bg-amber-50/5 transition-all duration-150"
                  >
                    <div className="flex items-center gap-3">
                      {/* Medals */}
                      <span className="text-sm leading-none shrink-0 w-5 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase text-gray-600 ${
                        idx === 0 ? 'bg-amber-50 text-amber-700 font-black border border-amber-250' : 'bg-gray-100'
                      }`}>
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-800 truncate leading-tight">{driver.profiles?.full_name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Motorista Ativo</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                        driver.score >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                        driver.score >= 75 ? 'text-amber-700 bg-amber-50 border-amber-100' :
                        'text-red-700 bg-red-50 border-red-100'
                      }`}>
                        {driver.score} pts
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400 gap-1.5">
                <Sparkles size={24} className="text-gray-300 animate-pulse" />
                <span className="text-xs font-bold">Sem dados de pontuação</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Bottom Row: Defects Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Reincidence Bar Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 p-6 flex flex-col h-[420px] shadow-sm">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h3 className="text-base font-black text-gray-850 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" />
                Principais Reincidências
              </h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Componentes com maior número de falhas relatadas</p>
            </div>
          </div>

          {loadingVehicles ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-xs font-bold text-gray-400">Carregando dados...</span>
            </div>
          ) : frequentDefects.length > 0 ? (
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                <BarChart data={frequentDefects} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    type="number"
                    allowDecimals={false}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 655 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#374151', fontWeight: 700 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6', opacity: 0.3 }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}
                  />
                  <Bar dataKey="count" name="Ocorrências" barSize={24} radius={[0, 6, 6, 0]}>
                    {frequentDefects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : index === 1 ? '#F97316' : '#6366F1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-green-500 border border-gray-100">
                <CheckCircle2 size={22} />
              </div>
              Nenhuma falha recorrente registrada
            </div>
          )}
        </div>

        {/* Recent Checklist Activity Feed (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col shadow-sm h-[420px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Clock className="text-indigo-600" size={18} />
            <div>
              <h3 className="text-base font-black text-gray-850">Checklists Recentes</h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Últimos checklists recebidos</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, idx) => {
                const isDefect = activity.status === 'com_defeitos' || activity.status === 'defect';
                return (
                  <div 
                    key={activity.id} 
                    className="p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl flex flex-col gap-2 transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-black text-gray-700 px-2 py-0.5 bg-gray-100 rounded border border-gray-200 tracking-wider">
                        {activity.vehicles?.plate || "S/ Placa"}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {getRelativeTime(activity.created_at)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{activity.profiles?.full_name || "Motorista"}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                        {activity.type === 'start' ? 'Início de Viagem' : activity.type === 'end' ? 'Fim de Viagem' : 'Checklist Diário'}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1 border-t border-gray-100/60">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isDefect ? 'bg-red-50 text-red-650 border border-red-100' : 'bg-emerald-50 text-emerald-650 border border-emerald-100'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${isDefect ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {isDefect ? 'Com Defeitos' : 'Sem Defeitos'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10 gap-2">
                <Clock size={24} className="text-gray-300 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">Aguardando checklists...</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
