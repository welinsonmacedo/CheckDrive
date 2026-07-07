import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSb = createClient(process.env.VITE_SUPABASE_URL, serviceKey);

async function run() {
  const { data: logs, error } = await adminSb.from('audit_logs')
    .select('id, reason, created_at')
    .ilike('reason', '%ID:%')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log("Logs:", logs);
}
run();
