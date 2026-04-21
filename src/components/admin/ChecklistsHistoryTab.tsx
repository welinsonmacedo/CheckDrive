import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChecklistsHistoryTabProps {
  onViewDetails: (sub: any) => void;
}

export default function ChecklistsHistoryTab({ onViewDetails }: ChecklistsHistoryTabProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('checklist_submissions')
        .select('*, profiles(full_name), vehicles(plate)')
        .order('created_at', { ascending: false });
      setSubmissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter(s => 
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.vehicles?.plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bento-card !p-0 overflow-hidden">
         <div className="p-5 border-b border-app-border flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Histórico de Envios</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Filtrar motorista ou placa..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] text-text-main outline-none focus:ring-1 focus:ring-primary w-64 border border-app-border"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Motorista</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Veículo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-text-muted italic">Carregando...</td></tr>
                ) : filtered.length > 0 ? filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-app-bg/30">
                    <td className="px-5 py-4 text-[10px] font-bold">
                      {new Date(sub.created_at).toLocaleDateString()} {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold">{sub.profiles?.full_name}</td>
                    <td className="px-5 py-4 text-xs font-mono">{sub.vehicles?.plate}</td>
                    <td className="px-5 py-4">
                       <span className="px-2 py-1 bg-app-bg rounded text-[10px] font-bold uppercase tracking-widest text-text-muted">{sub.type}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                       <button 
                         onClick={() => onViewDetails(sub)}
                         className="px-3 py-1.5 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-colors"
                       >Detalhes</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-xs text-text-muted italic">Nenhum envio registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
