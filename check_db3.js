import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");
async function run() {
  const { data, error } = await supabaseAdmin.from('checklist_issues').select('resolution_notes').not('resolution_notes', 'is', null);
  const notes = data?.map(d => d.resolution_notes);
  console.log(notes);
}
run();
