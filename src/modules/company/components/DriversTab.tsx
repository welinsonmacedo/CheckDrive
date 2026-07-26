import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Search, X, Plus, Key, ChevronLeft, ChevronRight, Edit2, User } from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import { logSystemAudit } from "@/src/lib/systemAuditService";

export default function DriversTab() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [scoreProfiles, setScoreProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docCnhFile, setDocCnhFile] = useState<File | null>(null);
  const [userForm, setUserForm] = useState({
    id: "",
    fullName: "",
    email: "",
    cpf: "",
    cnhNumber: "",
    cnhCategory: "",
    cnhExpirationDate: "",
    cnhFirstDate: "",
    photoUrl: "",
    docCnhUrl: "",
    role: "driver",
    password: "",
    driverType: "Interno/Pátio",
    participatesInRanking: true,
    modalityIds: [] as string[],
    scoreProfileId: "",
    isAuthUser: true,
  });
  const openCreateForm = () => {
    setUserForm({
      id: "",
      fullName: "",
      email: "",
      cpf: "",
      cnhNumber: "",
      cnhCategory: "",
      cnhExpirationDate: "",
      cnhFirstDate: "",
      photoUrl: "",
      docCnhUrl: "",
      role: "driver",
      password: "",
      driverType: "Interno/Pátio",
      participatesInRanking: true,
      modalityIds: [] as string[],
      scoreProfileId: "",
      isAuthUser: true,
    });
    setShowForm(true);
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data }, { data: modData }, { data: scoreProfilesData }] =
        await Promise.all([
          supabase.from("profiles").select("*, score_profiles(name)")
            .eq("company_id", user?.company_id)
            .eq("role", "driver")
            .order("full_name"),
          supabase.from("vehicle_modalities").select("*").eq("company_id", user?.company_id).order("name"),
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
    const uploadPhoto = async () => {
      if (!photoFile) return userForm.photoUrl;
      const ext = photoFile.name.split('.').pop();
      const fileName = `${user?.company_id}_${Date.now()}_avatar.${ext}`;
      const { data, error } = await supabase.storage.from("driver-docs").upload(fileName, photoFile);
      if (error) {
        if (error.message.includes("Bucket not found")) alert("Crie o bucket 'driver-docs' no Storage.");
        return userForm.photoUrl;
      }
      return data.path;
    };
    
    const uploadDocCnh = async () => {
      if (!docCnhFile) return userForm.docCnhUrl;
      const ext = docCnhFile.name.split('.').pop();
      const fileName = `${user?.company_id}_${Date.now()}_cnh.${ext}`;
      const { data, error } = await supabase.storage.from("driver-docs").upload(fileName, docCnhFile);
      if (error) {
        return userForm.docCnhUrl;
      }
      return data.path;
    };
    
    const newPhotoUrl = await uploadPhoto();
    const newDocCnhUrl = await uploadDocCnh();
    
    const updatePayload: any = {
      full_name: parsedName,
      cpf: userForm.cpf || null,
      cnh_number: userForm.cnhNumber || null,
      cnh_category: userForm.cnhCategory || null,
      cnh_expiration_date: userForm.cnhExpirationDate || null,
      cnh_first_date: userForm.cnhFirstDate || null,
      photo_url: newPhotoUrl || null,
      doc_cnh_url: newDocCnhUrl || null,
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
          console.error("Update Error in DriversTab:", error);
          const { error: fallbackError } = await supabase
            .from("profiles")
            .update({
              full_name: parsedName,
              cpf: userForm.cpf || null,
              role: userForm.role,
              driver_type: userForm.driverType,
              participates_in_ranking: userForm.participatesInRanking,
              modality_ids: userForm.modalityIds,
              score_profile_id: userForm.scoreProfileId || null,
            })
            .eq("id", userForm.id);
            
          if (fallbackError) {
             console.error("Fallback Update Error:", fallbackError);
             throw fallbackError;
          }
        }

        logSystemAudit({
          company_id: user?.company_id,
          module: "Motoristas",
          entity: "profiles",
          entity_id: userForm.id,
          action: "EDITAR",
          new_value: updatePayload,
          reason: `Motorista [${parsedName}] teve seu cadastro atualizado.`,
        });
      } else {
        const isAllowed = await checkUserLimit();
        if (!isAllowed) {
          setSaving(false);
          return;
        }

        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          }
        );

        let emailToUse = userForm.email;
        let passwordToUse = userForm.password;

        if (!userForm.isAuthUser) {
          emailToUse = `driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@noemail.local`;
          passwordToUse = "Pw@" + btoa(emailToUse).replace(/[^a-zA-Z0-9]/g, "").substring(0, 10) + "Xy9";
        }

        const { data, error } = await tempClient.auth.signUp({
          email: emailToUse,
          password: passwordToUse,
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
                email: emailToUse,
                active: true,
                company_id: user?.company_id || null,
                ...updatePayload,
              },
              { onConflict: "id" }
            );

          if (profileError) {
            console.warn("Could not upsert profile directly, trying fallback:", profileError);
            await supabase.from("profiles").update({
              full_name: parsedName,
              cpf: userForm.cpf || null,
              role: userForm.role,
              driver_type: userForm.driverType,
              participates_in_ranking: userForm.participatesInRanking,
              modality_ids: userForm.modalityIds,
              score_profile_id: userForm.scoreProfileId || null,
            }).eq("id", data.user.id);
          }

          if (userForm.role === "driver" && userForm.participatesInRanking) {
            await supabase
              .from("driver_performance")
              .upsert(
                { driver_id: data.user.id, score: 1000 },
                { onConflict: "driver_id" }
              );
          }

          logSystemAudit({
            company_id: user?.company_id,
            module: "Motoristas",
            entity: "profiles",
            entity_id: data.user.id,
            action: "CRIAR",
            new_value: { email: emailToUse, name: parsedName, ...updatePayload },
            reason: `Novo motorista [${parsedName}] foi cadastrado.`,
          });
        }
      }

      setUserForm({
      id: "",
      fullName: "",
      email: "",
      cpf: "",
      cnhNumber: "",
      cnhCategory: "",
      cnhExpirationDate: "",
      cnhFirstDate: "",
      photoUrl: "",
      docCnhUrl: "",
      role: "driver",
        password: "",
        driverType: "Interno/Pátio",
        participatesInRanking: true,
        modalityIds: [],
        scoreProfileId: "",
        isAuthUser: true,
      });
      setPhotoFile(null);
      setDocCnhFile(null);
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
      logSystemAudit({
        company_id: user?.company_id,
        module: "Motoristas",
        entity: "profiles",
        action: "RESET_SENHA",
        reason: `Solicitada redefinição de senha para o e-mail [${email}].`,
      });
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

      const { count, error: countErr } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", user?.company_id)
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

      logSystemAudit({
        company_id: user?.company_id,
        module: "Motoristas",
        entity: "profiles",
        entity_id: id,
        action: currentStatus ? "EXCLUIR" : "RESTAURAR",
        old_value: { active: currentStatus },
        new_value: { active: !currentStatus },
        reason: `Motorista ID [${id}] foi ${currentStatus ? "desabilitado (excluído)" : "reativado (restaurado)"}.`,
      });

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

  const filteredUsers = users.filter((u) => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentUser = filteredUsers[currentUserIndex];

  return (
    <div className="flex-1 gap-6 items-start">
      {/* LISTA */}
      <div className="xl:col-span-8 bento-card !p-0">
        <div className="p-5 border-b border-app-border flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Motoristas / Usuários ({filteredUsers.length})
          </span>

          <div className="flex items-center justify-end gap-2 sm:gap-4 flex-wrap w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-64 border border-app-border"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentUserIndex(0);
                }}
              />
            </div>
            
            <button
              onClick={openCreateForm}
              className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
            >
              <Plus size={14} /> Novo
            </button>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Search className="text-slate-300" size={24} />
            </div>
            <p className="text-text-muted text-sm font-bold">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative bg-white flex flex-col md:flex-row min-h-[400px]">
            {filteredUsers.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentUserIndex(prev => (prev === 0 ? filteredUsers.length - 1 : prev - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentUserIndex(prev => (prev === filteredUsers.length - 1 ? 0 : prev + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <div className="flex flex-col md:flex-row gap-8 px-4 md:px-12 py-8 w-full max-w-4xl mx-auto">
              <div className="w-full md:w-1/3 space-y-4">
                <div className="aspect-square bg-slate-100 rounded-2xl border border-app-border overflow-hidden flex items-center justify-center">
                  {currentUser.photo_url ? (
                    <img
                      src={((currentUser.photo_url)?.startsWith('http') ? (currentUser.photo_url) : supabase.storage.from('driver-docs').getPublicUrl(currentUser.photo_url).data.publicUrl)}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <User size={24} className="opacity-50" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        Sem Foto
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight mb-2">
                      {currentUser.full_name}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentUser.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {currentUser.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">
                      {currentUser.driver_type || "Interno/Pátio"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-app-border">
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">E-mail</span>
                      <span className="text-sm font-black text-text-main break-all">
                        {currentUser.email || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">CPF</span>
                      <span className="text-sm font-black text-text-main">
                        {currentUser.cpf || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">CNH</span>
                      <span className="text-sm font-black text-text-main">
                        {currentUser.cnh_number || "N/A"} - {currentUser.cnh_category || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">1ª Habilitação</span>
                      <span className="text-sm font-black text-text-main">
                        {currentUser.cnh_first_date ? new Date(currentUser.cnh_first_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Validade CNH</span>
                      <span className="text-sm font-black text-text-main">
                        {currentUser.cnh_expiration_date ? new Date(currentUser.cnh_expiration_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Perfil de Pontuação</span>
                      <span className="text-sm font-black text-text-main">
                        {currentUser.score_profiles?.name || "N/A"}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Modalidades</span>
                      <span className="text-sm font-black text-text-main uppercase">
                        {currentUser.modality_ids && currentUser.modality_ids.length > 0 
                          ? currentUser.modality_ids.map((id) => modalities.find(m => m.id === id)?.name || id).join(", ")
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Ranking</span>
                      <span className="text-sm font-black text-text-main uppercase">
                        {currentUser.participates_in_ranking !== false ? "Participa" : "Não Participa"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-app-border mt-4">
                    <h4 className="text-[10px] font-black uppercase text-text-muted tracking-wider mb-3">Documentos Anexados (PDF/Fotos)</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentUser.photo_url && (
                        <a href={((currentUser.photo_url)?.startsWith('http') ? (currentUser.photo_url) : supabase.storage.from('driver-docs').getPublicUrl(currentUser.photo_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 Foto do Motorista</a>
                      )}
                      {currentUser.doc_cnh_url && (
                        <a href={((currentUser.doc_cnh_url)?.startsWith('http') ? (currentUser.doc_cnh_url) : supabase.storage.from('driver-docs').getPublicUrl(currentUser.doc_cnh_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 CNH</a>
                      )}
                      {!currentUser.photo_url && !currentUser.doc_cnh_url && (
                        <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-6 border-t border-app-border mt-6">
                  {currentUser.email && (
                    <button
                      onClick={() => handleResetPassword(currentUser.email)}
                      className="flex-1 h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors"
                      title="Redefinir Senha"
                    >
                      <Key size={16} /> Senha
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUserForm({
                        id: currentUser.id,
                        fullName: currentUser.full_name || "",
                        email: currentUser.email || "",
                        cpf: currentUser.cpf || "",
                        cnhNumber: currentUser.cnh_number || "",
                        cnhCategory: currentUser.cnh_category || "",
                        cnhExpirationDate: currentUser.cnh_expiration_date || "",
                        cnhFirstDate: currentUser.cnh_first_date || "",
                        photoUrl: currentUser.photo_url || "",
                        docCnhUrl: currentUser.doc_cnh_url || "",
                        role: "driver",
                        password: "",
                        driverType: currentUser.driver_type || "Interno/Pátio",
                        participatesInRanking: currentUser.participates_in_ranking !== false,
                        modalityIds: currentUser.modality_ids || [],
                        scoreProfileId: currentUser.score_profile_id || "",
                        isAuthUser: !!currentUser.email,
                      });
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button
                    onClick={() => toggleStatus(currentUser.id, currentUser.active !== false)}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${currentUser.active !== false ? "bg-red-50 text-danger hover:bg-red-100" : "bg-green-50 text-success hover:bg-green-100"}`}
                    title={currentUser.active !== false ? "Desabilitar" : "Habilitar"}
                  >
                    {currentUser.active !== false ? <X size={18} /> : <CheckCircle2 size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-300 tracking-widest">
              {currentUserIndex + 1} de {filteredUsers.length}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />

          {/* MODAL */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-4 sm:p-8 animate-fade-in">
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

              {!userForm.id && (
                <label className="flex items-center gap-3 text-sm text-text-muted select-none border border-app-border bg-app-bg/20 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary"
                    checked={userForm.isAuthUser}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        isAuthUser: e.target.checked,
                      })
                    }
                  />
                  <div>
                    <span className="font-bold text-text-main block text-xs">Vincular Usuário de Login (E-mail e Senha)</span>
                    <span className="text-[11px] text-text-muted">Deixe marcado se o motorista precisar acessar o aplicativo. Desmarque para apenas cadastrar.</span>
                  </div>
                </label>
              )}

              {userForm.isAuthUser && (
                <input
                  type="email"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                  required={userForm.isAuthUser && !userForm.id}
                  disabled={!!userForm.id}
                />
              )}

              <input
                type="text"
                placeholder="CPF"
                value={userForm.cpf}
                onChange={(e) =>
                  setUserForm({ ...userForm, cpf: e.target.value })
                }
                className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="CNH"
                  value={userForm.cnhNumber}
                  onChange={(e) =>
                    setUserForm({ ...userForm, cnhNumber: e.target.value })
                  }
                  className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Categoria Habilitação"
                  value={userForm.cnhCategory}
                  onChange={(e) =>
                    setUserForm({ ...userForm, cnhCategory: e.target.value })
                  }
                  className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest pl-2 block">1ª Habilitação</label>
                  <input
                    type="date"
                    value={userForm.cnhFirstDate}
                    onChange={(e) =>
                      setUserForm({ ...userForm, cnhFirstDate: e.target.value })
                    }
                    className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest pl-2 block">Validade CNH</label>
                  <input
                    type="date"
                    value={userForm.cnhExpirationDate}
                    onChange={(e) =>
                      setUserForm({ ...userForm, cnhExpirationDate: e.target.value })
                    }
                    className="w-full h-11 px-4 rounded-lg border border-app-border bg-app-bg text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                 <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest pl-2 block">Documento CNH (PDF/Foto)</label>
                 <div className="flex items-center gap-4 bg-app-bg border border-app-border p-2 rounded-lg">
                   {userForm.docCnhUrl && !docCnhFile && (
                     <a href={((userForm.docCnhUrl)?.startsWith('http') ? (userForm.docCnhUrl) : supabase.storage.from('driver-docs').getPublicUrl(userForm.docCnhUrl).data.publicUrl)} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">Ver CNH atual</a>
                   )}
                   <input
                     type="file"
                     accept=".pdf,image/*"
                     onChange={(e) =>
                       setDocCnhFile(e.target.files?.[0] || null)
                     }
                     className="w-full file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-black file:uppercase file:tracking-widest file:bg-primary file:text-white hover:file:opacity-90"
                   />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest pl-2 block">Documento CNH (PDF/Foto)</label>
                 <div className="flex items-center gap-4 bg-app-bg border border-app-border p-2 rounded-lg">
                   {userForm.photoUrl && !photoFile && (
                     <img src={((userForm.photoUrl)?.startsWith('http') ? (userForm.photoUrl) : supabase.storage.from('driver-docs').getPublicUrl(userForm.photoUrl).data.publicUrl)} alt="Foto" className="w-10 h-10 rounded-full object-cover border border-app-border" />
                   )}
                   <input
                     type="file"
                     accept="image/*"
                     onChange={(e) =>
                       setPhotoFile(e.target.files?.[0] || null)
                     }
                     className="w-full file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-black file:uppercase file:tracking-widest file:bg-primary file:text-white hover:file:opacity-90"
                   />
                 </div>
              </div>

              {!userForm.id && userForm.isAuthUser && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
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
