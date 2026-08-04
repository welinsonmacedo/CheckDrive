import React, { useEffect, useState } from "react";
import { History, RefreshCw, FileText, CheckCircle2, Clock } from "lucide-react";
import { ImportLog } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
}

export default function ImportHistoryTab({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ImportLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, [companyId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await ImportService.getLogs(companyId);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Histórico de Execução & Logs</h3>
          <p className="text-xs text-zinc-500">
            Trilha de auditoria das etapas de upload, leitura, parser, validação e gravação.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden p-6 space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs">
            Nenhum registro de log encontrado.
          </div>
        ) : (
          <div className="relative border-l-2 border-zinc-100 ml-4 space-y-6 pl-6">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200">
                      {log.etapa}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(log.criado_em).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-800 font-medium">{log.mensagem}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">Job ID: {log.import_job_id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
