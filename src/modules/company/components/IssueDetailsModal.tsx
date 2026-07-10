import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  Wrench,
  Clock,
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

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:static print:p-0 print:bg-white print:block overflow-y-auto w-screen h-screen print:w-auto print:h-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-[95vw] lg:w-full lg:max-w-4xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl print:hidden">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
              <Wrench size={24} className="text-primary" />
              Detalhes da Manutenção
            </h2>
            <div className="text-xs text-zinc-400 font-medium">
              #{issue.id.slice(0, 8)}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 uppercase tracking-wider"
            >
              <Printer size={16} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8 print:p-8 print:text-black">
          <PrintHeader />
          {/* Print Header */}
          <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-black uppercase">
                Relatório de Manutenção
              </h1>
              <p className="text-sm font-bold text-gray-500">ID: {issue.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                Impresso em: {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
            {/* Ocorrência Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2 print:text-black print:border-black">
                  Dados da Ocorrência
                </h3>

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      Item Afetado
                    </span>
                    <span className="font-bold text-zinc-800 text-lg leading-tight">
                      {issue.item_title}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      Veículo / Frota
                    </span>
                    <span className="font-bold text-zinc-800">
                      {issue.vehicles?.plate ||
                        issue.trailers?.plate ||
                        "Sem veículo"}
                      {(issue.vehicles?.name || issue.trailers?.name) &&
                        ` - ${issue.vehicles?.name || issue.trailers?.name}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-zinc-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        Data de Abertura
                      </span>
                      <span className="text-sm font-bold text-zinc-800">
                        {new Date(issue.created_at).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "long", year: "numeric" },
                        )}{" "}
                        às{" "}
                        {new Date(issue.created_at).toLocaleTimeString(
                          "pt-BR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                  </div>

                  {issue.profiles && (
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-zinc-400" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                          Relatado Por
                        </span>
                        <span className="text-sm font-bold text-zinc-800">
                          {issue.profiles.full_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {issue.description && (
                    <div className="flex flex-col mt-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100 print:border-black print:bg-white text-left break-words">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                        Descrição do Problema
                      </span>
                      <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap">
                        {issue.description}
                      </p>
                    </div>
                  )}

                  {issue.photo_url && (
                    <div className="mt-4">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">
                        Foto Anexada na Abertura
                      </span>
                      <img
                        src={getImageUrl(issue.photo_url) || ""}
                        alt="Problema Resolvido"
                        className="w-full h-48 object-cover rounded-xl border border-zinc-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resolução Info */}
            <div className="space-y-6">
              <div>
                <div className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2 print:text-black print:border-black flex justify-between items-center">
                  <span>Tratativa da Manutenção</span>
                  {issue.status === "resolved" ? (
                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded uppercase text-[9px] print:border print:border-black print:bg-white print:text-black font-black tracking-wider">
                      Resolvido
                    </span>
                  ) : issue.status === "waiting" ? (
                    <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded uppercase text-[9px] print:border print:border-black print:bg-white print:text-black font-black tracking-wider">
                      Aguardando
                    </span>
                  ) : (
                    <span className="bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded uppercase text-[9px] print:border print:border-black print:bg-white print:text-black font-black tracking-wider">
                      {issue.status}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {(issue.status === "resolved" ||
                    issue.status === "waiting") && (
                    <>
                      {issue.resolved_at && (
                        <div className="flex items-center gap-2">
                          {issue.status === "waiting" ? (
                            <Clock size={16} className="text-amber-500" />
                          ) : (
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                              {issue.status === "waiting"
                                ? "Registrado em Aguardo em"
                                : "Data de Resolução"}
                            </span>
                            <span className="text-sm font-bold text-zinc-800">
                              {new Date(issue.resolved_at).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                },
                              )}{" "}
                              às{" "}
                              {new Date(issue.resolved_at).toLocaleTimeString(
                                "pt-BR",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {issue.resolution_notes && (
                        <div className="flex flex-col mt-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100 print:border-black print:bg-white text-left break-words">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
                            Notas do Serviço Técnico
                          </span>
                          <p className="text-sm font-medium text-zinc-700 whitespace-pre-wrap">
                            {issue.resolution_notes}
                          </p>
                        </div>
                      )}

                      {/* NFs */}
                      {(issue.resolution_nfs || issue.resolution_nf) && (
                        <div className="mt-4">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-2">
                            Comprovantes / Notas Fiscais
                          </span>
                          {parsedNfs.length > 0 ? (
                            <div className="space-y-3">
                              {parsedNfs.map((nf: any, idx: number) => {
                                const nfSum =
                                  nf.items?.reduce(
                                    (acc: number, item: any) =>
                                      acc +
                                      Number(item.quantity || 1) *
                                        Number(item.unit_price || 0),
                                    0,
                                  ) || 0;
                                return (
                                  <div
                                    key={idx}
                                    className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm print:border-black print:shadow-none"
                                  >
                                    <div className="flex justify-between items-center font-bold text-zinc-800 border-b border-zinc-100 pb-2 mb-2 print:border-black">
                                      <span>NF #{nf.nf_number || "S/N"}</span>
                                      <span className="text-primary font-black">
                                        R${" "}
                                        {nfSum.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                    </div>
                                    {nf.nf_key && (
                                      <div className="text-[9px] text-zinc-500 font-mono mb-2 break-all">
                                        <strong className="uppercase">
                                          Chave:{" "}
                                        </strong>{" "}
                                        {nf.nf_key}
                                      </div>
                                    )}
                                    {nf.items && nf.items.length > 0 && (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-left text-[9px] uppercase tracking-wider text-zinc-400">
                                            <th className="pb-1 font-bold">
                                              Peça/Serviço
                                            </th>
                                            <th className="pb-1 font-bold text-right">
                                              Qtd
                                            </th>
                                            <th className="pb-1 font-bold text-right">
                                              Valor UN
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="text-zinc-700 font-medium tracking-tight">
                                          {nf.items.map(
                                            (it: any, itIdx: number) => (
                                              <tr key={itIdx}>
                                                <td className="py-0.5 border-t border-zinc-50 print:border-black/20 text-left">
                                                  {it.name}
                                                </td>
                                                <td className="py-0.5 border-t border-zinc-50 print:border-black/20 text-right">
                                                  {it.quantity}
                                                </td>
                                                <td className="py-0.5 border-t border-zinc-50 print:border-black/20 text-right">
                                                  R${" "}
                                                  {Number(
                                                    it.unit_price,
                                                  ).toLocaleString("pt-BR", {
                                                    minimumFractionDigits: 2,
                                                  })}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                );
                              })}
                              <div className="flex justify-between items-center text-sm font-black pt-3 mt-3 border-t border-zinc-200 print:text-black">
                                <span>Total da Manutenção</span>
                                <span className="text-emerald-700 text-xl print:text-black">
                                  R${" "}
                                  {issue.resolution_value.toLocaleString(
                                    "pt-BR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-sm font-medium text-zinc-700 print:border-black print:bg-white text-left break-words">
                              NF: {issue.resolution_nf}
                              {issue.resolution_value > 0 && (
                                <div className="font-black text-primary mt-1">
                                  Valor: R${" "}
                                  {issue.resolution_value.toLocaleString(
                                    "pt-BR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!(issue.resolution_nfs || issue.resolution_nf) && issue.resolution_value > 0 && (
                        <div className="mt-4">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                            Custo Total de Reparo
                          </span>
                          <div className="text-xl font-black text-emerald-700 print:text-black">
                            R${" "}
                            {issue.resolution_value.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      )}

                      {issue.resolution_photos &&
                        issue.resolution_photos.length > 0 && (
                          <div className="mt-4">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 block">
                              Evidências e Fotos do Serviço
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {issue.resolution_photos.map(
                                (pUrl: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={getImageUrl(pUrl) || ""}
                                    alt={`Serviço ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-zinc-200"
                                  />
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </>
                  )}
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
