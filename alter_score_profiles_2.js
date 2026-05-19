import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const query = `
    ALTER TABLE score_profiles ADD COLUMN IF NOT EXISTS closing_rule TEXT DEFAULT 'manual';
    ALTER TABLE score_profiles ADD COLUMN IF NOT EXISTS closing_value TEXT;
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log("Result:", error);
}
run();
