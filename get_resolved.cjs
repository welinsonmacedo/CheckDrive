const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("checklist_issues").select("id, status, created_at, resolved_at, resolved_by, resolution_notes, resolution_value").eq("status", "resolved").limit(20);
  console.log('Result length:', data?.length);
  if (data?.length > 0) {
    console.log(data);
  }
}
run();
