import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const query = `
    ALTER TABLE score_profiles 
    ADD COLUMN IF NOT EXISTS apply_penalty_start BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS apply_penalty_end BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS apply_penalty_fuel BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS apply_penalty_yard BOOLEAN DEFAULT true;
  `;
  try {
     const { data, error } = await supabase.rpc('exec_sql', { sql: query });
     console.log('Result rpc:', error ? error : 'Success');
     if (error && error.code === 'PGRST202') {
        const { data: qd, error: qe } = await supabase.rpc('run_sql', { query: query });
        console.log('Result run_sql:', qe ? qe : 'Success');
     }
  } catch(e) { console.error(e) }
}
run();
