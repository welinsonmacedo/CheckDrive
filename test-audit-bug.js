import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: userAuth, error: authErr } = await sb.auth.signInWithPassword({
    email: 'admin@checkdrive.com',
    password: 'password123'
  });
  if (authErr) { console.log("auth err:", authErr); return; }
  
  const { data: schedules } = await sb.from('schedules').select('id, penalty_applied');
  console.log("Schedules total:", schedules?.length);
  const falseSchedules = schedules?.filter(s => s.penalty_applied === false);
  console.log("Schedules with penalty_applied = false:", falseSchedules?.length);
  
  if (falseSchedules && falseSchedules.length > 0) {
    const targetId = falseSchedules[0].id;
    const { data: lockedSchedule, error: lockError } = await sb
        .from("schedules")
        .update({ penalty_applied: true })
        .eq("id", targetId)
        .eq("penalty_applied", false)
        .select("id")
        .maybeSingle();
    console.log("lockError:", lockError);
    console.log("lockedSchedule:", lockedSchedule);
  }
}
run();
