import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Calendar, Clock, MapPin, Truck, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from 'qrcode.react';
import PrintHeader from "./PrintHeader";

interface SchedulePrintModalProps {
  schedule: any | null;
  onClose: () => void;
}

export default function SchedulePrintModal({
  schedule,
  onClose,
}: SchedulePrintModalProps) {
  useEffect(() => {
    if (schedule) {
      document.body.classList.add("modal-open-for-print");
    } else {
      document.body.classList.remove("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [schedule]);

  if (!schedule) return null;

  const email = schedule.profiles?.email;
  const pwd = "Pw@" + btoa(email || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 10) + "Xy9";
  const link = `${window.location.origin}/quick-login?e=${encodeURIComponent(email || "")}&p=${encodeURIComponent(pwd)}&s=${schedule.id}`;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dStr: string) => {
    if (!dStr) return "";
    return new Date(dStr).toLocaleDateString("pt-BR") + " " + new Date(dStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto print:overflow-visible print:max-h-none print:shadow-none print:w-full print:max-w-none print:m-0 flex flex-col"
        >
          {/* Header (No Print) */}
          <div className="flex items-center justify-between p-6 border-b border-app-border print:hidden">
            <div>
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <FileText className="text-primary" size={24} />
                Ficha da Escala
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Visualização para impressão da escala de operação.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl text-sm font-bold hover:bg-text-main/90 transition-colors shadow-sm"
              >
                <Printer size={18} />
                Imprimir Ficha
              </button>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:bg-app-bg rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 print:p-0">
            <PrintHeader title="FICHA DA ESCALA DE OPERAÇÃO" />

            <div className="mt-8 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 print:gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Truck size={14} /> Dados Operacionais
                    </h3>
                    <div className="bg-app-bg p-4 rounded-xl border border-app-border print:border-gray-300 print:bg-transparent">
                      <p className="text-sm text-text-muted">Motorista</p>
                      <p className="font-bold text-text-main mb-3">{schedule.profiles?.full_name}</p>
                      
                      <p className="text-sm text-text-muted">Veículo</p>
                      <p className="font-bold text-text-main mb-3">
                        {schedule.vehicles?.plate} {schedule.vehicles?.type && `(${schedule.vehicles?.type})`}
                      </p>

                      {schedule.trailers?.plate && (
                        <>
                          <p className="text-sm text-text-muted">Reboque</p>
                          <p className="font-bold text-text-main">{schedule.trailers?.plate}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Clock size={14} /> Horários
                    </h3>
                    <div className="bg-app-bg p-4 rounded-xl border border-app-border print:border-gray-300 print:bg-transparent">
                      <p className="text-sm text-text-muted">Início Previsto</p>
                      <p className="font-bold text-text-main mb-3">{formatDate(schedule.start_at)}</p>
                      
                      <p className="text-sm text-text-muted">Fim Previsto</p>
                      <p className="font-bold text-text-main">{formatDate(schedule.end_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MapPin size={14} /> Rota e Iscas
                    </h3>
                    <div className="bg-app-bg p-4 rounded-xl border border-app-border print:border-gray-300 print:bg-transparent h-full">
                      <p className="text-sm text-text-muted">Rota</p>
                      <p className="font-bold text-text-main mb-3">
                        {schedule.routes?.origin} ➔ {schedule.routes?.destination}
                      </p>

                      <p className="text-sm text-text-muted">Iscas</p>
                      <div className="space-y-1 mt-1">
                        <p className="text-sm font-medium text-text-main">
                          1: {schedule.bait1?.name || "Não definida"}
                        </p>
                        <p className="text-sm font-medium text-text-main">
                          2: {schedule.bait2?.name || "Não definida"}
                        </p>
                        <p className="text-sm font-medium text-text-main">
                          3: {schedule.bait3?.name || "Não definida"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="mt-8 pt-8 border-t border-app-border flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-bold text-text-main mb-2">Acesso Rápido</h3>
                <p className="text-sm text-text-muted mb-6 max-w-md">
                  Aponte a câmera do celular para o QR Code abaixo para acessar o aplicativo do motorista e iniciar esta escala diretamente.
                </p>
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm inline-block">
                  <QRCodeSVG value={link} size={200} level="H" includeMargin={false} />
                </div>
                <p className="text-xs text-text-muted mt-4 font-mono bg-app-bg p-2 rounded max-w-2xl truncate border border-app-border">
                  {link}
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
