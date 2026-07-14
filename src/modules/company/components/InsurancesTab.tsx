import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { CheckCircle2, Search, X, Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function InsurancesTab() {
  const { user } = useAuth();
  const [insurances, setInsurances] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  const [form, setForm] = useState({ id: '', name: '', cnpj: '', claims_phone: '', support_phone: '', broker_phone: '', active: true });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('insurances').select('*').eq("company_id", user?.company_id).order('name');
      if (error) {
        if (error.code === '42P01' || error.message.includes("does not exist") || error.code === "PGRST204") {
           setDbError(true);
        } else {
           setDbError(true);
        }
      } else {
        setInsurances(data || []);
      }
    } catch (error) {
      console.error('Error fetching insurances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company_id) return;
    if (dbError) return alert('Tabela insurances não existe no banco. Execute o SQL de criação.');
    setSaving(true);
    try {
      const payload = {
        company_id: user.company_id,
        name: form.name,
        cnpj: form.cnpj,
        claims_phone: form.claims_phone,
        support_phone: form.support_phone,
        broker_phone: form.broker_phone,
        active: form.active
      };

      if (form.id) {
        await supabase.from('insurances').update(payload).eq('id', form.id);
      } else {
        await supabase.from('insurances').insert([payload]);
      }
      
      setForm({ id: '', name: '', cnpj: '', claims_phone: '', support_phone: '', broker_phone: '', active: true });
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setForm({
      id: item.id,
      name: item.name || '',
      cnpj: item.cnpj || '',
      claims_phone: item.claims_phone || '',
      support_phone: item.support_phone || '',
      broker_phone: item.broker_phone || '',
      active: item.active !== false
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta seguradora?')) return;
    try {
      await supabase.from('insurances').delete().eq('id', id);
      fetchData();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const filtered = insurances.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-primary" />
            Seguradoras
          </h1>
          <p className="text-gray-500">Gerencie as seguradoras da frota</p>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <h3 className="font-bold">Tabela não encontrada</h3>
          <p>A tabela <code>insurances</code> não existe no banco de dados. Por favor, crie a tabela no Supabase SQL Editor com o seguinte script:</p>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
{`CREATE TABLE insurances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  claims_phone TEXT,
  support_phone TEXT,
  broker_phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            {form.id ? 'Editar Seguradora' : 'Nova Seguradora'}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Seguradora *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ex: Porto Seguro"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={e => setForm({...form, cnpj: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Sinistro</label>
              <input
                type="text"
                value={form.claims_phone}
                onChange={e => setForm({...form, claims_phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ex: 0800..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone 24 horas</label>
              <input
                type="text"
                value={form.support_phone}
                onChange={e => setForm({...form, support_phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ex: 0800..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Corretora</label>
              <input
                type="text"
                value={form.broker_phone}
                onChange={e => setForm({...form, broker_phone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ex: (11) 9999-9999"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({...form, active: e.target.checked})}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Cadastro Ativo</span>
            </label>

            <div className="pt-4 flex gap-2">
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm({ id: '', name: '', cnpj: '', claims_phone: '', support_phone: '', broker_phone: '', active: true })}
                  className="flex-1 py-2 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving || dbError}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-xl hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar seguradora..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhuma seguradora encontrada.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(item => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {item.name}
                        {!item.active && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Inativo</span>
                        )}
                      </h3>
                      <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {item.cnpj && <span>CNPJ: {item.cnpj}</span>}
                        {item.claims_phone && <span>Sinistro: {item.claims_phone}</span>}
                        {item.support_phone && <span>24h: {item.support_phone}</span>}
                        {item.broker_phone && <span>Corretor: {item.broker_phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
