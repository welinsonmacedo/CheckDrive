import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Shield } from "lucide-react";
import PrintHeader from "./PrintHeader";

interface AuditListPrintModalProps {
  logs: any[];
  onClose: () => void;
  user: any;
}

export default function AuditListPrintModal({ logs, onClose, user }: AuditListPrintModalProps) {
  useEffect(() => {
    document.body.classList.add("modal-open-for-print");
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 backdrop-blur-sm print:static print:p-0 print:bg-white print:block overflow-y-auto w-screen h-screen print:w-auto print:h-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden h-[90vh] print:h-auto">
        
        <div className="p-4 md:px-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Shield size={20} className="text-purple-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-zinc-800 tracking-tight leading-none">
                Imprimir Logs do Sistema
              </h2>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {logs.length} registros encontrados
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
            >
              <Printer size={16} /> Imprimir Agora
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-8 print:p-0 overflow-y-auto print:overflow-visible">
          <div className="hidden print:block mb-8">
            <PrintHeader />
            <h1 className="text-xl font-black text-zinc-950 mt-6 mb-2 uppercase">Logs do Sistema (Auditoria)</h1>
          </div>

          <div className="mb-6 flex justify-between items-center bg-zinc-50 print:bg-transparent p-4 rounded-xl print:p-0 print:rounded-none border border-zinc-100 print:border-b print:border-0 print:border-zinc-800 print:pb-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Resumo
              </p>
              <p className="text-sm font-bold text-zinc-800 mt-1">
                Total de Registros: {logs.length}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Data / Hora</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Usuário</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Módulo</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Ação</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Entidade</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Motivo/Obs</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium text-sm">
                    Nenhum registro de log encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  return (
                    <tr key={log.id || idx} className="border-b border-zinc-100 print:border-zinc-200">
                      <td className="py-3 px-2 text-zinc-700 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-zinc-900">{log.user_name || "Sistema"}</div>
                        <div className="text-[10px] text-zinc-500">{log.user_email || ""}</div>
                      </td>
                      <td className="py-3 px-2 text-zinc-700">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {log.module || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {log.action || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-zinc-700">
                        <span className="font-bold">{log.entity || "-"}</span> {log.entity_id ? `(#${log.entity_id.substring(0, 8)}...)` : ""}
                      </td>
                      <td className="py-3 px-2 text-zinc-700">{log.reason || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="hidden print:flex mt-12 pt-4 border-t border-zinc-200 justify-between items-center text-[10px] text-zinc-500">
            <span>CheckDrive System - Documento para uso interno e operacional</span>
            <span>Emitido por: {user?.email || 'Administrador'}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
