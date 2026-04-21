import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Search, X, Plus } from 'lucide-react';

export default function DriversTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userForm, setUserForm] = useState({ id: '', fullName: '', email: '', role: 'driver', password: '', isInternal: false });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
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
    
    // Append the internal flag to the name if internal is selected
    const parsedName = userForm.isInternal && userForm.role === 'driver' 
      ? userForm.fullName + ' //INTERNO' 
      : userForm.fullName;

    try {
      if (userForm.id) {
         // Update existing
         const { error } = await supabase
           .from('profiles')
           .update({ full_name: parsedName, role: userForm.role })
           .eq('id', userForm.id);
           
         if (error) throw error;
      } else {
         // Create new
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
            // First attempt to insert/upsert the profile in case the DB trigger didn't run
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({ 
                id: data.user.id,
                email: userForm.email,
                full_name: parsedName,
                role: userForm.role,
                active: true
              }, { onConflict: 'id' });
              
            if (profileError) {
              console.warn("Could not upsert profile directly (possibly RLS), trying update as fallback", profileError);
              await supabase
                .from('profiles')
                .update({ role: userForm.role, full_name: parsedName })
                .eq('id', data.user.id);
            }

            // Also ensure a driver performance record is started if driver
            if (userForm.role === 'driver') {
              await supabase
                .from('driver_performance')
                .upsert({ driver_id: data.user.id, score: 1000 }, { onConflict: 'driver_id' });
            }
          }
      }

      setUserForm({ id: '', fullName: '', email: '', role: 'driver', password: '', isInternal: false });
      fetchUsers();
      alert(`Usuário ${userForm.id ? 'atualizado' : 'cadastrado'} com sucesso!`);
    } catch (error: any) {
      alert('Erro: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja ${currentStatus ? 'desabilitar' : 'habilitar'} este registro?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ active: !currentStatus }).eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      console.error('Toggle status error:', error);
      alert('Erro ao alterar status. Detalhes: ' + error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando usuários...</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* User List */}
      <div className="xl:col-span-8 bento-card !p-0">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Usuários Cadastrados</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Pesquisar..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main outline-none focus:ring-1 focus:ring-primary w-48 border border-app-border"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">E-mail</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Nível</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {users.filter(u => 
                  u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length > 0 ? users.filter(u => 
                  u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((user, i) => {
                  const isInternal = user.full_name?.endsWith('//INTERNO');
                  const cleanName = isInternal ? user.full_name.replace('//INTERNO', '').trim() : user.full_name;

                  return (
                  <tr key={user.id} className="hover:bg-app-bg/30 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-text-main">{cleanName}</span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-text-muted">{user.email || 'N/A'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-blue-50 text-primary' : 'bg-zinc-50 text-text-muted'}`}>
                        {user.role} {isInternal && <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded shadow-sm">Pátio</span>}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
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
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                         }}
                         className="p-1.5 rounded-lg hover:bg-zinc-100 text-text-muted hover:text-primary transition-colors"
                         title="Editar Usuário"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                       </button>
                       <button 
                         onClick={() => toggleStatus(user.id, user.active !== false)}
                         className={`p-1.5 rounded-lg ${user.active !== false ? 'hover:bg-red-50 text-text-muted hover:text-danger' : 'bg-red-50 text-danger hover:bg-green-50 hover:text-success'} transition-colors`}
                         title={user.active !== false ? "Desabilitar" : "Habilitar"}
                       >
                         {user.active !== false ? <X size={14} /> : <CheckCircle2 size={14} />}
                       </button>
                    </td>
                  </tr>
                )}) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-xs text-text-muted italic">Efetue o cadastro para visualizar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Registration Form */}
      <div className="xl:col-span-4 bento-card">
         <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
             <Plus size={20} />
           </div>
           <h3 className="text-sm font-black text-text-main uppercase tracking-tight">{userForm.id ? 'Editar Usuário' : 'Novo Cadastro'}</h3>
         </div>
         
         {!userForm.id && (
            <div className="mb-4 p-3 bg-app-bg border border-app-border rounded-xl flex gap-3 text-text-muted">
              <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <p className="text-[10px] font-medium leading-tight">
                <strong className="font-bold text-text-main block mb-1">Aviso do Supabase:</strong>
                O cadastro direto exige que a <strong>Trigger do Banco de Dados</strong> esteja ativa para salvar o perfil corretamente. Dependendo da configuração, cadastrar um usuário pode encerrar sua sessão atual como administrador.
              </p>
            </div>
         )}
         
         <form className="space-y-4" onSubmit={handleSaveUser}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome Completo</label>
              <input 
                type="text" 
                required
                placeholder="Ex: João da Silva" 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold text-text-main outline-none focus:border-primary transition-colors"
                value={userForm.fullName}
                onChange={e => setUserForm({...userForm, fullName: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">E-mail corporativo</label>
              <input 
                type="email" 
                required={!userForm.id}
                disabled={!!userForm.id}
                placeholder="email@empresa.com" 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold text-text-main outline-none focus:border-primary transition-colors disabled:opacity-50"
                value={userForm.email}
                onChange={e => setUserForm({...userForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Cargo / Permissão</label>
              <select 
                className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold text-text-main outline-none focus:border-primary transition-colors"
                value={userForm.role}
                onChange={e => setUserForm({...userForm, role: e.target.value})}
              >
                 <option value="driver">Motorista</option>
                 <option value="admin">Administrador</option>
              </select>
            </div>

            {userForm.role === 'driver' && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-app-border bg-app-bg">
                <input 
                  type="checkbox" 
                  id="isInternal"
                  className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                  checked={userForm.isInternal}
                  onChange={e => setUserForm({...userForm, isInternal: e.target.checked})}
                />
                <label htmlFor="isInternal" className="flex flex-col cursor-pointer">
                  <span className="text-[10px] font-bold text-text-main uppercase tracking-widest">Motorista de Pátio (Interno)</span>
                  <span className="text-[9px] font-medium text-text-muted italic">Acesso restrito: Apenas Checklists do tipo Pátio. Não pontua.</span>
                </label>
              </div>
            )}

            {!userForm.id && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Senha Provisória</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  placeholder="••••••••" 
                  className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold text-text-main outline-none focus:border-primary transition-colors"
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                />
              </div>
            )}

            {userForm.role === 'driver' && (
              <div className="pt-2 border-t border-app-border mt-2">
                 <p className="text-[9px] font-medium text-text-muted italic">Configure as capacidades de reboque no cadastro de Veículos.</p>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              {userForm.id && (
                 <button
                   type="button"
                   onClick={() => setUserForm({ id: '', fullName: '', email: '', role: 'driver', password: '' })}
                   className="flex-1 h-12 bg-app-bg text-text-main border border-app-border font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-100 transition-all shadow-sm"
                 >
                   Cancelar
                 </button>
              )}
              <button 
                disabled={saving}
                className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
         </form>
      </div>
    </div>
  );
}
