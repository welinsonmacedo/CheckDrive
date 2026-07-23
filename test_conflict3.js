import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('schedules').select('id, driver_id, vehicle_id').is('vehicle_id', null);
  console.log("All schedules without vehicle:", data);
  const res2 = await supabase.from('schedules').select('id, vehicle_id').or('vehicle_id.is.null');
  console.log("Result with .is.null:", res2.data);
  const res3 = await supabase.from('schedules').select('id, vehicle_id').or('vehicle_id.eq.null');
  console.log("Result with .eq.null:", res3.data);
  const res4 = await supabase.from('schedules').select('id, vehicle_id').or('vehicle_id.eq.');
  console.log("Result with .eq.:", res4.data, res4.error);
}
test();
