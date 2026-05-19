import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { error } = await supabase.from('app_settings').update({ require_fuel_receipt_photo: true }).eq('id', 'global');
  console.log("Update Error:", error);
}
run();
