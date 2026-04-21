import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function FuelTab() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFuelSubmissions();
  }, []);

  const fetchFuelSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('checklist_submissions')
        .select('*, profiles(full_name), vehicles(plate)')
        .eq('type', 'fuel')
        .order('created_at', { ascending: false });
      setSubmissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar abastecimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bento-card !p-0 overflow-hidden">
         <div className="p-5 border-b border-app-border">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Histórico de Abastecimentos</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {loading ? (
                   <tr><td colSpan={3} className="px-5 py-10 text-center text-xs text-text-muted italic">Carregando...</td></tr>
                ) : submissions.length > 0 ? submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-bold text-text-main">{sub.vehicles?.plate}</td>
                    <td className="px-5 py-4 text-xs">
                      <div className="flex flex-wrap gap-3">
                        {sub.details?.itemTitles && sub.details?.itemValues ? 
                          Object.keys(sub.details.itemTitles).map(itemId => {
                            const title = sub.details.itemTitles[itemId];
                            const value = sub.details.itemValues[itemId];
                            if (!value) return null;
                            
                            // Legacy data check: if they hit 'defect' instead of typing numbers
                            const displayValue = value === 'defect' ? 'N/A' : value;
                            
                            return (
                              <div key={itemId} className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[100px]">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{title}</span>
                                <span className="text-sm font-bold text-primary">{displayValue}</span>
                              </div>
                            );
                          })
                        : <span className="text-[10px] text-text-muted italic">Sem detalhes</span>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum abastecimento encontrado.</td></tr>
                )}
              </tbody>
             </table>
          </div>
      </div>
    </div>
  );
}
