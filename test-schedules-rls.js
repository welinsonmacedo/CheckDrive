import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: authUser, error: authErr } = await sb.auth.signInWithPassword({
    email: 'admin@checkdrive.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Could not log in admin@checkdrive.com", authErr.message);
  }
  
  const { data: admin2, error: authErr2 } = await sb.auth.signInWithPassword({
    email: 'welinsonmarlon15@gmail.com',
    password: 'password123'
  });
  if (authErr2) {
    console.log("Could not log in welinsonmarlon15@gmail.com", authErr2.message);
  }

  const { data: user } = await sb.auth.getUser();
  console.log("User:", user.user?.email);

  const { data: schedules } = await sb.from('schedules').select('id, penalty_applied').eq('penalty_applied', false).limit(1);
  if (!schedules || schedules.length === 0) {
    console.log("No schedules found");
    return;
  }
  
  const targetId = schedules[0].id;
  console.log("Found schedule:", targetId);
  
  const { data: lockedSchedule, error: lockError } = await sb
    .from("schedules")
    .update({ penalty_applied: true })
    .eq("id", targetId)
    .select("id")
    .maybeSingle();
    
  console.log("lockError:", lockError);
  console.log("lockedSchedule:", lockedSchedule);
}
run();
