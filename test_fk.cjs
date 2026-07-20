const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("checklist_issues").select("*, resolver:profiles!resolved_by(full_name)").limit(1);
  console.log('Result:', data, 'Error:', error);
}
run();
