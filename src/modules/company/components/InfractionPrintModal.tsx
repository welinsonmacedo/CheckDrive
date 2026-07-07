import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInfractionDescription } from "@/src/utils/infractions";

interface InfractionPrintModalProps {
  infraction: any;
  onClose: () => void;
}

export default function InfractionPrintModal({
  infraction,
  onClose,
}: InfractionPrintModalProps) {
  const [selectedTerm, setSelectedTerm] = useState<'both' | 'responsibility' | 'finance'>('both');

  useEffect(() => {
    if (infraction) {
      document.body.classList.add("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [infraction]);

  if (!infraction) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = Number(infraction.amount) || 0;
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);

  const infractionDesc =
    getInfractionDescription(infraction.infraction_code) ||
    infraction.description ||
    "Outra infração";
  const formattedDate = infraction.infraction_date
    ? format(parseISO(infraction.infraction_date), "dd/MM/yyyy", {
        locale: ptBR,
      })
    : "";

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none print:static print:block print:inset-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible print:block"
        >
          {/* Header - Screen Only */}
          <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50 print:hidden">
            <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Printer className="text-red-500" size={24} />
              {selectedTerm === 'both' && "Visualização - Ambos os Termos"}
              {selectedTerm === 'responsibility' && "Visualização - Termo de Responsabilidade"}
              {selectedTerm === 'finance' && "Visualização - Termo Financeiro e RH"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer size={16} /> Imprimir Termo
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document Selector - Screen Only */}
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Selecione o termo para exibir/imprimir:
            </span>
            <div className="flex bg-zinc-200/50 p-1 rounded-xl border border-zinc-300/30">
              <button
                onClick={() => setSelectedTerm('both')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedTerm === 'both'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Ambos (Páginas Separadas)
              </button>
              <button
                onClick={() => setSelectedTerm('responsibility')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedTerm === 'responsibility'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                1. Termo de Responsabilidade
              </button>
              <button
                onClick={() => setSelectedTerm('finance')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedTerm === 'finance'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                2. Termo Financeiro / RH
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 overflow-y-auto print:overflow-visible print:block print:p-8 text-black bg-white print:text-black">
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* SECTION 1: Termo de Responsabilidade e Desconto de Multa */}
              {(selectedTerm === 'both' || selectedTerm === 'responsibility') && (
                <>
                  <div className="text-center font-bold text-xl mb-8 border-b-2 border-black pb-4 uppercase tracking-wider">
                    Termo de Responsabilidade e Desconto de Multa
                  </div>

                  {/* Info Box */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 border-2 border-black p-5 rounded-lg mb-6">
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Condutor
                      </span>
                      <span className="font-bold text-base">
                        {infraction.profiles?.full_name || ""}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Veículo / Placa
                      </span>
                      <span className="font-bold text-base">
                        {infraction.license_plate || ""}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Data da Autuação
                      </span>
                      <span className="font-bold text-base">{formattedDate}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Número da Multa / Auto
                      </span>
                      <span className="font-bold text-base">
                        {infraction.notice_number || ""}
                      </span>
                    </div>
                    <div className="flex flex-col col-span-2">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Infração
                      </span>
                      <span className="font-bold text-base">
                        {infraction.infraction_code} -- {infractionDesc}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        Valor da Multa
                      </span>
                      <span className="font-bold text-base">{formattedAmount}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold border-b border-black pb-4 pt-2">
                    <span>( &nbsp; &nbsp; ) Vou realizar Real Infrator</span>
                    <span>( &nbsp; &nbsp; ) Não vou realizar Real Infrator</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-base uppercase">
                      1. DECLARAÇÃO / INDICAÇÃO DO REAL INFRATOR
                    </h3>
                    <p className="text-sm text-justify leading-relaxed">
                      Por meio deste termo, declaro que{" "}
                      <strong>
                        EU ERA O CONDUTOR DO VEÍCULO NO MOMENTO DA INFRAÇÃO
                      </strong>{" "}
                      e que não realizarei a indicação de outro real infrator.
                    </p>
                    <p className="text-sm text-justify leading-relaxed">
                      Declaro, ainda, que estou ciente de que a não indicação do
                      condutor implicará na cobrança da multa em valor duplicado,
                      conforme as regras de responsabilidade previstas no art. 257
                      do Código de Trânsito Brasileiro (CTB).
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold text-base uppercase">2. VALORES</h3>
                    <div className="text-sm space-y-2">
                      <p>
                        • Valor Multa: <strong>{formattedAmount}</strong>
                      </p>
                      <p>
                        • Valor da Multa por Não Identificação do Condutor (NIC):
                        _________________
                      </p>
                    </div>
                    <p className="text-sm italic">
                      Declaro estar ciente dos valores acima descritos.
                    </p>

                    <div className="pt-8 pb-4">
                      <div className="border-t border-black w-3/4 mx-auto pt-2 text-center text-sm font-medium">
                        Assinatura do Condutor
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-black"></div>

                  <div className="space-y-4 pt-4 print:break-inside-avoid">
                    <h3 className="font-bold text-base uppercase">
                      3. AUTORIZAÇÃO DE DESCONTO EM FOLHA
                    </h3>
                    <p className="text-sm leading-relaxed">
                      ( &nbsp; &nbsp; ) Autorizo o desconto do valor referente à
                      multa, conforme opção assinalada acima, diretamente em minha
                      folha de pagamento.
                    </p>
                    <div className="pt-10 pb-4">
                      <div className="border-t border-black w-3/4 mx-auto pt-2 text-center text-sm font-medium">
                        Assinatura do Condutor
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-black"></div>

                  <div className="space-y-4 pt-4 print:break-inside-avoid">
                    <h3 className="font-bold text-base uppercase">
                      4. ASSINATURA (EMPRESA)
                    </h3>

                    <div className="grid grid-cols-2 gap-8 pt-6 pb-2">
                      <div className="space-y-8">
                        <p className="text-sm">
                          Responsável: _____________________________________
                        </p>
                        <p className="text-sm">Data: _____ / _____ / _________</p>
                      </div>
                      <div className="pt-2">
                        <div className="border-t border-black w-full pt-2 text-center text-sm font-medium mt-10">
                          Assinatura (Empresa)
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Page Break / Separator for both terms */}
              {selectedTerm === 'both' && (
                <>
                  <div className="border-b-2 border-black border-dashed my-8 print:hidden"></div>
                  <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>
                </>
              )}

              {/* SECTION 2: Termo Financeiro RH */}
              {(selectedTerm === 'both' || selectedTerm === 'finance') && (
                <div className="space-y-6 pt-2 pb-12 bg-zinc-50 print:bg-white p-6 rounded-lg border-2 border-black print:break-inside-avoid">
                  <h3 className="font-bold text-lg text-center uppercase tracking-widest border-b border-black pb-4">
                    TERMO FINANCEIRO RH
                  </h3>

                  <div className="grid grid-cols-3 gap-4 text-sm font-medium pt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 uppercase">
                        Multa
                      </span>{" "}
                      <span className="font-bold">
                        {infraction.notice_number || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col col-span-2">
                      <span className="text-xs text-zinc-500 uppercase">
                        Motorista
                      </span>{" "}
                      <span className="font-bold">
                        {infraction.profiles?.full_name || ""}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 uppercase">
                        Valor
                      </span>{" "}
                      <span className="font-bold">{formattedAmount}</span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <h4 className="font-bold text-base underline uppercase tracking-wider">
                      RH
                    </h4>
                    <p className="text-sm font-medium">
                      Desconto em:{" "}
                      <span className="inline-block w-8 border-b border-black"></span>{" "}
                      X &nbsp; {formattedAmount} &nbsp; ____/____
                    </p>

                    <div className="grid grid-cols-2 gap-8 pt-8">
                      <p className="text-sm font-medium">
                        Data: _____ / _____ / _________
                      </p>
                      <div className="border-t border-black w-full pt-2 text-center text-sm font-medium">
                        Assinatura RH
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 space-y-4">
                    <h4 className="font-bold text-base underline uppercase tracking-wider">
                      Financeiro
                    </h4>
                    <div className="grid grid-cols-2 gap-8 pt-8">
                      <p className="text-sm font-medium">
                        Data: _____ / _____ / _________
                      </p>
                      <div className="border-t border-black w-full pt-2 text-center text-sm font-medium">
                        Assinatura Financeiro
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
