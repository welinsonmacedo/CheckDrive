import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `ALTER TABLE public.traffic_infractions ADD COLUMN IF NOT EXISTS license_plate TEXT;`;
  const { error } = await supabase.rpc("exec_sql", { sql });
  console.log("Error from exec_sql:", error);
}
run();
