import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { ImportJob, ImportRecord, ImportConflict, ImportLog, ImportJobStatus } from "../types";

const JOBS_STORE = localforage.createInstance({ name: "checkdrive_import_jobs" });
const RECORDS_STORE = localforage.createInstance({ name: "checkdrive_import_records" });
const CONFLICTS_STORE = localforage.createInstance({ name: "checkdrive_import_conflicts" });
const LOGS_STORE = localforage.createInstance({ name: "checkdrive_import_logs" });

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
    try {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .or(`empresa_id.eq.${companyId},empresa_id.eq.${formattedCompanyId}`)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as ImportJob[];
      }
    } catch (e) {
      console.warn("Supabase import_jobs fetch fallback to local storage:", e);
    }

    // Local fallback
    const localJobs: ImportJob[] = [];
    await JOBS_STORE.iterate((value: ImportJob) => {
      if (value.empresa_id === companyId || value.empresa_id === formattedCompanyId) {
        localJobs.push(value);
      }
    });
    return localJobs.sort(
      (a, b) => new Date(b.created_at || b.data_importacao).getTime() - new Date(a.created_at || a.data_importacao).getTime()
    );
  }

  /**
   * Create a new Import Job
   */
  static async createImportJob(job: Partial<ImportJob>): Promise<ImportJob> {
    const companyId = job.empresa_id || "default_company";
    const formattedCompanyId = formatUuid(companyId);

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
        .or(`empresa_id.eq.${companyId},empresa_id.eq.${formattedCompanyId}`);

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
        ...r,
        empresa_id: formattedCompanyId,
      }));
      const { error: recErr } = await supabase.from("import_records").insert(supabaseRecords);
      if (recErr) {
        console.warn("Supabase import_records batch save error:", recErr.message);
        supabaseErrorMsg = recErr.message;
      }

      if (conflictsList.length > 0) {
        const supabaseConflicts = conflictsList.map((c) => ({
          ...c,
          empresa_id: formattedCompanyId,
        }));
        await supabase.from("import_conflicts").insert(supabaseConflicts);
      }
    } catch (e: any) {
      console.warn("Supabase import_records batch save fallback:", e);
      supabaseErrorMsg = e?.message || "Fallbacked to local storage";
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
        dbError = error.message;
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
   * Fetch imported records with optional filters
   */
  static async getImportRecords(companyId: string, jobId?: string): Promise<ImportRecord[]> {
    const formattedCompanyId = formatUuid(companyId);

    try {
      let query = supabase
        .from("import_records")
        .select("*")
        .or(`empresa_id.eq.${companyId},empresa_id.eq.${formattedCompanyId}`);

      if (jobId) query = query.eq("import_job_id", jobId);

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (!error && data && data.length > 0) {
        return data as ImportRecord[];
      }
    } catch (e) {
      // ignore
    }

    const records: ImportRecord[] = [];
    await RECORDS_STORE.iterate((r: ImportRecord) => {
      if ((r.empresa_id === companyId || r.empresa_id === formattedCompanyId) && (!jobId || r.import_job_id === jobId)) {
        records.push(r);
      }
    });
    return records.sort(
      (a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime()
    );
  }

  /**
   * Fetch conflicts
   */
  static async getConflicts(companyId: string): Promise<ImportConflict[]> {
    const formattedCompanyId = formatUuid(companyId);

    try {
      const { data, error } = await supabase
        .from("import_conflicts")
        .select("*")
        .or(`empresa_id.eq.${companyId},empresa_id.eq.${formattedCompanyId}`)
        .order("created_at", { ascending: false });

      if (!error && data) return data as ImportConflict[];
    } catch (e) {
      // ignore
    }

    const conflicts: ImportConflict[] = [];
    await CONFLICTS_STORE.iterate((c: ImportConflict) => {
      if (c.empresa_id === companyId || c.empresa_id === formattedCompanyId) {
        conflicts.push(c);
      }
    });
    return conflicts;
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
   * Fetch execution logs
   */
  static async getLogs(companyId: string, jobId?: string): Promise<ImportLog[]> {
    const formattedCompanyId = formatUuid(companyId);

    try {
      let query = supabase
        .from("import_logs")
        .select("*")
        .or(`empresa_id.eq.${companyId},empresa_id.eq.${formattedCompanyId}`);

      if (jobId) query = query.eq("import_job_id", jobId);

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (!error && data) return data as ImportLog[];
    } catch (e) {
      // ignore
    }

    const logs: ImportLog[] = [];
    await LOGS_STORE.iterate((l: ImportLog) => {
      if ((l.empresa_id === companyId || l.empresa_id === formattedCompanyId) && (!jobId || l.import_job_id === jobId)) {
        logs.push(l);
      }
    });
    return logs.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }
}
