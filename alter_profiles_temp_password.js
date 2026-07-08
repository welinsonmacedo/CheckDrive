import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const query = `
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password TEXT;
  `;
  const { error } = await supabase.rpc('run_sql', { query: query });
  console.log("Result run_sql:", error);
}
run();
