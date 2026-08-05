import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { ImportRecord } from "../types";

export interface SharedReportConfig {
  id: string; // e.g. "shr_9a2b3c"
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
   * Generates a unique share ID
   */
  static generateShareId(): string {
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

    // 3. Attempt to save in Supabase if table exists
    try {
      const { error } = await supabase.from("shared_reports").upsert({
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
      if (error) {
        console.warn("Supabase shared_reports save notice:", error.message);
      }
    } catch (e) {
      console.warn("Supabase shared_reports exception (local storage active):", e);
    }

    return report;
  }

  /**
   * Fetches a shared report configuration by ID
   */
  static async getSharedReport(shareId: string): Promise<SharedReportConfig | null> {
    if (!shareId) return null;

    const cleanShareId = shareId.trim();

    // 1. Try Supabase
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

    // 2. Fallback to localforage
    try {
      const localReport = await SHARED_REPORTS_STORE.getItem<SharedReportConfig>(cleanShareId);
      if (localReport && localReport.id) return localReport;
    } catch (e) {
      console.warn("localforage fetch error:", e);
    }

    // 3. Fallback to localStorage
    try {
      const lsRaw = localStorage.getItem(`checkdrive_shared_report_${cleanShareId}`);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.warn("localStorage fetch error:", e);
    }

    // 4. Scan all localforage records as last resort
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
