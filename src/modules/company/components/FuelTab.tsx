import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import AddressFromCoordinates from "@/src/components/common/AddressFromCoordinates";

export default function FuelTab() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFuelSubmissions();
  }, []);

  const fetchFuelSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("checklist_submissions").select("*, profiles(full_name), vehicles(plate)")
        .eq("company_id", user?.company_id)
        .in("type", ["fuel", "Abastecimento"])
        .order("created_at", { ascending: false });
      setSubmissions(data || []);
    } catch (error) {
      console.error("Erro ao buscar abastecimentos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Histórico de Abastecimentos
          </span>
        </div>
        
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden p-4">
          {loading ? (
            <div className="text-center text-xs text-text-muted italic py-10">Carregando...</div>
          ) : submissions.length > 0 ? (
            submissions.map((sub: any) => (
              <div key={sub.id} className="bg-white p-4 rounded-xl border border-app-border flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted">{new Date(sub.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{sub.vehicles?.plate || "N/A"}</span>
                </div>
                <div>
                  <span className="text-sm font-black text-text-main">{sub.profiles?.full_name || "Desconhecido"}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-text-muted">KM: <strong className="text-text-main font-bold">{sub.odometer || "-"}</strong></span>
                  <span className="text-xs font-mono font-bold text-text-main">{sub.vehicles?.plate}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-text-muted italic py-10">Nenhum abastecimento encontrado.</div>
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
                  KM
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : submissions.length > 0 ? (
                submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-text-main">
                      {sub.profiles?.full_name || sub.driver_profiles?.full_name || "N/I"}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-bold text-text-main">
                      {sub.vehicles?.plate}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono font-bold text-text-main">
                      {sub.odometer
                        ? `${sub.odometer.toLocaleString("pt-BR")} km`
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="flex flex-wrap gap-3">
                        {sub.details?.itemValues &&
                        Object.keys(sub.details.itemValues).length > 0 ? (
                          Object.keys(sub.details.itemValues).map((itemId) => {
                            const title =
                              sub.details.itemTitles?.[itemId] || "Item";
                            const value = sub.details.itemValues[itemId];
                            if (!value) return null;

                            // Legacy data check: if they hit 'defect' instead of typing numbers
                            const displayValue =
                              value === "defect" ? "N/A" : value;

                            return (
                              <div
                                key={itemId}
                                className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px]"
                              >
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  {title}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {displayValue}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <>
                            {sub.details?.manual_liters !== undefined && (
                              <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px]">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  Litragem
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {sub.details.manual_liters} L
                                </span>
                              </div>
                            )}
                            {(sub.latitude && sub.longitude) ||
                            sub.details?.location ? (
                              <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px] max-w-[200px]">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                  Posto/Local
                                </span>
                                <span className="text-sm font-bold text-primary truncate">
                                  <AddressFromCoordinates
                                    latitude={sub.latitude}
                                    longitude={sub.longitude}
                                    fallback={sub.details?.location}
                                  />
                                </span>
                              </div>
                            ) : null}
                            {!sub.details?.manual_liters &&
                              !sub.details?.location &&
                              !sub.latitude && (
                                <span className="text-[10px] text-text-muted italic">
                                  Sem detalhes
                                </span>
                              )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-xs text-text-muted italic"
                  >
                    Nenhum abastecimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div></div></div>);
}
