import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addCpf() {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;`
  });
  console.log("Adding CPF:", error ? error.message : "Success");
}
addCpf();
