import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Droplet } from "lucide-react";
import PrintHeader from "./PrintHeader";

interface FuelListPrintModalProps {
  submissions: any[];
  onClose: () => void;
  user: any;
}

export default function FuelListPrintModal({ submissions, onClose, user }: FuelListPrintModalProps) {
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden h-[90vh] print:h-auto">
        
        {/* Screen Header */}
        <div className="p-4 md:px-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Droplet size={20} className="text-blue-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-zinc-800 tracking-tight leading-none">
                Imprimir Abastecimentos
              </h2>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {submissions.length} itens encontrados
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
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

        {/* Print Content */}
        <div className="p-8 print:p-0 overflow-y-auto print:overflow-visible">
          <div className="hidden print:block mb-8">
            <PrintHeader />
            <h1 className="text-xl font-black text-zinc-950 mt-6 mb-2 uppercase">Relatório de Abastecimentos</h1>
          </div>

          <div className="mb-6 flex justify-between items-center bg-zinc-50 print:bg-transparent p-4 rounded-xl print:p-0 print:rounded-none border border-zinc-100 print:border-b print:border-0 print:border-zinc-800 print:pb-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Resumo
              </p>
              <p className="text-sm font-bold text-zinc-800 mt-1">
                Total de Registros: {submissions.length}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">#</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Data / Hora</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Placa</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Motorista</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase text-right">KM</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase text-right">Litragem</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase text-right">Posto</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium text-sm">
                    Nenhum abastecimento encontrado nesta lista.
                  </td>
                </tr>
              ) : (
                submissions.map((sub, idx) => {
                  const plate = sub.vehicles?.plate || "Sem Placa";
                  const driver = sub.profiles?.full_name || sub.driver_profiles?.full_name || "N/A";
                  const dateStr = new Date(sub.created_at).toLocaleDateString("pt-BR") + " " + new Date(sub.created_at).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
                  const odometer = sub.odometer ? sub.odometer.toString() : "-";
                  const liters = sub.details?.manual_liters != null ? sub.details.manual_liters.toString() : (sub.details?.itemValues?.gas_station_liters || "-");
                  const station = sub.details?.itemValues?.gas_station || "-";

                  return (
                    <tr key={sub.id || idx} className="border-b border-zinc-100 print:border-zinc-200">
                      <td className="py-3 px-2 font-bold text-zinc-400">{idx + 1}</td>
                      <td className="py-3 px-2 text-zinc-700 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-2 font-bold text-zinc-900 whitespace-nowrap">{plate}</td>
                      <td className="py-3 px-2 text-zinc-700 truncate max-w-[150px]">{driver}</td>
                      <td className="py-3 px-2 text-zinc-700 text-right">{odometer}</td>
                      <td className="py-3 px-2 font-bold text-zinc-900 text-right">{liters} L</td>
                      <td className="py-3 px-2 text-zinc-700 text-right">{station}</td>
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
