const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("checklist_issues").select("*").eq("status", "resolved").limit(5);
  console.log('Result length:', data?.length, 'Error:', error);
  if (data?.length > 0) {
    console.log('First resolved_at:', data[0].resolved_at);
  }
}
run();
