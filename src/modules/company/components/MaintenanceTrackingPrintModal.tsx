import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Calendar, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import PrintHeader from "./PrintHeader";

interface MaintenanceTrackingPrintModalProps {
  alerts: any[];
  odometers: any;
  onClose: () => void;
  user: any;
}

export default function MaintenanceTrackingPrintModal({ alerts, odometers, onClose, user }: MaintenanceTrackingPrintModalProps) {
  useEffect(() => {
    document.body.classList.add("modal-open-for-print");
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = alerts.map((alert) => {
      const isKm = alert.trigger_type === "km";
      let statusText = "Em dia";
      let tipoAlvo = isKm ? "Por KM (Odômetro)" : "Por Data";
      let valorAtual = "-";
      let valorAlvo = "-";
      let faltantes = "-";

      if (isKm) {
        const vehId = alert.target_vehicle_id || alert.vehicle_id;
        const currentKm = odometers[vehId] || 0;
        const intervalKm = Number(alert.interval_km || 0);
        const lastKm = Number(alert.last_km || 0);
        const targetKm = lastKm + intervalKm;
        const remainingKm = targetKm - currentKm;

        const isOverdue = remainingKm <= 0;
        const isNear = remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);

        if (isOverdue) {
          statusText = "Atrasada / Vencida";
        } else if (isNear) {
          statusText = "Próxima do Vencimento";
        }

        valorAtual = `${currentKm.toLocaleString("pt-BR")} KM`;
        valorAlvo = `${targetKm.toLocaleString("pt-BR")} KM`;
        faltantes = isOverdue
          ? `Atrasado ${Math.abs(remainingKm).toLocaleString("pt-BR")} KM`
          : `${remainingKm.toLocaleString("pt-BR")} KM`;
      } else if (alert.trigger_date) {
        const targetDate = new Date(alert.trigger_date + "T00:00:00");
        const diffTime = targetDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;
        const isNear = daysRemaining >= 0 && daysRemaining <= (Number(alert.warning_days) || 7);

        if (isOverdue) {
          statusText = "Atrasada / Vencida";
        } else if (isNear) {
          statusText = "Próxima do Vencimento";
        }

        valorAtual = "-";
        valorAlvo = targetDate.toLocaleDateString("pt-BR");
        faltantes = isOverdue
          ? `Vencido há ${Math.abs(daysRemaining)} dia(s)`
          : `${daysRemaining} dia(s)`;
      }

      return {
        "Status": statusText,
        "Alerta / Serviço": alert.title || "N/A",
        "Veículo / Placa": alert.vehicles?.plate || "N/A",
        "Modelo Veículo": alert.vehicles?.model || "N/A",
        "Motorista / Responsável": alert.profiles?.full_name || "N/A",
        "Tipo Alvo": tipoAlvo,
        "Atual": valorAtual,
        "Alvo / Meta": valorAlvo,
        "Faltantes / Restante": faltantes,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Acompanhamento");
    XLSX.writeFile(wb, `Acompanhamento_Manutencao_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 backdrop-blur-sm print:static print:p-0 print:bg-white print:block overflow-y-auto w-screen h-screen print:w-auto print:h-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col relative print:static print:my-0 print:max-w-none print:shadow-none print:rounded-none print:border-0 print:block overflow-hidden h-[90vh] print:h-auto">
        
        <div className="p-4 md:px-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20 print:hidden shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar size={20} className="text-blue-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-zinc-800 tracking-tight leading-none">
                Imprimir Acompanhamento
              </h2>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {alerts.length} alertas encontrados
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              title="Exportar para Excel (.xlsx)"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
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

        <div className="p-8 print:p-0 overflow-y-auto print:overflow-visible">
          <div className="hidden print:block mb-8">
            <PrintHeader />
            <h1 className="text-xl font-black text-zinc-950 mt-6 mb-2 uppercase">Acompanhamento de Manutenções</h1>
          </div>

          <div className="mb-6 flex justify-between items-center bg-zinc-50 print:bg-transparent p-4 rounded-xl print:p-0 print:rounded-none border border-zinc-100 print:border-b print:border-0 print:border-zinc-800 print:pb-4">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Resumo
              </p>
              <p className="text-sm font-bold text-zinc-800 mt-1">
                Total de Alertas: {alerts.length}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Status</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Alerta / Serviço</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Veículo</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Tipo Alvo</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Atual</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Alvo / Meta</th>
                <th className="py-3 px-2 font-black text-zinc-500 uppercase">Faltantes / Restante</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium text-sm">
                    Nenhum alerta encontrado.
                  </td>
                </tr>
              ) : (
                alerts.map((alert, idx) => {
                  const isKm = alert.trigger_type === "km";
                  let statusText = "Em dia";
                  let statusColor = "text-green-700 bg-green-50 border-green-200";

                  let tipoAlvo = isKm ? "Por KM" : "Por Data";
                  let valorAtual = "-";
                  let valorAlvo = "-";
                  let faltantes = "-";
                  let faltantesColor = "text-zinc-700 font-medium";

                  if (isKm) {
                    const vehId = alert.target_vehicle_id || alert.vehicle_id;
                    const currentKm = odometers[vehId] || 0;
                    const targetKm = Number(alert.last_km || 0) + Number(alert.interval_km || 0);
                    const remainingKm = targetKm - currentKm;
                    const isOverdue = remainingKm <= 0;
                    const isNear = remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);

                    if (isOverdue) {
                      statusText = "Atrasada";
                      statusColor = "text-red-700 bg-red-50 border-red-200";
                      faltantesColor = "text-red-700 font-bold";
                    } else if (isNear) {
                      statusText = "Próxima";
                      statusColor = "text-orange-700 bg-orange-50 border-orange-200";
                      faltantesColor = "text-orange-700 font-bold";
                    }

                    valorAtual = `${currentKm.toLocaleString("pt-BR")} KM`;
                    valorAlvo = `${targetKm.toLocaleString("pt-BR")} KM`;
                    faltantes = isOverdue
                      ? `Atrasado ${Math.abs(remainingKm).toLocaleString("pt-BR")} KM`
                      : `${remainingKm.toLocaleString("pt-BR")} KM`;
                  } else if (alert.trigger_date) {
                    const targetDate = new Date(alert.trigger_date + "T00:00:00");
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = targetDate.getTime() - today.getTime();
                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isOverdue = daysRemaining < 0;
                    const isNear = daysRemaining >= 0 && daysRemaining <= (Number(alert.warning_days) || 7);

                    if (isOverdue) {
                      statusText = "Atrasada";
                      statusColor = "text-red-700 bg-red-50 border-red-200";
                      faltantesColor = "text-red-700 font-bold";
                    } else if (isNear) {
                      statusText = "Próxima";
                      statusColor = "text-orange-700 bg-orange-50 border-orange-200";
                      faltantesColor = "text-orange-700 font-bold";
                    }

                    valorAtual = "-";
                    valorAlvo = targetDate.toLocaleDateString("pt-BR");
                    faltantes = isOverdue
                      ? `Vencido há ${Math.abs(daysRemaining)} dia(s)`
                      : `${daysRemaining} dia(s)`;
                  }

                  return (
                    <tr key={alert.id || idx} className="border-b border-zinc-100 print:border-zinc-200">
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold text-zinc-900">{alert.title || "N/A"}</td>
                      <td className="py-3 px-2 text-zinc-700">{alert.vehicles?.plate || "N/A"}</td>
                      <td className="py-3 px-2 text-zinc-700">{tipoAlvo}</td>
                      <td className="py-3 px-2 text-zinc-700 font-mono">{valorAtual}</td>
                      <td className="py-3 px-2 text-zinc-700 font-mono">{valorAlvo}</td>
                      <td className={`py-3 px-2 ${faltantesColor}`}>{faltantes}</td>
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
