import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: schedules, error } = await sb.from('schedules').select('id, penalty_applied, start_at, end_at, driver_id').eq('penalty_applied', false).limit(10);
  console.log("Error:", error);
  console.log("Schedules with penalty_applied = false:", schedules?.length);
  if (schedules && schedules.length > 0) {
    console.log(schedules);
  }
}
run();
