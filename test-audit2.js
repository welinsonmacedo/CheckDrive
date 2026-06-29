import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: expired, error } = await supabase
    .from("schedules")
    .select("id, penalty_applied")
    .lt("end_at", new Date().toISOString())
    .eq("penalty_applied", false);
  
  console.log("Expired (not applied):", expired?.length, error);

  if (expired && expired.length > 0) {
    const id = expired[0].id;
    const { data: locked, error: lockErr } = await supabase
      .from("schedules")
      .update({ penalty_applied: true })
      .eq("id", id)
      .select("id");
      
    console.log("Locked:", locked, lockErr);
  }
}

run();
