const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Wait, I don't have service role key, but I can use auth
async function run() {
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'WelinsonMarlon15@gmail.com',
    password: 'password123' // Just guessing or we can bypass?
  });
  console.log('authErr:', authErr);
}
run();
