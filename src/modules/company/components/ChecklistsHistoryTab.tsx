import React, { useState, useEffect } from "react";
import { Search, Trash2, AlertTriangle, X, Edit3 } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ChecklistEditModal from "@/src/modules/company/components/ChecklistEditModal";

interface ChecklistsHistoryTabProps {
  onViewDetails: (sub: any) => void;
}

export default function ChecklistsHistoryTab({
  onViewDetails,
}: ChecklistsHistoryTabProps) {
  const { user } = useAuth();

  const { user: currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [linkedSchedulesToUnlink, setLinkedSchedulesToUnlink] = useState<any[]>(
    [],
  );
  const [unlinkChecked, setUnlinkChecked] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("checklist_submissions").select("*, profiles(full_name), vehicles(plate)")
        .eq("company_id", user?.company_id)
        .order("created_at", { ascending: false });
      setSubmissions(data || []);
    } catch (error) {
      console.error("Erro ao buscar checklists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = async (sub: any) => {
    setDeletingItem(sub);
    setUnlinkChecked(false);
    setLinkedSchedulesToUnlink([]);
    try {
      const { data: linkedSch } = await supabase.from("schedules").select("id").eq("company_id", user?.company_id)
        .or(
          `start_checklist_id.eq.${sub.id},end_checklist_id.eq.${sub.id},fuel_checklist_id.eq.${sub.id}`,
        );
      if (linkedSch && linkedSch.length > 0) {
        setLinkedSchedulesToUnlink(linkedSch);
      }
    } catch (e) {
      console.error("Erro ao buscar vínculos com escalas", e);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      if (linkedSchedulesToUnlink.length > 0) {
        if (!unlinkChecked) {
          alert(
            "Você precisa marcar a opção de desvincular a escala para prosseguir com a exclusão.",
          );
          setIsDeleting(false);
          return;
        }
        for (const sch of linkedSchedulesToUnlink) {
          const { data: q } = await supabase.from("schedules").select("start_checklist_id,end_checklist_id,fuel_checklist_id").eq("company_id", user?.company_id)
            .eq("id", sch.id)
            .single();
          const updates: any = {};
          if (q?.start_checklist_id === deletingItem.id)
            updates.start_checklist_id = null;
          if (q?.end_checklist_id === deletingItem.id)
            updates.end_checklist_id = null;
          if (q?.fuel_checklist_id === deletingItem.id)
            updates.fuel_checklist_id = null;
          if (Object.keys(updates).length > 0) {
            await supabase.from("schedules").update(updates).eq("id", sch.id);
          }
        }
      }

      const { error } = await supabase
        .from("checklist_submissions")
        .delete()
        .eq("id", deletingItem.id);
      if (error) {
        console.error("Erro ao excluir checklist:", error);
        alert(
          "Erro ao excluir checklist. Pode estar vinculado a outros registros.",
        );
      } else {
        setSubmissions((s) => s.filter((x) => x.id !== deletingItem.id));
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    } finally {
      setIsDeleting(false);
      setDeletingItem(null);
    }
  };

  const filtered = submissions.filter(
    (s) =>
      s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Histórico de Envios
          </span>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Filtrar motorista ou placa..."
              className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-64 border border-app-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {loading ? (
            <div className="text-center text-xs text-text-muted italic py-10">Carregando...</div>
          ) : filtered.length > 0 ? (
            filtered.map((sub: any) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-app-border flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-black text-text-main block">{sub.profiles?.full_name}</span>
                    <span className="text-xs font-bold text-text-muted mt-0.5 block">
                      {new Date(sub.details?.adjusted_date || sub.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {sub.vehicles?.plate}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {sub.type === "start" ? "Início de Viagem" : sub.type === "end" ? "Fim de Viagem" : sub.type === "fuel" || sub.type === "Abastecimento" ? "Abastecimento" : sub.type === "yard" ? "Pátio" : sub.type}
                  </span>
                  {sub.details?.is_edited && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest">
                      Editado
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-gray-100">
                  <button onClick={() => onViewDetails(sub)} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors">
                    Detalhes
                  </button>
                  {currentUser?.role === "admin" && (
                    <button onClick={() => handleOpenDelete(sub)} className="px-2 py-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-text-muted italic py-10">Nenhum checklist encontrado.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-app-bg/50">
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Data
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Motorista
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Veículo
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Tipo
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-[10px] font-bold">
                      {new Date(
                        sub.details?.adjusted_date || sub.created_at,
                      ).toLocaleDateString()}{" "}
                      {new Date(
                        sub.details?.adjusted_date || sub.created_at,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">
                      {sub.profiles?.full_name}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono">
                      {sub.vehicles?.plate}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-app-bg rounded text-[10px] font-bold uppercase tracking-widest text-text-muted">
                          {sub.type === "start"
                            ? "Início de Viagem"
                            : sub.type === "end"
                              ? "Fim de Viagem"
                              : sub.type === "fuel" || sub.type === "Abastecimento"
                                ? "Abastecimento"
                                : sub.type === "yard"
                                  ? "Pátio"
                                  : sub.type}
                        </span>
                        {sub.details?.is_edited && (
                          <span
                            className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest"
                            title={`Editado em ${new Date(sub.details.edited_at).toLocaleString()}`}
                          >
                            Editado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewDetails(sub)}
                        className="px-3 py-1.5 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
                      >
                        Detalhes
                      </button>
                      {currentUser?.role === "admin" && (
                        <>
                          <button
                            onClick={() => setEditingSub(sub)}
                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                            title="Editar checklist"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(sub)}
                            className="p-1.5 text-danger/70 hover:text-danger hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-danger/20"
                            title="Excluir checklist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Nenhum envio registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle size={20} className="fill-danger/20" />
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Excluir Checklist
                  </h3>
                </div>
                <button
                  onClick={() => setDeletingItem(null)}
                  className="text-text-muted hover:text-text-main transition-colors"
                  disabled={isDeleting}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-text-muted font-medium mb-6">
                Tem certeza que deseja excluir o checklist de{" "}
                <strong>{deletingItem.profiles?.full_name}</strong> para o
                veículo{" "}
                <strong className="font-mono">
                  {deletingItem.vehicles?.plate}
                </strong>
                ?
                <br />
                <br />
                <span className="text-xs text-danger uppercase tracking-widest font-black">
                  Esta ação não pode ser desfeita.
                </span>
              </p>

              {linkedSchedulesToUnlink.length > 0 && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-bold text-orange-800 mb-2">
                    Atenção: Este checklist está vinculado a uma ou mais
                    escalas.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 bg-white border-orange-300"
                      checked={unlinkChecked}
                      onChange={(e) => setUnlinkChecked(e.target.checked)}
                    />
                    <span className="text-xs text-orange-900 font-medium leading-relaxed">
                      Desvincular o checklist das referidas escalas para
                      permitir a exclusão.
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingItem(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-app-bg text-text-main text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-danger text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? "Excluindo..." : "Sim, Excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSub && (
        <ChecklistEditModal
          submission={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={() => {
            setEditingSub(null);
            fetchSubmissions();
          }}
        />
      )}
    </div>
  );
}
