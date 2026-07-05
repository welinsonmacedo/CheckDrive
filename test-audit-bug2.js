import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: authUser, error: authErr } = await sb.auth.signInWithPassword({
    email: 'welinsonmarlon15@gmail.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Could not log in, trying next...", authErr.message);
  } else {
    console.log("Logged in!");
  }
  
  // just read any audit logs
  const { data: logs } = await sb.from('audit_logs').select('id, reason').limit(5);
  console.log("Audit Logs:", logs);
}
run();
