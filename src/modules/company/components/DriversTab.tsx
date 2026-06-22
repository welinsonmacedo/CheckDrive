import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { CheckCircle2, Search, X, Plus, Key } from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function DriversTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [scoreProfiles, setScoreProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [userForm, setUserForm] = useState({
    id: "",
    fullName: "",
    email: "",
    cpf: "",
    role: "driver",
    password: "",
    driverType: "Interno/Pátio",
    participatesInRanking: true,
    modalityIds: [] as string[],
    scoreProfileId: "",
  });
  const openCreateForm = () => {
    setUserForm({
      id: "",
      fullName: "",
      email: "",
      cpf: "",
      role: "driver",
      password: "",
      driverType: "Interno/Pátio",
      participatesInRanking: true,
      modalityIds: [],
      scoreProfileId: "",
    });
    setShowForm(true);
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data }, { data: modData }, { data: scoreProfilesData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*, score_profiles(name)")
            .eq("role", "driver")
            .order("full_name"),
          supabase.from("vehicle_modalities").select("*").order("name"),
          supabase.from("score_profiles").select("*").order("name"),
        ]);

      setUsers(data || []);
      setModalities(modData || []);
      setScoreProfiles(scoreProfilesData || []);
    } catch (error) {
      console.error("Error fetching drivers data:", error);
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

    const parsedName = userForm.fullName;

    // Create a payload object, wrap in try/catch to gracefully ignore missing columns if user hasn't run schematic yet
    const updatePayload = {
      full_name: parsedName,
      cpf: userForm.cpf || null,
      role: userForm.role,
      driver_type: userForm.driverType,
      participates_in_ranking: userForm.participatesInRanking,
      modality_ids: userForm.modalityIds,
      score_profile_id: userForm.scoreProfileId || null,
    };

    try {
      if (userForm.id) {
        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", userForm.id);

        if (error) {
          // fallback if columns don't exist
          await supabase
            .from("profiles")
            .update({
              full_name: parsedName,
              cpf: userForm.cpf || null,
              role: userForm.role,
            })
            .eq("id", userForm.id);
        }
      } else {
        const isAllowed = await checkUserLimit();
        if (!isAllowed) {
          setSaving(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              full_name: parsedName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: data.user.id,
                email: userForm.email,
                active: true,
                ...updatePayload,
              },
              { onConflict: "id" },
            );

          if (profileError) {
            console.warn(
              "Could not upsert profile directly (possibly RLS)",
              profileError,
            );

            await supabase
              .from("profiles")
              .update(updatePayload)
              .eq("id", data.user.id);
          }

          if (userForm.role === "driver" && userForm.participatesInRanking) {
            await supabase
              .from("driver_performance")
              .upsert(
                { driver_id: data.user.id, score: 1000 },
                { onConflict: "driver_id" },
              );
          }
        }
      }

      setUserForm({
        id: "",
        fullName: "",
        email: "",
        cpf: "",
        role: "driver",
        password: "",
        driverType: "Interno/Pátio",
        participatesInRanking: true,
        modalityIds: [],
        scoreProfileId: "",
      });

      setShowForm(false);

      fetchUsers();

      alert(
        `Usuário ${userForm.id ? "atualizado" : "cadastrado"} com sucesso!`,
      );
    } catch (error: any) {
      alert("Erro: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) {
      alert("Usuário não possui e-mail cadastrado.");
      return;
    }

    if (
      !window.confirm(
        `Deseja enviar um e-mail de redefinição de senha para ${email}?`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      alert(`E-mail de redefinição enviado para ${email}.`);
    } catch (error: any) {
      console.error("Reset password error:", error);
      alert("Erro ao enviar e-mail de redefinição. Detalhes: " + error.message);
    }
  };

  const checkUserLimit = async (): Promise<boolean> => {
    if (!user?.company_id) return true;
    try {
      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .select("max_users")
        .eq("id", user.company_id)
        .single();

      if (companyErr || !company) {
        console.warn(
          "Could not fetch company limits, skipping check.",
          companyErr,
        );
        return true;
      }

      const { count, error: countErr } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user.company_id)
        .eq("active", true);

      if (countErr) {
        console.warn(
          "Could not query profiles count, skipping check.",
          countErr,
        );
        return true;
      }

      const limit = company.max_users || 10;
      if ((count || 0) >= limit) {
        alert(
          `Limite de usuários do seu plano atingido (${limit} usuários). Entre em contato para fazer um upgrade.`,
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error checking user limits:", e);
      return true;
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (
      !window.confirm(
        `Deseja ${currentStatus ? "desabilitar" : "habilitar"} este registro?`,
      )
    )
      return;

    try {
      if (!currentStatus) {
        const isAllowed = await checkUserLimit();
        if (!isAllowed) return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      fetchUsers();
    } catch (error: any) {
      console.error("Toggle status error:", error);
      alert("Erro ao alterar status. Detalhes: " + error.message);
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  Tipo de Motorista
                </th>

                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-app-border">
              {users
                .filter(
                  (u) =>
                    u.full_name
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((user) => {
                  const cleanName = user.full_name;

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
                        {user.email || "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-700`}
                        >
                          {user.driver_type || "Interno/Pátio"}
                        </span>

                        {user.score_profiles && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                            {user.score_profiles.name}
                          </span>
                        )}

                        {!user.participates_in_ranking && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-500">
                            Sem Pontuação
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => handleResetPassword(user.email)}
                          title="Redefinir Senha"
                          className="p-1.5 rounded-lg text-text-muted hover:bg-zinc-100 hover:text-primary transition-colors"
                        >
                          <Key size={16} />
                        </button>

                        <button
                          onClick={() => {
                            setUserForm({
                              id: user.id,
                              fullName: cleanName || "",
                              email: user.email || "",
                              cpf: user.cpf || "",
                              role: "driver",
                              password: "",
                              driverType: user.driver_type || "Interno/Pátio",
                              participatesInRanking:
                                user.participates_in_ranking !== false,
                              modalityIds: user.modality_ids || [],
                              scoreProfileId: user.score_profile_id || "",
                            });

                            setShowForm(true);

                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
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
                  {userForm.id ? "Editar Usuário" : "Novo Cadastro"}
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
                onChange={(e) =>
                  setUserForm({ ...userForm, fullName: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                required={!userForm.id}
                disabled={!!userForm.id}
              />

              <input
                type="text"
                placeholder="CPF"
                value={userForm.cpf}
                onChange={(e) =>
                  setUserForm({ ...userForm, cpf: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              {!userForm.id && (
                <input
                  type="password"
                  placeholder="Senha"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              )}

              <select
                value={userForm.driverType}
                onChange={(e) =>
                  setUserForm({ ...userForm, driverType: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Interno/Pátio">Interno / Pátio</option>
                <option value="Distribuição">Distribuição</option>
                <option value="Transferência">Transferência</option>
                <option value="Admin">Admin</option>
              </select>

              <select
                value={userForm.scoreProfileId}
                onChange={(e) =>
                  setUserForm({ ...userForm, scoreProfileId: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Selecione um Perfil de Pontuação</option>
                {scoreProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {modalities.length > 0 && (
                <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-app-border">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Modalidades Permitidas
                  </span>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {modalities.map((mod) => (
                      <label
                        key={mod.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                          checked={userForm.modalityIds.includes(mod.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm({
                                ...userForm,
                                modalityIds: [...userForm.modalityIds, mod.id],
                              });
                            } else {
                              setUserForm({
                                ...userForm,
                                modalityIds: userForm.modalityIds.filter(
                                  (id) => id !== mod.id,
                                ),
                              });
                            }
                          }}
                        />
                        <span className="text-xs font-bold text-text-main">
                          {mod.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={userForm.participatesInRanking}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      participatesInRanking: e.target.checked,
                    })
                  }
                />
                Participa da Pontuação (Ranking)
              </label>

              <button
                disabled={saving}
                className="w-full h-11 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition"
              >
                {saving
                  ? "Salvando..."
                  : userForm.id
                    ? "Atualizar Usuário"
                    : "Cadastrar Usuário"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
