import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function run() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      ALTER TABLE public.checklist_issues DROP CONSTRAINT IF EXISTS checklist_issues_status_check;
      ALTER TABLE public.checklist_issues ADD CONSTRAINT checklist_issues_status_check CHECK (status IN ('pending', 'resolved', 'ignored', 'waiting', 'waiting_nf'));
    `
  });
  console.log("Error:", error ? error.message : "Success");
}
run();
