const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = 'WelinsonMarlon15@gmail.com';
  // I don't have their password. But wait, can we get their session?
  // We can't easily login without password.
  console.log("Can't login without password.");
}
run();
