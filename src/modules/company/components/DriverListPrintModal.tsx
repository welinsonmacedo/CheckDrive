import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Users } from "lucide-react";
import PrintHeader from "./PrintHeader";

interface DriverListPrintModalProps {
  drivers: any[];
  branches?: any[];
  branchName?: string;
  onClose: () => void;
}

export default function DriverListPrintModal({
  drivers,
  branches = [],
  branchName,
  onClose,
}: DriverListPrintModalProps) {
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
        
        {/* Control Bar - Hidden on Print */}
        <div className="p-4 md:px-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-zinc-800 tracking-tight leading-none font-sans">
                Imprimir Relação de Motoristas
              </h2>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1 font-sans">
                {drivers.length} motorista(s) listado(s) {branchName ? `• Filial: ${branchName}` : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 font-sans cursor-pointer"
            >
              <Printer size={16} /> Imprimir Agora
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 print:p-0 overflow-y-auto print:overflow-visible">
          <div className="hidden print:block mb-6">
            <PrintHeader />
            <div className="flex items-center justify-between mt-4 pb-2 border-b border-zinc-200">
              <div>
                <h1 className="text-xl font-black text-zinc-950 uppercase tracking-tight font-sans">
                  Relação de Motoristas
                </h1>
                {branchName && (
                  <p className="text-xs font-bold text-zinc-600 font-sans">
                    Filial: {branchName}
                  </p>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-500 font-sans">
                Data: {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="mb-6 flex justify-between items-center bg-zinc-50 print:bg-transparent p-4 rounded-xl print:p-0 print:rounded-none border border-zinc-100 print:border-b print:border-0 print:border-zinc-800 print:pb-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-sans">
                Resumo da Listagem
              </p>
              <p className="text-sm font-bold text-zinc-800 mt-1 font-sans">
                Total de Motoristas: <span className="text-blue-600 font-black">{drivers.length}</span>
                {branchName ? ` (Filial: ${branchName})` : ""}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b-2 border-zinc-800">
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">Motorista</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">CPF</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">CNH / Cat.</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">Validade CNH</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">Tipo</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">Filial</th>
                <th className="py-3 px-2 font-black text-zinc-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium text-sm">
                    Nenhum motorista cadastrado.
                  </td>
                </tr>
              ) : (
                drivers.map((driver, idx) => {
                  const bObj = branches.find((b) => b.id === driver.branch_id);
                  const bName = bObj ? bObj.name : driver.branch_name || "-";
                  const cnhFormatted = driver.cnh_number
                    ? `${driver.cnh_number}${driver.cnh_category ? ` (${driver.cnh_category})` : ""}`
                    : "-";

                  return (
                    <tr key={driver.id || idx} className="border-b border-zinc-200 print:border-zinc-300">
                      <td className="py-3 px-2 font-bold text-zinc-900">
                        {driver.full_name || "-"}
                        {driver.email && (
                          <span className="block text-[10px] font-normal text-zinc-500">
                            {driver.email}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-mono text-zinc-700">{driver.cpf || "-"}</td>
                      <td className="py-3 px-2 font-mono text-zinc-700">{cnhFormatted}</td>
                      <td className="py-3 px-2 text-zinc-700 whitespace-nowrap">
                        {driver.cnh_expiration_date
                          ? new Date(driver.cnh_expiration_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-zinc-700">{driver.driver_type || "Interno/Pátio"}</td>
                      <td className="py-3 px-2 text-zinc-700 font-semibold">{bName}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            driver.active !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {driver.active !== false ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>,
    document.body
  );
}
