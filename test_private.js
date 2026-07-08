import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const { data } = supabase.storage.from('truck-photos').getPublicUrl('test.jpg');
  const res = await fetch(data.publicUrl);
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
run();
