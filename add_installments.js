import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Adding installments column...");
  
  const sql = `ALTER TABLE public.traffic_infractions ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;`;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
      console.log("Erro exec_sql:", error.message);
    } else {
      console.log("Sucesso via rpc!");
    }
  } catch (err) {
    console.log("Erro geral:", err);
  }
}

run();
