import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { Search, User } from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function MyDrivers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.company_id) fetchUsers();
  }, [user?.company_id]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "driver")
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

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Motoristas</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
          <input 
            type="text" 
            placeholder="Pesquisar motorista..." 
            className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-80 border border-app-border" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-text-muted font-bold text-xs bg-app-bg rounded-2xl border border-app-border">
          Nenhum motorista encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((driver) => (
            <div key={driver.id} className="bento-card p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-app-border overflow-hidden shrink-0">
                  {driver.photo_url ? (
                    <img src={supabase.storage.from("driver-docs").getPublicUrl(driver.photo_url).data.publicUrl} alt={driver.full_name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-black text-text-main uppercase tracking-tight truncate">
                      {driver.full_name}
                    </h3>
                    {!driver.active && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600 shrink-0">Inativo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">
                      {driver.role === 'admin' ? 'Admin' : 'Motorista'}
                    </span>
                    {driver.driver_type && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">
                        {driver.driver_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-app-border">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mail</span>
                  <span className="text-[10px] font-bold text-text-main truncate block" title={driver.email}>{driver.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CPF</span>
                  <span className="text-[10px] font-bold text-text-main">{driver.cpf || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">CNH</span>
                  <span className="text-[10px] font-bold text-text-main">{driver.cnh_number || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoria</span>
                  <span className="text-[10px] font-bold text-text-main">{driver.cnh_category || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
