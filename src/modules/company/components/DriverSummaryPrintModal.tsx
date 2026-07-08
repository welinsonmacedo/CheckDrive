import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileText, Landmark, ShieldCheck, CreditCard, Scale, Calendar, MapPin, BadgeAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getInfractionDescription } from "@/src/utils/infractions";
import PrintHeader from "./PrintHeader";

interface DriverSummaryPrintModalProps {
  driver: {
    id: string;
    name: string;
    infractions: any[];
    count: number;
    totalAmount: number;
    totalDiscounted: number;
    totalFineDiscount?: number;
  } | null;
  onClose: () => void;
}

export default function DriverSummaryPrintModal({
  driver,
  onClose,
}: DriverSummaryPrintModalProps) {
  useEffect(() => {
    if (driver) {
      document.body.classList.add("modal-open-for-print");
    } else {
      document.body.classList.remove("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [driver]);

  if (!driver) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedTotalAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(driver.totalAmount);

  const formattedTotalDiscounted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(driver.totalDiscounted);

  const formattedTotalFineDiscount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(driver.totalFineDiscount || 0);

  let effectiveTotal = 0;
  if (driver?.infractions) {
    driver.infractions.forEach((inf: any) => {
      let baseAmount = 0;
      if (inf.discounted_amount != null) {
        baseAmount = Number(inf.discounted_amount);
      } else {
        baseAmount = Number(inf.amount) || 0;
      }
      
      if (inf.installments) {
        const nicInst = inf.installments.find((i: any) => i.isNIC);
        if (nicInst) {
          baseAmount += Number(nicInst.amount) || 0;
        }
      }
      effectiveTotal += baseAmount;
    });
  }

  const formattedNetAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.max(0, effectiveTotal - (driver?.totalDiscounted || 0)));

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

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
              Visualização de Impressão - Resumo do Motorista
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-sm hover:shadow active:scale-[0.98]"
              >
                <Printer size={16} /> Imprimir Resumo
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable Content */}
          <div className="p-8 overflow-y-auto print:overflow-visible print:block print:p-0 text-zinc-900 bg-white print:text-black">
            <PrintHeader />
            <div className="max-w-3xl mx-auto space-y-4 my-4 print:my-0">
              
              {/* Formal Corporate Top Bar */}
              <div className="flex justify-between items-start border-b border-zinc-300 pb-4">
                <div>
                  <h1 className="font-extrabold text-xl text-zinc-900 tracking-tight uppercase">
                    Relatório Consolidado de Infrações por Condutor
                  </h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
                    Gestão de Frotas corporativa & conformidade de trânsito
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-zinc-150 text-zinc-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border border-zinc-300">
                    Emitido em: {currentDate}
                  </span>
                  <span className="hidden print:inline text-[9px] font-bold text-zinc-400">
                    CONFIDENCIAL
                  </span>
                </div>
              </div>

              {/* Informações Gerais do Motorista */}
              <div className="border border-zinc-300 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-zinc-50 border-b border-zinc-300 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                    Quadro de Identificação do Condutor
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">
                    DADOS CONSOLIDADOS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                      Nome Completo do Condutor
                    </span>
                    <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                      {driver.name}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                      Total de Ocorrências Registradas
                    </span>
                    <span className="font-bold text-zinc-900 border-b border-dashed border-zinc-200 pb-1 mt-0.5">
                      {driver.count} {driver.count === 1 ? "infração" : "infrações"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                      Valor Histórico Total (Nominal)
                    </span>
                    <span className="font-extrabold text-red-600 text-base mt-0.5">
                      {formattedTotalAmount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                      Multas (c/ Desconto)
                    </span>
                    <span className="font-extrabold text-emerald-600 text-base mt-0.5">
                      {formattedTotalFineDiscount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                      Total Descontado em Folha
                    </span>
                    <span className="font-extrabold text-emerald-600 text-base mt-0.5">
                      {formattedTotalDiscounted}
                    </span>
                  </div>
                  <div className="flex flex-col col-span-1 sm:col-span-2 bg-zinc-50 p-3 rounded-lg border border-zinc-200/60 mt-2">
                    <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider">
                      Saldo Restante a Descontar
                    </span>
                    <span className="font-black text-zinc-950 text-lg mt-0.5">
                      {formattedNetAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Infrações Detalhadas */}
              <div className="space-y-3">
                <h3 className="font-bold text-zinc-900 uppercase flex items-center gap-1.5 text-xs border-b border-zinc-200 pb-2">
                  <FileText size={14} className="text-zinc-400" />
                  Relação Discriminada de Multas e Autuações
                </h3>

                <div className="overflow-hidden border border-zinc-300 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider border-b border-zinc-300">
                        <th className="px-3 py-2.5">Auto / Cód</th>
                        <th className="px-3 py-2.5">Data/Hora</th>
                        <th className="px-3 py-2.5">Placa</th>
                        <th className="px-3 py-2.5">Descrição da Infração</th>
                        <th className="px-3 py-2.5 text-right">Vl. Nominal</th>
                        <th className="px-3 py-2.5 text-right">Desc. Multa</th>
                        <th className="px-3 py-2.5 text-right">Desc. Folha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-xs">
                      {driver.infractions.map((inf: any) => {
                        const infDate = inf.infraction_date ? new Date(inf.infraction_date) : null;
                        const formattedInfDate = infDate 
                          ? `${infDate.toLocaleDateString("pt-BR")} ${infDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "---";
                          
                        let driverDeducted = 0;
                        if (inf.installments) {
                           inf.installments.forEach((inst: any) => {
                              driverDeducted += Number(inst.amount) || 0;
                           });
                        }
                        
                        return (
                          <tr key={inf.id} className="hover:bg-zinc-50/50 print:hover:bg-transparent">
                            <td className="px-3 py-3 font-mono font-medium text-zinc-800">
                              <div className="font-bold text-[11px]">{inf.notice_number || "---"}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{inf.infraction_code}</div>
                            </td>
                            <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">
                              {formattedInfDate}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-red-800">
                              {inf.license_plate || "---"}
                            </td>
                            <td className="px-3 py-3 text-zinc-700 font-medium">
                              <div className="line-clamp-2 max-w-[240px]">
                                {inf.description || getInfractionDescription(inf.infraction_code)}
                              </div>
                              {inf.address && (
                                <div className="text-[10px] text-zinc-400 font-normal mt-0.5 truncate max-w-[240px]">
                                  {inf.address}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-zinc-900 whitespace-nowrap">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format((Number(inf.amount) || 0) + (inf.installments?.find((i: any) => i.isNIC)?.amount ? Number(inf.installments.find((i: any) => i.isNIC).amount) : 0))}
                              {inf.installments?.find((i: any) => i.isNIC) && (
                                <div className="text-[9px] text-orange-600 font-medium mt-0.5">
                                  + NIC: {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(Number(inf.installments.find((i: any) => i.isNIC).amount))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {inf.discounted_amount != null ? (
                                new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(inf.discounted_amount)
                              ) : (
                                "---"
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {driverDeducted > 0 ? (
                                new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(driverDeducted)
                              ) : (
                                "---"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cláusula Termo Formal */}
              <div className="space-y-4 text-xs leading-relaxed text-zinc-700 bg-zinc-50/40 p-4 rounded-xl border border-zinc-200">
                <h3 className="font-bold text-zinc-900 uppercase flex items-center gap-1.5 text-xs mb-1">
                  <Scale size={14} className="text-zinc-500" />
                  Termo de Declaração e Consolidação de Infrações
                </h3>
                <p className="text-justify text-[11px]">
                  Pelo presente termo de consolidação de dados de frota, o condutor qualificado declara estar plenamente ciente das infrações de trânsito registradas em seu prontuário corporativo durante o período de prestação de serviços/utilização dos veículos da empresa.
                </p>
                <p className="text-justify text-[11px] mt-2">
                  Reconhece, para todos os efeitos de direito, a exatidão das notificações listadas acima, comprometendo-se com o cumprimento dos respectivos ressarcimentos e acertos já iniciados ou pendentes de processamento junto aos setores de Recursos Humanos e Departamento Pessoal da empresa.
                </p>
              </div>

              {/* Bloco de Assinaturas */}
              <div className="pt-12 pb-6 print:pt-8">
                <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto">
                  <div className="text-center">
                    <div className="border-t border-zinc-400 pt-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Local e Data do Aceite
                    </div>
                    <div className="mt-4 font-semibold text-xs border-b border-zinc-200 py-1.5 inline-block min-w-[160px] text-zinc-400">
                      ____ / ____ / ________
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-zinc-400 pt-2 text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold text-zinc-800">
                      Assinatura do Condutor Notificado
                    </div>
                    <div className="mt-4 font-semibold text-xs border-b border-zinc-200 py-1.5 inline-block min-w-[160px] text-zinc-400">
                      Assinatura Legível
                    </div>
                  </div>
                </div>
              </div>

              {/* Visto Corporativo / RH */}
              <div className="border-t border-zinc-200 pt-6 mt-4 print:break-inside-avoid">
                <h3 className="font-bold text-zinc-900 uppercase text-xs mb-3 text-center">
                  Validação Interna de Frota e Departamento Pessoal
                </h3>
                <div className="grid grid-cols-2 gap-12 max-w-2xl mx-auto pt-2">
                  <div className="space-y-4">
                    <div className="flex flex-col text-xs text-zinc-600">
                      <span>Assinatura do Gestor Responsável:</span>
                      <span className="font-bold border-b border-zinc-200 py-1.5 mt-1 text-zinc-300">_________________________________</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end text-center">
                    <div className="border-t border-zinc-400 pt-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Carimbo / Visto Corporativo
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
