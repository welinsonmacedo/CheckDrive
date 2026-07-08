import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileText, Landmark, ShieldCheck, CreditCard, Scale, CheckSquare } from "lucide-react";
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none print:static print:block print:inset-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible print:block"
        >
          {/* Header - Screen Only */}
          <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50 print:hidden">
            <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
              <Printer className="text-red-500" size={24} />
              {selectedTerm === 'both' && "Visualização - Ambos os Termos"}
              {selectedTerm === 'responsibility' && "Visualização - Termo de Responsabilidade"}
              {selectedTerm === 'finance' && "Visualização - Termo Financeiro e RH"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-sm hover:shadow active:scale-[0.98]"
              >
                <Printer size={16} /> Imprimir Termo
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document Selector - Screen Only */}
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-zinc-400" />
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
          <div className="p-8 overflow-y-auto print:overflow-visible print:block print:p-0 text-zinc-900 bg-white print:text-black">
            <div className="max-w-3xl mx-auto space-y-4 my-4 print:my-0">
              
              {/* SECTION 1: Termo de Responsabilidade e Desconto de Multa */}
              {(selectedTerm === 'both' || selectedTerm === 'responsibility') && (
                <div className="space-y-4">
                  {/* Decorative corporate top bar */}
                  <div className="flex justify-between items-center border-b border-zinc-300 pb-4">
                    <div>
                      <h1 className="font-extrabold text-xl text-zinc-900 tracking-tight uppercase">
                        Termo de Responsabilidade e Desconto de Multa
                      </h1>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
                        Controle e Gestão de Infrações de Trânsito / Recursos Humanos
                      </p>
                    </div>
                    <div className="text-right print:hidden">
                      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-red-100">
                        <ShieldCheck size={12} /> Documento de Frota
                      </span>
                    </div>
                  </div>

                  {/* Informações da Autuação */}
                  <div className="border border-zinc-300 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-zinc-50 border-b border-zinc-300 px-4 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                        Quadro 01 - Dados da Infração e Condutor
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        CONFIDENCIAL
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Condutor Notificado
                        </span>
                        <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                          {infraction.profiles?.full_name || "NÃO INFORMADO"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Veículo / Placa de Identificação
                        </span>
                        <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                          {infraction.license_plate || "NÃO INFORMADO"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Data da Autuação / Registro
                        </span>
                        <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                          {formattedDate || "NÃO INFORMADA"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Auto de Infração / Número da Notificação
                        </span>
                        <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5 font-mono text-zinc-800">
                          {infraction.notice_number || "NÃO INFORMADO"}
                        </span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Descrição Tipificada da Infração
                        </span>
                        <span className="font-bold text-zinc-950 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                          <span className="font-mono text-red-600 mr-2 bg-red-50 px-1 py-0.5 rounded text-xs border border-red-100">{infraction.infraction_code}</span>
                          {infractionDesc}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                          Valor Pecuniário Nominal
                        </span>
                        <span className="font-extrabold text-zinc-950 text-base mt-0.5">
                          {formattedAmount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seleção do Condutor */}
                  <div className="border border-zinc-300 rounded-xl p-4 bg-zinc-50/30 space-y-3">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                      Opção de Declaração do Condutor
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-zinc-200 bg-white">
                        <div className="w-5 h-5 border-2 border-zinc-950 flex-shrink-0 rounded mt-0.5 flex items-center justify-center font-bold text-xs"></div>
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold text-zinc-800 block">Indicação de Real Infrator</span>
                          <span className="text-zinc-500 text-[11px]">Desejo apresentar a indicação do condutor que efetivamente operava o veículo.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-zinc-200 bg-white">
                        <div className="w-5 h-5 border-2 border-zinc-950 flex-shrink-0 rounded mt-0.5 flex items-center justify-center font-bold text-xs"></div>
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold text-zinc-800 block">Não vou realizar indicação</span>
                          <span className="text-zinc-500 text-[11px]">Reconheço que operava o veículo e assumo a responsabilidade pela autuação.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Cláusulas */}
                  <div className="space-y-4 text-xs leading-relaxed text-zinc-700">
                    <div>
                      <h3 className="font-bold text-zinc-900 uppercase flex items-center gap-1.5 text-xs mb-1.5 border-b border-zinc-200 pb-1">
                        <Scale size={14} className="text-zinc-400" />
                        1. Declaração e Ciência de Responsabilidade
                      </h3>
                      <p className="text-justify">
                        Por meio deste instrumento, assumo plena ciência da autuação de trânsito descrita no Quadro 01. Declaro que, caso opte por não realizar a indicação de real infrator, <strong>EU RECONHEÇO SER O ÚNICO CONDUTOR E RESPONSÁVEL PELO VEÍCULO NO MOMENTO DA INFRAÇÃO</strong>, desobrigando a empresa de qualquer dever de contestação ou indicação de terceiros.
                      </p>
                      <p className="text-justify mt-2">
                        Estou ciente de que, conforme as diretrizes do Art. 257 do Código de Trânsito Brasileiro (CTB), a falta de identificação ou recusa em identificar o condutor enseja a imposição de multa por Não Identificação do Condutor (NIC), cujo encargo financeiro duplicado será de minha total e exclusiva responsabilidade.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-zinc-900 uppercase flex items-center gap-1.5 text-xs mb-1.5 border-b border-zinc-200 pb-1">
                        <Landmark size={14} className="text-zinc-400" />
                        2. Autorização de Desconto em Folha de Pagamento
                      </h3>
                      <div className="flex gap-2.5 items-start p-3 bg-zinc-50 border border-zinc-200 rounded-xl my-2">
                        <div className="w-4 h-4 border-2 border-zinc-950 flex-shrink-0 rounded mt-0.5"></div>
                        <p className="text-xs font-medium text-zinc-800 leading-tight">
                          AUTORIZO EXPRESSAMENTE, nos termos do art. 462 da Consolidação das Leis do Trabalho (CLT), o desconto integral ou parcelado do valor correspondente a esta multa diretamente em minha folha de pagamento, conforme acordado com o setor de Recursos Humanos.
                        </p>
                      </div>
                      <p className="text-zinc-500 text-[10px] italic">
                        Declaro estar de acordo com os valores acima descritos, bem como as consequências legais aplicáveis.
                      </p>
                    </div>
                  </div>

                  {/* Assinatura do Condutor */}
                  <div className="pt-4 pb-2 print:pt-2">
                    <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto">
                      <div className="text-center">
                        <div className="border-t border-zinc-400 pt-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                          Data do Aceite
                        </div>
                        <div className="mt-4 font-semibold text-xs border-b border-zinc-200 py-1 inline-block min-w-[120px]">
                          ____ / ____ / ________
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-t border-zinc-400 pt-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold text-zinc-800">
                          Assinatura do Condutor / Funcionário
                        </div>
                        <div className="mt-6 text-[11px] font-bold text-zinc-700 font-mono">
                          CPF: ______________________
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assinatura Empresa */}
                  <div className="border-t border-zinc-200 pt-4 mt-2 print:break-inside-avoid">
                    <h3 className="font-bold text-zinc-900 uppercase text-xs mb-3">
                      3. Autenticação e Recebimento Corporativo
                    </h3>
                    <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto pt-2">
                      <div className="space-y-4">
                        <div className="flex flex-col text-xs text-zinc-600">
                          <span>Gestor de Frota / Responsável:</span>
                          <span className="font-bold border-b border-zinc-200 py-1 mt-1">_________________________________</span>
                        </div>
                        <div className="flex flex-col text-xs text-zinc-600">
                          <span>Data de Recebimento:</span>
                          <span className="font-semibold border-b border-zinc-200 py-1 mt-1">_____ / _____ / _________</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end text-center">
                        <div className="border-t border-zinc-400 pt-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                          Visto / Assinatura (Empresa)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page Break / Separator for both terms */}
              {selectedTerm === 'both' && (
                <>
                  <div className="border-b-2 border-dashed border-zinc-300 my-4 print:my-4"></div>
                </>
              )}

              {/* SECTION 2: Termo Financeiro RH */}
              {(selectedTerm === 'both' || selectedTerm === 'finance') && (
                <div className="space-y-4 pt-2 pb-4 bg-zinc-50/40 print:bg-transparent p-4 print:p-0 rounded-2xl border border-zinc-300 print:border-none print:break-inside-avoid shadow-sm print:shadow-none">
                  
                  {/* Ledger Header */}
                  <div className="border-b border-zinc-300 pb-4 text-center">
                    <h2 className="font-extrabold text-lg text-zinc-950 tracking-tight uppercase flex items-center justify-center gap-2">
                      <Landmark className="text-zinc-600" size={20} />
                      Termo de Controle Financeiro & Recursos Humanos
                    </h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1 font-semibold">
                      Demonstrativo de Lançamento de Desconto de Infração em Folha
                    </p>
                  </div>

                  {/* Summary Info Header */}
                  <div className="grid grid-cols-3 gap-6 bg-white border border-zinc-200 p-4 rounded-xl text-xs shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                        Auto de Infração
                      </span>
                      <span className="font-bold text-zinc-900 mt-1 font-mono">
                        {infraction.notice_number || "NÃO CONFIGURADO"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                        Nome do Funcionário
                      </span>
                      <span className="font-bold text-zinc-900 mt-1 truncate">
                        {infraction.profiles?.full_name || "NÃO INFORMADO"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                        Valor Nominal da Guia
                      </span>
                      <span className="font-extrabold text-zinc-950 mt-1">
                        {formattedAmount}
                      </span>
                    </div>
                  </div>

                  {/* RH Section details */}
                  <div className="border border-zinc-300 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-zinc-50 border-b border-zinc-300 px-4 py-2.5 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-zinc-500" />
                      <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider">
                        Área de Processamento de Departamento Pessoal (RH)
                      </span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                            Opção de Parcelamento de Desconto
                          </span>
                          <div className="p-2 border border-zinc-200 rounded-lg flex items-center gap-2 font-medium">
                            <span className="inline-block w-8 border-b border-zinc-950 text-center font-bold">X</span>
                            <span>parcelas de</span>
                            <span className="font-bold text-zinc-800 ml-1">{formattedAmount}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                            Mês de Competência de Início
                          </span>
                          <div className="p-2 border border-zinc-200 rounded-lg font-medium text-zinc-700">
                            Faturamento Previsto para: ____ / ____
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="flex flex-col text-xs text-zinc-600">
                          <span>Data de Lançamento no Sistema:</span>
                          <span className="font-semibold border-b border-zinc-200 py-1 mt-1">_____ / _____ / _________</span>
                        </div>
                        <div className="text-center flex flex-col justify-end">
                          <div className="border-t border-zinc-400 pt-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                            Visto do Analista de RH
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financeiro Section details */}
                  <div className="border border-zinc-300 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-zinc-50 border-b border-zinc-300 px-4 py-2.5 flex items-center gap-2">
                      <CreditCard size={16} className="text-zinc-500" />
                      <span className="text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider">
                        Área de Processamento Financeiro / Contabilidade
                      </span>
                    </div>
                    <div className="p-3 space-y-3">
                      <p className="text-xs text-zinc-600 leading-relaxed text-justify">
                        Fica autorizado o provisionamento contábil e respectivo desconto financeiro da guia de recolhimento sob a titularidade da empresa, em estrito cumprimento com o Termo de Responsabilidade firmado pelo condutor.
                      </p>

                      <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="flex flex-col text-xs text-zinc-600">
                          <span>Data do Pagamento da Guia:</span>
                          <span className="font-semibold border-b border-zinc-200 py-1 mt-1">_____ / _____ / _________</span>
                        </div>
                        <div className="text-center flex flex-col justify-end">
                          <div className="border-t border-zinc-400 pt-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
                            Assinatura / Carimbo do Financeiro
                          </div>
                        </div>
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
