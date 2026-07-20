const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("checklist_issues").select("*").limit(5);
  console.log('Total issues sample length:', data?.length);
  if (data?.length > 0) {
    console.log('Sample issue:', data[0]);
  }
}
run();
