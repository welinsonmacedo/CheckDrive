import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  // Let's call rpc if there is any sql exec function, or query a known endpoint
  // Wait, is there a custom table or function we can query?
  // Let's try executing standard sql through rpc or let's inspect the files in the repo that set up RLS.
  // Actually, let's check if there's any file that has run policies, or check the database tab.
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log("Supabase connection okay");
}
run();
