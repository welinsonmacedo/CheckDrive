import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const query = `
    ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS require_fuel_receipt_photo BOOLEAN DEFAULT true;
    ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS receipt_photo_url TEXT;
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log("Result:", error);
}
run();
