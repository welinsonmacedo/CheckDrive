import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { ImportJob, ImportRecord, ImportConflict, ImportLog, ImportJobStatus } from "../types";

const JOBS_STORE = localforage.createInstance({ name: "checkdrive_import_jobs" });
const RECORDS_STORE = localforage.createInstance({ name: "checkdrive_import_records" });
const CONFLICTS_STORE = localforage.createInstance({ name: "checkdrive_import_conflicts" });
const LOGS_STORE = localforage.createInstance({ name: "checkdrive_import_logs" });

export class ImportService {
  /**
   * Fetch all Import Jobs for an enterprise
   */
  static async getImportJobs(companyId: string): Promise<ImportJob[]> {
    try {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("empresa_id", companyId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as ImportJob[];
      }
    } catch (e) {
      console.warn("Supabase import_jobs fetch fallback to local storage:", e);
    }

    // Local fallback
    const localJobs: ImportJob[] = [];
    await JOBS_STORE.iterate((value: ImportJob) => {
      if (value.empresa_id === companyId) {
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
    const newJob: ImportJob = {
      id: job.id || crypto.randomUUID(),
      empresa_id: job.empresa_id || "default_company",
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

    try {
      const { data, error } = await supabase.from("import_jobs").insert(newJob).select().single();
      if (!error && data) {
        await JOBS_STORE.setItem(newJob.id, data);
        return data as ImportJob;
      }
    } catch (e) {
      console.warn("Supabase import_jobs insert fallback:", e);
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
  }> {
    // 1. Get existing records to check duplicates & conflicts
    const existingHashes = new Set<string>();
    const existingRecordsList: ImportRecord[] = [];

    try {
      const { data } = await supabase
        .from("import_records")
        .select("*")
        .eq("empresa_id", companyId);

      if (data) {
        data.forEach((r: any) => {
          if (r.hash_registro) existingHashes.add(r.hash_registro);
          existingRecordsList.push(r);
        });
      }
    } catch (e) {
      // Local check fallback
      await RECORDS_STORE.iterate((r: ImportRecord) => {
        if (r.empresa_id === companyId) {
          if (r.hash_registro) existingHashes.add(r.hash_registro);
          existingRecordsList.push(r);
        }
      });
    }

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
        // 2. Check for potential conflict (same vehicle + same date + same doc/supplier, but different value)
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

    // Save records to DB or Local
    try {
      await supabase.from("import_records").insert(savedRecords);
      if (conflictsList.length > 0) {
        await supabase.from("import_conflicts").insert(conflictsList);
      }
    } catch (e) {
      console.warn("Supabase import_records batch save fallback:", e);
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
      `Importação concluída com sucesso. Status final: ${finalJobStatus}.`
    );

    return {
      job: updatedJob,
      savedRecords,
      conflicts: conflictsList,
    };
  }

  /**
   * Fetch imported records with optional filters
   */
  static async getImportRecords(companyId: string, jobId?: string): Promise<ImportRecord[]> {
    try {
      let query = supabase.from("import_records").select("*").eq("empresa_id", companyId);
      if (jobId) query = query.eq("import_job_id", jobId);

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (!error && data) {
        return data as ImportRecord[];
      }
    } catch (e) {
      // ignore
    }

    const records: ImportRecord[] = [];
    await RECORDS_STORE.iterate((r: ImportRecord) => {
      if (r.empresa_id === companyId && (!jobId || r.import_job_id === jobId)) {
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
    try {
      const { data, error } = await supabase
        .from("import_conflicts")
        .select("*")
        .eq("empresa_id", companyId)
        .order("created_at", { ascending: false });

      if (!error && data) return data as ImportConflict[];
    } catch (e) {
      // ignore
    }

    const conflicts: ImportConflict[] = [];
    await CONFLICTS_STORE.iterate((c: ImportConflict) => {
      if (c.empresa_id === companyId) {
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
    }
  }

  /**
   * Add execution log
   */
  static async addLog(jobId: string, companyId: string, etapa: string, mensagem: string): Promise<void> {
    const log: ImportLog = {
      id: crypto.randomUUID(),
      import_job_id: jobId,
      empresa_id: companyId,
      etapa,
      mensagem,
      criado_em: new Date().toISOString(),
    };

    try {
      await supabase.from("import_logs").insert(log);
    } catch (e) {
      // ignore
    }

    await LOGS_STORE.setItem(log.id, log);
  }

  /**
   * Fetch execution logs
   */
  static async getLogs(companyId: string, jobId?: string): Promise<ImportLog[]> {
    try {
      let query = supabase.from("import_logs").select("*").eq("empresa_id", companyId);
      if (jobId) query = query.eq("import_job_id", jobId);

      const { data, error } = await query.order("criado_em", { ascending: false });
      if (!error && data) return data as ImportLog[];
    } catch (e) {
      // ignore
    }

    const logs: ImportLog[] = [];
    await LOGS_STORE.iterate((l: ImportLog) => {
      if (l.empresa_id === companyId && (!jobId || l.import_job_id === jobId)) {
        logs.push(l);
      }
    });
    return logs.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }
}
