import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { ImportRecord } from "../types";
import { formatUuid } from "./importService";

export interface SharedReportConfig {
  id: string; // e.g. "shr_caiapo" or "shr_2988d70f3c534563a44267c20ea40b7a"
  company_id: string;
  title: string;
  access_code: string; // PIN code (e.g., "4921")
  allow_filters: boolean; // whether viewer can interact with filters or lock them
  created_at: string;
  created_by_name?: string;
  filters: {
    categoryFilter?: string;
    tipoImportacaoFilter?: string;
    selectedPeriod?: string;
    customMonth?: string;
    placaFilter?: string;
    fornecedorFilter?: string;
    agruparPor?: "categoria" | "tipo_importacao" | "placa" | "fornecedor" | "mes" | "status" | string;
    metrica?: "soma_valor" | "quantidade" | "media_valor" | "soma_quantidade" | string;
    tipoGrafico?: "bar" | "pie" | "line" | "area" | "table" | string;
    viewMode?: "agrupado" | "detalhado" | string;
    [key: string]: any;
  };
  records_snapshot?: ImportRecord[];
  overall_metrics?: {
    totalValorGeral: number;
    totalQtyGeral: number;
    totalRegistrosCount: number;
    mediaValorGeral: number;
  };
}

const SHARED_REPORTS_STORE = localforage.createInstance({
  name: "checkdrive_shared_reports",
});

export class SharedReportService {
  /**
   * Generates a random 4-digit PIN access code
   */
  static generateAccessCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Generates a stable deterministic share ID based on company ID
   * So the URL link stays constant and does not change every time the user shares!
   */
  static generateShareId(companyId?: string): string {
    if (companyId) {
      const cleanCompany = companyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanCompany.length > 0) {
        return `shr_${cleanCompany}`;
      }
    }
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "shr_";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Saves a shared report configuration (local storage + localforage + Supabase)
   */
  static async saveSharedReport(report: SharedReportConfig): Promise<SharedReportConfig> {
    if (!report.id) return report;

    // 1. Save in local storage (localforage)
    try {
      await SHARED_REPORTS_STORE.setItem(report.id, report);
    } catch (e) {
      console.warn("localforage save error:", e);
    }

    // 2. Save in localStorage as synchronous backup
    try {
      localStorage.setItem(`checkdrive_shared_report_${report.id}`, JSON.stringify(report));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }

    // 3. Save in Supabase import_jobs table (cloud storage accessible publicly by any link recipient)
    try {
      const uuidId = formatUuid(report.id);
      const companyUuid = formatUuid(report.company_id);

      const payload = {
        id: uuidId,
        empresa_id: companyUuid,
        usuario_id: "00000000-0000-4000-8000-000000000000",
        nome_arquivo: `SHARED_REPORT_${report.id}`,
        status: "shared_report",
        observacoes: JSON.stringify(report),
        data_importacao: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("import_jobs").upsert(payload);
      if (error) {
        console.warn("Supabase import_jobs shared report save notice:", error.message);
      }
    } catch (e) {
      console.warn("Supabase shared report save exception:", e);
    }

    // 4. Attempt to save in dedicated shared_reports table if it exists
    try {
      await supabase.from("shared_reports").upsert({
        id: report.id,
        company_id: report.company_id,
        title: report.title,
        access_code: report.access_code,
        allow_filters: report.allow_filters,
        filters: report.filters,
        records_snapshot: report.records_snapshot,
        overall_metrics: report.overall_metrics,
        created_at: report.created_at,
        created_by_name: report.created_by_name || "Usuário CheckDrive",
      });
    } catch (e) {
      // ignore if table doesn't exist
    }

    return report;
  }

  /**
   * Fetches a shared report configuration by ID
   */
  static async getSharedReport(shareId: string): Promise<SharedReportConfig | null> {
    if (!shareId) return null;

    const cleanShareId = shareId.trim();

    // 1. Try Supabase import_jobs (Cloud storage - available publicly to any device without login)
    try {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("nome_arquivo", `SHARED_REPORT_${cleanShareId}`)
        .maybeSingle();

      if (!error && data && data.observacoes) {
        try {
          const parsed = JSON.parse(data.observacoes);
          if (parsed && parsed.id) {
            return parsed as SharedReportConfig;
          }
        } catch (pe) {
          console.warn("Error parsing shared_report payload:", pe);
        }
      }
    } catch (e) {
      console.warn("Supabase import_jobs fetch error for shared report:", e);
    }

    // 2. Try Supabase shared_reports table if it exists
    try {
      const { data, error } = await supabase
        .from("shared_reports")
        .select("*")
        .eq("id", cleanShareId)
        .maybeSingle();

      if (!error && data && data.id) {
        return data as SharedReportConfig;
      }
    } catch (e) {
      console.warn("Supabase shared_reports fetch error:", e);
    }

    // 3. Fallback to localforage
    try {
      const localReport = await SHARED_REPORTS_STORE.getItem<SharedReportConfig>(cleanShareId);
      if (localReport && localReport.id) return localReport;
    } catch (e) {
      console.warn("localforage fetch error:", e);
    }

    // 4. Fallback to localStorage
    try {
      const lsRaw = localStorage.getItem(`checkdrive_shared_report_${cleanShareId}`);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.warn("localStorage fetch error:", e);
    }

    // 5. Scan all localforage records as last resort
    try {
      let found: SharedReportConfig | null = null;
      await SHARED_REPORTS_STORE.iterate((val: SharedReportConfig) => {
        if (val && val.id === cleanShareId) {
          found = val;
        }
      });
      if (found) return found;
    } catch (e) {
      // ignore
    }

    return null;
  }
}
