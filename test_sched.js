import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('schedules').select('id, vehicle_id, start_at, end_at, start_checklist:checklist_submissions!start_checklist_id(odometer), end_checklist:checklist_submissions!end_checklist_id(odometer)').limit(2);
  console.log(error || JSON.stringify(data, null, 2));
}
run();
