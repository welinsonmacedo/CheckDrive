const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('checklist_issues').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
    console.log("priority:", data[0].priority);
  } else {
    console.log("No data", error);
  }
}
run();
