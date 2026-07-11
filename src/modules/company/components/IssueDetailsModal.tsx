import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Calendar,
  CheckCircle2,
  FileText,
  Wrench,
  Clock,
  Car,
  Tag,
  Camera,
  AlertTriangle,
  Receipt,
  UserCircle2
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import PrintHeader from "./PrintHeader";

interface IssueDetailsModalProps {
  issue: any;
  onClose: () => void;
}

export default function IssueDetailsModal({
  issue,
  onClose,
}: IssueDetailsModalProps) {
  useEffect(() => {
    if (issue) {
      document.body.classList.add("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [issue]);

  if (!issue) return null;

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage.from("checklist-photos").getPublicUrl(path).data
      .publicUrl;
  };

  const handlePrint = () => {
    window.print();
  };

  let parsedNfs: any[] = [];
  try {
    if (issue.resolution_nfs) {
      parsedNfs = typeof issue.resolution_nfs === 'string' ? JSON.parse(issue.resolution_nfs) : issue.resolution_nfs;
    } else if (issue.resolution_nf && issue.resolution_nf.startsWith("[")) {
      parsedNfs = JSON.parse(issue.resolution_nf);
    }
  } catch (e) {
    // Ignore parse error
  }

  const isResolved = issue.status === "resolved";
  const isWaiting = issue.status === "waiting";

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 backdrop-blur-sm print:static print:p-0 print:bg-white print:block overflow-y-auto w-screen h-screen print:w-auto print:h-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden">
        
        {/* Header - Desktop & Mobile */}
        <div className="p-6 md:px-8 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Wrench size={24} className="text-zinc-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Ficha de Manutenção
              </h2>
              <div className="text-sm font-bold text-zinc-400 font-mono tracking-wider">
                ID: {issue.id.slice(0, 8)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Printer size={16} />
              <span className="hidden md:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[85vh] print:max-h-none print:p-8 print:text-black bg-zinc-50/50 print:bg-white">
          
          {/* Print Only Header */}
          <div className="hidden print:block mb-8">
            <PrintHeader />
            <div className="flex justify-between items-end border-b-2 border-zinc-900 pb-4 mt-6">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">
                  Relatório de Manutenção
                </h1>
                <p className="text-base font-bold text-zinc-500 font-mono mt-1">Ref: #{issue.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Impresso em
                </p>
                <p className="text-sm font-black text-zinc-900">
                  {new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:gap-12">
            
            {/* Left Column: Problem Details */}
            <div className="lg:col-span-5 space-y-8">
              
              <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm print:border-0 print:p-0 print:shadow-none">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100 print:border-zinc-900">
                  <AlertTriangle size={20} className="text-red-500 print:text-zinc-900" />
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                    Dados da Ocorrência
                  </h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2">
                      Item Afetado
                    </span>
                    <span className="font-black text-zinc-900 text-xl leading-tight block">
                      {issue.item_title}
                    </span>
                    {issue.item_category && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {issue.item_category.split(', ').filter(Boolean).map((cat: string) => (
                          <span key={cat} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border border-zinc-200 bg-zinc-100 text-zinc-700 print:border-zinc-300">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 print:border-zinc-300 print:bg-white">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1 flex items-center gap-1">
                        <Car size={12} /> Veículo
                      </span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {issue.vehicles?.plate || issue.trailers?.plate || "Sem veículo"}
                      </span>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 print:border-zinc-300 print:bg-white">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Data do Registro
                      </span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {new Date(issue.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 flex items-center gap-1">
                      <UserCircle2 size={12} /> Reportado por
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-zinc-600">
                          {issue.profiles?.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <span className="font-bold text-zinc-900 text-sm">
                        {issue.profiles?.full_name || "Motorista Desconhecido"}
                      </span>
                    </div>
                  </div>

                  {issue.description && (
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 flex items-center gap-1">
                        <FileText size={12} /> Descrição do Problema
                      </span>
                      <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap bg-zinc-50 p-4 rounded-xl border border-zinc-100 print:border-zinc-300 print:bg-white leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                  )}

                  {issue.photo_url && (
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 flex items-center gap-1">
                        <Camera size={12} /> Evidência Inicial
                      </span>
                      <img
                        src={getImageUrl(issue.photo_url) || ""}
                        alt="Evidência do problema"
                        className="w-full h-48 object-cover rounded-xl border border-zinc-200 shadow-sm print:h-auto print:max-h-60 print:object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Resolution Details */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm print:border-0 print:p-0 print:shadow-none">
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 print:border-zinc-900">
                  <div className="flex items-center gap-2">
                    <Wrench size={20} className="text-emerald-600 print:text-zinc-900" />
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                      Tratativa Técnica
                    </h3>
                  </div>
                  <div>
                    {isResolved ? (
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md uppercase text-[10px] font-black tracking-widest border border-emerald-200 print:border-zinc-900 print:bg-white print:text-zinc-900">
                        Resolvido
                      </span>
                    ) : isWaiting ? (
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md uppercase text-[10px] font-black tracking-widest border border-amber-200 print:border-zinc-500 print:bg-white print:text-zinc-500">
                        Aguardando Peça/Serviço
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-md uppercase text-[10px] font-black tracking-widest border border-red-200 print:border-zinc-500 print:bg-white print:text-zinc-500">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  
                  {/* Status & Dates */}
                  {(isResolved || isWaiting) && (
                    <div className="space-y-4">
                      
                      {issue.resolved_at && (
                        <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 print:border-zinc-300 print:bg-white">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isWaiting ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isWaiting ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                              {isWaiting ? "Status Alterado Em" : "Resolvido Em"}
                            </span>
                            <span className="text-sm font-bold text-zinc-900">
                              {new Date(issue.resolved_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date(issue.resolved_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      )}

                      {(issue.maintenance_start_date || issue.maintenance_end_date) && (
                        <div className="flex flex-wrap gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 print:border-zinc-300 print:bg-white">
                          {issue.maintenance_start_date && (
                            <div className="flex-1 min-w-[120px]">
                              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1 flex items-center gap-1">
                                <Calendar size={12} className="text-zinc-400" /> Início
                              </span>
                              <span className="text-sm font-bold text-zinc-900">
                                {new Date(issue.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                              </span>
                            </div>
                          )}
                          {issue.maintenance_start_date && issue.maintenance_end_date && (
                            <div className="w-px bg-zinc-200 hidden sm:block"></div>
                          )}
                          {issue.maintenance_end_date && (
                            <div className="flex-1 min-w-[120px]">
                              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1 flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-zinc-400" /> Fim
                              </span>
                              <span className="text-sm font-bold text-zinc-900">
                                {new Date(issue.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  {/* Notes */}
                  {issue.resolution_notes && (
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 flex items-center gap-1">
                        <FileText size={12} /> Laudo Técnico
                      </span>
                      <p className="text-sm font-medium text-zinc-800 whitespace-pre-wrap bg-blue-50 p-5 rounded-xl border border-blue-100 leading-relaxed print:border-zinc-300 print:bg-white">
                        {issue.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Finance / Invoices */}
                  {(issue.resolution_nfs || issue.resolution_nf) && (
                    <div className="pt-6 mt-6 border-t border-zinc-100 print:border-zinc-900">
                      <span className="text-xs text-zinc-900 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                        <Receipt size={16} /> Custos e Comprovantes
                      </span>
                      
                      {parsedNfs.length > 0 ? (
                        <div className="space-y-4">
                          {parsedNfs.map((nf: any, idx: number) => {
                            const nfSum = nf.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0), 0) || 0;
                            return (
                              <div key={idx} className="bg-white border-2 border-zinc-100 rounded-xl overflow-hidden print:border-zinc-300">
                                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-100 flex justify-between items-center print:bg-white print:border-zinc-300">
                                  <div className="flex items-center gap-2 font-black text-zinc-900">
                                    <Receipt size={14} className="text-zinc-400" />
                                    <span>NF: {nf.nf_number || "S/N"}</span>
                                  </div>
                                  <span className="text-emerald-700 font-black">
                                    R$ {nfSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {nf.nf_key && (
                                  <div className="px-4 py-2 border-b border-zinc-100 bg-white">
                                    <div className="text-[10px] text-zinc-500 font-mono break-all">
                                      <strong className="uppercase mr-1">Chave:</strong> {nf.nf_key}
                                    </div>
                                  </div>
                                )}
                                {nf.items && nf.items.length > 0 && (
                                  <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-xs whitespace-nowrap">
                                      <thead className="bg-zinc-50/50 print:bg-white">
                                        <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100 print:border-zinc-300">
                                          <th className="px-4 py-2 font-black">Peça/Serviço</th>
                                          <th className="px-4 py-2 font-black text-right">Qtd</th>
                                          <th className="px-4 py-2 font-black text-right">UN</th>
                                          <th className="px-4 py-2 font-black text-right">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="text-zinc-800 font-medium divide-y divide-zinc-50 print:divide-zinc-200">
                                        {nf.items.map((it: any, itIdx: number) => {
                                          const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_price) || 0);
                                          return (
                                            <tr key={itIdx}>
                                              <td className="px-4 py-2">{it.name}</td>
                                              <td className="px-4 py-2 text-right">{it.quantity}</td>
                                              <td className="px-4 py-2 text-right text-zinc-500">R$ {Number(it.unit_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                              <td className="px-4 py-2 text-right font-bold">R$ {itemTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-center gap-3 print:border-zinc-300 print:bg-white">
                          <Receipt size={20} className="text-zinc-400" />
                          <span className="text-sm font-bold text-zinc-900">
                            NF Relacionada: {issue.resolution_nf}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Value */}
                  {issue.resolution_value > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-emerald-50 border-2 border-emerald-100 rounded-xl print:border-zinc-900 print:bg-white">
                      <span className="text-[10px] text-emerald-800 uppercase font-black tracking-widest flex items-center gap-2 mb-1 sm:mb-0 print:text-zinc-900">
                        <Tag size={16} /> Custo Total da Manutenção
                      </span>
                      <div className="text-3xl font-black text-emerald-700 tracking-tight print:text-zinc-900">
                        R$ {issue.resolution_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {/* Resolution Photos */}
                  {issue.resolution_photos && issue.resolution_photos.length > 0 && (
                    <div className="pt-6 mt-6 border-t border-zinc-100 print:border-zinc-900">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-4 flex items-center gap-1">
                        <Camera size={12} /> Evidências do Reparo
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {issue.resolution_photos.map((pUrl: string, idx: number) => (
                          <img
                            key={idx}
                            src={getImageUrl(pUrl) || ""}
                            alt={`Reparo ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-xl border border-zinc-200 shadow-sm print:h-auto print:max-h-40 print:object-contain"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Signatures for Print */}
              <div className="hidden print:grid grid-cols-2 gap-16 mt-16 pt-12 border-t-2 border-zinc-900">
                <div className="text-center">
                  <div className="w-full border-b border-zinc-900 mb-3"></div>
                  <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                    Motorista / Solicitante
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-full border-b border-zinc-900 mb-3"></div>
                  <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                    Mecânico / Responsável
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
