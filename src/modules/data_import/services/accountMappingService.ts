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
  { company_id: "global", code: "34", target_name: "Fluido de Freio", category: "Manutenção", active: true, keywords: ["34", "fluido de freio", "freio"] },
  { company_id: "global", code: "48", target_name: "Óleo de Motor (Acerto)", category: "Lubrificantes", active: true, keywords: ["48", "oleo de motor", "oleo motor"] },
  { company_id: "global", code: "67", target_name: "Silicone (Acerto)", category: "Outros", active: true, keywords: ["67", "silicone"] },
  { company_id: "global", code: "89", target_name: "Multas de Trânsito", category: "Multa", active: true, keywords: ["89", "multa", "multas de transito"] },
  { company_id: "global", code: "93", target_name: "Pedágio / Passagens", category: "Pedágio", active: true, keywords: ["93", "pedagio", "pedágio", "passagens"] },
  { company_id: "global", code: "100", target_name: "Seguro Veículos", category: "Seguro", active: true, keywords: ["100", "seguro", "seguro veiculos"] },
  { company_id: "global", code: "101", target_name: "Gasolina Administrativo", category: "Gasolina Administrativo", active: true, keywords: ["101", "gasolina adm", "gasolina admin"] },
  { company_id: "global", code: "102", target_name: "Arla", category: "Arla", active: true, keywords: ["102", "arla", "arla32"] },
  { company_id: "global", code: "103", target_name: "Diesel Comum / Arla Estoque", category: "Diesel", active: true, keywords: ["103", "diesel comum", "arla estoque"] },
  { company_id: "global", code: "104", target_name: "Diesel S10", category: "Diesel", active: true, keywords: ["104", "diesel s10", "s10", "06.01.002"] },
  { company_id: "global", code: "105", target_name: "Diesel Terceiro", category: "Diesel Terceiro", active: true, keywords: ["105", "diesel ter", "diesel terceiro"] },
  { company_id: "global", code: "106", target_name: "Gasolina", category: "Gasolina", active: true, keywords: ["106", "gasolina", "06.02.001"] },
  { company_id: "global", code: "107", target_name: "Lava-jato", category: "Lava-jato", active: true, keywords: ["107", "lavagem", "lava-jato"] },
  { company_id: "global", code: "108", target_name: "Manutenção", category: "Manutenção", active: true, keywords: ["108", "manutenção", "manutencao"] },
  { company_id: "global", code: "109", target_name: "Arla / Pneus Novos", category: "Arla", active: true, keywords: ["109", "arla", "pneu novo"] },
  { company_id: "global", code: "110", target_name: "Lubrificantes", category: "Lubrificantes", active: true, keywords: ["110", "lubrificante", "lubrificantes"] },
  { company_id: "global", code: "111", target_name: "Seguro", category: "Seguro", active: true, keywords: ["111", "seguro"] },
  { company_id: "global", code: "112", target_name: "Multa", category: "Multa", active: true, keywords: ["112", "multa"] },
  { company_id: "global", code: "116", target_name: "Materiais Elétricos", category: "Elétrica", active: true, keywords: ["116", "eletrico", "eletrica", "bateria"] },
  { company_id: "global", code: "118", target_name: "Filtros", category: "Peças", active: true, keywords: ["118", "filtro", "filtros"] },
  { company_id: "global", code: "120", target_name: "Peças e Acessórios", category: "Peças", active: true, keywords: ["120", "pecas", "acessorios"] },
  { company_id: "global", code: "125", target_name: "Peças para Carroceria", category: "Peças", active: true, keywords: ["125", "carroceria", "pecas carroceria"] },
  { company_id: "global", code: "128", target_name: "Serviços com Borracharia", category: "Pneus", active: true, keywords: ["128", "borracharia", "pneu"] },
  { company_id: "global", code: "131", target_name: "Materiais para Borracharia", category: "Pneus", active: true, keywords: ["131", "borracharia", "pneu"] },
  { company_id: "global", code: "135", target_name: "Serviços de Descontaminação", category: "Lava-jato", active: true, keywords: ["135", "descontaminacao", "descontaminação"] },
  { company_id: "global", code: "140", target_name: "Aquisição de Pneus Novos", category: "Pneus Novos", active: true, keywords: ["140", "pneus novos", "pneu novo"] },
  { company_id: "global", code: "141", target_name: "Serviço de Recapadora", category: "Recapagem", active: true, keywords: ["141", "recapagem", "recapadora"] },
  { company_id: "global", code: "144", target_name: "Óleo Motor", category: "Lubrificantes", active: true, keywords: ["144", "oleo motor", "óleo motor"] },
  { company_id: "global", code: "150", target_name: "Acessórios Carreta", category: "Peças", active: true, keywords: ["150", "acessorios carreta"] },
  { company_id: "global", code: "151", target_name: "Bombas, Bicos e Injetores", category: "Peças", active: true, keywords: ["151", "bomba", "bico", "injetor"] },
  { company_id: "global", code: "152", target_name: "Parafusos / Porcas / Arruelas", category: "Peças", active: true, keywords: ["152", "parafuso", "porca", "arruela"] },
  { company_id: "global", code: "153", target_name: "Amortecedor", category: "Peças", active: true, keywords: ["153", "amortecedor"] },
  { company_id: "global", code: "154", target_name: "Cabine", category: "Peças", active: true, keywords: ["154", "cabine"] },
  { company_id: "global", code: "155", target_name: "Caixa de Câmbio", category: "Peças", active: true, keywords: ["155", "cambio", "caixa de cambio"] },
  { company_id: "global", code: "158", target_name: "Diferencial", category: "Peças", active: true, keywords: ["158", "diferencial"] },
  { company_id: "global", code: "160", target_name: "Embreagem", category: "Peças", active: true, keywords: ["160", "embreagem"] },
  { company_id: "global", code: "161", target_name: "Escapamento", category: "Peças", active: true, keywords: ["161", "escapamento"] },
  { company_id: "global", code: "162", target_name: "Ferros", category: "Peças", active: true, keywords: ["162", "ferros", "ferro"] },
  { company_id: "global", code: "163", target_name: "Freios / Cubos", category: "Freios", active: true, keywords: ["163", "freio", "freios", "cubo"] },
  { company_id: "global", code: "164", target_name: "Material de Consumo", category: "Outros", active: true, keywords: ["164", "material de consumo", "consumo"] },
  { company_id: "global", code: "165", target_name: "Mola Pneumática", category: "Peças", active: true, keywords: ["165", "mola", "mola pneumatica"] },
  { company_id: "global", code: "166", target_name: "Motor em Geral", category: "Peças", active: true, keywords: ["166", "motor", "motor em geral"] },
  { company_id: "global", code: "167", target_name: "Pára-brisas / Vidros", category: "Peças", active: true, keywords: ["167", "parabrisa", "para-brisa", "vidro"] },
  { company_id: "global", code: "168", target_name: "Pára-lamas / Suportes", category: "Peças", active: true, keywords: ["168", "paralama", "para-lama", "suporte"] },
  { company_id: "global", code: "172", target_name: "Válvulas", category: "Peças", active: true, keywords: ["172", "valvula", "valvulas"] },
  { company_id: "global", code: "176", target_name: "Adesivos / Placas", category: "Outros", active: true, keywords: ["176", "adesivo", "placa"] },
  { company_id: "global", code: "178", target_name: "Materiais de Segurança", category: "Outros", active: true, keywords: ["178", "segurança", "epi"] },
  { company_id: "global", code: "183", target_name: "Serviços Mecânica", category: "Manutenção", active: true, keywords: ["183", "mecanica", "servico mecanico"] },
  { company_id: "global", code: "187", target_name: "Serviços em Acessórios Geral", category: "Manutenção", active: true, keywords: ["187", "servico acessorio", "acessorios geral"] },
  { company_id: "global", code: "1013", target_name: "Aditivo (Acerto)", category: "Lubrificantes", active: true, keywords: ["1013", "aditivo"] },
  { company_id: "global", code: "1027", target_name: "Aromatizantes (Acerto)", category: "Outros", active: true, keywords: ["1027", "aromatizante"] },
  { company_id: "global", code: "1041", target_name: "Compras Gerais", category: "Outros", active: true, keywords: ["1041", "compras"] },
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

    const normalizeText = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const normText = normalizeText(cleanText);

    // 1. Exact code match e.g. "104", "106", "101", "120"
    const exactCode = mappings.find((m) => m.active && m.code.toLowerCase().trim() === cleanText);
    if (exactCode) return exactCode;

    // 2. Code extracted from text e.g., "Conta: 104 Diesel S10", "104 Diesel", "Conta 106"
    const codeNumberMatch = cleanText.match(/\b(\d{2,5})\b/);
    if (codeNumberMatch) {
      const extractedCode = codeNumberMatch[1];
      const matchByExtractedCode = mappings.find((m) => m.active && m.code.trim() === extractedCode);
      if (matchByExtractedCode) return matchByExtractedCode;
    }

    // 3. Match by normalized target name or keywords
    for (const m of mappings) {
      if (!m.active) continue;

      const normTarget = normalizeText(m.target_name);
      if (normTarget && normTarget.length >= 3 && normText.includes(normTarget)) {
        return m;
      }

      if (
        m.keywords &&
        m.keywords.some((kw) => {
          const normKw = normalizeText(kw);
          return normKw && normKw.length >= 2 && normText.includes(normKw);
        })
      ) {
        return m;
      }
    }

    return null;
  }
}
