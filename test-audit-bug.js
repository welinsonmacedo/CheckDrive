import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = 'admin@checkdrive.com';
  // We need the admin auth to test RLS
  // Let's just bypass RLS by using service_role key if available
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
     console.log("No service key");
     return;
  }
  const adminSb = createClient(process.env.VITE_SUPABASE_URL, serviceKey);
  
  const { data: schedules } = await adminSb.from('schedules').select('id, penalty_applied');
  console.log("Schedules total:", schedules?.length);
  const falseSchedules = schedules?.filter(s => s.penalty_applied === false);
  console.log("Schedules with penalty_applied = false:", falseSchedules?.length);
}
run();
