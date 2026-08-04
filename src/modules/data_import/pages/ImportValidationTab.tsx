import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { ImportConflict } from "../types";
import { ImportService } from "../services/importService";

interface Props {
  companyId: string;
}

export default function ImportValidationTab({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);

  useEffect(() => {
    loadConflicts();
  }, [companyId]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const data = await ImportService.getConflicts(companyId);
      setConflicts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await ImportService.resolveConflict(id, "Gestor de Frota");
      loadConflicts();
    } catch (e) {
      alert("Erro ao marcar conflito como resolvido.");
    }
  };

  const pending = conflicts.filter((c) => !c.resolvido);
  const resolved = conflicts.filter((c) => c.resolvido);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">
            Validação & Resolução de Conflitos
          </h3>
          <p className="text-xs text-zinc-500">
            Conflitos ocorrem quando o mesmo veículo, data e documento apresentam divergência de valores.
          </p>
        </div>

        <button
          onClick={loadConflicts}
          className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-zinc-200/80 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-zinc-900">Nenhum Conflito Pendente!</h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Todos os relatórios importados bateram com a base existente ou foram inseridos sem divergências.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((conf) => (
            <div
              key={conf.id}
              className="bg-white rounded-3xl p-6 border border-rose-200/80 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900">Conflito ID: {conf.id.substring(0, 8)}</span>
                    <p className="text-[11px] text-rose-600 font-medium">{conf.motivo}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleResolve(conf.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <UserCheck className="w-4 h-4" /> Resolver e Aceitar
                </button>
              </div>

              {/* Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* PDF Value */}
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                    📄 Valor no PDF Importado
                  </span>
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500">Placa:</span>{" "}
                      <span className="font-bold text-zinc-900">{conf.valor_pdf?.placa || "N/I"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Valor:</span>{" "}
                      <span className="font-black text-rose-700 text-sm">
                        R$ {Number(conf.valor_pdf?.valor || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Fornecedor:</span>{" "}
                      <span className="font-medium text-zinc-800">{conf.valor_pdf?.fornecedor || "N/I"}</span>
                    </div>
                  </div>
                </div>

                {/* Existing Value */}
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    💾 Valor Existente em Staging
                  </span>
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500">Placa:</span>{" "}
                      <span className="font-bold text-zinc-900">{conf.valor_existente?.placa || "N/I"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Valor:</span>{" "}
                      <span className="font-black text-zinc-900 text-sm">
                        R$ {Number(conf.valor_existente?.valor || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Fornecedor:</span>{" "}
                      <span className="font-medium text-zinc-800">{conf.valor_existente?.fornecedor || "N/I"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
