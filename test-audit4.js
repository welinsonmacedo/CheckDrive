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
  
  if (expired && expired.length > 0) {
    const id = expired[0].id;
    console.log("Found schedule to test:", id);

    // Let's try to update WITHOUT select
    const { error: lockErr } = await supabase
      .from("schedules")
      .update({ penalty_applied: true })
      .eq("id", id);
      
    console.log("Update Error:", lockErr);

    // Verify if it changed
    const { data: check } = await supabase.from("schedules").select("penalty_applied").eq("id", id).single();
    console.log("After update:", check);
  } else {
    console.log("No expired schedules.");
  }
}

run();
