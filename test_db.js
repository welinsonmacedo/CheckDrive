import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('schedules').select('*').limit(5);
  console.log("Schedules:", JSON.stringify(data, null, 2));

  const { data: subs } = await supabase.from('checklist_submissions').select('id, user_id, vehicle_id, odometer, details, created_at, type').limit(3);
  console.log("Subs:", JSON.stringify(subs, null, 2));
}

check();
