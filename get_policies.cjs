const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase.from('pg_policies').select('*');
  console.log(error || data);
}
check();
