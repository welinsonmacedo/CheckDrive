import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function MyDrivers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*, driver_modalities(modality_id)")
        .eq("company_id", user?.company_id)
        .order("full_name");
      setUsers(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted font-bold text-xs">
        Carregando motoristas...
      </div>
    );
  }

  const filteredUsers = users.filter((u) => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const currentUser = filteredUsers[currentUserIndex];

  return (
    <div className="p-6 max-w-2xl mx-auto py-10">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Motoristas</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-64 border border-app-border" 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentUserIndex(0); }}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-text-muted font-bold text-xs bg-app-bg rounded-2xl border border-app-border">
          Nenhum motorista encontrado para este filtro.
        </div>
      ) : (
        <div className="relative bento-card p-6 flex flex-col gap-6 group">
          {filteredUsers.length > 1 && (
            <>
              <button onClick={() => setCurrentUserIndex(prev => (prev === 0 ? filteredUsers.length - 1 : prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all">
                <ChevronLeft size={20}/>
              </button>
              <button onClick={() => setCurrentUserIndex(prev => (prev === filteredUsers.length - 1 ? 0 : prev + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all">
                <ChevronRight size={20}/>
              </button>
            </>
          )}
          
          <div className="flex flex-col md:flex-row gap-8 px-4 md:px-10">
            <div className="w-full md:w-1/3 space-y-4">
              <div className="aspect-square bg-slate-100 rounded-2xl border border-app-border overflow-hidden flex items-center justify-center">
                {currentUser?.photo_url ? (
                  <img src={supabase.storage.from("driver-docs").getPublicUrl(currentUser.photo_url).data.publicUrl} alt="Foto" className="w-full h-full object-cover"/>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <User size={24} className="opacity-50"/>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Sem foto
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-black text-text-main uppercase tracking-tight">
                    {currentUser?.full_name}
                  </h3>
                  {!currentUser?.active && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600">Inativo</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                    {currentUser?.role === 'admin' ? 'Administrador' : 'Motorista'}
                  </span>
                  {currentUser?.driver_type && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                      {currentUser.driver_type}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mail</span>
                  <span className="text-[11px] font-bold text-text-main">{currentUser?.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CPF</span>
                  <span className="text-[11px] font-bold text-text-main">{currentUser?.cpf || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CNH</span>
                  <span className="text-[11px] font-bold text-text-main">{currentUser?.cnh_number || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoria CNH</span>
                  <span className="text-[11px] font-bold text-text-main">{currentUser?.cnh_category || '-'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-300 tracking-widest">
            {currentUserIndex + 1} de {filteredUsers.length}
          </div>
        </div>
      )}
    </div>
  );
}
