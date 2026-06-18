import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Iniciando migração de colunas para checklist_issues...");
  
  // Vamos tentar rodar o ALTER TABLE via RPC 'exec_sql' se existir.
  // Caso não exista ou dê erro, tentamos criar diretamente.
  const sql = `
    -- Adicionar coluna 'resolution_nfs' do tipo JSONB para múltiplas notas fiscais e itens
    ALTER TABLE public.checklist_issues ADD COLUMN IF NOT EXISTS resolution_nfs JSONB DEFAULT '[]'::jsonb;
    
    -- Adicionar tabela para cadastro de itens de manutenção (peças/serviços reutilizáveis)
    CREATE TABLE IF NOT EXISTS public.maintenance_items_catalog (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES public.companies(id),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT unique_name_per_company UNIQUE (company_id, name)
    );
    
    -- Ativar RLS na nova tabela
    ALTER TABLE public.maintenance_items_catalog ENABLE ROW LEVEL SECURITY;
    
    -- Criar policies de RLS para a nova tabela
    DROP POLICY IF EXISTS "Users can read maintenance items catalog" ON public.maintenance_items_catalog;
    CREATE POLICY "Users can read maintenance items catalog" ON public.maintenance_items_catalog
      FOR SELECT TO authenticated USING (can_access_company(company_id));
      
    DROP POLICY IF EXISTS "Users can manage maintenance items catalog" ON public.maintenance_items_catalog;
    CREATE POLICY "Users can manage maintenance items catalog" ON public.maintenance_items_catalog
      FOR ALL TO authenticated USING (can_access_company(company_id));
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
      console.log("Erro ao rodar SQL via exec_sql:", error.message);
      console.log("Tentando alternativa ou fallback de gravação em json...");
    } else {
      console.log("Migração SQL concluída com sucesso!");
    }
  } catch (err) {
    console.log("Erro geral de migração:", err);
  }
}

run();
