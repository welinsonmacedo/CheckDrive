import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkService() {
  const { data, error } = await supabaseAdmin.from('profiles').select('email').eq('cpf', '123').limit(1);
  console.log("data:", data, "error:", error ? error.message : null);
}
checkService();
