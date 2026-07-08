import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@acmefrota.com.br',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Auth err:", authErr);
    return;
  }
  
  console.log("Logged in!");
  
  const blob = new Blob(["test"], { type: "text/plain" });
  const { data, error } = await supabase.storage
    .from('checklist-photos')
    .upload(`photos/${auth.user.id}/test.txt`, blob);
    
  console.log("Upload result:", error || data);
}
run();
