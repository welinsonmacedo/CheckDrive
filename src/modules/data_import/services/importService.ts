import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { ImportJob, ImportRecord, ImportConflict, ImportLog, ImportJobStatus, ReportMold } from "../types";

const JOBS_STORE = localforage.createInstance({ name: "checkdrive_import_jobs" });
const RECORDS_STORE = localforage.createInstance({ name: "checkdrive_import_records" });
const CONFLICTS_STORE = localforage.createInstance({ name: "checkdrive_import_conflicts" });
const LOGS_STORE = localforage.createInstance({ name: "checkdrive_import_logs" });
const MOLDS_STORE = localforage.createInstance({ name: "checkdrive_import_molds" });

/**
 * Ensures any string ID (like "caiapo" or "default_company") is formatted as a valid UUID v4 string for PostgreSQL UUID columns.
 */
export function formatUuid(id: string | undefined): string {
  if (!id) return "00000000-0000-0000-0000-000000000000";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0").substring(0, 12)}`;
}

export class ImportService {
  /**
   * Fetch all Import Jobs for an enterprise
   */
  static async getImportJobs(companyId: string): Promise<ImportJob[]> {
    const formattedCompanyId = formatUuid(companyId);
    const jobMap = new Map<string, ImportJob>();

    try {
      let query = supabase.from("import_jobs").select("*");
      if (companyId && companyId !== "all") {
        query = query.eq("empresa_id", formattedCompanyId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data) {
        data.forEach((j: any) => jobMap.set(j.id, j as ImportJob));
      } else if (error) {
        console.warn("Supabase import_jobs fetch error:", error.message);
      }
    } catch (e) {
      console.warn("Supabase import_jobs fetch fallback to local storage:", e);
    }

    // Local fallback / merge
    await JOBS_STORE.iterate((value: ImportJob) => {
      const matchCompany = !companyId || companyId === "all" || value.empresa_id === companyId || value.empresa_id === formattedCompanyId;
      if (matchCompany && !jobMap.has(value.id)) {
        jobMap.set(value.id, value);
      }
    });

    const jobs = Array.from(jobMap.values());
    return jobs.sort(
      (a, b) => new Date(b.created_at || b.data_importacao || 0).getTime() - new Date(a.created_at || a.data_importacao || 0).getTime()
    );
  }

  /**
   * Create a new Import Job
   */
  static async createImportJob(job: Partial<ImportJob>): Promise<ImportJob> {
    const companyId = job.empresa_id || "default_company";
    const formattedCompanyId = formatUuid(companyId);
    const formattedUserId = formatUuid(job.usuario_id || "default_user");

    const newJob: ImportJob = {
      id: job.id || crypto.randomUUID(),
      empresa_id: companyId,
      usuario_id: job.usuario_id || "user",
      usuario_nome: job.usuario_nome || "Gestor de Frota",
      nome_arquivo: job.nome_arquivo || "relatorio.pdf",
      periodo: job.periodo || "Atual",
      data_importacao: new Date().toISOString(),
      status: job.status || "processando",
      total_registros: job.total_registros || 0,
      novos: job.novos || 0,
      duplicados: job.duplicados || 0,
      conflitos: job.conflitos || 0,
      erros: job.erros || 0,
      observacoes: job.observacoes || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const payloadForSupabase = {
      ...newJob,
      empresa_id: formattedCompanyId,
      usuario_id: formattedUserId,
    };

    try {
      const { data, error } = await supabase.from("import_jobs").insert(payloadForSupabase).select().single();
      if (!error && data) {
        await JOBS_STORE.setItem(newJob.id, data);
        return { ...data, empresa_id: companyId } as ImportJob;
      } else if (error) {
        console.warn("Supabase import_jobs insert error:", error.message);
      }
    } catch (e) {
      console.warn("Supabase import_jobs insert exception:", e);
    }

    await JOBS_STORE.setItem(newJob.id, newJob);
    return newJob;
  }

  /**
   * Update an existing Import Job
   */
  static async updateImportJob(id: string, updates: Partial<ImportJob>): Promise<void> {
    const updated_at = new Date().toISOString();
    const payload = { ...updates, updated_at };

    try {
      await supabase.from("import_jobs").update(payload).eq("id", id);
    } catch (e) {
      // ignore
    }

    const existing = (await JOBS_STORE.getItem<ImportJob>(id)) || {};
    await JOBS_STORE.setItem(id, { ...existing, ...payload });
  }

  /**
   * Save batch of records with Hash Duplicate & Conflict Checking
   */
  static async processAndSaveRecords(
    jobId: string,
    companyId: string,
    rawRecords: Omit<ImportRecord, "id" | "import_job_id" | "empresa_id" | "status" | "conflito">[]
  ): Promise<{
    job: ImportJob;
    savedRecords: ImportRecord[];
    conflicts: ImportConflict[];
    supabaseError?: string;
  }> {
    const formattedCompanyId = formatUuid(companyId);

    // 1. Get existing records to check duplicates & conflicts
    const existingHashes = new Set<string>();
    const existingRecordsList: ImportRecord[] = [];

    try {
      const { data } = await supabase
        .from("import_records")
        .select("*")
        .eq("empresa_id", formattedCompanyId);

      if (data) {
        data.forEach((r: any) => {
          if (r.hash_registro) existingHashes.add(r.hash_registro);
          existingRecordsList.push(r);
        });
      }
    } catch (e) {
      // Local check fallback
    }

    // Local check merge
    await RECORDS_STORE.iterate((r: ImportRecord) => {
      if (r.empresa_id === companyId || r.empresa_id === formattedCompanyId) {
        if (r.hash_registro) existingHashes.add(r.hash_registro);
        existingRecordsList.push(r);
      }
    });

    let countNovos = 0;
    let countDuplicados = 0;
    let countConflitos = 0;
    let countErros = 0;

    const savedRecords: ImportRecord[] = [];
    const conflictsList: ImportConflict[] = [];

    await this.addLog(jobId, companyId, "Hash", "Iniciando verificação de SHA-256 e detecção de duplicidades.");

    for (const raw of rawRecords) {
      const recordId = crypto.randomUUID();
      let status: "novo" | "duplicado" | "conflito" | "erro" = "novo";
      let isConflict = false;

      // 1. Check if hash already exists -> Duplicado
      if (existingHashes.has(raw.hash_registro)) {
        status = "duplicado";
        countDuplicados++;
      } else {
        // 2. Check for potential conflict
        const matchingExisting = existingRecordsList.find(
          (ex) =>
            ex.placa === raw.placa &&
            ex.data === raw.data &&
            ex.documento &&
            raw.documento &&
            ex.documento === raw.documento &&
            ex.valor !== raw.valor
        );

        if (matchingExisting) {
          status = "conflito";
          isConflict = true;
          countConflitos++;

          const conflictObj: ImportConflict = {
            id: crypto.randomUUID(),
            import_record_id: recordId,
            empresa_id: companyId,
            motivo: `Divergência de valor para documento ${raw.documento} (PDF: R$ ${raw.valor.toFixed(
              2
            )}, Existente: R$ ${matchingExisting.valor.toFixed(2)})`,
            valor_pdf: raw,
            valor_existente: matchingExisting,
            resolvido: false,
            created_at: new Date().toISOString(),
          };

          conflictsList.push(conflictObj);
        } else {
          status = "novo";
          countNovos++;
          existingHashes.add(raw.hash_registro);
        }
      }

      const rec: ImportRecord = {
        ...raw,
        id: recordId,
        import_job_id: jobId,
        empresa_id: companyId,
        status,
        conflito: isConflict,
        criado_em: new Date().toISOString(),
      };

      savedRecords.push(rec);
    }

    await this.addLog(
      jobId,
      companyId,
      "Validação",
      `Processados ${rawRecords.length} registros: ${countNovos} novos, ${countDuplicados} duplicados, ${countConflitos} conflitos.`
    );

    let supabaseErrorMsg: string | undefined = undefined;

    // Save records to Supabase with formatted UUID
    try {
      const supabaseRecords = savedRecords.map((r) => ({
        id: r.id,
        import_job_id: r.import_job_id,
        empresa_id: formattedCompanyId,
        tipo_registro: r.tipo_registro,
        placa: r.placa,
        numero_frota: r.numero_frota || null,
        data: r.data || null,
        conta: r.conta || null,
        descricao_conta: r.descricao_conta || null,
        quantidade: typeof r.quantidade === "number" && !isNaN(r.quantidade) ? r.quantidade : 1,
        valor: typeof r.valor === "number" && !isNaN(r.valor) ? r.valor : 0,
        hodometro: typeof r.hodometro === "number" && !isNaN(r.hodometro) ? Math.round(r.hodometro) : null,
        preco_litro: typeof r.preco_litro === "number" && !isNaN(r.preco_litro) ? r.preco_litro : null,
        media_km_l: typeof r.media_km_l === "number" && !isNaN(r.media_km_l) ? r.media_km_l : null,
        km_rodado: typeof r.km_rodado === "number" && !isNaN(r.km_rodado) ? r.km_rodado : null,
        preco_por_km: typeof r.preco_por_km === "number" && !isNaN(r.preco_por_km) ? r.preco_por_km : null,
        fornecedor: r.fornecedor || null,
        documento: r.documento || null,
        numero_controle: r.numero_controle || null,
        observacoes: r.observacoes || null,
        hash_registro: r.hash_registro,
        status: r.status,
        conflito: Boolean(r.conflito),
        criado_em: r.criado_em || new Date().toISOString(),
      }));

      const { error: recErr } = await supabase.from("import_records").insert(supabaseRecords);
      if (recErr) {
        console.warn("Supabase import_records batch save error:", recErr.message);
        if (recErr.message.includes("does not exist") || recErr.message.includes("400") || recErr.message === "Bad Request") {
          supabaseErrorMsg = "Tabela 'import_records' pendente no Supabase. Os dados foram salvos no Staging Local.";
        } else {
          supabaseErrorMsg = recErr.message;
        }
      }

      if (conflictsList.length > 0) {
        const supabaseConflicts = conflictsList.map((c) => ({
          id: c.id,
          import_record_id: c.import_record_id,
          empresa_id: formattedCompanyId,
          motivo: c.motivo,
          valor_pdf: c.valor_pdf || {},
          valor_existente: c.valor_existente || {},
          resolvido: Boolean(c.resolvido),
          resolvido_por: c.resolvido_por || null,
          data_resolucao: c.data_resolucao || null,
          created_at: c.created_at || new Date().toISOString(),
        }));
        await supabase.from("import_conflicts").insert(supabaseConflicts);
      }
    } catch (e: any) {
      console.warn("Supabase import_records batch save fallback:", e);
      supabaseErrorMsg = e?.message || "Salvo em Staging Local";
    }

    // Save local copy
    for (const r of savedRecords) {
      await RECORDS_STORE.setItem(r.id, r);
    }
    for (const c of conflictsList) {
      await CONFLICTS_STORE.setItem(c.id, c);
    }

    // Update Job metrics
    const finalJobStatus: ImportJobStatus = countConflitos > 0 ? "conflito" : "concluido";
    await this.updateImportJob(jobId, {
      total_registros: rawRecords.length,
      novos: countNovos,
      duplicados: countDuplicados,
      conflitos: countConflitos,
      erros: countErros,
      status: finalJobStatus,
    });

    const updatedJob = (await JOBS_STORE.getItem<ImportJob>(jobId)) || {
      id: jobId,
      empresa_id: companyId,
      nome_arquivo: "relatorio.pdf",
      data_importacao: new Date().toISOString(),
      status: finalJobStatus,
      total_registros: rawRecords.length,
      novos: countNovos,
      duplicados: countDuplicados,
      conflitos: countConflitos,
      erros: countErros,
    };

    await this.addLog(
      jobId,
      companyId,
      "Conclusão",
      `Importação concluída com sucesso. ${countNovos} novos lançamentos armazenados. Status final: ${finalJobStatus}.`
    );

    return {
      job: updatedJob,
      savedRecords,
      conflicts: conflictsList,
      supabaseError: supabaseErrorMsg,
    };
  }

  /**
   * Approve records (Aprovar Lançamentos e Gravar/Confirmar no Banco)
   */
  static async approveRecords(
    recordIds: string[],
    companyId: string
  ): Promise<{ success: boolean; approvedCount: number; error?: string }> {
    if (!recordIds || recordIds.length === 0) {
      return { success: true, approvedCount: 0 };
    }

    const formattedCompanyId = formatUuid(companyId);
    let approvedCount = 0;
    let dbError: string | undefined = undefined;

    // 1. Update in local storage
    for (const id of recordIds) {
      const existing = await RECORDS_STORE.getItem<ImportRecord>(id);
      if (existing) {
        const updated: ImportRecord = { ...existing, status: "aprovado" };
        await RECORDS_STORE.setItem(id, updated);
        approvedCount++;
      }
    }

    // 2. Update in Supabase
    try {
      const { error } = await supabase
        .from("import_records")
        .update({ status: "aprovado" })
        .in("id", recordIds);

      if (error) {
        console.warn("Supabase approveRecords error:", error.message);
        if (error.message.includes("does not exist") || error.message.includes("400") || error.message === "Bad Request") {
          dbError = "Tabela 'import_records' pendente no Supabase (Crie a tabela em 'Configurações' para sync em nuvem).";
        } else {
          dbError = error.message;
        }
      }
    } catch (e: any) {
      console.warn("Supabase approveRecords exception:", e);
      dbError = e?.message || "Exceção no banco de dados";
    }

    // 3. Add execution log
    await this.addLog(
      recordIds[0] || "batch",
      companyId,
      "Aprovação",
      `${approvedCount} lançamento(s) aprovado(s) e confirmado(s) no banco de dados com sucesso.`
    );

    return {
      success: !dbError,
      approvedCount,
      error: dbError,
    };
  }

  /**
   * Approve entire Job
   */
  static async approveJob(
    jobId: string,
    companyId: string
  ): Promise<{ success: boolean; approvedCount: number; error?: string }> {
    const records = await this.getImportRecords(companyId, jobId);
    const toApproveIds = records.filter((r) => r.status !== "duplicado").map((r) => r.id);

    const result = await this.approveRecords(toApproveIds, companyId);
    await this.updateImportJob(jobId, { status: "aprovado" });

    return result;
  }

  /**
   * Update category for a single or multiple import records
   */
  static async updateRecordCategory(
    recordIds: string[],
    newCategory: string,
    companyId: string
  ): Promise<boolean> {
    if (!recordIds || recordIds.length === 0) return true;

    // 1. Local storage update
    for (const id of recordIds) {
      const existing = await RECORDS_STORE.getItem<ImportRecord>(id);
      if (existing) {
        const updated: ImportRecord = { ...existing, tipo_registro: newCategory as any };
        await RECORDS_STORE.setItem(id, updated);
      }
    }

    // 2. Supabase update
    try {
      await supabase
        .from("import_records")
        .update({ tipo_registro: newCategory })
        .in("id", recordIds);
    } catch (e) {
      console.warn("Supabase updateRecordCategory error:", e);
    }

    return true;
  }

  /**
   * Fetch imported records with optional filters, merging Supabase and Local Storage
   */
  static async getImportRecords(companyId: string, jobId?: string): Promise<ImportRecord[]> {
    const formattedCompanyId = formatUuid(companyId);
    const recordMap = new Map<string, ImportRecord>();

    // 1. Fetch from Supabase
    try {
      let query = supabase.from("import_records").select("*");

      if (companyId && companyId !== "all") {
        query = query.eq("empresa_id", formattedCompanyId);
      }

      if (jobId) {
        query = query.eq("import_job_id", jobId);
      }

      const { data, error } = await query.order("criado_em", { ascending: false });

      if (error) {
        console.warn("Supabase getImportRecords error:", error.message);
      } else if (data) {
        data.forEach((r: any) => {
          recordMap.set(r.id, r as ImportRecord);
        });
      }
    } catch (e) {
      console.warn("Supabase getImportRecords exception:", e);
    }

    // 2. Fetch from Local Storage (merge local records if offline or not in Supabase)
    await RECORDS_STORE.iterate((r: ImportRecord) => {
      const matchCompany = !companyId || companyId === "all" || r.empresa_id === companyId || r.empresa_id === formattedCompanyId;
      const matchJob = !jobId || r.import_job_id === jobId;
      if (matchCompany && matchJob) {
        if (!recordMap.has(r.id)) {
          recordMap.set(r.id, r);
        }
      }
    });

    const records = Array.from(recordMap.values());
    return records.sort(
      (a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime()
    );
  }

  /**
   * Fetch conflicts
   */
  static async getConflicts(companyId: string): Promise<ImportConflict[]> {
    const formattedCompanyId = formatUuid(companyId);
    const conflictMap = new Map<string, ImportConflict>();

    try {
      let query = supabase.from("import_conflicts").select("*");
      if (companyId && companyId !== "all") {
        query = query.eq("empresa_id", formattedCompanyId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data) {
        data.forEach((c: any) => conflictMap.set(c.id, c as ImportConflict));
      }
    } catch (e) {
      console.warn("Supabase getConflicts error:", e);
    }

    await CONFLICTS_STORE.iterate((c: ImportConflict) => {
      const matchCompany = !companyId || companyId === "all" || c.empresa_id === companyId || c.empresa_id === formattedCompanyId;
      if (matchCompany && !conflictMap.has(c.id)) {
        conflictMap.set(c.id, c);
      }
    });

    return Array.from(conflictMap.values());
  }

  /**
   * Resolve conflict
   */
  static async resolveConflict(conflictId: string, resolvedBy: string): Promise<void> {
    const data_resolucao = new Date().toISOString();
    try {
      await supabase
        .from("import_conflicts")
        .update({ resolvido: true, resolvido_por: resolvedBy, data_resolucao })
        .eq("id", conflictId);
    } catch (e) {
      // ignore
    }

    const existing = await CONFLICTS_STORE.getItem<ImportConflict>(conflictId);
    if (existing) {
      await CONFLICTS_STORE.setItem(conflictId, {
        ...existing,
        resolvido: true,
        resolvido_por: resolvedBy,
        data_resolucao,
      });

      // Also mark associated record as resolved / novo
      const rec = await RECORDS_STORE.getItem<ImportRecord>(existing.import_record_id);
      if (rec) {
        await RECORDS_STORE.setItem(rec.id, { ...rec, status: "aprovado", conflito: false });
        try {
          await supabase
            .from("import_records")
            .update({ status: "aprovado", conflito: false })
            .eq("id", rec.id);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  /**
   * Add execution log
   */
  static async addLog(jobId: string, companyId: string, etapa: string, mensagem: string): Promise<void> {
    const formattedCompanyId = formatUuid(companyId);
    const log: ImportLog = {
      id: crypto.randomUUID(),
      import_job_id: jobId,
      empresa_id: companyId,
      etapa,
      mensagem,
      criado_em: new Date().toISOString(),
    };

    try {
      await supabase.from("import_logs").insert({
        ...log,
        empresa_id: formattedCompanyId,
      });
    } catch (e) {
      // ignore
    }

    await LOGS_STORE.setItem(log.id, log);
  }

  /**
   * Delete an entire Import Job and its associated records, conflicts, and logs
   */
  static async deleteImportJob(jobId: string, companyId: string): Promise<boolean> {
    const formattedCompanyId = formatUuid(companyId);

    // 1. Supabase Deletions
    try {
      await supabase.from("import_records").delete().eq("import_job_id", jobId);
      await supabase.from("import_logs").delete().eq("import_job_id", jobId);
      await supabase.from("import_jobs").delete().eq("id", jobId);
    } catch (e) {
      console.warn("Supabase deleteImportJob error:", e);
    }

    // 2. Local Forage Deletions
    await JOBS_STORE.removeItem(jobId);

    const recordKeysToRemove: string[] = [];
    await RECORDS_STORE.iterate((r: ImportRecord, key) => {
      if (r.import_job_id === jobId) {
        recordKeysToRemove.push(key);
      }
    });
    for (const key of recordKeysToRemove) {
      await RECORDS_STORE.removeItem(key);
    }

    const logKeysToRemove: string[] = [];
    await LOGS_STORE.iterate((l: ImportLog, key) => {
      if (l.import_job_id === jobId) {
        logKeysToRemove.push(key);
      }
    });
    for (const key of logKeysToRemove) {
      await LOGS_STORE.removeItem(key);
    }

    const conflictKeysToRemove: string[] = [];
    await CONFLICTS_STORE.iterate((c: ImportConflict, key) => {
      if (c.empresa_id === companyId || c.empresa_id === formattedCompanyId) {
        conflictKeysToRemove.push(key);
      }
    });
    for (const key of conflictKeysToRemove) {
      await CONFLICTS_STORE.removeItem(key);
    }

    return true;
  }

  /**
   * Fetch execution logs
   */
  static async getLogs(companyId: string, jobId?: string): Promise<ImportLog[]> {
    const formattedCompanyId = formatUuid(companyId);
    const logMap = new Map<string, ImportLog>();

    try {
      let query = supabase.from("import_logs").select("*");

      if (companyId && companyId !== "all") {
        query = query.eq("empresa_id", formattedCompanyId);
      }
      if (jobId) query = query.eq("import_job_id", jobId);

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (!error && data) {
        data.forEach((l: any) => logMap.set(l.id, l as ImportLog));
      }
    } catch (e) {
      console.warn("Supabase getLogs error:", e);
    }

    await LOGS_STORE.iterate((l: ImportLog) => {
      const matchCompany = !companyId || companyId === "all" || l.empresa_id === companyId || l.empresa_id === formattedCompanyId;
      const matchJob = !jobId || l.import_job_id === jobId;
      if (matchCompany && matchJob && !logMap.has(l.id)) {
        logMap.set(l.id, l);
      }
    });

    const logs = Array.from(logMap.values());
    return logs.sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());
  }

  /**
   * Fetch Report Molds (templates) for an enterprise, including defaults
   */
  static async getReportMolds(companyId: string): Promise<ReportMold[]> {
    const formattedCompanyId = formatUuid(companyId);
    
    // Default built-in molds
    const defaultMolds: ReportMold[] = [
      {
        id: "mold_default_1",
        empresa_id: companyId,
        nome: "Resumo de Gastos por Categoria",
        descricao: "Agrupa todas as despesas importadas por tipo de registro (Combustível, Pedágio, Manutenção, etc).",
        icon: "PieChart",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "categoria",
        metrica: "soma_valor",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_gfv",
        empresa_id: companyId,
        nome: "Relatório: Consumo de Combustível (GFV)",
        descricao: "Relatório exclusivo dos dados importados do relatório de Consumo por Veículo (GFV) com litros, média Km/L e preço/litro.",
        icon: "Fuel",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "combustivel_gfv",
        periodo_dias: 0,
        agrupar_por: "placa",
        metrica: "soma_quantidade",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_softran",
        empresa_id: companyId,
        nome: "Relatório: Receitas e Despesas (SOFtran)",
        descricao: "Relatório exclusivo dos dados importados do relatório de Receitas/Despesas por Veículo (SOFtran/Senior).",
        icon: "FileSpreadsheet",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "receitas_despesas",
        periodo_dias: 0,
        agrupar_por: "categoria",
        metrica: "soma_valor",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_tipo_imp",
        empresa_id: companyId,
        nome: "Comparativo por Tipo de Importação",
        descricao: "Compara o total acumulado e volume de lançamentos entre Consumo de Combustível (GFV) vs Receitas/Despesas (SOFtran).",
        icon: "Layers",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "tipo_importacao",
        metrica: "soma_valor",
        tipo_grafico: "pie",
        e_padrao: true,
      },
      {
        id: "mold_default_top_high",
        empresa_id: companyId,
        nome: "Top 10 Veículos com Maior Custo",
        descricao: "Ranking dos 10 veículos de maior custo acumulado, com detalhamento das categorias e quantidade de viagens/abastecimentos.",
        icon: "Truck",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "placa",
        metrica: "soma_valor",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_top_low",
        empresa_id: companyId,
        nome: "Top 10 Veículos com Menor Custo",
        descricao: "Ranking dos 10 veículos de menor custo registrado, com detalhamento das categorias e quantidade de viagens/abastecimentos.",
        icon: "Truck",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "placa",
        metrica: "soma_valor",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_2",
        empresa_id: companyId,
        nome: "Custos por Placa e Frota",
        descricao: "Analisa o acumulado financeiro de cada veículo/placa com número de lançamentos e totais.",
        icon: "Truck",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "placa",
        metrica: "soma_valor",
        tipo_grafico: "bar",
        e_padrao: true,
      },
      {
        id: "mold_default_4",
        empresa_id: companyId,
        nome: "Despesas por Fornecedor / Posto",
        descricao: "Mapeamento das maiores despesas concentradas por fornecedores e postos parceiros.",
        icon: "Building2",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "fornecedor",
        metrica: "soma_valor",
        tipo_grafico: "pie",
        e_padrao: true,
      },
      {
        id: "mold_default_5",
        empresa_id: companyId,
        nome: "Evolução Mensal de Gastos",
        descricao: "Acompanhamento da curva mensal de despesas ao longo do tempo.",
        icon: "TrendingUp",
        categoria_filtro: "Todas",
        tipo_importacao_filtro: "Todas",
        periodo_dias: 0,
        agrupar_por: "mes",
        metrica: "soma_valor",
        tipo_grafico: "area",
        e_padrao: true,
      },
    ];

    const userMolds: ReportMold[] = [];
    await MOLDS_STORE.iterate((mold: ReportMold) => {
      if (mold.empresa_id === companyId || mold.empresa_id === formattedCompanyId) {
        userMolds.push(mold);
      }
    });

    return [...defaultMolds, ...userMolds];
  }

  /**
   * Save a user report mold
   */
  static async saveReportMold(mold: Partial<ReportMold>): Promise<ReportMold> {
    const newMold: ReportMold = {
      id: mold.id || `mold_custom_${crypto.randomUUID()}`,
      empresa_id: mold.empresa_id || "default_company",
      nome: mold.nome || "Novo Molde de Relatório",
      descricao: mold.descricao || "",
      icon: mold.icon || "FileText",
      categoria_filtro: mold.categoria_filtro || "Todas",
      periodo_dias: mold.periodo_dias ?? 0,
      placa_filtro: mold.placa_filtro || "",
      fornecedor_filtro: mold.fornecedor_filtro || "",
      agrupar_por: mold.agrupar_por || "categoria",
      metrica: mold.metrica || "soma_valor",
      tipo_grafico: mold.tipo_grafico || "bar",
      e_padrao: false,
      created_at: mold.created_at || new Date().toISOString(),
    };

    await MOLDS_STORE.setItem(newMold.id, newMold);
    return newMold;
  }

  /**
   * Delete a custom user report mold
   */
  static async deleteReportMold(moldId: string): Promise<boolean> {
    await MOLDS_STORE.removeItem(moldId);
    return true;
  }
}

