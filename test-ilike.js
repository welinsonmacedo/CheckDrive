import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await sb.from('audit_logs').select('id, reason').ilike('reason', '%[ID: %]%').limit(1);
  console.log("Error:", error);
}
run();
