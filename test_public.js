import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const { data } = supabase.storage.from('checklist-photos').getPublicUrl('test.jpg');
  console.log("Public URL:", data.publicUrl);
  
  // Try fetching it to see if it returns 404/400 (even if file doesn't exist, public vs private gives different errors usually)
  const res = await fetch(data.publicUrl);
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
run();
