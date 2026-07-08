import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc("exec_sql", { sql: "SELECT 1" });
  if (error) {
     const { data: d2, error: e2 } = await supabase.rpc("get_database_stats");
     console.log("get_database_stats exists?", !e2);
  }
}
run();
