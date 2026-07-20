const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("checklist_issues").select("*, vehicles(plate), trailers(plate), profiles!checklist_issues_driver_id_fkey(full_name), resolver:profiles!checklist_issues_resolved_by_fkey(full_name)").limit(1);
  console.log('Result:', data, 'Error:', error);
}
run();
