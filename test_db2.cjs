require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: issues } = await supabase.from('checklist_issues').select('*');
  console.log("All issues length:", issues?.length);
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log("Profiles count:", profiles?.length);
  if (profiles && profiles.length > 0) {
     console.log("Sample profile:", profiles[0]);
  }
}
run();
