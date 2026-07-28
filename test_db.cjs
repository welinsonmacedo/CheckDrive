require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: user } = await supabase.from('profiles').select('id, company_id, full_name').eq('email', 'WelinsonMarlon15@gmail.com').single();
  console.log("User:", user);
  const { data: issues } = await supabase.from('checklist_issues').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Issues:", issues);
}
run();
