import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Iniciando criação da tabela public.vehicle_averages...");
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.vehicle_averages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
      vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
      driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
      fuel_submission_id UUID REFERENCES public.checklist_submissions(id) ON DELETE SET NULL,
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      start_odometer INTEGER,
      end_odometer INTEGER,
      distance INTEGER,
      liters NUMERIC,
      average NUMERIC,
      status TEXT DEFAULT 'reviewed',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.vehicle_averages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages;
    CREATE POLICY "Anyone authenticated can read vehicle_averages" ON public.vehicle_averages
      FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Managers can manage vehicle_averages" ON public.vehicle_averages;
    CREATE POLICY "Managers can manage vehicle_averages" ON public.vehicle_averages
      FOR ALL TO authenticated USING (is_manager());
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
      console.log("Erro ao rodar SQL via exec_sql:", error.message);
    } else {
      console.log("Criação da tabela de médias concluída com sucesso!");
    }
  } catch (err) {
    console.log("Erro geral de migração:", err);
  }
}

run();
