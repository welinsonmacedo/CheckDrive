import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const { data, error } = await supabase.storage.getBucket('checklist-photos');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Result:", data);
  }
}
run();
