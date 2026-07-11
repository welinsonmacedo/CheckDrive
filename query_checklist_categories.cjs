const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('checklist_item_categories').select('*').limit(5);
  if (error) console.error(error);
  else console.log(data);
}
run();
