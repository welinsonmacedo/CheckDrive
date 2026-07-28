require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info', { table_name: 'checklist_issues' });
  if (error) {
     // fallback if rpc doesn't exist
     const { data: d2 } = await supabase.from('checklist_issues').select('*').limit(1);
     console.log(d2);
  } else {
     console.log(data);
  }
}
run();
