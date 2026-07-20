const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'WelinsonMarlon15@gmail.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.log('Auth failed:', authErr.message);
    // Let's try skipping RLS with service key if possible, but we don't have it.
  }
}
run();
