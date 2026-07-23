import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");
async function run() {
  const { data, error } = await supabaseAdmin.from('checklist_issues').select('id, resolution_notes, status').ilike('resolution_notes', '%normal%').limit(10);
  console.log(data, error);
}
run();
