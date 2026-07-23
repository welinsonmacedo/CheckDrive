import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const res3 = await supabase.from('schedules').select('id, vehicle_id').or('vehicle_id.eq.null');
  console.log("Result with .eq.null ERROR:", res3.error);
}
test();
