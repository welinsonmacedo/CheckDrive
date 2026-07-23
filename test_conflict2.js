import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('schedules').select('id, driver_id, vehicle_id').limit(5);
  console.log("All schedules:", data);
  const res2 = await supabase.from('schedules').select('id').or('driver_id.eq.nonexistent,vehicle_id.eq.null');
  console.log("Result with .eq.null:", res2.data);
}
test();
