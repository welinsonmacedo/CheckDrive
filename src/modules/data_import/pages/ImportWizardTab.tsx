import React, { useState } from "react";
import {
  Upload,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowRight,
  RefreshCw,
  XCircle,
  Database,
  Check,
  Sparkles,
  Link2,
  X,
} from "lucide-react";
import { RecordCategory } from "../types";
import { parseSeniorPdfFile } from "../utils/pdfParser";
import { ImportService } from "../services/importService";
import AccountMappingsManager from "../components/AccountMappingsManager";

interface Props {
  companyId: string;
  onFinished: () => void;
}

const CATEGORIES: RecordCategory[] = [
  "Combustível",
  "Gasolina",
  "Diesel",
  "Arla",
  "Estoque",
  "Pedágio",
  "Multa",
  "Seguro",
  "Manutenção",
  "Lubrificantes",
  "Pneus Novos",
  "Recapagem",
  "Lava-jato",
  "Mecanica / Pecas",
];

export default function ImportWizardTab({ companyId, onFinished }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<RecordCategory[]>([...CATEGORIES]);
  const [step, setStep] = useState<"upload" | "parsing" | "preview" | "saving" | "completed">("upload");
  const [progress, setProgress] = useState<number>(0);
  const [parsedData, setParsedData] = useState<any>(null);
  const [summary, setSummary] = useState({
    total: 0,
    novos: 0,
    duplicados: 0,
    conflitos: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);
  const [showMappingsModal, setShowMappingsModal] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf") && !selected.name.toLowerCase().endsWith(".txt")) {
        alert("Apenas arquivos PDF (ou relatórios TXT Senior) são permitidos!");
        return;
      }
      setFile(selected);
      setErrorMessage(null);
    }
  };

  const toggleCategory = (cat: RecordCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => setSelectedCategories([...CATEGORIES]);
  const clearCategories = () => setSelectedCategories([]);

  const handleStartProcess = async () => {
    if (!file) {
      alert("Por favor, selecione um arquivo PDF em seu computador.");
      return;
    }

    setStep("parsing");
    setProgress(15);
    setErrorMessage(null);

    try {
      // 1. Parse PDF
      setProgress(40);
      const result = await parseSeniorPdfFile(file, companyId);
      setProgress(70);

      if (!result.records || result.records.length === 0) {
        setErrorMessage(
          "Nenhum lançamento com data e valor foi identificado no arquivo PDF selecionado. Certifique-se de enviar um relatório exportado do sistema Senior/SOFTran contendo lançamentos de despesas/frota."
        );
        setStep("upload");
        return;
      }

      // Filter by selected categories
      const filteredRecords = result.records.filter((r) =>
        selectedCategories.includes(r.tipo_registro)
      );

      if (filteredRecords.length === 0) {
        setErrorMessage(
          "Nenhum lançamento do PDF corresponde às categorias selecionadas no filtro. Tente marcar todas as categorias para visualizá-los."
        );
        setStep("upload");
        return;
      }

      // Estimate duplicates/conflicts before saving
      let countNovos = 0;
      let countDuplicados = 0;

      const existingRecords = await ImportService.getImportRecords(companyId);
      const existingHashes = new Set(existingRecords.map((e) => e.hash_registro));

      filteredRecords.forEach((r) => {
        if (existingHashes.has(r.hash_registro)) {
          countDuplicados++;
        } else {
          countNovos++;
        }
      });

      setSummary({
        total: filteredRecords.length,
        novos: countNovos,
        duplicados: countDuplicados,
        conflitos: 0,
      });

      setParsedData({
        ...result,
        records: filteredRecords,
      });

      setProgress(100);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Erro ao processar o arquivo PDF. Verifique se o arquivo está corrompido.");
      setStep("upload");
    }
  };

  const handleConfirmImport = async (autoApprove: boolean = true) => {
    if (!parsedData || !file) return;

    setStep("saving");
    setProgress(20);

    try {
      // 1. Create Job
      const job = await ImportService.createImportJob({
        empresa_id: companyId,
        nome_arquivo: file.name,
        periodo: parsedData.periodo || "Atual",
        status: "processando",
        total_registros: parsedData.records.length,
      });

      setCreatedJobId(job.id);

      await ImportService.addLog(job.id, companyId, "Upload", `Upload do arquivo PDF ${file.name} finalizado com sucesso.`);
      setProgress(40);

      // 2. Save Records & Hash Duplicate Checking
      await ImportService.addLog(job.id, companyId, "Leitura", `Lido PDF Senior/SOFTran. ${parsedData.records.length} lançamentos identificados.`);
      setProgress(70);

      const res = await ImportService.processAndSaveRecords(job.id, companyId, parsedData.records);
      setProgress(85);

      if (autoApprove) {
        // Approve records automatically during confirm
        const approveRes = await ImportService.approveJob(job.id, companyId);
        setIsApproved(true);
        if (approveRes.error) {
          setDbStatusMsg(`Registros salvos localmente. Nota do banco de dados: ${approveRes.error}`);
        } else {
          setDbStatusMsg(`✓ ${approveRes.approvedCount} lançamentos aprovados e gravados com sucesso no banco de dados!`);
        }
      } else {
        setIsApproved(false);
        setDbStatusMsg("Lançamentos gravados em Staging (Pendente de aprovação).");
      }

      setProgress(100);

      setSummary({
        total: res.job.total_registros,
        novos: res.job.novos,
        duplicados: res.job.duplicados,
        conflitos: res.job.conflitos,
      });

      setStep("completed");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar registros no banco de dados.");
      setStep("preview");
    }
  };

  const handleManualApproveJob = async () => {
    if (!createdJobId) return;
    try {
      const approveRes = await ImportService.approveJob(createdJobId, companyId);
      setIsApproved(true);
      setDbStatusMsg(`✓ ${approveRes.approvedCount} lançamentos aprovados e confirmados no banco de dados com sucesso!`);
    } catch (e: any) {
      alert("Erro ao aprovar lançamentos: " + e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                step === "upload" || step === "parsing"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              1
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900">Upload & Filtros</div>
              <div className="text-[11px] text-zinc-400">PDF Senior/SOFTran</div>
            </div>
          </div>

          <div className="flex-1 max-w-[80px] h-0.5 bg-zinc-200 mx-2" />

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                step === "preview"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : step === "saving" || step === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-400"
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900">Pré-Visualização</div>
              <div className="text-[11px] text-zinc-400">SHA-256 e Duplicidades</div>
            </div>
          </div>

          <div className="flex-1 max-w-[80px] h-0.5 bg-zinc-200 mx-2" />

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                step === "completed"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-zinc-100 text-zinc-400"
              }`}
            >
              3
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900">Staging Salvo</div>
              <div className="text-[11px] text-zinc-400">Conclusão</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      {step === "upload" && (
        <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-zinc-900">Importar Relatório Senior / SOFTran</h3>
              <p className="text-xs text-zinc-500">
                Selecione o arquivo PDF exportado pelo sistema Senior. O parser lerá os lançamentos,
                categorizará as contas e aplicará as regras inteligentes de De-Para (ex: 104 = Diesel S10, 106 = Gasolina).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMappingsModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Link2 className="w-4 h-4 text-blue-600" />
              <span>Ver / Editar Vínculos (De-Para)</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-zinc-200 hover:border-blue-400 transition-colors rounded-3xl p-8 text-center bg-zinc-50/50 hover:bg-blue-50/20 relative group">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="space-y-3">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <span className="text-sm font-bold text-zinc-800">
                  {file ? file.name : "Clique para selecionar ou arraste o arquivo PDF"}
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Formatos suportados: PDF (Relatório Senior / SOFTran / Gestão de Frota)
                </p>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" /> Categorias a Importar
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Selecionar Todos
                </button>
                <span className="text-zinc-300">•</span>
                <button
                  type="button"
                  onClick={clearCategories}
                  className="font-bold text-zinc-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 text-blue-800 shadow-sm"
                        : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleStartProcess}
              disabled={!file || selectedCategories.length === 0}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              Processar e Analisar PDF <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Parsing Progress */}
      {step === "parsing" && (
        <div className="bg-white rounded-3xl p-12 border border-zinc-200/80 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-black text-zinc-900">Lendo e Processando PDF...</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Extraindo dados do relatório Senior, gerando hashes SHA-256 e categorizando lançamentos.
            </p>
          </div>
          <div className="w-full max-w-md mx-auto bg-zinc-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === "preview" && parsedData && (
        <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-zinc-900">Pré-Visualização e Validação</h3>
              <p className="text-xs text-zinc-500">
                Verifique os registros encontrados antes de confirmar a gravação no ambiente de Staging.
              </p>
            </div>
            <button
              onClick={() => setStep("upload")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              Cancelar / Escolher Outro Arquivo
            </button>
          </div>

          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Encontrado</span>
              <div className="text-xl font-black text-zinc-800">{summary.total}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Novos Lançamentos</span>
              <div className="text-xl font-black text-emerald-800">{summary.novos}</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Duplicados (SHA-256)</span>
              <div className="text-xl font-black text-amber-800">{summary.duplicados}</div>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Conflitos Detectados</span>
              <div className="text-xl font-black text-rose-800">{summary.conflitos}</div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto border border-zinc-200 rounded-2xl max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 text-zinc-500 font-bold">
                <tr>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Veículo / Placa</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Conta / Descrição</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Valor (R$)</th>
                  <th className="p-3">Hash SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {parsedData.records.slice(0, 100).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-3 font-semibold text-blue-600">{r.tipo_registro}</td>
                    <td className="p-3 font-bold text-zinc-900">{r.placa}</td>
                    <td className="p-3">{r.data}</td>
                    <td className="p-3 max-w-xs truncate" title={r.descricao_conta}>
                      {r.conta}
                    </td>
                    <td className="p-3">{r.quantidade}</td>
                    <td className="p-3 font-bold text-zinc-900">
                      R$ {Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                      {r.hash_registro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <span className="text-xs text-zinc-400">
              * Exibindo os primeiros 100 registros para pré-visualização.
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleConfirmImport(false)}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-all"
              >
                Gravar apenas em Staging
              </button>
              <button
                onClick={() => handleConfirmImport(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprovar Lançamentos & Gravar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Progress */}
      {step === "saving" && (
        <div className="bg-white rounded-3xl p-12 border border-zinc-200/80 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-zinc-900">Gravando e Aprovando no Banco de Dados...</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Salvando lote de importação, registros e confirmando gravações no banco de dados.
            </p>
          </div>
          <div className="w-full max-w-md mx-auto bg-zinc-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed Step */}
      {step === "completed" && (
        <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-black text-zinc-900">Importação Concluída com Sucesso!</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Os dados do relatório PDF foram armazenados com segurança na área de Staging e Banco de Dados.
            </p>
          </div>

          {dbStatusMsg && (
            <div className={`p-4 rounded-2xl text-xs font-medium max-w-2xl mx-auto ${
              isApproved ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-zinc-100 text-zinc-700 border border-zinc-200"
            }`}>
              {dbStatusMsg}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Processados</span>
              <div className="text-lg font-black text-zinc-800">{summary.total}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Novos Salvos</span>
              <div className="text-lg font-black text-emerald-800">{summary.novos}</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Duplicados</span>
              <div className="text-lg font-black text-amber-800">{summary.duplicados}</div>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Conflitos</span>
              <div className="text-lg font-black text-rose-800">{summary.conflitos}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {!isApproved && (
              <button
                onClick={handleManualApproveJob}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprovar e Confirmar no Banco Agora
              </button>
            )}
            <button
              onClick={() => {
                setFile(null);
                setStep("upload");
                setIsApproved(false);
                setDbStatusMsg(null);
              }}
              className="px-5 py-3 rounded-2xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors"
            >
              Importar Outro Arquivo
            </button>
            <button
              onClick={onFinished}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"
            >
              Ver Registros Aprovados / Tabela
            </button>
          </div>
        </div>
      )}

      {/* Account Mappings Modal */}
      {showMappingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full my-8 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl p-2 shadow-2xl relative">
              <button
                onClick={() => setShowMappingsModal(false)}
                className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full z-10 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <AccountMappingsManager companyId={companyId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
