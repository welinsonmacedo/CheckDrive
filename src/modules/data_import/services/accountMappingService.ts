import { supabase } from "@/src/lib/supabase";
import localforage from "localforage";
import { RecordCategory } from "../types";

export interface AccountMapping {
  id: string;
  company_id: string;
  code: string;
  target_name: string;
  category: RecordCategory | string;
  keywords?: string[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const MAPPINGS_STORE = localforage.createInstance({ name: "checkdrive_import_account_mappings" });

export const DEFAULT_ACCOUNT_MAPPINGS: Omit<AccountMapping, "id">[] = [
  { company_id: "global", code: "104", target_name: "Diesel S10", category: "Diesel", active: true, keywords: ["104", "diesel s10", "s10", "06.01.002"] },
  { company_id: "global", code: "106", target_name: "Gasolina", category: "Gasolina", active: true, keywords: ["106", "gasolina", "06.02.001"] },
  { company_id: "global", code: "101", target_name: "Gasolina Administrativo", category: "Gasolina Administrativo", active: true, keywords: ["101", "gasolina adm", "gasolina admin"] },
  { company_id: "global", code: "105", target_name: "Diesel Terceiro", category: "Diesel Terceiro", active: true, keywords: ["105", "diesel ter", "diesel terceiro"] },
  { company_id: "global", code: "102", target_name: "Arla", category: "Arla", active: true, keywords: ["102", "arla", "arla32"] },
  { company_id: "global", code: "103", target_name: "Arla Estoque", category: "Arla Estoque", active: true, keywords: ["103", "arla estoque", "estoque arla"] },
  { company_id: "global", code: "107", target_name: "Lava-jato", category: "Lava-jato", active: true, keywords: ["107", "lavagem", "lava-jato"] },
  { company_id: "global", code: "108", target_name: "Manutenção", category: "Manutenção", active: true, keywords: ["108", "manutenção", "manutencao"] },
  { company_id: "global", code: "109", target_name: "Pneus Novos", category: "Pneus Novos", active: true, keywords: ["109", "pneu novo", "pneus novos"] },
  { company_id: "global", code: "110", target_name: "Pedágio", category: "Pedágio", active: true, keywords: ["110", "pedagio", "pedágio"] },
  { company_id: "global", code: "111", target_name: "Seguro", category: "Seguro", active: true, keywords: ["111", "seguro"] },
  { company_id: "global", code: "112", target_name: "Multa", category: "Multa", active: true, keywords: ["112", "multa"] },
];

export class AccountMappingService {
  /**
   * Returns all account mappings (cached localforage + Supabase)
   */
  static async getAccountMappings(companyId: string = "global"): Promise<AccountMapping[]> {
    const listMap = new Map<string, AccountMapping>();

    // 1. Load defaults
    DEFAULT_ACCOUNT_MAPPINGS.forEach((def, idx) => {
      const id = `default_${def.code}_${idx}`;
      listMap.set(def.code, { ...def, id });
    });

    // 2. Try loading from Supabase
    try {
      const { data, error } = await supabase
        .from("import_account_mappings")
        .select("*")
        .or(`company_id.eq.${companyId},company_id.eq.global`);

      if (!error && data && data.length > 0) {
        data.forEach((row) => {
          if (row.code) {
            listMap.set(row.code, {
              id: row.id,
              company_id: row.company_id || companyId,
              code: row.code,
              target_name: row.target_name,
              category: row.category,
              keywords: Array.isArray(row.keywords) ? row.keywords : [],
              active: row.active !== false,
              created_at: row.created_at,
              updated_at: row.updated_at,
            });
          }
        });
      }
    } catch (e) {
      console.warn("Supabase account mappings fetch notice:", e);
    }

    // 3. Try loading from localforage
    try {
      await MAPPINGS_STORE.iterate((val: AccountMapping) => {
        if (val && val.code) {
          listMap.set(val.code, val);
        }
      });
    } catch (e) {
      console.warn("Localforage account mappings fetch notice:", e);
    }

    // 4. Try loading from localStorage
    try {
      const lsRaw = localStorage.getItem("checkdrive_import_account_mappings");
      if (lsRaw) {
        const parsed: AccountMapping[] = JSON.parse(lsRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((m) => {
            if (m.code) listMap.set(m.code, m);
          });
        }
      }
    } catch (e) {
      console.warn("LocalStorage account mappings fetch notice:", e);
    }

    return Array.from(listMap.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }

  /**
   * Save or update an account mapping
   */
  static async saveAccountMapping(mapping: Partial<AccountMapping>): Promise<AccountMapping> {
    const code = (mapping.code || "").trim();
    if (!code) throw new Error("O código da conta é obrigatório.");

    const id = mapping.id || `map_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMapping: AccountMapping = {
      id,
      company_id: mapping.company_id || "global",
      code,
      target_name: mapping.target_name || `Conta ${code}`,
      category: mapping.category || "Combustível",
      keywords: mapping.keywords || [code, (mapping.target_name || "").toLowerCase()],
      active: mapping.active !== false,
      updated_at: new Date().toISOString(),
      created_at: mapping.created_at || new Date().toISOString(),
    };

    // Save to localforage
    try {
      await MAPPINGS_STORE.setItem(fullMapping.code, fullMapping);
    } catch (e) {
      console.warn("Localforage save mapping error:", e);
    }

    // Save to localStorage
    try {
      const currentList = await this.getAccountMappings(fullMapping.company_id);
      const updatedList = currentList.filter((m) => m.code !== fullMapping.code);
      updatedList.push(fullMapping);
      localStorage.setItem("checkdrive_import_account_mappings", JSON.stringify(updatedList));
    } catch (e) {
      console.warn("LocalStorage save mapping error:", e);
    }

    // Upsert to Supabase
    try {
      await supabase.from("import_account_mappings").upsert({
        id: fullMapping.id,
        company_id: fullMapping.company_id,
        code: fullMapping.code,
        target_name: fullMapping.target_name,
        category: fullMapping.category,
        keywords: fullMapping.keywords,
        active: fullMapping.active,
        updated_at: fullMapping.updated_at,
      });
    } catch (e) {
      console.warn("Supabase upsert mapping notice:", e);
    }

    return fullMapping;
  }

  /**
   * Delete an account mapping
   */
  static async deleteAccountMapping(code: string, companyId: string = "global"): Promise<void> {
    try {
      await MAPPINGS_STORE.removeItem(code);
    } catch (e) {
      console.warn("Localforage delete error:", e);
    }

    try {
      const currentList = await this.getAccountMappings(companyId);
      const updatedList = currentList.filter((m) => m.code !== code);
      localStorage.setItem("checkdrive_import_account_mappings", JSON.stringify(updatedList));
    } catch (e) {
      console.warn("LocalStorage delete error:", e);
    }

    try {
      await supabase.from("import_account_mappings").delete().eq("code", code);
    } catch (e) {
      console.warn("Supabase delete notice:", e);
    }
  }

  /**
   * Reset mappings to system defaults
   */
  static async resetToDefaults(companyId: string = "global"): Promise<AccountMapping[]> {
    try {
      await MAPPINGS_STORE.clear();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("checkdrive_import_account_mappings");

    const restored: AccountMapping[] = [];
    for (const def of DEFAULT_ACCOUNT_MAPPINGS) {
      const saved = await this.saveAccountMapping({ ...def, company_id: companyId });
      restored.push(saved);
    }

    return restored;
  }

  /**
   * Finds matching mapping given a code number, conta string, or account description
   */
  static findMatchingMapping(text: string, mappings: AccountMapping[]): AccountMapping | null {
    if (!text || !mappings || mappings.length === 0) return null;
    const cleanText = text.toLowerCase().trim();

    // 1. Exact code match e.g. "104", "106", "101"
    const exactCode = mappings.find((m) => m.active && m.code.toLowerCase() === cleanText);
    if (exactCode) return exactCode;

    // 2. Code extracted from text e.g., "Conta: 104 Diesel S10", "104 Diesel", "Conta 106"
    const codeNumberMatch = cleanText.match(/\b(\d{2,5})\b/);
    if (codeNumberMatch) {
      const extractedCode = codeNumberMatch[1];
      const matchByExtractedCode = mappings.find((m) => m.active && m.code === extractedCode);
      if (matchByExtractedCode) return matchByExtractedCode;
    }

    // 3. Match by target name or keywords
    for (const m of mappings) {
      if (!m.active) continue;

      if (m.target_name && cleanText.includes(m.target_name.toLowerCase())) {
        return m;
      }

      if (m.keywords && m.keywords.some((kw) => kw && cleanText.includes(kw.toLowerCase()))) {
        return m;
      }
    }

    return null;
  }
}
