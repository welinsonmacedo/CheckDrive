import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PrintHeader from "./PrintHeader";

interface DefectPrintModalProps {
  defect: any;
  onClose: () => void;
}

export default function DefectPrintModal({
  defect,
  onClose,
}: DefectPrintModalProps) {
  useEffect(() => {
    if (defect) {
      document.body.classList.add("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [defect]);

  if (!defect) return null;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible"
        >
          {/* Header - Screen Only */}
          <div className="p-6 border-b border-app-border flex justify-between items-center bg-zinc-50/50 print:hidden">
            <h2 className="text-lg font-black text-text-main tracking-tight flex items-center gap-2">
              <Printer className="text-primary" size={24} />
              Visualização de Impressão
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer size={16} /> Imprimir Ficha
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-app-border text-text-muted hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 overflow-y-auto print:overflow-visible print:block print:p-0">
            <PrintHeader />
            {/* Report Header */}
            <div className="mb-8 border-b-2 border-zinc-200 pb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-red-500" size={28} />
                  Ficha de Ocorrência / Defeito
                </h1>
                <p className="text-sm font-bold text-zinc-500 tracking-widest uppercase">
                  Relatório de Manutenção do Veículo
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                  Status
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${
                    defect.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {defect.status === "resolved" ? (
                    <>
                      <CheckCircle2 size={14} /> Resolvido
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} /> Pendente
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8 mt-4">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Data da Ocorrência
                </p>
                <p className="text-lg font-bold text-zinc-900">
                  {format(
                    parseISO(defect.created_at),
                    "dd 'de' MMMM 'de' yyyy, 'às' HH:mm",
                    { locale: ptBR },
                  )}
                </p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                  <Truck size={12} /> Veículo / Reboque Envolvido
                </p>
                <p className="text-lg font-bold text-zinc-900">
                  {defect.vehicles?.plate
                    ? defect.trailers?.plate
                      ? `${defect.vehicles.plate} / ${defect.trailers.plate}`
                      : defect.vehicles.plate
                    : defect.trailers?.plate || "Não Registrado"}
                </p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1">
                  <User size={12} /> Motorista Responsável
                </p>
                <p className="text-lg font-bold text-zinc-900">
                  {defect.profiles?.full_name || "Desconhecido"}
                </p>
              </div>
            </div>

            {/* Defect Description */}
            <div className="mb-8 p-6 bg-white border-2 border-red-100 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-1">
                <FileText size={12} /> Título do Defeito Detectado
              </p>
              <h3 className="text-xl font-bold text-zinc-900 mb-4">
                {defect.item_title}
              </h3>

              <div className="pt-4 border-t border-red-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">
                  Descrição / Observações do Motorista
                </p>
                <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {defect.description || (
                    <span className="italic text-zinc-400">
                      Nenhuma observação detalhada.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Resolution Block */}
            {defect.status === "resolved" && (
              <div className="mb-8 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Dados da Resolução
                </p>
                <div className="space-y-4">
                  {defect.resolved_at && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                        Data da Resolução
                      </p>
                      <p className="text-sm font-bold text-zinc-900">
                        {format(
                          parseISO(defect.resolved_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR },
                        )}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                      Notas do Mecânico / Responsável
                    </p>
                    <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {defect.resolution_notes || (
                        <span className="italic text-zinc-400">
                          Resolvido sem notas adicionais.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-16 pt-8 border-t border-zinc-200 grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="w-full border-b border-zinc-400 mb-2"></div>
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  Assinatura do Motorista
                </p>
              </div>
              <div className="text-center">
                <div className="w-full border-b border-zinc-400 mb-2"></div>
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  Assinatura da Manutenção
                </p>
              </div>
            </div>

            <div className="mt-8 text-center print:block">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Gerado em: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
