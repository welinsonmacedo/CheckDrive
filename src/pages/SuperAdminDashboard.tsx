import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, Users, Database, Activity, Plus, Edit2, ShieldAlert, CreditCard, BarChart3, LayoutDashboard, Truck, ClipboardCheck, LogOut } from 'lucide-react';
import type { User } from '../types';

interface Company {
  id: string;
  name: string;
  document: string | null;
  active: boolean;
  created_at: string;
  plan_name: string;
  max_users: number;
  max_vehicles: number;
  subscription_status: string;
  subscription_ends_at: string | null;
}

interface Plan {
  id?: string;
  name: string;
  description: string;
  max_users: number;
  max_vehicles: number;
  price: number;
}

interface SuperAdminDashboardProps {
  user: User;
}

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'plans' | 'usage'>('overview');
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<{ [companyId: string]: { users: number, vehicles: number, submissions: number, issues: number } }>({});
  const [plans, setPlans] = useState<Plan[]>([
    { name: 'Básico', description: 'Até 10 usuários e veículos', max_users: 10, max_vehicles: 10, price: 0 },
    { name: 'Pro', description: 'Até 50 usuários e veículos', max_users: 50, max_vehicles: 50, price: 99.90 },
    { name: 'Enterprise', description: 'Ilimitado', max_users: 1000, max_vehicles: 1000, price: 499.90 }
  ]);
  const [loading, setLoading] = useState(true);
  
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Estatísticas detalhadas
      const { data: profilesData } = await supabase.from('profiles').select('company_id').eq('active', true);
      const { data: vehiclesData } = await supabase.from('vehicles').select('company_id').eq('active', true);
      const { data: submissionsData } = await supabase.from('checklist_submissions').select('company_id');
      const { data: issuesData } = await supabase.from('checklist_issues').select('company_id');

      const stats: { [companyId: string]: { users: number, vehicles: number, submissions: number, issues: number } } = {};
      
      companiesData?.forEach(c => {
        stats[c.id] = { users: 0, vehicles: 0, submissions: 0, issues: 0 };
      });
      
      profilesData?.forEach(p => { if (p.company_id && stats[p.company_id]) stats[p.company_id].users++; });
      vehiclesData?.forEach(v => { if (v.company_id && stats[v.company_id]) stats[v.company_id].vehicles++; });
      submissionsData?.forEach(s => { if (s.company_id && stats[s.company_id]) stats[s.company_id].submissions++; });
      issuesData?.forEach(i => { if (i.company_id && stats[i.company_id]) stats[i.company_id].issues++; });
      
      setCompanyStats(stats);
      
    } catch (err: any) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const basePlanName = formData.get('plan_name') as string;
    const hideAverages = formData.get('hide_averages') === 'on' || formData.get('hide_averages') === 'true';
    const finalPlanName = hideAverages ? `${basePlanName}||hide_averages` : basePlanName;

    const dataObj = {
      name: formData.get('name') as string,
      document: formData.get('document') as string,
      plan_name: finalPlanName,
      max_users: parseInt(formData.get('max_users') as string) || 10,
      max_vehicles: parseInt(formData.get('max_vehicles') as string) || 10,
      subscription_status: formData.get('subscription_status') as string,
      active: formData.get('active') === 'true',
    };

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(dataObj)
          .eq('id', editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([dataObj]);
        if (error) throw error;
      }
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      fetchData();
    } catch (err: any) {
      alert("Erro ao salvar empresa: " + err.message);
    }
  };

  const handleSavePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPlan = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      max_users: parseInt(formData.get('max_users') as string) || 10,
      max_vehicles: parseInt(formData.get('max_vehicles') as string) || 10,
      price: parseFloat(formData.get('price') as string) || 0,
    };
    
    // Stub for now (would save to saas_plans)
    if (editingPlan) {
      setPlans(plans.map(p => p.name === editingPlan.name ? newPlan : p));
    } else {
      setPlans([...plans, newPlan]);
    }
    
    setIsPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleImpersonateCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Force reload to refresh AuthContext and route
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Erro ao acessar painel da empresa:', err);
      alert('Erro ao acessar painel da empresa.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (user.role !== 'superadmin') {
    return (
      <div className="p-8 text-center text-red-500">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p>Apenas Super Administradores podem acessar esta área.</p>
      </div>
    );
  }

  const estimatedRevenue = plans.reduce((acc, plan) => {
    const activeSubs = companies.filter(c => c.active && c.plan_name === plan.name).length;
    return acc + (activeSubs * plan.price);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Painel Super Admin (SaaS)
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie planos, acessos e consumos de todas as empresas</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Empresas Ativas</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                {companies.filter(c => c.active).length}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Planos Oferecidos</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                {plans.length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Usuários Ativos (Total)</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                {Object.values(companyStats).reduce((a, b) => a + b.users, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Receita Mensal Estimada</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">
                R$ {estimatedRevenue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'companies' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresas
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'plans' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Planos
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === 'usage' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Consumo
          </button>
        </div>

        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuários Globais</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Object.values(companyStats).reduce((a, b) => a + b.users, 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">de {companies.reduce((acc, c) => acc + (c.max_users || 0), 0)} permitidos</p>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-blue-900/30 flex items-center justify-center relative">
                    <svg className="w-full h-full absolute transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-blue-500"
                        strokeDasharray={`${Math.min((Object.values(companyStats).reduce((a, b) => a + b.users, 0) / Math.max(companies.reduce((acc, c) => acc + (c.max_users || 0), 0), 1)) * 100, 100)}, 100`}
                        strokeWidth="4"
                        fill="none"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {Math.round((Object.values(companyStats).reduce((a, b) => a + b.users, 0) / Math.max(companies.reduce((acc, c) => acc + (c.max_users || 0), 0), 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Veículos Globais</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Object.values(companyStats).reduce((a, b) => a + b.vehicles, 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">de {companies.reduce((acc, c) => acc + (c.max_vehicles || 0), 0)} permitidos</p>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center relative">
                    <svg className="w-full h-full absolute transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${Math.min((Object.values(companyStats).reduce((a, b) => a + b.vehicles, 0) / Math.max(companies.reduce((acc, c) => acc + (c.max_vehicles || 0), 0), 1)) * 100, 100)}, 100`}
                        strokeWidth="4"
                        fill="none"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {Math.round((Object.values(companyStats).reduce((a, b) => a + b.vehicles, 0) / Math.max(companies.reduce((acc, c) => acc + (c.max_vehicles || 0), 0), 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Checklists Enviados</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Object.values(companyStats).reduce((a, b) => a + b.submissions, 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Total acumulado</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ocorrências / Fotos</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Object.values(companyStats).reduce((a, b) => a + b.issues, 0)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Registros em BD</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Insights de Infraestrutura (Estimativas Supabase)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* MAU */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuários Ativos (MAU)</span>
                    <span className="text-sm text-gray-500">{Object.values(companyStats).reduce((a, b) => a + b.users, 0)} / 50.000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((Object.values(companyStats).reduce((a, b) => a + b.users, 0) / 50000) * 100, 100)}%` }}></div>
                  </div>
                </div>
                
                {/* DB Size */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Banco de Dados (Tamanho)</span>
                    <span className="text-sm text-gray-500">{( (Object.values(companyStats).reduce((a, b) => a + b.submissions + b.issues, 0) * 0.05) + (Object.values(companyStats).reduce((a, b) => a + b.users, 0) * 0.01) ).toFixed(2)} MB / 500 MB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.min((((Object.values(companyStats).reduce((a, b) => a + b.submissions + b.issues, 0) * 0.05) + (Object.values(companyStats).reduce((a, b) => a + b.users, 0) * 0.01)) / 500) * 100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Storage */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage (Fotos)</span>
                    <span className="text-sm text-gray-500">{(Object.values(companyStats).reduce((a, b) => a + b.issues, 0) * 0.5).toFixed(2)} MB / 1 GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(((Object.values(companyStats).reduce((a, b) => a + b.issues, 0) * 0.5) / 1024) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

           </div>
         )}

        {/* --- TAB: COMPANIES --- */}
        {activeTab === 'companies' && (
          <div className="p-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setEditingCompany(null);
                  setIsCompanyModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Nova Empresa
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-medium text-sm">Empresa</th>
                    <th className="px-6 py-4 font-medium text-sm">Plano Atual</th>
                    <th className="px-6 py-4 font-medium text-sm">Status</th>
                    <th className="px-6 py-4 font-medium text-sm">Limites (U/V)</th>
                    <th className="px-6 py-4 font-medium text-sm text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
                  ) : companies.map(company => (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{company.name}</div>
                        <div className="text-sm text-gray-500">{company.document || 'Sem CNPJ'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {company.plan_name?.split('||')[0] || 'Básico'}
                          </span>
                          {company.plan_name?.split('||').includes('hide_averages') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Médias Ocultas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                            company.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {company.active ? 'Ativo' : 'Bloqueado'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {company.max_users} usr / {company.max_vehicles} vei
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleImpersonateCompany(company.id)}
                            className="text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors"
                            title="Acessar painel desta empresa"
                          >
                            Acessar
                          </button>
                          <button
                            onClick={() => { setEditingCompany(company); setIsCompanyModalOpen(true); }}
                            className="text-gray-400 hover:text-emerald-600 p-2 border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                            title="Editar empresa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: PLANS --- */}
        {activeTab === 'plans' && (
          <div className="p-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsPlanModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Novo Plano
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {plans.map((plan, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline text-3xl font-extrabold text-gray-900 dark:text-white">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                    <span className="ml-1 text-xl font-medium text-gray-500">/mês</span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                  <ul className="mt-6 space-y-4 flex-1">
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      Até {plan.max_users} Usuários
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Database className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      Até {plan.max_vehicles} Veículos
                    </li>
                  </ul>
                  <button 
                    onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                    className="mt-8 w-full py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    Editar Plano
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: USAGE --- */}
        {activeTab === 'usage' && (
          <div className="p-0">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Relatório de Consumo por Empresa</h3>
              <p className="text-sm text-gray-500">Identifique clientes próximos ao limite contratado para propor upgrades.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {companies.map(company => {
                const stats = companyStats[company.id] || { users: 0, vehicles: 0, submissions: 0, issues: 0 };
                const currentUsers = stats.users;
                const percentage = Math.min((currentUsers / (company.max_users || 1)) * 100, 100);
                const isNearingLimit = percentage >= 85;

                return (
                  <div key={company.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{company.name}</span>
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
                          {company.plan_name?.split('||')[0] || 'Personalizado'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {currentUsers} / {company.max_users || 0} usuários
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-3 relative overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${isNearingLimit ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    
                    {isNearingLimit && (
                      <div className="mt-3 text-xs text-red-600 flex items-center gap-1 font-medium">
                        <ShieldAlert className="w-3 h-3" /> Empresa atingindo limite de usuários.
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">Usuários Ativos</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.users} <span className="font-normal text-xs text-gray-500">/ {company.max_users}</span></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">Veículos</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.vehicles} <span className="font-normal text-xs text-gray-500">/ {company.max_vehicles}</span></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">Checklists Feitos</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.submissions}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400">Ocorrências (Fotos)</span>
                        <span className="font-bold text-gray-900 dark:text-white">{stats.issues}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Modal for Company */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingCompany?.name || ''}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Documento (CNPJ/CPF)</label>
                <input
                  type="text"
                  name="document"
                  defaultValue={editingCompany?.document || ''}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plano</label>
                  <select
                    name="plan_name"
                    defaultValue={(editingCompany?.plan_name || 'Básico').split('||')[0]}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {plans.map((p, i) => (
                      <option key={i} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Assinatura</label>
                  <select
                    name="subscription_status"
                    defaultValue={editingCompany?.subscription_status || 'active'}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx. Usuários (Override)</label>
                  <input
                    type="number"
                    name="max_users"
                    defaultValue={editingCompany?.max_users || 10}
                    required min="1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx. Veículos (Override)</label>
                  <input
                    type="number"
                    name="max_vehicles"
                    defaultValue={editingCompany?.max_vehicles || 10}
                    required min="1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="hide_averages"
                  name="hide_averages"
                  defaultChecked={editingCompany?.plan_name?.split('||').includes('hide_averages') || false}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="hide_averages" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  Ocultar módulo de médias para este cliente
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    name="active"
                    value="true"
                    defaultChecked={editingCompany ? editingCompany.active : true}
                    className="text-emerald-600 focus:ring-emerald-500 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Empresa Ativa (Acesso liberado)</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Salvar Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal for Plan */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-gray-400 hover:text-gray-500">×</button>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Plano</label>
                <input
                  type="text" name="name" defaultValue={editingPlan?.name || ''} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição Comercial</label>
                <input
                  type="text" name="description" defaultValue={editingPlan?.description || ''} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx. Usuários</label>
                  <input
                    type="number" name="max_users" defaultValue={editingPlan?.max_users || 10} required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máx. Veículos</label>
                  <input
                    type="number" name="max_vehicles" defaultValue={editingPlan?.max_vehicles || 10} required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço Mensal (R$)</label>
                <input
                  type="number" step="0.01" name="price" defaultValue={editingPlan?.price || 0} required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-transparent dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Salvar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

