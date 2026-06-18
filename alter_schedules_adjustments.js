import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function alter() {
  const query = `
    ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_start_odometer INTEGER;
    ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_end_odometer INTEGER;
    ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_liters NUMERIC;
    ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_fuel_date TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS adjusted_status TEXT DEFAULT 'pending';
  `;
  try {
     console.log('Executing schedules table alteration...');
     const { data, error } = await supabase.rpc('exec_sql', { sql: query });
     console.log('Result rpc exec_sql:', error ? error : 'Success');
     if (error && error.code === 'PGRST202') {
        const { data: qd, error: qe } = await supabase.rpc('run_sql', { query: query });
        console.log('Result rpc run_sql:', qe ? qe : 'Success');
     }
  } catch(e) { console.error('Error during execution:', e) }
}
alter();
