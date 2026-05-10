import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: 'WelinsonMarlon15@gmail.com',
    password: 'password' // We don't know the password, maybe we can login in another way?
  });
  console.log(user);
}
run();
