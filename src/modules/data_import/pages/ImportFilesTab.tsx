import React, { useEffect, useState } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ImportJob } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
  onSelectJob: (jobId: string) => void;
}

export default function ImportFilesTab({ companyId, onSelectJob }: Props) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadJobs();
  }, [companyId]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await ImportService.getImportJobs(companyId);
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.nome_arquivo.toLowerCase().includes(search.toLowerCase()) ||
      (j.periodo && j.periodo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Arquivos Importados (Import Jobs)</h3>
          <p className="text-xs text-zinc-500">
            Histórico de arquivos PDF processados e armazenados no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou período..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={loadJobs}
            className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
              <tr>
                <th className="p-4">Arquivo PDF</th>
                <th className="p-4">Período</th>
                <th className="p-4">Data Importação</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Registros</th>
                <th className="p-4 text-center">Novos</th>
                <th className="p-4 text-center">Duplicados</th>
                <th className="p-4 text-center">Conflitos</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-400">
                    Nenhum arquivo de importação encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="p-4 font-bold text-zinc-900 flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div>{job.nome_arquivo}</div>
                        <div className="text-[10px] text-zinc-400 font-normal">ID: {job.id.substring(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-600">{job.periodo || "N/A"}</td>
                    <td className="p-4 text-zinc-500">
                      {new Date(job.data_importacao).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4">
                      {job.status === "concluido" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Concluído
                        </span>
                      )}
                      {job.status === "conflito" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> Com Conflito
                        </span>
                      )}
                      {job.status === "processando" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                          <Clock className="w-3 h-3 animate-spin" /> Processando
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-black text-zinc-900">{job.total_registros}</td>
                    <td className="p-4 text-center font-bold text-emerald-600">{job.novos}</td>
                    <td className="p-4 text-center font-bold text-amber-600">{job.duplicados}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{job.conflitos}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectJob(job.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        Visualizar <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
