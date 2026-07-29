const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('maintenance_issues').select('priority').limit(10);
  console.log("Error:", error);
  if (data) {
    console.log([...new Set(data.map(i => i.priority))]);
  }
}
run();
