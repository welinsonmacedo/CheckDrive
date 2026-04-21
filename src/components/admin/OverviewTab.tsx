import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Search, CheckCircle2, AlertCircle, Filter, Plus, Map, ClipboardCheck, Truck, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OverviewTab({ setActiveTab, appSettings }: { setActiveTab: (tab: string) => void, appSettings: any }) {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select(`score, profiles (full_name)`)
        .order('score', { ascending: false }).limit(3);
      setRankings(rankData || []);
    } catch (error) {
      console.error('Error fetching overview', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  if (loading) {
     return <div className="p-10 text-center text-xs font-bold text-text-muted animate-pulse">Calculando métricas...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 auto-rows-[140px]">
      {/* Stats Cards - Small blocks */}
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

      {/* Recent Activity Table - Large Block */}
      <div className="md:col-span-2 xl:col-span-12 xl:row-span-4 bento-card !p-0 overflow-hidden">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Atividades Recentes</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main placeholder:text-text-muted outline-none focus:ring-1 focus:ring-primary w-48 border border-app-border"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Horário</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
                  <tr key={activity.id} className="hover:bg-app-bg/30 transition-colors cursor-pointer group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-app-bg border border-app-border flex items-center justify-center font-bold text-[10px] text-text-main shadow-sm italic">
                          {activity.profiles?.full_name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="text-xs font-bold text-text-main">{activity.profiles?.full_name || 'Desconhecido'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-text-muted">{activity.vehicles?.plate || '---'}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-text-main">{activity.type}</td>
                    <td className="px-5 py-3 text-[10px] font-medium text-text-muted">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${activity.status === 'concluded' ? 'bg-green-50 text-success border-green-100' : 'bg-orange-50 text-warning border-orange-100'}`}>
                         {activity.status === 'concluded' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} className="text-warning" />} {activity.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhuma atividade registrada hoje.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Performance Ranking - Side Block */}
       <div className="md:col-span-1 xl:col-span-4 xl:row-span-3 bento-card">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Performance (Mensal)</span>
            <Trophy size={16} className="text-warning" />
          </div>
          <div className="space-y-5">
            {rankings.length > 0 ? rankings.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-main">{item.profiles?.full_name || 'Desconhecido'}</span>
                  <span className="text-primary tracking-tighter">
                    {appSettings.system_type === 'cash' ? 'R$ ' : ''}{item.score}{appSettings.system_type === 'points' ? ' pts' : ''}
                  </span>
                </div>
                <div className="h-2 w-full bg-app-bg rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.score / appSettings.initial_value) * 100}%` }}
                    className={`h-full ${item.score < (appSettings.initial_value * 0.3) ? 'bg-danger' : 'bg-primary'} rounded-full`}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-muted italic text-center py-4">Aguardando dados de performance...</p>
            )}
          </div>
          <div className="mt-auto pt-6">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-[10px] text-orange-800 font-bold mb-1 uppercase tracking-wider">Atenção Admin</p>
              <p className="text-[10px] text-orange-700 leading-relaxed italic">Penalidade automática baseada em checklists pendentes está ativa neste mês.</p>
            </div>
          </div>
       </div>

       {/* Quick Actions - Small Blocks */}
       <div className="md:col-span-1 xl:col-span-8 xl:row-span-3 bento-card">
         <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Gerenciamento Rápido</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Escalas', icon: Map, id: 'schedules' },
              { label: 'Checklists', icon: ClipboardCheck, id: 'checklists' },
              { label: 'Veículos', icon: Truck, id: 'vehicles' },
              { label: 'Motoristas', icon: Users, id: 'drivers' },
            ].map(action => (
              <button 
                key={action.label} 
                onClick={() => setActiveTab(action.id)}
                className="p-4 rounded-2xl bg-app-bg border border-app-border hover:bg-white hover:shadow-md transition-all flex flex-col items-center gap-3 group"
              >
                <action.icon size={20} className="text-text-muted group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest">{action.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-auto pt-6 flex justify-center text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] animate-pulse">
            Backend Supabase: Online
          </div>
       </div>
    </div>
  );
}
