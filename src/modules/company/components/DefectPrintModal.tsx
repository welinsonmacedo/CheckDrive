import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  AlertTriangle,
  FileText,
  Calendar,
  UserCircle2,
  Car,
  CheckCircle2,
  Wrench,
  Receipt,
  Tag,
  Clock
} from "lucide-react";
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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 backdrop-blur-sm print:static print:p-0 print:bg-white print:block overflow-y-auto w-screen h-screen print:w-auto print:h-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden">
        
        {/* Screen Header */}
        <div className="p-6 md:px-8 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Visualização de Impressão
              </h2>
              <div className="text-sm font-bold text-zinc-400 font-mono tracking-wider">
                ID: {defect.id?.slice(0, 8)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Printer size={16} />
              <span className="hidden md:inline">Imprimir Ficha</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 md:p-10 overflow-y-auto print:overflow-visible print:block print:p-0 print:text-black bg-zinc-50/50 print:bg-white">
          <PrintHeader />
          
          {/* Report Header */}
          <div className="mb-8 border-b-2 border-zinc-900 pb-6 flex items-end justify-between mt-6">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">
                Ficha de Ocorrência
              </h1>
              <p className="text-sm font-bold text-zinc-500 font-mono mt-1">
                Ref: #{defect.id}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest border ${
                  defect.status === "resolved"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 print:border-zinc-900 print:bg-white print:text-zinc-900"
                    : defect.status === "waiting"
                    ? "bg-amber-50 text-amber-800 border-amber-200 print:border-zinc-500 print:bg-white print:text-zinc-500"
                    : "bg-red-50 text-red-800 border-red-200 print:border-zinc-500 print:bg-white print:text-zinc-500"
                }`}
              >
                {defect.status === "resolved" ? (
                  <><CheckCircle2 size={14} /> Resolvido{defect.resolution_type ? ` - ${defect.resolution_type === 'preventiva' ? 'Preventiva' : 'Corretiva'}` : ''}</>
                ) : defect.status === "waiting" ? (
                  <><Clock size={14} /> Aguardando</>
                ) : (
                  <><AlertTriangle size={14} /> Pendente</>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2">
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-100 print:border-zinc-300 print:bg-white print:rounded-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Calendar size={12} /> Data do Registro
              </p>
              <p className="text-xl font-black text-zinc-900">
                {format(
                  parseISO(defect.created_at),
                  "dd/MM/yyyy HH:mm",
                  { locale: ptBR },
                )}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-100 print:border-zinc-300 print:bg-white print:rounded-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <Car size={12} /> Veículo Envolvido
              </p>
              <p className="text-xl font-black text-zinc-900">
                {defect.vehicles?.plate
                  ? defect.trailers?.plate
                    ? `${defect.vehicles.plate} / ${defect.trailers.plate}`
                    : defect.vehicles.plate
                  : defect.trailers?.plate || "Não Registrado"}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-2 border-zinc-100 col-span-1 md:col-span-2 print:border-zinc-300 print:bg-white print:rounded-none">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                <UserCircle2 size={12} /> Solicitante / Motorista
              </p>
              <p className="text-xl font-black text-zinc-900">
                {defect.profiles?.full_name || "Desconhecido"}
              </p>
            </div>
          </div>

          {/* Defect Description */}
          <div className="mb-8 p-6 md:p-8 bg-white border-2 border-red-100 rounded-2xl print:border-zinc-900 print:rounded-none">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-red-500 print:text-zinc-900" />
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 print:text-zinc-900">
                Detalhes da Ocorrência
              </p>
            </div>
            
            <h3 className="text-2xl font-black text-zinc-900 mb-3 leading-tight">
              {defect.item_title}
            </h3>
            
            {defect.item_category && (
              <div className="flex flex-wrap gap-2 mb-6">
                {defect.item_category.split(', ').filter(Boolean).map((cat: string) => (
                  <span key={cat} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700 print:border-zinc-300">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-red-50 print:border-zinc-300">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1">
                <FileText size={12} /> Descrição do Problema
              </p>
              <p className="text-base font-medium text-zinc-800 whitespace-pre-wrap leading-relaxed">
                {defect.description || (
                  <span className="italic text-zinc-400">
                    Nenhuma observação detalhada.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Resolution Block */}
          {(defect.status === "resolved" || defect.status === "waiting") && (
            <div className="mb-8 p-6 md:p-8 bg-white border-2 border-emerald-100 rounded-2xl print:border-zinc-900 print:rounded-none">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-50 print:border-zinc-300">
                <Wrench size={20} className="text-emerald-600 print:text-zinc-900" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 print:text-zinc-900">
                  Dados da Tratativa
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                  {defect.resolved_at && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Atualizado sistema
                      </p>
                      <p className="text-base font-bold text-zinc-900">
                        {format(
                          parseISO(defect.resolved_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR },
                        )}
                      </p>
                    </div>
                  )}
                  {defect.maintenance_start_date && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Início da Manutenção
                      </p>
                      <p className="text-base font-bold text-zinc-900">
                        {new Date(defect.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                      </p>
                    </div>
                  )}
                  {defect.maintenance_end_date && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        Fim da Manutenção
                      </p>
                      <p className="text-base font-bold text-zinc-900">
                        {new Date(defect.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                      </p>
                    </div>
                  )}
                </div>

                {defect.resolution_notes && (
                  <div className="pt-4 border-t border-zinc-100 print:border-zinc-300">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1">
                      <FileText size={12} /> Descrição OS
                    </p>
                    <p className="text-base font-medium text-zinc-800 whitespace-pre-wrap leading-relaxed">
                      {defect.resolution_notes}
                    </p>
                  </div>
                )}

                {(defect.resolution_value > 0 || defect.resolution_nf || defect.resolution_nfs) && (
                  <div className="pt-6 mt-2 border-t border-zinc-100 print:border-zinc-300">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-4 flex items-center gap-2">
                      <Receipt size={16} /> Custos e NFs
                    </p>
                    
                    {(() => {
                      let parsedNfs = [];
                      try {
                        if (defect.resolution_nfs) {
                          parsedNfs = typeof defect.resolution_nfs === 'string' ? JSON.parse(defect.resolution_nfs) : defect.resolution_nfs;
                        } else if (defect.resolution_nf && defect.resolution_nf.startsWith("[")) {
                          parsedNfs = JSON.parse(defect.resolution_nf);
                        }
                      } catch (e) {}

                      if (parsedNfs.length > 0) {
                        return (
                          <div className="space-y-4 mb-6">
                            {parsedNfs.map((nf: any, idx: number) => {
                              const nfSum = nf.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0), 0) || 0;
                              return (
                                <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden print:border-zinc-400 print:bg-white">
                                  <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-zinc-200 print:border-zinc-400">
                                    <span className="font-black text-sm text-zinc-900">NF #{nf.nf_number || "S/N"}</span>
                                    <span className="font-black text-sm text-emerald-700 print:text-zinc-900">R$ {nfSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  {nf.items && nf.items.length > 0 && (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-100/50 print:bg-white border-b border-zinc-200 print:border-zinc-400">
                                          <th className="px-4 py-2 font-black">Peça/Serviço</th>
                                          <th className="px-4 py-2 font-black text-right">Qtd</th>
                                          <th className="px-4 py-2 font-black text-right">UN</th>
                                          <th className="px-4 py-2 font-black text-right">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="text-zinc-800 font-medium divide-y divide-zinc-100 print:divide-zinc-200">
                                        {nf.items.map((it: any, itIdx: number) => {
                                          const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_price) || 0);
                                          return (
                                            <tr key={itIdx}>
                                              <td className="px-4 py-2">{it.name}</td>
                                              <td className="px-4 py-2 text-right">{it.quantity}</td>
                                              <td className="px-4 py-2 text-right text-zinc-500">R$ {Number(it.unit_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                              <td className="px-4 py-2 text-right font-bold text-zinc-900">R$ {itemTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else if (defect.resolution_nf) {
                        return (
                          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-6 font-bold text-sm text-zinc-800 print:border-zinc-400 print:bg-white">
                            NF Relacionada: {defect.resolution_nf}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {defect.resolution_value > 0 && (
                      <div className="flex justify-between items-center p-4 sm:p-5 bg-zinc-900 rounded-xl print:border-2 print:border-zinc-900 print:bg-white print:rounded-none">
                        <span className="text-[10px] text-zinc-300 uppercase font-black tracking-widest flex items-center gap-2 print:text-zinc-900">
                          <Tag size={16} /> Custo Total da Manutenção
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight print:text-zinc-900">
                          R$ {defect.resolution_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-16 pt-12 border-t-2 border-zinc-900 grid grid-cols-1 max-w-xs mx-auto">
            <div className="text-center">
              <div className="w-full border-b border-zinc-900 mb-3"></div>
              <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                Departamento Frota
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-right print:block">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest font-mono">
              Impresso em: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
