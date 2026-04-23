import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Search, X, Plus } from 'lucide-react';

export default function DriversTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [userForm, setUserForm] = useState({
    id: '',
    fullName: '',
    email: '',
    role: 'driver',
    password: '',
    isInternal: false
  });
const openCreateForm = () => {
  setUserForm({
    id: '',
    fullName: '',
    email: '',
    role: 'driver',
    password: '',
    isInternal: false
  });

  setShowForm(true);
};
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching drivers data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const parsedName =
      userForm.isInternal && userForm.role === 'driver'
        ? userForm.fullName + ' //INTERNO'
        : userForm.fullName;

    try {
      if (userForm.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: parsedName,
            role: userForm.role
          })
          .eq('id', userForm.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              full_name: parsedName
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                email: userForm.email,
                full_name: parsedName,
                role: userForm.role,
                active: true
              },
              { onConflict: 'id' }
            );

          if (profileError) {
            console.warn(
              'Could not upsert profile directly (possibly RLS)',
              profileError
            );

            await supabase
              .from('profiles')
              .update({
                role: userForm.role,
                full_name: parsedName
              })
              .eq('id', data.user.id);
          }

          if (userForm.role === 'driver') {
            await supabase
              .from('driver_performance')
              .upsert(
                { driver_id: data.user.id, score: 1000 },
                { onConflict: 'driver_id' }
              );
          }
        }
      }

      setUserForm({
        id: '',
        fullName: '',
        email: '',
        role: 'driver',
        password: '',
        isInternal: false
      });

      setShowForm(false);

      fetchUsers();

      alert(`Usuário ${userForm.id ? 'atualizado' : 'cadastrado'} com sucesso!`);
    } catch (error: any) {
      alert('Erro: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (
      !window.confirm(
        `Deseja ${currentStatus ? 'desabilitar' : 'habilitar'} este registro?`
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchUsers();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      alert('Erro ao alterar status. Detalhes: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted font-bold text-xs">
        Carregando usuários...
      </div>
    );
  }

  return (
    <div className="flex-1 gap-6 items-start">

      {/* LISTA */}
      <div className="xl:col-span-8 bento-card !p-0">

        <div className="p-5 border-b border-app-border flex items-center justify-between">

          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Usuários Cadastrados
          </span>

          <div className="flex items-center gap-2">

            <button
             onClick={openCreateForm}
              className="flex items-center gap-2 px-3 h-8 rounded-lg bg-primary text-white text-[10px] font-bold hover:opacity-90"
            >
              <Plus size={14} />
              Novo
            </button>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                placeholder="Pesquisar..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main outline-none focus:ring-1 focus:ring-primary w-48 border border-app-border"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">

            <thead className="bg-app-bg/50">
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Nome
                </th>

                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  E-mail
                </th>

                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Nível
                </th>

                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-app-border">

              {users
                .filter(
                  u =>
                    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(user => {

                  const isInternal = user.full_name?.endsWith('//INTERNO');
                  const cleanName = isInternal
                    ? user.full_name.replace('//INTERNO', '').trim()
                    : user.full_name;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-app-bg/30 transition-colors"
                    >

                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-text-main">
                          {cleanName}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-text-muted">
                        {user.email || 'N/A'}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-blue-50 text-primary'
                              : 'bg-zinc-50 text-text-muted'
                          }`}
                        >
                          {user.role}

                          {isInternal && (
                            <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                              Pátio
                            </span>
                          )}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right flex gap-2 justify-end">

                        <button
                          onClick={() => {
                            setUserForm({
                              id: user.id,
                              fullName: cleanName || '',
                              email: user.email || '',
                              role: user.role || 'driver',
                              password: '',
                              isInternal: !!isInternal
                            });

                            setShowForm(true);

                            window.scrollTo({
                              top: 0,
                              behavior: 'smooth'
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() =>
                            toggleStatus(user.id, user.active !== false)
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50"
                        >
                          {user.active !== false ? (
                            <X size={14} />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                        </button>

                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORMULÁRIO */}

{showForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6">

    {/* BACKDROP */}
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setShowForm(false)}
    />

    {/* MODAL */}
    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
            <Plus size={22} />
          </div>

          <h3 className="text-lg font-black text-text-main uppercase tracking-tight">
            {userForm.id ? 'Editar Usuário' : 'Novo Cadastro'}
          </h3>
        </div>

        <button
          onClick={() => setShowForm(false)}
          className="p-2 rounded-lg hover:bg-zinc-100"
        >
          <X size={18} />
        </button>

      </div>

      {/* FORM */}
      <form onSubmit={handleSaveUser} className="grid grid-cols-1 gap-5">

        <input
          type="text"
          placeholder="Nome completo"
          value={userForm.fullName}
          onChange={e =>
            setUserForm({ ...userForm, fullName: e.target.value })
          }
          className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={userForm.email}
          onChange={e =>
            setUserForm({ ...userForm, email: e.target.value })
          }
          className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
          required={!userForm.id}
          disabled={!!userForm.id}
        />

        {!userForm.id && (
          <input
            type="password"
            placeholder="Senha"
            value={userForm.password}
            onChange={e =>
              setUserForm({ ...userForm, password: e.target.value })
            }
            className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
            required
          />
        )}

        <select
          value={userForm.role}
          onChange={e =>
            setUserForm({ ...userForm, role: e.target.value })
          }
          className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="driver">Motorista</option>
          <option value="admin">Administrador</option>
        </select>

        <label className="flex items-center gap-3 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={userForm.isInternal}
            onChange={e =>
              setUserForm({ ...userForm, isInternal: e.target.checked })
            }
          />
          Motorista interno (pátio)
        </label>

        <button
          disabled={saving}
          className="w-full h-11 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition"
        >
          {saving
            ? 'Salvando...'
            : userForm.id
            ? 'Atualizar Usuário'
            : 'Cadastrar Usuário'}
        </button>

      </form>

    </div>
  </div>
)}  
    </div>
  );
}