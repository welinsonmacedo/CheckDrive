import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Iniciando criação da tabela public.traffic_infractions...");
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.traffic_infractions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      infraction_date TIMESTAMP WITH TIME ZONE NOT NULL,
      amount NUMERIC NOT NULL,
      infraction_code TEXT NOT NULL,
      description TEXT NOT NULL,
      notice_number TEXT,
      address TEXT,
      discount_date DATE,
      attachment_url TEXT,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.traffic_infractions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Company users can read traffic_infractions" ON public.traffic_infractions;
    CREATE POLICY "Company users can read traffic_infractions" ON public.traffic_infractions
      FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Company admins can manage traffic_infractions" ON public.traffic_infractions;
    CREATE POLICY "Company admins can manage traffic_infractions" ON public.traffic_infractions
      FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
      console.log("Erro ao rodar SQL via exec_sql:", error.message);
    } else {
      console.log("Criação da tabela de infrações concluída com sucesso!");
    }
  } catch (err) {
    console.log("Erro geral de migração:", err);
  }
}

run();
