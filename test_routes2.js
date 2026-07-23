import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('checklist_submissions').select(`
    id, 
    routes(origin, destination),
    schedules_start:schedules!schedules_start_checklist_id_fkey(routes(origin, destination)),
    schedules_end:schedules!schedules_end_checklist_id_fkey(routes(origin, destination)),
    schedules_fuel:schedules!schedules_fuel_checklist_id_fkey(routes(origin, destination))
  `).limit(1);
  console.log(JSON.stringify(error || data));
}
test();
