import React, { useState, useEffect } from "react";
import { Download, FileText, ChevronDown } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { motion } from "motion/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ClosingHistoryTab() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [closings, setClosings] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchClosings();
  }, []);

  const fetchClosings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("score_closings").select(`
          *,
          closed_by ( full_name).eq("company_id", user?.company_id),
          score_closing_items ( id, driver_id, score, total_checklists, profiles (full_name) )
        `,
        )
        .order("closed_at", { ascending: false });

      setClosings(data || []);
    } catch (error) {
      console.error("Erro ao carregar fechamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const dtStr = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  const exportToExcel = (closing: any) => {
    const data = closing.score_closing_items.map((item: any) => ({
      Motorista: item.profiles?.full_name || "Desconhecido",
      Checklists: item.total_checklists,
      Saldo_Final: item.score,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
    XLSX.writeFile(
      wb,
      `Fechamento_${closing.period_start}_a_${closing.period_end}.xlsx`,
    );
  };

  const exportToPDF = (closing: any) => {
    const doc = new jsPDF();
    doc.text(
      `Relatório de Fechamento: ${formatDate(closing.period_start)} a ${formatDate(closing.period_end)}`,
      14,
      20,
    );
    doc.setFontSize(10);
    doc.text(`Fechado em: ${dtStr(closing.closed_at)}`, 14, 28);

    const tableColumn = ["Motorista", "Checklists", "Saldo Final"];
    const tableRows = closing.score_closing_items.map((item: any) => [
      item.profiles?.full_name || "Desconhecido",
      item.total_checklists,
      item.score,
    ]);

    (doc as any).autoTable({
      startY: 35,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save(`Fechamento_${closing.period_start}_a_${closing.period_end}.pdf`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-text-muted">
        Carregando histórico...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {closings.length === 0 ? (
        <div className="bento-card p-8 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-bold text-text-main mb-2">
            Nenhum fechamento registrado
          </p>
          <p className="text-xs text-text-muted">
            Os saldos resetados nos "Fechamentos de Ciclo" aparecerão aqui.
          </p>
        </div>
      ) : (
        closings.map((closing) => {
          const isExpanded = expandedId === closing.id;

          return (
            <div key={closing.id} className="bento-card !p-0 overflow-hidden">
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : closing.id)}
              >
                <div>
                  <h4 className="text-sm font-black text-text-main">
                    Período: {formatDate(closing.period_start)} a{" "}
                    {formatDate(closing.period_end)}
                  </h4>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    Data do Fechamento:{" "}
                    <strong className="font-bold">
                      {dtStr(closing.closed_at)}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded">
                    {closing.score_closing_items?.length || 0} Motoristas
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                    <ChevronDown size={20} className="text-text-muted" />
                  </motion.div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-app-border bg-zinc-50 p-5">
                  <div className="flex items-center justify-end gap-3 mb-4">
                    <button
                      onClick={() => exportToExcel(closing)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition"
                    >
                      <Download size={14} />
                      Exportar Excel
                    </button>
                    <button
                      onClick={() => exportToPDF(closing)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition"
                    >
                      <FileText size={14} />
                      Exportar PDF
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-app-border bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-app-bg/50">
                        <tr>
                          <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Motorista
                          </th>
                          <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Checklists Realizados
                          </th>
                          <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Saldo Final
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {(closing.score_closing_items || []).map(
                          (item: any) => (
                            <tr key={item.id} className="hover:bg-zinc-50">
                              <td className="px-4 py-2.5 text-xs text-text-main font-bold">
                                {item.profiles?.full_name || "Desconhecido"}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-text-muted font-medium">
                                {item.total_checklists}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-text-main font-black">
                                {item.score} pts
                              </td>
                            </tr>
                          ),
                        )}
                        {(!closing.score_closing_items ||
                          closing.score_closing_items.length === 0) && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-8 text-center text-xs text-text-muted"
                            >
                              Nenhum motorista neste fechamento.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
