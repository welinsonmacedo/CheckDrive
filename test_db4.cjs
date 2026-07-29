require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: submissions } = await supabase.from('checklist_submissions').select('*');
  console.log("Total Submissions:", submissions?.length);
  
  const { data: records } = await supabase.from('defects').select('*').limit(5); // Did we have a 'defects' table?
  console.log("Defects table exists, length:", records?.length);
}
run();
