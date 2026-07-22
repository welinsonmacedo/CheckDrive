import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Wrench,
  Clock,
  Calendar,
  Gauge,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  DollarSign,
  User,
  Receipt,
  Camera,
  Tag,
  AlertCircle,
  Eye,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import IssueDetailsModal from "./IssueDetailsModal";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface AlertHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: any;
}

export default function AlertHistoryModal({
  isOpen,
  onClose,
  alert: alertItem,
}: AlertHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssueDetails, setSelectedIssueDetails] = useState<any | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && alertItem) {
      fetchHistory();
    }
  }, [isOpen, alertItem]);

  const fetchHistory = async () => {
    if (!alertItem) return;
    setLoading(true);
    try {
      // Build search conditions for checklist_issues
      // 1. Where auto_alert_id = alertItem.id
      // 2. OR vehicle_id = alertItem.target_vehicle_id and status = resolved
      let query = supabase
        .from("checklist_issues")
        .select(`
          *,
          vehicles (id, plate, model),
          trailers (id, plate),
          profiles (id, full_name),
          resolver:resolved_by (id, full_name)
        `)
        .eq("status", "resolved");

      if (alertItem.id && alertItem.target_vehicle_id) {
        query = query.or(
          `auto_alert_id.eq.${alertItem.id},and(vehicle_id.eq.${alertItem.target_vehicle_id},item_title.ilike.%${alertItem.title.trim()}%)`
        );
      } else if (alertItem.id) {
        query = query.eq("auto_alert_id", alertItem.id);
      } else if (alertItem.target_vehicle_id) {
        query = query.eq("vehicle_id", alertItem.target_vehicle_id);
      }

      const { data, error } = await query.order("resolved_at", { ascending: false });

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (err) {
      console.error("Error fetching alert history:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !alertItem) return null;

  const vehiclePlate = alertItem.vehicles?.plate || alertItem.target_vehicle_plate || "Veículo N/A";
  const driverName = alertItem.profiles?.full_name || alertItem.target_driver_name || null;

  // Filtered
  const filteredHistory = historyItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    const titleMatch = (item.item_title || "").toLowerCase().includes(term);
    const notesMatch = (item.resolution_notes || "").toLowerCase().includes(term);
    const nfMatch = (item.resolution_nf || "").toLowerCase().includes(term);
    const categoryMatch = (item.item_category || "").toLowerCase().includes(term);
    return titleMatch || notesMatch || nfMatch || categoryMatch;
  });

  // Calculate KPIs
  const totalCount = historyItems.length;
  const totalCost = historyItems.reduce((acc, curr) => {
    const val = Number(curr.resolution_value) || Number(curr.cost) || 0;
    return acc + val;
  }, 0);
  const avgCost = totalCount > 0 ? totalCost / totalCount : 0;
  const lastResolved = historyItems.length > 0 ? historyItems[0] : null;

  // Export Excel
  const exportExcel = () => {
    const data = filteredHistory.map((item) => ({
      "Data da Baixa": item.resolved_at ? new Date(item.resolved_at).toLocaleDateString("pt-BR") : "-",
      "Horário": item.resolved_at ? new Date(item.resolved_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : "-",
      "Veículo/Placa": item.vehicles?.plate || vehiclePlate,
      "Título/Serviço": item.item_title || "-",
      "Tipo Manutenção": item.resolution_type === "preventiva" ? "Preventiva" : item.resolution_type === "corretiva" ? "Corretiva" : "Geral",
      "Categoria": item.item_category || "-",
      "Custo (R$)": Number(item.resolution_value || item.cost || 0),
      "Nota Fiscal / NF": item.resolution_nf || "-",
      "Tratativa / Observações": item.resolution_notes || "-",
      "Responsável Baixa": item.resolver?.full_name || "Admin",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `Historico_Manutencao_${alertItem.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`HISTÓRICO DE MANUTENÇÃO: ${alertItem.title.toUpperCase()}`, 14, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Alerta: ${alertItem.title} | Veículo: ${vehiclePlate} | Total de Manutenções: ${totalCount} | Custo Acumulado: R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      14,
      22
    );

    const columns = [
      "Data Baixa",
      "Serviço / Alerta",
      "Tipo",
      "Categoria",
      "Custo (R$)",
      "Nota Fiscal",
      "Observações / Tratativa",
      "Responsável",
    ];

    const rows = filteredHistory.map((item) => [
      item.resolved_at ? new Date(item.resolved_at).toLocaleDateString("pt-BR") : "-",
      item.item_title || "-",
      item.resolution_type === "preventiva" ? "Preventiva" : item.resolution_type === "corretiva" ? "Corretiva" : "Geral",
      item.item_category || "-",
      `R$ ${Number(item.resolution_value || item.cost || 0).toFixed(2)}`,
      item.resolution_nf || "-",
      item.resolution_notes || "-",
      item.resolver?.full_name || "Admin",
    ]);

    (doc as any).autoTable({
      startY: 27,
      head: [columns],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`Historico_Manutencao_${alertItem.title.replace(/\s+/g, "_")}.pdf`);
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("checklist-photos").getPublicUrl(path).data.publicUrl;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl border border-app-border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-zinc-900 text-white flex justify-between items-start shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Wrench size={12} /> Histórico de Alerta
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold font-mono">
                {vehiclePlate}
              </span>
              {driverName && (
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                  👤 {driverName}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {alertItem.title}
            </h3>
            <p className="text-xs text-zinc-400">
              Registro completo de todas as baixas e manutenções executadas para esta regra.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="p-4 sm:p-6 bg-zinc-50 border-b border-zinc-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                Total de Baixas
              </span>
              <span className="text-base font-black text-zinc-900">
                {totalCount} {totalCount === 1 ? "execução" : "execuções"}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                Custo Acumulado
              </span>
              <span className="text-base font-black text-emerald-700">
                R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                Última Manutenção
              </span>
              <span className="text-xs font-black text-zinc-900 block truncate">
                {lastResolved?.resolved_at
                  ? new Date(lastResolved.resolved_at).toLocaleDateString("pt-BR")
                  : "Nenhuma"}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Tag size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                Custo Médio
              </span>
              <span className="text-base font-black text-purple-700">
                R$ {avgCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-white border-b border-zinc-200/80 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por serviço, notas, categoria..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={exportExcel}
              disabled={filteredHistory.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={filteredHistory.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-50 border border-rose-200/80 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-50/50">
          {loading ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <Clock className="animate-spin mx-auto text-primary" size={28} />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando histórico de manutenções...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-zinc-200/80 p-8 space-y-3">
              <div className="w-14 h-14 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
                <Wrench size={24} />
              </div>
              <h4 className="text-sm font-bold text-zinc-800">Nenhum registro de manutenção encontrado</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Quando essa regra de alerta for baixada ou resolvida no sistema, o histórico completo com fotos, notas fiscais e custos aparecerá registrado aqui.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const itemValue = Number(item.resolution_value || item.cost || 0);
              let photos: string[] = [];
              if (item.resolution_photos && Array.isArray(item.resolution_photos)) {
                photos = item.resolution_photos;
              } else if (item.photo_url) {
                photos = [item.photo_url];
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-sm space-y-3 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-black text-zinc-900 font-mono">
                        {item.resolved_at
                          ? new Date(item.resolved_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.resolution_type === "preventiva"
                          ? "Preventiva"
                          : item.resolution_type === "corretiva"
                          ? "Corretiva"
                          : "Manutenção Concluída"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {itemValue > 0 && (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                          R$ {itemValue.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedIssueDetails(item)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={12} /> Detalhes / Ficha
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-zinc-900">{item.item_title}</h4>
                      {item.description && (
                        <p className="text-xs text-zinc-600 line-clamp-2">{item.description}</p>
                      )}
                      {item.resolution_notes && (
                        <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 mt-2">
                          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block mb-0.5">
                            Tratativa / Observações da Baixa:
                          </span>
                          <p className="text-xs text-amber-950 font-medium italic">{item.resolution_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      {item.item_category && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 font-bold uppercase text-[10px]">Categoria:</span>
                          <span className="font-bold text-zinc-800">{item.item_category}</span>
                        </div>
                      )}
                      {item.resolution_nf && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 font-bold uppercase text-[10px]">Nota Fiscal / NF:</span>
                          <span className="font-mono font-bold text-zinc-900">{item.resolution_nf}</span>
                        </div>
                      )}
                      {item.resolver?.full_name && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 font-bold uppercase text-[10px]">Responsável:</span>
                          <span className="font-bold text-zinc-800">{item.resolver.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photos */}
                  {photos.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Camera size={12} /> Comprovantes:
                      </span>
                      {photos.map((photo, idx) => {
                        const url = getImageUrl(photo);
                        if (!url) return null;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedPhoto(url)}
                            className="relative group shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 hover:border-primary transition-all shadow-sm"
                          >
                            <img src={url} alt="Comprovante" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={14} className="text-white" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Nested Modal to view full details / print single resolution */}
      {selectedIssueDetails && (
        <IssueDetailsModal
          issue={selectedIssueDetails}
          onClose={() => setSelectedIssueDetails(null)}
        />
      )}

      {/* Photo Enlarge Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={selectedPhoto} alt="Ampliada" className="rounded-2xl max-h-[85vh] object-contain mx-auto" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-4 -right-4 p-2 bg-white text-zinc-900 rounded-full shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
