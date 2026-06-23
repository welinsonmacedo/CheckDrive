import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""
);

async function run() {
  const { data, error } = await supabase.from("profiles").select("*").limit(5);
  console.log(data);
}
run();
