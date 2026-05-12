import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const query = `
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS driver_type TEXT DEFAULT 'Interno/Pátio';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS participates_in_ranking BOOLEAN DEFAULT true;
    
    -- Also update schema.sql just in case! Wait, schema.sql is separate.
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log("Result:", error);
}
run();
